// Bot AI Telegram untuk Safety Patrol (long-polling).
// Terima laporan teks+foto via chat pribadi -> AI parse (reuse parser yang ada) -> simpan
// ke safety_patrol_reports -> balas konfirmasi (Hermes) + tanya-balik bila field kurang.
// Pipeline WhatsApp TIDAK disentuh.

import { db } from "../db";
import { telegramSafetyPatrolUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  parseReportWithGemini,
  isLikelyPatrolReport,
  isValidParsedReport,
  analyzeReportContent,
} from "../gemini-parser";
import { storage } from "../storage";
import { canonicalSafetyActivity, canonicalReportActivity } from "../lib/safety-activity";
import { openRouterClient, AI_MODELS } from "../ai-config";
import {
  getBotToken,
  tgGetMe,
  tgApi,
  tgSendMessage,
  tgSendTyping,
  tgDownloadPhotoToStorage,
  tgSetWebhook,
} from "./telegram-service";

let running = false;
let offset = 0;

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const todayStr = () => new Date().toISOString().split("T")[0];
const bulanIndo = (d: Date) => BULAN[d.getMonth()];
const weekOfMonth = (d: Date) => Math.min(5, Math.floor((d.getDate() - 1) / 7) + 1);

// Daftar petugas Safety Patrol resmi (semua PT GECL). Edit di sini bila ada perubahan tim.
const SP_OFFICERS: { name: string; aliases: string[] }[] = [
  { name: "Dimas Saputra", aliases: ["dimas saputra", "dimas"] },
  { name: "Renaldi", aliases: ["renaldi", "rinaldi", "reynaldi"] },
  { name: "Jumaidi", aliases: ["jumaidi", "jumadi"] },
];

// Cari petugas resmi yang disebut di teks laporan -> nama kanonik (dedupe, urut kemunculan).
// Karena roster = petugas PT GECL, nama dari perusahaan lain otomatis tersaring.
function resolveOfficers(text: string): string[] {
  const low = (text || "").toLowerCase();
  const found: { name: string; pos: number }[] = [];
  for (const o of SP_OFFICERS) {
    let pos = -1;
    for (const a of o.aliases) {
      const i = low.indexOf(a);
      if (i >= 0) { pos = pos < 0 ? i : Math.min(pos, i); }
    }
    if (pos >= 0) found.push({ name: o.name, pos });
  }
  return found.sort((a, b) => a.pos - b.pos).map((f) => f.name);
}

// Cocokkan satu nama (mis. "Renaldi") ke roster GECL → nama kanonik / null.
function matchGeclOfficer(name: string): string | null {
  const low = (name || "").toLowerCase();
  for (const o of SP_OFFICERS) if (o.aliases.some((a) => low.includes(a))) return o.name;
  return null;
}

// ---------- Briefing pembagian JOB → target per petugas ----------
// Deteksi pesan briefing (bukan laporan biasa).
function isJobBriefing(text: string): boolean {
  const low = (text || "").toLowerCase();
  if (/pembagian\s*job/.test(low)) return true;
  return /briefing/.test(low) && /standby\s*lokasi/.test(low) && (low.match(/team/g) || []).length >= 1;
}

// Parse tanggal Indonesia "Sabtu 20 Juni 2026" / "20 Juni 2026" → YYYY-MM-DD.
function parseIndoDate(text: string): string | null {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(text || "");
  if (!m) return null;
  const mi = BULAN.findIndex((b) => b.toLowerCase() === m[2].toLowerCase());
  if (mi < 0) return null;
  return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
}

