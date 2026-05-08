import pg from 'pg';
import * as dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_family_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        hubungan VARCHAR(40) NOT NULL,
        nama VARCHAR(200) NOT NULL,
        jenis_kelamin VARCHAR(20),
        tempat_lahir VARCHAR(120),
        tanggal_lahir TEXT,
        kontak_darurat VARCHAR(30),
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_family_employee" ON employee_family_members(employee_id);`);
    console.log("✅ Table employee_family_members created on Railway");
    const r = await pool.query("SELECT COUNT(*) FROM employee_family_members");
    console.log(`   Existing rows: ${r.rows[0].count}`);
  } finally {
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
