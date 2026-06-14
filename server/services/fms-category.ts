// Pemetaan jenis pelanggaran FMS (violationType) → kategori/tab seperti FAMOUS.
// Cakupan 4 kategori (sesuai keputusan user): Fatigue Alarm, Non Fatigue Alarm, AEBS, Overspeed.
// Redzone / PTO Violation / Outside BIB Area TIDAK diikutkan.

export type FmsCategory = "Fatigue Alarm" | "Non Fatigue Alarm" | "AEBS" | "Overspeed" | "Lainnya";

export const FMS_CATEGORIES: FmsCategory[] = [
  "Fatigue Alarm",
  "Non Fatigue Alarm",
  "AEBS",
  "Overspeed",
];

// Kata kunci per kategori (cek case-insensitive, substring). Urut spesifik → umum.
const RULES: { category: FmsCategory; keywords: string[] }[] = [
  { category: "AEBS", keywords: ["aebs", "awas tabrakan"] },
  { category: "Overspeed", keywords: ["over speed", "overspeed", "kecepatan"] },
  {
    category: "Fatigue Alarm",
    keywords: ["mata tertutup", "mengantuk", "kelelahan", "fatigue"],
  },
  {
    category: "Non Fatigue Alarm",
    keywords: [
      "perhatian teralihkan", "teralihkan", "merokok", "handphone", "telepon",
      "kamera", "authentication", "autentikasi", "jaga jarak", "jarak aman",
      "sabuk pengaman", "seatbelt", "menguap",
    ],
  },
];

/** Kembalikan kategori FAMOUS dari nama pelanggaran. Default "Lainnya" bila tak cocok. */
export function categorizeViolation(violationType: string | null | undefined): FmsCategory {
  const t = String(violationType ?? "").toLowerCase().trim();
  if (!t) return "Lainnya";
  for (const r of RULES) {
    if (r.keywords.some((k) => t.includes(k))) return r.category;
  }
  return "Lainnya";
}
