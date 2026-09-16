/**
 * Ekspor laporan Trend RCA ke Word (.docx) dan Excel (.xlsx).
 *
 * Susunannya mengikuti contoh "RCA Pelanggaran Pengemudi di Area Hauling"
 * (13 bagian). Bagian yang belum diisi manusia TIDAK dikarang — dicetak
 * sebagai "(belum diisi)" supaya ketahuan mana yang masih menunggu analisis,
 * bukan tersamar jadi laporan yang seolah lengkap.
 */

import type { Ringkas } from "./rca";
import { namaBulan } from "./rca";

export interface IsiManual {
    judul: string;
    masalah?: string | null;
    metode?: string;                       // "5why" | "tree"
    why?: { pertanyaan: string; jawaban: string }[];
    akar?: string[];
    tindakan?: { akar: string; tindakan: string; pic: string; target: string; indikator: string }[];
    kesimpulan?: string | null;
    dibuatOleh?: string | null;
    evaluasi?: {
        sebelum: { valid: number; hari: number; perHari: number | null };
        sesudah: { valid: number; hari: number; perHari: number | null };
        turunPersen: number | null;
        efektif: boolean | null;
    } | null;
    evalPeriode?: { dari: string; sampai: string } | null;
}

const KOSONG = "(belum diisi)";
const tglID = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const num = (n: number | null | undefined, d = 0) =>
    n === null || n === undefined ? "—" : n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
