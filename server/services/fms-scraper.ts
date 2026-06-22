// Auto-pull pelanggaran FMS dari FAMOUS (Borneo Indobara) → tabel fms_violations.
// READ-ONLY ke FAMOUS (login + GET). Dijadwalkan cron tiap jam.
// Kredensial dari env: FAMOUS_EMAIL, FAMOUS_PASSWORD (wajib), FAMOUS_API_KEY (opsional; auto dari bundle), FAMOUS_KONTRAKTOR (default 24).
import { storage } from "../storage";
import type { InsertFmsViolation } from "@shared/schema";

const BASE = process.env.FAMOUS_BASE_URL || "https://famous.borneo-indobara.com";
const KONTRAKTOR = process.env.FAMOUS_KONTRAKTOR || "24"; // GECL

// Peta nama_alarm FAMOUS (Inggris) → { type: nama Indonesia (konsisten data lama), category }
const ALARM_MAP: Record<string, { type: string; category: string }> = {
  "Eye Closed": { type: "Mata Tertutup", category: "Fatigue Alarm" },
  "Yawning": { type: "Mengantuk", category: "Fatigue Alarm" },
  "Fatigue Driving": { type: "Kelelahan", category: "Fatigue Alarm" },
  "Distracted driving": { type: "Perhatian Teralihkan", category: "Non Fatigue Alarm" },
  "Distracted Driving": { type: "Perhatian Teralihkan", category: "Non Fatigue Alarm" },
  "Phone Call": { type: "Menggunakan Handphone", category: "Non Fatigue Alarm" },
  "Smoking": { type: "Merokok", category: "Non Fatigue Alarm" },
  "Seat Belt Not Fastened": { type: "Tidak Menggunakan Sabuk Pengaman", category: "Non Fatigue Alarm" },
  "Camera Covered": { type: "Kamera FMS Tertutup", category: "Non Fatigue Alarm" },
  "Headway Monitoring Warning": { type: "Jaga Jarak", category: "Non Fatigue Alarm" },
  "Forward Collision Warning": { type: "Awas Tabrakan", category: "AEBS" },
  "Softbrake AEBS": { type: "Softbrake AEBS", category: "AEBS" },
  "Fullbrake AEBS": { type: "Fullbrake AEBS", category: "AEBS" },
  "Over Speed": { type: "Over Speed", category: "Overspeed" },
};
const ALARM_NAMES = Object.keys(ALARM_MAP).join(",");

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// Minggu ala FAMOUS (cutweek mulai Jumat). Anchor: 2026-06-05 (Jumat) = week 24.
function famousWeek(d: Date): number {
  const anchor = Date.UTC(2026, 5, 5);
  const day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return 24 + Math.floor((day - anchor) / (7 * 86400000));
}

// --- auth state (in-memory) ---
let apiKeyCache: string | null = process.env.FAMOUS_API_KEY || null;
let tokenCache: string | null = null;

export async function getApiKey(): Promise<string> {
  if (apiKeyCache) return apiKeyCache;
  const html = await fetch(`${BASE}/sign-in`).then((r) => r.text());
  const scripts = Array.from(html.matchAll(/(?:src|href)="([^"]+\.js)"/g), (m) => m[1]);
  for (const s of scripts) {
    const u = s.startsWith("http") ? s : `${BASE}${s.startsWith("/") ? "" : "/"}${s}`;
    const t = await fetch(u).then((r) => r.text()).catch(() => "");
    const m = t.match(/x-api-key["'`]\s*[:=]\s*["'`]([A-Za-z0-9_\-]{20,60})["'`]/i);
    if (m) { apiKeyCache = m[1]; return apiKeyCache; }
  }
  throw new Error("[fms-scraper] x-api-key tidak ditemukan di bundle FAMOUS");
}

async function loginFamous(): Promise<string> {
  const email = process.env.FAMOUS_EMAIL;
  const password = process.env.FAMOUS_PASSWORD;
  if (!email || !password) throw new Error("[fms-scraper] FAMOUS_EMAIL/FAMOUS_PASSWORD belum di-set");
  const apiKey = await getApiKey();
  const r = await fetch(`${BASE}/api/auth/contractor/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ pic_email: email, password }),
  });
  const j: any = await r.json().catch(() => ({}));
  const token = j?.data?.access_token;
  if (!r.ok || !token) throw new Error(`[fms-scraper] login gagal: status ${r.status} ${j?.error || j?.message || ""}`);
  tokenCache = token;
  return token;
}

