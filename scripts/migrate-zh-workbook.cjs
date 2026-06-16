// Additive: tabel zh_workbook (Univer IWorkbookData). Idempoten.
const { Client } = require('pg');
require('dotenv').config();
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`CREATE TABLE IF NOT EXISTS zh_workbook (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL DEFAULT 'Zero Harm 2.0',
    data jsonb NOT NULL,
    updated_at timestamp DEFAULT now()
  );`);
  const r = await c.query(`SELECT to_regclass('zh_workbook') AS t`);
  console.log('zh_workbook:', r.rows[0].t);
  await c.end();
})().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
