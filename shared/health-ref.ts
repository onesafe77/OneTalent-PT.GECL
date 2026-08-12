// Daftar pilihan Register Driver Sakit — mengikuti sheet "Referensi" pada
// "Database Indikator Kesehatan GECL.xlsx". Dipakai bersama form (FE) & importer (BE).
// Catatan sumber: "Boleh diubah/ditambah" — karena itu form tetap menerima teks bebas.

export const JENIS_KEJADIAN = [
  "Sakit Biasa",
  "PAK (Penyakit Akibat Kerja)",
  "Kecelakaan Kerja",
] as const;

export const DAFTAR_DIAGNOSA = [
  "Common Cold", "Myalgia", "Faringitis", "Cephalgia", "Gingivitis", "Dyspepsia",
  "ISPA", "Cough", "Obs Febris", "Diare Akut / GEA", "Hipertensi", "Others",
] as const;

export const STATUS_PERAWATAN = [
  "Rawat Jalan", "Rawat Inap", "Istirahat di Rumah", "Tetap Bekerja",
] as const;

export const UNIT_POOL = ["OPR", "HSE", "PLANT", "FINANCE", "HRGA"] as const;

export const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

/** Kejadian yang dihitung sebagai KECELAKAAN (memakai hari hilang utk ASR). */
export const isKecelakaan = (jenis?: string | null) =>
  /kecelakaan/i.test(String(jenis || ""));

/**
 * Hitung indikator satu periode.
 * MFR = (kasus sakit ÷ jam kerja) × faktor
 * SSR = (hari hilang sakit ÷ jam kerja) × faktor
 * ASR = (hari hilang kecelakaan ÷ jam kerja) × faktor
 * CMR = kasus ÷ jumlah tenaga kerja   ← sama persis dengan rumus di Excel sumber
 *       (di Excel kolomnya berjudul "%", tetapi tidak dikali 100 — dipertahankan
 *        apa adanya agar angkanya cocok dengan file mereka)
 */
export function hitungIndikator(input: {
  kasusSakit: number; hariHilangSakit: number; hariHilangKecelakaan: number;
  jamKerja: number; tenagaKerja: number; faktor: number;
}) {
  const { kasusSakit, hariHilangSakit, hariHilangKecelakaan, jamKerja, tenagaKerja, faktor } = input;
  const perJam = (n: number) => (jamKerja > 0 ? (n / jamKerja) * faktor : 0);
  return {
    mfr: perJam(kasusSakit),
    ssr: perJam(hariHilangSakit),
    asr: perJam(hariHilangKecelakaan),
    cmr: tenagaKerja > 0 ? kasusSakit / tenagaKerja : 0,
  };
}
