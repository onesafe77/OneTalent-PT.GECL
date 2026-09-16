// Pembaca & pemotong dokumen PPO (Prosedur Pengendalian Operasional) untuk koleksi pengetahuan AI.
//
// Semua fungsi di sini MURNI (tanpa database, tanpa jaringan) supaya hasil pemotongan bisa
// diperiksa manusia sebelum satu pun potongan di-embed. Ekstraksi PDF ada di ekstrakHalaman().
//
// Temuan dari 90 PPO berlaku (Sep 2026) yang membentuk aturan di bawah:
//  - Kepala/kaki halaman berulang di tiap halaman dan TIDAK seragam antar-templat: ±78 dokumen
//    memakai kaki "Dokumen tidak terkendali tanpa stempel…", sisanya "GECL – HSE - PPO … Page # of #".
//    Karena itu kepala/kaki dikenali dari PENGULANGAN di dalam dokumen yang sama, bukan dari pola tetap.
//  - Halaman sampul, lembar pengesahan & daftar isi bukan isi prosedur.
//  - Catatan revisi berguna ("apa yang berubah di R10?") tapi kolom tabelnya teracak → jenis tersendiri.
//  - Diagram alir menghasilkan potongan kata teracak → ditandai & TIDAK di-embed secara bawaan.
//  - Butir daftar bersambung lintas halaman → dipotong per BAGIAN, bukan per halaman.
//  - Salah ketik di dokumen asli ("DEFISINI" di 72 dokumen) dikenali sebagai judul yang sama.

export type JenisPotongan = "isi" | "definisi" | "riwayat_revisi" | "referensi" | "diagram";

export interface Halaman { no: number; baris: string[] }

export interface Potongan {
  urutan: number;
  jenis: JenisPotongan;
  bagian: string;          // jalur judul, mis. "4 PROSEDUR › 4.1.4 Melakukan penilaian…"
  halamanAwal: number;
  halamanAkhir: number;
  teks: string;            // isi bersih yang ditampilkan sebagai kutipan
  teksEmbed: string;       // teks yang di-embed: identitas dokumen + jalur bagian + konteks + isi
  hash: string;            // sidik isi (untuk mendeteksi perubahan & duplikat)
  peringatan: string[];
}

export interface IdentitasDokumen { kode: string; judul: string; revisi: number; departemen?: string }

// ---------------------------------------------------------------- ekstraksi PDF

/** Susun teks tiap halaman menjadi baris berdasarkan koordinat Y (pdfjs memberi potongan acak). */
export async function ekstrakHalaman(pdfBytes: Uint8Array): Promise<Halaman[]> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: pdfBytes, verbosity: 0 }).promise;
  const hasil: Halaman[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const isi = await (await pdf.getPage(i)).getTextContent();
    const perY = new Map<number, { x: number; s: string }[]>();
    for (const it of isi.items as any[]) {
      if (!it.str?.trim()) continue;
      // Toleransi 2pt: potongan satu baris kadang berbeda Y sepersekian titik.
      const y = Math.round(it.transform[5] / 2) * 2;
      perY.set(y, (perY.get(y) || []).concat({ x: it.transform[4], s: it.str }));
    }
    const baris = Array.from(perY.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, xs]) => xs.sort((a, b) => a.x - b.x).map((o) => o.s).join(" ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    hasil.push({ no: i, baris });
  }
  return hasil;
}

// ---------------------------------------------------------------- pembersihan

const normalAngka = (s: string) => s.replace(/\d+/g, "#").toLowerCase();

/** Pola kaki/kepala yang dikenal — jaring pengaman untuk dokumen pendek (pengulangan sulit dideteksi). */
const POLA_BOILERPLATE = [
  /dokumen tidak terkendali tanpa stempel/i,
  /^nama dokumen\b/i,
  /^disetujui oleh\b.*tanggal review/i,
  /^no\.? registrasi dokumen/i,
  /^mulai berlaku\b/i,
  /\bpage \d+ of \d+\s*$/i,
  /\bhalaman \d+ dari \d+\s*$/i,
];

/**
 * Buang kepala/kaki halaman. Sebuah baris dianggap kepala/kaki bila (setelah angka dinormalkan)
 * muncul di ≥50% halaman dokumen ini DAN selalu di 4 baris teratas atau 6 baris terbawah.
 * Syarat posisi mencegah isi prosedur yang kebetulan berulang (mis. "Formulir") ikut terbuang.
 */
