// Wipe all K3 document data — masterlist, versions, approvals, distributions, etc.
// Run via: tsx server/scripts/clear-document-data.ts
// SAFE: only touches document_* tables, not employees / other unrelated data.

import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

// Delete in FK-safe order. CASCADE will handle some, but explicit is safer.
const TABLES_IN_ORDER = [
  'document_step_assignees',
  'document_approval_steps',
  'document_approvals',
  'document_distributions',
  'document_audit_logs',
  'document_export_logs',
  'document_disposal_records',
  'change_requests',
  'document_versions',
  'document_masterlist',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Counting rows before delete...');
    for (const t of TABLES_IN_ORDER) {
      try {
        const r = await pool.query(`SELECT COUNT(*) FROM ${t}`);
        console.log(`  ${t}: ${r.rows[0].count}`);
      } catch (e: any) {
        console.log(`  ${t}: SKIP (${e.message})`);
      }
    }

    console.log('\nDeleting rows...');
    for (const t of TABLES_IN_ORDER) {
      try {
        const r = await pool.query(`DELETE FROM ${t}`);
        console.log(`  ${t}: deleted ${r.rowCount} rows`);
      } catch (e: any) {
        console.log(`  ${t}: SKIP (${e.message})`);
      }
    }

    console.log('\nDone. All K3 document data cleared.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
