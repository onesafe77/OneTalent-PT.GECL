/**
 * Pembuat `shared/mcu-rekap-columns.ts` — dijalankan SEKALI, hasilnya di-commit.
 *
 *   npx tsx scripts/gen-rekap-columns.ts "<path ke .xlsx>"
 *
 * Kenapa dibekukan dan bukan diturunkan saat impor:
 * importir membuang sel kosong, sehingga 108 kolom Rekap Fisik yang kosong total
 * tidak akan pernah muncul di `nilai`. Tanpa daftar kanonik, tombol "tampilkan
 * kolom kosong" mustahil dibuat, dan urutan kolom + keanggotaan grup hilang.
 */
import * as xlsxNS from "xlsx";
// xlsx = modul CommonJS: di konteks ESM fungsinya ada di .default, sama seperti exceljs.
const XLSX: any = (xlsxNS as any).default || xlsxNS;
import * as fs from "fs";
import * as path from "path";

type Cfg = { kategori: string; sheet: string; barisGrup: number; barisHeader: number };

const CFG: Cfg[] = [
    { kategori: "Rekap Fisik", sheet: "Rekap Fisik", barisGrup: 2, barisHeader: 3 },
    { kategori: "Rekap Riwayat", sheet: "Rekap Riwayat", barisGrup: 1, barisHeader: 2 },
    { kategori: "Rekap Lab & Non Lab", sheet: "Rekap Lab & Non Lab", barisGrup: 1, barisHeader: 2 },
];

/** Jumlah kolom yang WAJIB ditemukan — kalau meleset, algoritma header salah. */
const HARAPAN: Record<string, number> = {
    "Rekap Fisik": 171, "Rekap Riwayat": 144, "Rekap Lab & Non Lab": 73,
};

/** Blok identitas = 11 kolom berisi PERTAMA. Dipilah menurut posisi, bukan nama:
 *  Rekap Fisik punya kolom A kosong sehingga indeksnya bergeser satu. */
const IDENTITAS = ["No.", "No Reg/No Lab", "Nama", "Perusahaan", "JK", "TTL",
    "Department", "Posisi", "No. Induk Karyawan", "Status Nikah", "Pendidikan terakhir"];

/** Punya slot khusus di tabel, jadi tidak masuk `nilai`. Bulan/Tahun periode TIDAK
 *  disaring lewat nama — Rekap Riwayat punya kolom "BULAN" di tengah sheet yang
 *  artinya bulan imunisasi (data betulan). Periode dikenali dari POSISI: 2 kolom terakhir. */
const KESIMPULAN_KHUSUS = new Set(["KESIMPULAN", "REKOMENDASI"]);

/** Label yang kembar di dalam grup yang sama; diberi nama manusiawi, bukan "(2)". */
const PERJELAS: Record<string, string> = {
    "TANDA VITAL — Irama (2)": "Irama (Pernafasan)",
    "TENGGOROKAN — Ukuran (2)": "Ukuran (Tonsil Kiri)",
    "RIWAYAT KESEHATAN — Polio (2)": "Polio (Imunisasi)",
    "RIWAYAT KESEHATAN — Tetanus (2)": "Tetanus (Imunisasi)",
};

const t = (v: any) => String(v ?? "").trim();

function bacaDefinisi(wb: any, cfg: Cfg) {
    const ws = wb.Sheets[cfg.sheet];
    if (!ws) throw new Error(`Sheet "${cfg.sheet}" tidak ada di workbook`);
    const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
    const G = (grid[cfg.barisGrup] || []).map(t);
    const H = (grid[cfg.barisHeader] || []).map(t);
    const lebar = Math.max(G.length, H.length);

    // Tahap 1 — kumpulkan SEMUA kolom berisi apa adanya, beserta grupnya.
    let grupAktif = "";
    const semua: { label: string; grup: string; idx: number }[] = [];
    for (let i = 0; i < lebar; i++) {
        if (G[i]) grupAktif = G[i];                 // sel grup ter-merge: bawa ke kanan
        const label = H[i] || G[i];                 // kolom ekor: baris grup BERPERAN sbg header
        if (!label) continue;
        semua.push({ label, grup: H[i] ? grupAktif : "", idx: i });
    }

    if (semua.length !== HARAPAN[cfg.kategori])
        throw new Error(`${cfg.kategori}: ${semua.length} kolom, seharusnya ${HARAPAN[cfg.kategori]}`);

    // Tahap 2 — potong menurut POSISI: 11 di depan identitas, 2 di belakang periode.
    const depan = semua.slice(0, 11).map((k) => k.label);
    if (depan.join("|") !== IDENTITAS.join("|"))
        throw new Error(`${cfg.kategori}: blok identitas tak sesuai -> ${depan.join(" | ")}`);
    const ekor = semua.slice(-2).map((k) => k.label.toLowerCase());
    if (ekor[0] !== "bulan" || ekor[1] !== "tahun")
        throw new Error(`${cfg.kategori}: 2 kolom terakhir seharusnya Bulan+Tahun -> ${ekor.join(" | ")}`);

    // Tahap 3 — bangun kunci untuk sisanya.
    const dipakai: Record<string, number> = {};
    const kolom: any[] = [];
    for (const k of semua.slice(11, -2)) {
        if (KESIMPULAN_KHUSUS.has(k.label)) continue;
        let key = (k.grup ? `${k.grup} — ` : "") + k.label;
        if (dipakai[key]) { dipakai[key]++; key = `${key} (${dipakai[key]})`; }
        else dipakai[key] = 1;
        kolom.push({ key, grup: k.grup || "Lainnya", label: PERJELAS[key] ?? k.label, idx: k.idx });
    }

    // --- Assert: kalau gagal, algoritmanya keliru. Berhenti, jangan tulis berkas.
    const unik = new Set(kolom.map((k) => k.key));
    if (unik.size !== kolom.length)
        throw new Error(`${cfg.kategori}: ada kunci kembar (${kolom.length - unik.size})`);

    return { kategori: cfg.kategori, sheet: cfg.sheet, barisGrup: cfg.barisGrup, barisHeader: cfg.barisHeader, kolom };
}

