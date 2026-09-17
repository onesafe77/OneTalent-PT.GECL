// Pencarian peraturan (koleksi "regulasi"), TANPA reranker:
//  1. Rujukan eksplisit ("pasal 9 PP 96/2021") → ambil pasal langsung, bukan pencarian kemiripan.
//  2. Pertanyaan bebas → hibrida makna + BM25 + padanan (cariDokumen, sama dengan PPO).
//  3. Gerbang status dari tabel regulasi: dicabut diturunkan jauh, diubah sedikit; pengganti disebut.
//  4. Tie-break hierarki UU > PP > Perpres > Permen > Kepmen > Kepdirjen.
import { sql } from "drizzle-orm";
import { cariDokumen } from "../pengetahuan/cari";
import { KOLEKSI_REGULASI } from "./muat";

export interface HasilRegulasi {
  id: string; regulasiId: string; label: string; judul: string; jenis: string; bidang: string;
  status: string; diubahOleh: string | null; dicabutOleh: string | null;
  bagian: string; jenisPotongan: string; halamanAwal: number; halamanAkhir: number; teks: string; skor: number; langsung: boolean;
}

// Kunci jenis WAJIB ikut: "Perpres 60/2024" tidak boleh terbaca "UU 60/2024" (pelajaran JagaHukum).
const POLA_JENIS: [RegExp, string][] = [
  [/\b(uu|undang[- ]undang)\b/i, "UU"], [/\bperppu\b/i, "Perppu"], [/\b(pp|peraturan pemerintah)\b/i, "PP"],
  [/\b(perpres|peraturan presiden)\b/i, "Perpres"], [/\b(keppres|keputusan presiden)\b/i, "Keppres"],
  [/\b(permen\s*esdm|peraturan menteri (energi|esdm))\b/i, "Permen ESDM"], [/\b(kepmen\s*esdm|keputusan menteri (energi|esdm))\b/i, "Kepmen ESDM"],
  [/\b(kepdirjen|keputusan direktur jenderal)\b/i, "Kepdirjen Minerba"],
  [/\b(permenaker|peraturan menteri (tenaga kerja|ketenagakerjaan))\b/i, "Permenaker"], [/\bkepmenaker\b/i, "Kepmenaker"],
  [/\b(permen\s*lhk|peraturan menteri lingkungan)\b/i, "Permen LHK"], [/\b(kepmen\s*lhk|keputusan menteri lingkungan)\b/i, "Kepmen LHK"],
  [/\bpermenkes\b/i, "Permenkes"], [/\bkepmen\b/i, "Kepmen ESDM"], [/\bpermen\b/i, "Permen ESDM"],
];
const PERINGKAT_HIERARKI: Record<string, number> = { UU: 0, Perppu: 0, PP: 1, Perpres: 2, Keppres: 2, "Permen ESDM": 3, Permenaker: 3, "Permen LHK": 3, Permenkes: 3, "Kepmen ESDM": 4, Kepmenaker: 4, "Kepmen LHK": 4, "Kepdirjen Minerba": 5 };

export interface Rujukan { jenis: string | null; nomor: string | null; tahun: number | null; pasal: string | null }

/** Urai rujukan eksplisit dari pertanyaan. Hanya dianggap rujukan bila jenis ATAU nomor+tahun jelas. */
export function uraiRujukan(q: string): Rujukan {
  const jenis = POLA_JENIS.find(([re]) => re.test(q))?.[1] ?? null;
  const mPasal = q.match(/\bpasal\s+(\d{1,3}[a-z]?)\b/i);
  // "96/2021", "96 tahun 2021", "nomor 1827 K/30/MEM/2018", "1827K/2018", "185.K/37.04/DJB/2019"
  const mNo = q.match(/\b(?:no(?:mor)?\.?\s*)?(\d{1,4}(?:\s*\.?\s*K)?(?:\/[0-9A-Z.]+)*?)\s*(?:\/|\s+tahun\s+)((?:19|20)\d{2})\b/i);
  return {
    jenis,
    nomor: mNo ? mNo[1].replace(/\s+/g, " ").trim() : null,
    tahun: mNo ? +mNo[2] : null,
    pasal: mPasal ? mPasal[1].toUpperCase() : null,
  };
}

/**
 * Istilah lapangan → bahasa peraturan (hanya memperluas KATA KUNCI; vektor pertanyaan tidak diubah).
 * Setiap entri harus bisa dipertanggungjawabkan dari teks peraturan yang ada.
 */
const PADANAN_HUKUM: [RegExp, string][] = [
  [/limbah cair/i, "air limbah"], [/standar|ambang batas/i, "baku mutu"],
  [/buang limbah|membuang limbah|buang sampah/i, "dumping pembuangan"],
  [/denda|sanksi|hukuman/i, "pidana"], [/apd/i, "alat perlindungan diri"],
  [/kolam bekas|void|galian bekas|bekas galian/i, "lubang bekas tambang"],
  [/ktt/i, "kepala teknik tambang"], [/rkab/i, "rencana kerja dan anggaran biaya"],
  [/k3/i, "keselamatan dan kesehatan kerja"], [/smk3/i, "sistem manajemen keselamatan dan kesehatan kerja"],
  [/b3/i, "bahan berbahaya dan beracun"], [/amdal/i, "analisis mengenai dampak lingkungan"],
  [/pekerja|karyawan|buruh/i, "tenaga kerja"], [/perusahaan/i, "pengusaha pengurus"],
  [/pasca ?tambang/i, "pascatambang"], [/dana jaminan/i, "jaminan reklamasi"],
];
export const padananHukum = (q: string) => PADANAN_HUKUM.filter(([re]) => re.test(q)).map(([, t]) => t).join(" ");

