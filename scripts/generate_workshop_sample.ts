
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
    namaWorkshop: 'Main Workshop A',
    lokasi: 'Site Batulicin',
    penanggungJawabArea: 'Budi Maintenance'
};

const equipmentData = [
    {
        type: 'APAR',
        noRegister: 'APR-001',
        items: [
            { desc: 'Posisi APAR terpasang dengan baik', result: 'S' },
            { desc: 'Tinggi APAR maks 125cm dari lantai', result: 'S' },
            { desc: 'Tekanan gauge dalam area hijau', result: 'S' }
        ],
        tindakLanjut: '-',
        dueDate: '-'
    },
    {
        type: 'COMPRESSOR',
        noRegister: 'CMP-202',
        items: [
            { desc: 'Kondisi fisik kompresor baik', result: 'S' },
            { desc: 'Tidak ada kebocoran oli/udara', result: 'TS' }, // Issue
            { desc: 'Pressure gauge berfungsi normal', result: 'S' }
        ],
        tindakLanjut: 'Perbaiki seal oli bocor',
        dueDate: '07-02-2025'
    }
];

const inspectors = [
    { nama: 'Andi (Mekanik)', perusahaan: 'PT. GECL', tandaTangan: '' },
    { nama: 'Dedi (Safety)', perusahaan: 'PT. BIB', tandaTangan: '' }
];

