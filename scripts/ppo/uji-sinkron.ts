// Uji rekonsiliasi koleksi (server/lib/pengetahuan/sinkron.ts) di PGlite + pgvector, dengan 2 PDF PPO asli.
// Tidak menulis ke produksi. Jalankan: npx tsx scripts/ppo/uji-sinkron.ts
import assert from "node:assert";
import fs from "node:fs";
import pg from "pg";

for (const m of fs.readFileSync(".env", "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
const { PGlite } = await import("@electric-sql/pglite");
const { vector } = await import("@electric-sql/pglite/vector");
const { drizzle } = await import("drizzle-orm/pglite");
const skema = await import("../../shared/schema");
const { DIMENSI } = await import("../../server/lib/pengetahuan/muat");
const { rekonsiliasi, dokumenMelenceng, koleksiUntuk } = await import("../../server/lib/pengetahuan/sinkron");
const { storage } = await import("../../server/storage");

const prod = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await prod.connect();
const ambil = async (kode: string) => {
  const r = (await prod.query(`select coalesce(v.signed_file_path,v.file_path) jalur from document_masterlist m join document_versions v on v.document_id=m.id where v.status='ACTIVE' and m.document_code=$1`, [kode])).rows[0];
  return (await prod.query(`select data from uploaded_files where id=$1`, [r.jalur.split("/").pop()])).rows[0].data as string;
};
const pdfA = await ambil("GECL-HSE-PPO-4.1.25"), pdfB = await ambil("GECL-PLANT-PPO-4.3.14");
await prod.end();

const pgl = new PGlite({ extensions: { vector } });
await pgl.exec(`
CREATE TABLE document_masterlist (id varchar primary key, document_code varchar, title text, category text, department text,
  current_version integer, current_revision integer, owner_id varchar, owner_name text, lifecycle_status text, control_type text,
  effective_date text, next_review_date text, expiry_date text, sign_required boolean, description text, keywords text[],
  created_by varchar, created_at timestamp, updated_at timestamp, smkp_clause varchar, retention_period varchar);
CREATE TABLE document_versions (id varchar primary key, document_id varchar, version_number integer, revision_number integer,
  file_name text, file_path text, file_size integer, mime_type text, signed_file_path text, signed_at timestamp, status text,
  changes_note text, uploaded_by varchar, uploaded_by_name text, created_at timestamp, content_html text, content_json jsonb);
CREATE TABLE uploaded_files (id varchar primary key, data text, mime_type text, filename text, created_at timestamp);`);
await pgl.exec(fs.readFileSync("migrations/2026-09-17_pengetahuan_potongan.sql", "utf8"));
const uji = drizzle(pgl, { schema: skema });

const tambahDok = async (id: string, kode: string, rev: number, verId: string, fileId: string, pdf: string, status = "PUBLISHED") => {
  await pgl.query(`INSERT INTO uploaded_files (id, data) VALUES ($1,$2)`, [fileId, pdf]);
  await pgl.query(`INSERT INTO document_masterlist (id, document_code, title, department, current_version, current_revision, lifecycle_status) VALUES ($1,$2,$3,'HSE',1,$4,$5)`, [id, kode, kode, rev, status]);
  await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status, file_path, created_at) VALUES ($1,$2,1,$3,'ACTIVE',$4,now())`, [verId, id, rev, `/api/uploads/${fileId}`]);
};
await tambahDok("A", "GECL-HSE-PPO-4.1.25", 3, "A3", "FA3", pdfA);
await tambahDok("B", "GECL-PLANT-PPO-4.3.14", 1, "B1", "FB1", pdfB);
await tambahDok("N", "GECL-HSE-FRM-9.9", 1, "N1", "FN1", pdfB);                // bukan PPO → tidak boleh masuk

let panggilan = 0;
const embed = async (t: string[]) => { panggilan++; return t.map((s, i) => Array.from({ length: DIMENSI }, (_, k) => ((s.length * 7 + i + k) % 11) / 11 + 0.01)); };
const embedMati = async () => { throw new Error("layanan embedding mati"); };
const isi = async () => Object.fromEntries((await pgl.query<any>(`select document_id, string_agg(distinct version_id, ',') v, count(*)::int n from pengetahuan_potongan group by 1 order by 1`)).rows.map((r: any) => [r.document_id, `${r.v}:${r.n}`]));

let gagal = 0;
const kasus = async (nama: string, fn: () => Promise<void>) => { try { await fn(); console.log("  LULUS ", nama); } catch (e: any) { gagal++; console.log("  GAGAL ", nama, "\n         ", e.message); } };

await kasus("koleksi kosong → rekonsiliasi memuat semua PPO berlaku, bukan dokumen non-PPO", async () => {
  const h = await rekonsiliasi(uji, embed);
  assert.strictEqual(h.dimuat, 2); assert.strictEqual(h.gagal.length, 0);
  const s = await isi(); assert.deepStrictEqual(Object.keys(s), ["A", "B"]);
  assert.strictEqual(koleksiUntuk("GECL-HSE-FRM-9.9"), null);
});

await kasus("sudah sinkron → tidak ada yang melenceng & TIDAK memanggil embedding", async () => {
  panggilan = 0;
  assert.deepStrictEqual(await dokumenMelenceng(uji), []);
  const h = await rekonsiliasi(uji, embed);
  assert.strictEqual(h.melenceng, 0); assert.strictEqual(panggilan, 0);
});

await kasus("revisi baru berlaku (jadikanBerlaku) → hanya dokumen itu dimuat ulang ke revisi baru", async () => {
  await pgl.query(`INSERT INTO uploaded_files (id, data) VALUES ('FA4',$1)`, [pdfA]);
  await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status, file_path, created_at) VALUES ('A4','A',1,4,'APPROVED','/api/uploads/FA4',now())`);
  await storage.jadikanBerlaku("A", undefined, uji);
  const m = await dokumenMelenceng(uji); assert.deepStrictEqual(m.map((x) => x.documentId), ["A"]);
  const sebelumB = (await isi()).B;
  const h = await rekonsiliasi(uji, embed);
  assert.strictEqual(h.dimuat, 1);
  const s = await isi(); assert.ok(s.A.startsWith("A4:"), s.A); assert.strictEqual(s.B, sebelumB);
  assert.deepStrictEqual((await pgl.query<any>(`select distinct revisi from pengetahuan_potongan where document_id='A'`)).rows.map((r: any) => r.revisi), [4]);
});

