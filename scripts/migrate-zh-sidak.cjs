// Zero Harm KPI Sidak — migrasi additive + seed roster & grid hari-kerja. Idempoten.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // 1) kolom counter di zh_opk + backfill dari raw
  await c.query(`ALTER TABLE zh_opk ADD COLUMN IF NOT EXISTS counter text;`);
  const bf = await c.query(`UPDATE zh_opk SET counter = raw->>'Counter' WHERE counter IS NULL AND raw ? 'Counter';`);
  console.log('zh_opk.counter backfilled rows:', bf.rowCount);

  // 2) tabel roster + attendance
  await c.query(`CREATE TABLE IF NOT EXISTS zh_program_officer (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    program_code varchar(16) NOT NULL,
    nik varchar(32) NOT NULL,
    nama text NOT NULL,
    dept text,
    jabatan text,
    ord integer DEFAULT 0,
    created_at timestamp DEFAULT now()
  );`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UX_zh_prog_officer" ON zh_program_officer (program_code, nik);`);
  await c.query(`CREATE INDEX IF NOT EXISTS "IDX_zh_prog_officer_prog" ON zh_program_officer (program_code);`);

  await c.query(`CREATE TABLE IF NOT EXISTS zh_program_attendance (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    program_code varchar(16) NOT NULL,
    nik varchar(32) NOT NULL,
    year integer NOT NULL,
    week integer NOT NULL,
    days integer,
    updated_at timestamp DEFAULT now()
  );`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UX_zh_prog_att" ON zh_program_attendance (program_code, nik, year, week);`);
  await c.query(`CREATE INDEX IF NOT EXISTS "IDX_zh_prog_att_prog" ON zh_program_attendance (program_code, year);`);

  // 3) seed dari JSON (tahun 2026)
  const YEAR = 2026;
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'zh_sidak_seed.json'), 'utf8'));
  let offN = 0, attN = 0;
  for (const p of seed) {
    for (const o of p.officers) {
      await c.query(
        `INSERT INTO zh_program_officer (program_code, nik, nama, dept, jabatan, ord)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (program_code, nik) DO UPDATE SET nama=EXCLUDED.nama, dept=EXCLUDED.dept, jabatan=EXCLUDED.jabatan, ord=EXCLUDED.ord`,
        [p.code, o.nik, o.nama, o.dept || null, o.jabatan || null, o.ord || 0]
      );
      offN++;
      for (const a of o.attendance) {
        // days: number → hari kerja; null → NA (cuti)
        await c.query(
          `INSERT INTO zh_program_attendance (program_code, nik, year, week, days)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (program_code, nik, year, week) DO UPDATE SET days=EXCLUDED.days, updated_at=now()`,
          [p.code, o.nik, YEAR, a.wk, a.days == null ? null : Number(a.days)]
        );
        attN++;
      }
    }
  }
  console.log(`seeded officers=${offN} attendanceCells=${attN}`);

  const cnt = await c.query(`SELECT
    (SELECT count(*) FROM zh_program_officer) AS officers,
    (SELECT count(*) FROM zh_program_attendance) AS attendance,
    (SELECT count(*) FROM zh_opk WHERE counter='1') AS opk_counter1`);
  console.log('totals:', cnt.rows[0]);
  await c.end();
})().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
