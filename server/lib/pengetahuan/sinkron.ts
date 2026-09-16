// Sinkronisasi koleksi pengetahuan dengan dokumen yang BERLAKU.
//
// Dua lapis, karena satu saja tidak cukup:
//  1. Seketika — dipanggil setelah revisi berlaku / dokumen ditarik / dihapus. Berjalan di latar
//     belakang: gagal embedding TIDAK boleh menggagalkan penerbitan dokumen.
//  2. Rekonsiliasi malam — mencocokkan isi koleksi dengan revisi ACTIVE di daftar induk dan
//     membetulkan semua selisih. Menangkap kegagalan lapis 1 & perubahan lewat jalur lain.
import { sql } from "drizzle-orm";
import { muatUlangDokumen, embedderOpenRouter, DIKECUALIKAN, type Embedder, type HasilMuat } from "./muat";

/** Koleksi untuk sebuah kode dokumen; null = dokumen ini tidak masuk pengetahuan AI. */
export const koleksiUntuk = (kode: string | null | undefined): string | null => (kode && /-PPO-/i.test(kode) ? "ppo" : null);

const kunciApi = () => process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "";

/**
 * Dokumen yang isi koleksinya tidak sesuai kenyataan:
 *  (a) PPO berlaku yang belum dimuat, atau dimuat dari revisi selain ACTIVE saat ini;
 *  (b) potongan milik dokumen yang tidak berlaku lagi / sudah dihapus / revisinya bukan ACTIVE;
 *  (c) potongan milik dokumen yang dikecualikan.
 */
export async function dokumenMelenceng(basisData: any, koleksi = "ppo"): Promise<{ documentId: string; alasan: string }[]> {
  const dikecualikan = Object.keys(DIKECUALIKAN);
  const kecuali = dikecualikan.length ? sql`and m.document_code not in (${sql.join(dikecualikan.map((k) => sql`${k}`), sql`, `)})` : sql``;
  const kecualiP = dikecualikan.length ? sql`or p.kode_dokumen in (${sql.join(dikecualikan.map((k) => sql`${k}`), sql`, `)})` : sql``;
  const baris = (await basisData.execute(sql`
    select m.id as document_id, 'belum dimuat / revisi berbeda' as alasan
    from document_masterlist m
    join document_versions v on v.document_id = m.id and v.status = 'ACTIVE'
    where m.lifecycle_status = 'PUBLISHED' and m.document_code ilike '%-PPO-%' ${kecuali}
      and not exists (select 1 from pengetahuan_potongan p where p.koleksi = ${koleksi} and p.document_id = m.id and p.version_id = v.id)
    union
    select distinct p.document_id, 'tidak berlaku lagi / dihapus / dikecualikan' as alasan
    from pengetahuan_potongan p
    left join document_masterlist m on m.id = p.document_id
    left join document_versions v on v.id = p.version_id
    where p.koleksi = ${koleksi}
      and (m.id is null or m.lifecycle_status <> 'PUBLISHED' or v.id is null or v.status <> 'ACTIVE' ${kecualiP})`)).rows as any[];
  // Satu dokumen bisa muncul di kedua cabang (mis. revisi lama masih ada & yang baru belum): cukup sekali.
  const unik = new Map<string, string>();
  for (const b of baris) unik.set(b.document_id, unik.has(b.document_id) ? `${unik.get(b.document_id)}; ${b.alasan}` : b.alasan);
  return Array.from(unik.entries()).map(([documentId, alasan]) => ({ documentId, alasan }));
}

/** Hapus potongan dokumen yang sudah tidak ada di daftar induk (muatUlangDokumen butuh baris induk). */
async function hapusYatim(basisData: any, documentId: string, koleksi: string): Promise<boolean> {
  const ada = (await basisData.execute(sql`select 1 from document_masterlist where id = ${documentId}`)).rows.length > 0;
  if (ada) return false;
  await basisData.execute(sql`delete from pengetahuan_potongan where koleksi = ${koleksi} and document_id = ${documentId}`);
  return true;
}

export interface HasilRekonsiliasi { melenceng: number; dimuat: number; dikeluarkan: number; gagal: { documentId: string; pesan: string }[] }

export async function rekonsiliasi(basisData: any, embed: Embedder, koleksi = "ppo"): Promise<HasilRekonsiliasi> {
  const daftar = await dokumenMelenceng(basisData, koleksi);
  const hasil: HasilRekonsiliasi = { melenceng: daftar.length, dimuat: 0, dikeluarkan: 0, gagal: [] };
  for (const { documentId } of daftar) {
    try {
      if (await hapusYatim(basisData, documentId, koleksi)) { hasil.dikeluarkan++; continue; }
      const h: HasilMuat = await muatUlangDokumen(basisData, documentId, embed, koleksi);
      if (h.status === "dimuat") hasil.dimuat++; else hasil.dikeluarkan++;
    } catch (e: any) {
      // Satu dokumen gagal tidak menghentikan yang lain; isi lama dokumen itu tetap utuh (lihat muat.ts).
      hasil.gagal.push({ documentId, pesan: e?.message || String(e) });
    }
  }
  return hasil;
}

const sedangJalan = new Set<string>();

/**
 * Lapis 1 — dipanggil tanpa ditunggu (fire-and-forget) setelah status dokumen berubah.
 * Tidak pernah melempar galat ke pemanggil; kegagalan dicatat & dibetulkan rekonsiliasi malam.
 */
export function sinkronkanDokumen(basisData: any, documentId: string, sebab: string): void {
  if (sedangJalan.has(documentId)) return;
  sedangJalan.add(documentId);
  setImmediate(async () => {
    try {
      const d = (await basisData.execute(sql`select document_code from document_masterlist where id = ${documentId}`)).rows[0] as any;
      const koleksi = koleksiUntuk(d?.document_code) ?? "ppo";
      if (!d) { if (await hapusYatim(basisData, documentId, koleksi)) console.log(`[pengetahuan] ${documentId} dihapus → potongan dikeluarkan (${sebab})`); return; }
      if (!koleksiUntuk(d.document_code)) return;
      if (!kunciApi()) { console.warn(`[pengetahuan] ${d.document_code}: kunci embedding tidak ada — ditunda ke rekonsiliasi malam`); return; }
      const h = await muatUlangDokumen(basisData, documentId, embedderOpenRouter(kunciApi()), koleksi);
      console.log(`[pengetahuan] ${d.document_code}: ${h.status}${h.revisi != null ? ` R${h.revisi}` : ""} (${h.potongan} potongan) — ${sebab}`);
    } catch (e: any) {
      console.error(`[pengetahuan] sinkron ${documentId} GAGAL (${sebab}) — isi lama tetap dipakai, dicoba ulang malam ini:`, e?.message || e);
    } finally {
      sedangJalan.delete(documentId);
    }
  });
}

/** Lapis 2 — untuk cron. */
export async function jalankanRekonsiliasiMalam(basisData: any): Promise<HasilRekonsiliasi | null> {
  if (!kunciApi()) { console.warn("[pengetahuan] rekonsiliasi dilewati: kunci embedding tidak ada"); return null; }
  const h = await rekonsiliasi(basisData, embedderOpenRouter(kunciApi()), "ppo");
  console.log(`[pengetahuan] rekonsiliasi PPO: ${h.melenceng} melenceng → ${h.dimuat} dimuat, ${h.dikeluarkan} dikeluarkan, ${h.gagal.length} gagal`);
  for (const g of h.gagal) console.error(`[pengetahuan]   gagal ${g.documentId}: ${g.pesan}`);
  return h;
}
