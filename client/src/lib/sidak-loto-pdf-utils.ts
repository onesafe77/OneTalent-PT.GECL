import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SidakLotoSession, SidakLotoRecord, SidakLotoObserver } from '@shared/schema';

interface SidakLotoData {
    session: SidakLotoSession;
    records: SidakLotoRecord[];
    observers: SidakLotoObserver[];
}

export async function generateSidakLotoPdf(data: SidakLotoData): Promise<jsPDF> {
    // Landscape A4 as per reference PDF
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width; // 297mm
    const pageHeight = pdf.internal.pageSize.height; // 210mm

    // Margins
    const marginTop = 10;
    const marginLeft = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const availableWidth = pageWidth - marginLeft - marginRight;

    let yPosition = marginTop;

    // --- HEADER SECTION ---
    // Left side: Logo/Text
    try {
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = '/assets/logo.png';
        });
        pdf.addImage(logoImg, 'PNG', marginLeft, yPosition, 40, 12);
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('PT BORNEO INDOBARA', marginLeft, yPosition + 8);
    }

    // Right side: Document code
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('BIB – HSE – ES – F – 3.02 – 83', pageWidth - marginRight, yPosition, { align: 'right' });
    pdf.text('Maret 2025/R0', pageWidth - marginRight, yPosition + 5, { align: 'right' });
    pdf.text('Page 1 of 1', pageWidth - marginRight, yPosition + 10, { align: 'right' });

    yPosition += 18;

    // Horizontal line separator
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);

    yPosition += 5;

    // --- TITLE SECTION ---
    // Title box with gray background
    pdf.setFillColor(200, 200, 200);
    pdf.rect(marginLeft, yPosition, availableWidth, 10, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(marginLeft, yPosition, availableWidth, 10, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('INSPEKSI KEPATUHAN LOTO', pageWidth / 2, yPosition + 7, { align: 'center' });

    yPosition += 14;

    // Subtitle (italic)
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Formulir ini digunakan sebagai catatan hasil inspeksi LOTO yang dilaksanakan di PT Borneo Indobara', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 8;

    // --- INSPECTION INFO TABLE (2x2 grid) ---
    const infoData = [
        ['Tanggal/Shift', `${data.session.tanggal || ''} / ${data.session.shift || ''}`, 'Lokasi', data.session.lokasi || ''],
        ['Waktu', `${data.session.waktu || ''} sampai`, 'Jumlah Sampel', (data.session.totalSampel || data.records.length).toString()]
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            font: 'helvetica',
            halign: 'left',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: availableWidth / 2 - 35 },
            2: { cellWidth: 35, fontStyle: 'bold' },
            3: { cellWidth: availableWidth / 2 - 35 },
        },
        margin: { left: marginLeft, right: marginRight },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 6;

    // --- MAIN INSPECTION DATA TABLE ---
    // Questions for header (vertical text)
    const questions = [
        'Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki?',
        'Apakah danger tag sesuai dan memadai?',
        'Apakah gembok sesuai dan memadai?',
        'Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?',
        'Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?'
    ];

    // Table Headers
    const tableHeaders = [['No', 'Nama', 'NIK', 'Perusahaan', '', '', '', '', '', 'Keterangan']];

    // Table Data
    const tableData = data.records.map((record, idx) => [
        (idx + 1).toString(),
        record.nama || (record as any).namaNik || (record as any).namaKaryawan || '',
        record.nik || '',
        record.perusahaan || '',
        record.q1_gembokTagTerpasang ? '✓' : '-',
        record.q2_dangerTagSesuai ? '✓' : '-',
        record.q3_gembokSesuai ? '✓' : '-',
        record.q4_kunciUnik ? '✓' : '-',
        record.q5_haspBenar ? '✓' : '-',
        record.keterangan || ''
    ]);

    // Ensure minimum 10 rows
    const minRows = 10;
    for (let i = tableData.length; i < minRows; i++) {
        tableData.push([(i + 1).toString(), '', '', '', '', '', '', '', '', '']);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.5,
            lineColor: [0, 0, 0],
            minCellHeight: 8
        },
        headStyles: {
            fillColor: [200, 200, 200], // Light gray as per spec
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'bottom',
            minCellHeight: 45,
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 9, halign: 'center' },   // No
            1: { cellWidth: 35, halign: 'left' },    // Nama
            2: { cellWidth: 22, halign: 'center' },  // NIK
            3: { cellWidth: 35, halign: 'left' },    // Perusahaan
            4: { cellWidth: 12, halign: 'center' },  // Q1
            5: { cellWidth: 12, halign: 'center' },  // Q2
            6: { cellWidth: 12, halign: 'center' },  // Q3
            7: { cellWidth: 12, halign: 'center' },  // Q4
            8: { cellWidth: 12, halign: 'center' },  // Q5
            9: { cellWidth: 'auto', halign: 'left' }, // Keterangan
        },
        didDrawCell: (cellData) => {
            // Draw vertical text in header for Q1-Q5 (columns 4-8)
            if (cellData.section === 'head' && cellData.column.index >= 4 && cellData.column.index <= 8) {
                const doc = cellData.doc;
                const text = questions[cellData.column.index - 4];

                const x = cellData.cell.x + (cellData.cell.width / 2);
                const y = cellData.cell.y + cellData.cell.height - 2;

                const prevFontSize = (doc as any).internal.getFontSize();
                const prevFont = (doc as any).internal.getFont();

                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);

                doc.text(text, x - 1, y, { angle: 90, align: 'left', maxWidth: 40 });

                doc.setFontSize(prevFontSize);
                doc.setFont(prevFont.fontName, prevFont.fontStyle);
            }
        },
        margin: { left: marginLeft, right: marginRight },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 8;

    // --- SIGNATURE TABLE (OBSERVER SECTION) ---
    // Check if we need a new page
    const remainingSpace = pageHeight - yPosition - marginBottom;
    if (remainingSpace < 70) {
        pdf.addPage();
        yPosition = marginTop;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INSPEKSI KEPATUHAN LOTO - Daftar Pemantau', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
    }

    // Two-column layout for observers
    const tableWidth = (availableWidth - 10) / 2; // 10mm gap between tables

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

    autoTable(pdf, {
        startY: yPosition,
        head: [['No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan']],
        body: leftObservers,
        theme: 'grid',
        tableWidth: tableWidth,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            minCellHeight: 12,
            halign: 'left',
            valign: 'middle'
        },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
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
        margin: { left: marginLeft },
    });

    // Right table (observers 5-8)
    const rightObservers = [];
    for (let i = 4; i < 8; i++) {
        const obs = data.observers[i];
        rightObservers.push([
            (i + 1).toString(),
            obs?.nama || '',
            obs?.perusahaan || '',
            ''
        ]);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: [['No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan']],
        body: rightObservers,
        theme: 'grid',
        tableWidth: tableWidth,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            minCellHeight: 12,
            halign: 'left',
            valign: 'middle'
        },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
            3: { cellWidth: 'auto' }
        },
        didDrawCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 3) {
                const obsIdx = cellData.row.index + 4;
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
        margin: { left: marginLeft + tableWidth + 10 },
    });

    // Footer
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Maret 2025/R0', marginLeft, pageHeight - 10);
    pdf.text('Page 1 of 1', pageWidth - marginRight, pageHeight - 10, { align: 'right' });

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
