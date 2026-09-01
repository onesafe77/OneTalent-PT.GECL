// Pemetaan nama kegiatan Safety Patrol → bentuk KANONIK (13 kegiatan acuan KPI/briefing).
// Dipakai bersama: parse briefing job (telegram-bot) & hitung pencapaian (routes job-achievement).
// Diselaraskan dengan canonicalSafetyActivity di routes.ts, + alias dari briefing pembagian job.

export const SAFETY_ACTIVITIES = [
  "Jarak aman beriringan",
  "Sidak kecepatan",
  "Observasi rambu",
  "Sidak kelengkapan",
  "Fatigue check",
  "Wake up call",
  "Inspeksi Jalan",
  "Inspeksi ROM",
  "Inspeksi Workshop",
  "Observasi kepatuhan Lajur",
  "Assesment (Conditional)",
  "Sidak kesesuaian roster",
  "Monitoring Area Charging Station",
  "Issue Kritikal",
  "Koordinasi Pengawas Area",
  "Safety Meeting",
  "P2H Kendaraan",
] as const;

// Tentukan shift dari jam pada string waktu (06:00–17:59 = Shift 1, selain itu Shift 2).
export function shiftFromTime(waktu?: string | null): string | null {
  if (!waktu) return null;
  const m = String(waktu).match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (isNaN(h) || h > 23) return null;
  return (h >= 6 && h < 18) ? "Shift 1" : "Shift 2";
}

// Nama pelaksana generik (bukan identitas petugas) — jangan dipakai menimpa nama yang sudah benar.
export function isGenericName(n?: string | null): boolean {
  const s = (n || "").trim().toLowerCase();
  return !s || ["safety patrol", "patrol", "pelaksana", "tim", "team", "-", "."].includes(s);
}

export function canonicalSafetyActivity(raw: string | null | undefined): string | null {
  const s = (raw || "").toLowerCase();
  if (!s) return null;
  if (s.includes("charging")) return "Monitoring Area Charging Station";
  if (s.includes("roster") || s.includes("rooster")) return "Sidak kesesuaian roster";
  if (s.includes("lajur")) return "Observasi kepatuhan Lajur";
  if (s.includes("workshop")) return "Inspeksi Workshop";
  if (s.includes("rom")) return "Inspeksi ROM";
  if (s.includes("fatigue") || s.includes("kelelahan")) return "Fatigue check";
  if (s.includes("wake")) return "Wake up call";
  if (s.includes("kecepatan")) return "Sidak kecepatan";
  if (s.includes("rambu")) return "Observasi rambu";
  if (s.includes("kelengkapan")) return "Sidak kelengkapan";
  if (s.includes("jarak") || s.includes("beriringan")) return "Jarak aman beriringan";
  if (s.includes("asses") || s.includes("assess")) return "Assesment (Conditional)";
  if (s.includes("issue") || s.includes("kritikal") || s.includes("kritis") || s.includes("hazard")) return "Issue Kritikal";
  if (s.includes("give way")) return "Observasi rambu";
  // Tiga kegiatan di bawah nyata dilakukan tim tapi dulu tidak terpetakan, sehingga
  // 153 laporan menumpuk di "Lainnya". Ditaruh SEBELUM penangkap "jalan/hauling"
  // yang sangat luas; ejaan "kordinasi" ikut karena sering tertulis begitu.
  if (s.includes("koordinasi") || s.includes("kordinasi")) return "Koordinasi Pengawas Area";
  if (s.includes("meeting")) return "Safety Meeting";
  if (s.includes("p2h")) return "P2H Kendaraan";
  if (s.includes("jalan") || s.includes("hauling") || s.includes("haul road")) return "Inspeksi Jalan";
  return null;
}

// Judul laporan = baris non-kosong pertama rawMessage (tanpa karakter tak terlihat & markdown *).
// Dipakai sbg fallback matching saat AI salah mengekstrak kegiatan/jenisLaporan/temuan.
function reportTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  const clean = raw.replace(/[​‎‏﻿]/g, "");
  const line = clean.split("\n").map(l => l.trim()).find(l => l.length > 0) || "";
  return line.replace(/\*/g, "").trim();
}

// Aktivitas kanonik dari sebuah laporan.
// JUDUL laporan (baris pertama) DIDAHULUKAN — di sanalah petugas menyebutkan kegiatannya
// secara eksplisit. Field `kegiatan` hasil AI sering terisi potongan tanda tangan/footer
// ("OHS Hauling", "Team Alpha", "Pelaksana", "Note", "Phase 7", "Safety Patrol") yang
// menyesatkan: mis. "OHS Hauling" memuat kata "hauling" sehingga jatuh ke jaring terakhir
// "Inspeksi Jalan", padahal laporannya tentang Jarak Aman Beriringan — akibatnya target
// job tsb tak pernah tercentang di Pencapaian Job.
// Diuji atas 752 laporan (sejak Jun 2026): 42 berubah, SELURUHNYA koreksi.
// Judul dipakai HANYA baris pertama (bukan seluruh teks) agar tidak over-match.
export function canonicalReportActivity(r: {
  kegiatan?: string | null; jenisLaporan?: string | null; temuan?: string | null;
  rawMessage?: string | null;
} | null | undefined): string | null {
  if (!r) return null;
  return canonicalSafetyActivity(reportTitle(r.rawMessage))
    || canonicalSafetyActivity(r.kegiatan)
    || canonicalSafetyActivity(r.jenisLaporan)
    || canonicalSafetyActivity(r.temuan)
    || null;
}


/**
 * Ambil jumlah sampel yang diperiksa dari teks laporan.
 * Tim menuliskannya sebagai kalimat, bukan kolom tersendiri:
 *   "Dari 15 driver yang dilakukan Observasi wake up call ..."
 *   "Dari 10 Unit Hauling yang dilakukan Observasi sidak kelengkapan ..."
 *   "Dari 15 Sample Driver yang dilakukan Observasi Jarak Aman Beriringan ..."
 *
 * Sengaja KONSERVATIF: hanya angka yang jelas menempel pada kata benda sampel
 * (driver/unit/sample/orang) yang diambil. Angka lain di teks — nomor lambung,
 * jam, tanggal — tidak boleh ikut terhitung sebagai sampel.
 * Mengembalikan null bila tidak ada, supaya pemanggil bisa membedakan
 * "tidak mencantumkan" dari "nol sampel".
 */
export function jumlahSampel(...teks: (string | null | undefined)[]): number | null {
  const POLA = [
    /\bdari\s+(\d{1,4})\s*(?:\(\d+\)\s*)?(?:sample\s+|sampel\s+)?(?:driver|unit|orang|pengendara|karyawan|sample|sampel)/i,
    /\bsebanyak\s+(\d{1,4})\s*(?:driver|unit|orang|pengendara|karyawan|sample|sampel)/i,
    /\b(\d{1,4})\s+(?:sample|sampel)\b/i,
    /\btotal\s+(?:sample|sampel)\s*:?\s*(\d{1,4})/i,
  ];
  for (const t of teks) {
    const s = (t || "").replace(/\s+/g, " ");
    if (!s) continue;
    for (const p of POLA) {
      const m = p.exec(s);
      if (m) {
        const n = parseInt(m[1], 10);
        // Batas atas 500: di atas itu hampir pasti bukan jumlah sampel
        // (mis. nomor unit "DT 7050" atau angka jarak).
        if (n > 0 && n <= 500) return n;
      }
    }
  }
  return null;
}
