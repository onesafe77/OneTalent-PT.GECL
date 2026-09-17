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
  const singkatan = /^(K3|SMK3|SMKP|B3|IUP|IUPK|RKAB|PNBP|AMDAL|UKL-UPL|NIB|OSS|KTT|APD|PKP2B|PPLH|ESDM|LHK|BPJS|SNI)$/i;
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

const JENIS_DARI_NAMA: [RegExp, string][] = [
  [/\bperppu\b/i, "Perppu"], [/\b(uu|undang[\s-]*undang)\b/i, "UU"], [/\b(pp|peraturan pemerintah)\b/i, "PP"],
  [/\bperpres\b/i, "Perpres"], [/\bkeppres\b/i, "Keppres"],
  [/\bpermen\s*esdm\b|\bperaturan menteri esdm\b/i, "Permen ESDM"], [/\bkepmen\s*esdm\b|\bkeputusan menteri esdm\b/i, "Kepmen ESDM"],
  [/\bkepdirjen\b/i, "Kepdirjen Minerba"], [/\bpermenaker\b/i, "Permenaker"], [/\bkepmenaker\b/i, "Kepmenaker"],
  [/\bpermen\s*lhk\b/i, "Permen LHK"], [/\bkepmen\s*lhk\b/i, "Kepmen LHK"], [/\bpermenkes\b/i, "Permenkes"], [/\bsni\b/i, "SNI"],
];

