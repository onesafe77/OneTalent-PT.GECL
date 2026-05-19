import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/andybagus/OneTalent/.env' });
async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query(`SELECT nik, foto_selfie FROM public_induction_attendance WHERE foto_selfie LIKE '/api/uploads/%' ORDER BY created_at DESC LIMIT 3`);
  r.rows.forEach(x => console.log(x.nik, '->', x.foto_selfie));
  await pool.end();
}
main();
