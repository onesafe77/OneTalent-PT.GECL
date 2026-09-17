// Uji pembacaan identitas peraturan dari PDF: npx tsx scripts/regulasi/uji-meta.ts <folder-pdf>
import assert from "node:assert";
import fs from "node:fs";
import { ekstrakHalamanReg } from "../../server/lib/regulasi/potong";
import { deteksiMeta } from "../../server/lib/regulasi/meta";
const HARAP: Record<string, any> = {
  "UU_1_1970.pdf": { jenis: "UU", nomor: "1", tahun: 1970, judul: "Keselamatan Kerja", bidang: "k3", tanggalPenetapan: "1970-01-12" },
  "UU_32_2009.pdf": { jenis: "UU", nomor: "32", tahun: 2009, judul: "Perlindungan dan Pengelolaan Lingkungan Hidup", bidang: "lingkungan", tanggalPenetapan: "2009-10-03" },
  "UU_3_2020.pdf": { jenis: "UU", nomor: "3", tahun: 2020, bidang: "minerba", tanggalPenetapan: "2020-06-10" },
  "PP_50_2012.pdf": { jenis: "PP", nomor: "50", tahun: 2012, judul: "Penerapan Sistem Manajemen Keselamatan dan Kesehatan Kerja", bidang: "k3", tanggalPenetapan: "2012-04-12" },
  "PP_78_2010.pdf": { jenis: "PP", nomor: "78", tahun: 2010, judul: "Reklamasi dan Pascatambang", bidang: "minerba", tanggalPenetapan: "2010-12-20" },
  "PP_96_2021.pdf": { jenis: "PP", nomor: "96", tahun: 2021, judul: "Pelaksanaan Kegiatan Usaha Pertambangan Mineral dan Batubara", bidang: "minerba", tanggalPenetapan: "2021-09-09" },
  "PERMEN_ESDM_26_2018.pdf": { jenis: "Permen ESDM", nomor: "26", tahun: 2018, bidang: "minerba", tanggalPenetapan: null },
};
(async () => {
  let ok = 0, total = 0;
  for (const [f, harap] of Object.entries(HARAP)) {
    const m = deteksiMeta(await ekstrakHalamanReg(new Uint8Array(fs.readFileSync(`${process.argv[2]}/${f}`))));
    for (const [k, v] of Object.entries(harap)) {
      total++;
      if ((m as any)[k] === v) ok++; else console.log(`✗ ${f} ${k}: dapat ${JSON.stringify((m as any)[k])}, harap ${JSON.stringify(v)}`);
    }
    console.log(`  ${f}: ${m.jenis} ${m.nomor}/${m.tahun} — ${m.judul} [${m.bidang}] ${m.tanggalPenetapan} ${m.instansi ?? ""}`);
  }
  // Format keputusan menteri/dirjen (tanpa PDF contoh ber-teks): naskah sintetis.
  const kep = deteksiMeta([{ no: 1, baris: ["KEPUTUSAN MENTERI ENERGI DAN SUMBER DAYA MINERAL", "REPUBLIK INDONESIA", "NOMOR 1827 K/30/MEM/2018", "TENTANG", "PEDOMAN PELAKSANAAN KAIDAH TEKNIK PERTAMBANGAN", "YANG BAIK", "DENGAN RAHMAT TUHAN YANG MAHA ESA"] }]);
  const dj = deteksiMeta([{ no: 1, baris: ["KEPUTUSAN DIREKTUR JENDERAL MINERAL DAN BATUBARA", "NOMOR : 185.K/37.04/DJB/2019", "TENTANG", "PETUNJUK TEKNIS PELAKSANAAN KESELAMATAN PERTAMBANGAN", "DAN PELAKSANAAN, PENILAIAN, DAN PELAPORAN SISTEM MANAJEMEN", "KESELAMATAN PERTAMBANGAN MINERAL DAN BATUBARA", "DIREKTUR JENDERAL MINERAL DAN BATUBARA,"] }]);
  for (const [nama, m, h] of [["Kepmen", kep, { jenis: "Kepmen ESDM", nomor: "1827 K/30/MEM", tahun: 2018, bidang: "minerba" }], ["Kepdirjen", dj, { jenis: "Kepdirjen Minerba", nomor: "185.K/37.04/DJB", tahun: 2019, bidang: "minerba" }]] as const) {
    for (const [k, v] of Object.entries(h)) { total++; if ((m as any)[k] === v) ok++; else console.log(`✗ ${nama} ${k}: dapat ${JSON.stringify((m as any)[k])}`); }
    console.log(`  ${nama}: ${m.jenis} ${m.nomor}/${m.tahun} — ${m.judul}`);
  }
  console.log(`${ok}/${total} kolom benar`);
  process.exit(ok === total ? 0 : 1);
})();
