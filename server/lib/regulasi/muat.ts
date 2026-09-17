// Siklus hidup peraturan unggahan: pratinjau (tanpa simpan) → draf (berkas + metadata) → terbit (potong + embedding).
// Potongan masuk pengetahuan_potongan koleksi "regulasi"; status berlaku dibaca dari tabel regulasi saat mencari.
import { sql } from "drizzle-orm";
import { ekstrakHalamanReg, nilaiMutu, potongRegulasi, type PotonganRegulasi } from "./potong";
import { deteksiMeta, type MetaTerdeteksi } from "./meta";
import { MODEL_EMBEDDING, type Embedder } from "../pengetahuan/muat";
import { lupakanIndeks } from "../pengetahuan/cari";

export const KOLEKSI_REGULASI = "regulasi";
export const BATAS_BERKAS = 25 * 1024 * 1024;   // ponytail: disimpan base64 di Postgres sementara; pindah ke R2 bila berkas besar dibutuhkan

export const JENIS_REGULASI = ["UU", "Perppu", "PP", "Perpres", "Keppres", "Permen ESDM", "Kepmen ESDM", "Kepdirjen Minerba",
  "Permenaker", "Kepmenaker", "Permen LHK", "Kepmen LHK", "Permenkes", "SNI", "Lainnya"] as const;
export const BIDANG_REGULASI = ["minerba", "k3", "lingkungan", "ketenagakerjaan", "lainnya"] as const;
export const STATUS_REGULASI = ["berlaku", "diubah", "dicabut"] as const;

export interface MetaRegulasi {
  jenis: string; nomor: string; tahun: number; judul: string; instansi?: string | null; bidang: string;
  status: string; diubahOleh?: string | null; dicabutOleh?: string | null; tanggalPenetapan?: string | null;
}

export const labelRegulasi = (r: { jenis: string; nomor: string; tahun: number }) => `${r.jenis} ${r.nomor}/${r.tahun}`;

/** Validasi metadata di batas kepercayaan (form unggah). Mengembalikan pesan galat atau null. */
export function periksaMeta(m: any): string | null {
  if (!m || typeof m !== "object") return "Metadata kosong";
  if (!JENIS_REGULASI.includes(m.jenis)) return "Jenis peraturan tidak dikenal";
  if (!String(m.nomor || "").trim() || String(m.nomor).length > 60) return "Nomor wajib diisi (maks 60 karakter)";
  const t = Number(m.tahun);
  if (!Number.isInteger(t) || t < 1945 || t > new Date().getFullYear() + 1) return "Tahun tidak valid";
  if (!String(m.judul || "").trim() || String(m.judul).length > 500) return "Judul wajib diisi";
  if (!BIDANG_REGULASI.includes(m.bidang)) return "Bidang tidak dikenal";
  if (!STATUS_REGULASI.includes(m.status)) return "Status tidak dikenal";
  if (m.status === "dicabut" && !String(m.dicabutOleh || "").trim()) return "Isi 'dicabut oleh' untuk peraturan yang dicabut";
  if (m.tanggalPenetapan && !/^\d{4}-\d{2}-\d{2}$/.test(m.tanggalPenetapan)) return "Tanggal penetapan harus YYYY-MM-DD";
  return null;
}

export interface Pratinjau {
  meta: MetaRegulasi;                 // hasil baca PDF, ditimpa isian pengguna bila ada
  terdeteksi: MetaTerdeteksi;
  galatMeta: string | null;           // null = siap terbit tanpa koreksi
  mutu: ReturnType<typeof nilaiMutu> & { pasalLompat: string[] };
  ringkasan: { potongan: number; pasal: number; penjelasan: number; lampiran: number; pembukaan: number };
  contoh: Pick<PotonganRegulasi, "jenis" | "bagian" | "halamanAwal" | "halamanAkhir" | "teks">[];
  bisaDiterbitkan: boolean;
}

/**
 * Potong PDF tanpa menyimpan apa pun — untuk layar pratinjau sebelum terbit.
 * Identitas dibaca dari PDF; isian pengguna (`koreksi`) hanya menimpa kolom yang diisi.
 */
