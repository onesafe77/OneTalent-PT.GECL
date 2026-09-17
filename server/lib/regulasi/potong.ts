// Pemotong PERATURAN PERUNDANG-UNDANGAN (UU, PP, Permen, Kepmen, …) menjadi potongan per PASAL.
//
// Berbeda dari pemotong PPO (server/lib/ppo/potong.ts):
//  - Teks diambil dalam URUTAN BACA ASLI pdf.js (hasEOL), bukan dikelompokkan per koordinat Y.
//    PDF peraturan banyak hasil OCR; mengelompokkan per Y mengacak urutan kata
//    (uji PP 96/2021: "pengolahan pemurnian pengembangan dan/atau atau").
//  - Satuan makna = Pasal. Pasal panjang dipecah di batas ayat "(n)"; judul BAB/Bagian ikut sebagai jalur.
//  - Bagian dokumen dikenali: pembukaan (Menimbang/Mengingat) · batang tubuh · PENJELASAN · LAMPIRAN.
//  - UU/PP perubahan ("Pasal I … Ketentuan Pasal 5 diubah sehingga berbunyi: Pasal 5 …") ditandai.
// Dijamin tanpa kehilangan teks: setiap baris isi masuk tepat satu potongan (diperiksa, bila tidak → galat).

import { hashTeks, pecahKalimat, UKURAN } from "../ppo/potong";

export type JenisPotonganRegulasi = "pasal" | "penjelasan" | "lampiran" | "pembukaan";

export interface HalamanReg { no: number; baris: string[] }

export interface PotonganRegulasi {
  urutan: number;
  jenis: JenisPotonganRegulasi;
  bagian: string;          // mis. "BAB II Ruang Lingkup › Pasal 2" atau "Penjelasan › Pasal 57"
  pasal: string | null;    // "2", "42A" — kunci pengambilan langsung
  halamanAwal: number;
  halamanAkhir: number;
  teks: string;
  teksEmbed: string;
  hash: string;
}

export interface IdentitasRegulasi { label: string; judul: string; status?: string }

export interface MutuTeks { halaman: number; halamanTanpaTeks: number; rasioKataRusak: number; catatan: string[] }

// ------------------------------------------------------------------ ekstraksi

/** Baris per halaman dalam urutan baca asli pdf.js. */
export async function ekstrakHalamanReg(pdfBytes: Uint8Array): Promise<HalamanReg[]> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: pdfBytes, verbosity: 0 }).promise;
  const hasil: HalamanReg[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const isi = await (await pdf.getPage(i)).getTextContent();
    let teks = "";
    for (const it of isi.items as any[]) teks += (it.str ?? "") + (it.hasEOL ? "\n" : "");
    hasil.push({ no: i, baris: teks.split("\n").map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean) });
  }
  return hasil;
}

/**
 * Perkiraan mutu lapisan teks. "Kata rusak" = token campuran huruf-angka khas salah OCR
 * ("2O21", "l2l", "pasai") — bukan penilaian ejaan, hanya sinyal agar pengunggah memeriksa.
 */
export function nilaiMutu(halaman: HalamanReg[]): MutuTeks {
  const tanpaTeks = halaman.filter((h) => h.baris.join(" ").length < 80).length;
  const kata = halaman.flatMap((h) => h.baris.join(" ").split(/\s+/)).filter((k) => k.length >= 3);
  const rusak = kata.filter((k) => /[a-z][0-9]|[0-9][a-zA-Z]|^[lI][0-9]|[0-9][lIO]\b|[!|]/.test(k) && !/^\d+[A-Z]?$/.test(k) && !/^\(\d+\)$/.test(k)).length;
  const rasio = kata.length ? rusak / kata.length : 0;
  const catatan: string[] = [];
  if (halaman.length && tanpaTeks === halaman.length) catatan.push("PDF tidak punya lapisan teks (pindaian) — perlu OCR sebelum bisa dicari.");
  else if (tanpaTeks > 0) catatan.push(`${tanpaTeks} dari ${halaman.length} halaman tanpa teks (kemungkinan lampiran pindaian).`);
  if (rasio > 0.006) catatan.push(`Teks tampak hasil OCR dengan salah baca (±${(rasio * 100).toFixed(1)}% kata janggal). Kutipan mungkin berbeda dari cetakan.`);
  return { halaman: halaman.length, halamanTanpaTeks: tanpaTeks, rasioKataRusak: +rasio.toFixed(4), catatan };
}

