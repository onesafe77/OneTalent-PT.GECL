
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Dummy Data
const session = {
    tanggal: '05-02-2025',
    waktu: '09:00',
    lokasi: 'Office Building A',
    namaPerusahaan: 'PT. GECL',
    departemen: 'HSE',
    penanggungjawabArea: 'Ahmad Supervisor',
    jenisAlatMerk: 'Lux Meter / Kyoritsu',
    noSeriAlat: 'KY-2024-X99'
};

const records = [
    {
        titik: 'Meja Kerja Admin',
        sumber: 'Lampu TL 36W',
        jenis: 'General',
        intensitas: '350',
        jarak: '1.5m',
        visual: 'Cukup',
        ket: 'Sesuai standar office'
    },
    {
        titik: 'Lorong Utama',
        sumber: 'LED Downlight',
        jenis: 'General',
        intensitas: '120',
        jarak: '2.5m',
        visual: 'Cukup',
        ket: 'Area jalan cukup terang'
    },
    {
        titik: 'Gudang Arsip Pojok',
        sumber: 'Lampu Pijar',
        jenis: 'Lokal',
        intensitas: '45',
        jarak: '3m',
        visual: 'Gelap',
        ket: 'Lampu mati satu, perlu penggantian'
    }
];

const observers = [
    { nama: 'Budi (Inspector)', perusahaan: 'PT. GECL', tandaTangan: '' },
    { nama: 'Siti (Saksi)', perusahaan: 'PT. BIB', tandaTangan: '' }
];

