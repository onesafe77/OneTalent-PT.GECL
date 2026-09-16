// Bandingkan: makna saja vs hibrida (makna + kata kunci BM25, digabung RRF) vs hibrida + padanan istilah.
// Memakai cache embedding dari evaluasi-embedding.ts — tidak ada biaya tambahan.
// Jalankan: npx tsx scripts/ppo/evaluasi-hibrida.ts <potongan.json> <folder-cache>
import fs from "node:fs";
import path from "node:path";
import { hashTeks } from "../../server/lib/ppo/potong";

const MODEL = "openai/text-embedding-3-small";
const [berkasPotongan, folderCache] = process.argv.slice(2);
const cache: Record<string, number[]> = JSON.parse(fs.readFileSync(path.join(folderCache, "embedding-cache.json"), "utf8"));
const vektor = (t: string) => { const v = cache[`${MODEL}:${hashTeks(t)}:${t.length}`]; if (!v) throw new Error("belum ada di cache: " + t.slice(0, 40)); return v; };

// Padanan istilah lapangan → istilah dokumen. Sengaja kecil & eksplisit: tiap entri harus bisa dipertanggungjawabkan.
export const PADANAN: Record<string, string> = {
  solar: "bahan bakar", bbm: "bahan bakar", fuel: "bahan bakar",
  dt: "dump truck", "hd": "dump truck", ngantuk: "kantuk fatigue kelelahan", capek: "kelelahan fatigue",
  aki: "baterai battery", harness: "harness sabuk pengaman ketinggian", apd: "alat pelindung diri",
};
const perluas = (q: string) => q + " " + q.toLowerCase().split(/[^a-z0-9]+/).map((k) => PADANAN[k]).filter(Boolean).join(" ");

const token = (s: string) => s.toLowerCase().normalize("NFKD").match(/[a-z0-9%]+(?:[.,/][0-9]+)*/g) || [];
const kosinus = (a: number[], b: number[]) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / Math.sqrt(na * nb); };

const pot = JSON.parse(fs.readFileSync(berkasPotongan, "utf8")).flatMap((h: any) => h.potongan.filter((p: any) => p.jenis !== "diagram").map((p: any) => ({ ...p, kode: h.kode })));
const soal = JSON.parse(fs.readFileSync("scripts/ppo/soal-uji.json", "utf8"));

// BM25 atas teksEmbed (identitas dokumen ikut terindeks)
const dokTok = pot.map((p: any) => token(p.teksEmbed));
const avgdl = dokTok.reduce((a: number, t: string[]) => a + t.length, 0) / dokTok.length;
const df = new Map<string, number>(); for (const t of dokTok) for (const k of new Set(t)) df.set(k, (df.get(k) || 0) + 1);
const tf = dokTok.map((t: string[]) => { const m = new Map<string, number>(); for (const k of t) m.set(k, (m.get(k) || 0) + 1); return m; });
const bm25 = (q: string) => pot.map((_: any, i: number) => {
  let s = 0; for (const k of new Set(token(q))) { const f = tf[i].get(k); if (!f) continue; const idf = Math.log(1 + (pot.length - df.get(k)! + 0.5) / (df.get(k)! + 0.5)); s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * dokTok[i].length / avgdl)); } return s; });

const vPot = pot.map((p: any) => vektor(p.teksEmbed));
const urutan = (skor: number[]) => skor.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
const rrf = (daftar: number[][], k = 60) => { const s = new Array(pot.length).fill(0); for (const d of daftar) d.forEach((i, r) => { s[i] += 1 / (k + r + 1); }); return urutan(s); };

const nilai = (nama: string, cari: (s: any) => number[]) => {
  let d1 = 0, d5 = 0, f5 = 0, rr = 0; const meleset: string[] = [];
  for (const s of soal) {
    const top = cari(s).slice(0, 10).map((i) => pot[i]);
    const pos = top.findIndex((p: any) => s.dok.includes(p.kode));
    if (pos === 0) d1++; if (pos >= 0 && pos < 5) d5++; else meleset.push(`${s.q} → ${top[0].kode}`);
    if (pos >= 0) rr += 1 / (pos + 1);
    if (!s.frasa || top.slice(0, 5).some((p: any) => s.dok.includes(p.kode) && p.teks.toLowerCase().includes(s.frasa.toLowerCase()))) f5++;
  }
  return { varian: nama, "dok@1": `${d1}/${soal.length}`, "dok@5": `${d5}/${soal.length}`, "frasa@5": `${f5}/${soal.length}`, MRR: +(rr / soal.length).toFixed(3), meleset };
};

const makna = (q: string) => urutan(vPot.map((v: number[]) => kosinus(vektor(q), v)));
const hasil = [
  nilai("makna saja", (s) => makna(s.q)),
  nilai("hibrida (makna + BM25)", (s) => rrf([makna(s.q), urutan(bm25(s.q))])),
  nilai("hibrida + padanan istilah (hanya di BM25)", (s) => rrf([makna(s.q), urutan(bm25(perluas(s.q)))])),
];
console.log(JSON.stringify(hasil, null, 2));