// ------------------------------------------------------------------ pembersihan

const POLA_BUANG = [
  /^(salinan|pres[i!l1]den|republik indonesia)$/i,
  /^-?\s*\d{1,3}\s*-?$/,                 // "- 2 -", "-10-", "12"
  /^www\.[a-z.]+$/i,                     // www.peraturan.go.id
  /^\d{4},\s*no\.?\s*\d+$/i,             // "2018, No. 596"
  /^jdih\.[a-z.]+$/i,
];

/** Buang kepala/kaki: pola dikenal + penunjuk lanjutan di akhir halaman ("pegawai ..."). */
function bersihkan(halaman: HalamanReg[]): { teks: string; hal: number }[] {
  const out: { teks: string; hal: number }[] = [];
  for (const h of halaman) {
    h.baris.forEach((b, i) => {
      if (POLA_BUANG.some((re) => re.test(b))) return;
      // Penunjuk halaman berikut ala naskah lama: baris terakhir berakhir "..." yang mengulang awal halaman berikutnya.
      if (i >= h.baris.length - 2 && /\.\s?\.\s?\.$|…$/.test(b) && b.length < 60) return;
      out.push({ teks: b, hal: h.no });
    });
  }
  return out;
}

// ------------------------------------------------------------------ struktur

// OCR sering membaca "Pasal" sebagai "Pasai", "Pasel", dan angkanya "lO3", "i37", "Z6".
const RE_PASAL = /^pa[s5][a4][lI1i!]\s+(\d{1,3}[A-Z]?|[IVXL]{1,6})\s*\.?$/i;
const RE_PASAL_RUSAK = /^pa[s5][ae4][lI1i!][\s'’]*([0-9A-Za-z'’.\/!]{1,6})\s*[.>]?$/;
const PETA_OCR: Record<string, string> = { O: "0", o: "0", l: "1", I: "1", i: "1", t: "1", "!": "1", Z: "2", z: "2", S: "5", s: "5", b: "6", T: "7", "/": "7", E: "8", B: "8", g: "9", q: "9" };

/**
 * Nomor pasal dari judul (bersih atau rusak OCR). Nomor hasil penormalan HANYA diterima bila cocok
 * dengan urutan (sebelumnya+1, atau sisipan huruf sebelumnya) — tebakan liar tidak menjadi pasal palsu.
 * `longgar` untuk peraturan perubahan, yang nomornya melompat (Pasal 9 lalu 17).
 */
