// Seed roster program 3.2.2 (Kesesuaian Inspeksi) ke zh_program_officer. Idempoten.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'zh_inspeksi_seed.json'), 'utf8'));
  let n = 0;
  for (const p of seed) {
    let ord = 0;
    for (const w of p.workers) {
      await c.query(
        `INSERT INTO zh_program_officer (program_code, nik, nama, dept, jabatan, ord)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (program_code, nik) DO UPDATE SET nama=EXCLUDED.nama, dept=EXCLUDED.dept, jabatan=EXCLUDED.jabatan`,
        [p.code, w.nik, w.nama, w.dept || null, w.jabatan || null, ord++]
      );
      n++;
    }
  }
  console.log(`seeded 3.2.2 roster officers=${n}`);
  await c.end();
})().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