/** Persen berformat Indonesia (koma desimal), sesuai bahasa dokumennya. */
const pct = (n: number | null | undefined, tanda = false) =>
    n === null || n === undefined ? "—"
        : `${tanda && n > 0 ? "+" : ""}${n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/* ══════════════════════════════════════════════════════════════════════
 * WORD
 * ════════════════════════════════════════════════════════════════════ */
export async function buatDocx(r: Ringkas, m: IsiManual): Promise<Buffer> {
    const D = await import("docx");
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, WidthType, BorderStyle } = D as any;

    const anak: any[] = [];
    const P = (teks: string, opt: any = {}) => new Paragraph({
        children: [new TextRun({ text: teks, size: opt.size ?? 20, bold: opt.bold, italics: opt.italics, color: opt.color })],
        spacing: { after: opt.after ?? 120 },
        alignment: opt.align,
    });
    const H = (teks: string, lvl = HeadingLevel.HEADING_2) =>
        new Paragraph({ text: teks, heading: lvl, spacing: { before: 240, after: 120 } });

    const sel = (teks: string, opt: any = {}) => new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: teks, size: 18, bold: opt.bold })],
            alignment: opt.align,
        })],
        shading: opt.kepala ? { fill: "F2F2F2" } : undefined,
        width: opt.lebar ? { size: opt.lebar, type: WidthType.PERCENTAGE } : undefined,
    });
    const tabel = (kepala: string[], baris: string[][], lebar?: number[]) => new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
        },
        rows: [
            new TableRow({
                tableHeader: true,
                children: kepala.map((h, i) => sel(h, { bold: true, kepala: true, lebar: lebar?.[i] })),
            }),
            ...baris.map((b) => new TableRow({ children: b.map((x, i) => sel(x, { lebar: lebar?.[i] })) })),
        ],
    });
    const jarak = () => new Paragraph({ text: "", spacing: { after: 120 } });

    const s = r.statistik;
    const genap = r.perBulan.filter((x) => x.genap);
    const awal = genap[0], akhir = genap[genap.length - 1];

    /* ── Judul ────────────────────────────────────────────────────── */
    anak.push(new Paragraph({ text: "Laporan Hasil Analisis Root Cause Analysis (RCA)", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
    anak.push(P(m.judul, { bold: true, size: 26, align: AlignmentType.CENTER, after: 60 }));
    anak.push(P(`Periode data: ${tglID(r.periode.dari)} – ${tglID(r.periode.sampai)}`, { align: AlignmentType.CENTER, after: 40 }));
    anak.push(P("Metode: DIKW, Statistik Deskriptif, Trend Analysis, 5 Why's / Why Tree", { align: AlignmentType.CENTER, italics: true, after: 40 }));
    anak.push(P("Sumber data: FMS (FAMOUS) — hanya alert berstatus Valid", { align: AlignmentType.CENTER, italics: true, after: 240 }));

    /* ── 1 Ringkasan ──────────────────────────────────────────────── */
    anak.push(H("1. Ringkasan"));
    const dom = r.perJenis[0];
    anak.push(tabel(["Aspek", "Ringkasan"], [
        ["Masalah utama", m.masalah || KOSONG],
        ["Data kunci", awal && akhir
            ? `Total pelanggaran valid ${s.arah === "naik" ? "naik" : s.arah === "turun" ? "turun" : "bergerak"} dari ${num(awal.total)} kasus pada ${namaBulan(awal.bulan)} menjadi ${num(akhir.total)} kasus pada ${namaBulan(akhir.bulan)}${s.perubahanAwalAkhir !== null ? `, atau ${s.perubahanAwalAkhir > 0 ? "meningkat" : "menurun"} ${pct(Math.abs(s.perubahanAwalAkhir))}` : ""}.`
            : "Data belum cukup untuk menyimpulkan tren."],
        ["Kategori dominan", dom ? `${dom.jenis} adalah kontributor terbesar: ${num(dom.jumlah)} kasus dari ${num(s.total)} total (${pct(dom.persen)}).` : KOSONG],
        ["Akar penyebab utama", (m.akar?.length ? m.akar.join("; ") : KOSONG)],
        ["Rekomendasi inti", (m.tindakan?.length ? m.tindakan.map((t) => t.tindakan).join("; ") : KOSONG)],
    ], [24, 76]));

    /* ── 2 Ruang lingkup ──────────────────────────────────────────── */
    anak.push(H("2. Ruang Lingkup dan Tujuan"));
    anak.push(P(`Ruang lingkup: pelanggaran yang terekam sistem FMS pada periode ${tglID(r.periode.dari)} – ${tglID(r.periode.sampai)}, dibatasi pada alert yang telah divalidasi berstatus Valid.`));
    anak.push(P("Tujuan: mengubah data pelanggaran menjadi informasi, pengetahuan, dan keputusan perbaikan berbasis bukti sesuai kerangka DIKW."));
    anak.push(P("Output: identifikasi tren, akar penyebab, rencana tindakan perbaikan, indikator evaluasi, dan rekomendasi tindak lanjut."));

    /* ── 3 Data dasar ─────────────────────────────────────────────── */
    anak.push(H("3. Data Dasar Pelanggaran"));
    anak.push(tabel(
        ["Bulan", ...r.jenisTeratas, "Total", "Ket."],
        r.matriks.map((mx) => {
            const bl = r.perBulan.find((x) => x.bulan === mx.bulan)!;
            return [namaBulan(mx.bulan), ...r.jenisTeratas.map((t) => num(mx.nilai[t] ?? 0)),
                num(mx.total), bl.genap ? "" : `data ${bl.hariTercakup}/${bl.hariBulan} hari`];
        })));
    anak.push(jarak());
    anak.push(P(`Catatan: angka di atas adalah alert berstatus Valid. Dari ${num(s.mentah)} total alert pada periode ini, ${num(s.total)} (${pct(s.persenValid)}) tervalidasi valid.`, { italics: true }));

    /* ── 4 DIKW ───────────────────────────────────────────────────── */
    anak.push(H("4. Kerangka DIKW untuk Pengolahan Data"));
    anak.push(tabel(["Tahap", "Makna", "Penerapan pada kasus"], [
        ["Data", "Fakta mentah atau angka kejadian.",
            dom ? `${num(dom.jumlah)} ${dom.jenis}, ${r.perJenis[1] ? `${num(r.perJenis[1].jumlah)} ${r.perJenis[1].jenis}` : ""}${r.perJenis[2] ? `, ${num(r.perJenis[2].jumlah)} ${r.perJenis[2].jenis}` : ""}.` : KOSONG],
        ["Informasi", "Data yang sudah diolah menjadi pola atau makna.",
            `Total ${num(s.totalGenap)} pelanggaran valid pada ${s.bulanGenap} bulan penuh; rata-rata ${num(s.rata, 1)} kasus/bulan${s.perubahanAwalAkhir !== null ? `, dengan perubahan ${pct(s.perubahanAwalAkhir, true)} dari awal ke akhir periode` : ""}.`],
        ["Pengetahuan", "Pemahaman mengapa masalah terjadi melalui analisis tren dan RCA.",
            m.akar?.length ? m.akar.join("; ") : KOSONG],
        ["Kebijaksanaan", "Keputusan korektif yang efektif, beretika, dan berkelanjutan.",
            m.tindakan?.length ? m.tindakan.map((t) => t.tindakan).join("; ") : KOSONG],
    ], [14, 28, 58]));

    /* ── 5 Statistik deskriptif ───────────────────────────────────── */
    anak.push(H("5. Analisis Statistik Deskriptif"));
    anak.push(tabel(["Parameter", "Nilai", "Interpretasi"], [
        ["Total pelanggaran valid", num(s.totalGenap), `Jumlah pada ${s.bulanGenap} bulan dengan data penuh.`],
        ["Total seluruh alert", num(s.mentah), `Sebelum validasi; ${pct(s.persenValid)} di antaranya valid.`],
        ["Rata-rata per bulan", num(s.rata, 1), "Beban pelanggaran bulanan."],
        ["Median", num(s.median, 1), "Nilai tengah total bulanan."],
        ["Modus", s.modus === null ? "—" : num(s.modus), s.modus === null ? "Tidak ada nilai bulanan yang berulang." : "Nilai bulanan yang paling sering muncul."],
        ["Bulan tertinggi", s.tertinggi ? `${namaBulan(s.tertinggi.bulan)} (${num(s.tertinggi.nilai)})` : "—", "Puncak periode."],
        ["Bulan terendah", s.terendah ? `${namaBulan(s.terendah.bulan)} (${num(s.terendah.nilai)})` : "—", "Titik terendah periode."],
        ["Perubahan awal → akhir", pct(s.perubahanAwalAkhir, true), s.arah === "naik" ? "Tren memburuk, perlu RCA." : s.arah === "turun" ? "Tren membaik." : "Relatif datar."],
        ["Perubahan periode terakhir", pct(s.perubahanTerakhir, true), "Bulan terakhir dibanding sebelumnya."],
    ], [26, 18, 56]));
    anak.push(jarak());
    anak.push(tabel(["Jenis Pelanggaran", "Jumlah Kasus", "Proporsi"],
        r.perJenis.slice(0, 10).map((x) => [x.jenis, num(x.jumlah), pct(x.persen)]), [56, 22, 22]));

    /* ── 6 Tren ───────────────────────────────────────────────────── */
    anak.push(H("6. Trend per Bulan"));
    anak.push(tabel(["Bulan", "Pelanggaran valid", "Total alert", "Unit aktif", "Cakupan data"],
        r.perBulan.map((b) => [namaBulan(b.bulan), num(b.total), num(b.mentah), num(b.unit),
            b.genap ? "penuh" : `${b.hariTercakup}/${b.hariBulan} hari`])));

    /* ── 7 Interpretasi ───────────────────────────────────────────── */
    anak.push(H("7. Interpretasi Trend"));
    if (r.sinyal.length) r.sinyal.forEach((x) => anak.push(new Paragraph({ text: x, bullet: { level: 0 }, spacing: { after: 80 } })));
    else anak.push(P(KOSONG, { italics: true }));

    /* ── 8 Pernyataan masalah ─────────────────────────────────────── */
    anak.push(H("8. Pernyataan Masalah Utama"));
    anak.push(P(m.masalah || KOSONG, { italics: !m.masalah }));

    /* ── 9/10 5-Why atau Why Tree ─────────────────────────────────── */
    const tree = (m.metode || "5why") === "tree";
    anak.push(H(tree ? "9. Why Tree — Faktor Penyebab Berlapis" : "9. Analisis 5 Why"));
    if (m.why?.length) {
        anak.push(tabel(["Why", "Pertanyaan", "Jawaban"],
            m.why.map((w, i) => [String(i + 1), w.pertanyaan || "—", w.jawaban || "—"]), [8, 36, 56]));
    } else anak.push(P(KOSONG, { italics: true }));
    anak.push(jarak());
    anak.push(P("Akar penyebab utama:", { bold: true, after: 60 }));
    if (m.akar?.length) m.akar.forEach((a) => anak.push(new Paragraph({ text: a, bullet: { level: 0 }, spacing: { after: 60 } })));
    else anak.push(P(KOSONG, { italics: true }));

    /* ── 11 Rencana tindakan ──────────────────────────────────────── */
    anak.push(H("10. Rencana Tindakan Perbaikan"));
    if (m.tindakan?.length) {
        anak.push(tabel(["Akar Penyebab", "Tindakan Perbaikan", "PIC", "Target Waktu", "Indikator Keberhasilan"],
            m.tindakan.map((t) => [t.akar || "—", t.tindakan || "—", t.pic || "—", t.target || "—", t.indikator || "—"]),
            [20, 30, 14, 14, 22]));
    } else anak.push(P(KOSONG, { italics: true }));

    /* ── 12 Evaluasi efektivitas ──────────────────────────────────── */
    anak.push(H("11. Evaluasi Efektivitas"));
    if (m.evaluasi && m.evalPeriode) {
        const e = m.evaluasi;
        anak.push(P(`Periode sesudah tindakan: ${tglID(m.evalPeriode.dari)} – ${tglID(m.evalPeriode.sampai)}`, { after: 120 }));
        anak.push(tabel(["Parameter", "Sebelum", "Sesudah"], [
            ["Pelanggaran valid", num(e.sebelum.valid), num(e.sesudah.valid)],
            ["Hari tercakup", num(e.sebelum.hari), num(e.sesudah.hari)],
            ["Rata-rata per hari", num(e.sebelum.perHari, 1), num(e.sesudah.perHari, 1)],
        ], [40, 30, 30]));
        anak.push(jarak());
        // Dibandingkan per hari, bukan total — panjang periode jarang sama.
        anak.push(P(e.turunPersen === null
            ? "Data belum cukup untuk mengukur efektivitas."
            : `Perbandingan dilakukan per hari karena panjang kedua periode berbeda. Rata-rata harian ${e.turunPersen > 0 ? "turun" : "naik"} ${pct(Math.abs(e.turunPersen))} setelah tindakan diterapkan.`,
            { bold: true }));
    } else {
        anak.push(P("Belum dievaluasi. Sesuai panduan, evaluasi dilakukan setelah tindakan berjalan 1–3 bulan dengan membandingkan data sebelum dan sesudah.", { italics: true }));
    }

    /* ── 13 Kesimpulan ────────────────────────────────────────────── */
    anak.push(H("12. Kesimpulan dan Rekomendasi"));
    anak.push(P(m.kesimpulan || KOSONG, { italics: !m.kesimpulan }));

    anak.push(jarak());
    anak.push(P(`Disusun oleh: ${m.dibuatOleh || "—"} · Dicetak ${new Date().toLocaleString("id-ID")}`, { size: 16, italics: true }));

    const doc = new Document({
        creator: "OneTalent — PT GECL",
        title: m.judul,
        description: "Laporan Trend RCA",
        sections: [{ properties: {}, children: anak }],
    });
    return Buffer.from(await Packer.toBuffer(doc));
}

/* ══════════════════════════════════════════════════════════════════════
 * EXCEL
 * ════════════════════════════════════════════════════════════════════ */
export async function buatXlsx(r: Ringkas, m: IsiManual): Promise<Buffer> {
    const ExcelJS = (await import("exceljs")).default as any;
    const wb = new ExcelJS.Workbook();
    wb.creator = "OneTalent"; wb.created = new Date();

    const kepala = (ws: any, n: number) => {
        const h = ws.getRow(1);
        h.font = { bold: true };
        h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        h.border = { bottom: { style: "thin", color: { argb: "FFBFBFBF" } } };
        ws.views = [{ state: "frozen", ySplit: 1 }];
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: n } };
    };
    const s = r.statistik;

    /* Lembar 1 — Ringkasan */
    const s1 = wb.addWorksheet("Ringkasan");
    s1.columns = [{ width: 34 }, { width: 60 }, { width: 16 }];
    const b1 = (a: string, b: any = "", c: any = "") => s1.addRow([a, b, c]);
    b1("LAPORAN TREND RCA").font = { bold: true, size: 13 };
    b1(m.judul);
    b1("Periode", `${r.periode.dari} s/d ${r.periode.sampai}`);
    b1("Sumber", "FMS (FAMOUS) — hanya alert berstatus Valid");
    b1("Metode", "DIKW, Statistik Deskriptif, Trend Analysis, 5 Why's / Why Tree");
    b1("Disusun oleh", m.dibuatOleh || "—");
    b1("Dicetak", new Date().toLocaleString("id-ID"));
    b1("");
    b1("STATISTIK DESKRIPTIF").font = { bold: true };
    b1("Total pelanggaran valid (bulan penuh)", s.totalGenap);
    b1("Jumlah bulan penuh", s.bulanGenap);
    b1("Total seluruh alert", s.mentah);
    b1("Persen valid", s.persenValid === null ? "—" : s.persenValid / 100).numFmt = "0.0%";
    b1("Rata-rata per bulan", s.rata ?? "—");
    b1("Median", s.median ?? "—");
    b1("Modus", s.modus ?? "—");
    b1("Bulan tertinggi", s.tertinggi ? `${namaBulan(s.tertinggi.bulan)} (${s.tertinggi.nilai})` : "—");
    b1("Perubahan awal → akhir", s.perubahanAwalAkhir === null ? "—" : s.perubahanAwalAkhir / 100).numFmt = "+0.0%;-0.0%";
    b1("");
    b1("INTERPRETASI TREND").font = { bold: true };
    r.sinyal.forEach((x) => b1(x));
    b1("");
    b1("PERNYATAAN MASALAH").font = { bold: true };
    b1(m.masalah || KOSONG);
    b1("");
    b1("KESIMPULAN").font = { bold: true };
    b1(m.kesimpulan || KOSONG);

    /* Lembar 2 — Data dasar (matriks bulan x jenis) */
    const s2 = wb.addWorksheet("Data Dasar");
    s2.columns = [{ header: "Bulan", key: "bulan", width: 18 },
        ...r.jenisTeratas.map((t) => ({ header: t, key: t, width: 22 })),
        { header: "Total valid", key: "total", width: 13 },
        { header: "Total alert", key: "mentah", width: 13 },
        { header: "Unit aktif", key: "unit", width: 11 },
        { header: "Cakupan data", key: "cakupan", width: 16 }];
    r.matriks.forEach((mx) => {
        const bl = r.perBulan.find((x) => x.bulan === mx.bulan)!;
        const baris: any = { bulan: namaBulan(mx.bulan), total: mx.total, mentah: bl.mentah, unit: bl.unit,
            cakupan: bl.genap ? "penuh" : `${bl.hariTercakup}/${bl.hariBulan} hari` };
        r.jenisTeratas.forEach((t) => { baris[t] = mx.nilai[t] ?? 0; });
        const row = s2.addRow(baris);
        // Bulan belum genap ditandai — kalau tidak, terbaca sebagai penurunan palsu.
        if (!bl.genap) row.font = { color: { argb: "FFB45309" }, italic: true };
    });
    kepala(s2, s2.columns.length);

    /* Lembar 3 — Per jenis */
    const s3 = wb.addWorksheet("Per Jenis");
    s3.columns = [{ header: "Jenis pelanggaran", key: "j", width: 40 },
        { header: "Jumlah kasus", key: "n", width: 15 },
        { header: "Proporsi", key: "p", width: 12 }];
    r.perJenis.forEach((x) => {
        const row = s3.addRow({ j: x.jenis, n: x.jumlah, p: x.persen / 100 });
        row.getCell("p").numFmt = "0.0%";
    });
    kepala(s3, 3);

    /* Lembar 4 — Sumbu bantu */
    const s4 = wb.addWorksheet("Sumbu Analisis");
    s4.columns = [{ width: 22 }, { width: 16 }, { width: 4 }, { width: 22 }, { width: 16 }];
    s4.addRow(["PER SHIFT", "Jumlah", "", "PER JAM", "Jumlah"]);
    const shift = Object.entries(r.perShift);
    const jam = Object.entries(r.perJam);
    for (let i = 0; i < Math.max(shift.length, jam.length); i++) {
        s4.addRow([shift[i]?.[0] ?? "", shift[i]?.[1] ?? "", "",
            jam[i] ? `${jam[i][0]}.00` : "", jam[i]?.[1] ?? ""]);
    }
    s4.addRow([]); s4.addRow(["PER LOKASI (10 teratas)", "Jumlah", "", "PER UNIT (10 teratas)", "Jumlah"]);
    for (let i = 0; i < Math.max(r.perLokasi.length, r.perUnit.length); i++) {
        s4.addRow([r.perLokasi[i]?.lokasi ?? "", r.perLokasi[i]?.jumlah ?? "", "",
            r.perUnit[i]?.unit ?? "", r.perUnit[i]?.jumlah ?? ""]);
    }
    s4.getRow(1).font = { bold: true };

    /* Lembar 5 — Analisis 5-Why / Why Tree */
    const s5 = wb.addWorksheet("Analisis Why");
    s5.columns = [{ header: "Why", key: "n", width: 6 },
        { header: "Pertanyaan", key: "q", width: 48 },
        { header: "Jawaban", key: "a", width: 64 }];
    (m.why ?? []).forEach((w, i) => s5.addRow({ n: i + 1, q: w.pertanyaan || "—", a: w.jawaban || "—" }));
    if (!m.why?.length) s5.addRow({ n: "", q: KOSONG, a: "" });
    kepala(s5, 3);
    s5.addRow([]); const rA = s5.addRow(["AKAR PENYEBAB UTAMA"]); rA.font = { bold: true };
    (m.akar?.length ? m.akar : [KOSONG]).forEach((a) => s5.addRow(["", a]));

    /* Lembar 6 — Rencana tindakan */
    const s6 = wb.addWorksheet("Rencana Tindakan");
    s6.columns = [{ header: "Akar penyebab", key: "akar", width: 34 },
        { header: "Tindakan perbaikan", key: "tindakan", width: 48 },
        { header: "PIC", key: "pic", width: 22 },
        { header: "Target waktu", key: "target", width: 16 },
        { header: "Indikator keberhasilan", key: "indikator", width: 40 }];
    (m.tindakan ?? []).forEach((t) => s6.addRow(t));
    if (!m.tindakan?.length) s6.addRow({ akar: KOSONG });
    kepala(s6, 5);

    /* Lembar 7 — Evaluasi efektivitas */
    const s7 = wb.addWorksheet("Evaluasi");
    s7.columns = [{ width: 30 }, { width: 20 }, { width: 20 }];
    if (m.evaluasi && m.evalPeriode) {
        const e = m.evaluasi;
        s7.addRow(["Parameter", "Sebelum", "Sesudah"]).font = { bold: true };
        s7.addRow(["Periode", `${r.periode.dari} s/d ${r.periode.sampai}`, `${m.evalPeriode.dari} s/d ${m.evalPeriode.sampai}`]);
        s7.addRow(["Pelanggaran valid", e.sebelum.valid, e.sesudah.valid]);
        s7.addRow(["Hari tercakup", e.sebelum.hari, e.sesudah.hari]);
        s7.addRow(["Rata-rata per hari", e.sebelum.perHari ?? "—", e.sesudah.perHari ?? "—"]);
        s7.addRow([]);
        const rr = s7.addRow(["Perubahan per hari", e.turunPersen === null ? "—" : `${e.turunPersen > 0 ? "turun " : "naik "}${pct(Math.abs(e.turunPersen))}`]);
        rr.font = { bold: true };
        s7.addRow(["Catatan", "Dibandingkan per hari karena panjang periode berbeda."]);
    } else {
        s7.addRow(["Belum dievaluasi."]).font = { italic: true };
        s7.addRow(["Sesuai panduan, evaluasi dilakukan setelah tindakan berjalan 1–3 bulan."]);
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
}