await kasus("embedding mati saat revisi baru → dilaporkan gagal, isi LAMA tetap dipakai, dokumen lain tetap diproses", async () => {
  await pgl.query(`INSERT INTO uploaded_files (id, data) VALUES ('FB2',$1)`, [pdfB]);
  await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status, file_path, created_at) VALUES ('B2','B',1,2,'APPROVED','/api/uploads/FB2',now())`);
  await storage.jadikanBerlaku("B", undefined, uji);
  const sebelum = await isi();
  const h = await rekonsiliasi(uji, embedMati as any);
  assert.strictEqual(h.gagal.length, 1); assert.match(h.gagal[0].pesan, /embedding mati/);
  assert.deepStrictEqual(await isi(), sebelum, "isi koleksi tidak boleh berubah saat gagal");
  const pulih = await rekonsiliasi(uji, embed);           // malam berikutnya: layanan hidup lagi
  assert.strictEqual(pulih.dimuat, 1); assert.ok((await isi()).B.startsWith("B2:"));
});

await kasus("dokumen ditarik (DRAFT) → potongannya dikeluarkan", async () => {
  await pgl.query(`UPDATE document_masterlist SET lifecycle_status='DRAFT' WHERE id='A'`);
  const h = await rekonsiliasi(uji, embed);
  assert.strictEqual(h.dikeluarkan, 1); assert.ok(!("A" in (await isi())));
});

await kasus("dokumen dihapus dari daftar induk → potongan yatim dikeluarkan", async () => {
  await pgl.exec(`DELETE FROM document_versions WHERE document_id='B'; DELETE FROM document_masterlist WHERE id='B'`);
  const h = await rekonsiliasi(uji, embed);
  assert.strictEqual(h.dikeluarkan, 1); assert.deepStrictEqual(await isi(), {});
});

console.log(gagal ? `\n${gagal} kasus GAGAL` : "\nsemua kasus lulus");
process.exit(gagal ? 1 : 0);
