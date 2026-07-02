// Renderer PDF generik untuk form SIDAK (semua tipe) — dipakai endpoint publik
// GET /api/sidak-recap/form-pdf agar link "Download Form" di export Excel langsung mengunduh file.
// Input = JSON dari /api/sidak-recap/detail ({session, records, observers}); output = Buffer PDF.
import PDFDocument from "pdfkit";
import { dbStorage } from "../services/storage-db";

const RED = "#B91C1C";
const GRAY = "#6B7280";
const DARK = "#111827";
const LINE = "#D1D5DB";

// Field yang tidak perlu ditampilkan di blok data (teknis/duplikat/besar)
const SKIP_KEYS = new Set([
  "id", "sessionId", "createdAt", "updatedAt", "photos", "activityPhotos",
  "employeeSignature", "observerSignature", "signature", "signatureUrl", "pvtVideoUrl", "supervisorVideoUrl",
]);

function labelize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function scalarEntries(obj: Record<string, any>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (SKIP_KEYS.has(k)) continue;
    if (v == null || v === "") continue;
    if (typeof v === "object") continue;
    const s = String(v);
    if (s.startsWith("data:") || s.length > 300) continue; // base64/teks raksasa — lewati
    out.push([labelize(k), s]);
  }
  return out;
}

function kvRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelW = 150;
  const y = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(label, x, y, { width: labelW });
  doc.font("Helvetica").fontSize(9).fillColor(DARK).text(value, x + labelW, y, { width: w - labelW });
  doc.moveDown(0.2);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

export async function renderSidakFormPdf(detail: {
  session: Record<string, any>;
  records?: Array<Record<string, any>>;
  observers?: Array<Record<string, any>>;
}, type: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 42, bottom: 42, left: 42, right: 42 } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const s = detail.session || {};
  const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ==== Kop ====
  doc.font("Helvetica-Bold").fontSize(16).fillColor(RED).text(`FORM SIDAK ${String(type).toUpperCase()}`, { align: "center" });
  doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("PT. Golden Energi Cemerlang Lestari — OneTalent HSE", { align: "center" });
  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor(RED).lineWidth(1.5).stroke();
  doc.moveDown(0.6);

  // ==== Header sesi ====
  const waktu = (s.waktuMulai && s.waktuSelesai) ? `${s.waktuMulai} - ${s.waktuSelesai}` : (s.waktu || s.jam || "-");
  const header: Array<[string, any]> = [
    ["Tanggal", s.tanggal], ["Waktu", waktu], ["Shift", s.shift],
    ["Lokasi", s.lokasi], ["Departemen", s.departemen || s.subLokasi],
    ["Area/Perusahaan", s.area || s.perusahaan], ["Jumlah Sampel", s.totalSampel],
    ["Supervisor/PIC", s.createdBy || s.namaSupervisor || s.supervisorName || s.picName],
  ];
  for (const [label, v] of header) {
    if (v == null || v === "") continue;
    kvRow(doc, label, String(v));
  }

  // ==== Records ====
  const records = detail.records || [];
  if (records.length) {
    doc.moveDown(0.6);
    ensureSpace(doc, 40);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text(`Data Pemeriksaan (${records.length})`);
    doc.moveDown(0.3);
    records.forEach((r, i) => {
      const entries = scalarEntries(r);
      ensureSpace(doc, 30 + entries.length * 13);
      const yStart = doc.y;
      doc.font("Helvetica-Bold").fontSize(9).fillColor(RED).text(`#${i + 1}`, doc.page.margins.left, yStart);
      doc.moveDown(0.15);
      for (const [label, value] of entries) kvRow(doc, label, value);
      doc.moveDown(0.25);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.moveDown(0.35);
    });
  }

  // ==== Observers ====
  const observers = detail.observers || [];
  if (observers.length) {
    ensureSpace(doc, 60);
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text("Observer");
    doc.moveDown(0.2);
    observers.forEach((o, i) => {
      const nama = o.nama || o.name || "-";
      const extra = [o.nik, o.jabatan, o.perusahaan].filter(Boolean).join(" · ");
      doc.font("Helvetica").fontSize(9).fillColor(DARK).text(`${i + 1}. ${nama}${extra ? `  (${extra})` : ""}`);
    });
  }

  // ==== Foto kegiatan (embed, maks 4) ====
  const photoPaths: string[] = (s.photos || s.activityPhotos || [])
    .filter((u: any) => typeof u === "string" && u.startsWith("/api/uploads/"))
    .slice(0, 4);
  if (photoPaths.length) {
    ensureSpace(doc, 220);
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text("Foto Kegiatan");
    doc.moveDown(0.3);
    const imgW = (contentW - 12) / 2;
    let col = 0;
    let rowY = doc.y;
    for (const p of photoPaths) {
      try {
        const file = await dbStorage.getFile(p.replace("/api/uploads/", ""));
        if (!file || !/^image\//i.test(file.mimeType || "")) continue;
        const x = doc.page.margins.left + col * (imgW + 12);
        if (rowY + 160 > doc.page.height - doc.page.margins.bottom) { doc.addPage(); rowY = doc.y; }
        doc.image(file.data, x, rowY, { fit: [imgW, 150] });
        col++;
        if (col === 2) { col = 0; rowY += 160; }
      } catch { /* foto korup/tak ada — lewati */ }
    }
    doc.y = col === 0 ? rowY : rowY + 160;
  }

  // ==== Footer ====
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(8).fillColor(GRAY)
    .text(`Dokumen dibuat otomatis oleh OneTalent · ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA`, { align: "center" });

  doc.end();
  return done;
}
