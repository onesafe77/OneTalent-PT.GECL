// Baca identitas peraturan langsung dari PDF, supaya pengunggah tidak mengetik ulang.
// Sumber: kepala naskah ("PERATURAN PEMERINTAH REPUBLIK INDONESIA / NOMOR 96 TAHUN 2021 / TENTANG …")
// dan blok penetapan ("Ditetapkan di Jakarta / pada tanggal 9 September 2021").
// Tahan salah-OCR pada angka ("2O21", "2O2l"). Hasil selalu bisa dikoreksi pengguna sebelum terbit.
import type { HalamanReg } from "./potong";

export interface MetaTerdeteksi {
  jenis: string | null; nomor: string | null; tahun: number | null; judul: string | null;
  instansi: string | null; bidang: string | null; tanggalPenetapan: string | null;
  /** kolom yang tidak berhasil dibaca → ditandai di form */
  kosong: string[];
}

// Urutan penting: pola panjang dulu ("PERATURAN MENTERI ENERGI…" sebelum "PERATURAN").
const KEPALA: [RegExp, string, string | null][] = [
  [/PERATURAN\s+PEMERINTAH\s+PENGGANTI\s+UNDANG/i, "Perppu", null],
  [/UNDANG[\s-]*UNDANG\s+REPUBLIK/i, "UU", null],
  [/PERATURAN\s+PEMERINTAH\s+REPUBLIK/i, "PP", null],
  [/PERATURAN\s+PRESIDEN\s+REPUBLIK/i, "Perpres", null],
  [/KEPUTUSAN\s+PRESIDEN\s+REPUBLIK/i, "Keppres", null],
  [/PERATURAN\s+MENTERI\s+ENERGI\s+DAN\s+SUMBER\s+DAYA\s+MINERAL/i, "Permen ESDM", "Kementerian ESDM"],
  [/KEPUTUSAN\s+MENTERI\s+ENERGI\s+DAN\s+SUMBER\s+DAYA\s+MINERAL/i, "Kepmen ESDM", "Kementerian ESDM"],
  [/KEPUTUSAN\s+DIREKTUR\s+JENDERAL\s+MINERAL\s+DAN\s+BATUBARA/i, "Kepdirjen Minerba", "Ditjen Minerba, Kementerian ESDM"],
  [/PERATURAN\s+MENTERI\s+(KETENAGAKERJAAN|TENAGA\s+KERJA)/i, "Permenaker", "Kementerian Ketenagakerjaan"],
  [/KEPUTUSAN\s+MENTERI\s+(KETENAGAKERJAAN|TENAGA\s+KERJA)/i, "Kepmenaker", "Kementerian Ketenagakerjaan"],
  [/PERATURAN\s+MENTERI\s+LINGKUNGAN\s+HIDUP/i, "Permen LHK", "Kementerian Lingkungan Hidup dan Kehutanan"],
  [/KEPUTUSAN\s+MENTERI\s+LINGKUNGAN\s+HIDUP/i, "Kepmen LHK", "Kementerian Lingkungan Hidup dan Kehutanan"],
  [/PERATURAN\s+MENTERI\s+KESEHATAN/i, "Permenkes", "Kementerian Kesehatan"],
  [/STANDAR\s+NASIONAL\s+INDONESIA/i, "SNI", "Badan Standardisasi Nasional"],
];

const BULAN: Record<string, string> = { januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06", juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", nopember: "11", desember: "12" };

/** Angka hasil OCR: O→0, l/I/i→1 hanya di dalam token yang dominan angka. */
const angkaOcr = (s: string) => s.replace(/[0-9OoIlSi]{2,}/g, (t) => (/\d/.test(t) ? t.replace(/[Oo]/g, "0").replace(/[Ili]/g, "1").replace(/S/g, "5") : t));