export function buangKepalaKaki(halaman: Halaman[]): { halaman: Halaman[]; dibuang: string[] } {
  const n = halaman.length;
  const diTepi = (i: number, total: number) => i < 4 || i >= total - 6;
  const tepi = new Map<string, number>();
  for (const h of halaman) {
    const dilihat = new Set<string>();
    h.baris.forEach((b, i) => {
      const k = normalAngka(b);
      if (diTepi(i, h.baris.length) && !dilihat.has(k)) { dilihat.add(k); tepi.set(k, (tepi.get(k) || 0) + 1); }
    });
  }
  const batas = Math.max(2, Math.ceil(n * 0.5));
  const berulang = new Set(Array.from(tepi.entries()).filter(([, c]) => c >= batas).map(([k]) => k));
  const dibuang = new Set<string>();
  // Hanya kemunculan DI TEPI yang dihapus: judul dokumen yang juga muncul di tengah sebuah
  // halaman (mis. di tabel revisi) tetap utuh di sana, dan tidak membatalkan penghapusan di tepi.
  const bersih = halaman.map((h) => ({
    no: h.no,
    baris: h.baris.filter((b, i) => {
      const buang = (n >= 3 && diTepi(i, h.baris.length) && berulang.has(normalAngka(b))) || POLA_BOILERPLATE.some((p) => p.test(b));
      if (buang) dibuang.add(b.replace(/\d+/g, "#"));
      return !buang;
    }),
  }));
  return { halaman: bersih, dibuang: Array.from(dibuang) };
}

// ---------------------------------------------------------------- struktur bagian

const JUDUL_UTAMA: [RegExp, string, JenisPotongan][] = [
  [/^TUJUAN$/, "TUJUAN", "isi"],
  [/^RUANG LINGKUP$/, "RUANG LINGKUP", "isi"],
  [/^DEF(INISI|ISINI)( DAN ISTILAH)?$/, "DEFINISI DAN ISTILAH", "definisi"],   // termasuk salah ketik "DEFISINI" (68 dokumen)
  [/^AKUNTABILITAS$/, "AKUNTABILITAS", "isi"],
  [/^(PROSEDUR|URAIAN( STANDAR)?)$/, "PROSEDUR", "isi"],
  [/^DIAGRAM ALIR( PROSES)?$/, "DIAGRAM ALIR", "diagram"],
  [/^REFERENSI( DAN DOKUMEN TERKAIT)?$/, "REFERENSI", "referensi"],
  [/^DISTRIBUSI DOKUMEN$/, "DISTRIBUSI DOKUMEN", "referensi"],
  [/^(FORMULIR DAN )?LAMPIRAN$/, "LAMPIRAN", "referensi"],
];

const RE_JUDUL_UTAMA = /^(\d{1,2})\.?\s+([A-Z][A-Z &/,()-]{3,})$/;
const RE_SUBJUDUL = /^(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+([A-Z][^.]{2,85})$/;
const RE_BUTIR = /^(?:[a-z]\.|[a-z]\)|\d{1,2}\.|\d{1,2}\)|\(\w\)|[•▪●◦○\-–])\s+/;
const titikTitik = (b: string) => /\.{6,}\s*\d*\s*$/.test(b);

interface Bagian { jenis: JenisPotongan; jalur: string[]; baris: { teks: string; hal: number }[] }

const normalJudul = (s: string) =>
  s.replace(/\.{3,}.*$/, "").replace(/\s+\d{1,3}\s*$/, "").replace(/^\d{1,2}(?:\.\d{1,2}){0,3}\.?\s+/, "")
    .replace(/\s+/g, " ").trim().toLowerCase();

const judulUtamaDikenal = (b: string) => {
  const m = b.match(RE_JUDUL_UTAMA);
  const k = m && JUDUL_UTAMA.find(([re]) => re.test(m[2].trim()));
  return m && k ? { no: m[1], label: k[1], jenis: k[2] } : null;
};

/**
 * Pisahkan halaman pembuka (sampul, catatan revisi, pengesahan, daftar isi) dari isi, dan ambil
 * DAFTAR ISI sebagai daftar judul resmi dokumen.
 *
 * Isi dimulai pada kemunculan TERAKHIR judul "TUJUAN": bila ada daftar isi, "1 TUJUAN" muncul dua
 * kali (di daftar isi & di isi) — dan tidak semua daftar isi memakai titik-titik penunjuk halaman.
 */
