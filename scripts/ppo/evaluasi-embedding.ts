// Evaluasi kualitas pencarian koleksi PPO SEBELUM apa pun ditulis ke database produksi.
// - Embedding via OpenRouter (openai/text-embedding-3-small), di-cache lokal per sidik teks.
// - Membandingkan varian teks yang di-embed: "dengan kepala" (identitas dokumen + bagian) vs "isi saja".
// - Metrik per 30 soal di scripts/ppo/soal-uji.json: benar@1, benar@5, MRR — tingkat dokumen & frasa.
// Jalankan: npx tsx scripts/ppo/evaluasi-embedding.ts <potongan.json> <folder-cache>
import fs from "node:fs";
import path from "node:path";
import { hashTeks } from "../../server/lib/ppo/potong";

const MODEL = "openai/text-embedding-3-small";
const [berkasPotongan, folderCache] = process.argv.slice(2);
fs.mkdirSync(folderCache, { recursive: true });
const env = Object.fromEntries(Array.from(fs.readFileSync(".env", "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)).map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")]));
const kunci = env.OPENROUTER_API_KEY || env.OPENAI_API_KEY;

const berkasCache = path.join(folderCache, "embedding-cache.json");
const cache: Record<string, number[]> = fs.existsSync(berkasCache) ? JSON.parse(fs.readFileSync(berkasCache, "utf8")) : {};
let tokenDipakai = 0, biaya = 0;

async function embed(teks: string[]): Promise<number[][]> {
  const kunciCache = teks.map((t) => `${MODEL}:${hashTeks(t)}:${t.length}`);
  const belum = teks.map((t, i) => [t, i] as const).filter(([, i]) => !cache[kunciCache[i]]);
  for (let a = 0; a < belum.length; a += 96) {
    const kelompok = belum.slice(a, a + 96);
    for (let coba = 1; ; coba++) {
      const r = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST", headers: { Authorization: `Bearer ${kunci}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, input: kelompok.map(([t]) => t) }),
      });
      const j: any = await r.json();
      if (r.ok && j.data?.length === kelompok.length) {
        // Urutan hasil dicocokkan lewat index, bukan diasumsikan sama dengan urutan kirim.
        for (const e of j.data) cache[kunciCache[kelompok[e.index][1]]] = e.embedding;
        tokenDipakai += j.usage?.total_tokens || 0; biaya += j.usage?.cost || 0;
        break;
      }
      if (coba >= 4) throw new Error(`embedding gagal: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
      await new Promise((s) => setTimeout(s, 1500 * coba));
    }
    fs.writeFileSync(berkasCache, JSON.stringify(cache));
    process.stdout.write(`\r  embedding ${Math.min(a + 96, belum.length)}/${belum.length}`);
  }
  if (belum.length) process.stdout.write("\n");
  const hasil = kunciCache.map((k) => cache[k]);
  for (const v of hasil) if (!v || v.length !== 1536) throw new Error("vektor hilang / dimensi salah");
  return hasil;
}

const kosinus = (a: number[], b: number[]) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / Math.sqrt(na * nb); };

const dok = JSON.parse(fs.readFileSync(berkasPotongan, "utf8"));
const pot = dok.flatMap((h: any) => h.potongan.filter((p: any) => p.jenis !== "diagram").map((p: any) => ({ ...p, kode: h.kode })));
const soal = JSON.parse(fs.readFileSync("scripts/ppo/soal-uji.json", "utf8"));
console.log(`${pot.length} potongan, ${soal.length} soal, model ${MODEL}`);

const vSoal = await embed(soal.map((s: any) => s.q));
const laporan: any = {};
for (const [nama, ambil] of [["dengan kepala", (p: any) => p.teksEmbed], ["isi saja", (p: any) => p.teks]] as const) {
  const vPot = await embed(pot.map(ambil));
  let dok1 = 0, dok5 = 0, fr5 = 0, rrDok = 0; const meleset: string[] = [];
  soal.forEach((s: any, i: number) => {
    const urut = pot.map((p: any, j: number) => ({ p, skor: kosinus(vSoal[i], vPot[j]) })).sort((a: any, b: any) => b.skor - a.skor).slice(0, 10);
    const posDok = urut.findIndex((x: any) => s.dok.includes(x.p.kode));
    if (posDok === 0) dok1++;
    if (posDok >= 0 && posDok < 5) dok5++; else meleset.push(`${s.q} → teratas: ${urut[0].p.kode} (${urut[0].skor.toFixed(3)})`);
    if (posDok >= 0) rrDok += 1 / (posDok + 1);
    if (!s.frasa || urut.slice(0, 5).some((x: any) => s.dok.includes(x.p.kode) && x.p.teks.toLowerCase().includes(s.frasa.toLowerCase()))) fr5++;
  });
  laporan[nama] = { "dokumen benar@1": `${dok1}/${soal.length}`, "dokumen benar@5": `${dok5}/${soal.length}`, "frasa benar@5": `${fr5}/${soal.length}`, "MRR@10": +(rrDok / soal.length).toFixed(3), meleset };
}
console.log(JSON.stringify(laporan, null, 2));
console.log(`token baru ${tokenDipakai}, biaya baru US$${biaya.toFixed(5)}`);
fs.writeFileSync(path.join(folderCache, "evaluasi.json"), JSON.stringify(laporan, null, 2));
