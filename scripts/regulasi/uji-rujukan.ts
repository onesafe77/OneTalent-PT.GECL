// Uji penguraian rujukan peraturan: npx tsx scripts/regulasi/uji-rujukan.ts
import assert from "node:assert";
import { uraiRujukan } from "../../server/lib/regulasi/cari";
const kasus: [string, any][] = [
  ["pasal 9 PP 96/2021", { jenis: "PP", nomor: "96", tahun: 2021, pasal: "9" }],
  ["apa isi pasal 158 UU nomor 3 tahun 2020?", { jenis: "UU", nomor: "3", tahun: 2020, pasal: "158" }],
  ["Perpres 60/2024 tentang apa", { jenis: "Perpres", nomor: "60", tahun: 2024, pasal: null }],
  ["Kepmen ESDM 1827 K/30/MEM/2018 lampiran III", { jenis: "Kepmen ESDM", nomor: "1827 K/30/MEM", tahun: 2018, pasal: null }],
  ["kepdirjen 185.K/37.04/DJB/2019", { jenis: "Kepdirjen Minerba", nomor: "185.K/37.04/DJB", tahun: 2019, pasal: null }],
  ["Permenaker 5 tahun 2018 pasal 3", { jenis: "Permenaker", nomor: "5", tahun: 2018, pasal: "3" }],
  ["kewajiban KTT soal fatigue", { jenis: null, nomor: null, tahun: null, pasal: null }],
  ["pasal 86A UU 3/2020", { jenis: "UU", nomor: "3", tahun: 2020, pasal: "86A" }],
];
let ok = 0;
for (const [q, harap] of kasus) {
  const h = uraiRujukan(q);
  try { assert.deepStrictEqual(h, harap); ok++; } catch { console.log("GAGAL:", q, "=>", h); }
}
console.log(`${ok}/${kasus.length} lulus`);
process.exit(ok === kasus.length ? 0 : 1);
