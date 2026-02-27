import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addEvidenceColumn() {
    try {
        // Add evidence_url column to fms_violations
        await pool.query(`
      ALTER TABLE fms_violations 
      ADD COLUMN IF NOT EXISTS evidence_url TEXT
    `);
        console.log('✅ Added evidence_url column to fms_violations');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

addEvidenceColumn();
