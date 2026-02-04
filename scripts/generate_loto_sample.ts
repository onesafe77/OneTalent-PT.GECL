
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Dummy Data
const session = {
    tanggal: '03-02-2025',
    shift: 'Shift 1',
    waktu: '08:00',
    waktuSelesai: '10:00',
    lokasi: 'Workshop Heavy Equipment',
    totalSampel: 3
};

const records = [
    {
        nama: 'Budi Santoso',
        nik: '12345',
        perusahaan: 'PT. GECL',
        q1_gembokTagTerpasang: true,
        q2_dangerTagSesuai: true,
        q3_gembokSesuai: true,
        q4_kunciUnik: true,
        q5_haspBenar: true,
        keterangan: 'Lengkap dan sesuai prosedur'
    },
    {
        nama: 'Siti Aminah',
        nik: '67890',
        perusahaan: 'PT. GECL',
        q1_gembokTagTerpasang: true,
        q2_dangerTagSesuai: false,
        q3_gembokSesuai: true,
        q4_kunciUnik: true,
        q5_haspBenar: true,
        keterangan: 'Tag rusak, perlu diganti'
    },
    {
        nama: 'Joko Widodo',
        nik: '11223',
        perusahaan: 'Contractor A',
        q1_gembokTagTerpasang: false,
        q2_dangerTagSesuai: false,
        q3_gembokSesuai: false,
        q4_kunciUnik: false,
        q5_haspBenar: false,
        keterangan: 'Tidak melakukan LOTO!! (Critical)'
    }
];

const observers = [
    { nama: 'Admin Safety', perusahaan: 'PT. BIB', tandaTangan: '' },
    { nama: 'Supervisor Mekanik', perusahaan: 'PT. GECL', tandaTangan: '' }
];