export function pisahkanPembuka(halaman: Halaman[]): { riwayat: Halaman[]; isi: Halaman[]; daftarIsi: Set<string> } {
  let mulai = -1;
  halaman.forEach((h, i) => { if (h.baris.some((b) => judulUtamaDikenal(b)?.label === "TUJUAN")) mulai = i; });
  // Bila TUJUAN hanya muncul sekali di halaman yang juga memuat DAFTAR ISI, isi dimulai setelah baris itu.
  const batas = mulai < 0 ? 0 : mulai;
  const pembuka = halaman.slice(0, batas + 1);
  const daftarIsi = new Set<string>();
  let dalamDaftar = false;
  for (const h of pembuka) for (const b of h.baris) {
    if (/^DAFTAR ISI$/i.test(b)) { dalamDaftar = true; continue; }
    if (dalamDaftar) { const j = normalJudul(b); if (j.length >= 3 && j.length <= 90) daftarIsi.add(j); }
  }
  // Halaman awal isi bisa sekaligus memuat ekor daftar isi: potong mulai dari baris TUJUAN terakhir.
  const isi = halaman.slice(batas).map((h, i) => {
    if (i > 0) return h;
    let idx = -1; h.baris.forEach((b, k) => { if (judulUtamaDikenal(b)?.label === "TUJUAN") idx = k; });
    return { no: h.no, baris: h.baris.slice(Math.max(0, idx)) };
  });
  return {
    riwayat: halaman.slice(0, batas).filter((h) => h.baris.some((b) => /CATATAN REVISI|RIWAYAT REVISI/i.test(b))),
    isi,
    daftarIsi,
  };
}

/**
 * Susun bagian. Judul SUBBAGIAN hanya diakui bila tercantum di daftar isi dokumen itu sendiri.
 * Alasannya: di PPO, baris bernomor seperti "4.5.1 Tidak mengemudikan alat…" adalah LANGKAH
 * prosedur, bukan judul — memperlakukannya sebagai judul memindahkan instruksinya ke label
 * bagian dan isi potongan tinggal sambungan kalimat ("yang berlaku.").
 */
export function susunBagian(isi: Halaman[], daftarIsi: Set<string> = new Set()): Bagian[] {
  const bagian: Bagian[] = [];
  let kini: Bagian = { jenis: "isi", jalur: ["(pendahuluan)"], baris: [] };
  let utama = "(pendahuluan)";
  let jenisUtama: JenisPotongan = "isi";
  const tutup = () => { if (kini.baris.length) bagian.push(kini); };

  for (const h of isi) {
    for (const b of h.baris) {
      if (titikTitik(b) || /^DAFTAR ISI$/i.test(b)) continue;
      const ju = judulUtamaDikenal(b);
      if (ju) {
        tutup();
        utama = `${ju.no} ${ju.label}`; jenisUtama = ju.jenis;
        kini = { jenis: jenisUtama, jalur: [utama], baris: [{ teks: b, hal: h.no }] };
        continue;
      }
      // Subbagian diagram di dalam PROSEDUR (mis. "3.15 Diagram Alur Pengendalian Unit Rebah"):
      // teks kotak-kotak diagramnya teracak, jadi ditandai diagram walau tak tercantum di daftar isi.
      if (/^\d{1,2}(?:\.\d{1,2}){1,3}\.?\s+Diagram\s+Al[ui]r\b/i.test(b)) {
        tutup();
        kini = { jenis: "diagram", jalur: [utama, b.trim().slice(0, 80)], baris: [{ teks: b, hal: h.no }] };
        continue;
      }
      const nj = normalJudul(b);
      const judulResmi = (jenisUtama === "isi" || kini.jenis === "diagram") && daftarIsi.has(nj) && b.length <= 95 && !/[.;]$/.test(b);
      if (judulResmi) {
        tutup();
        // Teks judul TETAP ditulis sebagai baris pertama isi: di sebagian PPO daftar isinya
        // memuat langkah prosedur ("4.5.6. Tidak sedang mengkonsumsi obat…"), sehingga yang
        // dikira judul sebenarnya instruksi. Menyimpannya di isi menjamin tidak ada teks hilang.
        kini = { jenis: jenisUtama, jalur: [utama, b.trim().slice(0, 80)], baris: [{ teks: b, hal: h.no }] };
        continue;
      }
      kini.baris.push({ teks: b, hal: h.no });
    }
  }
  tutup();
  return bagian;
}

