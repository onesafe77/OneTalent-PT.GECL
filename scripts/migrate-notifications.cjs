// Additive migration: create `notifications` table (lonceng header). Safe / idempotent.
const { Client } = require('pg');
require('dotenv').config();
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      type varchar(20) NOT NULL,
      title text NOT NULL,
      body text,
      link text,
      meta jsonb,
      created_at timestamp DEFAULT now()
    );
  `);
  await c.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON notifications (created_at);`);
  const r = await c.query(`SELECT to_regclass('public.notifications') AS tbl;`);
  console.log('notifications table:', r.rows[0].tbl);
  await c.end();
})().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
