import { templateResolver } from "./template-resolver";
import { openRouterClient, AI_MODELS } from "./ai-config";

// ==========================================
// REPORT PARSING LOGIC
// ==========================================

export interface ParsedReport {
  jenisLaporan: string;
  kegiatan?: string;
  tanggal: string;
  bulan?: string;
  week?: number;
  waktuPelaksanaan?: string;
  shift?: string;
  lokasi?: string;
  namaPelaksana?: string;
  pemateri: string[];
  temuan?: string;
  buktiKegiatan?: string[];
  attendance: {
    unitCode: string;
    shift: string;
    status: string;
    keterangan?: string;
  }[];
  rosterOff: string[];
  summary: string;
  matchedTemplate?: string;
  matchScore?: number;
}

function getBulanIndonesia(date: Date): string {
  const bulanNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return bulanNames[date.getMonth()];
}

function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  return Math.min(5, Math.floor((day - 1) / 7) + 1);
}

// ---- Ekstraktor heuristik (jaring pengaman bila AI gagal/kosong) ----
const ID_MONTHS: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sep: 9,
  oktober: 10, okt: 10, november: 11, nov: 11, desember: 12, des: 12,
};
function normalizeTanggal(raw: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  let m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/); // 09 juni 2026
  if (m && ID_MONTHS[m[2].toLowerCase()]) {
    return `${m[3]}-${String(ID_MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
  }
  m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); // 09/06/2026
  if (m) return `${m[3]}-${String(+m[2]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  return undefined;
}
// ---- Penjaga kewajaran tanggal laporan ----
// Petugas kerap menyalin template laporan lama tanpa mengganti tanggalnya, sehingga laporan
// mendarat berbulan-bulan di masa lalu dan tak pernah tercentang di Pencapaian Job hari itu
// (audit Agu 2026: 12,5% laporan meleset >2 hari, ada yang sampai ~3 tahun).
// Aturan: tanggal teks dipakai bila masih masuk akal; bila janggal → pakai tanggal kirim.
const ID_DAYS: Record<string, number> = {
  minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4,
  jumat: 5, "jum'at": 5, sabtu: 6,
};
// Toleransi laporan susulan yang wajar (hari). Lebih dari ini dianggap template basi,
// kecuali petugas menulis kata "susulan" secara eksplisit.
const BACKDATE_TOLERANCE_DAYS = 3;

export type ReportDateSource =
  | "text"           // tanggal dari teks dipakai apa adanya
  | "text-susulan"   // tanggal jauh tapi ditandai "susulan" → dihormati
  | "today-no-date"  // teks tak memuat tanggal
  | "today-far"      // tanggal teks terlalu jauh dari hari kirim
  | "today-dayname"; // nama hari di teks bertentangan dgn tanggal angkanya

export interface ResolvedReportDate {
  date: string;             // tanggal final yang dipakai (YYYY-MM-DD)
  source: ReportDateSource;
  textDate?: string;        // tanggal yang tertulis di teks (bila ada) — utk pesan peringatan
}

function weekdayOf(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? null : d.getDay();
}

/** Nama hari pertama yang disebut di teks (mis. "Senin") → 0-6, atau null. */
function dayNameIn(text: string): number | null {
  const m = stripInvisible(text || "").match(/\b(minggu|ahad|senin|selasa|rabu|kamis|jum'?at|sabtu)\b/i);
  if (!m) return null;
  const key = m[1].toLowerCase().replace("jum'at", "jumat");
  return ID_DAYS[key] ?? ID_DAYS[m[1].toLowerCase()] ?? null;
}

/**
 * Tentukan tanggal laporan yang benar dari tanggal-teks + konteks.
 * `today` = tanggal kirim (YYYY-MM-DD, zona WITA).
 */
export function resolveReportDate(textDate: string | undefined, rawText: string, today: string): ResolvedReportDate {
  if (!textDate) return { date: today, source: "today-no-date" };

  const diffDays = Math.round(
    (new Date(today + "T00:00:00").getTime() - new Date(textDate + "T00:00:00").getTime()) / 86400000
  );

  // Nama hari di teks bertentangan dgn tanggal angkanya (mis. "Senin 03/07/2026" —
  // 3 Juli 2026 jatuh Jumat): angka tanggalnya yang salah ketik. Pakai tanggal kirim
  // bila nama harinya justru cocok dengan hari kirim.
  const dayName = dayNameIn(rawText);
  const textWd = weekdayOf(textDate);
  const todayWd = weekdayOf(today);
  if (dayName != null && textWd != null && dayName !== textWd && dayName === todayWd) {
    return { date: today, source: "today-dayname", textDate };
  }

  if (Math.abs(diffDays) <= BACKDATE_TOLERANCE_DAYS) return { date: textDate, source: "text", textDate };

  // Jauh dari hari kirim: hormati hanya bila petugas menandainya laporan susulan.
  if (/\bsusulan\b/i.test(stripInvisible(rawText || ""))) {
    return { date: textDate, source: "text-susulan", textDate };
  }
  return { date: today, source: "today-far", textDate };
}

// Buang karakter tak terlihat (LRM/RLM/ZWSP/BOM) yang sering muncul di laporan dari iPhone/WhatsApp.
function stripInvisible(s: string): string {
  return (s || "").replace(/[​‌‍‎‏﻿]/g, "");
}
function lineVal(text: string, ...labels: string[]): string {
  for (const raw of stripInvisible(text).split(/\r?\n/)) {
    const ln = raw;
    for (const lab of labels) {
      // Izinkan kata tambahan antara label & ':' (mis. "Waktu pelaksanaan :", "Lokasi sidak :")
      const mm = ln.match(new RegExp(`^\\s*\\**\\s*${lab}[^:\\n*]*\\**\\s*[:\\-]\\s*(.+)$`, "i"));
      if (mm) return mm[1].replace(/\*/g, "").trim();
    }
  }
  return "";
}

// Ekstraksi tanggal tahan-banting: cocok untuk semua varian label
// ("Hari tanggal :", "Hari / tgl :", "Hari/tgl :", "Hari, tanggal :", "Tanggal :", "Tgl :"),
// menerima baris hanya bila nilainya benar-benar terurai jadi tanggal (mengabaikan "Hari ini ..." dsb).
function extractTanggal(text: string): string | undefined {
  for (const raw of stripInvisible(text).split(/\r?\n/)) {
    const m = raw.match(/^\s*\**\s*(?:hari|tanggal|tgl)[^:\n*]*\**\s*[:\-]\s*(.+)$/i);
    if (m) { const d = normalizeTanggal(m[1].replace(/\*/g, "").trim()); if (d) return d; }
  }
  // Fallback: token tanggal pertama di mana pun (DD/MM/YYYY | DD Bulan YYYY | YYYY-MM-DD)
  const g = stripInvisible(text).match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4}|\d{4}-\d{2}-\d{2}/);
  return g ? normalizeTanggal(g[0]) : undefined;
}

// Ekstraksi shift tahan-banting: "Shift l (Siang)", "Shift : I (Siang)", "Shift : 1 (Siang)", "Shift 2", dll.
function extractShift(text: string): string | undefined {
  const t = stripInvisible(text);
  // cari baris/segmen yang memuat "shift"
  const m = t.match(/shift[^\n:]*[:\-]?\s*([ivl0-9]+)?\s*\(?\s*(siang|pagi|malam|day|night)?/i);
  if (m) {
    const num = (m[1] || "").toLowerCase().replace(/l/g, "i"); // typo "l" → "i"
    const word = (m[2] || "").toLowerCase();
    if (word === "malam" || word === "night") return "Shift 2";
    if (word === "siang" || word === "pagi" || word === "day") return "Shift 1";
    if (num === "2" || num === "ii") return "Shift 2";
    if (num === "1" || num === "i") return "Shift 1";
    if (num === "3" || num === "iii") return "Shift 3";
  }
  return undefined;
}

// Ambil jam pertama dari seluruh teks bila label waktu tak ditemukan.
function extractWaktu(text: string): string | undefined {
  const m = stripInvisible(text).match(/(\d{1,2}[:.]\d{2})\s*(wita|wib|wit)?/i);
  if (m) return (m[1] + (m[2] ? " " + m[2].toUpperCase() : "")).trim();
  return undefined;
}

// ---- Penyaring metadata & penutup (untuk ekstraksi narasi temuan) ----
const META_LABELS = [
  "hari/tgl", "hari/tanggal", "hari, tanggal", "hari", "tanggal", "tgl", "shift", "waktu", "jam",
  "lokasi", "location", "sampel", "sample", "sempel", "total sample", "total sampel",
  "team", "nama team patrol", "nama team", "pelaksana", "safety patrol", "nama pelapor",
  "nama pengawas", "perusahaan", "job area pengawas", "job area", "foto", "kegiatan", "pemateri",
];
function isMetaLabelLine(line: string): boolean {
  const l = line.replace(/\*/g, "").trim().toLowerCase();
  return META_LABELS.some((lab) => new RegExp(`^${lab.replace(/\//g, "\\/")}\\b\\s*([:\\-].*)?$`).test(l));
}
const CLOSING_RE = /^\s*"?\s*(salam|salam k3|ohs hauling|utamakan keselamatan|dept\.?\s*hse|team safety patrol|team ohs|team bib|team alpha|team delta|team bravo|team charlie|team echo|safety first)\b/i;
function isClosingLine(line: string): boolean {
  return CLOSING_RE.test(line.trim());
}
function isPersonLine(line: string): boolean {
  // baris nama pelaksana/petugas (mengandung "PT")
  return /\bPT[\.\s]/i.test(line) && /^[\s\-•*\d.]*[A-Za-z]/.test(line.trim());
}
const TEMUAN_HEADERS = [
  "temuan", "finding", "findings", "issue", "issues", "hasil observasi", "hasil temuan", "hasil",
  "detail kondisi", "kondisi", "catatan", "keterangan", "kendala", "rekomendasi", "tindak lanjut", "detail",
];
// Ekstrak temuan: label-block sinonim → list bernomor → narasi deskriptif.
export function extractTemuan(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const clip = (s: string) => s.replace(/[ \t]+/g, " ").trim().slice(0, 500);

  // (1) Label-block: header sinonim temuan + baris isi sesudahnya
  for (let i = 0; i < lines.length; i++) {
    const bare = lines[i].replace(/\*/g, "").trim().toLowerCase();
    const hdr = TEMUAN_HEADERS.find((h) => new RegExp(`^${h}\\b\\s*[:\\-]?`).test(bare));
    if (!hdr) continue;
    const parts: string[] = [];
    const inline = lines[i].replace(/\*/g, "").replace(new RegExp(`^\\s*${hdr}\\s*[:\\-]?\\s*`, "i"), "").trim();
    if (inline) parts.push(inline);
    for (let j = i + 1; j < lines.length; j++) {
      const ln = lines[j].trim();
      if (!ln) {
        if (!parts.length) continue;
        let k = j + 1; while (k < lines.length && !lines[k].trim()) k++;
        const nxt = k < lines.length ? lines[k].trim() : "";
        if (nxt && /^([-•*]|km\s|phase\b|\d+\s*[.)])/i.test(nxt)) continue;
        break;
      }
      if (isClosingLine(ln) || isMetaLabelLine(ln)) break;
      parts.push(ln.replace(/^[-•*]\s*/, "").replace(/\*/g, "").trim());
    }
    const joined = clip(parts.join(" · "));
    if (joined.length >= 3) return joined;
  }

  // (2) List temuan bernomor (mis. "1. KMB 5062 : Safety Cone tidak ada reflektor")
  const numbered = lines
    .map((l) => l.trim())
    .filter((l) => /^\d+\s*[.)]\s*\S+.*(:|temuan|tidak ada|tidak |rusak|bocor|reflektor|apar)/i.test(l) && l.length > 6);
  if (numbered.length >= 2) return clip(numbered.map((l) => l.replace(/\*/g, "")).join(" · "));

  // (3) Narasi deskriptif (buang judul, metadata, nama, penutup)
  const narr: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln || i === 0) continue;
    if (isMetaLabelLine(ln) || isClosingLine(ln) || isPersonLine(ln)) continue;
    const bare = ln.replace(/\*/g, "").replace(/^[-•*]\s*/, "").trim();
    if (bare.length < 8) continue;
    narr.push(bare);
  }
  if (narr.length) return clip(narr.join(" · "));
  return "";
}

