/**
 * Perekam tata letak header 17 sheet -> server/lib/mcu-template-layout.ts
 *
 *   npx tsx scripts/gen-template-layout.ts "<path ke .xlsx>"
 *
 * Dijalankan SEKALI, hasilnya di-commit.
 *
 * Kenapa merekam apa adanya, bukan menyusun ulang dari aturan: template diminta
 * KEMBAR dengan file asli. Menyusun ulang berarti menebak-nebak niat tiap sel;
 * merekam berarti hasilnya persis, termasuk baris & kolom kosong dan sel gabungan
 * yang memang ada di file sumber.
 */
import * as xlsxNS from "xlsx";
const XLSX: any = (xlsxNS as any).default || xlsxNS;
import * as fs from "fs";
import * as path from "path";

const berkas = process.argv[2];
if (!berkas) { console.error("Pakai: npx tsx scripts/gen-template-layout.ts <file.xlsx>"); process.exit(1); }

const wb = XLSX.readFile(berkas);
const hasil: any[] = [];

for (const nama of wb.SheetNames) {
    const ws = wb.Sheets[nama];
    // blankrows:true -> nomor baris sama dengan yang terlihat di Excel.
    const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null });

    // Baris header = baris pertama yang memuat sel "Nama".
    let bh = -1;
    for (let r = 0; r < Math.min(grid.length, 12) && bh === -1; r++) {
        if ((grid[r] || []).some((x) => String(x ?? "").trim() === "Nama")) bh = r;
    }
    if (bh === -1) { console.warn(`  ! ${nama}: baris "Nama" tidak ketemu, dilewati`); continue; }

    const pra = grid.slice(0, bh + 1);

    // Lebar nyata dihitung dari isi, bukan dari !ref — beberapa sheet mengaku
    // selebar 16384 kolom (batas Excel) padahal isinya jauh lebih sedikit.
    let lebar = 0;
    for (const baris of pra) {
        for (let c = 0; c < (baris?.length || 0); c++) {
            if (baris[c] != null && String(baris[c]).trim() !== "") lebar = Math.max(lebar, c + 1);
        }
    }

    const rapi = pra.map((baris) =>
        Array.from({ length: lebar }, (_, c) => {
            const v = baris?.[c];
            return v == null || String(v).trim() === "" ? null : v;
        }));

    // Sel gabungan yang seluruhnya berada di area header.
    const merges = (ws["!merges"] || [])
        .filter((m: any) => m.e.r <= bh && m.s.c < lebar)
        .map((m: any) => [m.s.r, m.s.c, m.e.r, Math.min(m.e.c, lebar - 1)]);

    // Lebar kolom asli, bila ada.
    const kolomLebar = (ws["!cols"] || []).slice(0, lebar)
        .map((k: any) => (k && (k.wch ?? k.width)) ? Math.round((k.wch ?? k.width) * 10) / 10 : null);

    hasil.push({ sheet: nama, barisHeader: bh, lebar, baris: rapi, merges, kolomLebar });
}

const isi = `// DIHASILKAN OTOMATIS oleh scripts/gen-template-layout.ts — jangan disunting tangan.
// Sumber: "Database & Mapping profil Kesehatan Karyawan PT GECL.xlsx"
//
// Rekaman apa adanya baris judul + baris grup + baris nama kolom dari ke-17 sheet,
// lengkap dengan sel gabungan dan lebar kolom. Dipakai untuk membuat template Excel
// yang KEMBAR dengan file asli — termasuk baris dan kolom kosong yang memang ada di
// sana (mis. kolom A kosong dan baris berisi huruf "x" di sheet Rekap Fisik).
// Dipakai hanya di sisi server; sengaja tidak ditaruh di shared/ agar tidak ikut
// terbawa ke bundel browser.

export interface TataLetakSheet {
    sheet: string;
    /** indeks baris (0-based) yang memuat nama kolom */
    barisHeader: number;
    /** jumlah kolom nyata (bukan !ref yang bisa mengaku 16384) */
    lebar: number;
    /** baris 0..barisHeader, apa adanya */
    baris: (string | number | null)[][];
    /** sel gabungan di area header: [barisAwal, kolomAwal, barisAkhir, kolomAkhir] */
    merges: [number, number, number, number][];
    /** lebar kolom asli (satuan karakter), null bila tidak diset */
    kolomLebar: (number | null)[];
}

export const TATA_LETAK: TataLetakSheet[] = ${JSON.stringify(hasil, null, 1)} as any;

export const SHEET_REKAP = ["Rekap Fisik", "Rekap Riwayat", "Rekap Lab & Non Lab"];

export function tataLetak(sheet: string): TataLetakSheet | undefined {
    return TATA_LETAK.find((t) => t.sheet === sheet);
}
`;

const keluar = path.join(process.cwd(), "server", "lib", "mcu-template-layout.ts");
fs.writeFileSync(keluar, isi);
console.log("Ditulis:", keluar, `(${(isi.length / 1024).toFixed(0)} KB)`);
for (const t of hasil) {
    const terisi = t.baris.flat().filter((x: any) => x != null).length;
    console.log(`  ${t.sheet.padEnd(22)} hdr@baris${String(t.barisHeader).padEnd(2)} lebar ${String(t.lebar).padStart(4)} | ${t.baris.length} baris header, ${terisi} sel terisi, ${t.merges.length} gabungan`);
}
