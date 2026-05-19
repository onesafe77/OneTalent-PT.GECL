import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  // Inspect uploaded_files referenced by induction selfie URLs
  const r = await pool.query(`
    SELECT
      uf.id,
      uf.filename,
      uf.mime_type,
      length(uf.data) as data_b64_len,
      pia.nik,
      pia.tanggal_refresh_induksi
    FROM public_induction_attendance pia
    JOIN uploaded_files uf ON ('/api/uploads/' || uf.id) = pia.foto_selfie
    ORDER BY pia.created_at DESC
  `);
  console.log('Selfie files in uploaded_files:');
  console.table(r.rows.map((x: any) => ({
    nik: x.nik,
    date: x.tanggal_refresh_induksi,
    file_id: x.id.slice(0, 8),
    mime: x.mime_type,
    base64_chars: x.data_b64_len,
  })));

  // Count broken
  const brokenCount = r.rows.filter((x: any) => Number(x.data_b64_len) < 100).length;
  console.log(`\nBroken (empty/tiny): ${brokenCount} / ${r.rows.length}`);

  await pool.end();
}
main();
