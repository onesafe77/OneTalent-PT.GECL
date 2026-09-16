// Uji pemuat koleksi (server/lib/pengetahuan/muat.ts) di Postgres sementara PGlite + pgvector.
// Memakai SATU PDF PPO asli (dibaca dari produksi, hanya-baca). Tidak menulis ke produksi.
// Jalankan: npx tsx scripts/ppo/uji-muat.ts
import assert from "node:assert";
import fs from "node:fs";
import pg from "pg";

for (const m of fs.readFileSync(".env", "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
const { PGlite } = await import("@electric-sql/pglite");
const { vector } = await import("@electric-sql/pglite/vector");
const { drizzle } = await import("drizzle-orm/pglite");
const skema = await import("../../shared/schema");
const { muatUlangDokumen, DIMENSI } = await import("../../server/lib/pengetahuan/muat");
const { storage } = await import("../../server/storage");

// Satu PDF asli: PPO 4.1.25 P3K
const prod = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await prod.connect();
const asli = (await prod.query(`select m.document_code, m.title, coalesce(v.signed_file_path,v.file_path) jalur from document_masterlist m
  join document_versions v on v.document_id=m.id where v.status='ACTIVE' and m.document_code='GECL-HSE-PPO-4.1.25'`)).rows[0];
const berkas = (await prod.query(`select data from uploaded_files where id=$1`, [asli.jalur.split("/").pop()])).rows[0].data;
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

await pgl.query(`INSERT INTO uploaded_files (id, data) VALUES ('F1', $1)`, [berkas]);
await pgl.query(`INSERT INTO document_masterlist (id, document_code, title, department, category, current_version, current_revision, lifecycle_status)
  VALUES ('D1', 'GECL-HSE-PPO-4.1.25', 'P3K', 'HSE', 'Prosedur - Dept HSE', 1, 3, 'PUBLISHED')`);
await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status, file_path, created_at)
  VALUES ('V3', 'D1', 1, 3, 'ACTIVE', '/api/uploads/F1', now())`);

let panggilan = 0;
const embedPalsu = async (t: string[]) => { panggilan++; return t.map((s, i) => Array.from({ length: DIMENSI }, (_, k) => ((s.length + i + k) % 7) / 7)); };
const embedGagal = async () => { throw new Error("layanan embedding mati"); };
const baris = async () => (await pgl.query<any>(`select version_id, count(*)::int n, min(vector_dims(embedding)) dim from pengetahuan_potongan group by 1`)).rows;

let gagal = 0;
const kasus = async (nama: string, fn: () => Promise<void>) => { try { await fn(); console.log("  LULUS ", nama); } catch (e: any) { gagal++; console.log("  GAGAL ", nama, "\n         ", e.message); } };

let jumlah = 0;
await kasus("muat pertama: potongan tersimpan, dimensi 1536, mengacu revisi ACTIVE", async () => {
  const h = await muatUlangDokumen(uji, "D1", embedPalsu);
  const b = await baris();
  assert.strictEqual(h.status, "dimuat"); assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].version_id, "V3"); assert.strictEqual(b[0].dim, 1536); assert.strictEqual(b[0].n, h.potongan);
  jumlah = h.potongan; assert.ok(jumlah > 3, "terlalu sedikit potongan");
});

await kasus("muat ulang idempoten: tidak ada duplikat", async () => {
  await muatUlangDokumen(uji, "D1", embedPalsu);
  assert.deepStrictEqual((await baris()).map((x: any) => x.n), [jumlah]);
});

await kasus("embedding GAGAL → isi lama tetap utuh (tidak ada yang terhapus)", async () => {
  await assert.rejects(() => muatUlangDokumen(uji, "D1", embedGagal as any), /embedding mati/);
  assert.deepStrictEqual((await baris()).map((x: any) => [x.version_id, x.n]), [["V3", jumlah]]);
});

await kasus("revisi baru berlaku (lewat jadikanBerlaku) → koleksi pindah ke revisi baru, revisi lama hilang", async () => {
  await pgl.query(`INSERT INTO uploaded_files (id, data) VALUES ('F2', $1)`, [berkas]);
  await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status, file_path, created_at)
    VALUES ('V4', 'D1', 1, 4, 'APPROVED', '/api/uploads/F2', now())`);
  await storage.jadikanBerlaku("D1", undefined, uji);
  await muatUlangDokumen(uji, "D1", embedPalsu);
  const b = await baris();
  assert.deepStrictEqual(b.map((x: any) => x.version_id), ["V4"]);
  const rev = (await pgl.query<any>(`select distinct revisi from pengetahuan_potongan`)).rows.map((r: any) => r.revisi);
  assert.deepStrictEqual(rev, [4], "revisi di koleksi harus ikut daftar induk");
});

await kasus("dokumen tidak berlaku lagi → potongannya dikeluarkan dari koleksi", async () => {
  await pgl.query(`UPDATE document_masterlist SET lifecycle_status='DRAFT'`);
  const h = await muatUlangDokumen(uji, "D1", embedPalsu);
  assert.strictEqual(h.status, "gagal"); assert.deepStrictEqual(await baris(), []);
});

await kasus("pencarian vektor HNSW & indeks kata kunci bisa dipakai", async () => {
  await pgl.query(`UPDATE document_masterlist SET lifecycle_status='PUBLISHED'`);
  await muatUlangDokumen(uji, "D1", embedPalsu);
  const v = JSON.stringify(Array.from({ length: DIMENSI }, () => 0.5));
  const r = await pgl.query<any>(`select kode_dokumen from pengetahuan_potongan order by embedding <=> $1::vector limit 3`, [v]);
  assert.strictEqual(r.rows.length, 3);
  const k = await pgl.query<any>(`select count(*)::int n from pengetahuan_potongan where to_tsvector('simple', teks_embed) @@ to_tsquery('simple', 'p3k')`);
  assert.ok(k.rows[0].n > 0, "kata kunci 'p3k' tidak ditemukan");
});

console.log(gagal ? `\n${gagal} kasus GAGAL` : "\nsemua kasus lulus");
process.exit(gagal ? 1 : 0);
