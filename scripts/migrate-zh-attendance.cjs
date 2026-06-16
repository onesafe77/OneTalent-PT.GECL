// Zero Harm Fase 2A (Kehadiran) — migrasi additive + seed roster/target/grid-bulan. Idempoten.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`ALTER TABLE zh_program_officer ADD COLUMN IF NOT EXISTS target integer;`);

  const YEAR = 2026;
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'zh_att_seed.json'), 'utf8'));
  let off = 0, att = 0;
  for (const p of seed) {
    for (const w of p.workers) {
      await c.query(
        `INSERT INTO zh_program_officer (program_code, nik, nama, dept, jabatan, ord, target)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (program_code, nik) DO UPDATE SET nama=EXCLUDED.nama, dept=EXCLUDED.dept, jabatan=EXCLUDED.jabatan, target=EXCLUDED.target`,
        [p.code, w.nik, w.nama, w.dept || null, w.jabatan || null, off, w.target || null]
      );
      off++;
      for (const m of (w.months || [])) {
        // week = bulan (1-12), days = minggu-hadir (null = NA/cuti)
        await c.query(
          `INSERT INTO zh_program_attendance (program_code, nik, year, week, days)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (program_code, nik, year, week) DO UPDATE SET days=EXCLUDED.days, updated_at=now()`,
          [p.code, w.nik, YEAR, m.month, m.wp == null ? null : Number(m.wp)]
        );
        att++;
      }
    }
  }
  console.log(`seeded attendance-program officers=${off} grid=${att}`);
  await c.end();
})().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