export function nomorPasal(baris: string, sebelumnya: string | null, longgar: boolean): string | null {
  if (/\.\.\.|…/.test(baris)) return null;                       // penunjuk halaman berikut, bukan judul
  const prev = sebelumnya?.match(/^(\d+)([A-Z]?)$/);
  const pn = prev ? +prev[1] : 0, ph = prev?.[2] ?? "";
  const cocokUrutan = (no: string) => {
    const m = no.match(/^(\d+)([A-Z]?)$/); if (!m) return false;
    const n = +m[1], h = m[2];
    if (!prev) return n <= 2;
    if (n === pn + 1 && !h) return true;                            // 9 -> 10
    if (n === pn && h && h > ph) return true;                        // 86A -> 86B
    if (n === pn + 1 && h === "A") return true;                      // 12 -> 13A (jarang)
    return false;
  };
  const bersih = baris.match(RE_PASAL);
  if (bersih) {
    const no = bersih[1].toUpperCase();
    if (/^[IVXL]+$/.test(no)) return no;
    // "Pasal 868" setelah 86A = OCR "86B".
    if (prev && !cocokUrutan(no) && /8$/.test(no) && cocokUrutan(no.slice(0, -1) + "B")) return no.slice(0, -1) + "B";
    if (longgar || cocokUrutan(no) || !prev) return no;
    // Judul bersih boleh melompat maju (judul sebelumnya rusak OCR / pasal dihapus), tidak boleh mundur.
    const n = +no.replace(/\D/g, "");
    return n > pn && n <= pn + 15 ? no : null;
  }
  const rusak = baris.match(RE_PASAL_RUSAK);
  if (!rusak) return null;
  const mentah = rusak[1].replace(/['’.]/g, "");
  const angka = mentah.split("").map((c) => (/\d/.test(c) ? c : PETA_OCR[c] ?? "?")).join("");
  if (angka.includes("?") || !angka) return null;
  const tanpaNolDepan = String(+angka);
  if (cocokUrutan(tanpaNolDepan)) return tanpaNolDepan;
  // Judul rusak: terima lompatan kecil saja (tebakan penormalan kurang pasti).
  if (prev && /^\d+$/.test(tanpaNolDepan) && +tanpaNolDepan > pn && +tanpaNolDepan <= pn + 3) return tanpaNolDepan;
  // Huruf sisipan di ujung ("86B" terbaca "868") pada naskah perubahan.
  if (longgar && /8$/.test(tanpaNolDepan) && cocokUrutan(tanpaNolDepan.slice(0, -1) + "B")) return tanpaNolDepan.slice(0, -1) + "B";
  return null;
}
const RE_BAB = /^BAB\s+([IVXL]{1,7}|\d{1,2})\.?$/;
const RE_BAGIAN = /^(Bagian|Paragraf)\s+\S+/i;
const RE_PENJELASAN = /^PENJELASAN(\s+ATAS)?\s*$/;
const RE_LAMPIRAN = /^LAMPIRAN\b/;
const RE_MEMUTUSKAN = /^MEMUTUSKAN\s*:?$/i;

const romawi = (s: string) => /^[IVXL]+$/.test(s);

export function potongRegulasi(halamanMentah: HalamanReg[], id: IdentitasRegulasi): PotonganRegulasi[] {
  const baris = bersihkan(halamanMentah);
  const potongan: Omit<PotonganRegulasi, "urutan" | "teksEmbed" | "hash">[] = [];

  let bagianDok: "pembukaan" | "tubuh" | "penjelasan" | "lampiran" = "pembukaan";
  let bab = "", subBagian = "", paragraf = "", pasalLuar = "", lampiran = "", pasalTerakhir: string | null = null;
  // Baris judul struktur (BAB/Bagian/Paragraf + judulnya) DITAHAN lalu ditempel di awal pasal berikutnya.
  // Tanpa ini judul menempel di ekor pasal sebelumnya dan pasal pertama bab kehilangan sinyal topiknya.
  let tahan: { teks: string; hal: number }[] = [];
  let lewati = 0;    // pasalLuar: "Pasal I" pada peraturan perubahan
  let kini: { jenis: JenisPotonganRegulasi; bagian: string; pasal: string | null; baris: { teks: string; hal: number }[] } | null = null;
  const perubahan = baris.some((b) => /^pa[s5][a4][lI1i]\s+I\.?$/i.test(b.teks)) &&
    baris.some((b) => /diubah sehingga berbunyi|disisipkan .*pasal/i.test(b.teks));

  const tutup = () => { if (kini && kini.baris.length) potongan.push({ ...kini, halamanAwal: kini.baris[0].hal, halamanAkhir: kini.baris[kini.baris.length - 1].hal, teks: "" } as any); kini = null; };
  const buka = (jenis: JenisPotonganRegulasi, bagian: string, pasal: string | null) => {
    if (tahan.length && kini) { (kini as any).baris.push(...tahan); tahan = []; }   // judul tanpa pasal sesudahnya tetap tercakup
    tutup(); kini = { jenis, bagian, pasal, baris: [] };
  };
  const bukaPasal = (jenis: JenisPotonganRegulasi, bagian: string, pasal: string | null) => {
    const judul = tahan; tahan = [];
    tutup(); kini = { jenis, bagian, pasal, baris: judul };
  };
  const judulDi = (j: number) => {
    const x = baris[j]?.teks;
    return x && x.length < 120 && !RE_PASAL.test(x) && !RE_BAB.test(x) && !RE_BAGIAN.test(x) && !/^\(?\d/.test(x) && !/[.;:]$/.test(x) ? x : null;
  };
  // "BAB II RENCANA PEMBUKAAN" -> "BAB II Rencana Pembukaan"; romawi & kata sambung dijaga.
  const rapikan = (x: string) => (/^[A-Z0-9 ,.&/()'-]+$/.test(x)
    ? x.replace(/\b[\w']+/g, (w, i) => (/^(BAB|[IVXL]+|[A-H])$/.test(w) ? w : i > 0 && /^(DAN|ATAU|YANG|DI|KE|DARI|PADA|SERTA|TENTANG|DALAM)$/.test(w) ? w.toLowerCase() : w[0] + w.slice(1).toLowerCase()))
    : x);

  buka("pembukaan", "Pembukaan (Menimbang & Mengingat)", null);

  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    const t = b.teks;
    if (lewati > 0) { lewati--; tahan.push(b); continue; }

    if (bagianDok === "pembukaan" && RE_MEMUTUSKAN.test(t)) { kini!.baris.push(b); bagianDok = "tubuh"; continue; }
    if (bagianDok !== "lampiran" && RE_PENJELASAN.test(t)) { bagianDok = "penjelasan"; bab = ""; subBagian = ""; pasalLuar = ""; pasalTerakhir = null; buka("penjelasan", "Penjelasan › Umum", null); kini!.baris.push(b); continue; }
    if (RE_LAMPIRAN.test(t) && bagianDok !== "pembukaan" && (i === 0 || baris[i - 1].hal !== b.hal || /^LAMPIRAN\s*(I|\d)?\s*$/.test(t))) {
      // Label lampiran: nomor romawi + judul kapital sesudah baris NOMOR/TANGGAL (mis. "Lampiran III Pedoman Pelaksanaan Keselamatan…").
      const rom = t.match(/^LAMPIRAN\s+([IVXL]+|\d+)\b/)?.[1];
      let j = i + 1;
      while (j < baris.length && j < i + 8 && /^(REPUBLIK INDONESIA|NOMOR|TANGGAL|TENTANG|KEPUTUSAN|PERATURAN|MENTERI|DIREKTUR)\b|:\s*\d/.test(baris[j].teks)) j++;
      const judulL: string[] = [];
      while (j < baris.length && judulL.length < 4 && /^[A-Z0-9 ,/&()'.-]{6,}$/.test(baris[j].teks) && !/^[A-Z]\.\s|^BAB\s/.test(baris[j].teks)) judulL.push(baris[j++].teks);
      lampiran = `Lampiran${rom ? " " + rom : ""}${judulL.length ? " " + rapikan(judulL.join(" ")).slice(0, 90) : ""}`;
      bagianDok = "lampiran"; buka("lampiran", lampiran, null); kini!.baris.push(b); continue;
    }

    // Di dalam lampiran: judul bagian ("A. RUANG LINGKUP", "BAB II RENCANA PEMBUKAAN LAHAN") membuka potongan baru.
    if (bagianDok === "lampiran" && lampiran && (/^[A-H]\.\s+[A-Z][A-Z ,/&()-]{3,}$/.test(t) || /^BAB\s+[IVXL]+\b/.test(t)) && kini!.baris.length >= 3) {
      buka("lampiran", `${lampiran} › ${rapikan(t.replace(/\s+berisikan.*$/i, "")).slice(0, 80)}`, null); kini!.baris.push(b); continue;
    }

    // Keputusan (Kepmen/Kepdirjen) tidak berpasal: diktum KESATU, KEDUA, … adalah satuannya.
    const mDiktum = bagianDok === "tubuh" ? t.match(/^(KESATU|KEDUA|KETIGA|KEEMPAT|KELIMA|KEENAM|KETUJUH|KEDELAPAN|KESEMBILAN|KESEPULUH|KESEBELAS|KEDUA BELAS)\s*:/) : null;
    if (mDiktum) { buka("pasal", `Diktum ${mDiktum[1]}`, mDiktum[1]); kini!.baris.push(b); continue; }

    if (bagianDok === "tubuh" || bagianDok === "penjelasan") {
      const mBab = t.match(RE_BAB);
      if (mBab && bagianDok === "tubuh") {
        // Judul BAB = baris berikutnya (bisa 2 baris kapital).
        const j1 = judulDi(i + 1), j2 = j1 && /^[A-Z ,&/-]+$/.test(j1) && baris[i + 2] && /^[A-Z ,&/-]{3,}$/.test(baris[i + 2].teks) ? baris[i + 2].teks : null;
        bab = `BAB ${mBab[1]}${j1 ? " " + rapikan([j1, j2].filter(Boolean).join(" ")) : ""}`;
        subBagian = ""; paragraf = "";
        tahan.push(b); lewati = j1 ? (j2 ? 2 : 1) : 0;
        continue;
      }
      const mBag = bagianDok === "tubuh" && t.length < 40 ? t.match(RE_BAGIAN) : null;
      if (mBag) {
        const judul = judulDi(i + 1);
        const nama = `${t}${judul ? " " + rapikan(judul) : ""}`;
        if (/^paragraf/i.test(t)) paragraf = nama; else { subBagian = nama; paragraf = ""; }
        tahan.push(b); lewati = judul ? 1 : 0;
        continue;
      }

      // Penjelasan tanpa judul terbaca (OCR): penomoran kembali ke "Pasal 1" setelah batang tubuh berjalan.
      if (bagianDok === "tubuh" && !perubahan && /^pa[s5][a4][lI1i!]\s+1\s*\.?$/i.test(t) && pasalTerakhir && +pasalTerakhir.replace(/\D/g, "") >= 5) {
        bagianDok = "penjelasan"; bab = ""; subBagian = ""; pasalTerakhir = null;
      }
      const no = nomorPasal(t, pasalTerakhir, perubahan || bagianDok === "penjelasan");
      if (no) {
        if (!(perubahan && romawi(no))) pasalTerakhir = no;
        if (perubahan && romawi(no)) {
          pasalLuar = `Pasal ${no}`;
          bukaPasal(bagianDok === "penjelasan" ? "penjelasan" : "pasal", `${bagianDok === "penjelasan" ? "Penjelasan › " : ""}${pasalLuar}`, no);
        } else {
          const jalur = bagianDok === "penjelasan"
            ? `Penjelasan › ${pasalLuar ? pasalLuar + " › " : ""}Pasal ${no}`
            : [pasalLuar, bab, subBagian, paragraf].filter(Boolean).join(" › ") + (pasalLuar || bab || subBagian || paragraf ? " › " : "") + `Pasal ${no}`;
          bukaPasal(bagianDok === "penjelasan" ? "penjelasan" : "pasal", jalur, no);
        }
      }
    }
    kini!.baris.push(b);
  }
  if (tahan.length && kini) (kini as any).baris.push(...tahan);
  tutup();

  // Susun teks; pasal panjang dipecah di batas ayat (lalu kalimat) tanpa kehilangan teks.
  const final: PotonganRegulasi[] = [];
  const semuaBaris = potongan.reduce((n, p: any) => n + p.baris.length, 0);
  if (semuaBaris !== baris.length) throw new Error(`potongRegulasi kehilangan baris (${semuaBaris}/${baris.length})`);

  for (const p of potongan as any[]) {
    const teks = p.baris.map((x: any) => x.teks).join("\n");
    // Penjelasan "Cukup jelas." tidak bernilai informasi.
    if (p.jenis === "penjelasan" && /^pasal\s+\S+\s*\n?\s*cukup\s*jelas\.?$/i.test(teks.replace(/\n+/g, "\n").trim())) continue;
    if (teks.replace(/\s/g, "").length < 20) continue;

    const bagianTeks = teks.length <= UKURAN.maksimum ? [teks] : pecahDiAyat(teks);
    bagianTeks.forEach((isi, k) => {
      const bagian = bagianTeks.length > 1 ? `${p.bagian} (bagian ${k + 1}/${bagianTeks.length})` : p.bagian;
      final.push({
        urutan: final.length + 1, jenis: p.jenis, bagian, pasal: p.pasal,
        halamanAwal: p.halamanAwal, halamanAkhir: p.halamanAkhir, teks: isi,
        // Awalan identitas dibuat pendek: judul peraturan panjang di SETIAP potongan membuat semua pasal
        // satu peraturan tampak mirip secara makna (uji soal emas). Judul tetap dicari lewat kata kunci (bagian/label).
        teksEmbed: `${id.label} · ${bagian}\n${isi}`,
        hash: hashTeks(isi),
      });
    });
  }
  return final;
}

/** Pecah di awal ayat "(n)" bila bisa; sisa yang masih panjang dipecah per kalimat (lossless). */
function pecahDiAyat(teks: string): string[] {
  const ayat = teks.split(/\n(?=\(\d{1,2}[a-z]?\)\s)/);
  const out: string[] = [];
  let buf = "";
  for (const a of ayat) {
    if (buf && (buf + "\n" + a).length > UKURAN.sasaran) { out.push(buf); buf = a; }
    else buf = buf ? buf + "\n" + a : a;
  }
  if (buf) out.push(buf);
  const hasil = out.flatMap((x) => (x.length > UKURAN.maksimum ? pecahKalimat(x) : [x]));
  const rapat = (x: string) => x.replace(/\s+/g, "");
  if (rapat(hasil.join("")) !== rapat(teks)) throw new Error("pecahDiAyat kehilangan teks");
  return hasil;
}
