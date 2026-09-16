// Pemuat koleksi pengetahuan AI dari dokumen OneTalent (saat ini koleksi 'ppo').
//
// Urutan yang dijaga ketat:
//   1. Ambil revisi ACTIVE (bukan versi/tanggal — 63 revisi SUPERSEDED hasil migrasi bernomor versi sama).
//   2. Ekstrak & potong (server/lib/ppo/potong.ts), buang diagram.
//   3. Buat SEMUA embedding lebih dulu.
//   4. Baru dalam SATU transaksi: hapus potongan lama dokumen itu → sisipkan yang baru.
// Bila langkah 1–3 gagal, isi lama tetap utuh — AI tetap menjawab dengan revisi terakhir yang sukses dimuat.
import { sql } from "drizzle-orm";
import { ekstrakHalaman, potongDokumen, hashTeks } from "../ppo/potong";
import { lupakanIndeks } from "./cari";

export const MODEL_EMBEDDING = "openai/text-embedding-3-small";
export const DIMENSI = 1536;

/** Dokumen yang sengaja TIDAK dimuat, beserta alasannya (ditampilkan di laporan). */
export const DIKECUALIKAN: Record<string, string> = {
  "GECL-HSE-PPO-4.1.53": "Judul di daftar induk 'Penerbitan Kartu Tanda dan Kartu Identitas' tetapi file berlaku berisi 'Stretch Break & Eye Break' — tunggu koreksi pengendali dokumen",
};

export type Embedder = (teks: string[]) => Promise<number[][]>;

/** Embedder OpenRouter; urutan hasil dicocokkan lewat index, kegagalan dilempar (tidak diam). */
export function embedderOpenRouter(kunci: string): Embedder {
  return async (teks) => {
    const hasil: number[][] = new Array(teks.length);
    for (let a = 0; a < teks.length; a += 96) {
      const kelompok = teks.slice(a, a + 96);
      for (let coba = 1; ; coba++) {
        const r = await fetch("https://openrouter.ai/api/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${kunci}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: MODEL_EMBEDDING, input: kelompok }),
        });
        const j: any = await r.json().catch(() => ({}));
        if (r.ok && j.data?.length === kelompok.length) {
          for (const e of j.data) hasil[a + e.index] = e.embedding;
          break;
        }
        if (coba >= 4) throw new Error(`Embedding gagal (${r.status}): ${JSON.stringify(j).slice(0, 200)}`);
        await new Promise((s) => setTimeout(s, 1500 * coba));
      }
    }
    for (const v of hasil) if (!Array.isArray(v) || v.length !== DIMENSI) throw new Error("Embedding tidak lengkap / dimensi salah");
    return hasil;
  };
}

export interface HasilMuat { kode: string; status: "dimuat" | "dikecualikan" | "gagal"; potongan: number; revisi?: number; alasan?: string }

/**
 * Muat ulang satu dokumen ke koleksi. `basisData` = instance Drizzle (db aplikasi atau uji).
 * Membaca PDF dari uploaded_files (base64) sesuai jalur revisi ACTIVE (file bertanda tangan diutamakan).
 */
export async function muatUlangDokumen(basisData: any, documentId: string, embed: Embedder, koleksi = "ppo"): Promise<HasilMuat> {
  const baris = (await basisData.execute(sql`
    select m.id, m.document_code, m.title, m.department, m.category, m.current_revision, v.id as version_id,
           coalesce(v.signed_file_path, v.file_path) as jalur
    from document_masterlist m join document_versions v on v.document_id = m.id
    where m.id = ${documentId} and m.lifecycle_status = 'PUBLISHED' and v.status = 'ACTIVE'`)).rows;

  if (baris.length !== 1) {
    // Tidak berlaku lagi (atau data rusak: 0 / >1 revisi ACTIVE) → keluarkan dari koleksi.
    await basisData.execute(sql`delete from pengetahuan_potongan where koleksi = ${koleksi} and document_id = ${documentId}`);
    lupakanIndeks(koleksi);
    return { kode: documentId, status: "gagal", potongan: 0, alasan: `revisi ACTIVE = ${baris.length}; potongan lama dihapus` };
  }
  const d = baris[0];
  if (DIKECUALIKAN[d.document_code]) {
    await basisData.execute(sql`delete from pengetahuan_potongan where koleksi = ${koleksi} and document_id = ${documentId}`);
    lupakanIndeks(koleksi);
    return { kode: d.document_code, status: "dikecualikan", potongan: 0, alasan: DIKECUALIKAN[d.document_code] };
  }

  const idFile = String(d.jalur || "").split("/").pop();
  const f = (await basisData.execute(sql`select data from uploaded_files where id = ${idFile}`)).rows[0];
  if (!f?.data) throw new Error(`${d.document_code}: file revisi ACTIVE tidak ditemukan (${d.jalur})`);

  const halaman = await ekstrakHalaman(new Uint8Array(Buffer.from(f.data, "base64")));
  const { potongan } = potongDokumen(halaman, { kode: d.document_code, judul: d.title, revisi: +d.current_revision, departemen: d.department });
  const dimuat = potongan.filter((p) => p.jenis !== "diagram");
  if (!dimuat.some((p) => p.jenis === "isi")) throw new Error(`${d.document_code}: tidak ada potongan isi — struktur tidak dikenali, tidak dimuat`);

  const vektor = await embed(dimuat.map((p) => p.teksEmbed));   // SEMUA embedding dulu

  await basisData.transaction(async (tx: any) => {
    await tx.execute(sql`delete from pengetahuan_potongan where koleksi = ${koleksi} and document_id = ${documentId}`);
    for (let i = 0; i < dimuat.length; i += 100) {
      const nilai = dimuat.slice(i, i + 100).map((p, k) => sql`(${koleksi}, ${d.id}, ${d.version_id}, ${d.document_code}, ${d.title}, ${+d.current_revision},
        ${d.department}, ${d.category}, ${p.jenis}, ${p.bagian}, ${p.halamanAwal}, ${p.halamanAkhir}, ${p.urutan}, ${p.teks},
        ${p.teksEmbed}, ${p.hash}, ${MODEL_EMBEDDING}, ${JSON.stringify(vektor[i + k])}::vector)`);
      await tx.execute(sql`insert into pengetahuan_potongan (koleksi, document_id, version_id, kode_dokumen, judul, revisi,
        departemen, kategori, jenis, bagian, halaman_awal, halaman_akhir, urutan, teks, teks_embed, hash_teks, model_embedding, embedding)
        values ${sql.join(nilai, sql`, `)}`);
    }
  });
  lupakanIndeks(koleksi);   // pencarian berikutnya membangun ulang indeks kata kunci dari isi terbaru
  return { kode: d.document_code, status: "dimuat", potongan: dimuat.length, revisi: +d.current_revision };
}

/** Kunci cache embedding yang sama dengan scripts/ppo/evaluasi-embedding.ts. */
export const kunciCache = (t: string) => `${MODEL_EMBEDDING}:${hashTeks(t)}:${t.length}`;
