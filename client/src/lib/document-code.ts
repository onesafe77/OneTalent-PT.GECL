// Auto-numbering util for K3 document codes
// Format: GECL-{DEPT}-{KATEGORI}-{CLAUSE_NO}
// CLAUSE_NO mengikuti penomoran SMKP Minerba (Kepmen ESDM 1827 K/30/MEM/2018),
// contoh "II.b" (Manajemen Risiko), "IV.a" (Pengelolaan Operasional), "VI.b" (Pengendalian Dokumen).
// Contoh kode dokumen lengkap: GECL-HSE-PPO-II.b, GECL-HSE-PPO-IV.a

// Mapping dari kategori dokumen (sesuai documentCategories di shared/schema.ts)
// ke kode singkat untuk auto-numbering.
export const DOCUMENT_CATEGORY_CODES: Record<string, string> = {
  "Kebijakan KPLH": "KBJ",
  "Prosedur - Dept HSE": "PPO",
  "Prosedur - Dept Opr": "PPO",
  "Prosedur - Dept Plant": "PPO",
  "SPDK": "SPDK",
  "Zero Harm": "ZH",
  "Critical Control Card": "CCC",
  "Golden Rule": "GR",
};

export function getCategoryCode(category: string): string {
  return DOCUMENT_CATEGORY_CODES[category] ?? category.replace(/\s+/g, "").toUpperCase().slice(0, 3);
}

export function generateDocumentCode(
  department: string,
  category: string,
  clauseNo: string,
  prefix: string = "GECL"
): string {
  const dept = (department || "").toUpperCase().replace(/\s+/g, "");
  const kat = getCategoryCode(category);
  const clause = (clauseNo || "").trim();
  return `${prefix}-${dept}-${kat}-${clause}`;
}

export const RETENTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "1_tahun", label: "1 tahun" },
  { value: "3_tahun", label: "3 tahun" },
  { value: "5_tahun", label: "5 tahun" },
  { value: "10_tahun", label: "10 tahun" },
  { value: "permanent", label: "Permanen" },
];

export const DEPARTMENT_OPTIONS = ["HSE", "OPR", "PLANT", "HR", "PROC", "ENG"];
