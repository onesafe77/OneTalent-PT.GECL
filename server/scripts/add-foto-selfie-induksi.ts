import pg from 'pg';
import * as dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE public_induction_attendance ADD COLUMN IF NOT EXISTS foto_selfie TEXT`);
    console.log("✅ Column foto_selfie added to public_induction_attendance");
  } finally {
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
