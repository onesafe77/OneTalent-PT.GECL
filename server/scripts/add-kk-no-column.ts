// Tambah kolom kk_no (Nomor Kartu Keluarga) ke tabel employees.
// Idempotent — aman di-run ulang. Jalankan: tsx server/scripts/add-kk-no-column.ts

import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS kk_no VARCHAR(32);`);
    const r = await pool.query(
      `SELECT COUNT(*) AS total, COUNT(kk_no) AS filled FROM employees`
    );
    console.log(`Kolom kk_no siap. employees: ${r.rows[0].total} baris, ${r.rows[0].filled} sudah terisi.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
