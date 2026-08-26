/**
 * Uji fitur MCU: importir, template, kunci dedup, dan keutuhan data.
 *
 *   node --env-file=.env --import tsx scripts/uji-mcu.ts
 *
 * Tidak memakai kerangka uji apa pun — cukup assert dan keluaran yang bisa dibaca.
 * Semua penulisan ke database dibatalkan kembali di akhir.
 */
import * as xlsxNS from "xlsx";
const XLSX: any = (xlsxNS as any).default || xlsxNS;
import { Client } from "pg";
import * as fs from "fs";
import { bacaWorkbookKesehatan, tglExcel, buatKunciBaris, cariKolomIdentitas } from "../server/lib/mcu-health-import";
import { bacaRekapMCU } from "../server/lib/mcu-rekap-import";
import { buatTemplateRekap } from "../server/lib/mcu-rekap-template";
import { REKAP_DEFS, REKAP_KATEGORI, grupRekap } from "../shared/mcu-rekap-columns";
import { TATA_LETAK } from "../server/lib/mcu-template-layout";

const SUMBER = process.env.MCU_XLSX
    || "/Users/andybagus/Downloads/Database & Mapping profil Kesehatan Karyawan PT GECL.xlsx";

let lulus = 0, gagal = 0;
const kegagalan: string[] = [];
function cek(nama: string, syarat: boolean, rinci = "") {
    if (syarat) { lulus++; console.log(`  ✓ ${nama}${rinci ? "  — " + rinci : ""}`); }
    else { gagal++; kegagalan.push(nama); console.log(`  ✗ ${nama}${rinci ? "  — " + rinci : ""}`); }
}
const bagian = (t: string) => console.log(`\n── ${t}`);
// Format komponen LOKAL, bukan toISOString(). tglExcel() menghasilkan tengah malam
// waktu lokal untuk masukan teks; toISOString() akan memundurkannya sehari di zona
// waktu positif (WITA = UTC+8) sehingga uji tampak gagal padahal datanya benar.
// node-pg juga menyerialkan kolom `date` memakai komponen lokal — sudah diverifikasi.
const ymd = (d: Date | null | undefined) => d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : null;

