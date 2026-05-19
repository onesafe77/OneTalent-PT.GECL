// Migrasi foto selfie & tanda tangan absensi induksi dari base64 data URL
// menjadi row di tabel uploaded_files + URL /api/uploads/{id} — sama dengan
// pola photoUrl karyawan. Records yang masih pakai data URL akan dikonversi;
// records yang sudah URL (atau corrupt) di-skip.
//
// Jalankan: tsx server/scripts/migrate-induction-photos.ts
// Idempotent: bisa di-run ulang aman.

import pg from "pg";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();
const { Pool } = pg;

interface AttendanceRow {
  id: string;
  nik: string;
  foto_selfie: string | null;
  tanda_tangan: string | null;
}

async function uploadDataUrl(pool: pg.Pool, dataUrl: string, baseName: string): Promise<string | null> {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mimeType = m[1];
  const base64 = m[2];
  // Validate base64 quickly — try to decode a small chunk
  try {
    if (base64.length < 100) return null;
    Buffer.from(base64.slice(0, 80), "base64");
  } catch {
    return null;
  }
  const ext = mimeType.split("/")[1]?.split("+")[0] || "bin";
  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO uploaded_files (id, filename, mime_type, data, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [id, `${baseName}.${ext}`, mimeType, base64]
    );
    return `/api/uploads/${id}`;
  } catch (e: any) {
    console.warn(`  insert failed for ${baseName}: ${e.message}`);
    return null;
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const rows = await pool.query<AttendanceRow>(
      `SELECT id, nik, foto_selfie, tanda_tangan FROM public_induction_attendance`
    );
    console.log(`Total rows: ${rows.rows.length}`);

    let selfieFixed = 0, selfieSkipped = 0, selfieFailed = 0;
    let sigFixed = 0, sigSkipped = 0, sigFailed = 0;

    for (const row of rows.rows) {
      const updates: string[] = [];
      const params: any[] = [];

      // fotoSelfie
      if (row.foto_selfie && row.foto_selfie.startsWith("data:")) {
        const url = await uploadDataUrl(pool, row.foto_selfie, `selfie-${row.nik}-${row.id.slice(0, 8)}`);
        if (url) {
          updates.push(`foto_selfie = $${params.length + 1}`);
          params.push(url);
          selfieFixed++;
        } else {
          // Corrupt base64 → set null supaya UI render fallback "-"
          updates.push(`foto_selfie = NULL`);
          selfieFailed++;
        }
      } else if (row.foto_selfie) {
        selfieSkipped++;
      }

      // tandaTangan
      if (row.tanda_tangan && row.tanda_tangan.startsWith("data:")) {
        const url = await uploadDataUrl(pool, row.tanda_tangan, `signature-${row.nik}-${row.id.slice(0, 8)}`);
        if (url) {
          updates.push(`tanda_tangan = $${params.length + 1}`);
          params.push(url);
          sigFixed++;
        } else {
          // Tanda tangan corrupt → kosongkan supaya tidak break query payload
          updates.push(`tanda_tangan = ''`);
          sigFailed++;
        }
      } else if (row.tanda_tangan) {
        sigSkipped++;
      }

      if (updates.length > 0) {
        params.push(row.id);
        await pool.query(
          `UPDATE public_induction_attendance SET ${updates.join(", ")} WHERE id = $${params.length}`,
          params
        );
      }
    }

    console.log("\n=== Selfie ===");
    console.log(`  Fixed (base64 → URL): ${selfieFixed}`);
    console.log(`  Already URL:          ${selfieSkipped}`);
    console.log(`  Corrupt → set NULL:   ${selfieFailed}`);
    console.log("\n=== Tanda Tangan ===");
    console.log(`  Fixed (base64 → URL): ${sigFixed}`);
    console.log(`  Already URL:          ${sigSkipped}`);
    console.log(`  Corrupt → cleared:    ${sigFailed}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
