import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type { SidakDigitalSession, SidakDigitalRecord, SidakDigitalObserver } from '@shared/schema';

interface SidakDigitalData {
    session: SidakDigitalSession;
    records: SidakDigitalRecord[];
    observers: SidakDigitalObserver[];
}

export async function generateSidakDigitalPDF(data: SidakDigitalData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Try to add logo
    try {
        const logoImg = await loadGeclLogo();
        pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('PT. GECL', margin, yPosition + 6);
    }

    // Official document code (top right)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('GECL – HSE – ES – F – 3.02 – 88', pageWidth - margin, yPosition + 6, { align: 'right' });

    yPosition += 14;

    // ========================================
    // TITLE SECTION
    // ========================================
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('INSPEKSI KEBERADAAN DAN FUNGSI PENGAWAS DIGITALISASI', pageWidth / 2, yPosition, { align: 'center' });

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('Formulir ini digunakan sebagai catatan hasil inspeksi keberadaan dan fungsi pengawas Digitalisasi yang dilaksanakan di PT. GECL', pageWidth / 2, yPosition + 5, { align: 'center' });

    yPosition += 12;

    // ========================================
    // INFO HEADER TABLE (Tanggal/Shift, Lokasi, Waktu, Jumlah Sampel)
    // ========================================
    const colWidth1 = 35;
    const colWidth2 = (availableWidth - colWidth1 * 2) / 2;

    // Draw info boxes
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setLineWidth(0.2);

    // Row 1: Tanggal/Shift and Lokasi
    pdf.rect(margin, yPosition, colWidth1, 7);
    pdf.rect(margin + colWidth1, yPosition, colWidth2, 7);
    pdf.rect(margin + colWidth1 + colWidth2, yPosition, colWidth1, 7);
    pdf.rect(margin + colWidth1 * 2 + colWidth2, yPosition, colWidth2, 7);

    pdf.text('Tanggal/ Shift', margin + 2, yPosition + 5);
    pdf.text(`${data.session.tanggal || ''} / ${data.session.shift || ''}`, margin + colWidth1 + 2, yPosition + 5);
    pdf.text('Lokasi', margin + colWidth1 + colWidth2 + 2, yPosition + 5);
    pdf.text(data.session.lokasi || '', margin + colWidth1 * 2 + colWidth2 + 2, yPosition + 5);

    yPosition += 7;

    // Row 2: Waktu and Jumlah Sampel
    pdf.rect(margin, yPosition, colWidth1, 7);
    pdf.rect(margin + colWidth1, yPosition, colWidth2, 7);
    pdf.rect(margin + colWidth1 + colWidth2, yPosition, colWidth1, 7);
    pdf.rect(margin + colWidth1 * 2 + colWidth2, yPosition, colWidth2, 7);

    pdf.text('Waktu', margin + 2, yPosition + 5);
    pdf.text(`sampai ${data.session.waktu || ''}`, margin + colWidth1 + 2, yPosition + 5);
    pdf.text('Jumlah Sampel', margin + colWidth1 + colWidth2 + 2, yPosition + 5);
    pdf.text((data.session.totalSampel || data.records.length).toString(), margin + colWidth1 * 2 + colWidth2 + 2, yPosition + 5);

    yPosition += 10;

    // ========================================
    // MAIN DATA TABLE WITH ROTATED HEADERS
    // ========================================

    // Define questions for rotated headers
    const questions = [
        'Apakah pengawas berada di lokasi kerja sesuai tugasnya dan aktif mengawasi?',
        'Apakah pengawas telah mengerjakan SAP pelaporan hazard?',
        'Apakah pengawas telah mengerjakan SAP pelaporan inspeksi?',
        'Apakah pengawas telah mengerjakan SAP pelaporan observasi?',
        'Apakah pengawas telah melakukan validasi pada semua temuan yang ada pada Famous?',
        'Apakah pengawas mampu mengidentifikasi potensi bahaya dan segera mengambil tindakan korektif?',
        'Apakah pengawas memastikan pekerja mengikuti prosedur keselamatan dan aturan kerja?'
    ];

    // Column widths
    const colNo = 10;
    const colNama = 40;
    const colNik = 30;
    const colPerusahaan = 35;
    const colQ = 15; // Each question column
    const colKet = availableWidth - colNo - colNama - colNik - colPerusahaan - (colQ * 7);

    // Header row height for rotated text
    const headerHeight = 45;
    const rowHeight = 8;

    // Draw header background
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPosition, availableWidth, headerHeight, 'FD');

    // Draw header cells
    let xPos = margin;

    // No column
    pdf.rect(xPos, yPosition, colNo, headerHeight);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('No', xPos + colNo / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });
    xPos += colNo;

    // Nama column
    pdf.rect(xPos, yPosition, colNama, headerHeight);
    pdf.text('Nama', xPos + colNama / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });
    xPos += colNama;

    // NIK column
    pdf.rect(xPos, yPosition, colNik, headerHeight);
    pdf.text('NIK', xPos + colNik / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });
    xPos += colNik;

    // Perusahaan column
    pdf.rect(xPos, yPosition, colPerusahaan, headerHeight);
    pdf.text('Perusahaan', xPos + colPerusahaan / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });
    xPos += colPerusahaan;

    // Question columns with rotated text
    pdf.setFontSize(6);
    for (let i = 0; i < 7; i++) {
        pdf.rect(xPos, yPosition, colQ, headerHeight);

        // Save state and rotate text
        pdf.saveGraphicsState();
        const centerX = xPos + colQ / 2;
        const centerY = yPosition + headerHeight - 3;

        // Rotate 90 degrees counter-clockwise
        const cos = Math.cos(-Math.PI / 2);
        const sin = Math.sin(-Math.PI / 2);

        // Split long text into lines
        const words = questions[i].split(' ');
        let lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            if ((currentLine + ' ' + word).length > 25) {
                lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine += ' ' + word;
            }
        }
        if (currentLine.trim()) lines.push(currentLine.trim());

        // Draw rotated text
        pdf.internal.write(
            'q',
            cos.toFixed(4), sin.toFixed(4), (-sin).toFixed(4), cos.toFixed(4),
            (centerX * (1 - cos) + centerY * sin).toFixed(2),
            (centerY * (1 - cos) - centerX * sin).toFixed(2),
            'cm'
        );

        let textY = yPosition + 5;
        for (const line of lines) {
            pdf.text(line, centerX, textY);
            textY += 4;
        }

        pdf.internal.write('Q');
        pdf.restoreGraphicsState();

        xPos += colQ;
    }

    // Keterangan column
    pdf.rect(xPos, yPosition, colKet, headerHeight);
    pdf.setFontSize(8);
    pdf.text('Keterangan', xPos + colKet / 2, yPosition + headerHeight / 2 + 2, { align: 'center' });

    yPosition += headerHeight;

    // Draw data rows (10 rows minimum)
    const allRecords = [...data.records];
    while (allRecords.length < 10) {
        allRecords.push({} as SidakDigitalRecord);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    for (let rowIdx = 0; rowIdx < 10; rowIdx++) {
        const record = allRecords[rowIdx];
        xPos = margin;

        // No
        pdf.rect(xPos, yPosition, colNo, rowHeight);
        pdf.text((rowIdx + 1).toString() + '.', xPos + 2, yPosition + 5);
        xPos += colNo;

        // Nama
        pdf.rect(xPos, yPosition, colNama, rowHeight);
        pdf.text(record?.nama || '', xPos + 2, yPosition + 5);
        xPos += colNama;

        // NIK
        pdf.rect(xPos, yPosition, colNik, rowHeight);
        pdf.text(record?.nik || '', xPos + 2, yPosition + 5);
        xPos += colNik;

        // Perusahaan
        pdf.rect(xPos, yPosition, colPerusahaan, rowHeight);
        pdf.text(record?.perusahaan || '', xPos + 2, yPosition + 5);
        xPos += colPerusahaan;

        // Q1-Q7 checkboxes
        const qValues = [
            record?.q1_lokasiKerja,
            record?.q2_sapHazard,
            record?.q3_sapInspeksi,
            record?.q4_sapObservasi,
            record?.q5_validasiFamous,
            record?.q6_identifikasiBahaya,
            record?.q7_prosedurKeselamatan
        ];

        for (let i = 0; i < 7; i++) {
            pdf.rect(xPos, yPosition, colQ, rowHeight);
            if (record?.nama) {
                pdf.text(qValues[i] ? '✓' : '✗', xPos + colQ / 2, yPosition + 5, { align: 'center' });
            }
            xPos += colQ;
        }

        // Keterangan
        pdf.rect(xPos, yPosition, colKet, rowHeight);
        pdf.text(record?.keterangan || '', xPos + 2, yPosition + 5);

        yPosition += rowHeight;
    }

    yPosition += 5;

    // ========================================
    // OBSERVER/PEMANTAU TABLE
    // ========================================

    // Table header
    const obsColNo = 10;
    const obsColNama = 45;
    const obsColPerusahaan = 35;
    const obsColTTD = 40;
    const obsGroupWidth = obsColNo + obsColNama + obsColPerusahaan + obsColTTD;

    // Draw observer table (2 groups side by side)
    const obsHeaderHeight = 8;
    const obsRowHeight = 12;

    pdf.setFillColor(245, 245, 245);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);

    // Header row for both groups
    xPos = margin;

    // Group 1 header (1-4)
    pdf.rect(xPos, yPosition, obsColNo, obsHeaderHeight, 'FD');
    pdf.text('No', xPos + obsColNo / 2, yPosition + 5, { align: 'center' });
    xPos += obsColNo;

    pdf.rect(xPos, yPosition, obsColNama, obsHeaderHeight, 'FD');
    pdf.text('Nama Pemantau', xPos + obsColNama / 2, yPosition + 5, { align: 'center' });
    xPos += obsColNama;

    pdf.rect(xPos, yPosition, obsColPerusahaan, obsHeaderHeight, 'FD');
    pdf.text('Perusahaan', xPos + obsColPerusahaan / 2, yPosition + 5, { align: 'center' });
    xPos += obsColPerusahaan;

    pdf.rect(xPos, yPosition, obsColTTD, obsHeaderHeight, 'FD');
    pdf.text('Tanda Tangan', xPos + obsColTTD / 2, yPosition + 5, { align: 'center' });
    xPos += obsColTTD;

    // Group 2 header (5-8)
    pdf.rect(xPos, yPosition, obsColNo, obsHeaderHeight, 'FD');
    pdf.text('No', xPos + obsColNo / 2, yPosition + 5, { align: 'center' });
    xPos += obsColNo;

    pdf.rect(xPos, yPosition, obsColNama, obsHeaderHeight, 'FD');
    pdf.text('Nama Pemantau', xPos + obsColNama / 2, yPosition + 5, { align: 'center' });
    xPos += obsColNama;

    pdf.rect(xPos, yPosition, obsColPerusahaan, obsHeaderHeight, 'FD');
    pdf.text('Perusahaan', xPos + obsColPerusahaan / 2, yPosition + 5, { align: 'center' });
    xPos += obsColPerusahaan;

    pdf.rect(xPos, yPosition, obsColTTD, obsHeaderHeight, 'FD');
    pdf.text('Tanda Tangan', xPos + obsColTTD / 2, yPosition + 5, { align: 'center' });

    yPosition += obsHeaderHeight;

    // Draw 4 rows for observers (1-4 left, 5-8 right)
    pdf.setFont('helvetica', 'normal');

    for (let row = 0; row < 4; row++) {
        xPos = margin;
        const leftObs = data.observers[row] || null;
        const rightObs = data.observers[row + 4] || null;

        // Left side (1-4)
        pdf.rect(xPos, yPosition, obsColNo, obsRowHeight);
        pdf.text((row + 1).toString() + '.', xPos + 2, yPosition + 7);
        xPos += obsColNo;

        pdf.rect(xPos, yPosition, obsColNama, obsRowHeight);
        pdf.text(leftObs?.nama || '', xPos + 2, yPosition + 7);
        xPos += obsColNama;

        pdf.rect(xPos, yPosition, obsColPerusahaan, obsRowHeight);
        pdf.text(leftObs?.perusahaan || '', xPos + 2, yPosition + 7);
        xPos += obsColPerusahaan;

        pdf.rect(xPos, yPosition, obsColTTD, obsRowHeight);
        // Add signature if available
        if (leftObs?.tandaTangan) {
            try {
                pdf.addImage(leftObs.tandaTangan, leftObs.tandaTangan.includes('png') ? 'PNG' : 'JPEG',
                    xPos + 2, yPosition + 1, obsColTTD - 4, obsRowHeight - 2, undefined, 'FAST');
            } catch { }
        }
        xPos += obsColTTD;

        // Right side (5-8)
        pdf.rect(xPos, yPosition, obsColNo, obsRowHeight);
        pdf.text((row + 5).toString() + '.', xPos + 2, yPosition + 7);
        xPos += obsColNo;

        pdf.rect(xPos, yPosition, obsColNama, obsRowHeight);
        pdf.text(rightObs?.nama || '', xPos + 2, yPosition + 7);
        xPos += obsColNama;

        pdf.rect(xPos, yPosition, obsColPerusahaan, obsRowHeight);
        pdf.text(rightObs?.perusahaan || '', xPos + 2, yPosition + 7);
        xPos += obsColPerusahaan;

        pdf.rect(xPos, yPosition, obsColTTD, obsRowHeight);
        // Add signature if available
        if (rightObs?.tandaTangan) {
            try {
                pdf.addImage(rightObs.tandaTangan, rightObs.tandaTangan.includes('png') ? 'PNG' : 'JPEG',
                    xPos + 2, yPosition + 1, obsColTTD - 4, obsRowHeight - 2, undefined, 'FAST');
            } catch { }
        }

        yPosition += obsRowHeight;
    }

    // Footer
    pdf.setFontSize(8);
    pdf.text('April 2025/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

export async function downloadSidakDigitalAsJpg(data: SidakDigitalData, filename: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Browser only');
    const pdfjsLib = await import('pdfjs-dist');
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

    const pdf = await generateSidakDigitalPDF(data);
    const pdfDocument = await pdfjsLib.getDocument({ data: pdf.output('arraybuffer') }).promise;
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport } as any).promise;

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Failed'));
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
            resolve();
        }, 'image/jpeg', 0.95);
    });
}