const faktorStatus = (s: string) => (s === "dicabut" ? 0.3 : s === "diubah" ? 0.85 : 1);

async function lengkapi(basisData: any, ids: string[]): Promise<Map<string, any>> {
  if (!ids.length) return new Map();
  const rows = (await basisData.execute(sql`
    select p.id, p.document_id, p.kode_dokumen, p.judul, p.bagian, p.jenis as jenis_potongan, p.halaman_awal, p.halaman_akhir, p.teks,
           r.jenis, r.bidang, r.status, r.diubah_oleh, r.dicabut_oleh
    from pengetahuan_potongan p join regulasi r on r.id = p.document_id
    where p.koleksi = ${KOLEKSI_REGULASI} and p.id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)).rows as any[];
  return new Map(rows.map((x) => [x.id, x]));
}

const bentuk = (x: any, skor: number, langsung: boolean): HasilRegulasi => ({
  id: x.id, regulasiId: x.document_id, label: x.kode_dokumen, judul: x.judul, jenis: x.jenis, bidang: x.bidang,
  status: x.status, diubahOleh: x.diubah_oleh, dicabutOleh: x.dicabut_oleh, bagian: x.bagian, jenisPotongan: x.jenis_potongan,
  halamanAwal: x.halaman_awal, halamanAkhir: x.halaman_akhir, teks: x.teks, skor: +skor.toFixed(5), langsung,
});

export async function cariRegulasi(basisData: any, pertanyaan: string, vektor: number[], opsi: { k?: number; bidang?: string } = {}): Promise<HasilRegulasi[]> {
  const k = opsi.k ?? 8;
  const hasil: HasilRegulasi[] = [];
  const sudah = new Set<string>();

  // 1. Rujukan eksplisit → pasal diambil langsung (dan penjelasannya).
  const r = uraiRujukan(pertanyaan);
  if (r.nomor && r.tahun) {
    const nomorAwal = r.nomor.split(/[\s/.]/)[0];
    const reg = (await basisData.execute(sql`
      select id from regulasi where status_muat = 'terbit' and tahun = ${r.tahun}
        and (nomor = ${r.nomor} or nomor like ${nomorAwal + "%"})
        ${r.jenis ? sql`and jenis = ${r.jenis}` : sql``}
      limit 3`)).rows as any[];
    if (reg.length) {
      const pola = r.pasal ? `%Pasal ${r.pasal}` : null;
      const pot = (await basisData.execute(sql`
        select id from pengetahuan_potongan
        where koleksi = ${KOLEKSI_REGULASI} and document_id in (${sql.join(reg.map((x) => sql`${x.id}`), sql`, `)})
          ${pola ? sql`and (bagian like ${pola} or bagian like ${pola + " (bagian%"})` : sql`and jenis = 'pasal'`}
        order by case jenis when 'pasal' then 0 when 'penjelasan' then 1 else 2 end, urutan
        limit ${pola ? 6 : 4}`)).rows as any[];
      const detail = await lengkapi(basisData, pot.map((x) => x.id));
      pot.forEach((x, i) => { const d = detail.get(x.id); if (d) { hasil.push(bentuk(d, 1 - i * 0.01, true)); sudah.add(x.id); } });
    }
  }

  // 2. Hibrida, lalu gerbang status + hierarki. Kandidat berlebih agar gerbang punya ruang memilih.
  // Kandidat lebar: satu peraturan panjang (mis. PP reklamasi 74 potongan) bisa memenuhi seluruh 30 teratas,
  // sehingga penurunan status tidak punya pesaing untuk dinaikkan (terbukti di uji gerbang status).
  const kandidat = await cariDokumen(basisData, pertanyaan + " " + padananHukum(pertanyaan), vektor, { koleksi: KOLEKSI_REGULASI, k: 100, kandidat: 150 });
  const detail = await lengkapi(basisData, kandidat.map((c) => c.id).filter((id) => !sudah.has(id)));
  const dinilai = kandidat
    .filter((c) => detail.has(c.id))
    .map((c) => {
      const d = detail.get(c.id);
      if (opsi.bidang && d.bidang !== opsi.bidang) return null;
      const hierarki = 1 - (PERINGKAT_HIERARKI[d.jenis] ?? 6) * 0.004;   // hanya pemecah seri
      // Pasal pokok didahulukan: konsiderans jarang menjawab; penjelasan (terutama "Umum") sering menyalip pasalnya (uji soal emas).
      const penjelasan = d.jenis_potongan === "pembukaan" ? 0.6 : d.jenis_potongan === "penjelasan" ? (/› Umum/.test(d.bagian) ? 0.7 : 0.85) : 1;
      return { d, s: c.skor * faktorStatus(d.status) * hierarki * penjelasan };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.s - a.s) as { d: any; s: number }[];

  // Keragaman LUNAK: putaran pertama maks 4 potongan per peraturan, sisa slot diisi urutan skor apa adanya.
  // Batas keras terbukti membuang jawaban benar saat hanya satu peraturan yang relevan (uji: Pasal 22 UU 32/2009 amdal).
  const perDok = new Map<string, number>();
  const tertunda: { d: any; s: number }[] = [];
  for (const x of dinilai) {
    if (hasil.length >= k) break;
    const n = perDok.get(x.d.document_id) || 0;
    if (n >= 4) { tertunda.push(x); continue; }
    perDok.set(x.d.document_id, n + 1);
    hasil.push(bentuk(x.d, x.s, false));
  }
  for (const x of tertunda) { if (hasil.length >= k) break; hasil.push(bentuk(x.d, x.s, false)); }
  hasil.sort((a, b) => Number(b.langsung) - Number(a.langsung) || b.skor - a.skor);
  return hasil.slice(0, Math.max(k, hasil.filter((h) => h.langsung).length));
}
