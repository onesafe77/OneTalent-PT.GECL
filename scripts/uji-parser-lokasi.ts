// Pemeriksa kecil untuk lineVal/heuristicExtract — jalankan: npx tsx scripts/uji-parser-lokasi.ts
// Kasus 1-4 diambil APA ADANYA dari laporan produksi 15 Sep 2026 yang lokasinya gagal terbaca.
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// gemini-parser menarik rantai impor yang menyentuh server/db.ts, dan db.ts menolak
// dimuat tanpa DATABASE_URL. Muat .env dulu supaya pemeriksa ini bisa dijalankan
// tanpa menyalakan server.
// Jalur .env dihitung dari lokasi berkas ini, bukan dari direktori kerja —
// supaya pemeriksa ini bisa dijalankan dari mana saja.
const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const m of fs.readFileSync(path.join(akar, ".env"), "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) {
  process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
}


const kasus: { nama: string; teks: string; lokasi: string; tanggal?: string }[] = [
  {
    nama: "empat label berdempet satu baris (Renaldi, 15 Sep)",
    teks: "Laporan Monitoring Area Hauling Road Phase 4\nTanggal.     : Selasa,15 September 2026 Shift.           : I ( siang ) Waktu.        : 09:10 WITA - Selesai Lokasi.        : Hauling Road Phase 4\nKM 20 : simpang B2 jalan berlubang",
    lokasi: "Hauling Road Phase 4",
    tanggal: "2026-09-15",
  },
  {
    nama: "Lokasi diikuti Total Sample di baris sama",
    teks: "Observasi Wake Up Call\nLokasi              : Km.16 rest area Total Sample   : 15 Driver",
    lokasi: "Km.16 rest area",
  },
  {
    nama: "Lokasi diikuti Waktu di baris sama",
    teks: "Observasi Kecepatan\nLokasi               : Rest area km 16 Waktu               : 12:46",
    lokasi: "Rest area km 16",
  },
  {
    nama: "Lokasi diikuti Waktu berekor tanda hubung",
    teks: "Observasi Rambu\nLokasi             : Simpang B2 Waktu              : 10:44 Wita - Selesai",
    lokasi: "Simpang B2",
  },
  // Bentuk rapi lama WAJIB tidak berubah.
  {
    nama: "satu label per baris (bentuk normal)",
    teks: "Daily Briefing\nTanggal : 27 Agustus 2026\nShift : 1\nLokasi : Rest Area KM 4\nTemuan : aman",
    lokasi: "Rest Area KM 4",
    tanggal: "2026-08-27",
  },
];

// Impor dinamis: harus SETELAH .env termuat, karena impor statis diangkat ke atas.
const { heuristicExtract } = await import("../server/gemini-parser");

let gagal = 0;
for (const k of kasus) {
  const h = heuristicExtract(k.teks);
  try {
    assert.strictEqual(h.lokasi, k.lokasi, `lokasi: dapat ${JSON.stringify(h.lokasi)}`);
    if (k.tanggal) assert.strictEqual(h.tanggal, k.tanggal, `tanggal: dapat ${JSON.stringify(h.tanggal)}`);
    console.log("  LULUS ", k.nama);
  } catch (e: any) {
    gagal++;
    console.log("  GAGAL ", k.nama, "\n         ", e.message);
  }
}
console.log(gagal ? `\n${gagal} dari ${kasus.length} kasus GAGAL` : `\n${kasus.length}/${kasus.length} kasus lulus`);
process.exit(gagal ? 1 : 0);
