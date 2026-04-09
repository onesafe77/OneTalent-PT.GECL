const pg = require('pg');
const { Pool } = pg;

// Read from process.env.DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres",
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        console.log("🚀 Creating missing Hydraulic Jack tables...");

        // Create session table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "sidak_hydraulic_jack_sessions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "tanggal" date NOT NULL,
        "nama_workshop" text NOT NULL,
        "lokasi" text NOT NULL,
        "shift" varchar(50),
        "waktu" varchar(20),
        "penanggung_jawab_area" text,
        "total_hydraulic_jack" integer DEFAULT 0,
        "activity_photos" text[],
        "created_by" varchar,
        "created_at" timestamp DEFAULT now()
      );
    `);
        console.log("✅ Table 'sidak_hydraulic_jack_sessions' created/checked.");

        // Create records table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "sidak_hydraulic_jack_records" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "session_id" varchar NOT NULL REFERENCES "sidak_hydraulic_jack_sessions"("id") ON DELETE CASCADE,
        "ordinal" integer NOT NULL,
        "no_register_peralatan" varchar,
        "inspection_results" jsonb NOT NULL DEFAULT '{}',
        "tindak_lanjut_perbaikan" text,
        "due_date" date,
        "created_at" timestamp DEFAULT now()
      );
    `);
        console.log("✅ Table 'sidak_hydraulic_jack_records' created/checked.");

        // Create observers table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "sidak_hydraulic_jack_observers" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "session_id" varchar NOT NULL REFERENCES "sidak_hydraulic_jack_sessions"("id") ON DELETE CASCADE,
        "ordinal" integer NOT NULL,
        "nama" text NOT NULL,
        "perusahaan" text,
        "tanda_tangan" text,
        "created_at" timestamp DEFAULT now()
      );
    `);
        console.log("✅ Table 'sidak_hydraulic_jack_observers' created/checked.");

        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_hydraulic_jack_sessions_created_by" ON "sidak_hydraulic_jack_sessions" ("created_by");`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_hydraulic_jack_records_session" ON "sidak_hydraulic_jack_records" ("session_id");`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_hydraulic_jack_observers_session" ON "sidak_hydraulic_jack_observers" ("session_id");`);
        console.log("✅ Indexes created/checked.");

        console.log("\n✅ All missing Hydraulic Jack tables are ready!");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await pool.end();
    }
}

run();
