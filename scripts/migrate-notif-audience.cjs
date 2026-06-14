// Additive migration: add audience targeting columns to `notifications`. Safe / idempotent.
const { Client } = require('pg');
require('dotenv').config();
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience varchar(20) DEFAULT 'all';`);
  await c.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience_value text;`);
  const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='notifications' AND column_name IN ('audience','audience_value') ORDER BY column_name;`);
  console.log('columns:', r.rows.map(x => x.column_name).join(', '));
  await c.end();
})().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
