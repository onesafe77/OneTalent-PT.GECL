// Pembentuk workbook export Profil Kesehatan — bentuknya mengikuti file sumber:
// satu sheet per kategori, baris judul sama dgn sumber, lalu header
// No. | Bulan | Tahun | Nama | JK | TTL | Department | Posisi | <nilai...> | KESIMPULAN | Tindak Lanjut
// Dipisah dari routes.ts agar hasilnya bisa diuji tanpa lewat HTTP.

export interface BarisExport {
  kategori: string; bulan: string | null; tahun: number | null;
  nama: string; jenisKelamin: string | null; tanggalLahir: any;
  departemenSumber: string | null; posisiSumber: string | null;
  nilai: Record<string, string> | null;
  kesimpulan: string | null; tindakLanjut: string | null;
  empNama?: string | null; empDept?: string | null; empPosisi?: string | null;
}

const tglID = (d: any) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export async function buatWorkbookKesehatan(ExcelJS: any, rows: BarisExport[]): Promise<any> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OneTalent";

  const perKategori = new Map<string, BarisExport[]>();
  for (const r of rows) {
    if (!perKategori.has(r.kategori)) perKategori.set(r.kategori, []);
    perKategori.get(r.kategori)!.push(r);
  }

  for (const [kategori, isi] of perKategori) {
    // Nama sheet Excel: maks 31 karakter & tanpa karakter terlarang.
    const namaSheet = kategori.replace(/[\\/?*\[\]:]/g, "-").slice(0, 31);
    const ws = wb.addWorksheet(namaSheet);

    const kolomNilai: string[] = [];
    isi.forEach(r => Object.keys(r.nilai || {}).forEach(k => { if (!kolomNilai.includes(k)) kolomNilai.push(k); }));

    const header = ["No.", "Bulan", "Tahun", "Nama", "JK", "TTL", "Department", "Posisi",
      ...kolomNilai, "KESIMPULAN", "Tindak Lanjut"];

    ws.addRow(["DATABASE & MAPPING PROFIL KESEHATAN PT GECL"]);
    ws.mergeCells(1, 1, 1, Math.max(1, header.length));
    ws.getRow(1).font = { bold: true, size: 12 };
    ws.getRow(1).alignment = { horizontal: "center" };
    ws.addRow([]);

    const barisHeader = ws.addRow(header);
    barisHeader.font = { bold: true };
    barisHeader.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    barisHeader.eachCell((c: any) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    isi.forEach((r, i) => {
      const baris = ws.addRow([
        i + 1, r.bulan || "", r.tahun ?? "", r.empNama || r.nama,
        r.jenisKelamin || "", tglID(r.tanggalLahir),
        r.empDept || r.departemenSumber || "-", r.empPosisi || r.posisiSumber || "-",
        ...kolomNilai.map(k => r.nilai?.[k] ?? ""),
        r.kesimpulan || "", r.tindakLanjut || "",
      ]);
      baris.eachCell((c: any) => {
        c.border = { top: { style: "hair" }, left: { style: "hair" }, bottom: { style: "hair" }, right: { style: "hair" } };
        c.alignment = { vertical: "top", wrapText: true };
      });
    });

    ws.columns.forEach((col: any, i: number) => {
      const lebar = String(header[i] || "").length + 3;
      col.width = (i >= 8 && i < 8 + kolomNilai.length)
        ? Math.max(18, Math.min(46, lebar))
        : Math.max(9, Math.min(28, lebar));
    });
    ws.views = [{ state: "frozen", ySplit: 3 }];
  }

  if (perKategori.size === 0) wb.addWorksheet("Kosong").addRow(["Tidak ada data"]);
  return wb;
}
