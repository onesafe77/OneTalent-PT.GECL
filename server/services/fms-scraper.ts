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

async function getApiKey(): Promise<string> {
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

async function getToken(): Promise<string> {
  const envt = envToken();
  if (envt) return envt; // mode token: pakai token dari env (skip login)
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
    if (envToken()) throw new Error("[fms-scraper] FAMOUS_TOKEN kedaluwarsa — perbarui FAMOUS_TOKEN (atau set FAMOUS_EMAIL/PASSWORD untuk auto-login)");
    if (retry) { tokenCache = null; await loginFamous(); return apiGet(path, false); }
  }
  if (!r.ok) throw new Error(`[fms-scraper] GET ${path} → ${r.status}`);
  return r.json();
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function mapValidation(v: any): string {
  const s = String(v);
  if (s === "1" || /valid/i.test(s) && !/tidak|invalid/i.test(s)) return "Valid";
  if (s === "2" || /tidak|invalid/i.test(s)) return "Tidak Valid";
  return "Belum Validasi"; // 0
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
    validationStatus: mapValidation(a.validation_status),
    validatedBy: a.validated_by ? String(a.validated_by) : null,
    manualDriverName: a.driver ? String(a.driver) : null,
    manualDriverNik: a.nik ? String(a.nik) : null,
    evidenceUrl: a.image_path ? String(a.image_path) : null,
    alarmId: a.alarm_id ? String(a.alarm_id) : null,
    dedupeKey: a.alarm_id ? `F:${a.alarm_id}` : `X:${date}|${time}|${a.hull}|${mapped.type}`,
  } as InsertFmsViolation;
}

/** Tarik pelanggaran FAMOUS untuk rentang [from,to] (Date). Read-only. */
export async function runFmsScrape(opts?: { hoursBack?: number }): Promise<{ fetched: number; upserted: number }> {
  if (!envToken() && (!process.env.FAMOUS_EMAIL || !process.env.FAMOUS_PASSWORD)) {
    console.warn("[fms-scraper] dilewati — set FAMOUS_TOKEN atau FAMOUS_EMAIL/PASSWORD");
    return { fetched: 0, upserted: 0 };
  }
  const to = new Date();
  const from = new Date(to.getTime() - (opts?.hoursBack ?? 3) * 3600 * 1000);
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
  let upserted = 0;
  if (rows.length) upserted = (await storage.batchInsertFmsViolations(rows)).count;
  console.log(`[fms-scraper] window ${fmt(from)}–${fmt(to)} | fetched=${fetched} upserted=${upserted}`);
  return { fetched, upserted };
}