// ---------------------------------------------------------------- penyambungan & pemotongan

/** Sambung baris yang terbungkus menjadi paragraf/butir utuh; butir daftar tetap di baris sendiri. */
export function sambungBaris(baris: { teks: string; hal: number }[]): { teks: string; hal: number; halAkhir: number }[] {
  const out: { teks: string; hal: number; halAkhir: number }[] = [];
  for (const { teks, hal } of baris) {
    const akhir = out[out.length - 1];
    const butirBaru = RE_BUTIR.test(teks);
    const sebelumnyaSelesai = !akhir || /[.:;!?]$/.test(akhir.teks);
    const lanjutanKalimat = /^[a-z(,]/.test(teks);
    if (akhir && !butirBaru && (!sebelumnyaSelesai || lanjutanKalimat)) {
      akhir.teks = `${akhir.teks} ${teks}`; akhir.halAkhir = hal;
    } else {
      out.push({ teks, hal, halAkhir: hal });
    }
  }
  return out;
}

export const UKURAN = { sasaran: 1100, maksimum: 1600, minimum: 120 };

/** Hash FNV-1a 32-bit — cukup untuk mendeteksi perubahan isi & duplikat, bukan untuk keamanan. */
export function hashTeks(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Pecah satu unit yang terlalu panjang. Memotong berdasarkan POSISI, bukan mencocokkan pola kalimat:
 * versi lama memakai /[^.!?]+[.!?]+(\s|$)/g yang diam-diam MELEWATI teks seperti "4.6.26.9 Driver…"
 * (titik diikuti angka) — 1.764 huruf prosedur loading ROM hilang tanpa galat.
 * Urutan pilihan titik potong: akhir kalimat → awal nomor butir → spasi → paksa.
 * Dijamin: gabungan pecahan == teks asli (diperiksa; bila tidak, lempar galat).
 */
export function pecahKalimat(teks: string): string[] {
  const out: string[] = [];
  let sisa = teks;
  while (sisa.length > UKURAN.sasaran) {
    const jendela = sisa.slice(0, UKURAN.sasaran);
    const cari = (re: RegExp) => { let pos = -1; for (const m of Array.from(jendela.matchAll(re))) pos = (m.index ?? 0) + m[0].length; return pos; };
    let potong = cari(/[.!?;:]\s+(?=[A-Z0-9(])/g);                         // akhir kalimat
    if (potong < UKURAN.sasaran * 0.4) potong = Math.max(potong, cari(/\s(?=\d{1,2}(?:\.\d{1,2})+\.?\s)/g)); // sebelum nomor butir
    if (potong < UKURAN.sasaran * 0.4) potong = Math.max(potong, jendela.lastIndexOf(" ") + 1);          // spasi
    if (potong <= 0) potong = UKURAN.sasaran;                                                            // paksa
    out.push(sisa.slice(0, potong).trim());
    sisa = sisa.slice(potong);
  }
  if (sisa.trim()) out.push(sisa.trim());
  const rapat = (x: string) => x.replace(/\s+/g, "");
  if (rapat(out.join("")) !== rapat(teks)) throw new Error("pecahKalimat kehilangan teks — hentikan pemotongan");
  return out;
}

export function potongDokumen(halamanMentah: Halaman[], id: IdentitasDokumen): { potongan: Potongan[]; dibuang: string[] } {
  const { halaman, dibuang } = buangKepalaKaki(halamanMentah);
  const { riwayat, isi, daftarIsi } = pisahkanPembuka(halaman);
  const kepala = `${id.kode} R${String(id.revisi).padStart(2, "0")} — ${id.judul}`;
  const potongan: Potongan[] = [];

  const tambah = (jenis: JenisPotongan, bagianStr: string, teks: string, hA: number, hZ: number, konteks = "", peringatan: string[] = []) => {
    const bersih = teks.replace(/\s+/g, " ").trim();
    if (!bersih || /^(\d+(\.\d+)*\.?\s*)?(n\/?a|tidak ada|-|nihil)\.?$/i.test(bersih)) return;
    const p = [...peringatan];
    if (bersih.length < UKURAN.minimum) p.push("pendek");
    if (bersih.length > UKURAN.maksimum) p.push("terlalu panjang");
    const huruf = (bersih.match(/[A-Za-z]/g) || []).length / bersih.length;
    if (huruf < 0.55) p.push("sedikit huruf (tabel/diagram?)");
    if (POLA_BOILERPLATE.some((re) => re.test(bersih))) p.push("sisa kepala/kaki");
    const teksEmbed = [`Dokumen: ${kepala}`, `Bagian: ${bagianStr}`, konteks && `Konteks: ${konteks}`, "", bersih].filter((x) => x !== "").join("\n");
    potongan.push({ urutan: potongan.length, jenis, bagian: bagianStr, halamanAwal: hA, halamanAkhir: hZ, teks: bersih, teksEmbed, hash: hashTeks(bersih), peringatan: p });
  };

  // Catatan revisi: satu potongan per dokumen, ditandai bahwa kolom tabelnya bisa teracak.
  if (riwayat.length) {
    const teks = riwayat.flatMap((h) => h.baris).filter((b) => !titikTitik(b)).join(" ");
    tambah("riwayat_revisi", "CATATAN REVISI", teks, riwayat[0].no, riwayat[riwayat.length - 1].no, "", ["kolom tabel mungkin teracak"]);
  }

  for (const bg of susunBagian(isi, daftarIsi)) {
    const jalur = bg.jalur.join(" › ");
    const unit = sambungBaris(bg.baris);
    if (bg.jenis === "diagram") {
      tambah("diagram", jalur, unit.map((u) => u.teks).join(" "), unit[0].hal, unit[unit.length - 1].halAkhir, "", ["teks diagram teracak — tidak di-embed"]);
      continue;
    }
    // Kumpulkan unit hingga ukuran sasaran. Butir induk terakhir (mis. "3. Fatigue Check saat
    // operasional") dibawa sebagai konteks ke potongan berikutnya, bukan diulang sebagai isi.
    let buf: typeof unit = []; let panjang = 0; let induk = "";
    const kirim = () => {
      if (!buf.length) return;
      tambah(bg.jenis, jalur, buf.map((u) => u.teks).join("\n"), buf[0].hal, buf[buf.length - 1].halAkhir, induk);
      buf = []; panjang = 0;
    };
    for (const u of unit) {
      const potonganUnit = u.teks.length > UKURAN.maksimum ? pecahKalimat(u.teks).map((t) => ({ ...u, teks: t })) : [u];
      for (const pu of potonganUnit) {
        if (panjang + pu.teks.length > UKURAN.sasaran && buf.length) {
          const indukBaru = buf.slice().reverse().find((x) => /^\d{1,2}[.)]\s/.test(x.teks) && x.teks.length < 140);
          kirim();
          if (indukBaru) induk = indukBaru.teks;
        }
        buf.push(pu); panjang += pu.teks.length + 1;
      }
    }
    kirim();
  }
  return { potongan: gabungKecil(potongan, kepala), dibuang };
}

/**
 * Gabungkan potongan di bawah ukuran minimum ke potongan sebelumnya (jenis sama, total ≤ sasaran).
 * Contoh: "1 TUJUAN" (1 kalimat) + "2 RUANG LINGKUP" (1 kalimat) → satu potongan bermakna.
 * Potongan kecil yang tetap sendirian sesudahnya dibiarkan dengan peringatan "pendek".
 */
function gabungKecil(potongan: Potongan[], kepala: string): Potongan[] {
  const out: Potongan[] = [];
  for (const p of potongan) {
    const akhir = out[out.length - 1];
    const kecil = p.teks.length < UKURAN.minimum || (akhir && akhir.teks.length < UKURAN.minimum);
    if (akhir && kecil && akhir.jenis === p.jenis && p.jenis !== "diagram" && akhir.teks.length + p.teks.length <= UKURAN.sasaran) {
      const bagian = akhir.bagian === p.bagian || akhir.bagian.includes(" + …") ? akhir.bagian
        : akhir.bagian.includes(" + ") ? `${akhir.bagian} + …` : `${akhir.bagian} + ${p.bagian}`;
      const teks = `${akhir.teks}\n${p.teks}`;
      out[out.length - 1] = {
        ...akhir, bagian, teks, halamanAkhir: p.halamanAkhir, hash: hashTeks(teks),
        teksEmbed: [`Dokumen: ${kepala}`, `Bagian: ${bagian}`, "", teks].join("\n"),
        peringatan: teks.length < UKURAN.minimum ? ["pendek"] : akhir.peringatan.filter((w) => w !== "pendek"),
      };
    } else out.push(p);
  }
  return out.map((p, i) => ({ ...p, urutan: i }));
}