export async function pratinjauRegulasi(pdf: Uint8Array, koreksi: Partial<MetaRegulasi> = {}, namaBerkas = ""): Promise<{ pratinjau: Pratinjau; potongan: PotonganRegulasi[]; halaman: number }> {
  const hal = await ekstrakHalamanReg(pdf);
  const terdeteksi = deteksiMeta(hal, namaBerkas);
  const isi = (v: any) => v !== undefined && v !== null && String(v).trim() !== "" && !(typeof v === "number" && Number.isNaN(v));
  const pilih = <K extends keyof MetaRegulasi>(k: K, cadangan: any) => (isi(koreksi[k]) ? koreksi[k] : isi((terdeteksi as any)[k]) ? (terdeteksi as any)[k] : cadangan);
  const meta: MetaRegulasi = {
    jenis: pilih("jenis", "Lainnya"), nomor: pilih("nomor", ""), tahun: Number(pilih("tahun", NaN)), judul: pilih("judul", ""),
    instansi: pilih("instansi", null), bidang: pilih("bidang", "lainnya"), status: pilih("status", "berlaku"),
    diubahOleh: pilih("diubahOleh", null), dicabutOleh: pilih("dicabutOleh", null), tanggalPenetapan: pilih("tanggalPenetapan", null),
  };
  const mutu = nilaiMutu(hal);
  const potongan = mutu.halamanTanpaTeks === hal.length ? [] : potongRegulasi(hal, { label: labelRegulasi(meta), judul: meta.judul, status: meta.status });
  const galatMeta = periksaMeta(meta);

  const nomor = Array.from(new Set(potongan.filter((p) => p.jenis === "pasal" && /^\d+$/.test(p.pasal || "")).map((p) => +p.pasal!))).sort((a, b) => a - b);
  const pasalLompat = nomor.length && !/perubahan/i.test(meta.judul)
    ? Array.from({ length: nomor[nomor.length - 1] }, (_, i) => i + 1).filter((n) => !nomor.includes(n)).map(String)
    : [];
  if (pasalLompat.length) mutu.catatan.push(`${pasalLompat.length} nomor pasal tidak terbaca sebagai judul (${pasalLompat.slice(0, 12).join(", ")}${pasalLompat.length > 12 ? ", …" : ""}); teksnya tetap tercakup di potongan sebelumnya.`);

  const hitung = (j: string) => potongan.filter((p) => p.jenis === j).length;
  const contoh = potongan.filter((p) => p.jenis === "pasal").slice(0, 6).concat(potongan.filter((p) => p.jenis !== "pasal" && p.jenis !== "pembukaan").slice(0, 2))
    .map(({ jenis, bagian, halamanAwal, halamanAkhir, teks }) => ({ jenis, bagian, halamanAwal, halamanAkhir, teks: teks.slice(0, 600) }));
  return {
    pratinjau: {
      meta, terdeteksi, galatMeta,
      mutu: { ...mutu, pasalLompat },
      ringkasan: { potongan: potongan.length, pasal: hitung("pasal"), penjelasan: hitung("penjelasan"), lampiran: hitung("lampiran"), pembukaan: hitung("pembukaan") },
      contoh,
      bisaDiterbitkan: potongan.some((p) => p.jenis === "pasal" || p.jenis === "lampiran"),
    },
    potongan, halaman: hal.length,
  };
}

/**
 * Terbitkan: potong ulang dari berkas tersimpan, embedding SEMUA potongan dulu, lalu ganti isi koleksi
 * untuk peraturan ini dalam satu transaksi (tidak ada keadaan setengah jadi yang bisa dicari).
 */
export async function terbitkanRegulasi(basisData: any, id: string, embed: Embedder): Promise<{ potongan: number }> {
  const r = (await basisData.execute(sql`select r.*, f.data from regulasi r left join uploaded_files f on f.id = r.berkas_id where r.id = ${id}`)).rows[0] as any;
  if (!r) throw new Error("Peraturan tidak ditemukan");
  if (!r.data) throw new Error("Berkas PDF tidak ditemukan");
  const meta: MetaRegulasi = { jenis: r.jenis, nomor: r.nomor, tahun: r.tahun, judul: r.judul, bidang: r.bidang, status: r.status };
  try {
    const { pratinjau, potongan } = await pratinjauRegulasi(new Uint8Array(Buffer.from(r.data, "base64")), meta);
    if (pratinjau.galatMeta) throw new Error(pratinjau.galatMeta);
    if (!pratinjau.bisaDiterbitkan) throw new Error(pratinjau.mutu.catatan[0] || "Tidak ada pasal yang terbaca dari PDF");
    const vektor = await embed(potongan.map((p) => p.teksEmbed));
    const label = labelRegulasi(meta);

    await basisData.transaction(async (tx: any) => {
      await tx.execute(sql`delete from pengetahuan_potongan where koleksi = ${KOLEKSI_REGULASI} and document_id = ${id}`);
      for (let i = 0; i < potongan.length; i += 100) {
        const nilai = potongan.slice(i, i + 100).map((p, k) => sql`(${KOLEKSI_REGULASI}, ${id}, ${id}, ${label}, ${r.judul}, 0,
          ${r.bidang}, ${r.jenis}, ${p.jenis}, ${p.bagian}, ${p.halamanAwal}, ${p.halamanAkhir}, ${p.urutan}, ${p.teks},
          ${p.teksEmbed}, ${p.hash}, ${MODEL_EMBEDDING}, ${JSON.stringify(vektor[i + k])}::vector)`);
        await tx.execute(sql`insert into pengetahuan_potongan (koleksi, document_id, version_id, kode_dokumen, judul, revisi,
          departemen, kategori, jenis, bagian, halaman_awal, halaman_akhir, urutan, teks, teks_embed, hash_teks, model_embedding, embedding)
          values ${sql.join(nilai, sql`, `)}`);
      }
      await tx.execute(sql`update regulasi set status_muat = 'terbit', jumlah_potongan = ${potongan.length}, galat_muat = null,
        mutu = ${JSON.stringify(pratinjau.mutu)}::jsonb, diperbarui = now() where id = ${id}`);
    });
    lupakanIndeks(KOLEKSI_REGULASI);
    return { potongan: potongan.length };
  } catch (e: any) {
    await basisData.execute(sql`update regulasi set status_muat = 'gagal', galat_muat = ${String(e?.message || e).slice(0, 500)}, diperbarui = now() where id = ${id}`);
    throw e;
  }
}

/** Keluarkan dari pencarian (potongan dihapus), metadata & berkas tetap. */
export async function tarikRegulasi(basisData: any, id: string) {
  await basisData.execute(sql`delete from pengetahuan_potongan where koleksi = ${KOLEKSI_REGULASI} and document_id = ${id}`);
  await basisData.execute(sql`update regulasi set status_muat = 'draf', jumlah_potongan = 0, diperbarui = now() where id = ${id}`);
  lupakanIndeks(KOLEKSI_REGULASI);
}
