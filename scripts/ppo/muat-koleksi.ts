// Muat seluruh koleksi PPO ke pengetahuan_potongan (produksi). Embedding diambil dari cache hasil
// evaluasi bila ada (tanpa biaya); yang belum ada dibuat lewat OpenRouter lalu ditambahkan ke cache.
// Jalankan: npx tsx scripts/ppo/muat-koleksi.ts <folder-cache>
import fs from "node:fs";
import path from "node:path";

for (const m of fs.readFileSync(".env", "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
const { db } = await import("../../server/db");
const { sql } = await import("drizzle-orm");
const { muatUlangDokumen, embedderOpenRouter, kunciCache } = await import("../../server/lib/pengetahuan/muat");

const folder = process.argv[2]; const berkasCache = path.join(folder, "embedding-cache.json");
const cache: Record<string, number[]> = fs.existsSync(berkasCache) ? JSON.parse(fs.readFileSync(berkasCache, "utf8")) : {};
const remote = embedderOpenRouter(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "");
let dariCache = 0, baru = 0;
const embed = async (teks: string[]) => {
  const belum = teks.filter((t) => !cache[kunciCache(t)]);
  if (belum.length) { const v = await remote(belum); belum.forEach((t, i) => (cache[kunciCache(t)] = v[i])); baru += belum.length; fs.writeFileSync(berkasCache, JSON.stringify(cache)); }
  dariCache += teks.length - belum.length;
  return teks.map((t) => cache[kunciCache(t)]);
};

const dok = (await db.execute(sql`select id, document_code from document_masterlist where lifecycle_status='PUBLISHED' and document_code ilike '%-PPO-%' order by document_code`)).rows as any[];
const hasil: any[] = [];
for (const d of dok) {
  try { hasil.push(await muatUlangDokumen(db, d.id, embed)); }
  catch (e: any) { hasil.push({ kode: d.document_code, status: "gagal", potongan: 0, alasan: e.message }); }
  process.stdout.write(`\r  ${hasil.length}/${dok.length}`);
}
console.log(`\ndimuat ${hasil.filter((h) => h.status === "dimuat").length}, dikecualikan ${hasil.filter((h) => h.status === "dikecualikan").length}, gagal ${hasil.filter((h) => h.status === "gagal").length}`);
console.log(`potongan ${hasil.reduce((a, h) => a + h.potongan, 0)} | embedding dari cache ${dariCache}, baru ${baru}`);
for (const h of hasil.filter((h) => h.status !== "dimuat")) console.log(`  ${h.status}: ${h.kode} — ${h.alasan}`);
fs.writeFileSync(path.join(folder, "hasil-muat.json"), JSON.stringify(hasil, null, 2));
process.exit(0);
