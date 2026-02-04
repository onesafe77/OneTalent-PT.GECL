import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { templateResolver } from "./template-resolver";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key" });

interface ParsedReport {
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

export async function parseReportWithGemini(messageText: string): Promise<ParsedReport> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const matchResult = await templateResolver.matchTemplate(messageText);
  const templateContext = templateResolver.buildPromptContext(matchResult.template);

  const templateNames = await templateResolver.getAllTemplateNames();
  const availableTypes = templateNames.length > 0
    ? templateNames.join(", ")
    : "Daily Briefing, Temuan, Pelanggaran, Laporan Umum";

  const prompt = `Kamu adalah AI yang sangat pintar dalam mengekstrak data dari pesan WhatsApp Safety Patrol.

TUGAS UTAMA: Ekstrak SEMUA informasi yang bisa ditemukan dari pesan, WAJIB mengisi semua field yang ada datanya.

${templateContext ? `KONTEKS TEMPLATE (opsional, untuk referensi):\n${templateContext}\n` : ''}

PESAN YANG AKAN DIANALISIS:
${messageText}

JENIS LAPORAN YANG TERSEDIA:
${availableTypes}

INSTRUKSI EKSTRAKSI WAJIB - Cari dan ekstrak data ini dari pesan:

1. **tanggal**: Cari format tanggal apapun (22 Des 2025, 22/12/2025, 22-12-2025, Senin 22 Desember 2025, dll). Konversi ke YYYY-MM-DD.
2. **waktuPelaksanaan**: Cari jam/waktu (08:00, 14.30, 08:00-09:00, 08:00 WITA, Pukul 08.00, dll)
3. **shift**: Cari kata "Shift 1", "Shift 2", "SHIFT I", "SHIFT II", "Siang", "Malam", atau tentukan dari waktu (06:00-18:00 = Shift 1, 18:00-06:00 = Shift 2)
4. **lokasi**: Cari nama tempat, area, KM, site, pit, workshop, rest area, unit, dll
5. **kegiatan**: Identifikasi jenis aktivitas (Wake Up Call, Daily Briefing, Sidak Roster, P2H, Observasi, Safety Meeting, Patrol, Inspeksi, dll)
6. **namaPelaksana**: Cari nama orang yang melakukan/melaporkan kegiatan (bisa 1-2 nama, pisahkan dengan koma jika ada 2 orang). Biasanya di awal atau akhir pesan, atau setelah kata "Pelaksana:", "Oleh:", "Dari:", "By:". Contoh: "Hairul, Adi Purnomo" atau "Jumaidi PT GECL, I Wayan Sutana PT BMT"
7. **temuan**: Cari hasil observasi, temuan, catatan penting, masalah yang ditemukan, kondisi yang dilaporkan
8. **pemateri**: Cari nama-nama pemateri, pelapor, atau peserta penting dengan jabatan jika ada
9. **attendance**: Jika ada daftar unit/kehadiran, ekstrak kode unit (RBT, BMT, AEK, GECL, BBS, MMS, BKAE, MAV, KMB, RAM)
10. **rosterOff**: Unit yang libur/off

FORMAT OUTPUT JSON:
{
  "jenisLaporan": "nama jenis laporan yang paling sesuai",
  "kegiatan": "nama kegiatan spesifik yang diekstrak",
  "tanggal": "YYYY-MM-DD",
  "waktuPelaksanaan": "jam pelaksanaan (contoh: 08:00 - 09:00 WITA)",
  "shift": "Shift 1 atau Shift 2",
  "lokasi": "lokasi/area kegiatan",
  "namaPelaksana": "nama pelaksana 1, nama pelaksana 2 (jika ada 2 orang)",
  "pemateri": ["nama1 (jabatan1)", "nama2"],
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
- Untuk pelaksana: biasanya nama orang di bagian tanda tangan atau setelah "Salam K3"
- Untuk temuan: cari kalimat yang mendeskripsikan kondisi, hasil, observasi
- Jika ada foto/gambar disebutkan, catat di summary
- Berikan HANYA JSON tanpa penjelasan tambahan

CONTOH EKSTRAKSI:
Pesan: "Salam K3, Daily Briefing Shift 1 tanggal 22 Des 2025 pukul 08:00 WITA di Rest Area KM 16. Pelaksana: Budi Santoso. Temuan: Semua unit hadir."
Hasil: {"jenisLaporan":"Daily Briefing","kegiatan":"Daily Briefing","tanggal":"2025-12-22","waktuPelaksanaan":"08:00 WITA","shift":"Shift 1","lokasi":"Rest Area KM 16","namaPelaksana":"Budi Santoso","temuan":"Semua unit hadir","pemateri":[],"attendance":[],"rosterOff":[],"summary":"Daily Briefing Shift 1 di Rest Area KM 16, semua unit hadir"}

Berikan HANYA JSON tanpa penjelasan tambahan.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedReport;

      if (!parsed.tanggal) {
        parsed.tanggal = new Date().toISOString().split('T')[0];
      }
      if (!parsed.jenisLaporan) {
        parsed.jenisLaporan = matchResult.template?.name || "Laporan Umum";
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

      parsed.matchedTemplate = matchResult.template?.name;
      parsed.matchScore = matchResult.matchScore;

      return parsed;
    }

    const fallbackDate = new Date();
    return {
      jenisLaporan: matchResult.template?.name || "Laporan Umum",
      kegiatan: matchResult.template?.name,
      tanggal: fallbackDate.toISOString().split('T')[0],
      bulan: getBulanIndonesia(fallbackDate),
      week: getWeekOfMonth(fallbackDate),
      pemateri: [],
      attendance: [],
      rosterOff: [],
      summary: messageText.substring(0, 200),
      matchedTemplate: matchResult.template?.name,
      matchScore: matchResult.matchScore
    };
  } catch (error) {
    console.error("Error parsing with Gemini, trying OpenAI fallback:", error);

    // Try OpenAI as fallback
    try {
      console.log("🔄 Switching to OpenAI for parsing...");
      const openaiResult = await parseWithOpenAI(messageText, templateContext, availableTypes);

      if (openaiResult) {
        openaiResult.matchedTemplate = matchResult.template?.name;
        openaiResult.matchScore = matchResult.matchScore;
        console.log("✅ OpenAI parsing successful");
        return openaiResult;
      }
    } catch (openaiError) {
      console.error("Error parsing with OpenAI:", openaiError);
    }

    const errorDate = new Date();
    return {
      jenisLaporan: matchResult.template?.name || "Laporan Umum",
      kegiatan: matchResult.template?.name,
      tanggal: errorDate.toISOString().split('T')[0],
      bulan: getBulanIndonesia(errorDate),
      week: getWeekOfMonth(errorDate),
      pemateri: [],
      attendance: [],
      rosterOff: [],
      summary: "Gagal menganalisis pesan"
    };
  }
}

async function parseWithOpenAI(messageText: string, templateContext: string, availableTypes: string): Promise<ParsedReport | null> {
  const prompt = `Kamu adalah AI yang sangat pintar dalam mengekstrak data dari pesan WhatsApp Safety Patrol.

TUGAS UTAMA: Ekstrak SEMUA informasi yang bisa ditemukan dari pesan, WAJIB mengisi semua field yang ada datanya.

${templateContext ? `KONTEKS TEMPLATE (opsional, untuk referensi):\n${templateContext}\n` : ''}

PESAN YANG AKAN DIANALISIS:
${messageText}

JENIS LAPORAN YANG TERSEDIA:
${availableTypes}

INSTRUKSI EKSTRAKSI WAJIB - Cari dan ekstrak data ini dari pesan:

1. **tanggal**: Cari format tanggal apapun (22 Des 2025, 22/12/2025, 22-12-2025, Senin 22 Desember 2025, dll). Konversi ke YYYY-MM-DD.
2. **waktuPelaksanaan**: Cari jam/waktu (08:00, 14.30, 08:00-09:00, 08:00 WITA, Pukul 08.00, dll)
3. **shift**: Cari kata "Shift 1", "Shift 2", "SHIFT I", "SHIFT II", "Siang", "Malam", atau tentukan dari waktu (06:00-18:00 = Shift 1, 18:00-06:00 = Shift 2)
4. **lokasi**: Cari nama tempat, area, KM, site, pit, workshop, rest area, unit, dll
5. **kegiatan**: Identifikasi jenis aktivitas (Wake Up Call, Daily Briefing, Sidak Roster, P2H, Observasi, Safety Meeting, Patrol, Inspeksi, dll)
6. **namaPelaksana**: Cari nama orang yang melakukan/melaporkan kegiatan
7. **temuan**: Cari hasil observasi, temuan, catatan penting, masalah yang ditemukan
8. **pemateri**: Cari nama-nama pemateri, pelapor, atau peserta penting
9. **attendance**: Jika ada daftar unit/kehadiran, ekstrak kode unit (RBT, BMT, AEK, GECL, BBS, MMS, BKAE, MAV, KMB, RAM)
10. **rosterOff**: Unit yang libur/off

FORMAT OUTPUT JSON:
{
  "jenisLaporan": "nama jenis laporan",
  "kegiatan": "nama kegiatan spesifik",
  "tanggal": "YYYY-MM-DD",
  "waktuPelaksanaan": "jam pelaksanaan",
  "shift": "Shift 1 atau Shift 2",
  "lokasi": "lokasi/area kegiatan",
  "namaPelaksana": "nama pelaksana",
  "pemateri": ["nama1", "nama2"],
  "temuan": "hasil temuan",
  "attendance": [{"unitCode": "XXX", "shift": "Shift 1", "status": "Hadir", "keterangan": ""}],
  "rosterOff": ["XXX"],
  "summary": "ringkasan singkat"
}

ATURAN: WAJIB isi field jika datanya ada. Berikan HANYA JSON tanpa penjelasan.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]) as ParsedReport;

    if (!parsed.tanggal) {
      parsed.tanggal = new Date().toISOString().split('T')[0];
    }
    if (!parsed.jenisLaporan) {
      parsed.jenisLaporan = "Laporan Umum";
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

    return parsed;
  }

  return null;
}

