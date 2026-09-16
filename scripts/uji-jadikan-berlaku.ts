// Uji alur "revisi dokumen menjadi berlaku" (storage.jadikanBerlaku) pada Postgres sementara
// (PGlite, di dalam proses) — TIDAK menyentuh database produksi.
// Jalankan: npm i --no-save @electric-sql/pglite@0.3 && npx tsx scripts/uji-jadikan-berlaku.ts
import assert from "node:assert";

// storage.ts mengimpor server/db.ts yang menolak dimuat tanpa DATABASE_URL.
// Nilai palsu cukup: pool baru tersambung saat ada query, dan uji ini tak memakainya.
process.env.DATABASE_URL ??= "postgres://uji:uji@127.0.0.1:1/uji";

const { PGlite } = await import("@electric-sql/pglite");
const { drizzle } = await import("drizzle-orm/pglite");
const skema = await import("../shared/schema");
const { storage } = await import("../server/storage");

const pgl = new PGlite();
await pgl.exec(`
CREATE TABLE document_masterlist (id varchar primary key, document_code varchar, title text, category text, department text,
  current_version integer, current_revision integer, owner_id varchar, owner_name text, lifecycle_status text, control_type text,
  effective_date text, next_review_date text, expiry_date text, sign_required boolean, description text, keywords text[],
  created_by varchar, created_at timestamp, updated_at timestamp, smkp_clause varchar, retention_period varchar);
CREATE TABLE document_versions (id varchar primary key, document_id varchar, version_number integer, revision_number integer,
  file_name text, file_path text, file_size integer, mime_type text, signed_file_path text, signed_at timestamp, status text,
  changes_note text, uploaded_by varchar, uploaded_by_name text, created_at timestamp, content_html text, content_json jsonb);`);
const uji = drizzle(pgl, { schema: skema });

const siapkan = async (status: string, versi: [string, number, string][]) => {
  await pgl.exec(`DELETE FROM document_versions; DELETE FROM document_masterlist;`);
  await pgl.query(`INSERT INTO document_masterlist (id, document_code, title, category, department, current_version, current_revision, lifecycle_status, effective_date)
    VALUES ('D1','GECL-HSE-PPO-4.1.16','Manajemen Fatigue','Prosedur - Dept HSE','HSE',1,9,$1,'2025-01-01')`, [status]);
  for (const [id, rev, st] of versi)
    await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status, created_at) VALUES ($1,'D1',1,$2,$3,now())`, [id, rev, st]);
};
const status = async () => Object.fromEntries((await pgl.query<any>(`SELECT id, status FROM document_versions ORDER BY id`)).rows.map((r) => [r.id, r.status]));
const induk = async () => (await pgl.query<any>(`SELECT lifecycle_status, current_revision, effective_date FROM document_masterlist`)).rows[0];

let gagal = 0;
const kasus = async (nama: string, fn: () => Promise<void>) => {
  try { await fn(); console.log("  LULUS ", nama); }
  catch (e: any) { gagal++; console.log("  GAGAL ", nama, "\n         ", e.message); }
};

await kasus("jalur tanda tangan: R10 SIGNED menggantikan R09 ACTIVE", async () => {
  await siapkan("SIGNED", [["R08", 8, "SUPERSEDED"], ["R09", 9, "ACTIVE"], ["R10", 10, "APPROVED"]]);
  await storage.jadikanBerlaku("D1", undefined, uji);
  assert.deepStrictEqual(await status(), { R08: "SUPERSEDED", R09: "SUPERSEDED", R10: "ACTIVE" });
  const d = await induk();
  assert.strictEqual(d.lifecycle_status, "PUBLISHED");
  assert.strictEqual(d.current_revision, 10, "current_revision harus ikut revisi berlaku");
  assert.strictEqual(d.effective_date, "2025-01-01", "tanggal berlaku yang sudah ada tidak ditimpa");
});

await kasus("tepat SATU revisi ACTIVE setelah terbit", async () => {
  await siapkan("APPROVED", [["R09", 9, "ACTIVE"], ["R10", 10, "APPROVED"]]);
  await storage.jadikanBerlaku("D1", "R10", uji);
  const s = await status();
  assert.strictEqual(Object.values(s).filter((x) => x === "ACTIVE").length, 1);
});

await kasus("draft revisi berikutnya TIDAK ikut digantikan", async () => {
  await siapkan("APPROVED", [["R09", 9, "ACTIVE"], ["R10", 10, "APPROVED"], ["R11", 11, "DRAFT"]]);
  await storage.jadikanBerlaku("D1", "R10", uji);
  assert.strictEqual((await status()).R11, "DRAFT");
});

await kasus("idempoten: terbitkan ulang dokumen yang sudah berlaku tidak mengubah apa pun", async () => {
  await siapkan("PUBLISHED", [["R09", 9, "SUPERSEDED"], ["R10", 10, "ACTIVE"]]);
  await storage.jadikanBerlaku("D1", undefined, uji);
  assert.deepStrictEqual(await status(), { R09: "SUPERSEDED", R10: "ACTIVE" });
  assert.strictEqual((await induk()).current_revision, 10);
});

await kasus("menolak terbit bila tak ada revisi disetujui maupun berlaku", async () => {
  await siapkan("DRAFT", [["R01", 1, "DRAFT"]]);
  await assert.rejects(() => storage.jadikanBerlaku("D1", undefined, uji), /Tidak ada revisi/);
  assert.deepStrictEqual(await status(), { R01: "DRAFT" }, "gagal harus tanpa perubahan (transaksi)");
  assert.strictEqual((await induk()).lifecycle_status, "DRAFT");
});

await kasus("versionId milik dokumen lain ditolak", async () => {
  await siapkan("APPROVED", [["R10", 10, "APPROVED"]]);
  await pgl.query(`INSERT INTO document_versions (id, document_id, version_number, revision_number, status) VALUES ('ASING','D2',1,1,'APPROVED')`);
  // Revisi yang disebut bukan milik D1 → dianggap tak ada; D1 belum punya revisi berlaku → ditolak.
  await assert.rejects(() => storage.jadikanBerlaku("D1", "ASING", uji));
  assert.notStrictEqual((await status()).ASING, "ACTIVE");
});

console.log(gagal ? `\n${gagal} kasus GAGAL` : "\nsemua kasus lulus");
process.exit(gagal ? 1 : 0);