function envToken(): string | null {
  const t = process.env.FAMOUS_TOKEN;
  return t ? t.replace(/^"|"$/g, "").trim() : null;
}

// Token tersimpan: DB (system_settings 'famous_token') → env FAMOUS_TOKEN.
export async function getStoredToken(): Promise<string | null> {
  try {
    const dbTok = await storage.getSystemSetting("famous_token");
    if (dbTok && dbTok.trim()) return dbTok.trim();
  } catch { /* ignore */ }
  return envToken();
}

async function getToken(): Promise<string> {
  const stored = await getStoredToken();
  if (stored) return stored; // mode token (DB/env): skip login
  if (!tokenCache) await loginFamous();
  return tokenCache as string;
}

async function apiGet(path: string, retry = true): Promise<any> {
  const apiKey = await getApiKey();
  const token = await getToken();
  const r = await fetch(`${BASE}${path}`, {
    headers: { "x-access-token": token, "x-api-key": apiKey, Accept: "application/json" },
  });
  if (r.status === 401) {
    if (await getStoredToken()) throw new Error("[fms-scraper] Token FMS kedaluwarsa — perbarui via halaman 'Token FMS' / POST /api/fms/token");
    if (retry) { tokenCache = null; await loginFamous(); return apiGet(path, false); }
  }
  if (!r.ok) throw new Error(`[fms-scraper] GET ${path} → ${r.status}`);
  return r.json();
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Pemetaan kode status (1=Valid, 2=Tidak Valid, 0/null=Belum Validasi).
function statusCodeToLabel(raw: any): string {
  if (raw == null || raw === "") return "Belum Validasi";
  const s = String(raw).trim();
  if (s === "1" || (/valid/i.test(s) && !/tidak|invalid/i.test(s))) return "Valid";
  if (s === "2" || /tidak|invalid/i.test(s)) return "Tidak Valid";
  return "Belum Validasi"; // 0
}

// Status EFEKTIF seperti tampilan FAMOUS: pakai validasi MANUSIA bila sudah divalidasi
// (status 1/2), kalau belum (0/null) jatuh ke validasi AI (ai_validation_status).
// FAMOUS v2 mengembalikan kedua field sebagai OBJEK {status, valid_by, role_id, validated_at}.
function mapValidation(v: any, ai?: any): string {
  const human = (v && typeof v === "object") ? v.status : v;
  const hs = human == null ? "" : String(human).trim();
  if (hs === "1" || hs === "2") return statusCodeToLabel(hs); // override manusia
  const aiStatus = (ai && typeof ai === "object") ? ai.status : ai;
  return statusCodeToLabel(aiStatus); // fallback ke AI (sesuai count FAMOUS)
}

function mapAlarm(a: any): InsertFmsViolation | null {
  const name = String(a.nama_alarm || "").trim();
  const mapped = ALARM_MAP[name] || { type: name || "Unknown", category: "Lainnya" };
  const timeStr = String(a.time || "").replace("T", " ");
  const m = timeStr.match(/(\d{4})-(\d{2})-(\d{2})[ ]?(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const time = `${m[4]}:${m[5]}:${m[6]}`;
  const dObj = new Date(+m[1], +m[2] - 1, +m[3]);
  const speed = a.speed != null && a.speed !== "" ? Number(String(a.speed).replace(/[^\d.]/g, "")) : null;
  return {
    violationDate: date,
    violationTime: time,
    violationTimestamp: new Date(`${date}T${time}`),
    vehicleNo: String(a.hull || "-"),
    company: String(a.contractor || "GECL"),
    violationType: mapped.type,
    category: mapped.category,
    location: [a.geofence, a.jalur].filter(Boolean).join(" · ") || null,
    coordinate: a.alarm_gps ? String(a.alarm_gps).slice(0, 50) : null,
    shift: (+m[4] >= 6 && +m[4] < 18) ? "Shift 1" : "Shift 2",
    week: famousWeek(dObj),
    month: BULAN[+m[2] - 1],
    level: speed != null && !isNaN(speed) ? speed : (a.level != null ? Number(a.level) : null),
    validationStatus: mapValidation(a.validation_status, a.ai_validation_status),
    validatedBy: a.validation_status?.valid_by ? String(a.validation_status.valid_by) : (a.ai_validation_status?.valid_by ? `AI` : (a.validated_by ? String(a.validated_by) : null)),
    manualDriverName: a.driver ? String(a.driver) : null,
    manualDriverNik: a.nik ? String(a.nik) : null,
    evidenceUrl: a.image_path ? String(a.image_path) : null,
    alarmId: a.alarm_id ? String(a.alarm_id) : null,
    dedupeKey: a.alarm_id ? `F:${a.alarm_id}` : `X:${date}|${time}|${a.hull}|${mapped.type}`,
  } as InsertFmsViolation;
}

/** Tarik pelanggaran FAMOUS untuk rentang [from,to] (Date). Read-only.
 *  - hoursBack: jendela scrape rutin (default 3 jam) untuk data BARU.
 *  - daysBack: jendela tarik-ulang (revalidate) agar status validasi lama ter-refresh.
 *  - silent: jangan kirim notifikasi lonceng (dipakai saat revalidate). */
export async function runFmsScrape(opts?: { hoursBack?: number; daysBack?: number; silent?: boolean; from?: Date; to?: Date }): Promise<{ fetched: number; upserted: number; inserted: number }> {
  if (!(await getStoredToken()) && (!process.env.FAMOUS_EMAIL || !process.env.FAMOUS_PASSWORD)) {
    console.warn("[fms-scraper] dilewati — set token via 'Token FMS' atau FAMOUS_EMAIL/PASSWORD");
    return { fetched: 0, upserted: 0, inserted: 0 };
  }
  const to = opts?.to ?? new Date();
  const windowHours = opts?.daysBack != null ? opts.daysBack * 24 : (opts?.hoursBack ?? 3);
  const from = opts?.from ?? new Date(to.getTime() - windowHours * 3600 * 1000);
  const q = (page: number) =>
    `/api/v2/alarms?page=${page}&limit=100&validation_status=1,2,0` +
    `&nama_alarm=${encodeURIComponent(ALARM_NAMES)}&level=1,2` +
    `&start_date=${encodeURIComponent(fmt(from))}&end_date=${encodeURIComponent(fmt(to))}` +
    `&kontraktor=${KONTRAKTOR}&source=FMS2&geofences=&line=&mdvr_device_id=`;
  let page = 1, totalPages = 1, fetched = 0;
  const rows: InsertFmsViolation[] = [];
  do {
    const j = await apiGet(q(page));
    const items = j.items || j.data || [];
    totalPages = j?.meta?.totalPages || 1;
    for (const a of items) { const r = mapAlarm(a); if (r) rows.push(r); }
    fetched += items.length;
    page++;
  } while (page <= totalPages && page <= 200); // guard
  let upserted = 0, inserted = 0;
  if (rows.length) {
    const res = await storage.batchInsertFmsViolations(rows);
    upserted = res.count; inserted = res.inserted;
  }
  console.log(`[fms-scraper] window ${fmt(from)}–${fmt(to)} | fetched=${fetched} upserted=${upserted} new=${inserted}`);
  // Notifikasi lonceng: hanya bila ada pelanggaran BENAR-BENAR baru (bukan update validasi)
  if (inserted > 0 && !opts?.silent) {
    try {
      await storage.createNotification({
        type: "fms",
        title: `${inserted} pelanggaran FMS baru masuk`,
        body: "Data otomatis dari FAMOUS (auto-pull).",
        link: "/workspace/hse/fms-dashboard",
        audience: "hse",
        meta: { inserted, fetched },
      });
    } catch (e: any) { console.warn("[fms-scraper] gagal buat notifikasi:", e?.message || e); }
  }
  return { fetched, upserted, inserted };
}

/** Tarik SEMUA alarm (Level 1+2) untuk rentang tanggal [from,to], HARI-PER-HARI agar tiap hari
 *  tuntas di bawah page-guard. Idempoten (upsert by dedupe_key). Untuk tarik data historis. */
export async function runFmsScrapeRange(opts: { from: Date; to: Date }): Promise<{ fetched: number; upserted: number; inserted: number; days: number }> {
  const { from, to } = opts;
  let fetched = 0, upserted = 0, inserted = 0, days = 0;
  // mulai dari hari 'from' (00:00) sampai 'to'
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
  while (cur <= end) {
    const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0);
    const dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59);
    const r = await runFmsScrape({ from: dayStart, to: dayEnd, silent: true });
    fetched += r.fetched; upserted += r.upserted; inserted += r.inserted; days++;
    cur.setDate(cur.getDate() + 1);
  }
  console.log(`[fms-scrape-range] ${fmt(from)}–${fmt(to)} (${days} hari): fetched=${fetched} upserted=${upserted} new=${inserted}`);
  return { fetched, upserted, inserted, days };
}

/** Tarik ULANG N hari terakhir agar status validasi (aksi manusia yang terjadi belakangan)
 *  ter-refresh di DB. Idempoten: upsert by dedupe_key — hanya meng-update field validasi/level/dll,
 *  tidak menggandakan baris. Default 14 hari. */
export async function runFmsRevalidate(opts?: { daysBack?: number }): Promise<{ fetched: number; upserted: number; inserted: number }> {
  const daysBack = opts?.daysBack ?? 14;
  console.log(`[fms-revalidate] tarik ulang ${daysBack} hari terakhir untuk refresh status validasi`);
  // Per-HARI agar setiap hari tuntas di bawah page-guard (window besar terpotong di 200 halaman).
  let fetched = 0, upserted = 0, inserted = 0;
  const now = new Date();
  for (let d = 0; d < daysBack; d++) {
    const day = new Date(now.getTime() - d * 24 * 3600 * 1000);
    const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const to = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    const r = await runFmsScrape({ from, to, silent: true });
    fetched += r.fetched; upserted += r.upserted; inserted += r.inserted;
  }
  console.log(`[fms-revalidate] selesai: fetched=${fetched} upserted=${upserted} new=${inserted}`);
  return { fetched, upserted, inserted };
}

// Nama alarm Level-2 (Fatigue/Non-Fatigue/AEBS) — SEMUA kecuali Overspeed.
const GAP_L2_NAMES = Object.keys(ALARM_MAP).filter((n) => n !== "Over Speed").join(",");

/**
 * Backfill AMAN data historis: tarik HANYA alarm **Level-2** untuk Fatigue/Non-Fatigue/AEBS,
 * yang TIDAK pernah masuk lewat export Excel (Excel = Level-1 only). Karena Excel tak punya
 * baris Level-2, penambahan ini tidak menggandakan apa pun.
 * Catatan: Level-1 TIDAK ditarik (akan dobel dengan baris Excel — dedupe key beda X: vs F:).
 * Catatan: "Over Speed" TIDAK tersedia di endpoint source=FMS2 (nama tak dikenal → API balas
 *   fallback default), jadi tidak ikut ditarik di sini.
 * Read-only ke FAMOUS. Idempoten (upsert by dedupe_key F:<alarm_id>).
 */
export async function runFmsBackfillGap(opts: { from: Date; to: Date }): Promise<{ fetched: number; upserted: number }> {
  if (!(await getStoredToken()) && (!process.env.FAMOUS_EMAIL || !process.env.FAMOUS_PASSWORD)) {
    console.warn("[fms-backfill] dilewati — set token via 'Token FMS' atau FAMOUS_EMAIL/PASSWORD");
    return { fetched: 0, upserted: 0 };
  }
  const { from, to } = opts;
  const q = (page: number) =>
    `/api/v2/alarms?page=${page}&limit=100&validation_status=1,2,0` +
    `&nama_alarm=${encodeURIComponent(GAP_L2_NAMES)}&level=2` +
    `&start_date=${encodeURIComponent(fmt(from))}&end_date=${encodeURIComponent(fmt(to))}` +
    `&kontraktor=${KONTRAKTOR}&source=FMS2&geofences=&line=&mdvr_device_id=`;
  let page = 1, totalPages = 1, fetched = 0;
  const rows: InsertFmsViolation[] = [];
  do {
    const j = await apiGet(q(page));
    const items = j.items || j.data || [];
    totalPages = j?.meta?.totalPages || 1;
    for (const a of items) { const r = mapAlarm(a); if (r) rows.push(r); }
    fetched += items.length;
    page++;
  } while (page <= totalPages && page <= 200); // guard
  let upserted = 0;
  if (rows.length) upserted = (await storage.batchInsertFmsViolations(rows)).count;
  console.log(`[fms-backfill] window ${fmt(from)}–${fmt(to)} | fetched=${fetched} upserted=${upserted}`);
  return { fetched, upserted };
}
