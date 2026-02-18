
import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("Starting manual Behavior Sidak migration...");

    try {
        // 1. Create sidak_behavior_sessions
        console.log("Creating sidak_behavior_sessions table...");
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS sidak_behavior_sessions (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            tanggal TEXT NOT NULL,
            waktu TEXT NOT NULL,
            shift TEXT NOT NULL,
            lokasi TEXT NOT NULL,
            metode_sidak TEXT NOT NULL,
            total_sampel INTEGER NOT NULL DEFAULT 0,
            created_by VARCHAR,
            activity_photos TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_behavior_sessions_created_by" ON sidak_behavior_sessions (created_by);`);

        // 2. Create sidak_behavior_records
        console.log("Creating sidak_behavior_records table...");
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS sidak_behavior_records (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id VARCHAR NOT NULL REFERENCES sidak_behavior_sessions(id) ON DELETE CASCADE,
            ordinal INTEGER NOT NULL,
            nama_driver TEXT NOT NULL,
            nomor_lambung TEXT NOT NULL,
            mata_tertutup BOOLEAN NOT NULL DEFAULT false,
            sering_mengedip BOOLEAN NOT NULL DEFAULT false,
            menguap_berulang BOOLEAN NOT NULL DEFAULT false,
            kepala_mengangguk BOOLEAN NOT NULL DEFAULT false,
            postur_membungkuk BOOLEAN NOT NULL DEFAULT false,
            keluar_jalur BOOLEAN NOT NULL DEFAULT false,
            reaksi_radio_lambat BOOLEAN NOT NULL DEFAULT false,
            tidak_merespon_radio BOOLEAN NOT NULL DEFAULT false,
            alarm_fatigue_fms_aktif BOOLEAN NOT NULL DEFAULT false,
            mengemudi_tidak_stabil BOOLEAN NOT NULL DEFAULT false,
            edukasi_two_way BOOLEAN NOT NULL DEFAULT false,
            monitoring_ulang BOOLEAN NOT NULL DEFAULT false,
            instruksi_berhenti BOOLEAN NOT NULL DEFAULT false,
            stretching_minum BOOLEAN NOT NULL DEFAULT false,
            parkir_aman BOOLEAN NOT NULL DEFAULT false,
            ganti_driver BOOLEAN NOT NULL DEFAULT false,
            mandatory_rest BOOLEAN NOT NULL DEFAULT false,
            koordinasi_pengawas BOOLEAN NOT NULL DEFAULT false,
            driver_signature TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_behavior_records_session" ON sidak_behavior_records (session_id);`);
        await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "sidak_behavior_session_ordinal_unique" ON sidak_behavior_records (session_id, ordinal);`);

        // 3. Create sidak_behavior_observers
        console.log("Creating sidak_behavior_observers table...");
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS sidak_behavior_observers (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id VARCHAR NOT NULL REFERENCES sidak_behavior_sessions(id) ON DELETE CASCADE,
            nama TEXT NOT NULL,
            nik TEXT NOT NULL,
            perusahaan TEXT NOT NULL,
            jabatan TEXT NOT NULL,
            signature_data_url TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_behavior_observers_session" ON sidak_behavior_observers (session_id);`);

        console.log("Behavior migration completed successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Behavior migration failed:", error);
        process.exit(1);
    }
}

migrate();
