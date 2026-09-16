// Evaluasi pencarian hibrida SUNGGUHAN di Postgres produksi (hanya membaca). Vektor soal dari cache.
// Jalankan: npx tsx scripts/ppo/evaluasi-postgres.ts <folder-cache>
import fs from "node:fs";
import path from "node:path";
for (const m of fs.readFileSync(".env", "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
const { db } = await import("../../server/db");
const { cariDokumen } = await import("../../server/lib/pengetahuan/cari");
const { kunciCache } = await import("../../server/lib/pengetahuan/muat");
const cache = JSON.parse(fs.readFileSync(path.join(process.argv[2], "embedding-cache.json"), "utf8"));
const soal = JSON.parse(fs.readFileSync("scripts/ppo/soal-uji.json", "utf8"));

let d1 = 0, d5 = 0, f5 = 0, rr = 0; const rinci: string[] = []; const waktu: number[] = [];
for (const s of soal) {
  const v = cache[kunciCache(s.q)]; if (!v) throw new Error("vektor soal tidak ada di cache: " + s.q);
  const t0 = performance.now();
  const hasil = await cariDokumen(db, s.q, v, { k: 10 });
  waktu.push(performance.now() - t0);
  const pos = hasil.findIndex((h) => s.dok.includes(h.kodeDokumen));
  if (pos === 0) d1++; if (pos >= 0 && pos < 5) d5++; if (pos >= 0) rr += 1 / (pos + 1);
  const frasaOk = !s.frasa || hasil.slice(0, 5).some((h) => s.dok.includes(h.kodeDokumen) && h.teks.toLowerCase().includes(s.frasa.toLowerCase()));
  if (frasaOk) f5++;
  if (pos !== 0 || !frasaOk) rinci.push(`  ${pos === 0 ? "≈" : "✗"} ${s.q}\n      teratas: ${hasil[0]?.kodeDokumen} R${hasil[0]?.revisi} hal.${hasil[0]?.halamanAwal} | dok benar di peringkat ${pos < 0 ? ">10" : pos + 1}${frasaOk ? "" : " | FRASA tak ada di 5 teratas"}`);
}
waktu.sort((a, b) => a - b);
console.log(`Postgres hibrida — dok@1 ${d1}/${soal.length} | dok@5 ${d5}/${soal.length} | frasa@5 ${f5}/${soal.length} | MRR ${(rr / soal.length).toFixed(3)}`);
console.log(`waktu cari (tanpa embedding soal): median ${waktu[Math.floor(waktu.length / 2)].toFixed(0)} ms, maks ${waktu[waktu.length - 1].toFixed(0)} ms`);
console.log(rinci.join("\n"));
process.exit(0);