// Parse briefing → { tanggal, shift, teams:[{team, lokasi, gecl, activities[](kanonik), raw[]}] }
function parseJobBriefing(text: string): { tanggal: string; shift: string; teams: Array<{ team: string; lokasi: string | null; gecl: string | null; activities: string[]; raw: string[] }> } {
  const clean = (text || "").replace(/\*/g, ""); // buang penanda bold Telegram
  const lines = clean.split(/\r?\n/);
  const tanggal = parseIndoDate(clean) || todayStr();
  const shiftM = /shift\s*(I{1,3}|\d)/i.exec(clean);
  let shift = "Shift 1";
  if (shiftM) { const t = shiftM[1].toUpperCase(); shift = (t === "II" || t === "2") ? "Shift 2" : "Shift 1"; }

  // Pisah blok per "N. TEAM ..."
  const idxs: number[] = [];
  lines.forEach((ln, i) => { if (/^\s*\d+\.\s*team\b/i.test(ln)) idxs.push(i); });
  const teams: Array<{ team: string; lokasi: string | null; gecl: string | null; activities: string[]; raw: string[] }> = [];
  for (let k = 0; k < idxs.length; k++) {
    const start = idxs[k], end = k + 1 < idxs.length ? idxs[k + 1] : lines.length;
    const block = lines.slice(start, end);
    const team = block[0].replace(/^\s*\d+\.\s*/, "").trim();
    let lokasi: string | null = null, gecl: string | null = null;
    const raw: string[] = [];
    for (const ln of block) {
      const lo = ln.toLowerCase();
      const locM = /standby\s*lokasi\s*:\s*(.+)/i.exec(ln);
      if (locM) lokasi = locM[1].trim();
      const gm = /\bgecl\s*:\s*(.+)/i.exec(ln);
      if (gm) gecl = matchGeclOfficer(gm[1].trim());
      // baris kegiatan: diawali "- " atau "• "
      const km = /^\s*[-•]\s*(.+)/.exec(ln);
      if (km && !lo.includes("nama mitra") && !lo.includes("standby")) raw.push(km[1].trim());
    }
    const activities = Array.from(new Set(raw.map((r) => canonicalSafetyActivity(r)).filter(Boolean) as string[]));
    teams.push({ team, lokasi, gecl, activities, raw });
  }
  return { tanggal, shift, teams };
}

// Tangani briefing: simpan target untuk tiap petugas GECL yang ada di tim.
async function handleJobBriefing(chatId: string, text: string) {
  const parsed = parseJobBriefing(text);
  const saved: string[] = [];
  for (const t of parsed.teams) {
    if (!t.gecl || !t.activities.length) continue;
    try {
      await storage.upsertJobTarget({
        tanggal: parsed.tanggal, shift: parsed.shift, officerName: t.gecl,
        team: t.team, lokasi: t.lokasi, activities: t.activities, rawActivities: t.raw,
        sourceMessage: text, sourceChatId: chatId,
      });
      // Blok per petugas + DAFTAR kegiatan yang harus dikumpulkan
      const header = `*${t.gecl}*${t.team ? " — " + t.team : ""}${t.lokasi ? " (" + t.lokasi + ")" : ""} · ${t.activities.length} kegiatan`;
      saved.push(`${header}\n${t.activities.map((a) => "   ☐ " + a).join("\n")}`);
    } catch (e: any) { console.error("[Telegram] upsert job target error:", e?.message || e); }
  }
  if (saved.length) {
    await tgSendMessage(chatId, `✅ Briefing diterima — target ${parsed.shift}, ${parsed.tanggal}:\n\n${saved.join("\n\n")}\n\nKegiatan di atas akan ter-checklist otomatis dari laporan yang masuk. Ketik /progress kapan saja untuk cek sisa.`);
  } else {
    await tgSendMessage(chatId, "📋 Briefing diterima, tapi tak ada petugas GECL (Renaldi/Jumaidi/Dimas) dengan kegiatan terdeteksi. Pastikan format 'GECL : <nama>' dan daftar 'Kegiatan' ada.");
  }
}

// State percakapan "tanya-balik" (in-memory, cukup untuk ±5 user).
interface Pending { rawText: string; photos: string[]; asked: number; }
const pendingByChat = new Map<string, Pending>();

// Buffer album (beberapa foto dikirim sekaligus -> 1 laporan).
interface Album { photos: string[]; caption: string; chatId: string; user: any; timer: ReturnType<typeof setTimeout> | null; }
const albumBuffer = new Map<string, Album>();

// Agregasi foto<->teks yang dikirim TERPISAH (caption Telegram dibatasi 1024 char).
const WINDOW_MS = 60000; // 1 menit (batas selisih teks↔foto agar dianggap 1 laporan)
// Laporan terakhir yang disimpan per chat (untuk menempelkan foto yang datang menyusul).
const lastReportByChat = new Map<string, { reportId: string; ts: number; photos: string[] }>();
// Foto yang datang SEBELUM teks laporan (ditahan sebentar agar bisa digabung ke laporan berikutnya).
const recentPhotosByChat = new Map<string, { urls: string[]; ts: number; timer: ReturnType<typeof setTimeout> | null; asked?: boolean }>();
// Foto tanpa teks: setelah jeda ini bot MENANYAKAN keterangan; bila tak dijawab sampai FALLBACK,
// baru disimpan sebagai "(foto tanpa keterangan)".
const PHOTO_ASK_AFTER_MS = 8000;      // 8 dtk: beri waktu album terkumpul sebelum bertanya
const PHOTO_FALLBACK_MS = 600000;     // 10 mnt: batas tunggu jawaban keterangan