const rapikanJudul = (s: string) => {
  const kecil = new Set(["dan", "atau", "yang", "di", "ke", "dari", "untuk", "pada", "dalam", "atas", "serta", "tentang", "dengan", "oleh", "bagi"]);
  const singkatan = /^(K3|SMK3|SMKP|B3|IUP|IUPK|RKAB|PNBP|AMDAL|UKL-UPL|NIB|OSS|KTT|APD|PKP2B)$/i;
  return s.toLowerCase().split(/\s+/).map((w, i) => (singkatan.test(w) ? w.toUpperCase() : i > 0 && kecil.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
};

export function tebakBidang(teks: string): string | null {
  const t = teks.toLowerCase();
  const skor: [string, number][] = [
    ["minerba", (t.match(/pertambangan|mineral|batubara|reklamasi|pascatambang|tambang|iup\b|smkp/g) || []).length],
    ["lingkungan", (t.match(/lingkungan hidup|limbah|amdal|pencemaran|baku mutu|emisi|kehutanan|b3\b/g) || []).length],
    ["k3", (t.match(/keselamatan|kesehatan kerja|k3\b|smk3|kecelakaan kerja|higiene|ergonomi/g) || []).length],
    ["ketenagakerjaan", (t.match(/ketenagakerjaan|tenaga kerja|pekerja|upah|jaminan sosial|pesangon|hubungan industrial/g) || []).length],
  ];
  skor.sort((a, b) => b[1] - a[1]);
  return skor[0][1] > 0 ? skor[0][0] : null;
}

export function deteksiMeta(halaman: HalamanReg[]): MetaTerdeteksi {
  // Kepala naskah: 2 halaman pertama cukup (halaman 1 kadang sampul Berita Negara).
  const awal = angkaOcr(halaman.slice(0, 2).flatMap((h) => h.baris).join("\n"));
  const datar = awal.replace(/\s+/g, " ");

  let jenis: string | null = null, instansi: string | null = null, posKepala = -1;
  for (const [re, j, ins] of KEPALA) {
    const m = datar.match(re);
    if (m && (posKepala < 0 || (m.index ?? 0) < posKepala)) { jenis = j; instansi = ins; posKepala = m.index ?? 0; }
  }
  const setelahKepala = posKepala >= 0 ? datar.slice(posKepala) : datar;

  let nomor: string | null = null, tahun: number | null = null;
  // "NOMOR 1827 K/30/MEM/2018" (keputusan) lebih dulu, lalu "NOMOR 96 TAHUN 2021".
  const mKep = setelahKepala.match(/NOMOR\s*:?\s*([0-9]{1,4}(?:\s*\.?\s*K)?(?:\s*\/\s*[0-9A-Z.]+)+)\s*\/\s*((?:19|20)\d{2})\b/i);
  const mBiasa = setelahKepala.match(/NOMOR\s*:?\s*([0-9]{1,4}[A-Z]?)\s+TAHUN\s+((?:19|20)\d{2})\b/i);
  if (mKep && (!mBiasa || (mKep.index ?? 0) <= (mBiasa.index ?? 0))) { nomor = mKep[1].replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim(); tahun = +mKep[2]; }
  else if (mBiasa) { nomor = mBiasa[1]; tahun = +mBiasa[2]; }

  // Judul: sesudah "TENTANG" pertama setelah nomor, sampai "DENGAN RAHMAT" / nama pejabat / "Menimbang".
  let judul: string | null = null;
  const mJudul = setelahKepala.match(/\bTENTANG\b\s+(.+?)\s+(?:DENGAN RAHMAT|PRESIDEN REPUBLIK|MENTERI [A-Z ]+ REPUBLIK|DIREKTUR JENDERAL|Menimbang)/);
  if (mJudul) judul = rapikanJudul(mJudul[1].replace(/[,;.]+$/, "").trim()).slice(0, 300);

  // Tanggal penetapan: "Ditetapkan di … pada tanggal 9 September 2021" (ambil yang pertama setelah "Ditetapkan").
  let tanggalPenetapan: string | null = null;
  const semua = angkaOcr(halaman.flatMap((h) => h.baris).join(" ")).replace(/\s+/g, " ");
  const iTetap = semua.search(/Ditetapkan\s+di/i);
  const mTgl = (iTetap >= 0 ? semua.slice(iTetap, iTetap + 200) : semua).match(/pada tanggal\s+(\d{1,2})\s+([A-Za-z]+)\s+((?:19|20)\d{2})/i);
  if (mTgl && BULAN[mTgl[2].toLowerCase()]) tanggalPenetapan = `${mTgl[3]}-${BULAN[mTgl[2].toLowerCase()]}-${mTgl[1].padStart(2, "0")}`;

  // Tanggal yang tahunnya tidak sejalan dengan tahun peraturan lebih mungkin salah ketik/OCR (uji: Permen ESDM 26/2018
  // tertulis "2 Mei 2016") — dikosongkan agar diisi pengguna, bukan disimpan keliru.
  if (tanggalPenetapan && tahun && Math.abs(+tanggalPenetapan.slice(0, 4) - tahun) > 0) tanggalPenetapan = null;

  const bidang = tebakBidang(`${judul ?? ""} ${judul ?? ""} ${datar.slice(0, 3000)}`);
  const hasil = { jenis, nomor, tahun, judul, instansi, bidang, tanggalPenetapan };
  return { ...hasil, kosong: Object.entries(hasil).filter(([k, v]) => v == null && k !== "instansi").map(([k]) => k) };
}
