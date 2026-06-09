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
function lineVal(text: string, ...labels: string[]): string {
  for (const ln of text.split(/\r?\n/)) {
    for (const lab of labels) {
      const mm = ln.match(new RegExp(`^\\s*\\**\\s*${lab}\\s*\\**\\s*[:\\-]\\s*(.+)$`, "i"));
      if (mm) return mm[1].replace(/\*/g, "").trim();
    }
  }
  return "";
}
function heuristicExtract(text: string): Partial<ParsedReport> {
  const out: Partial<ParsedReport> = {};
  const titleM = text.match(/^\s*\*([^*\n]{3,60})\*/m); // judul *...* di baris pertama
  if (titleM) out.kegiatan = titleM[1].trim();
  const tgl = normalizeTanggal(lineVal(text, "hari/tgl", "hari/tanggal", "tanggal", "tgl", "hari, tanggal"));
  if (tgl) out.tanggal = tgl;
  const shiftRaw = lineVal(text, "shift");
  if (shiftRaw) out.shift = /(^|[^0-9])2|malam|night/i.test(shiftRaw) ? "Shift 2" : /(^|[^0-9])1|siang|pagi|day/i.test(shiftRaw) ? "Shift 1" : shiftRaw;
  const waktu = lineVal(text, "waktu", "jam");
  if (waktu) out.waktuPelaksanaan = waktu;
  const lokasi = lineVal(text, "lokasi", "location");
  if (lokasi) out.lokasi = lokasi;
  const pel = text.match(/\*?\s*pelaksana\s*\*?\s*[:\-]?\s*\n?\s*[-•]?\s*([A-Za-z][A-Za-z .,'`]+)/i);
  if (pel) out.namaPelaksana = pel[1].replace(/\bPT\.?\s*\w+/i, "").trim();
  const temuan = lineVal(text, "temuan", "finding");
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
7. **temuan**: Cari hasil observasi, temuan, catatan penting, masalah yang ditemukan
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
  "temuan": "hasil temuan atau observasi",
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
