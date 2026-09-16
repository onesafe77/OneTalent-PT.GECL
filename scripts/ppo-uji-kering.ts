// UJI KERING koleksi PPO: ekstrak + bersihkan + potong 90 PPO berlaku, TANPA embedding & TANPA
// menulis ke database. Hasilnya laporan untuk diperiksa manusia sebelum embedding disetujui.
// Jalankan: npx tsx scripts/ppo-uji-kering.ts <folder-keluaran>
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { ekstrakHalaman, potongDokumen, type Potongan } from "../server/lib/ppo/potong";

const keluar = process.argv[2] || "ppo-uji-kering";
fs.mkdirSync(keluar, { recursive: true });
const env = fs.readFileSync(".env", "utf8").match(/^DATABASE_URL=(.*)$/m)![1].trim().replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: env, ssl: { rejectUnauthorized: false } });
await c.connect();

// Hanya revisi ACTIVE dari dokumen PUBLISHED — revisi SUPERSEDED tidak boleh jadi jawaban.
const docs = (await c.query(`
  select m.document_code kode, m.title judul, m.department dept, m.current_revision revisi, m.effective_date berlaku,
         coalesce(v.signed_file_path, v.file_path) jalur, v.revision_number rev_file
  from document_masterlist m join document_versions v on v.document_id = m.id
  where m.lifecycle_status = 'PUBLISHED' and v.status = 'ACTIVE' order by m.document_code`)).rows;

type Hasil = { kode: string; judul: string; revisi: number; halaman: number; potongan: Potongan[]; dibuang: string[]; catatan: string[]; kepalaBasi: string };
const semua: Hasil[] = [];
for (const d of docs) {
  const f = (await c.query(`select data from uploaded_files where id=$1`, [d.jalur.split("/").pop()])).rows[0];
  const catatan: string[] = [];
  if (+d.rev_file !== +d.revisi) catatan.push(`revisi file R${d.rev_file} ≠ daftar induk R${d.revisi}`);
  const hal = await ekstrakHalaman(new Uint8Array(Buffer.from(f.data, "base64")));
  const teksSemua = hal.flatMap((h) => h.baris).join("\n");
  // Acuan revisi: tabel CATATAN REVISI (entri "Rnn" terakhir) — cocok dgn nama file & daftar induk.
  // Kepala/kaki halaman PDF sering TIDAK diperbarui saat revisi (mis. R15 tapi kepala halaman R07),
  // jadi dilaporkan terpisah sebagai temuan pengendalian dokumen, bukan kesalahan data.
  const pembuka = hal.slice(0, 4).flatMap((h) => h.baris);
  const entri = pembuka.map((b) => b.match(/^R(\d{2})\b/)?.[1]).filter(Boolean).map(Number);
  const revRiwayat = entri.length ? Math.max(...entri) : undefined;
  if (revRiwayat !== undefined && revRiwayat !== +d.revisi) catatan.push(`tabel riwayat revisi sampai R${revRiwayat}, daftar induk R${d.revisi}`);
  const kepala = Array.from(teksSemua.matchAll(/[–-]\s*R(\d{2})\b|Revisi\s*:\s*(\d{1,2})\b/gi)).map((m) => +(m[1] ?? m[2]));
  const frek = new Map<number, number>(); for (const k of kepala) frek.set(k, (frek.get(k) || 0) + 1);
  const revKepala = kepala.length ? Array.from(frek.entries()).sort((a, b) => b[1] - a[1])[0][0] : undefined;
  const kepalaBasi = revKepala !== undefined && revKepala !== +d.revisi ? `kepala/kaki halaman PDF menulis R${String(revKepala).padStart(2, "0")}` : "";
  const { potongan, dibuang } = potongDokumen(hal, { kode: d.kode, judul: d.judul, revisi: +d.revisi, departemen: d.dept });
  if (!potongan.some((p) => p.jenis === "isi")) catatan.push("TIDAK ADA potongan isi — struktur tidak dikenali");
  semua.push({ kode: d.kode, judul: d.judul, revisi: +d.revisi, halaman: hal.length, potongan, dibuang, catatan, kepalaBasi });
}
await c.end();

