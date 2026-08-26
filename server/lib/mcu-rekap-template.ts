// Pembuat template Excel untuk file "Database & Mapping profil Kesehatan Karyawan".
//
// Susunan kolom diambil dari rekaman file asli (mcu-template-layout.ts) supaya nama
// dan urutan kolom persis sama, TAPI tata letaknya dirapikan:
//   - kolom yang kosong sepenuhnya dibuang (file asli menyisakan kolom A kosong)
//   - baris kosong & sel nyasar dibuang (ada sel berisi huruf "x" di Rekap Fisik)
//   - tahun pada judul dihapus, karena template dipakai untuk periode mana pun
// Hasilnya: baris 1 judul, baris 2 kelompok, baris 3 nama kolom, data mulai baris 4.
//
// Pembaca impor mencari baris header, jadi file asli maupun template ini sama-sama
// bisa diunggah. Bentuk apa adanya masih bisa diminta lewat gaya "asli".

import { TATA_LETAK, tataLetak, SHEET_REKAP, type TataLetakSheet } from "./mcu-template-layout";

const PETUNJUK: [string, string][] = [
    ["", "CARA MENGISI TEMPLATE MCU"],
    ["1.", "Baris 1-3 adalah judul, kelompok pemeriksaan, dan nama kolom. Jangan diubah, dan jangan mengubah urutan kolom."],
    ["2.", "Isi data mulai baris 4. Satu baris = satu hasil MCU satu orang."],
    ["3.", "Kolom wajib: Nama, BULAN, dan TAHUN. Tanpa ketiganya baris akan dilewati."],
    ["4.", "Isi 'No Reg/No Lab' bila ada. Ini yang membedakan dua orang bernama sama pada periode yang sama."],
    ["5.", "Bila tidak ada No Reg, pastikan kolom TTL terisi — nama + tanggal lahir dipakai sebagai penggantinya."],
    ["6.", "Tulis BULAN dengan nama Indonesia lengkap: Januari, Februari, Maret, ... Desember."],
    ["7.", "Kolom yang tidak diperiksa boleh dikosongkan atau diisi tanda '-'. Keduanya dianggap tidak ada hasil."],
    ["8.", "Tanggal boleh ditulis 01/01/1990 (hari/bulan/tahun) atau memakai format tanggal Excel."],
    ["9.", "Mengunggah ulang data dengan No Reg + periode yang sama akan MEMPERBARUI baris lama, bukan menggandakan."],
    ["10.", "Penautan ke data karyawan yang sudah diperbaiki manual tidak akan tertimpa oleh unggahan berikutnya."],
    ["", ""],
    ["", "CONTOH PENGISIAN KOLOM IDENTITAS"],
    ["", "No. = 1  |  No Reg/No Lab = 001/MCU-XXX/GECL/I/2026  |  Nama = Budi Santoso  |  Perusahaan = PT. GECL"],
    ["", "JK = M atau F  |  TTL = 01/01/1990  |  Department = PRODUKSI  |  Posisi = Driver"],
    ["", "BULAN = Januari  |  TAHUN = 2026"],
];

const BIRU = "FF1E3A5F";
const BIRU_MUDA = "FFE8EEF4";

interface Rapi {
    judul: string;
    grup: (string | null)[] | null;   // null bila sheet tsb tidak punya baris kelompok
    header: (string | null)[];
    lebar: number;
}

/**
 * Susun ulang rekaman menjadi bentuk rapi: buang kolom & baris kosong, buang sel
 * nyasar, dan hapus tahun dari judul.
 */
