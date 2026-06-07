// Reset dokumen yang status IN_REVIEW tapi TIDAK punya workflow approval
// (state inconsistent dari setup lama). Kembalikan ke DRAFT supaya user
// bisa "Ajukan Review" lagi dan workflow di-create dengan benar.

import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Cari dokumen IN_REVIEW yang tidak punya documentApprovals
    const orphans = await pool.query(`
      SELECT dm.id, dm.document_code, dm.title, dm.owner_name
      FROM document_masterlist dm
      LEFT JOIN document_approvals da ON da.document_id = dm.id
      WHERE dm.lifecycle_status = 'IN_REVIEW'
        AND da.id IS NULL
    `);
    console.log(`Dokumen IN_REVIEW tanpa workflow: ${orphans.rows.length}`);
    if (orphans.rows.length === 0) {
      console.log('Tidak ada yang perlu di-reset.');
      return;
    }
    orphans.rows.forEach((d: any) => {
      console.log(`  - ${d.document_code}: ${d.title} (owner: ${d.owner_name})`);
    });

    const ids = orphans.rows.map((d: any) => d.id);

    // Reset ke DRAFT
    const reset = await pool.query(
      `UPDATE document_masterlist
       SET lifecycle_status = 'DRAFT', updated_at = now()
       WHERE id = ANY($1::varchar[])`,
      [ids]
    );
    console.log(`\nDireset ke DRAFT: ${reset.rowCount} dokumen`);

    // Reset versi terkait dari PENDING_APPROVAL ke DRAFT juga
    const versionReset = await pool.query(
      `UPDATE document_versions
       SET status = 'DRAFT'
       WHERE document_id = ANY($1::varchar[]) AND status = 'PENDING_APPROVAL'`,
      [ids]
    );
    console.log(`Versi direset ke DRAFT: ${versionReset.rowCount}`);

    console.log('\nSelesai. User dapat membuka detail tiap dokumen lalu klik "Ajukan Review" lagi.');
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