(async () => {
    // ══ 1. Daftar kolom beku ══
    bagian("1. Daftar kolom beku (shared/mcu-rekap-columns.ts)");
    const jml = { "Rekap Fisik": 156, "Rekap Riwayat": 131, "Rekap Lab & Non Lab": 60 } as any;
    for (const k of REKAP_KATEGORI) {
        cek(`${k}: ${jml[k]} kolom`, REKAP_DEFS[k].kolom.length === jml[k], `dapat ${REKAP_DEFS[k].kolom.length}`);
    }
    const semuaKunci = REKAP_KATEGORI.flatMap((k) => REKAP_DEFS[k].kolom.map((c) => k + "|" + c.key));
    cek("semua kunci unik dalam kategorinya", new Set(semuaKunci).size === semuaKunci.length);
    cek("grupRekap() menjaga urutan & mencakup semua kolom",
        REKAP_KATEGORI.every((k) => grupRekap(k).reduce((a, g) => a + g.kolom.length, 0) === REKAP_DEFS[k].kolom.length));

    // ══ 2. Penanggalan ══
    bagian("2. Penguraian tanggal (tglExcel)");
    const tgl: [any, string | null][] = [
        ["04/07/1999", "1999-07-04"], ["15/03/1995", "1995-03-15"], ["1/1/2000", "2000-01-01"],
        ["1999-07-04", "1999-07-04"], ["4 Juli 1999", "1999-07-04"], ["25 Des 2025", "2025-12-25"],
        ["-", null], ["", null], [null, null], [36346, "1999-07-05"],   // dikonfirmasi XLSX.SSF
    ];
    for (const [inp, harap] of tgl) cek(`tglExcel(${JSON.stringify(inp)})`, ymd(tglExcel(inp)) === harap, `= ${ymd(tglExcel(inp))}`);

    // ══ 3. Kunci dedup ══
    bagian("3. Kunci dedup (buatKunciBaris)");
    cek("No Reg dipakai bila ada", buatKunciBaris("A/1", "Budi", new Date("1990-01-01")) === "A/1");
    cek("'-' dianggap tidak ada No Reg", buatKunciBaris("-", "Budi", new Date(Date.UTC(1990, 0, 1))).startsWith("Budi|"));
    cek("tanpa No Reg -> nama+TTL", buatKunciBaris(null, "Budi", new Date(Date.UTC(1990, 0, 1))) === "Budi|1990-01-01");
    cek("tanpa keduanya -> nama saja", buatKunciBaris(null, "Budi", null) === "Budi");
    cek("dua orang senama beda TTL -> kunci beda",
        buatKunciBaris(null, "Wakidi", new Date(Date.UTC(1985, 4, 11))) !== buatKunciBaris(null, "Wakidi", new Date(Date.UTC(1986, 6, 15))));

    // ══ 4. Kolom identitas dicari per nama ══
    bagian("4. Pencarian kolom identitas (cariKolomIdentitas)");
    const hNormal = ["No.", "Bulan", "Tahun", "Nama", "JK", "TTL", "Department", "Posisi"];
    let id = cariKolomIdentitas(hNormal, 3, "uji-normal");
    cek("sheet normal: JK/TTL/Dept/Posisi ketemu", id.iJK === 4 && id.iTTL === 5 && id.iDept === 6 && id.iPosisi === 7);
    const hHepar = ["No.", "Bulan", "Tahun", "Nama", "Department", "Posisi", "GOT", "GPT"];
    id = cariKolomIdentitas(hHepar, 3, "uji-hepar");
    cek("sheet tanpa JK/TTL: dikosongkan, bukan salah kolom", id.iJK === -1 && id.iTTL === -1 && id.iDept === 4 && id.iPosisi === 5);
    cek("kolom nilai mulai setelah identitas terakhir", id.akhirIdentitas === 5, `GOT di ${id.akhirIdentitas + 1}`);
    const hRekap = ["No.", "No Reg/No Lab", "Nama", "Perusahaan", "JK", "TTL", "Department", "Posisi"];
    id = cariKolomIdentitas(hRekap, 2, "uji-rekap");
    cek("sheet Rekap: kolom Perusahaan tidak tertukar jadi JK", id.iJK === 4 && id.iTTL === 5 && id.iDept === 6);

    // ══ 5. Baca file sumber ══
    bagian("5. Baca file MCU asli");
    if (!fs.existsSync(SUMBER)) { console.log("  ! file sumber tidak ada, bagian ini dilewati"); }
    else {
        const wb = XLSX.readFile(SUMBER);
        const a = bacaWorkbookKesehatan(XLSX, wb, []);
        const b = bacaRekapMCU(XLSX, wb, []);
        cek("14 sheet penyakit terbaca", Object.keys(a.perKategori).length === 14);
        cek("3 sheet Rekap x 332 baris", REKAP_KATEGORI.every((k) => b.perKategori[k] === 332),
            JSON.stringify(b.perKategori));
        cek("tidak ada peringatan kolom", b.peringatan.length === 0, `${b.peringatan.length} peringatan`);
        cek("tidak ada sheet terlewat", a.sheetDilewati.length + b.sheetDilewati.length === 0);

        const gfh = a.baris.filter((x) => x.kategori === "Gangguan Faal Hepar");
        cek("Gg Faal Hepar: GOT/GPT masuk ke nilai", gfh.length > 0 && gfh.every((x) => x.nilai?.GOT));
        cek("Gg Faal Hepar: departemen bukan angka", gfh.every((x) => !/^\d+$/.test(x.departemenSumber || "")));
        cek("baris Rekap: jenis kelamin hanya M/F",
            b.baris.every((x) => x.jenisKelamin === null || ["M", "F"].includes(x.jenisKelamin)));

        const sirri = b.baris.find((x) => x.kategori === "Rekap Fisik" && x.nama === "Sirri Mahmudi");
        cek("nilai spesifik: TANDA VITAL — Nadi = 77", sirri?.nilai?.["TANDA VITAL — Nadi"] === "77");
        cek("kolom kembar tidak saling menimpa (Irama vs Irama (2))",
            sirri?.nilai?.["TANDA VITAL — Irama"] === undefined && sirri?.nilai?.["TANDA VITAL — Irama (2)"] === "Teratur");
        const lab = b.baris.find((x) => x.kategori === "Rekap Lab & Non Lab" && x.nama === "Sirri Mahmudi");
        cek("kolom ekor terbaca (Audiometri)", !!lab?.nilai?.["Audiometri"]);
        const riw = b.baris.find((x) => x.kategori === "Rekap Riwayat" && x.nama === "Sirri Mahmudi");
        cek("BULAN imunisasi ≠ periode", riw?.nilai?.["RIWAYAT KESEHATAN — BULAN"] === "Juni" && riw?.bulan === "Juni");

        const wak = b.baris.filter((x) => x.kategori === "Rekap Fisik" && /^wakidi$/i.test(x.nama));
        cek("dua Wakidi berbeda tetap terpisah", wak.length === 2, wak.map((x) => ymd(x.tanggalLahir)).join(" & "));
    }

    // ══ 6. Template ══
    bagian("6. Template Excel");
    for (const gaya of ["rapi", "asli"] as const) {
        const buf = await buatTemplateRekap(undefined, gaya);
        const f = `/tmp/uji-tpl-${gaya}.xlsx`;
        fs.writeFileSync(f, buf);
        const wb = XLSX.readFile(f);
        cek(`gaya ${gaya}: 18 sheet (17 + Petunjuk)`, wb.SheetNames.length === 18, `${(buf.length / 1024).toFixed(0)} KB`);
        const a = bacaWorkbookKesehatan(XLSX, wb, []);
        const b = bacaRekapMCU(XLSX, wb, []);
        cek(`gaya ${gaya}: template kosong (0 baris terbaca)`, a.baris.length + b.baris.length === 0);
        cek(`gaya ${gaya}: tidak ada sheet terlewat`, a.sheetDilewati.length + b.sheetDilewati.length === 0);
        if (gaya === "rapi") {
            for (const n of ["Rekap Fisik", "Rekap Lab & Non Lab", "HT"]) {
                const g: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: true, defval: null });
                const bh = g.findIndex((r) => (r || []).some((x) => String(x ?? "").trim() === "Nama"));
                const hdr = g[bh] || [];
                const lebar = TATA_LETAK.find((t) => t.sheet === n)!.lebar;
                const kosong = hdr.slice(0, Math.min(hdr.length, lebar)).filter((x) => x == null || String(x).trim() === "").length;
                cek(`rapi/${n}: tidak ada kolom tanpa nama`, kosong === 0, `${kosong} kosong`);
                cek(`rapi/${n}: kolom A terpakai`, g[bh]?.[0] != null);
            }
        }
    }
    cek("lingkup 'rekap' -> 4 sheet", XLSX.read(await buatTemplateRekap("rekap"), { type: "buffer" }).SheetNames.length === 4);
    cek("lingkup satu sheet -> 2 sheet", XLSX.read(await buatTemplateRekap("Rekap Fisik"), { type: "buffer" }).SheetNames.length === 2);

    // ══ 7. Template diisi -> dibaca ulang ══
    bagian("7. Template diisi lalu dibaca ulang");
    {
        const ExcelJS = (await import("exceljs")).default as any;
        const e = new ExcelJS.Workbook();
        await e.xlsx.readFile("/tmp/uji-tpl-rapi.xlsx");
        const isi = (sheet: string, nilai: Record<string, any>) => {
            const ws = e.getWorksheet(sheet);
            let bh = 0;
            for (let r = 1; r <= 6 && !bh; r++) {
                const v = ws.getRow(r).values as any[];
                if (Array.from({ length: v.length }, (_, i) => String(v[i] ?? "").trim()).includes("Nama")) bh = r;
            }
            const v = ws.getRow(bh).values as any[];
            const hdr = Array.from({ length: v.length }, (_, i) => String(v[i] ?? "").trim());
            const row = ws.getRow(bh + 1);
            for (const [k, val] of Object.entries(nilai)) {
                const c = hdr.findIndex((h) => h.toLowerCase() === k.toLowerCase());
                if (c > 0) row.getCell(c).value = val;
                else console.log(`     ! ${sheet}: kolom "${k}" tak ketemu`);
            }
            row.commit();
        };
        isi("Rekap Fisik", { "No Reg/No Lab": "UJI/I/2026", "Nama": "Uji Fisik", "JK": "M", "TTL": "17/08/1990", "Department": "HSE", "Posisi": "Staff", "Nadi": 84, "BULAN": "Januari", "TAHUN": 2026 });
        isi("HT", { "Nama": "Uji HT", "JK": "F", "TTL": "01/02/1988", "Department": "OPR", "Posisi": "Driver", "Tekanan darah Sistolik (duduk)": 150, "Bulan": "Januari", "Tahun": 2026 });
        isi("Gg Faal Hepar", { "Nama": "Uji Hepar", "Department": "PLANT", "Posisi": "Mekanik", "GOT": 55, "GPT": 70, "Bulan": "Januari", "Tahun": 2026 });
        await e.xlsx.writeFile("/tmp/uji-tpl-isi.xlsx");

        const wb = XLSX.readFile("/tmp/uji-tpl-isi.xlsx");
        const semua = [...bacaWorkbookKesehatan(XLSX, wb, []).baris, ...bacaRekapMCU(XLSX, wb, []).baris];
        cek("3 baris terbaca dari template terisi", semua.length === 3, `${semua.length} baris`);
        const f = semua.find((x) => x.nama === "Uji Fisik");
        cek("Rekap: nilai, TTL, dan periode benar",
            f?.nilai?.["TANDA VITAL — Nadi"] === "84" && ymd(f.tanggalLahir) === "1990-08-17" && f.bulan === "Januari" && f.tahun === 2026);
        cek("sheet penyakit: TTL dd/mm terbaca benar",
            ymd(semua.find((x) => x.nama === "Uji HT")?.tanggalLahir) === "1988-02-01");
        cek("Gg Faal Hepar: GOT masuk nilai", semua.find((x) => x.nama === "Uji Hepar")?.nilai?.GOT === "55");
    }

    // ══ 8. Berkas rusak / bukan MCU ══
    bagian("8. Ketahanan terhadap berkas salah");
    {
        const kosong = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(kosong, XLSX.utils.aoa_to_sheet([["a", "b"], [1, 2]]), "Sheet1");
        const f = "/tmp/uji-bukan-mcu.xlsx";
        XLSX.writeFile(kosong, f);
        const wb = XLSX.readFile(f);
        let meledak = false;
        try {
            const a = bacaWorkbookKesehatan(XLSX, wb, []);
            const b = bacaRekapMCU(XLSX, wb, []);
            cek("berkas bukan MCU: 0 baris, tidak melempar galat", a.baris.length + b.baris.length === 0);
            cek("berkas bukan MCU: semua sheet dilaporkan terlewat", a.sheetDilewati.length === 14 && b.sheetDilewati.length === 3);
        } catch { meledak = true; }
        cek("berkas bukan MCU tidak membuat importir meledak", !meledak);
    }

    // ══ 9. Keadaan database ══
    bagian("9. Keadaan database");
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();
    const q = async (sql: string) => (await c.query(sql)).rows;
    const n = async (sql: string) => Number((await q(sql))[0].n);

    cek("total 1764 baris", await n("SELECT count(*)::int n FROM mcu_health_mapping") === 1764);
    cek("996 baris Rekap", await n("SELECT count(*)::int n FROM mcu_health_mapping WHERE kategori LIKE 'Rekap %'") === 996);
    cek("768 temuan penyakit (angka Profil Kesehatan)", await n("SELECT count(*)::int n FROM mcu_health_mapping WHERE kategori NOT LIKE 'Rekap %'") === 768);
    cek("kunci_baris terisi semua", await n("SELECT count(*)::int n FROM mcu_health_mapping WHERE kunci_baris IS NULL") === 0);
    cek("tidak ada JK ngawur di baris Rekap",
        await n("SELECT count(*)::int n FROM mcu_health_mapping WHERE kategori LIKE 'Rekap %' AND jenis_kelamin NOT IN ('M','F')") === 0);
    cek("tidak ada departemen berupa angka",
        await n("SELECT count(*)::int n FROM mcu_health_mapping WHERE departemen_sumber ~ '^[0-9]+$'") === 0);
    cek("indeks unik baru terpasang",
        (await q("SELECT indexname FROM pg_indexes WHERE tablename='mcu_health_mapping'")).some((r: any) => r.indexname === "UQ_mcu_health_baris2"));
    cek("indeks unik lama sudah dilepas",
        !(await q("SELECT indexname FROM pg_indexes WHERE tablename='mcu_health_mapping'")).some((r: any) => r.indexname === "UQ_mcu_health_baris"));
    cek("kolom no_reg & kunci_baris ada",
        (await q("SELECT column_name FROM information_schema.columns WHERE table_name='mcu_health_mapping'"))
            .map((r: any) => r.column_name).filter((x: string) => ["no_reg", "kunci_baris"].includes(x)).length === 2);
    cek("tidak ada duplikat pada kunci dedup",
        await n("SELECT count(*)::int n FROM (SELECT kategori,kunci_baris,periode FROM mcu_health_mapping GROUP BY 1,2,3 HAVING count(*)>1) x") === 0);
    cek("tidak ada sisa data uji", await n("SELECT count(*)::int n FROM mcu_health_mapping WHERE nama ILIKE 'uji %'") === 0);

    // ══ 10. Tulis-baca-hapus sungguhan ══
    bagian("10. Tulis ke database lalu dibatalkan");
    {
        const sebelum = await n("SELECT count(*)::int n FROM mcu_health_mapping");
        const kb = buatKunciBaris("UJI-AUDIT/2026", "Uji Audit", new Date(Date.UTC(1990, 0, 1)));
        await c.query(
            `INSERT INTO mcu_health_mapping (kategori,bulan,tahun,periode,nama,no_reg,kunci_baris,jenis_kelamin,nilai,status_taut)
             VALUES ('Rekap Fisik','Januari',2026,$1,'Uji Audit','UJI-AUDIT/2026',$2,'M',$3,'BELUM')`,
            [new Date(Date.UTC(2026, 0, 1)), kb, JSON.stringify({ "TANDA VITAL — Nadi": "99" })]);
        const baca = (await q("SELECT nilai->>'TANDA VITAL — Nadi' v FROM mcu_health_mapping WHERE nama='Uji Audit'"))[0];
        cek("baris baru tersimpan & terbaca utuh", baca?.v === "99");

        let ditolak = false;
        try {
            await c.query(
                `INSERT INTO mcu_health_mapping (kategori,bulan,tahun,periode,nama,no_reg,kunci_baris,status_taut)
                 VALUES ('Rekap Fisik','Januari',2026,$1,'Uji Audit','UJI-AUDIT/2026',$2,'BELUM')`,
                [new Date(Date.UTC(2026, 0, 1)), kb]);
        } catch { ditolak = true; }
        cek("baris kembar ditolak indeks unik", ditolak);

        await c.query("DELETE FROM mcu_health_mapping WHERE nama='Uji Audit'");
        cek("data uji dibersihkan, jumlah kembali semula",
            await n("SELECT count(*)::int n FROM mcu_health_mapping") === sebelum);
    }
    await c.end();

    // ══ Ringkasan ══
    console.log("\n" + "═".repeat(58));
    console.log(`  ${lulus} LULUS   ${gagal} GAGAL`);
    if (gagal) { console.log("\n  Yang gagal:"); kegagalan.forEach((k) => console.log("   - " + k)); }
    console.log("═".repeat(58));
    process.exit(gagal ? 1 : 0);
})();