async function generateSamplePDF() {
    // Landscape A4
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        bufferPages: true
    });

    const outputPath = path.join(projectRoot, 'client', 'public', 'pencahayaan_sample.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const margin = 30;
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const contentWidth = pageWidth - (margin * 2);

    // --- HEADER ---
    doc.font('Helvetica-Bold').fontSize(12).text('PT BORNEO INDOBARA', margin, margin);

    // Doc Code
    doc.font('Helvetica').fontSize(9)
        .text('BIB – HSE – ES – F – 3.02 – 25', margin, margin + 5, { width: contentWidth, align: 'right' });
    doc.text('Mei 2020/R0', margin, margin + 15, { width: contentWidth, align: 'right' });

    // Title
    const titleY = margin + 30;
    doc.font('Helvetica-Bold').fontSize(14)
        .text('PEMERIKSAAN DAN PENGUJIAN PENCAHAYAAN', margin, titleY, { width: contentWidth, align: 'center' });

    doc.font('Helvetica').fontSize(10)
        .text('Formulir ini digunakan sebagai catatan hasil pengecekan dan pengujian pencahayaan', margin, titleY + 20, { width: contentWidth, align: 'center' });
    doc.text('yang dilaksanakan di PT Borneo Indobara', margin, titleY + 32, { width: contentWidth, align: 'center' });

    // --- INFO TABLE ---
    const infoY = titleY + 50;
    const infoH = 60; // 4 rows

    // Grid Setup for Info
    const col1W = 120; // Label
    const col2W = 280; // Value
    const col3W = 120; // Label
    // Remaining for Col 4

    // Draw fields semi-manually
    doc.rect(margin, infoY, contentWidth, infoH).stroke();

    // Horizontal Lines
    doc.moveTo(margin, infoY + 15).lineTo(margin + contentWidth, infoY + 15).stroke();
    doc.moveTo(margin, infoY + 30).lineTo(margin + contentWidth, infoY + 30).stroke();
    doc.moveTo(margin, infoY + 45).lineTo(margin + contentWidth, infoY + 45).stroke();

    // Vertical Lines (approximate for 2 cols split)
    const midX = margin + (contentWidth / 2);
    doc.moveTo(midX, infoY).lineTo(midX, infoY + infoH).stroke();

    // Data Mapping
    const infoRows = [
        ['Nama Perusahaan', session.namaPerusahaan, 'Jenis Alat & Merk', session.jenisAlatMerk],
        ['Departemen', session.departemen, 'No Seri Alat', session.noSeriAlat],
        ['Lokasi Pengukuran', session.lokasi, 'Kunjungan Ke', '1'],
        ['Penanggungjawab Area', session.penanggungjawabArea, 'Waktu', session.waktu + ', ' + session.tanggal]
    ];

    doc.fontSize(9);
    let rowY = infoY + 4;
    infoRows.forEach(row => {
        // Col 1
        doc.font('Helvetica-Bold').text(row[0], margin + 5, rowY);
        doc.font('Helvetica').text(row[1], margin + 130, rowY);

        // Col 2
        doc.font('Helvetica-Bold').text(row[2], midX + 5, rowY);
        doc.font('Helvetica').text(row[3], midX + 130, rowY);

        rowY += 15;
    });

    // --- MAIN TABLE ---
    const tableY = infoY + infoH + 15;

    // Columns: No, Titik, Sumber, Jenis, Intensitas, Jarak, Visual, Ket
    const cols = [
        { name: 'No', w: 30, align: 'center' },
        { name: 'Titik Pengambilan', w: 150, align: 'left' },
        { name: 'Sumber Penerangan', w: 120, align: 'left' },
        { name: 'Jenis', w: 100, align: 'left' },
        { name: 'Intensitas (Lux)', w: 80, align: 'center' },
        { name: 'Jarak (m)', w: 60, align: 'center' },
        { name: 'Visual*', w: 80, align: 'center' },
        { name: 'Keterangan**', w: 161, align: 'left' } // Fill rest
    ];

    const hdrH = 25;

    // Header
    doc.fillColor('#e0e0e0').rect(margin, tableY, contentWidth, hdrH).fill();
    doc.fillColor('#000000');

    let tx = margin;
    cols.forEach(c => {
        doc.rect(tx, tableY, c.w, hdrH).stroke();
        doc.font('Helvetica-Bold').text(c.name, tx + 2, tableY + 8, { width: c.w - 4, align: c.align as any });
        tx += c.w;
    });

    let cy = tableY + hdrH;
    const rowH = 20;

    // Rows
    for (let i = 0; i < 10; i++) { // Min 10 rows
        const rec = records[i] || {};

        tx = margin;
        cols.forEach((c, idx) => {
            doc.rect(tx, cy, c.w, rowH).stroke();
            doc.font('Helvetica');
            let val = '';
            if (idx === 0) val = (i + 1).toString();
            else if (idx === 1) val = rec.titik || '';
            else if (idx === 2) val = rec.sumber || '';
            else if (idx === 3) val = rec.jenis || '';
            else if (idx === 4) val = rec.intensitas || '';
            else if (idx === 5) val = rec.jarak || '';
            else if (idx === 6) val = rec.visual || '';
            else if (idx === 7) val = rec.ket || '';

            doc.text(val, tx + 2, cy + 6, { width: c.w - 4, align: c.align as any });
            tx += c.w;
        });
        cy += rowH;
    }

    // --- FOOTER NOTES ---
    cy += 5;
    doc.font('Helvetica-Bold').fontSize(8).text('Catatan:', margin, cy);
    cy += 10;
    doc.font('Helvetica').text('*Secara visual diisi dengan sangat gelap, gelap, cukup, terang, sangat terang.', margin, cy);
    cy += 10;
    doc.text('**Di bagian keterangan dijelaskan hasil dari secara visual', margin, cy);

    // --- SIGNATURES ---
    cy += 20;
    doc.font('Helvetica-Bold').fontSize(9).text('Inspektur/Pemantau:', margin, cy);
    cy += 15;

    // 4 cols layout repeated 2 rows
    const signW = contentWidth / 4;
    const signH = 40;
    const signHdr = 15;

    // Header Sig
    for (let k = 0; k < 4; k++) {
        doc.rect(margin + (k * signW), cy, signW, signHdr).fillColor('#e0e0e0').fill().stroke();
        doc.fillColor('#000000').text(`Pemantau ${k + 1}`, margin + (k * signW), cy + 4, { width: signW, align: 'center' });
    }
    cy += signHdr;

    // Body Sig (Row 1)
    for (let k = 0; k < 4; k++) {
        doc.rect(margin + (k * signW), cy, signW, signH).stroke();
        const obs = observers[k];
        if (obs) {
            doc.text(obs.nama, margin + (k * signW) + 5, cy + 5);
            doc.text(obs.perusahaan, margin + (k * signW) + 5, cy + 15);
        }
    }

    doc.end();
    console.log(`Pencahayaan PDF generated at: ${outputPath}`);
}

generateSamplePDF().catch(console.error);
