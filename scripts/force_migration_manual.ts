import pg from 'pg';
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    console.log("🚀 Starting MANUAL migration for P3K Tables...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create sidak_p3k_sessions
        console.log("Creating table: sidak_p3k_sessions");
        await client.query(`
      CREATE TABLE IF NOT EXISTS "sidak_p3k_sessions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "tanggal" text NOT NULL,
        "waktu" text NOT NULL,
        "lokasi" text NOT NULL,
        "inspector_name" text NOT NULL,
        "inspector_signature" text,
        "area_responsible_name" text,
        "area_responsible_signature" text,
        "notes" text,
        "created_at" timestamp DEFAULT now()
      );
    `);

        // 2. Create sidak_p3k_items
        console.log("Creating table: sidak_p3k_items");
        await client.query(`
      CREATE TABLE IF NOT EXISTS "sidak_p3k_items" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" varchar NOT NULL REFERENCES "sidak_p3k_sessions"("id") ON DELETE CASCADE,
        "item_name" text NOT NULL,
        "min_qty" integer NOT NULL DEFAULT 0,
        "is_available" boolean NOT NULL DEFAULT false,
        "notes" text,
        "ordinal" integer NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);

        // 3. Create Index
        console.log("Creating index: IDX_p3k_items_session");
        await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_p3k_items_session" ON "sidak_p3k_items" ("session_id");
    `);

        await client.query('COMMIT');
        console.log("✅ Manual Migration Successful!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