function heuristicExtract(text: string): Partial<ParsedReport> {
  const out: Partial<ParsedReport> = {};
  const titleM = text.match(/^\s*\*([^*\n]{3,60})\*/m); // judul *...* di baris pertama
  if (titleM) out.kegiatan = titleM[1].trim();
  if (!out.kegiatan) {
    // judul = baris non-kosong pertama yang BUKAN label metadata
    for (const ln of text.split(/\r?\n/)) {
      const t = ln.replace(/\*/g, "").trim();
      if (!t) continue;
      if (isMetaLabelLine(t)) break;
      const title = t.replace(/^(laporan\s+kegiatan|kegiatan)\s+/i, "").trim();
      if (title.length >= 3) out.kegiatan = title.slice(0, 60);
      break;
    }
  }
  const tgl = extractTanggal(text);
  if (tgl) out.tanggal = tgl;
  const shift = extractShift(text);
  if (shift) out.shift = shift;
  const waktu = lineVal(text, "waktu", "jam", "waktu pelaksanaan") || extractWaktu(text);
  if (waktu) out.waktuPelaksanaan = waktu;
  const lokasi = lineVal(text, "lokasi", "location");
  if (lokasi) out.lokasi = lokasi;
  const pel = text.match(/\*?\s*pelaksana\s*\*?\s*[:\-]?\s*\n?\s*[-•]?\s*([A-Za-z][A-Za-z .,'`]+)/i);
  if (pel) out.namaPelaksana = pel[1].replace(/\bPT\.?\s*\w+/i, "").trim();
  const temuan = extractTemuan(text);
  if (temuan) out.temuan = temuan;
  return out;
}
function fillFromHeuristic(parsed: ParsedReport, text: string): ParsedReport {
  const h = heuristicExtract(text);
  (["kegiatan", "shift", "lokasi", "waktuPelaksanaan", "namaPelaksana", "temuan"] as const).forEach((k) => {
    if ((!parsed[k] || String(parsed[k]).trim() === "") && h[k]) (parsed as any)[k] = h[k];
  });
  if (!parsed.tanggal && h.tanggal) parsed.tanggal = h.tanggal;
  return parsed;
}

export async function parseReportWithGemini(messageText: string): Promise<ParsedReport> {
  const matchResult = await templateResolver.matchTemplate(messageText);
  const templateContext = templateResolver.buildPromptContext(matchResult.template);

  const templateNames = await templateResolver.getAllTemplateNames();
  const defaultTypes = "Daily Briefing, Temuan, Pelanggaran, Observasi Kecepatan Berkendara, Observasi Kecepatan, Sidak Kecepatan, Safety Patrol, Inspeksi, P2H, Wake Up Call, Briefing, Laporan Umum";
  const availableTypes = templateNames.length > 0
    ? templateNames.join(", ") + ", Laporan Umum"
    : defaultTypes;

  const prompt = `Kamu adalah AI yang sangat pintar dalam mengekstrak data dari pesan WhatsApp Safety Patrol.

TUGAS UTAMA: Ekstrak SEMUA informasi yang bisa ditemukan dari pesan, WAJIB mengisi semua field yang ada datanya.

${templateContext ? `KONTEKS TEMPLATE (opsional, untuk referensi):\n${templateContext}\n` : ''}

PESAN YANG AKAN DIANALISIS:
${messageText}

JENIS LAPORAN YANG TERSEDIA:
${availableTypes}

INSTRUKSI EKSTRAKSI WAJIB - Cari dan ekstrak data ini dari pesan:

1. **tanggal**: Cari format tanggal apapun (22 Des 2025, 22/12/2025, 22-12-2025, Senin 22 Desember 2025, dll). Konversi ke YYYY-MM-DD.
2. **waktuPelaksanaan**: Cari jam/waktu (08:00, 14.30, 08:00-09:00, 08:00 WITA, Pukul 08.00, 09:53Wita, 09:53 Wita - Selesai, dll)
3. **shift**: Cari kata "Shift 1", "Shift 2", "Shift : 1", "Shift : 2", "SHIFT I", "SHIFT II", "1 (Siang)", "2 (Malam)", "Siang", "Malam", atau tentukan dari waktu (06:00-18:00 = Shift 1, 18:00-06:00 = Shift 2)
4. **lokasi**: Cari nama tempat, area, KM, site, pit, workshop, rest area, unit, dll
5. **kegiatan**: Identifikasi jenis aktivitas. Contoh: Wake Up Call, Daily Briefing, Sidak Roster, P2H, Observasi Kecepatan Berkendara, Sidak Kecepatan, Safety Meeting, Patrol, Inspeksi, dll. Jika pesan diawali "Kegiatan [nama]" atau berisi "Kegiatan Observasi...", gunakan itu sebagai kegiatan
6. **namaPelaksana**: Cari nama orang yang melakukan/melaporkan kegiatan
7. **temuan**: Rangkum hasil observasi/temuan/issue/kondisi. Termasuk: daftar temuan bernomor (mis. "KMB 5062: Safety Cone tidak ada reflektor"), poin "Issue", "Detail Kondisi" per-KM, ATAU kesimpulan naratif (mis. "Dari 15 unit semua patuh mengikuti lajur kiri", "semua Driver bekerja sesuai Roster"). WAJIB diisi bila ada deskripsi kondisi/hasil/temuan; jangan kosongkan
8. **pemateri**: Cari nama-nama pemateri, pelapor, atau peserta penting
9. **attendance**: Jika ada daftar unit/kehadiran, ekstrak kode unit
10. **rosterOff**: Unit yang libur/off

FORMAT OUTPUT JSON:
{
  "jenisLaporan": "nama jenis laporan yang paling sesuai",
  "kegiatan": "nama kegiatan spesifik yang diekstrak",
  "tanggal": "YYYY-MM-DD",
  "waktuPelaksanaan": "jam pelaksanaan (contoh: 08:00 - 09:00 WITA)",
  "shift": "Shift 1 atau Shift 2",
  "lokasi": "lokasi/area kegiatan",
  "namaPelaksana": "nama pelaksana 1, nama pelaksana 2",
  "pemateri": ["nama1", "nama2"],
  "temuan": "rangkuman temuan/issue/kondisi/observasi",
  "attendance": [{"unitCode": "XXX", "shift": "Shift 1", "status": "Hadir", "keterangan": ""}],
  "rosterOff": ["XXX"],
  "summary": "ringkasan singkat 1-2 kalimat"
}

ATURAN PENTING:
- WAJIB isi field jika datanya ada di pesan, jangan kosongkan
- Untuk tanggal: jika tidak eksplisit, gunakan tanggal hari ini
- Untuk shift: jika waktu antara 06:00-18:00 = "Shift 1", jika 18:00-06:00 = "Shift 2"
- Untuk lokasi: cari kata kunci seperti KM, Site, Pit, Area, Workshop, Phase, dll
- Berikan HANYA JSON tanpa penjelasan tambahan`;

  try {
    const result = await openRouterClient.chat.completions.create({
      model: AI_MODELS.FAST_TEXT,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });
    const text = result.choices[0]?.message?.content || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedReport;

      // Jaring pengaman: isi field yang AI kosongkan dari baris berlabel
      fillFromHeuristic(parsed, messageText);

      if (!parsed.tanggal) {
        parsed.tanggal = new Date().toISOString().split('T')[0];
      }
      if (!parsed.pemateri) {
        parsed.pemateri = [];
      }
      if (!parsed.attendance) {
        parsed.attendance = [];
      }
      if (!parsed.rosterOff) {
        parsed.rosterOff = [];
      }
      if (!parsed.summary) {
        parsed.summary = "Laporan Safety Patrol";
      }

      const reportDate = new Date(parsed.tanggal);
      parsed.bulan = getBulanIndonesia(reportDate);
      parsed.week = getWeekOfMonth(reportDate);

      if (!parsed.kegiatan && matchResult.template?.name) {
        parsed.kegiatan = matchResult.template.name;
      }

      // Use extracted kegiatan as jenisLaporan if AI returned "Laporan Umum" or nothing
      if (!parsed.jenisLaporan || parsed.jenisLaporan === "Laporan Umum") {
        parsed.jenisLaporan = parsed.kegiatan || matchResult.template?.name || "Laporan Umum";
      }

      parsed.matchedTemplate = matchResult.template?.name;
      parsed.matchScore = matchResult.matchScore;

      return parsed;
    }

    throw new Error("Invalid output format");
  } catch (error) {
    console.error("Error parsing with OpenRouter:", error);

    // AI gagal → bangun dari ekstraktor heuristik (baris berlabel) agar laporan tetap terisi
    const h = heuristicExtract(messageText);
    const errorDate = h.tanggal ? new Date(h.tanggal) : new Date();
    return {
      jenisLaporan: h.kegiatan || matchResult.template?.name || "Laporan Umum",
      kegiatan: h.kegiatan || matchResult.template?.name || undefined,
      tanggal: h.tanggal || errorDate.toISOString().split('T')[0],
      bulan: getBulanIndonesia(errorDate),
      week: getWeekOfMonth(errorDate),
      waktuPelaksanaan: h.waktuPelaksanaan,
      shift: h.shift,
      lokasi: h.lokasi,
      namaPelaksana: h.namaPelaksana,
      temuan: h.temuan,
      pemateri: [],
      attendance: [],
      rosterOff: [],
      summary: h.kegiatan || "Laporan Safety Patrol",
      matchedTemplate: matchResult.template?.name,
      matchScore: matchResult.matchScore
    };
  }
}

export async function analyzeReportContent(messageText: string): Promise<string> {
  const prompt = `Analisis laporan Safety Patrol berikut dan berikan ringkasan singkat dalam bahasa Indonesia (maksimal 3 kalimat):

${messageText}

Fokus pada:
- Jenis kegiatan
- Jumlah unit/personel yang hadir
- Hal penting yang perlu diperhatikan`;

  try {
    const response = await openRouterClient.chat.completions.create({
      model: AI_MODELS.FAST_TEXT,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    return response.choices[0]?.message?.content || "Analisis berhasil";
  } catch (error) {
    console.error("Error analyzing with OpenRouter:", error);
    return "Gagal menganalisis konten laporan";
  }
}

// ==========================================
// PATROL REPORT CLASSIFIER
// ==========================================

/**
 * Quick keyword-based check sebelum memanggil AI.
 * Mengembalikan true jika pesan mengandung cukup ciri laporan patrol.
 */
export function isLikelyPatrolReport(text: string): boolean {
  if (!text || text.trim().length < 25) return false;

  const lower = text.toLowerCase().trim();

  // Blacklist — pesan yang pasti bukan laporan
  const blacklistPatterns = [
    /^\*?\d+#?$/,              // shortcode seperti *888#
    /^[\w\s]{1,25}$/,          // hanya nama pendek (< 25 char, hanya huruf/spasi)
    /^https?:\/\//,            // hanya URL
    /^\+?\d[\d\s\-]{5,}$/,     // hanya nomor telepon
  ];
  if (blacklistPatterns.some(p => p.test(lower))) return false;

  // Kata kunci kuat — satu saja cukup
  const strongKeywords = [
    "shift", "patrol", "inspeksi", "observasi", "briefing",
    "sidak", "p2h", "roster", "temuan", "pelaksana",
    "hari/tanggal", "hari, tanggal", "laporan", "kegiatan",
    "hadir", "unit dt", "unit ht", "dump truck", "hauling",
    "wake up call", "safety meeting", "pelanggaran",
    "kondisi jalan", "kondisi unit", "km ", "phase ", "pit ",
    "piket", "patroli", "wita", "pukul", "alat berat",
    "induction", "induksi", "toolbox", "meeting",
  ];

  // Kata kunci lemah — butuh 3+ untuk lolos
  const weakKeywords = [
    "lokasi", "waktu", "jam", "tanggal", "selesai",
    "team", "tim", "driver", "operator", "pengawas"
  ];

  const hasStrong = strongKeywords.some(k => lower.includes(k));
  if (hasStrong) return true;

  const weakCount = weakKeywords.filter(k => lower.includes(k)).length;
  return weakCount >= 3;
}

/**
 * Cek apakah hasil parse AI cukup meaningful untuk disimpan sebagai laporan.
 * Minimal harus ada 2 dari field utama terisi.
 */
export function isValidParsedReport(parsed: ParsedReport): boolean {
  const keyFields = [
    parsed.kegiatan,
    parsed.lokasi,
    parsed.shift,
    parsed.waktuPelaksanaan,
    parsed.namaPelaksana,
    parsed.temuan,
  ];
  const filledCount = keyFields.filter(f => f && f.trim && f.trim().length > 0).length;
  return filledCount >= 2;
}

// ==========================================
// MCU PARSING LOGIC
// ==========================================

export interface ParsedMCU {
  nama: string;
  perusahaan: string;
  posisi: string;
  klinik: string;
  tanggalBaru?: string;
  tanggalBerkala?: string;
  tanggalAkhir?: string;
  kesimpulanBerkala?: string;
  kesimpulanAkhir?: string;
  hasilKesimpulan: string;
  verifikasiSaran?: string;
  followUp?: string;
}

async function urlToBase64DataUri(url: string, mimeType: string = "image/jpeg") {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image for OpenRouter Vision:", error);
    return null;
  }
}

export async function parseMCUWithGemini(caption: string, imageUrl?: string): Promise<ParsedMCU | null> {
  const promptText = `Analisis Dokumen/Foto Hasil MCU (Medical Check Up).
  
  TUGAS: Ekstrak data berikut dari gambar atau caption yang diberikan ke dalam format JSON.
  
  FIELD YANG DICARI:
  1. nama: Nama karyawan (Cari di Header/Biodata Pasien)
  2. perusahaan: Nama perusahaan (PT ...)
  3. posisi: Jabatan/Posisi
  4. klinik: Nama klinik/rumah sakit pemeriksa
  5. tanggalBaru: Tanggal MCU Baru (YYYY-MM-DD)
  6. tanggalBerkala: Tanggal MCU Berkala (YYYY-MM-DD)
  7. tanggalAkhir: Tanggal berakhirnya masa berlaku MCU (YYYY-MM-DD) / Expired Date / Valid Until
  8. kesimpulanBerkala: Kesimpulan dokter untuk MCU berkala (text)
  9. kesimpulanAkhir: Kesimpulan akhir (text) - Biasanya: "Fit to Work", "Unfit", "Fit with Restrictions"
  10. hasilKesimpulan: FIT_TO_WORK / UNFIT / FIT_WITH_NOTE / TEMPORARY_UNFIT (Standarisasi ke 4 nilai ini)
  11. verifikasiSaran: Saran dokter / Rekomendasi Medis
  12. followUp: Tindakan lanjut yang disarankan

  CAPTION DARI PENGIRIM: "${caption}"
  
  ATURAN OUTPUT:
  - Berikan HANYA JSON valid.
  - Tanggal format YYYY-MM-DD.
  - Jika data tidak ditemukan, isi dengan string kosong "" atau null.`;

  try {
    const messages: any[] = [];
    if (imageUrl) {
      console.log("📷 Processing MCU with Vision AI (OpenRouter):", imageUrl);
      const dataUri = await urlToBase64DataUri(imageUrl);
      if (dataUri) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: dataUri } }
          ]
        });
      } else {
        messages.push({ role: "user", content: promptText });
      }
    } else {
      messages.push({ role: "user", content: promptText });
    }

    const response = await openRouterClient.chat.completions.create({
      model: imageUrl ? AI_MODELS.VISION : AI_MODELS.FAST_TEXT,
      messages: messages,
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedMCU;
      if (!parsed.nama && caption.length < 50) parsed.nama = caption.replace(/mcu/i, "").trim();
      if (!parsed.hasilKesimpulan) parsed.hasilKesimpulan = "FIT_TO_WORK";
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Error parsing MCU with OpenRouter:", error);
    return null;
  }
}