function rapikan(t: TataLetakSheet): Rapi {
    const barisHeader = t.baris[t.barisHeader] ?? [];
    const sebelum = t.baris[t.barisHeader - 1] ?? [];
    const adaGrup = sebelum.some((v) => v != null);

    // Kolom yang dipertahankan ditentukan HANYA dari baris kelompok & baris nama kolom.
    // Baris judul dan sel nyasar sengaja tidak ikut menentukan, supaya kolom A yang
    // kosong dan sel "x" di kolom 68 tidak ikut terbawa.
    const pakai: number[] = [];
    for (let c = 0; c < t.lebar; c++) {
        if (barisHeader[c] != null || (adaGrup && sebelum[c] != null)) pakai.push(c);
    }

    // Judul = baris di luar kelompok/header yang isinya satu teks panjang.
    let judul = "";
    t.baris.forEach((b, r) => {
        if (r === t.barisHeader || (adaGrup && r === t.barisHeader - 1)) return;
        for (const v of b) {
            const s = String(v ?? "").trim();
            if (s.length > judul.length) judul = s;
        }
    });
    // "Rekap Hasil MCU PT. GECL - Tahun 2025 (Januari - Desember)" -> tanpa tahun,
    // karena template dipakai lintas periode.
    judul = judul.replace(/\s*[-–]?\s*Tahun\s+\d{4}.*$/i, "").trim();
    if (judul.length < 4) judul = `${t.sheet} — PT GECL`;

    const grup = adaGrup ? pakai.map((c) => (sebelum[c] == null ? null : String(sebelum[c]).trim())) : null;
    const header = pakai.map((c) => (barisHeader[c] == null ? null : String(barisHeader[c]).trim()));

    // Di file asli, sebagian kolom ekor (BULAN, TAHUN, KESIMPULAN, RONTGEN, EKG, ...)
    // labelnya ada di baris kelompok dan sel di baris nama kolom dibiarkan kosong —
    // sehingga kolomnya tampak tanpa nama dan orang tidak tahu harus mengisi di mana.
    // Untuk versi rapi, label sendirian (tidak menaungi kolom lain) diturunkan ke
    // baris nama kolom. Pembaca tetap mengenalinya karena pencocokan dilakukan
    // menurut posisi, bukan teks.
    if (grup) {
        for (let c = 0; c < grup.length; c++) {
            if (grup[c] == null || header[c] != null) continue;
            let akhir = c;
            while (akhir + 1 < grup.length && grup[akhir + 1] == null) akhir++;
            const menaungi = akhir > c && header.slice(c, akhir + 1).some((h) => h != null);
            if (!menaungi) {
                header[c] = grup[c];
                grup[c] = null;
            }
        }
    }

    return { judul, grup, header, lebar: pakai.length };
}

/** Rentang sel gabungan baris kelompok: satu label berlaku sampai label berikutnya. */
function rentangGrup(grup: (string | null)[]): [number, number, string][] {
    const out: [number, number, string][] = [];
    for (let c = 0; c < grup.length; c++) {
        if (grup[c] == null) continue;
        let akhir = c;
        while (akhir + 1 < grup.length && grup[akhir + 1] == null) akhir++;
        out.push([c, akhir, grup[c] as string]);
        c = akhir;
    }
    return out;
}

export type LingkupTemplate = "semua" | "rekap" | string;

/**
 * @param lingkup "semua" = 17 sheet (bawaan), "rekap" = 3 sheet Rekap, atau nama satu sheet
 * @param gaya    "rapi" (bawaan) atau "asli" untuk menyalin bentuk file sumber apa adanya
 */
