// Terbitkan ulang satu peraturan (mis. setelah pemotong/OCR diperbaiki): npx tsx scripts/regulasi/terbit-ulang.ts <jenis> <nomor> <tahun>
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../../server/db";
import { terbitkanRegulasi } from "../../server/lib/regulasi/muat";
import { embedderOpenRouter } from "../../server/lib/pengetahuan/muat";
import { kunciOpenRouter } from "../../server/ai-config";
(async () => {
  const [jenis, nomor, tahun] = process.argv.slice(2);
  const r = (await db.execute(sql`select id from regulasi where jenis = ${jenis} and nomor = ${nomor} and tahun = ${+tahun}`)).rows[0] as any;
  if (!r) { console.error("tidak ditemukan"); process.exit(1); }
  const t = Date.now();
  const h = await terbitkanRegulasi(db, r.id, embedderOpenRouter(kunciOpenRouter()));
  const s = (await db.execute(sql`select status_muat, progres, jumlah_potongan, jumlah_halaman, mutu from regulasi where id = ${r.id}`)).rows[0] as any;
  console.log(`selesai ${((Date.now() - t) / 1000).toFixed(0)} dtk`, h, s.status_muat, s.progres, s.jumlah_halaman, s.mutu?.catatan);
  process.exit(0);
})().catch((e) => { console.error("GAGAL", e?.message || e); process.exit(1); });
