// Reseed SMKP clauses sesuai Kepmen ESDM No. 1827 K/30/MEM/2018 Lampiran IV.
// DELETE all existing rows, then INSERT 55 records (7 elemen utama + 48 sub-elemen).
// Run via: tsx server/scripts/reseed-smkp-clauses.ts

import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

interface ClauseSeed {
  no: string;
  title: string;
  description?: string;
}

const CLAUSES: ClauseSeed[] = [
  // ELEMEN I — KEBIJAKAN
  { no: 'I', title: 'Kebijakan' },
  { no: 'I.a', title: 'Penyusunan Kebijakan' },
  { no: 'I.b', title: 'Isi Kebijakan' },
  { no: 'I.c', title: 'Penetapan Kebijakan' },
  { no: 'I.d', title: 'Komunikasi Kebijakan' },
  { no: 'I.e', title: 'Tinjauan Kebijakan' },

  // ELEMEN II — PERENCANAAN
  { no: 'II', title: 'Perencanaan' },
  { no: 'II.a', title: 'Penelaahan Awal' },
  { no: 'II.b', title: 'Manajemen Risiko' },
  { no: 'II.c', title: 'Identifikasi dan Kepatuhan Peraturan Perundang-undangan' },
  { no: 'II.d', title: 'Penetapan Tujuan, Sasaran, dan Program K3' },
  { no: 'II.e', title: 'Rencana Kerja, Anggaran, dan Biaya' },

  // ELEMEN III — ORGANISASI DAN PERSONEL
  { no: 'III', title: 'Organisasi dan Personel' },
  { no: 'III.a', title: 'Struktur Organisasi, Tugas, Tanggung Jawab, dan Wewenang' },
  { no: 'III.b', title: 'Penunjukan KTT, Kepala Tambang Bawah Tanah, dan/atau Kepala Kapal Keruk' },
  { no: 'III.c', title: 'Penunjukan PJO untuk Perusahaan Jasa Pertambangan' },
  { no: 'III.d', title: 'Pembentukan Bagian K3 dan KO Pertambangan' },
  { no: 'III.e', title: 'Penunjukan Pengawas Operasional dan Pengawas Teknis' },
  { no: 'III.f', title: 'Penunjukan Tenaga Teknis Pertambangan yang Berkompeten' },
  { no: 'III.g', title: 'Pembentukan Komite Keselamatan Pertambangan' },
  { no: 'III.h', title: 'Penunjukan Tim Tanggap Darurat' },
  { no: 'III.i', title: 'Seleksi dan Penempatan Personel' },
  { no: 'III.j', title: 'Pendidikan, Pelatihan, dan Kompetensi Kerja' },
  { no: 'III.k', title: 'Komunikasi Keselamatan Pertambangan' },
  { no: 'III.l', title: 'Pengelolaan Administrasi Keselamatan Pertambangan' },
  { no: 'III.m', title: 'Partisipasi, Konsultasi, Motivasi, dan Kesadaran' },

  // ELEMEN IV — IMPLEMENTASI
  { no: 'IV', title: 'Implementasi' },
  { no: 'IV.a', title: 'Pelaksanaan Pengelolaan Operasional' },
  { no: 'IV.b', title: 'Pelaksanaan Pengelolaan Lingkungan Kerja' },
  { no: 'IV.c', title: 'Pelaksanaan Pengelolaan Kesehatan Kerja' },
  { no: 'IV.d', title: 'Pelaksanaan Pengelolaan KO Pertambangan' },
  { no: 'IV.e', title: 'Pengelolaan Bahan Peledak dan Peledakan' },
  { no: 'IV.f', title: 'Penetapan Sistem Perancangan dan Rekayasa' },
  { no: 'IV.g', title: 'Penetapan Sistem Pembelian' },
  { no: 'IV.h', title: 'Pemantauan dan Pengelolaan Perusahaan Jasa Pertambangan' },
  { no: 'IV.i', title: 'Pengelolaan Keadaan Darurat' },
  { no: 'IV.j', title: 'Pertolongan Pertama pada Kecelakaan' },
  { no: 'IV.k', title: 'Pelaksanaan Keselamatan di Luar Pekerjaan' },

  // ELEMEN V — PEMANTAUAN, EVALUASI, DAN TINDAK LANJUT
  { no: 'V', title: 'Pemantauan, Evaluasi, dan Tindak Lanjut' },
  { no: 'V.a', title: 'Pemantauan dan Pengukuran Kinerja' },
  { no: 'V.b', title: 'Inspeksi Pelaksanaan Keselamatan Pertambangan' },
  { no: 'V.c', title: 'Evaluasi Kepatuhan Peraturan Perundang-undangan' },
  { no: 'V.d', title: 'Penyelidikan Kecelakaan, Kejadian Berbahaya, dan Penyakit Akibat Kerja' },
  { no: 'V.e', title: 'Evaluasi Pengelolaan Administrasi Keselamatan Pertambangan' },
  { no: 'V.f', title: 'Audit Internal Penerapan SMKP Minerba' },
  { no: 'V.g', title: 'Rencana Perbaikan dan Tindak Lanjut' },

  // ELEMEN VI — DOKUMENTASI
  { no: 'VI', title: 'Dokumentasi' },
  { no: 'VI.a', title: 'Penyusunan Manual SMKP Minerba' },
  { no: 'VI.b', title: 'Pengendalian Dokumen' },
  { no: 'VI.c', title: 'Pengendalian Rekaman' },
  { no: 'VI.d', title: 'Penetapan Jenis Dokumen dan Rekaman' },

  // ELEMEN VII — TINJAUAN MANAJEMEN DAN PENINGKATAN KINERJA
  { no: 'VII', title: 'Tinjauan Manajemen dan Peningkatan Kinerja' },
  { no: 'VII.a', title: 'Tinjauan Hasil Tindak Lanjut Rencana Perbaikan' },
  { no: 'VII.b', title: 'Tinjauan Manajemen oleh Manajemen Tertinggi' },
  { no: 'VII.c', title: 'Pelaksanaan Tinjauan Berkala (Minimal 1 Tahun Sekali)' },
];

async function main() {
  if (CLAUSES.length !== 55) {
    throw new Error(`Expected 55 clauses, got ${CLAUSES.length}`);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const before = await pool.query('SELECT COUNT(*) FROM smkp_clauses');
    console.log(`Existing rows: ${before.rows[0].count}`);

    console.log('Deleting all existing smkp_clauses rows...');
    const del = await pool.query('DELETE FROM smkp_clauses');
    console.log(`  Deleted: ${del.rowCount} rows`);

    console.log(`Inserting ${CLAUSES.length} new clauses...`);
    for (let i = 0; i < CLAUSES.length; i++) {
      const c = CLAUSES[i];
      await pool.query(
        `INSERT INTO smkp_clauses (clause_no, title, description, sort_order, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [c.no, c.title, c.description ?? null, i + 1]
      );
    }

    const after = await pool.query('SELECT COUNT(*) FROM smkp_clauses');
    console.log(`\nDone. Total rows now: ${after.rows[0].count} (expected 55)`);

    // Print sample for verification
    const sample = await pool.query(
      `SELECT clause_no, title FROM smkp_clauses ORDER BY sort_order LIMIT 10`
    );
    console.log('\nFirst 10 rows:');
    sample.rows.forEach((r) => console.log(`  ${r.clause_no.padEnd(8)} ${r.title}`));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
