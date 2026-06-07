import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  console.log('=== 1. Dokumen dengan status IN_REVIEW ===');
  const docs = await pool.query(`
    SELECT id, document_code, title, lifecycle_status, owner_id, owner_name
    FROM document_masterlist
    WHERE lifecycle_status IN ('IN_REVIEW', 'APPROVED', 'DRAFT')
    ORDER BY updated_at DESC
    LIMIT 15
  `);
  console.table(docs.rows.map((d: any) => ({
    code: d.document_code,
    title: d.title?.substring(0, 40),
    status: d.lifecycle_status,
    owner: d.owner_name,
  })));

  console.log('\n=== 2. Document approvals (workflow) ===');
  const approvals = await pool.query(`
    SELECT da.id, da.document_id, dm.document_code, da.status, da.current_step, da.total_steps,
           da.initiated_by_name
    FROM document_approvals da
    JOIN document_masterlist dm ON dm.id = da.document_id
    WHERE da.status IN ('PENDING', 'IN_PROGRESS')
    ORDER BY da.initiated_at DESC
    LIMIT 15
  `);
  console.table(approvals.rows.map((a: any) => ({
    code: a.document_code,
    status: a.status,
    step: `${a.current_step}/${a.total_steps}`,
    initiator: a.initiated_by_name,
  })));

  console.log('\n=== 3. Steps + assignees yang IN_PROGRESS ===');
  const steps = await pool.query(`
    SELECT
      dm.document_code,
      das.step_number,
      das.step_name,
      das.status as step_status,
      dsa.assignee_id,
      dsa.assignee_name,
      dsa.decision
    FROM document_approval_steps das
    JOIN document_approvals da ON da.id = das.approval_id
    JOIN document_masterlist dm ON dm.id = da.document_id
    LEFT JOIN document_step_assignees dsa ON dsa.step_id = das.id
    WHERE das.status = 'IN_PROGRESS'
    ORDER BY da.initiated_at DESC
  `);
  console.table(steps.rows.map((s: any) => ({
    code: s.document_code,
    step: `${s.step_number}: ${s.step_name}`,
    assignee_id: s.assignee_id,
    assignee_name: s.assignee_name,
    decision: s.decision || '(pending)',
  })));

  console.log('\n=== 4. NIK user DANU AMPARIAN (untuk cek match) ===');
  const danu = await pool.query(`
    SELECT id, name, position FROM employees
    WHERE name ILIKE '%danu%amparian%' OR name ILIKE '%DANU AMPARIAN%'
  `);
  console.table(danu.rows);

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
