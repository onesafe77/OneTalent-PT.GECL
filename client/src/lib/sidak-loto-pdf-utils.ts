import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SidakLotoSession, SidakLotoRecord, SidakLotoObserver } from '@shared/schema';

interface SidakLotoData {
    session: SidakLotoSession;
    records: SidakLotoRecord[];
    observers: SidakLotoObserver[];
}

export async function generateSidakLotoPdf(data: SidakLotoData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // --- Header Section ---
    try {
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = '/assets/logo.png';
        });
        pdf.addImage(logoImg, 'PNG', margin, yPosition, 40, 12);
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('PT BORNEO INDOBARA', margin, yPosition + 8);
    }

    // Official document code (top right)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('BIB – HSE – ES – F – 3.02 – 83', pageWidth - margin, yPosition, { align: 'right' });
    pdf.text('Maret 2025/R0', pageWidth - margin, yPosition + 5, { align: 'right' });
    pdf.text('Page 1 of 1', pageWidth - margin, yPosition + 10, { align: 'right' });

    yPosition += 18;

    // Official title (Center) - with gray background box
    pdf.setFillColor(211, 211, 211);
    pdf.rect(margin, yPosition - 2, availableWidth, 9, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition - 2, availableWidth, 9, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('INSPEKSI KEPATUHAN LOTO', pageWidth / 2, yPosition + 4, { align: 'center' });

    yPosition += 11;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Formulir ini digunakan sebagai catatan hasil inspeksi LOTO yang dilaksanakan di PT Borneo Indobara', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 8;

    // --- Info Table ---
    const infoData = [
        ['Tanggal/ Shift', `${data.session.tanggal || ''} / ${data.session.shift || ''}`, 'Lokasi', data.session.lokasi || ''],
        ['Waktu', `${data.session.waktu || ''} sampai`, 'Jumlah\nSampel', (data.session.totalSampel || data.records.length).toString()]
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            font: 'helvetica',
            halign: 'left',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35, fillColor: [255, 255, 255], fontStyle: 'bold' },
            1: { cellWidth: availableWidth / 2 - 35 },
            2: { cellWidth: 35, fillColor: [255, 255, 255], fontStyle: 'bold' },
            3: { cellWidth: availableWidth / 2 - 35 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 6;

    // --- Main Inspection Table ---
    // Columns: No, Nama, NIK, Perusahaan, Q1-Q5, Keterangan

    // Detailed questions for headers (exact order from PDF template)
    const questions = [
        'Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki?',
        'Apakah danger tag sesuai dan memadai?',
        'Apakah gembok sesuai dan memadai?',
        'Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?',
        'Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?'
    ];

    // Table Headers - Q1-Q5 are empty strings here, drawn manually in didDrawCell
    const tableHeaders = [['No', 'Nama', 'NIK', 'Perusahaan', '', '', '', '', '', 'Keterangan']];

    const tableData = data.records.map((record, idx) => [
        (idx + 1).toString(),
        record.nama || record.namaNik || record.namaKaryawan || '',
        record.nik || '',
        record.perusahaan || '',
        record.q1_gembokTagTerpasang ? '✓' : '✗',
        record.q2_dangerTagSesuai ? '✓' : '✗',
        record.q3_gembokSesuai ? '✓' : '✗',
        record.q4_kunciUnik ? '✓' : '✗',
        record.q5_haspBenar ? '✓' : '✗',
        record.keterangan || ''
    ]);

    // Ensure minimum 10 empty rows for manual filling if needed
    const minRows = 10;
    const currentRows = tableData.length;
    for (let i = 0; i < (minRows - currentRows); i++) {
        tableData.push([(currentRows + i + 1).toString(), '', '', '', '', '', '', '', '', '']);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 7,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.5,
            lineColor: [0, 0, 0],
            minCellHeight: 10
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'bottom',
            minCellHeight: 50,
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 9, halign: 'center' },
            1: { cellWidth: 32, halign: 'left' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 30, halign: 'left' },
            4: { cellWidth: 11, halign: 'center' },
            5: { cellWidth: 11, halign: 'center' },
            6: { cellWidth: 11, halign: 'center' },
            7: { cellWidth: 11, halign: 'center' },
            8: { cellWidth: 11, halign: 'center' },
            9: { cellWidth: 'auto', halign: 'left' },
        },
        didDrawCell: (cellData) => {
            // Draw vertical text in header for Q1-Q5 (columns 4-8)
            if (cellData.section === 'head' && cellData.column.index >= 4 && cellData.column.index <= 8) {
                const doc = cellData.doc;
                const text = questions[cellData.column.index - 4];

                const x = cellData.cell.x + (cellData.cell.width / 2);
                const y = cellData.cell.y + cellData.cell.height - 2;

                // Set font properties without save/restore
                const prevFontSize = (doc as any).internal.getFontSize();
                const prevFont = (doc as any).internal.getFont();

                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                // Rotate 90 degrees counter-clockwise
                doc.text(text, x - 1, y, { angle: 90, align: 'left', maxWidth: 46 });

                // Restore previous settings
                doc.setFontSize(prevFontSize);
                doc.setFont(prevFont.fontName, prevFont.fontStyle);
            }
        },
        margin: { left: margin, right: margin },
    });

    // --- Sign-off Section (2-column layout: 1-4 left, 5-8 right) ---
    yPosition = (pdf as any).lastAutoTable.finalY + 8;

    // Check if there's enough space for observer section (need at least 80mm)
    const remainingSpace = pageHeight - yPosition - 10; // 10mm bottom margin
    if (remainingSpace < 80) {
        pdf.addPage();
        yPosition = margin;

        // Add a small header on new page for context
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INSPEKSI KEPATUHAN LOTO - Daftar Observer', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
    }

    // Left table (observers 1-4)
    const leftObservers = [];
    for (let i = 0; i < 4; i++) {
        const obs = data.observers[i];
        leftObservers.push([
            (i + 1).toString(),
            obs?.nama || '',
            obs?.perusahaan || '',
            '' // Signature placeholder
        ]);
    }

    const tableWidth = (availableWidth - 5) / 2; // Split available width in half with gap

    autoTable(pdf, {
        startY: yPosition,
        head: [['No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan']],
        body: leftObservers,
        theme: 'grid',
        tableWidth: tableWidth,
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            minCellHeight: 13,
            halign: 'left',
            valign: 'middle'
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 38 },
            2: { cellWidth: 32 },
            3: { cellWidth: 'auto' }
        },
        didDrawCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 3) {
                const obsIdx = cellData.row.index;
                const obs = data.observers[obsIdx];
                if (obs && obs.tandaTangan) {
                    try {
                        const imgType = obs.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                        pdf.addImage(obs.tandaTangan, imgType,
                            cellData.cell.x + 2, cellData.cell.y + 1,
                            cellData.cell.width - 4, cellData.cell.height - 2, undefined, 'FAST');
                    } catch (e) { console.error('Sig err', e); }
                }
            }
        },
        margin: { left: margin },
    });

    // Right table (observers 5-8)
    const rightObservers = [];
    for (let i = 4; i < 8; i++) {
        const obs = data.observers[i];
        rightObservers.push([
            (i + 1).toString(),
            obs?.nama || '',
            obs?.perusahaan || '',
            '' // Signature placeholder
        ]);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: [['No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan']],
        body: rightObservers,
        theme: 'grid',
        tableWidth: tableWidth,
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            minCellHeight: 13,
            halign: 'left',
            valign: 'middle'
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 38 },
            2: { cellWidth: 32 },
            3: { cellWidth: 'auto' }
        },
        didDrawCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 3) {
                const obsIdx = cellData.row.index + 4; // Offset by 4 for right table
                const obs = data.observers[obsIdx];
                if (obs && obs.tandaTangan) {
                    try {
                        const imgType = obs.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                        pdf.addImage(obs.tandaTangan, imgType,
                            cellData.cell.x + 2, cellData.cell.y + 1,
                            cellData.cell.width - 4, cellData.cell.height - 2, undefined, 'FAST');
                    } catch (e) { console.error('Sig err', e); }
                }
            }
        },
        margin: { left: margin + tableWidth + 5 }, // Position to the right
    });

    // Footer
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Maret 2025/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

export async function downloadSidakLotoAsJpg(data: SidakLotoData, filename: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Browser only');
    const pdfjsLib = await import('pdfjs-dist');
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

    const pdf = await generateSidakLotoPdf(data);
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