export async function buatTemplateRekap(lingkup?: LingkupTemplate, gaya: "rapi" | "asli" = "rapi"): Promise<Buffer> {
    // exceljs = modul CommonJS: kelasnya ada di .default, bukan di namespace.
    const ExcelJS = (await import("exceljs")).default as any;
    const wb = new ExcelJS.Workbook();

    let daftar = TATA_LETAK;
    if (lingkup === "rekap") daftar = TATA_LETAK.filter((t) => SHEET_REKAP.includes(t.sheet));
    else if (lingkup && lingkup !== "semua") {
        const satu = tataLetak(lingkup);
        if (satu) daftar = [satu];
    }

    for (const t of daftar) {
        const ws = wb.addWorksheet(t.sheet.slice(0, 31));
        if (gaya === "asli") { tulisApaAdanya(ws, t); continue; }

        const r = rapikan(t);
        const barisHeader = r.grup ? 3 : 2;

        // --- baris 1: judul
        ws.mergeCells(1, 1, 1, r.lebar);
        const judul = ws.getCell(1, 1);
        judul.value = r.judul;
        judul.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
        judul.alignment = { horizontal: "center", vertical: "middle" };
        judul.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
        ws.getRow(1).height = 26;

        // --- baris 2: kelompok pemeriksaan
        if (r.grup) {
            const row = ws.getRow(2);
            for (const [c1, c2, teks] of rentangGrup(r.grup)) {
                row.getCell(c1 + 1).value = teks;
                if (c2 > c1) ws.mergeCells(2, c1 + 1, 2, c2 + 1);
            }
            row.height = 20;
        }

        // --- baris nama kolom
        const rh = ws.getRow(barisHeader);
        r.header.forEach((v, c) => { if (v != null) rh.getCell(c + 1).value = v; });
        rh.height = Math.min(46, Math.max(20, Math.max(...r.header.map((h) => (h || "").length)) * 1.5));

        // --- rias
        for (let baris = 2; baris <= barisHeader; baris++) {
            const row = ws.getRow(baris);
            const grupRow = r.grup && baris === 2;
            for (let c = 1; c <= r.lebar; c++) {
                const sel = row.getCell(c);
                sel.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                sel.font = { bold: true, size: 9, color: { argb: grupRow ? "FFFFFFFF" : "FF0F172A" } };
                sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: grupRow ? "FF475569" : BIRU_MUDA } };
                sel.border = {
                    top: { style: "thin", color: { argb: "FFCBD5E1" } },
                    left: { style: "thin", color: { argb: "FFCBD5E1" } },
                    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
                    right: { style: "thin", color: { argb: "FFCBD5E1" } },
                };
            }
        }

        // --- lebar kolom dari panjang nama kolomnya
        for (let c = 1; c <= r.lebar; c++) {
            const teks = String(r.header[c - 1] || r.grup?.[c - 1] || "");
            ws.getColumn(c).width = Math.max(9, Math.min(24, teks.length + 3));
        }

        // Bekukan header + 3 kolom pertama (No., No Reg, Nama) supaya identitas tetap
        // terlihat saat digeser ke kanan — sheet Rekap Fisik selebar 160 kolom.
        ws.views = [{ state: "frozen", xSplit: Math.min(3, r.lebar), ySplit: barisHeader }];
        ws.autoFilter = {
            from: { row: barisHeader, column: 1 },
            to: { row: barisHeader, column: r.lebar },
        };
    }

    // --- lembar petunjuk
    const p = wb.addWorksheet("Petunjuk");
    p.columns = [{ width: 5 }, { width: 115 }];
    PETUNJUK.forEach(([a, b], i) => {
        const row = p.getRow(i + 1);
        row.getCell(1).value = a;
        row.getCell(2).value = b;
        row.getCell(2).alignment = { wrapText: true, vertical: "top" };
        if (i === 0) {
            row.getCell(2).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
            row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
            row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
            row.height = 24;
        }
    });

    return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Salin bentuk file sumber apa adanya, termasuk baris & kolom kosongnya. */
function tulisApaAdanya(ws: any, t: TataLetakSheet) {
    t.baris.forEach((baris, r) => {
        const row = ws.getRow(r + 1);
        baris.forEach((v, c) => { if (v != null) row.getCell(c + 1).value = v as any; });
    });
    for (const [r1, c1, r2, c2] of t.merges) {
        try { ws.mergeCells(r1 + 1, c1 + 1, r2 + 1, c2 + 1); } catch { /* tumpang tindih */ }
    }
    for (let r = 0; r <= t.barisHeader; r++) {
        const row = ws.getRow(r + 1);
        for (let c = 1; c <= t.lebar; c++) {
            const sel = row.getCell(c);
            const adaIsi = sel.value != null && String(sel.value).trim() !== "";
            sel.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            if (r === t.barisHeader || (adaIsi && r > 0)) {
                sel.font = { bold: true, size: 9 };
                sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
                sel.border = {
                    top: { style: "thin" }, left: { style: "thin" },
                    bottom: { style: "thin" }, right: { style: "thin" },
                };
            }
        }
        if (r === t.barisHeader) row.height = 58;
    }
    for (let c = 1; c <= t.lebar; c++) {
        const asli = t.kolomLebar[c - 1];
        if (asli && asli > 0) { ws.getColumn(c).width = asli; continue; }
        let teks = "";
        for (const baris of t.baris) {
            const v = baris[c - 1];
            if (v != null && String(v).length > teks.length) teks = String(v);
        }
        ws.getColumn(c).width = Math.max(9, Math.min(26, teks.length + 2));
    }
    ws.views = [{ state: "frozen", ySplit: t.barisHeader + 1 }];
}