// PDF Logic (Adapted from loto_pdf_replacement.txt)
async function generateSamplePDF() {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        bufferPages: true
    });

    const outputPath = path.join(projectRoot, 'client', 'public', 'loto_sample.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const margin = 30;
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const contentWidth = pageWidth - (margin * 2);

    // --- HEADER SECTION ---
    // Mock Logo path logic (skipping actual image check for simplicity, using text fallback)
    doc.font('Helvetica-Bold').fontSize(14).text('PT BORNEO INDOBARA', margin, margin);

    // 2. Doc Code (Right)
    doc.font('Helvetica').fontSize(9)
        .text('BIB - HSE - ES - F - 3.02 - 83', margin + contentWidth - 200, margin + 10, { width: 200, align: 'right' });

    // 3. Title Box
    const titleY = margin + 45;
    doc.fillColor('#e0e0e0').rect(margin, titleY, contentWidth, 35).fill();
    doc.fillColor('#000000').rect(margin, titleY, contentWidth, 35).stroke();

    doc.font('Helvetica-Bold').fontSize(14)
        .text('INSPEKSI KEPATUHAN LOTO', margin, titleY + 7, { width: contentWidth, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(9)
        .text('Formulir ini digunakan sebagai catatan hasil inspeksi LOTO yang dilaksanakan di PT Borneo Indobara', margin, titleY + 22, { width: contentWidth, align: 'center' });


    // --- INFO SECTION ---
    const infoY = titleY + 35; // Attached to title box
    const infoRowHeight = 25;

    // Draw outer box for info (2 rows)
    doc.rect(margin, infoY, contentWidth, infoRowHeight * 2).stroke();

    // Vertical divider (approx 40% / 60% split based on image)
    const splitX = margin + 350;

    doc.moveTo(splitX, infoY).lineTo(splitX, infoY + infoRowHeight * 2).stroke();
    doc.moveTo(margin, infoY + infoRowHeight).lineTo(margin + contentWidth, infoY + infoRowHeight).stroke();

    // Labels and Values
    doc.font('Helvetica-Bold').fontSize(9);
    const padding = 6;

    const labelWidth = 100;

    // Row 1
    // Col 1 (Left)
    doc.rect(margin, infoY, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
    doc.fillColor('#000000').text('Tanggal/ Shift', margin + padding, infoY + 8);
    doc.text(`${session.tanggal || ''} / ${session.shift || ''}`, margin + labelWidth + padding, infoY + 8);

    // Col 2 (Right)
    doc.rect(splitX, infoY, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
    doc.fillColor('#000000').text('Lokasi', splitX + padding, infoY + 8);
    doc.text(session.lokasi || '', splitX + labelWidth + padding, infoY + 8);

    // Row 2
    const r2y = infoY + infoRowHeight;
    // Col 1 (Left)
    doc.rect(margin, r2y, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
    doc.fillColor('#000000').text('Waktu', margin + padding, r2y + 8);
    const wEnd = session.waktuSelesai ? ` sampai ${session.waktuSelesai}` : ' sampai ...';
    doc.text(`${session.waktu || ''} ${wEnd}`, margin + labelWidth + padding, r2y + 8);

    // Col 2 (Right)
    doc.rect(splitX, r2y, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
    doc.fillColor('#000000').text('Jumlah Sampel', splitX + padding, r2y + 8);
    doc.text((session.totalSampel || records.length).toString(), splitX + labelWidth + padding, r2y + 8);


    // --- TABLE SECTION ---
    const tableTop = infoY + (infoRowHeight * 2) + 10;

    const qWidth = 35;

    const cols = [
        { name: 'No', label: 'No', w: 30, align: 'center', type: 'text' },
        { name: 'Nama', label: 'Nama', w: 140, align: 'left', type: 'text' },
        { name: 'NIK', label: 'NIK', w: 70, align: 'left', type: 'text' },
        { name: 'Perusahaan', label: 'Perusahaan', w: 90, align: 'left', type: 'text' },
        { name: 'Q1', label: 'Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki ?', w: qWidth, align: 'center', type: 'vertical' },
        { name: 'Q2', label: 'Apakah danger tag sesuai dan memadai ?', w: qWidth, align: 'center', type: 'vertical' },
        { name: 'Q3', label: 'Apakah gembok sesuai dan memadai ?', w: qWidth, align: 'center', type: 'vertical' },
        { name: 'Q4', label: 'Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?', w: qWidth, align: 'center', type: 'vertical' },
        { name: 'Q5', label: 'Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?', w: qWidth, align: 'center', type: 'vertical' },
        { name: 'Ket', label: 'Keterangan', w: 0, align: 'left', type: 'text' }
    ];

    // Calc remaining width for Ket
    // Manually cast to any to allow updating 'w'
    const fixedWidth = cols.reduce((sum, c) => sum + c.w, 0);
    (cols[cols.length - 1] as any).w = contentWidth - fixedWidth;

    let currentY = tableTop;
    const headerHeightTable = 140; // Taller for vertical text
    const rowHeight = 20;

    const drawHeader = (y: number) => {
        let x = margin;
        doc.fillColor('#e0e0e0').rect(margin, y, contentWidth, headerHeightTable).fill();
        doc.fillColor('#000000');

        cols.forEach(col => {
            doc.rect(x, y, col.w, headerHeightTable).stroke();
            doc.font('Helvetica-Bold').fontSize(9);

            if (col.type === 'vertical') {
                // Draw vertical text
                doc.save();
                const textX = x + (col.w / 2) + 3; // slight offset for font baseline
                const textY = y + headerHeightTable - 5;
                doc.translate(textX, textY);
                doc.rotate(-90);
                doc.text(col.label, 0, 0, { width: headerHeightTable - 10, align: 'left' });
                doc.restore();
            } else {
                // Draw centered text normally
                // Vertically center?
                const textHeight = doc.heightOfString(col.label, { width: col.w - 4 });
                const textY = y + (headerHeightTable - textHeight) / 2;
                doc.text(col.label, x + 2, textY, { width: col.w - 4, align: 'center' });
            }
            x += col.w;
        });
    };

    drawHeader(currentY);
    currentY += headerHeightTable;

    // Table Rows
    doc.font('Helvetica').fontSize(9);

    records.forEach((rec, idx) => {
        // Page break check...
        if (currentY > pageHeight - margin - 150) {
            doc.addPage({ layout: 'landscape', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
            currentY = margin;
            drawHeader(currentY);
            currentY += headerHeightTable;
            doc.font('Helvetica').fontSize(9); // Reset font
        }

        let x = margin;

        // Draw cells
        cols.forEach((col, cIdx) => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();

            let text = '';
            if (col.name === 'No') text = (idx + 1).toString();
            else if (col.name === 'Nama') text = rec.nama || '';
            else if (col.name === 'NIK') text = rec.nik || '';
            else if (col.name === 'Perusahaan') text = rec.perusahaan || '';
            else if (col.name === 'Q1') text = rec.q1_gembokTagTerpasang ? 'V' : (rec.q1_gembokTagTerpasang === false ? 'X' : '');
            else if (col.name === 'Q2') text = rec.q2_dangerTagSesuai ? 'V' : (rec.q2_dangerTagSesuai === false ? 'X' : '');
            else if (col.name === 'Q3') text = rec.q3_gembokSesuai ? 'V' : (rec.q3_gembokSesuai === false ? 'X' : '');
            else if (col.name === 'Q4') text = rec.q4_kunciUnik ? 'V' : (rec.q4_kunciUnik === false ? 'X' : '');
            else if (col.name === 'Q5') text = rec.q5_haspBenar ? 'V' : (rec.q5_haspBenar === false ? 'X' : '');
            else if (col.name === 'Ket') text = rec.keterangan || '';

            // Center compliance checks
            const align = (col.name.startsWith('Q') || col.name === 'No') ? 'center' : 'left';

            doc.text(text, x + 2, currentY + 6, { width: col.w - 4, align: align as any });
            x += col.w;
        });

        currentY += rowHeight;
    });

    // Fill empty rows to minimum 10
    const minRows = 10;
    const rowsToAdd = Math.max(0, minRows - records.length);

    for (let i = 0; i < rowsToAdd; i++) {
        // Check page
        if (currentY > pageHeight - margin - 150) break;

        let x = margin;
        cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            if (col.name === 'No') {
                doc.text((records.length + i + 1).toString(), x + 2, currentY + 6, { width: col.w, align: 'center' });
            }
            x += col.w;
        });
        currentY += rowHeight;
    }

    // --- OBSERVER SECTION ---
    currentY += 10;

    if (currentY + 100 > pageHeight - margin) doc.addPage({ layout: 'landscape' });

    // Grid Layout
    const obsHeaderH = 20;
    const obsRowH = 40;

    // Background gray for header
    doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, obsHeaderH).fill();
    doc.fillColor('#000000');

    const halfW = (contentWidth / 2);

    const oCols = [30, 100, 80, halfW - 210];

    let ox = margin;
    // Header Left
    const obHeaders = ['No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan'];
    obHeaders.forEach((h, i) => {
        doc.rect(ox, currentY, oCols[i], obsHeaderH).stroke().text(h, ox, currentY + 6, { width: oCols[i], align: 'center' });
        ox += oCols[i];
    });

    // Header Right
    obHeaders.forEach((h, i) => {
        doc.rect(ox, currentY, oCols[i], obsHeaderH).stroke().text(h, ox, currentY + 6, { width: oCols[i], align: 'center' });
        ox += oCols[i];
    });

    currentY += obsHeaderH;

    // Render 4 rows (8 slots)
    for (let r = 0; r < 4; r++) {
        const obs1 = observers[r];
        const obs2 = observers[r + 4];

        let rowX = margin;

        // --- LEFT SIDE ---
        // No
        doc.rect(rowX, currentY, oCols[0], obsRowH).stroke().text((r + 1).toString(), rowX, currentY + 15, { width: oCols[0], align: 'center' }); rowX += oCols[0];
        // Nama
        doc.rect(rowX, currentY, oCols[1], obsRowH).stroke();
        if (obs1) doc.text(obs1.nama, rowX + 5, currentY + 15, { width: oCols[1] - 10 }); rowX += oCols[1];
        // Perusahaan
        doc.rect(rowX, currentY, oCols[2], obsRowH).stroke();
        rowX += oCols[2];
        // TT
        doc.rect(rowX, currentY, oCols[3], obsRowH).stroke();
        rowX += oCols[3];

        // --- RIGHT SIDE ---
        // No
        doc.rect(rowX, currentY, oCols[0], obsRowH).stroke().text((r + 5).toString(), rowX, currentY + 15, { width: oCols[0], align: 'center' }); rowX += oCols[0];
        // Nama
        doc.rect(rowX, currentY, oCols[1], obsRowH).stroke();
        if (obs2) doc.text(obs2.nama, rowX + 5, currentY + 15, { width: oCols[1] - 10 }); rowX += oCols[1];
        // Perusahaan
        doc.rect(rowX, currentY, oCols[2], obsRowH).stroke();
        rowX += oCols[2];
        // TT
        doc.rect(rowX, currentY, oCols[3], obsRowH).stroke();

        currentY += obsRowH;
    }

    // Footer Data
    doc.fontSize(8).text(`Maret 2025/R0`, margin, pageHeight - 20, { align: 'left' });
    doc.text(`Page 1 of 1`, margin, pageHeight - 20, { width: contentWidth, align: 'right' });

    doc.end();
    console.log(`PDF generated at: ${outputPath}`);
}

generateSamplePDF().catch(console.error);
