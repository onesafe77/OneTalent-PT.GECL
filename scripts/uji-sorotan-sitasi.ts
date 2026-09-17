// Uji pencocokan sorotan sitasi (panel PDF) terhadap PDF PPO asli: npx tsx scripts/uji-sorotan-sitasi.ts
import "dotenv/config";
import { pool } from "../server/db";
import { cocokkanItem } from "../client/src/components/si-asef/PanelSumberPdf";
(async () => {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const sampel = (await pool.query(`
    select p.id, p.kode_dokumen, p.halaman_awal, p.halaman_akhir, p.teks, p.jenis, coalesce(v.signed_file_path, v.file_path) jalur
    from pengetahuan_potongan p join document_versions v on v.id = p.version_id
    where p.jenis = 'isi' order by md5(p.id) limit 120`)).rows;
  const cache = new Map<string, any>();
  let lebih = 0, adaSorot = 0, cakupanTotal = 0, salahHalaman = 0;
  for (const c of sampel) {
    const idFile = String(c.jalur).split("/").pop();
    if (!cache.has(idFile!)) {
      const f = (await pool.query("select data from uploaded_files where id=$1", [idFile])).rows[0];
      cache.set(idFile!, await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(f.data, "base64")), verbosity: 0 }).promise);
    }
    const doc = cache.get(idFile!);
    let ditandai = 0, huruf = 0;
    for (let n = c.halaman_awal; n <= Math.min(doc.numPages, c.halaman_akhir); n++) {
      const isi = await (await doc.getPage(n)).getTextContent();
      const items = isi.items.map((it: any) => it.str ?? "");
      const set = cocokkanItem(items, c.teks);
      set.forEach((i) => { ditandai++; huruf += items[i].replace(/\s+/g, "").length; });
      if (set.size && (n < c.halaman_awal || n > c.halaman_akhir)) salahHalaman++;
    }
    const rasio = huruf / c.teks.replace(/\s+/g, "").length;
    const cakupan = Math.min(1, rasio);
    if (rasio > 1.25) { lebih++; console.log(`  berlebih ${c.kode_dokumen} hal ${c.halaman_awal}: ${(rasio * 100).toFixed(0)}%`); }
    if (ditandai) adaSorot++;
    cakupanTotal += cakupan;
    if (cakupan < 0.5) console.log(`  rendah ${c.kode_dokumen} hal ${c.halaman_awal}-${c.halaman_akhir}: ${(cakupan * 100).toFixed(0)}%`);
  }
  console.log(`potongan bersorot: ${adaSorot}/${sampel.length}; rata-rata cakupan huruf: ${(cakupanTotal / sampel.length * 100).toFixed(0)}%; sorot di halaman tetangga: ${salahHalaman}; sorotan berlebih >125%: ${lebih}`);
  process.exit(0);
})();
