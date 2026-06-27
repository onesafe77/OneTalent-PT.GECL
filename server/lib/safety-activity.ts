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
  if (s.includes("jalan") || s.includes("hauling") || s.includes("haul road")) return "Inspeksi Jalan";
  return null;
}

// Aktivitas kanonik dari sebuah laporan: utamakan `kegiatan`, lalu jenis laporan, lalu temuan.
// Dipakai pencocokan Pencapaian Job agar laporan dgn judul generik tetap terdeteksi.
export function canonicalReportActivity(r: {
  kegiatan?: string | null; jenisLaporan?: string | null; temuan?: string | null;
} | null | undefined): string | null {
  if (!r) return null;
  return canonicalSafetyActivity(r.kegiatan)
    || canonicalSafetyActivity(r.jenisLaporan)
    || canonicalSafetyActivity(r.temuan)
    || null;
}
