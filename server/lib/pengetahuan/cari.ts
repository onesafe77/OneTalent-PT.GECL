// Pencarian hibrida atas pengetahuan_potongan: makna (pgvector HNSW, kosinus) + kata kunci
// (full-text 'simple'), digabung Reciprocal Rank Fusion. Dievaluasi di scripts/ppo/evaluasi-postgres.ts.
//
// Keputusan berbasis uji (30 soal, Sep 2026):
//  - makna saja: dokumen benar@5 28/30; + kata kunci: frasa@5 26→29/30; + padanan istilah: MRR 0,855→0,900.
//  - Padanan hanya memperluas KATA KUNCI; kalimat asli yang di-embed tidak diubah.
import { sql } from "drizzle-orm";

/** Istilah lapangan → istilah di dokumen. Kecil & eksplisit; setiap entri harus bisa dipertanggungjawabkan. */
export const PADANAN: Record<string, string> = {
  solar: "bahan bakar", bbm: "bahan bakar", fuel: "bahan bakar",
  dt: "dump truck", ngantuk: "kantuk fatigue kelelahan", capek: "kelelahan fatigue",
  aki: "baterai battery", harness: "harness sabuk pengaman ketinggian", apd: "alat pelindung diri",
};

const token = (s: string) => s.toLowerCase().normalize("NFKD").match(/[a-z0-9%]+(?:[.,/][0-9]+)*/g) || [];
/** Pertanyaan + padanan istilah lapangan (hanya untuk kata kunci; teks yang di-embed tidak diubah). */
export const perluasPertanyaan = (q: string) =>
  q + " " + q.toLowerCase().split(/[^a-z0-9]+/).map((k) => PADANAN[k]).filter(Boolean).join(" ");

/**
 * Indeks kata kunci BM25 di memori, per koleksi.
 * Kenapa bukan ts_rank_cd Postgres: ts_rank_cd tidak mengenal kelangkaan kata (IDF), sehingga kata
 * umum ("unit", "jalan", "dump truck") menenggelamkan kata penentu ("escort", "on duty") — di uji
 * 30 soal MRR turun 0,900 → 0,827. Koleksi kecil (±1.500 potongan / ±1,2 MB) jadi muat di memori.
 * ponytail: indeks dibangun ulang penuh saat koleksi berubah; ganti ke indeks bertahap bila koleksi >50 ribu potongan.
 */
interface IndeksBM25 { ids: string[]; tf: Map<string, number>[]; panjang: number[]; df: Map<string, number>; rata: number; dibuat: number }
const indeks = new Map<string, IndeksBM25>();
const UMUR_INDEKS_MS = 10 * 60 * 1000;

/** Panggil setelah koleksi dimuat ulang agar pencarian berikutnya memakai isi terbaru. */
export const lupakanIndeks = (koleksi?: string) => { if (koleksi) indeks.delete(koleksi); else indeks.clear(); };

async function ambilIndeks(basisData: any, koleksi: string): Promise<IndeksBM25> {
  const ada = indeks.get(koleksi);
  if (ada && Date.now() - ada.dibuat < UMUR_INDEKS_MS) return ada;
  const baris = (await basisData.execute(sql`select id, teks_embed from pengetahuan_potongan where koleksi = ${koleksi}`)).rows as any[];
  const tf: Map<string, number>[] = [], panjang: number[] = [], df = new Map<string, number>();
  for (const b of baris) {
    const t = token(b.teks_embed); const m = new Map<string, number>();
    for (const k of t) m.set(k, (m.get(k) || 0) + 1);
    for (const k of Array.from(m.keys())) df.set(k, (df.get(k) || 0) + 1);
    tf.push(m); panjang.push(t.length);
  }
  const baru = { ids: baris.map((b) => b.id), tf, panjang, df, rata: panjang.reduce((a, x) => a + x, 0) / Math.max(1, panjang.length), dibuat: Date.now() };
  indeks.set(koleksi, baru);
  return baru;
}

function bm25(ix: IndeksBM25, q: string, batas: number): string[] {
  const kata = Array.from(new Set(token(q)));
  const skor: [number, number][] = [];
  for (let i = 0; i < ix.ids.length; i++) {
    let s = 0;
    for (const k of kata) {
      const f = ix.tf[i].get(k); if (!f) continue;
      const n = ix.df.get(k)!;
      s += Math.log(1 + (ix.ids.length - n + 0.5) / (n + 0.5)) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * ix.panjang[i] / ix.rata));
    }
    if (s > 0) skor.push([s, i]);
  }
  return skor.sort((a, b) => b[0] - a[0]).slice(0, batas).map(([, i]) => ix.ids[i]);
}
export interface HasilCari {
  id: string; kodeDokumen: string; judul: string; revisi: number; bagian: string; jenis: string;
  halamanAwal: number; halamanAkhir: number; teks: string; skor: number; peringkatMakna: number | null; peringkatKata: number | null;
}

export async function cariDokumen(basisData: any, pertanyaan: string, vektorPertanyaan: number[],
  opsi: { koleksi?: string; k?: number; kandidat?: number } = {}): Promise<HasilCari[]> {
  const koleksi = opsi.koleksi ?? "ppo", k = opsi.k ?? 5, kandidat = opsi.kandidat ?? 40;
  const v = JSON.stringify(vektorPertanyaan);

  // Koleksi kecil: planner memilih scan penuh (±11 ms di server); HNSW terpakai otomatis saat tabel membesar.
  const makna = (await basisData.execute(sql`select id from pengetahuan_potongan where koleksi = ${koleksi}
      order by embedding <=> ${v}::vector limit ${kandidat}`)).rows as { id: string }[];
  const kunci = bm25(await ambilIndeks(basisData, koleksi), perluasPertanyaan(pertanyaan), kandidat).map((id) => ({ id }));

  const skor = new Map<string, { s: number; m: number | null; w: number | null }>();
  makna.forEach((r: any, i: number) => skor.set(r.id, { s: 1 / (60 + i + 1), m: i + 1, w: null }));
  kunci.forEach((r: any, i: number) => { const x = skor.get(r.id) || { s: 0, m: null, w: null }; x.s += 1 / (60 + i + 1); x.w = i + 1; skor.set(r.id, x); });
  const teratas = Array.from(skor.entries()).sort((a, b) => b[1].s - a[1].s).slice(0, k);
  if (!teratas.length) return [];

  const ids = teratas.map(([id]) => id);
  const baris = (await basisData.execute(sql`select id, kode_dokumen, judul, revisi, bagian, jenis, halaman_awal, halaman_akhir, teks
    from pengetahuan_potongan where id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)).rows as any[];
  const perId = new Map(baris.map((b) => [b.id, b]));
  return teratas.map(([id, x]) => {
    const b = perId.get(id);
    return { id, kodeDokumen: b.kode_dokumen, judul: b.judul, revisi: b.revisi, bagian: b.bagian, jenis: b.jenis,
      halamanAwal: b.halaman_awal, halamanAkhir: b.halaman_akhir, teks: b.teks, skor: +x.s.toFixed(5), peringkatMakna: x.m, peringkatKata: x.w };
  });
}
