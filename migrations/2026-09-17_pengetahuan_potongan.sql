-- Pengetahuan AI: potongan dokumen + embedding (pgvector) untuk pencarian hibrida.
-- Ditulis tangan & dijalankan dalam satu transaksi. Hanya MENAMBAH objek baru; tidak mengubah tabel lama.
-- Batalkan:  DROP TABLE IF EXISTS pengetahuan_potongan;  DROP EXTENSION IF EXISTS vector;
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS pengetahuan_potongan (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  koleksi varchar(40) NOT NULL,
  document_id varchar NOT NULL,
  version_id varchar NOT NULL,
  kode_dokumen varchar(60) NOT NULL,
  judul text NOT NULL,
  revisi integer NOT NULL,
  departemen text,
  kategori text,
  jenis varchar(20) NOT NULL,
  bagian text NOT NULL,
  halaman_awal integer NOT NULL,
  halaman_akhir integer NOT NULL,
  urutan integer NOT NULL,
  teks text NOT NULL,
  teks_embed text NOT NULL,
  hash_teks varchar(16) NOT NULL,
  model_embedding varchar(80) NOT NULL,
  embedding vector(1536) NOT NULL,
  dimuat_pada timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pengetahuan_versi_urutan ON pengetahuan_potongan (version_id, urutan);
CREATE INDEX IF NOT EXISTS idx_pengetahuan_koleksi_dok ON pengetahuan_potongan (koleksi, kode_dokumen);
CREATE INDEX IF NOT EXISTS idx_pengetahuan_embedding ON pengetahuan_potongan USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_pengetahuan_teks ON pengetahuan_potongan USING gin (to_tsvector('simple', teks_embed));
COMMIT;
