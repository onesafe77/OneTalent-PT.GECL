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

// State percakapan "tanya-balik" (in-memory, cukup untuk ±5 user).
interface Pending { rawText: string; photos: string[]; asked: number; }
const pendingByChat = new Map<string, Pending>();

// Buffer album (beberapa foto dikirim sekaligus -> 1 laporan).
interface Album { photos: string[]; caption: string; chatId: string; user: any; timer: ReturnType<typeof setTimeout> | null; }
const albumBuffer = new Map<string, Album>();

// Agregasi foto<->teks yang dikirim TERPISAH (caption Telegram dibatasi 1024 char).
const WINDOW_MS = 120000; // 2 menit
// Laporan terakhir yang disimpan per chat (untuk menempelkan foto yang datang menyusul).
const lastReportByChat = new Map<string, { reportId: string; ts: number; photos: string[] }>();
// Foto yang datang SEBELUM teks laporan (ditahan sebentar agar bisa digabung ke laporan berikutnya).
const recentPhotosByChat = new Map<string, { urls: string[]; ts: number; timer: ReturnType<typeof setTimeout> | null }>();

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

async function replyConfirm(chatId: string, nama: string, parsed: any) {
  const ringkas = JSON.stringify({
    jenis: parsed.jenisLaporan, kegiatan: parsed.kegiatan, tanggal: parsed.tanggal,
    shift: parsed.shift, lokasi: parsed.lokasi, temuan: parsed.temuan,
  });
  const text = await hermes(
    SYS_BOT,
    `Laporan dari ${nama} sudah TERSIMPAN. Buat 1 pesan konfirmasi ramah yang menyebut ringkas isinya. Data: ${ringkas}`,
    `✅ Laporan tersimpan, terima kasih ${nama}.\n${parsed.kegiatan || parsed.jenisLaporan || "Laporan"}${parsed.shift ? " · " + parsed.shift : ""}${parsed.lokasi ? " · " + parsed.lokasi : ""}${parsed.tanggal ? " · " + parsed.tanggal : ""}`
  );
  await tgSendMessage(chatId, text);
}

// Ambil & kosongkan foto buffer (yang datang sebelum teks) bila masih dalam window.
function drainRecentPhotos(chatId: string): string[] {
  const buf = recentPhotosByChat.get(chatId);
  if (!buf) return [];
  if (Date.now() - buf.ts > WINDOW_MS) { recentPhotosByChat.delete(chatId); return []; }
  if (buf.timer) clearTimeout(buf.timer);
  recentPhotosByChat.delete(chatId);
  return buf.urls;
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

  // Normalisasi pelaksana ke petugas Safety Patrol resmi (PT GECL) dari isi laporan.
  const officers = resolveOfficers(text);
  const namaPelaksana = officers.length
    ? officers.join(", ")
    : (parsed.namaPelaksana || user.namaPelaksana || null);
  // "Pengirim" ditampilkan = nama petugas dari laporan (bila dikenali), jika tidak fallback.
  const displaySender = officers.length
    ? officers.join(", ")
    : (user.namaPelaksana || user.firstName || null);

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

  if (parsed.attendance && parsed.attendance.length > 0) {
    try {
      await storage.createManySafetyPatrolAttendance(parsed.attendance.map((att: any) => ({
        reportId: report.id, unitCode: att.unitCode, shift: att.shift, status: att.status, keterangan: att.keterangan || null,
      })));
    } catch (e: any) { console.error("[Telegram] attendance error:", e?.message || e); }
  }

  await replyConfirm(chatId, user.namaPelaksana || user.firstName || "Pak/Bu", parsed);
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
    await tgSendMessage(chatId, "Kirim teks laporan patrol (boleh + foto). Bot akan merangkum & menyimpan. Bila ada data kurang, saya akan menanyakannya. Ubah nama: /nama <nama>.");
    return;
  }
  if (text.startsWith("/nama")) {
    const nama = text.replace(/^\/nama\s*/i, "").trim();
    if (nama) { await setUserName(chatId, nama); await tgSendMessage(chatId, `Siap, nama pelaksana diset: ${nama} ✅`); }
    else await tgSendMessage(chatId, "Format: /nama Budi Santoso");
    return;
  }

  // Foto?
  let photoUrls: string[] = [];
  if (msg.photo && msg.photo.length) {
    const largest = msg.photo[msg.photo.length - 1];
    const url = await tgDownloadPhotoToStorage(largest.file_id);
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
          await saveReport(chatId, user, buf.caption || "(foto)", buf.photos);
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
    if (isLikelyPatrolReport(text)) {
      await handleReportText(chatId, user, text, photoUrls);
    } else {
      const r = await hermes(SYS_BOT, `Pelaksana menulis: "${text}". Ini bukan laporan patrol. Balas ramah & arahkan untuk mengirim laporan patrol (sebut contoh field: tanggal, kegiatan, shift, lokasi, temuan).`,
        "Halo! Kirimkan laporan patrol ya (tanggal, kegiatan, shift, lokasi, temuan) — boleh disertai foto. 🙏");
      await tgSendMessage(chatId, r);
    }
    return;
  }

  // Hanya foto tanpa teks
  if (photoUrls.length) {
    // 1) Bila ada laporan yang baru saja disimpan (dalam window) -> tempelkan foto ke laporan itu
    const last = lastReportByChat.get(chatId);
    if (last && Date.now() - last.ts <= WINDOW_MS) {
      const merged = [...(last.photos || []), ...photoUrls];
      try {
        await storage.updateSafetyPatrolReport(last.reportId, { buktiKegiatan: merged, photos: merged } as any);
        lastReportByChat.set(chatId, { ...last, ts: Date.now(), photos: merged });
        await tgSendMessage(chatId, "📎 Foto ditambahkan ke laporan sebelumnya.");
      } catch (e: any) {
        console.error("[Telegram] attach photo error:", e?.message || e);
      }
      return;
    }

    // 2) Belum ada laporan -> tahan sebentar; gabung ke laporan teks yang menyusul.
    //    Bila tidak ada laporan dalam ~30s, baru buat "Laporan Foto".
    const buf = recentPhotosByChat.get(chatId) || { urls: [], ts: Date.now(), timer: null };
    buf.urls.push(...photoUrls);
    buf.ts = Date.now();
    if (buf.timer) clearTimeout(buf.timer);
    buf.timer = setTimeout(async () => {
      const cur = recentPhotosByChat.get(chatId);
      recentPhotosByChat.delete(chatId);
      if (cur && cur.urls.length) {
        try { await saveReport(chatId, user, "(foto tanpa keterangan)", cur.urls); }
        catch (e: any) { console.error("[Telegram] foto-only save error:", e?.message || e); }
      }
    }, 30000);
    recentPhotosByChat.set(chatId, buf);
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