export async function analyzeReportContent(messageText: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analisis laporan Safety Patrol berikut dan berikan ringkasan singkat dalam bahasa Indonesia (maksimal 3 kalimat):

${messageText}

Fokus pada:
- Jenis kegiatan
- Jumlah unit/personel yang hadir
- Hal penting yang perlu diperhatikan`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error analyzing with Gemini, trying OpenAI:", error);

    // Try OpenAI as fallback
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content || "Analisis berhasil";
    } catch (openaiError) {
      console.error("Error analyzing with OpenAI:", openaiError);
      return "Gagal menganalisis konten laporan";
    }
  }
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

async function urlToGenerativePart(url: string, mimeType: string = "image/jpeg") {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString("base64"),
        mimeType,
      },
    };
  } catch (error) {
    console.error("Error fetching image for Gemini:", error);
    return null;
  }
}

export async function parseMCUWithGemini(caption: string, imageUrl?: string): Promise<ParsedMCU | null> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analisis Dokumen/Foto Hasil MCU (Medical Check Up).
  
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
      - Fit to work -> FIT_TO_WORK
      - Fit with note/catatan -> FIT_WITH_NOTE
      - Unfit -> UNFIT
      - Temporary Unfit -> TEMPORARY_UNFIT
  11. verifikasiSaran: Saran dokter / Rekomendasi Medis
  12. followUp: Tindakan lanjut yang disarankan

  CAPTION DARI PENGIRIM: "${caption}"
  (Gunakan caption sebagai petunjuk tambahan jika teks di gambar kurang jelas, terutama Nama atau Perusahaan).

  ATURAN OUTPUT:
  - Berikan HANYA JSON valid.
  - Tanggal format YYYY-MM-DD.
  - Jika data tidak ditemukan, isi dengan string kosong "" atau null.
  `;

  try {
    let result;
    if (imageUrl) {
      console.log("📷 Processing MCU with Vision AI:", imageUrl);
      const imagePart = await urlToGenerativePart(imageUrl);
      if (imagePart) {
        result = await model.generateContent([prompt, imagePart]);
      } else {
        result = await model.generateContent(prompt);
      }
    } else {
      result = await model.generateContent(prompt);
    }

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedMCU;
      // Basic cleanup & Defaults
      if (!parsed.nama && caption.length < 50) parsed.nama = caption.replace(/mcu/i, "").trim();
      if (!parsed.hasilKesimpulan) parsed.hasilKesimpulan = "FIT_TO_WORK"; // Default fallback

      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Error parsing MCU with Gemini:", error);
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
  - Tanggal konversi ke format YYYY-MM-DD.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedSickLeave;
      // Basic validation
      if (!parsed.tanggal) parsed.tanggal = new Date().toISOString().split('T')[0];
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Error parsing Sick Leave with Gemini:", error);
    return null;
  }
}