// ---------- User mapping ----------
async function upsertUser(chatId: string, username?: string, firstName?: string) {
  const [existing] = await db.select().from(telegramSafetyPatrolUsers).where(eq(telegramSafetyPatrolUsers.chatId, chatId));
  if (existing) {
    await db.update(telegramSafetyPatrolUsers)
      .set({ lastActiveAt: new Date(), telegramUsername: username ?? existing.telegramUsername, firstName: firstName ?? existing.firstName })
      .where(eq(telegramSafetyPatrolUsers.chatId, chatId));
    return existing;
  }
  const namaPelaksana = firstName || username || "Pelaksana";
  const [created] = await db.insert(telegramSafetyPatrolUsers)
    .values({ chatId, telegramUsername: username || null, firstName: firstName || null, namaPelaksana })
    .returning();
  return created;
}

async function setUserName(chatId: string, nama: string) {
  await db.update(telegramSafetyPatrolUsers).set({ namaPelaksana: nama }).where(eq(telegramSafetyPatrolUsers.chatId, chatId));
}

// ---------- Hermes conversational layer ----------
async function hermes(system: string, user: string, fallback: string): Promise<string> {
  try {
    const resp = await openRouterClient.chat.completions.create({
      model: AI_MODELS.SMART_CHAT,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 220,
      temperature: 0.4,
    });
    return resp.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (e: any) {
    console.error("[Telegram] Hermes error:", e?.message || e);
    return fallback;
  }
}

const SYS_BOT = "Kamu asisten Safety Patrol HSE PT Borneo Indobara di Telegram. Jawab singkat (maks 3 kalimat), sopan, ramah, Bahasa Indonesia. Jangan mengarang data.";

async function replyConfirm(chatId: string, nama: string, parsed: any, hasPhotos: boolean = false) {
  const ringkas = JSON.stringify({
    jenis: parsed.jenisLaporan, kegiatan: parsed.kegiatan, tanggal: parsed.tanggal,
    shift: parsed.shift, waktu: parsed.waktuPelaksanaan, lokasi: parsed.lokasi,
    pelaksana: parsed.namaPelaksana, temuan: parsed.temuan,
  });
  // Ringkasan terstruktur (hanya field terisi) — dipakai sbg fallback bila AI gagal.
  const lines = [
    (parsed.kegiatan || parsed.jenisLaporan) ? `• Kegiatan: ${parsed.kegiatan || parsed.jenisLaporan}` : "",
    parsed.tanggal ? `• Tanggal: ${parsed.tanggal}${parsed.shift ? " · " + parsed.shift : ""}` : (parsed.shift ? `• Shift: ${parsed.shift}` : ""),
    parsed.waktuPelaksanaan ? `• Waktu: ${parsed.waktuPelaksanaan}` : "",
    parsed.lokasi ? `• Lokasi: ${parsed.lokasi}` : "",
    parsed.namaPelaksana ? `• Pelaksana: ${parsed.namaPelaksana}` : "",
    parsed.temuan ? `• Temuan: ${String(parsed.temuan).slice(0, 200)}` : "",
  ].filter(Boolean).join("\n");
  const photoNote = hasPhotos ? "" : "\n\n📷 Jangan lupa kirim foto kegiatannya ya 🙏";
  const fallback = `✅ Laporan tersimpan, terima kasih ${nama}!\n\n📋 Ringkasan:\n${lines || "(ringkasan tidak tersedia)"}${photoNote}`;
  const text = await hermes(
    SYS_BOT,
    `Laporan dari ${nama} sudah TERSIMPAN ke rekap. Buat konfirmasi ramah + RINGKASAN isi laporan (kegiatan, tanggal, shift, waktu, lokasi, pelaksana, temuan).${hasPhotos ? "" : " Akhiri dengan ajakan singkat mengirim foto kegiatan."} Data: ${ringkas}`,
    fallback
  );
  await tgSendMessage(chatId, text);
}

// Ambil & kosongkan foto buffer (yang datang sebelum teks) bila masih dalam window.
function drainRecentPhotos(chatId: string): string[] {
  const buf = recentPhotosByChat.get(chatId);
  if (!buf) return [];
  // Buffer yang sudah ditanyakan (asked) ditunggu lebih lama (sampai jawaban keterangan masuk).
  const maxAge = buf.asked ? PHOTO_FALLBACK_MS : WINDOW_MS;
  if (Date.now() - buf.ts > maxAge) { recentPhotosByChat.delete(chatId); return []; }
  if (buf.timer) clearTimeout(buf.timer);
  recentPhotosByChat.delete(chatId);
  return buf.urls;
}

// Foto/lampiran masuk: tempel ke laporan terakhir (≤WINDOW_MS) ATAU buffer untuk teks yang menyusul.
// Dipakai cabang foto tunggal DAN album, supaya album juga menyatu dgn laporan teks.
async function attachOrBufferPhotos(chatId: string, user: any, urls: string[]) {
  if (!urls || !urls.length) return;
  const last = lastReportByChat.get(chatId);
  if (last && Date.now() - last.ts <= WINDOW_MS) {
    const merged = [...(last.photos || []), ...urls];
    try {
      await storage.updateSafetyPatrolReport(last.reportId, { buktiKegiatan: merged, photos: merged } as any);
      lastReportByChat.set(chatId, { ...last, ts: Date.now(), photos: merged });
      await tgSendMessage(chatId, "📎 Foto/lampiran ditambahkan ke laporan.");
    } catch (e: any) { console.error("[Telegram] attach photo error:", e?.message || e); }
    return;
  }
  // Belum ada laporan → buffer; akan digabung ke teks yang menyusul (drainRecentPhotos di saveReport).
  const buf = recentPhotosByChat.get(chatId) || { urls: [], ts: Date.now(), timer: null, asked: false };
  buf.urls.push(...urls);
  buf.ts = Date.now();
  if (buf.timer) clearTimeout(buf.timer);
  // Tahap 1 (≈8 dtk, biar album terkumpul): bila masih belum ada teks → bot TANYA keterangan.
  buf.timer = setTimeout(async () => {
    const cur = recentPhotosByChat.get(chatId);
    if (!cur || !cur.urls.length) return;
    if (!cur.asked) {
      cur.asked = true;
      cur.ts = Date.now();
      try {
        await tgSendMessage(chatId,
          "📷 Foto diterima. Mohon kirim *keterangan kegiatannya* (tanggal, shift, lokasi, temuan) supaya laporan lengkap ya 🙏");
      } catch (e: any) { console.error("[Telegram] ask-caption error:", e?.message || e); }
      // Tahap 2 (fallback 10 mnt): bila tetap tak ada teks → simpan tanpa keterangan (data tak hilang).
      if (cur.timer) clearTimeout(cur.timer);
      cur.timer = setTimeout(async () => {
        const c2 = recentPhotosByChat.get(chatId);
        recentPhotosByChat.delete(chatId);
        if (c2 && c2.urls.length) {
          try { await saveReport(chatId, user, "(foto tanpa keterangan)", c2.urls); }
          catch (e: any) { console.error("[Telegram] foto-only save error:", e?.message || e); }
        }
      }, PHOTO_FALLBACK_MS);
      recentPhotosByChat.set(chatId, cur);
    }
  }, PHOTO_ASK_AFTER_MS);
  recentPhotosByChat.set(chatId, buf);
}

// ---------- Feedback target job (kegiatan yang kurang) ----------
// Hitung progres petugas terhadap target briefing utk tanggal (+shift bila ada).
async function computeJobProgress(officerName: string, tanggal: string, shift?: string):
  Promise<{ team: string | null; shift: string; total: number; done: number; doneList: string[]; pending: string[] } | null> {
  const targets = await storage.getJobTargets(tanggal, shift);
  const t = targets.find((x: any) => String(x.officerName).toLowerCase() === officerName.toLowerCase());
  if (!t || !(t.activities || []).length) return null;
  const reports = await storage.getSafetyPatrolReportsByDateRange(tanggal, tanggal);
  const achieved = new Set(
    reports
      .filter((r: any) => (r.namaPelaksana || "").toLowerCase().includes(officerName.toLowerCase()))
      .map((r: any) => canonicalReportActivity(r))
      .filter(Boolean) as string[]
  );
  const doneList = (t.activities as string[]).filter((a) => achieved.has(a));
  const pending = (t.activities as string[]).filter((a) => !achieved.has(a));
  return { team: t.team, shift: t.shift, total: t.activities.length, done: doneList.length, doneList, pending };
}

// Rangkai pesan feedback (AI ramah + daftar sisa kegiatan). Fallback teks ringkas bila AI gagal.
async function jobFeedbackText(officerName: string, p: { team: string | null; shift: string; total: number; done: number; pending: string[] }): Promise<string> {
  const pendingStr = p.pending.length ? p.pending.map((x) => "• " + x).join("\n") : "(semua selesai 🎉)";
  const fallback = `📋 Progres ${officerName} (${p.shift}): ${p.done}/${p.total} kegiatan selesai.\n` +
    (p.pending.length ? `Belum dikumpulkan:\n${pendingStr}\n\nSemangat, dilengkapi ya 🙏` : `Mantap, semua target tercapai! 🎉`);
  return hermes(
    SYS_BOT,
    `Beri feedback singkat & memotivasi untuk petugas ${officerName}. Progres target shift: ${p.done} dari ${p.total} selesai. ` +
    (p.pending.length ? `Kegiatan yang BELUM dikumpulkan: ${p.pending.join(", ")}. Sebutkan daftar sisa kegiatan itu dengan jelas (boleh pakai bullet) dan ajak melengkapi.` : `Semua sudah selesai, beri apresiasi.`),
    fallback
  );
}

// Pengingat akhir shift: kirim ringkasan sisa kegiatan ke chat asal briefing (per source_chat_id).
export async function runJobReminders(): Promise<{ chats: number; sent: number }> {
  const tgl = todayStr();
  const targets = await storage.getJobTargets(tgl);
  const byChat = new Map<string, any[]>();
  for (const t of targets) {
    if (!t.sourceChatId) continue;
    const arr = byChat.get(t.sourceChatId) || []; arr.push(t); byChat.set(t.sourceChatId, arr);
  }
  let sent = 0;
  for (const [chatId, list] of Array.from(byChat.entries())) {
    const lines: string[] = [];
    for (const t of list) {
      const prog = await computeJobProgress(t.officerName, tgl, t.shift);
      if (prog && prog.pending.length) {
        lines.push(`*${t.officerName}* (${t.shift}) — ${prog.done}/${prog.total}\nBelum: ${prog.pending.join(", ")}`);
      }
    }
    if (lines.length) {
      try { await tgSendMessage(chatId, `🔔 Pengingat akhir shift (${tgl}) — kegiatan yang masih kurang:\n\n${lines.join("\n\n")}\n\nMohon dilengkapi sebelum shift berakhir 🙏`); sent++; }
      catch (e: any) { console.warn("[Telegram] job reminder error:", e?.message || e); }
    }
  }
  console.log(`[job-reminder] ${tgl}: ${byChat.size} chat, ${sent} pengingat terkirim`);
  return { chats: byChat.size, sent };
}

// ---------- Simpan laporan ----------
async function saveReport(chatId: string, user: any, text: string, photos: string[]) {
  const parsed: any = await parseReportWithGemini(text);
  const reportDate = parsed.tanggal || todayStr();
  const d = new Date(reportDate);
  let aiAnalysis: string | null = null;
  try { aiAnalysis = await analyzeReportContent(text); } catch { aiAnalysis = null; }

  // Gabung foto yang sudah dikirim duluan (sebelum teks ini)
  const buffered = drainRecentPhotos(chatId);
  const allPhotos = [...buffered, ...photos];

  // Normalisasi pelaksana ke petugas Safety Patrol resmi (PT GECL).
  // Prioritas: nama eksplisit di teks → identitas akun Telegram pengirim (1 akun = 1 petugas)
  //            → hasil AI (hanya bila BUKAN generik). Hindari "Safety Patrol"/"patrol" dari AI.
  const isGeneric = (n?: string | null) => {
    const s = (n || "").trim().toLowerCase();
    return !s || ["safety patrol", "patrol", "pelaksana", "tim", "team", "-", "."].includes(s);
  };
  const officers = resolveOfficers(text);
  const userOfficer = matchGeclOfficer(user.namaPelaksana || user.firstName || "")
    || (!isGeneric(user.namaPelaksana) ? user.namaPelaksana : null);
  const aiName = !isGeneric(parsed.namaPelaksana) ? parsed.namaPelaksana : null;
  const namaPelaksana = officers.length
    ? officers.join(", ")
    : (userOfficer || aiName || user.firstName || null);
  // "Pengirim" ditampilkan = nama petugas dari laporan/akun (bila dikenali), jika tidak fallback.
  const displaySender = officers.length
    ? officers.join(", ")
    : (userOfficer || user.namaPelaksana || user.firstName || null);

  const report = await storage.createSafetyPatrolReport({
    tanggal: reportDate,
    bulan: parsed.bulan || bulanIndo(d),
    week: parsed.week || weekOfMonth(d),
    waktuPelaksanaan: parsed.waktuPelaksanaan || null,
    jenisLaporan: parsed.jenisLaporan || "Laporan Patrol",
    kegiatan: parsed.kegiatan || null,
    shift: parsed.shift || null,
    lokasi: parsed.lokasi || null,
    namaPelaksana,
    pemateri: parsed.pemateri || [],
    temuan: parsed.temuan || null,
    buktiKegiatan: allPhotos.length ? allPhotos : null,
    rawMessage: text || "(foto)",
    parsedData: parsed,
    photos: allPhotos.length ? allPhotos : null,
    senderPhone: `tg:${chatId}`,
    senderName: displaySender,
    status: "processed",
    aiAnalysis,
  } as any);

  // Catat sebagai laporan terakhir agar foto yang menyusul bisa ditempelkan
  lastReportByChat.set(chatId, { reportId: report.id, ts: Date.now(), photos: allPhotos });

  // Notifikasi lonceng (untuk tim HSE)
  try {
    await storage.createNotification({
      type: "safety_patrol",
      title: `Laporan Safety Patrol: ${parsed.kegiatan || "baru"}`,
      body: `${namaPelaksana || "-"}${reportDate ? " · " + reportDate : ""}`,
      link: "/workspace/safety-patrol",
      audience: "hse",
      meta: { reportId: report.id },
    });
  } catch (e: any) { console.warn("[notif safety_patrol] gagal:", e?.message || e); }

  if (parsed.attendance && parsed.attendance.length > 0) {
    try {
      await storage.createManySafetyPatrolAttendance(parsed.attendance.map((att: any) => ({
        reportId: report.id, unitCode: att.unitCode, shift: att.shift, status: att.status, keterangan: att.keterangan || null,
      })));
    } catch (e: any) { console.error("[Telegram] attendance error:", e?.message || e); }
  }

  await replyConfirm(chatId, user.namaPelaksana || user.firstName || "Pak/Bu", parsed, allPhotos.length > 0);

  // Feedback target job: bila petugas punya target hari ini → kirim progres + sisa kegiatan.
  try {
    const officer = officers[0] || namaPelaksana;
    if (officer) {
      const prog = await computeJobProgress(officer, reportDate, parsed.shift || undefined);
      if (prog) await tgSendMessage(chatId, await jobFeedbackText(officer, prog));
    }
  } catch (e: any) { console.warn("[Telegram] job feedback error:", e?.message || e); }

  return report;
}

// Tentukan apakah perlu tanya-balik (field paling penting: lokasi).
function missingCritical(text: string, parsed: any): string | null {
  if (!parsed.lokasi) return "lokasi";
  return null;
}

// Proses sebuah laporan teks (mungkin dengan foto).
async function handleReportText(chatId: string, user: any, text: string, photos: string[]) {
  await tgSendTyping(chatId);
  const parsed: any = await parseReportWithGemini(text);

  if (!isValidParsedReport(parsed)) {
    // Belum cukup -> simpan pending & tanya
    const prev = pendingByChat.get(chatId);
    const asked = prev ? prev.asked : 0;
    if (asked >= 1) {
      // sudah pernah ditanya, simpan apa adanya supaya tidak loop
      pendingByChat.delete(chatId);
      await saveReport(chatId, user, text, photos);
      return;
    }
    pendingByChat.set(chatId, { rawText: text, photos, asked: asked + 1 });
    const q = await hermes(SYS_BOT, `Pesan ini sepertinya laporan tapi datanya kurang lengkap: "${text}". Minta pelaksana melengkapi (tanggal, kegiatan, shift, lokasi, temuan) dalam 1 pertanyaan singkat.`,
      "Laporannya kurang lengkap 🙏 Mohon lengkapi: tanggal, kegiatan, shift, lokasi, dan temuan.");
    await tgSendMessage(chatId, q);
    return;
  }

  const miss = missingCritical(text, parsed);
  const prev = pendingByChat.get(chatId);
  if (miss && (!prev || prev.asked < 1)) {
    pendingByChat.set(chatId, { rawText: text, photos, asked: (prev?.asked || 0) + 1 });
    const q = await hermes(SYS_BOT, `Laporan hampir lengkap tapi ${miss} belum ada. Tanyakan ${miss} dalam 1 kalimat singkat & ramah ke ${user.namaPelaksana || "pelaksana"}.`,
      `Baik ${user.namaPelaksana || ""}, ${miss}-nya di mana ya?`);
    await tgSendMessage(chatId, q);
    return;
  }

  pendingByChat.delete(chatId);
  await saveReport(chatId, user, text, photos);
}

// ---------- Update handler ----------
async function processUpdate(update: any) {
  const msg = update.message;
  if (!msg || !msg.chat) return;
  const chatId = String(msg.chat.id);
  const from = msg.from || {};
  const user = await upsertUser(chatId, from.username, from.first_name);
  const text: string = (msg.text || msg.caption || "").trim();

  // Commands
  if (text.startsWith("/start")) {
    await tgSendMessage(chatId,
      `Halo ${user.namaPelaksana || from.first_name || ""}! 👋\nSaya bot Safety Patrol HSE PT Borneo Indobara.\n\nKirim laporan patrol Anda di sini (boleh disertai foto). Contoh:\n"Daily Briefing Shift 1, KM 1,5, 08:00 WITA, oleh Jumaidi. Temuan: ..."\n\nPerintah: /nama <nama Anda> untuk mengubah nama pelaksana.`);
    return;
  }
  if (text.startsWith("/help")) {
    await tgSendMessage(chatId, "Kirim teks laporan patrol (boleh + foto). Bot akan merangkum & menyimpan. Bila ada data kurang, saya akan menanyakannya.\n\nPerintah: /nama <nama> · /progress (cek sisa kegiatan target hari ini).");
    return;
  }
  if (text.startsWith("/progress")) {
    const officer = matchGeclOfficer(user.namaPelaksana || from.first_name || "");
    if (!officer) { await tgSendMessage(chatId, "Belum bisa kenali nama petugas. Set dulu: /nama <nama Anda> (mis. /nama Renaldi)."); return; }
    const tgl = todayStr();
    const todayTargets = (await storage.getJobTargets(tgl)).filter((t: any) => String(t.officerName).toLowerCase() === officer.toLowerCase());
    if (!todayTargets.length) { await tgSendMessage(chatId, `Belum ada target job untuk ${officer} hari ini (${tgl}). Pastikan briefing sudah dikirim.`); return; }
    for (const t of todayTargets) {
      const prog = await computeJobProgress(officer, tgl, t.shift);
      if (prog) await tgSendMessage(chatId, await jobFeedbackText(officer, prog));
    }
    return;
  }
  if (text.startsWith("/nama")) {
    const nama = text.replace(/^\/nama\s*/i, "").trim();
    if (nama) { await setUserName(chatId, nama); await tgSendMessage(chatId, `Siap, nama pelaksana diset: ${nama} ✅`); }
    else await tgSendMessage(chatId, "Format: /nama Budi Santoso");
    return;
  }

  // Briefing pembagian JOB (dikirim 1x awal shift) → simpan target, BUKAN laporan.
  if (text && isJobBriefing(text)) {
    try { await handleJobBriefing(chatId, text); }
    catch (e: any) { console.error("[Telegram] job briefing error:", e?.message || e); await tgSendMessage(chatId, "Maaf, gagal memproses briefing. Coba kirim ulang."); }
    return;
  }

  // Foto / lampiran (foto, video, dokumen)
  let photoUrls: string[] = [];
  if (msg.photo && msg.photo.length) {
    const largest = msg.photo[msg.photo.length - 1];
    const url = await tgDownloadPhotoToStorage(largest.file_id);
    if (url) photoUrls.push(url);
  }
  if (msg.video?.file_id) {
    const url = await tgDownloadPhotoToStorage(msg.video.file_id);
    if (url) photoUrls.push(url);
  }
  if (msg.document?.file_id) {
    const url = await tgDownloadPhotoToStorage(msg.document.file_id);
    if (url) photoUrls.push(url);
  }

  // Album (beberapa foto) -> kumpulkan, debounce
  if (msg.media_group_id) {
    const key = `${chatId}:${msg.media_group_id}`;
    const buf = albumBuffer.get(key) || { photos: [], caption: "", chatId, user, timer: null };
    buf.photos.push(...photoUrls);
    if (text) buf.caption = text;
    if (buf.timer) clearTimeout(buf.timer);
    buf.timer = setTimeout(async () => {
      albumBuffer.delete(key);
      try {
        if (buf.caption && isLikelyPatrolReport(buf.caption)) {
          await handleReportText(chatId, user, buf.caption, buf.photos);
        } else if (buf.photos.length) {
          // Album tanpa caption laporan → tempel ke laporan teks terakhir / buffer (bukan laporan baru)
          await attachOrBufferPhotos(chatId, buf.user, buf.photos);
        }
      } catch (e: any) { console.error("[Telegram] album error:", e?.message || e); }
    }, 2500);
    albumBuffer.set(key, buf);
    return;
  }

  // Lanjutan jawaban tanya-balik
  const pending = pendingByChat.get(chatId);
  if (pending && text && !text.startsWith("/")) {
    const merged = `${pending.rawText}\n${text}`;
    const mergedPhotos = [...pending.photos, ...photoUrls];
    await handleReportText(chatId, user, merged, mergedPhotos);
    return;
  }

  // Teks laporan
  if (text && text.length > 3) {
    // Petugas sedang MENJAWAB pertanyaan keterangan untuk foto yang ditahan → perlakukan sebagai laporan
    // (foto buffer akan ikut tergabung via drainRecentPhotos di saveReport), walau teks pendek/tak baku.
    const photoBuf = recentPhotosByChat.get(chatId);
    const awaitingCaption = !!(photoBuf && photoBuf.asked && photoBuf.urls.length);
    if (awaitingCaption || isLikelyPatrolReport(text)) {
      await handleReportText(chatId, user, text, photoUrls);
    } else {
      const r = await hermes(SYS_BOT, `Pelaksana menulis: "${text}". Ini bukan laporan patrol. Balas ramah & arahkan untuk mengirim laporan patrol (sebut contoh field: tanggal, kegiatan, shift, lokasi, temuan).`,
        "Halo! Kirimkan laporan patrol ya (tanggal, kegiatan, shift, lokasi, temuan) — boleh disertai foto. 🙏");
      await tgSendMessage(chatId, r);
    }
    return;
  }

  // Hanya foto/lampiran tanpa teks → tempel ke laporan terakhir atau buffer (helper bersama)
  if (photoUrls.length) {
    await attachOrBufferPhotos(chatId, user, photoUrls);
  }
}

// ---------- Poller ----------
async function poll() {
  while (running) {
    try {
      const updates: any[] = await tgApi("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        try { await processUpdate(u); } catch (e: any) { console.error("[Telegram] processUpdate error:", e?.message || e); }
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      // 409 = webhook aktif untuk token ini → polling tidak boleh jalan. Hentikan agar tidak spam.
      if (msg.includes("409")) {
        console.log("ℹ️ Telegram polling dihentikan: webhook sedang aktif untuk token ini (409).");
        running = false;
        break;
      }
      console.error("[Telegram] getUpdates error:", msg);
      await sleep(3000);
    }
  }
}

// Dipakai oleh route webhook (/api/webhook/telegram) untuk memproses 1 update.
export async function processTelegramUpdate(update: any) {
  return processUpdate(update);
}

export async function startTelegramBot() {
  const token = await getBotToken();
  if (!token) {
    console.log("⚠️ Telegram bot: TELEGRAM_BOT_TOKEN belum diset — bot tidak aktif.");
    return;
  }
  let me: any;
  try { me = await tgGetMe(); } catch (e: any) {
    console.error("⚠️ Telegram bot gagal start (getMe):", e?.message || e);
    return;
  }

  // Mode WEBHOOK (produksi): daftarkan webhook, jangan polling.
  if (process.env.TELEGRAM_USE_WEBHOOK === "true") {
    const base = (process.env.PUBLIC_BASE_URL || process.env.APP_URL || "").replace(/\/$/, "");
    if (!base) {
      console.error("⚠️ Telegram webhook: PUBLIC_BASE_URL/APP_URL belum diset — webhook tidak didaftarkan.");
      return;
    }
    const url = `${base}/api/webhook/telegram`;
    try {
      await tgSetWebhook(url, process.env.TELEGRAM_WEBHOOK_SECRET);
      console.log(`✅ Telegram bot via WEBHOOK: @${me.username} → ${url}`);
    } catch (e: any) {
      console.error("⚠️ Gagal set webhook Telegram:", e?.message || e);
    }
    return;
  }

  // Mode LONG-POLLING (lokal/dev)
  if (running) return;
  running = true;
  console.log(`✅ Telegram Safety Patrol bot aktif (long-polling): @${me.username}`);
  poll();
}
