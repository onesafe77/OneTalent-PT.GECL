// Cleanup orphan/empty selfie uploads:
// 1. Find uploaded_files referenced by induction selfie URLs where data is empty
// 2. Set foto_selfie = NULL on those induction rows (UI akan render "-")
// 3. Delete empty uploaded_files rows
//
// Penyebab data corrupt: selfie-camera bug (sebelum fix) — saat klik "Ambil Foto"
// sementara video belum playing, canvas kosong → blob 0 byte → upload silent fail.

import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Find induction rows pointing to empty files (data length < 100 chars base64 → effectively empty)
    const corrupt = await pool.query(`
      SELECT pia.id as att_id, pia.nik, uf.id as file_id, length(uf.data) as data_len
      FROM public_induction_attendance pia
      JOIN uploaded_files uf ON ('/api/uploads/' || uf.id) = pia.foto_selfie
      WHERE length(uf.data) < 100
    `);
    console.log(`Corrupt selfie records: ${corrupt.rows.length}`);

    if (corrupt.rows.length === 0) {
      console.log('Nothing to clean.');
      return;
    }

    const attIds = corrupt.rows.map((r: any) => r.att_id);
    const fileIds = corrupt.rows.map((r: any) => r.file_id);

    // Null-out selfie reference
    const nulled = await pool.query(
      `UPDATE public_induction_attendance SET foto_selfie = NULL WHERE id = ANY($1::varchar[])`,
      [attIds]
    );
    console.log(`Set foto_selfie = NULL on ${nulled.rowCount} attendance rows`);

    // Delete orphan empty uploaded_files rows
    const deleted = await pool.query(
      `DELETE FROM uploaded_files WHERE id = ANY($1::varchar[])`,
      [fileIds]
    );
    console.log(`Deleted ${deleted.rowCount} empty uploaded_files rows`);

    console.log('\nDone. UI sekarang akan render "-" untuk records yang corrupt.');
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