const berkas = process.argv[2];
if (!berkas) { console.error("Pakai: npx tsx scripts/gen-rekap-columns.ts <file.xlsx>"); process.exit(1); }

const wb = XLSX.readFile(berkas);
const defs = CFG.map((c) => bacaDefinisi(wb, c));

const berakhiran = defs.flatMap((d) => d.kolom).filter((k) => / \(\d\)$/.test(k.key));
if (berakhiran.length !== 4)
    throw new Error(`Seharusnya tepat 4 kunci berakhiran angka, dapat ${berakhiran.length}: ${berakhiran.map(k => k.key).join(", ")}`);

const isi = `// DIHASILKAN OTOMATIS oleh scripts/gen-rekap-columns.ts — jangan disunting tangan.
// Sumber: "Database & Mapping profil Kesehatan Karyawan PT GECL.xlsx"
//
// Daftar kolom ketiga sheet Rekap dibekukan di sini supaya urutan kolom, keanggotaan
// grup, dan kunci \`nilai\` tidak berubah-ubah mengikuti isi file yang diunggah.
// Kolom identitas dan kolom ekor berslot khusus (KESIMPULAN, REKOMENDASI, BULAN, TAHUN)
// sengaja DIKECUALIKAN — semuanya punya kolom sendiri di tabel mcu_health_mapping.

export type RekapKategori = ${defs.map((d) => JSON.stringify(d.kategori)).join(" | ")};

export interface KolomRekap {
    /** kunci di dalam mcu_health_mapping.nilai, mis. "TANDA VITAL — Nadi" */
    key: string;
    /** nama grup untuk header dua tingkat */
    grup: string;
    /** teks yang ditampilkan di header bawah */
    label: string;
    /** indeks kolom asli di sheet — untuk pencocokan posisi & audit */
    idx: number;
}

export interface DefinisiRekap {
    kategori: RekapKategori;
    sheet: string;
    barisGrup: number;
    barisHeader: number;
    kolom: KolomRekap[];
}

export const REKAP_KATEGORI: RekapKategori[] = [${defs.map((d) => JSON.stringify(d.kategori)).join(", ")}];

export const REKAP_DEFS: Record<RekapKategori, DefinisiRekap> = {
${defs.map((d) => `    ${JSON.stringify(d.kategori)}: {
        kategori: ${JSON.stringify(d.kategori)},
        sheet: ${JSON.stringify(d.sheet)},
        barisGrup: ${d.barisGrup},
        barisHeader: ${d.barisHeader},
        kolom: [
${d.kolom.map((k: any) => `            { key: ${JSON.stringify(k.key)}, grup: ${JSON.stringify(k.grup)}, label: ${JSON.stringify(k.label)}, idx: ${k.idx} },`).join("\n")}
        ],
    },`).join("\n")}
};

/** Kolom dikelompokkan menurut grup, urutan asli dipertahankan — untuk header colSpan. */
export function grupRekap(k: RekapKategori): { grup: string; kolom: KolomRekap[] }[] {
    const out: { grup: string; kolom: KolomRekap[] }[] = [];
    for (const kol of REKAP_DEFS[k].kolom) {
        const akhir = out[out.length - 1];
        if (akhir && akhir.grup === kol.grup) akhir.kolom.push(kol);
        else out.push({ grup: kol.grup, kolom: [kol] });
    }
    return out;
}

export function isRekap(kategori: string): kategori is RekapKategori {
    return (REKAP_KATEGORI as string[]).includes(kategori);
}
`;

const keluar = path.join(process.cwd(), "shared", "mcu-rekap-columns.ts");
fs.writeFileSync(keluar, isi);
console.log("Ditulis:", keluar);
for (const d of defs) {
    const grup = new Set(d.kolom.map((k: any) => k.grup));
    console.log(`  ${d.kategori.padEnd(22)} ${String(d.kolom.length).padStart(3)} kolom nilai, ${grup.size} grup`);
}
console.log("  4 kunci kembar diperjelas:", berakhiran.map((k) => `${k.key} -> "${k.label}"`).join(" | "));
