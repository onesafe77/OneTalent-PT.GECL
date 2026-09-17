// Audit pemotong peraturan pada PDF contoh: npx tsx scripts/regulasi/uji-potong.ts <folder-pdf>
import fs from "fs";
import { ekstrakHalamanReg, nilaiMutu, potongRegulasi } from "../../server/lib/regulasi/potong";
(async () => {
  const dir = process.argv[2];
  const contoh: Record<string, string[]> = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".pdf")).sort()) {
    const hal = await ekstrakHalamanReg(new Uint8Array(fs.readFileSync(dir + "/" + f)));
    const mutu = nilaiMutu(hal);
    let p;
    try { p = potongRegulasi(hal, { label: f.replace(".pdf", ""), judul: "", status: "Berlaku" }); }
    catch (e: any) { console.log(`${f}: GALAT ${e.message}`); continue; }
    const perJenis: Record<string, number> = {};
    p.forEach((x) => (perJenis[x.jenis] = (perJenis[x.jenis] || 0) + 1));
    const pasalUnik = new Set(p.filter((x) => x.jenis === "pasal" && x.pasal).map((x) => x.pasal));
    const angka = Array.from(pasalUnik).filter((x) => /^\d+$/.test(x!)).map(Number).sort((a, b) => a - b);
    const hilang = angka.length ? Array.from({ length: angka[angka.length - 1] }, (_, i) => i + 1).filter((n) => !pasalUnik.has(String(n))) : [];
    const pjg = p.map((x) => x.teks.length);
    console.log(`${f.padEnd(26)} mutu:rusak ${(mutu.rasioKataRusak * 100).toFixed(1)}% tanpaTeks ${mutu.halamanTanpaTeks}/${mutu.halaman} | potongan ${p.length} ${JSON.stringify(perJenis)} | pasal unik ${pasalUnik.size} (maks ${angka[angka.length - 1] ?? "-"}, lompat: ${hilang.slice(0, 8).join(",") || "-"}) | panjang ${Math.min(...pjg)}–${Math.max(...pjg)}`);
    contoh[f] = p.slice(0, 400).filter((x, i) => i === 1 || i === 2 || x.pasal === "9" || x.jenis === "penjelasan").slice(0, 3).map((x) => `[${x.jenis}] ${x.bagian} hal ${x.halamanAwal}-${x.halamanAkhir}\n${x.teks.slice(0, 260)}`);
  }
  for (const f of ["UU_1_1970.pdf", "UU_3_2020.pdf"]) console.log(`\n##### ${f}\n` + (contoh[f] || []).join("\n---\n"));
  process.exit(0);
})();
