// Cek KELENGKAPAN pemotongan PPO: berapa persen kata di halaman isi (sesudah kepala/kaki dibuang)
// yang benar-benar ada di potongan. Hanya membaca database. Bukti bahwa tidak ada teks prosedur
// yang hilang sebelum embedding. Jalankan: npx tsx scripts/ppo-cek-kelengkapan.ts
import fs from "node:fs";
import pg from "pg";
import { ekstrakHalaman, potongDokumen, buangKepalaKaki, pisahkanPembuka } from "../server/lib/ppo/potong";

const env = fs.readFileSync(".env", "utf8").match(/^DATABASE_URL=(.*)$/m)![1].trim().replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: env, ssl: { rejectUnauthorized: false } });
await c.connect();
const docs = (await c.query(`select m.document_code kode, m.title judul, m.current_revision revisi, coalesce(v.signed_file_path, v.file_path) jalur
  from document_masterlist m join document_versions v on v.document_id=m.id where m.lifecycle_status='PUBLISHED' and v.status='ACTIVE' order by 1`)).rows;

const kata = (s: string) => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
const hasil: { kode: string; cakupan: number; hilang: string[] }[] = [];
for (const d of docs) {
  const f = (await c.query(`select data from uploaded_files where id=$1`, [d.jalur.split("/").pop()])).rows[0];
  const hal = await ekstrakHalaman(new Uint8Array(Buffer.from(f.data, "base64")));
  const { isi } = pisahkanPembuka(buangKepalaKaki(hal).halaman);
  const sumber = isi.flatMap((h) => h.baris).filter((b) => !/\.{6,}\s*\d*\s*$/.test(b) && !/^DAFTAR ISI$/i.test(b)).join(" ");
  const { potongan } = potongDokumen(hal, { kode: d.kode, judul: d.judul, revisi: +d.revisi });
  // Hitung per KEMUNCULAN (multiset), bukan himpunan: kalimat yang hilang tetap ketahuan
  // walau kata-katanya juga muncul di tempat lain.
  const stok = new Map<string, number>();
  for (const k of kata(potongan.map((p) => p.teks).join(" "))) stok.set(k, (stok.get(k) || 0) + 1);
  const hilang: string[] = []; let total = 0, ada = 0;
  for (const k of kata(sumber)) {
    total++;
    const n = stok.get(k) || 0;
    if (n > 0) { ada++; stok.set(k, n - 1); } else hilang.push(k);
  }
  hasil.push({ kode: d.kode, cakupan: total ? ada / total : 1, hilang });
}
await c.end();
hasil.sort((a, b) => a.cakupan - b.cakupan);
const rata = hasil.reduce((a, h) => a + h.cakupan, 0) / hasil.length;
console.log(`rata-rata cakupan: ${(rata * 100).toFixed(2)}% | dokumen < 99%: ${hasil.filter((h) => h.cakupan < 0.99).length} dari ${hasil.length}`);
for (const h of hasil.slice(0, 8)) {
  const frek = new Map<string, number>(); for (const k of h.hilang) frek.set(k, (frek.get(k) || 0) + 1);
  console.log(`  ${(h.cakupan * 100).toFixed(2)}%  ${h.kode}  hilang ${h.hilang.length} kata: ${Array.from(frek.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k}×${n}`).join(", ")}`);
}
