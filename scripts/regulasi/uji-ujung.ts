// Uji ujung-ke-ujung modul regulasi di Postgres sementara (PGlite + pgvector). TIDAK menulis ke produksi.
// Memuat PDF contoh dari folder (argumen 1), menerbitkan dengan embedding sungguhan, lalu:
//  - memeriksa invarian (jumlah potongan tersimpan, status_muat, tarik/terbit ulang, gerbang status)
//  - mengukur mutu pencarian pada soal emas (scripts/regulasi/soal-uji.json) bila ada.
// Jalankan: npx tsx scripts/regulasi/uji-ujung.ts <folder-pdf>
import assert from "node:assert";
import fs from "node:fs";

for (const m of fs.readFileSync(".env", "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
const { PGlite } = await import("@electric-sql/pglite");
const { vector } = await import("@electric-sql/pglite/vector");
const { drizzle } = await import("drizzle-orm/pglite");
const skema = await import("../../shared/schema");
const { terbitkanRegulasi, tarikRegulasi } = await import("../../server/lib/regulasi/muat");
const { cariRegulasi } = await import("../../server/lib/regulasi/cari");
const { embedderOpenRouter } = await import("../../server/lib/pengetahuan/muat");
const { lupakanIndeks } = await import("../../server/lib/pengetahuan/cari");
const { kunciOpenRouter } = await import("../../server/ai-config");

const dir = process.argv[2];
const embed = embedderOpenRouter(kunciOpenRouter());
const pgl = new PGlite({ extensions: { vector } });
await pgl.exec(`CREATE TABLE uploaded_files (id varchar primary key, data text, mime_type text, filename text, created_at timestamp);`);
await pgl.exec(fs.readFileSync("migrations/2026-09-17_pengetahuan_potongan.sql", "utf8"));
await pgl.exec(fs.readFileSync("migrations/2026-09-17_regulasi.sql", "utf8"));
const db = drizzle(pgl, { schema: skema });

const DAFTAR = [
  ["UU_1_1970.pdf", "UU", "1", 1970, "Keselamatan Kerja", "k3", "berlaku"],
  ["UU_32_2009.pdf", "UU", "32", 2009, "Perlindungan dan Pengelolaan Lingkungan Hidup", "lingkungan", "berlaku"],
  ["UU_3_2020.pdf", "UU", "3", 2020, "Perubahan atas Undang-Undang Nomor 4 Tahun 2009 tentang Pertambangan Mineral dan Batubara", "minerba", "berlaku"],
  ["PP_50_2012.pdf", "PP", "50", 2012, "Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja", "k3", "berlaku"],
  ["PP_78_2010.pdf", "PP", "78", 2010, "Reklamasi dan Pascatambang", "minerba", "berlaku"],
  ["PP_96_2021.pdf", "PP", "96", 2021, "Pelaksanaan Kegiatan Usaha Pertambangan Mineral dan Batubara", "minerba", "berlaku"],
  ["PERMEN_ESDM_26_2018.pdf", "Permen ESDM", "26", 2018, "Pelaksanaan Kaidah Pertambangan yang Baik dan Pengawasan Pertambangan Mineral dan Batubara", "minerba", "berlaku"],
  ["KEPMEN_1827K_2018.pdf", "Kepmen ESDM", "1827 K/30/MEM", 2018, "Pedoman Pelaksanaan Kaidah Teknik Pertambangan yang Baik", "minerba", "berlaku"],
] as const;

const t0 = Date.now();
for (const [f, jenis, nomor, tahun, judul, bidang, status] of DAFTAR) {
  const id = f.replace(".pdf", "");
  await pgl.query(`insert into uploaded_files (id, data, mime_type, filename) values ($1, $2, 'application/pdf', $3)`, [id, fs.readFileSync(`${dir}/${f}`).toString("base64"), f]);
  await pgl.query(`insert into regulasi (id, jenis, nomor, tahun, judul, bidang, status, berkas_id) values ($1,$2,$3,$4,$5,$6,$7,$1)`, [id, jenis, nomor, tahun, judul, bidang, status]);
  try {
    const r = await terbitkanRegulasi(db, id, embed);
    const n = (await pgl.query<any>(`select count(*)::int n from pengetahuan_potongan where document_id=$1`, [id])).rows[0].n;
    assert.equal(n, r.potongan, `${id}: potongan tersimpan ${n} != ${r.potongan}`);
    console.log(`✓ terbit ${id}: ${r.potongan} potongan`);
  } catch (e: any) {
    const s = (await pgl.query<any>(`select status_muat, galat_muat from regulasi where id=$1`, [id])).rows[0];
    console.log(`• ${id} tidak terbit (${s.status_muat}): ${s.galat_muat}`);
    assert.equal(s.status_muat, "gagal");
  }
}
console.log(`waktu muat: ${((Date.now() - t0) / 1000).toFixed(0)} dtk`);

// Invarian: tarik lalu terbit ulang tidak menggandakan potongan.
const sebelum = (await pgl.query<any>(`select count(*)::int n from pengetahuan_potongan where document_id='PP_78_2010'`)).rows[0].n;
await tarikRegulasi(db, "PP_78_2010");
assert.equal((await pgl.query<any>(`select count(*)::int n from pengetahuan_potongan where document_id='PP_78_2010'`)).rows[0].n, 0);
await terbitkanRegulasi(db, "PP_78_2010", embed);
assert.equal((await pgl.query<any>(`select count(*)::int n from pengetahuan_potongan where document_id='PP_78_2010'`)).rows[0].n, sebelum);
console.log("✓ tarik & terbit ulang: tanpa duplikat");

const vek = async (q: string) => (await embed([q]))[0];

// Rujukan eksplisit mengambil pasal persis.
const r1 = await cariRegulasi(db, "apa isi pasal 9 UU 1/1970", await vek("apa isi pasal 9 UU 1/1970"));
assert.ok(r1[0]?.langsung && /Pasal 9\b/.test(r1[0].bagian) && r1[0].label === "UU 1/1970", "rujukan eksplisit pasal 9 UU 1/1970");
console.log("✓ rujukan eksplisit:", r1[0].label, r1[0].bagian);

// Gerbang status: peraturan yang sama dicabut → turun peringkat.
const q2 = "kewajiban reklamasi dan pascatambang";
const awal = (await cariRegulasi(db, q2, await vek(q2)))[0];
await pgl.query(`update regulasi set status='dicabut', dicabut_oleh='PP 96/2021' where id=$1`, [awal.regulasiId]);
const setelah = await cariRegulasi(db, q2, await vek(q2));
if (!(setelah[0].regulasiId !== awal.regulasiId)) console.log("DEBUG sebelum/sesudah:", (await cariRegulasi(db, q2, await vek(q2))).slice(0, 6).map((x) => [x.label, x.status, x.skor, x.bagian]));
assert.ok(setelah[0].regulasiId !== awal.regulasiId, "peraturan dicabut tidak boleh tetap teratas");
await pgl.query(`update regulasi set status='berlaku', dicabut_oleh=null where id=$1`, [awal.regulasiId]);
console.log(`✓ gerbang status: ${awal.label} teratas → setelah dicabut teratas ${setelah[0].label}`);

if (process.argv[3] === "--dump") {
  const semua = (await pgl.query<any>(`select kode_dokumen, bagian, jenis, teks from pengetahuan_potongan order by kode_dokumen, urutan`)).rows;
  fs.writeFileSync(process.argv[4], JSON.stringify(semua));
  console.log("dump:", semua.length);
}

const soalBerkas = "scripts/regulasi/soal-uji.json";
if (fs.existsSync(soalBerkas)) {
  // "alt": jawaban lain yang SAH (frasa terverifikasi ada di pasal itu), bukan pelonggaran kunci.
  const soal: { q: string; label: string; frasa: string; jenis: string; alt?: { label: string; frasa: string }[] }[] = JSON.parse(fs.readFileSync(soalBerkas, "utf8"));
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  let rr = 0, at1 = 0, at8 = 0; const perJenis: Record<string, number[]> = {};
  for (const s of soal) {
    const h = await cariRegulasi(db, s.q, await vek(s.q));
    const kunci = [{ label: s.label, frasa: s.frasa }, ...(s.alt || [])];
    const pos = h.findIndex((x) => kunci.some((kk) => x.label === kk.label && norm(x.teks).includes(norm(kk.frasa))));
    const nilai = pos >= 0 ? 1 / (pos + 1) : 0;
    rr += nilai; if (pos === 0) at1++; if (pos >= 0) at8++;
    (perJenis[s.jenis] ||= []).push(nilai);
    if (pos !== 0) console.log(`  ${pos < 0 ? "✗ tidak ada" : `~ posisi ${pos + 1}`}: ${s.q}  → teratas ${h[0]?.label} ${h[0]?.bagian}`);
    if (pos !== 0 && process.argv.includes("--tunjuk")) h.slice(0, 2).forEach((x, i) => console.log(`      #${i + 1} ${x.label} ${x.bagian.split(" › ").pop()}: ${x.teks.replace(/\s+/g, " ").slice(0, 230)}`));
  }
  console.log(`\nSOAL EMAS ${soal.length}: MRR ${(rr / soal.length).toFixed(3)} | benar@1 ${at1} | benar@8 ${at8}`);
  for (const [j, v] of Object.entries(perJenis)) console.log(`  ${j}: MRR ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)} (${v.length} soal)`);
}
process.exit(0);