// ==========================================
// SICK LEAVE PARSING LOGIC
// ==========================================

export interface ParsedSickLeave {
  nama: string;
  tanggal: string; // YYYY-MM-DD
  alasan: string;
  confidence: number; // 0-100
  summary: string;
}

export async function parseSickLeaveWithGemini(messageText: string): Promise<ParsedSickLeave | null> {
  const prompt = `Analisis Pesan Ijin Sakit WhatsApp.
  
  TUGAS: Ekstrak informasi berikut dari pesan ijin sakit:
  1. nama: Nama karyawan yang sakit
  2. tanggal: Tanggal sakit (format YYYY-MM-DD). Jika menyebut "hari ini", gunakan tanggal hari ini: ${new Date().toISOString().split('T')[0]}.
  3. alasan: Alasan sakit / keterangan singkat
  4. confidence: Seberapa yakin ini adalah pesan ijin sakit (0-100)
  5. summary: Ringkasan singkat untuk notifikasi

  PESAN: "${messageText}"

  ATURAN:
  - Berikan HANYA JSON output.
  - Tanggal konversi ke format YYYY-MM-DD.`;

  try {
    const response = await openRouterClient.chat.completions.create({
      model: AI_MODELS.FAST_TEXT,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });
    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedSickLeave;
      if (!parsed.tanggal) parsed.tanggal = new Date().toISOString().split('T')[0];
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Error parsing Sick Leave with OpenRouter:", error);
    return null;
  }
}