/** Cadangan terakhir: nama berkas ("05. KEPMEN ESDM NOMOR 1827 TAHUN 2018 TENTANG PEDOMAN…"). */
export function metaDariNamaBerkas(nama: string): Partial<MetaTerdeteksi> {
  const t = nama.replace(/\.pdf$/i, "").replace(/^\s*\d+[.)]\s*/, "").replace(/[_]+|(?<=\w)-(?=\w)/g, " ").replace(/\s+/g, " ");
  const jenis = JENIS_DARI_NAMA.find(([re]) => re.test(t))?.[1] ?? null;
  const m = t.match(/(?:nomor|no\.?)\s*([0-9]{1,4}(?:[\s.]*K)?(?:[\s/]+[0-9A-Z.]+)*?)\s*(?:tahun|\/|\s)\s*((?:19|20)\d{2})\b/i)
    || t.match(/\b([0-9]{1,4})\s*(?:tahun|th\.?|\/|\s)\s*((?:19|20)\d{2})\b/i);
  const j = t.match(/\btentang\b\s+(.+)$/i) || t.match(/\s[-–]\s+(.+)$/);
  return {
    // "1827 K 30 MEM" -> "1827 K/30/MEM"
    jenis, nomor: m ? m[1].replace(/\s+/g, " ").trim().replace(/^(\d+(?:\s*\.?\s*K)?)[\s/]+(\d+)[\s/]+([A-Z.]+)$/i, (_, a, b, c) => `${a}/${b}/${c}`.replace(/\s*\/\s*/g, "/").replace(/(\d)\/?K\//i, "$1 K/")) : null, tahun: m ? +m[2] : null,
    judul: j ? rapikanJudul(j[1].replace(/\.+$/, "").trim()) : null,
  };
}

export function deteksiMeta(halaman: HalamanReg[], namaBerkas = ""): MetaTerdeteksi {
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
  // Nomor HANYA dari dekat kepala naskah. Tanpa kepala, "Nomor 23 Tahun 2014" di daftar Mengingat
  // ikut terbaca (uji: Kepmen 1827K yang halaman sampulnya pindaian).
  const dekatKepala = posKepala >= 0 ? setelahKepala.slice(0, 260) : "";
  const mKep = dekatKepala.match(/NOMOR\s*:?\s*([0-9]{1,4}(?:\s*\.?\s*K)?(?:\s*\/\s*[0-9A-Z.]+)+)\s*\/\s*((?:19|20)\d{2})\b/i);
  const mBiasa = dekatKepala.match(/NOMOR\s*:?\s*([0-9]{1,4}[A-Z]?)\s+TAHUN\s+((?:19|20)\d{2})\b/i);
  if (mKep && (!mBiasa || (mKep.index ?? 0) <= (mBiasa.index ?? 0))) { nomor = mKep[1].replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim(); tahun = +mKep[2]; }
  else if (mBiasa) { nomor = mBiasa[1]; tahun = +mBiasa[2]; }

  // Judul: sesudah "TENTANG" pertama setelah nomor, sampai "DENGAN RAHMAT" / nama pejabat / "Menimbang".
  let judul: string | null = null;
  const mJudul = posKepala >= 0 ? setelahKepala.match(/\bTENTANG\b\s+(.+?)\s+(?:DENGAN RAHMAT|PRESIDEN REPUBLIK|MENTERI [A-Z ]+ REPUBLIK|DIREKTUR JENDERAL|Menimbang)/) : null;
  if (mJudul) judul = rapikanJudul(mJudul[1].replace(/[,;.]+$/, "").trim()).slice(0, 300);

  // Cadangan 1 — blok penetapan: "Menetapkan : KEPUTUSAN MENTERI … TENTANG <JUDUL>."
  const awal10 = angkaOcr(halaman.slice(0, 10).flatMap((h) => h.baris).join(" ")).replace(/\s+/g, " ");
  const mTetap = awal10.match(/Menetapkan\s*:?\s*((?:PERATURAN|KEPUTUSAN|UNDANG)[A-Z\s-]+?)\s+TENTANG\s+([A-Z0-9][A-Z0-9 ,/&()'-]+?)\s*\.(?:\s|$)/);
  if (mTetap) {
    if (!jenis) { const k = KEPALA.find(([re]) => re.test(mTetap[1] + " REPUBLIK")); if (k) { jenis = k[1]; instansi ??= k[2]; } }
    if (!judul) judul = rapikanJudul(mTetap[2].trim()).slice(0, 300);
  }
  // Cadangan 2 — kepala lampiran: "LAMPIRAN I KEPUTUSAN MENTERI … NOMOR : 1827 K/30/MEM/2018 TANGGAL : 7 Mei 2018".
  const mLamp = awal10.match(/LAMPIRAN\s+[IVX\d]*\s*((?:PERATURAN|KEPUTUSAN)[A-Z\s]+?)\s+(?:REPUBLIK INDONESIA\s+)?NOMOR\s*:?\s*([0-9]{1,4}(?:\s*\.?\s*K)?(?:\s*\/\s*[0-9A-Z.]+)*?)\s*(?:\/|\s+TAHUN\s+)((?:19|20)\d{2})(?:\s+TANGGAL\s*:?\s*(\d{1,2})\s+([A-Za-z]+)\s+((?:19|20)\d{2}))?/i);
  if (mLamp) {
    if (!jenis) { const k = KEPALA.find(([re]) => re.test(mLamp[1] + " REPUBLIK")); if (k) { jenis = k[1]; instansi ??= k[2]; } }
    if (!nomor) { nomor = mLamp[2].replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim(); tahun = +mLamp[3]; }
  }

  // Tanggal penetapan: "Ditetapkan di … pada tanggal 9 September 2021" (ambil yang pertama setelah "Ditetapkan").
  let tanggalPenetapan: string | null = null;
  const semua = angkaOcr(halaman.flatMap((h) => h.baris).join(" ")).replace(/\s+/g, " ");
  const iTetap = semua.search(/Ditetapkan\s+di/i);
  const mTgl = (iTetap >= 0 ? semua.slice(iTetap, iTetap + 200) : semua).match(/pada tanggal\s+(\d{1,2})\s+([A-Za-z]+)\s+((?:19|20)\d{2})/i);
  if (mTgl && BULAN[mTgl[2].toLowerCase()]) tanggalPenetapan = `${mTgl[3]}-${BULAN[mTgl[2].toLowerCase()]}-${mTgl[1].padStart(2, "0")}`;
  if (!tanggalPenetapan && mLamp?.[4] && BULAN[mLamp[5].toLowerCase()]) tanggalPenetapan = `${mLamp[6]}-${BULAN[mLamp[5].toLowerCase()]}-${mLamp[4].padStart(2, "0")}`;

  // Cadangan 3 — nama berkas, hanya untuk kolom yang masih kosong.
  if (namaBerkas && (!jenis || !nomor || !tahun || !judul)) {
    const n = metaDariNamaBerkas(namaBerkas);
    jenis ??= n.jenis ?? null;
    if (!nomor && n.nomor && n.tahun) { nomor = n.nomor; tahun = n.tahun; }
    judul ??= n.judul ?? null;
    if (jenis && !instansi) instansi = KEPALA.find(([, j]) => j === jenis)?.[2] ?? null;
  }

  // Tanggal yang tahunnya tidak sejalan dengan tahun peraturan lebih mungkin salah ketik/OCR (uji: Permen ESDM 26/2018
  // tertulis "2 Mei 2016") — dikosongkan agar diisi pengguna, bukan disimpan keliru.
  if (tanggalPenetapan && tahun && Math.abs(+tanggalPenetapan.slice(0, 4) - tahun) > 0) tanggalPenetapan = null;

  const bidang = tebakBidang(`${judul ?? ""} ${judul ?? ""} ${datar.slice(0, 3000)}`);
  const hasil = { jenis, nomor, tahun, judul, instansi, bidang, tanggalPenetapan };
  return { ...hasil, kosong: Object.entries(hasil).filter(([k, v]) => v == null && k !== "instansi").map(([k]) => k) };
}
