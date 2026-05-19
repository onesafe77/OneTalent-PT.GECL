import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

// Daftar klausul sesuai Kepmen ESDM No. 1827 K/30/MEM/2018 Lampiran IV
// 7 elemen utama + 48 sub-elemen = 55 records
const SMKP_CLAUSES: Array<{ no: string; title: string; description?: string; sort: number }> = [
  // ELEMEN I — KEBIJAKAN
  { no: 'I', title: 'Kebijakan', sort: 1 },
  { no: 'I.a', title: 'Penyusunan Kebijakan', sort: 2 },
  { no: 'I.b', title: 'Isi Kebijakan', sort: 3 },
  { no: 'I.c', title: 'Penetapan Kebijakan', sort: 4 },
  { no: 'I.d', title: 'Komunikasi Kebijakan', sort: 5 },
  { no: 'I.e', title: 'Tinjauan Kebijakan', sort: 6 },

  // ELEMEN II — PERENCANAAN
  { no: 'II', title: 'Perencanaan', sort: 7 },
  { no: 'II.a', title: 'Penelaahan Awal', sort: 8 },
  { no: 'II.b', title: 'Manajemen Risiko', sort: 9 },
  { no: 'II.c', title: 'Identifikasi dan Kepatuhan Peraturan Perundang-undangan', sort: 10 },
  { no: 'II.d', title: 'Penetapan Tujuan, Sasaran, dan Program K3', sort: 11 },
  { no: 'II.e', title: 'Rencana Kerja, Anggaran, dan Biaya', sort: 12 },

  // ELEMEN III — ORGANISASI DAN PERSONEL
  { no: 'III', title: 'Organisasi dan Personel', sort: 13 },
  { no: 'III.a', title: 'Struktur Organisasi, Tugas, Tanggung Jawab, dan Wewenang', sort: 14 },
  { no: 'III.b', title: 'Penunjukan KTT, Kepala Tambang Bawah Tanah, dan/atau Kepala Kapal Keruk', sort: 15 },
  { no: 'III.c', title: 'Penunjukan PJO untuk Perusahaan Jasa Pertambangan', sort: 16 },
  { no: 'III.d', title: 'Pembentukan Bagian K3 dan KO Pertambangan', sort: 17 },
  { no: 'III.e', title: 'Penunjukan Pengawas Operasional dan Pengawas Teknis', sort: 18 },
  { no: 'III.f', title: 'Penunjukan Tenaga Teknis Pertambangan yang Berkompeten', sort: 19 },
  { no: 'III.g', title: 'Pembentukan Komite Keselamatan Pertambangan', sort: 20 },
  { no: 'III.h', title: 'Penunjukan Tim Tanggap Darurat', sort: 21 },
  { no: 'III.i', title: 'Seleksi dan Penempatan Personel', sort: 22 },
  { no: 'III.j', title: 'Pendidikan, Pelatihan, dan Kompetensi Kerja', sort: 23 },
  { no: 'III.k', title: 'Komunikasi Keselamatan Pertambangan', sort: 24 },
  { no: 'III.l', title: 'Pengelolaan Administrasi Keselamatan Pertambangan', sort: 25 },
  { no: 'III.m', title: 'Partisipasi, Konsultasi, Motivasi, dan Kesadaran', sort: 26 },

  // ELEMEN IV — IMPLEMENTASI
  { no: 'IV', title: 'Implementasi', sort: 27 },
  { no: 'IV.a', title: 'Pelaksanaan Pengelolaan Operasional', sort: 28 },
  { no: 'IV.b', title: 'Pelaksanaan Pengelolaan Lingkungan Kerja', sort: 29 },
  { no: 'IV.c', title: 'Pelaksanaan Pengelolaan Kesehatan Kerja', sort: 30 },
  { no: 'IV.d', title: 'Pelaksanaan Pengelolaan KO Pertambangan', sort: 31 },
  { no: 'IV.e', title: 'Pengelolaan Bahan Peledak dan Peledakan', sort: 32 },
  { no: 'IV.f', title: 'Penetapan Sistem Perancangan dan Rekayasa', sort: 33 },
  { no: 'IV.g', title: 'Penetapan Sistem Pembelian', sort: 34 },
  { no: 'IV.h', title: 'Pemantauan dan Pengelolaan Perusahaan Jasa Pertambangan', sort: 35 },
  { no: 'IV.i', title: 'Pengelolaan Keadaan Darurat', sort: 36 },
  { no: 'IV.j', title: 'Pertolongan Pertama pada Kecelakaan', sort: 37 },
  { no: 'IV.k', title: 'Pelaksanaan Keselamatan di Luar Pekerjaan', sort: 38 },

  // ELEMEN V — PEMANTAUAN, EVALUASI, DAN TINDAK LANJUT
  { no: 'V', title: 'Pemantauan, Evaluasi, dan Tindak Lanjut', sort: 39 },
  { no: 'V.a', title: 'Pemantauan dan Pengukuran Kinerja', sort: 40 },
  { no: 'V.b', title: 'Inspeksi Pelaksanaan Keselamatan Pertambangan', sort: 41 },
  { no: 'V.c', title: 'Evaluasi Kepatuhan Peraturan Perundang-undangan', sort: 42 },
  { no: 'V.d', title: 'Penyelidikan Kecelakaan, Kejadian Berbahaya, dan Penyakit Akibat Kerja', sort: 43 },
  { no: 'V.e', title: 'Evaluasi Pengelolaan Administrasi Keselamatan Pertambangan', sort: 44 },
  { no: 'V.f', title: 'Audit Internal Penerapan SMKP Minerba', sort: 45 },
  { no: 'V.g', title: 'Rencana Perbaikan dan Tindak Lanjut', sort: 46 },

  // ELEMEN VI — DOKUMENTASI
  { no: 'VI', title: 'Dokumentasi', sort: 47 },
  { no: 'VI.a', title: 'Penyusunan Manual SMKP Minerba', sort: 48 },
  { no: 'VI.b', title: 'Pengendalian Dokumen', sort: 49 },
  { no: 'VI.c', title: 'Pengendalian Rekaman', sort: 50 },
  { no: 'VI.d', title: 'Penetapan Jenis Dokumen dan Rekaman', sort: 51 },

  // ELEMEN VII — TINJAUAN MANAJEMEN DAN PENINGKATAN KINERJA
  { no: 'VII', title: 'Tinjauan Manajemen dan Peningkatan Kinerja', sort: 52 },
  { no: 'VII.a', title: 'Tinjauan Hasil Tindak Lanjut Rencana Perbaikan', sort: 53 },
  { no: 'VII.b', title: 'Tinjauan Manajemen oleh Manajemen Tertinggi', sort: 54 },
  { no: 'VII.c', title: 'Pelaksanaan Tinjauan Berkala (Minimal 1 Tahun Sekali)', sort: 55 },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Adding new columns to document_masterlist...');
    await pool.query(`
      ALTER TABLE document_masterlist
        ADD COLUMN IF NOT EXISTS smkp_clause VARCHAR,
        ADD COLUMN IF NOT EXISTS retention_period VARCHAR;
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_doc_masterlist_smkp_clause" ON document_masterlist(smkp_clause);`);

    console.log('Adding TipTap content columns to document_versions...');
    await pool.query(`
      ALTER TABLE document_versions
        ADD COLUMN IF NOT EXISTS content_html TEXT,
        ADD COLUMN IF NOT EXISTS content_json JSONB;
    `);

    console.log('Creating smkp_clauses...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS smkp_clauses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        clause_no VARCHAR NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_smkp_clauses_no" ON smkp_clauses(clause_no);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_smkp_clauses_active" ON smkp_clauses(is_active);`);

    console.log('Creating checklist_templates...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checklist_templates (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        item_name TEXT NOT NULL,
        category TEXT,
        pic_role TEXT,
        department_scope TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by VARCHAR,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_checklist_templates_active" ON checklist_templates(is_active);`);

    console.log('Creating monthly_checklists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS monthly_checklists (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        template_id VARCHAR NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
        item_name TEXT NOT NULL,
        category TEXT,
        pic_id VARCHAR REFERENCES employees(id),
        is_completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        completed_by VARCHAR,
        file_url TEXT,
        file_name TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_monthly_checklist_year_month_template" ON monthly_checklists(year, month, template_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_monthly_checklist_year_month" ON monthly_checklists(year, month);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_monthly_checklist_completed" ON monthly_checklists(is_completed);`);

    console.log('Seeding SMKP clauses (upsert by clause_no)...');
    for (const c of SMKP_CLAUSES) {
      await pool.query(
        `INSERT INTO smkp_clauses (clause_no, title, description, sort_order, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (clause_no) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           sort_order = EXCLUDED.sort_order;`,
        [c.no, c.title, c.description ?? null, c.sort]
      );
    }

    const cnt = await pool.query('SELECT COUNT(*) FROM smkp_clauses');
    console.log(`Done. smkp_clauses rows: ${cnt.rows[0].count}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
