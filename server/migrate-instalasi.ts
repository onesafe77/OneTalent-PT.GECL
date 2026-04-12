import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("Starting manual migration for SPIP Instalasi...");

    try {
        console.log("Creating spip_instalasi table...");
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS spip_instalasi (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            no INTEGER,
            jenis_spip TEXT NOT NULL DEFAULT 'INSTALASI',
            jenis_unit TEXT NOT NULL,
            kategori TEXT NOT NULL DEFAULT 'Instalasi Lainnya',
            nomor_register TEXT NOT NULL UNIQUE,
            merk TEXT,
            type TEXT,
            kapasitas TEXT,
            area_lokasi TEXT NOT NULL,
            tahun_pembuatan INTEGER,
            komisioner TEXT,
            no_sertifikat TEXT,
            tgl_sertifikat TIMESTAMP,
            exp_sertifikat TIMESTAMP,
            keterangan TEXT,
            status_unit TEXT NOT NULL DEFAULT 'AKTIF',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);

        console.log("Creating indexes for spip_instalasi...");
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_spip_instalasi_register" ON spip_instalasi (nomor_register);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_spip_instalasi_kategori" ON spip_instalasi (kategori);`);

        console.log("Migration completed successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
