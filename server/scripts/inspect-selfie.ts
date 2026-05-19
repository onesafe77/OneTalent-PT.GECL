import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query(`
    SELECT nik, nama_karyawan, tanggal_refresh_induksi,
      CASE
        WHEN foto_selfie IS NULL THEN 'NULL'
        WHEN foto_selfie = '' THEN 'EMPTY'
        WHEN foto_selfie LIKE 'data:%' THEN 'DATA_URL_len_' || length(foto_selfie)
        WHEN foto_selfie LIKE '/api/uploads/%' THEN 'API_URL'
        ELSE 'OTHER: ' || substring(foto_selfie, 1, 40)
      END as foto_status
    FROM public_induction_attendance
    ORDER BY created_at DESC LIMIT 10
  `);
  console.table(r.rows);

  // Aggregated
  const r2 = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE foto_selfie IS NULL) as nulls,
      COUNT(*) FILTER (WHERE foto_selfie = '') as empties,
      COUNT(*) FILTER (WHERE foto_selfie LIKE '/api/uploads/%') as urls,
      COUNT(*) FILTER (WHERE foto_selfie LIKE 'data:%') as data_urls,
      COUNT(*) FILTER (WHERE foto_selfie IS NOT NULL AND foto_selfie != '' AND foto_selfie NOT LIKE '/api/uploads/%' AND foto_selfie NOT LIKE 'data:%') as other,
      COUNT(*) as total
    FROM public_induction_attendance
  `);
  console.log('\nAggregated:');
  console.table(r2.rows);
  await pool.end();
}
main();
