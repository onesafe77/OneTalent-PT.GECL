import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
    console.log("🚀 Starting Sidak Mesin Las DB Fix...");
    try {
        // Check if table exists
        const tableCheck = await db.execute(sql`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'sidak_mesin_las_sessions'
        );
    `);
        console.log("Table exists check:", tableCheck.rows[0]);

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sidak_mesin_las_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tanggal TEXT NOT NULL,
        nama_objek_inspeksi TEXT NOT NULL,
        lokasi TEXT NOT NULL,
        shift VARCHAR(50),
        penanggung_jawab TEXT,
        total_mesin_las INTEGER DEFAULT 0,
        activity_photos TEXT[],
        created_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE sidak_mesin_las_sessions ADD COLUMN IF NOT EXISTS waktu VARCHAR(20);

      CREATE TABLE IF NOT EXISTS sidak_mesin_las_records (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL REFERENCES sidak_mesin_las_sessions(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        inspection_results JSONB NOT NULL DEFAULT '{}',
        tindak_lanjut_perbaikan JSONB NOT NULL DEFAULT '{}',
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE sidak_mesin_las_records ADD COLUMN IF NOT EXISTS no_register_mesin_las VARCHAR;

      CREATE TABLE IF NOT EXISTS sidak_mesin_las_observers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL REFERENCES sidak_mesin_las_sessions(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        nama TEXT NOT NULL,
        perusahaan TEXT,
        tanda_tangan TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("✅ Migration completed successfully");

        // Debug: List columns
        const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sidak_mesin_las_sessions'
    `);
        console.log("Current columns in sidak_mesin_las_sessions:", columns.rows.map(r => r.column_name));

        process.exit(0);
    } catch (e) {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