// ------------------------------------------------ statistik
const pot = semua.flatMap((h) => h.potongan.map((p) => ({ ...p, kode: h.kode })));
const diEmbed = pot.filter((p) => p.jenis !== "diagram");
const perJenis: Record<string, number> = {}; for (const p of pot) perJenis[p.jenis] = (perJenis[p.jenis] || 0) + 1;
const panjang = diEmbed.map((p) => p.teks.length).sort((a, b) => a - b);
const kuantil = (q: number) => panjang[Math.floor((panjang.length - 1) * q)];
const perPeringatan: Record<string, number> = {}; for (const p of pot) for (const w of p.peringatan) perPeringatan[w] = (perPeringatan[w] || 0) + 1;
const hitHash = new Map<string, string[]>(); for (const p of diEmbed) hitHash.set(p.hash, (hitHash.get(p.hash) || []).concat(p.kode));
const duplikat = Array.from(hitHash.entries()).filter(([, k]) => k.length > 1);
const tokenPerkiraan = Math.round(diEmbed.reduce((a, p) => a + p.teksEmbed.length, 0) / 4);

const ringkasan = {
  dokumen: semua.length, halaman: semua.reduce((a, h) => a + h.halaman, 0),
  potongan_total: pot.length, potongan_akan_diembed: diEmbed.length, per_jenis: perJenis,
  panjang_huruf: { min: panjang[0], p10: kuantil(0.1), median: kuantil(0.5), p90: kuantil(0.9), maks: panjang[panjang.length - 1] },
  peringatan: perPeringatan, duplikat_isi_identik: duplikat.length,
  perkiraan_token_embedding: tokenPerkiraan,
  dokumen_bermasalah: semua.filter((h) => h.catatan.length).map((h) => ({ kode: h.kode, catatan: h.catatan })),
  temuan_kepala_halaman_basi: semua.filter((h) => h.kepalaBasi).map((h) => `${h.kode} R${String(h.revisi).padStart(2, "0")}: ${h.kepalaBasi}`),
};
fs.writeFileSync(path.join(keluar, "ringkasan.json"), JSON.stringify(ringkasan, null, 2));
fs.writeFileSync(path.join(keluar, "potongan.json"), JSON.stringify(semua, null, 2));

// ------------------------------------------------ halaman tinjauan (HTML)
const esc = (s: string) => s.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]!));
const html = `<!doctype html><meta charset="utf-8"><title>Tinjauan potongan PPO</title>
<style>body{font:14px/1.55 system-ui;margin:24px;max-width:1100px}h2{margin-top:36px;border-top:1px solid #ddd;padding-top:16px}
.p{border:1px solid #e3e3e3;border-radius:8px;padding:10px 12px;margin:8px 0}.m{font:12px ui-monospace,monospace;color:#666}
.w{color:#b3261e;font-weight:600}.diagram{opacity:.55}.riwayat_revisi{background:#fafafa}pre{white-space:pre-wrap;margin:6px 0 0}
details{margin:6px 0;color:#555}</style>
<h1>Tinjauan potongan PPO — uji kering (belum di-embed)</h1><pre>${esc(JSON.stringify(ringkasan, null, 2))}</pre>
${semua.map((h) => `<h2>${esc(h.kode)} R${h.revisi} — ${esc(h.judul)}</h2>
<div class="m">${h.halaman} halaman · ${h.potongan.length} potongan${h.catatan.length ? ` · <span class="w">${esc(h.catatan.join("; "))}</span>` : ""}</div>
<details><summary>${h.dibuang.length} baris kepala/kaki dibuang</summary><pre>${esc(h.dibuang.join("\n"))}</pre></details>
${h.potongan.map((p) => `<div class="p ${p.jenis}"><div class="m">#${p.urutan} · ${p.jenis} · hal. ${p.halamanAwal}${p.halamanAkhir !== p.halamanAwal ? "–" + p.halamanAkhir : ""} · ${p.teks.length} huruf · ${esc(p.bagian)}${p.peringatan.length ? ` · <span class="w">${esc(p.peringatan.join(", "))}</span>` : ""}</div><pre>${esc(p.teksEmbed)}</pre></div>`).join("")}`).join("")}`;
fs.writeFileSync(path.join(keluar, "tinjauan.html"), html);
console.log(JSON.stringify(ringkasan, null, 2));