async function generateSamplePDF() {
    // Portrait A4
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        bufferPages: true
    });

    const outputPath = path.join(projectRoot, 'client', 'public', 'workshop_sample.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const margin = 30;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const contentWidth = pageWidth - (margin * 2);

    // --- HEADER ---
    doc.font('Helvetica-Bold').fontSize(12).text('PT BORNEO INDOBARA', margin, margin);

    // Doc Code
    doc.font('Helvetica').fontSize(9)
        .text('BIB - HSE - ES - F - 3.02 - 87', margin, margin + 5, { width: contentWidth, align: 'right' });
    doc.text('April 2025/R0', margin, margin + 15, { width: contentWidth, align: 'right' });

    // Title
    let y = margin + 35;
    doc.fillColor('#e0e0e0').rect(margin, y, contentWidth, 20).fill();
    doc.fillColor('#000000').rect(margin, y, contentWidth, 20).stroke();

    doc.font('Helvetica-Bold').fontSize(11)
        .text('CHECKLIST INSPEKSI PERALATAN WORKSHOP', margin, y + 6, { width: contentWidth, align: 'center' });

    y += 25;
    doc.font('Helvetica-Oblique').fontSize(8)
        .text('Formulir ini digunakan untuk pencatatan hasil inspeksi workshop', margin, y, { width: contentWidth, align: 'center' });

    // --- INFO TABLE ---
    y += 15;
    const infoH = 30;

    // Grid
    doc.rect(margin, y, contentWidth, infoH).stroke();
    doc.moveTo(margin, y + 15).lineTo(margin + contentWidth, y + 15).stroke();
    const splitX = margin + 100; // split label/val
    const midX = margin + (contentWidth / 2);
    const splitX2 = midX + 100;

    // Labels
    doc.font('Helvetica-Bold').text('Tanggal', margin + 5, y + 5);
    doc.text('Lokasi', margin + 5, y + 20);
    doc.text('Nama Workshop', midX + 5, y + 5);
    doc.text('Penanggung Jawab', midX + 5, y + 20);

    // Values
    doc.font('Helvetica').text(session.tanggal, splitX, y + 5);
    doc.text(session.lokasi, splitX, y + 20);
    doc.text(session.namaWorkshop, splitX2, y + 5);
    doc.text(session.penanggungJawabArea, splitX2, y + 20);

    y += infoH + 5;
    doc.font('Helvetica-Oblique').fontSize(7)
        .text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan.', margin, y);

    // --- MAIN TABLE ---
    y += 15;
    const cols = [
        { name: 'No', w: 30, align: 'center' },
        { name: 'Deskripsi Pemeriksaan', w: 230, align: 'left' },
        { name: 'Kesesuaian', w: 60, align: 'center' },
        { name: 'Tindak Lanjut Perbaikan', w: 150, align: 'left' }, // Rest roughly
        { name: 'Due Date', w: 65, align: 'center' }
    ];
    // Check width sum
    // 30+230+60+150+65 = 535. ContentWidth = 595 - 60 = 535. Perfect.

    // Header
    const hdrH = 20;
    doc.fillColor('#e0e0e0').rect(margin, y, contentWidth, hdrH).fill();
    doc.fillColor('#000000');

    let tx = margin;
    cols.forEach(c => {
        doc.rect(tx, y, c.w, hdrH).stroke();
        doc.font('Helvetica-Bold').fontSize(8).text(c.name, tx + 2, y + 6, { width: c.w - 4, align: c.align as any });
        tx += c.w;
    });

    y += hdrH;

    // Body
    doc.font('Helvetica').fontSize(8);
    let rowNum = 1;

    equipmentData.forEach((eq, eqIdx) => {
        // Equipment Header Row
        doc.fillColor('#f0f0f0').rect(margin, y, contentWidth, 15).fill();
        doc.fillColor('#000000').rect(margin, y, contentWidth, 15).stroke();
        doc.font('Helvetica-Bold').text(`${eqIdx + 1}. ${eq.type} - No Register: ${eq.noRegister}`, margin + 5, y + 4);
        y += 15;

        // Items
        const rowH = 15;
        eq.items.forEach((item, itIdx) => {
            let x = margin;

            // Draw cells
            // No
            doc.rect(x, y, cols[0].w, rowH).stroke();
            doc.font('Helvetica').text(`${eqIdx + 1}.${itIdx + 1}`, x, y + 4, { width: cols[0].w, align: 'center' });
            x += cols[0].w;

            // Desc
            doc.rect(x, y, cols[1].w, rowH).stroke();
            doc.text(item.desc, x + 2, y + 4, { width: cols[1].w - 4 });
            x += cols[1].w;

            // Result
            doc.rect(x, y, cols[2].w, rowH).stroke();
            doc.text(item.result, x, y + 4, { width: cols[2].w, align: 'center' });
            x += cols[2].w;

            // Tindak Lanjut & Due Date (Merged for group usually, but here simplified)
            // Only show on first row for simplicity or empty for others
            if (itIdx === 0) {
                // Tindak
                doc.rect(x, y, cols[3].w, rowH * eq.items.length).stroke();
                doc.text(eq.tindakLanjut, x + 2, y + 4, { width: cols[3].w - 4 });

                // Due Date
                doc.rect(x + cols[3].w, y, cols[4].w, rowH * eq.items.length).stroke();
                doc.text(eq.dueDate, x + cols[3].w, y + 4, { width: cols[4].w, align: 'center' });
            }
            // Skip drawing rects for merged cells (Tindak & DueDate) on subsequent rows
            // But we need to make sure we don't overwrite lines?
            // Actually rect just strokes border. For merged cell, we want outline around the whole block.
            // Simplified: Draw rect for columns 0-2 every row. 
            // Draw rect for cols 3-4 ONLY on first row with height * calc.

            y += rowH;
        });
    });

    // --- SIGNATURES ---
    y += 20;
    doc.font('Helvetica-Bold').text('Inspektur:', margin, y);
    y += 10;

    // Table 2 cols
    const sigW = contentWidth / 2;
    const sigH = 60;

    // Header
    doc.rect(margin, y, sigW, 15).stroke().text('Nama Inspektur', margin, y + 4, { width: sigW / 2, align: 'center' });
    doc.rect(margin + sigW, y, sigW, 15).stroke().text('Nama Inspektur', margin + sigW, y + 4, { width: sigW / 2, align: 'center' });
    y += 15;

    // Body
    doc.rect(margin, y, sigW, sigH).stroke();
    doc.rect(margin + sigW, y, sigW, sigH).stroke();

    inspectors.forEach((ins, i) => {
        const bx = margin + (i * sigW);
        doc.font('Helvetica').text(ins.nama, bx + 5, y + 5);
        doc.text(ins.perusahaan, bx + 5, y + 15);
        doc.text('( Tanda Tangan )', bx + 5, y + 45, { color: 'gray' });
    });

    doc.end();
    console.log(`Workshop PDF generated at: ${outputPath}`);
}

generateSamplePDF().catch(console.error);
