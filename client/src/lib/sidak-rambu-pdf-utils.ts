import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type {
    SidakRambuSession,
    SidakRambuObservation,
    SidakRambuObserver
} from '@shared/schema';

// ============================================
// SIDAK RAMBU PDF GENERATOR - BALANCED & CLEAN
// Form: GECL-HSE-PPO-F-072-24
// - Balanced Column Widths (Checklist 15mm, Desc 54mm)
// - Consistent Line Widths (0.15mm everywhere) for perfect grid
// ============================================

export interface SidakRambuData {
    session: SidakRambuSession;
    observations: SidakRambuObservation[];
    observers: SidakRambuObserver[];
}

export async function generateSidakRambuPdf(data: SidakRambuData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.width; // 297mm
    const pageHeight = pdf.internal.pageSize.height; // 210mm

    const margin = 8;
    const contentWidth = pageWidth - (margin * 2);

    let yPosition = margin;

    // ==================== HEADER SECTION ====================
    try {
        const logoImg = await loadGeclLogo();
        pdf.addImage(logoImg, 'PNG', margin, margin, 40, 9);
    } catch (error) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text('PT. Goden Energi Cemerlang Lesrari', margin, yPosition + 6);
    }

    // Form Code
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text('GECL – HSE – PPO – F – 072 – 24', pageWidth - margin, yPosition + 4, { align: 'right' });

    yPosition += 10;

    // ==================== CALCULATE TABLE WIDTH ====================
    // Main table column widths (must match columnStyles below)
    const tableColWidths = {
        no: 9,
        nama: 50,
        noKendaraan: 24, // Reduced from 32mm to 24mm for more checklist space
        perusahaan: 18, // Reduced from 25mm
        checklist: 14.875, // Optimized: (8mm from noKendaraan + 7mm from perusahaan) / 8 columns
        keterangan: 56
    };
    const actualTableWidth = tableColWidths.no + tableColWidths.nama + tableColWidths.noKendaraan +
        tableColWidths.perusahaan + (tableColWidths.checklist * 8) + tableColWidths.keterangan;

    // Align table to left margin (same as header)
    const tableStartX = margin;

    // Title Box
    const titleHeight = 6;
    const titleYStart = yPosition;
    pdf.setFillColor(230, 230, 230);
    pdf.rect(tableStartX, titleYStart, actualTableWidth, titleHeight, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('OBSERVASI KEPATUHAN RAMBU', pageWidth / 2, titleYStart + 5, { align: 'center' });

    yPosition += titleHeight + 1;

    // Subtitle
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Formulir ini digunakan sebagai catatan hasil inspeksi kepatuhan rambu-rambu lalu lintas yang dilaksanakan di PT. Goden Energi Cemerlang Lesrari', pageWidth / 2, yPosition + 2, { align: 'center' });
    yPosition += 4;

    // ==================== INFO TABLE ====================
    const infoTableData = [
        ['Tanggal/ Shift', `${data.session.tanggal} / ${data.session.shift}`, 'Lokasi', data.session.lokasi || ''],
        ['Waktu', `${data.session.waktuMulai} sampai ${data.session.waktuSelesai}`, 'Total Sampel', data.session.totalSampel?.toString() || data.observations.length.toString()]
    ];

    const infoColWidth = actualTableWidth / 4;
    autoTable(pdf, {
        startY: yPosition,
        body: infoTableData,
        theme: 'grid',
        tableWidth: actualTableWidth,
        tableLineWidth: 0.4,
        styles: {
            fontSize: 9,
            cellPadding: 2,
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            valign: 'middle',
            minCellHeight: 8,
        },
        columnStyles: {
            0: { cellWidth: 35, fillColor: [240, 240, 240], fontStyle: 'bold' as const },
            1: { cellWidth: (actualTableWidth / 2) - 35 },
            2: { cellWidth: 35, fillColor: [240, 240, 240], fontStyle: 'bold' as const },
            3: { cellWidth: (actualTableWidth / 2) - 35 },
        },
        margin: { left: tableStartX, right: pageWidth - tableStartX - actualTableWidth },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 1;

    // ==================== FOOTER PRE-CALCULATION ====================
    const footerRowHeight = 7;
    const footerHeaderHeight = 6;
    const footerTotalHeight = footerHeaderHeight + (footerRowHeight * 4);
    const observerY = pageHeight - margin - footerTotalHeight;

    // ==================== MAIN TABLE ====================
    const wrappedHeaders = [
        ['Apakah kendaraan berhenti pada', 'rambu stop (Stop Sign)'],
        ['Apakah kendaraan memberikan', 'kesempatan kepada pengendara lain', '(Give Way Sign)'],
        ['Apakah pekerja berhenti dibelakang', 'rambu lalu lintas yang terpasang'],
        ['Apakah jarak beriringan antar', 'kendaraan saat berhenti tidak', 'kurang dari 1X panjang kendaraan'],
        ['Apakah kendaraan tidak melakukan', 'overtaking di area terlarang seperti :', 'area tikungan, tanjakan,', 'penyempitan atau area yang', 'terpasang rambu'],
        ['Apakah kendaraan parkir sesuai', 'dengan rambu yang sudah', 'ditentukan'],
        ['Apakah kendaraan parkir di tepi jalan', 'dengan aman (tidak menutup 50%', 'dari lebar jalan)'],
        ['Apakah driver melakukan', 'komunikasi positif pada saat di', 'timbangan']
    ];

    const checklistColStart = 4;
    const checklistColCount = 8;
    const checklistColEnd = 11;

    const tableHeaders = [
        'No',
        'Nama',
        'No\nKendaraan',
        'Perusahaan',
        '', '', '', '', '', '', '', '',
        'Keterangan'
    ];

    const exactRows = 10;
    const rowsToRender: (SidakRambuObservation | null)[] = [...data.observations];
    while (rowsToRender.length < exactRows) {
        rowsToRender.push(null);
    }

    const tableDataPage1 = rowsToRender.slice(0, 10).map((obs, index) => {
        if (!obs) {
            return [`${index + 1}.`, '', '', '', '', '', '', '', '', '', '', '', ''];
        }
        return [
            `${index + 1}.`,
            obs.nama,
            obs.noKendaraan,
            obs.perusahaan,
            obs.rambuStop ? '1' : '0',
            obs.rambuGiveWay ? '1' : '0',
            obs.rambuKecepatanMax ? '1' : '0',
            obs.rambuLaranganMasuk ? '1' : '0',
            obs.rambuLaranganParkir ? '1' : '0',
            obs.rambuWajibHelm ? '1' : '0',
            obs.rambuLaranganUTurn ? '1' : '0',
            '',
            obs.keterangan || ''
        ];
    });

    const mainHeaderHeight = 48;

    autoTable(pdf, {
        startY: yPosition,
        head: [tableHeaders],
        body: tableDataPage1,
        theme: 'grid',
        tableWidth: actualTableWidth,
        tableLineWidth: 0.4,
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            halign: 'center' as const,
            valign: 'middle' as const,
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
            minCellHeight: 7, // Adjusted to 7mm for better proportion
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold' as const,
            halign: 'center' as const,
            valign: 'middle' as const,
            minCellHeight: 48,
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { cellWidth: tableColWidths.no },
            1: { cellWidth: tableColWidths.nama, halign: 'left' as const },
            2: { cellWidth: tableColWidths.noKendaraan, halign: 'left' as const },
            3: { cellWidth: tableColWidths.perusahaan, halign: 'left' as const },
            // ALL 8 inspection columns UNIFORM @ 13mm each = 104mm
            4: { cellWidth: tableColWidths.checklist }, 5: { cellWidth: tableColWidths.checklist }, 6: { cellWidth: tableColWidths.checklist }, 7: { cellWidth: tableColWidths.checklist },
            8: { cellWidth: tableColWidths.checklist }, 9: { cellWidth: tableColWidths.checklist }, 10: { cellWidth: tableColWidths.checklist }, 11: { cellWidth: tableColWidths.checklist },
            12: { cellWidth: tableColWidths.keterangan, halign: 'left' as const },
        },
        margin: { left: tableStartX, right: pageWidth - tableStartX - actualTableWidth },
        didDrawCell: (data) => {
            // 1. Draw Vertical Text in Header (Left Align / Bottom pivot)
            if (data.section === 'head' && data.row.index === 0 && data.column.index >= checklistColStart && data.column.index <= checklistColEnd) {
                const headerIndex = data.column.index - checklistColStart;
                const headerLines = wrappedHeaders[headerIndex];

                const x = data.cell.x + data.cell.width / 2;
                const startY = data.cell.y + data.cell.height - 3;

                pdf.setFontSize(6); // Reduced to 6pt for optimal fit
                pdf.setTextColor(0, 0, 0);

                const lineHeight = 3.0;
                const totalBlockWidth = headerLines.length * lineHeight;
                const startX = x - (totalBlockWidth / 2) + (lineHeight / 2);

                headerLines.forEach((line, lineIdx) => {
                    const currentX = startX + (lineIdx * lineHeight);
                    pdf.text(line, currentX, startY, { angle: 90, align: 'left' });
                });
            }

            // 2. Custom Draw Symbols (Vector) - Refined for better appearance
            const checkCols = [4, 5, 6, 7, 8, 9, 10, 11];
            if (data.section === 'body' && checkCols.includes(data.column.index)) {
                const val = data.cell.text[0];
                data.cell.text = [];

                const centerX = data.cell.x + data.cell.width / 2;
                const centerY = data.cell.y + data.cell.height / 2;

                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.5); // Slightly thicker for better visibility

                if (val === '1') { // ✔ Checkmark - refined proportions
                    const s = 1.5; // Slightly larger scale
                    const p1 = { x: centerX - (1.3 * s), y: centerY + (0.1 * s) };
                    const p2 = { x: centerX - (0.3 * s), y: centerY + (1.3 * s) };
                    const p3 = { x: centerX + (1.7 * s), y: centerY - (1.2 * s) };
                    pdf.line(p1.x, p1.y, p2.x, p2.y);
                    pdf.line(p2.x, p2.y, p3.x, p3.y);
                } else if (val === '0') { // ✘ Cross - refined proportions
                    const s = 1.4; // Slightly larger for balance
                    pdf.line(centerX - s, centerY - s, centerX + s, centerY + s);
                    pdf.line(centerX + s, centerY - s, centerX - s, centerY + s);
                }
            }
        }
    });

    // ==================== OBSERVERS TABLE (FIXED FOOTER) ====================
    const observerTableHeaders = [
        [
            { content: 'No', styles: { halign: 'center' as const } },
            { content: 'Nama Pemantau', styles: { halign: 'center' as const } },
            { content: 'Perusahaan', styles: { halign: 'center' as const } },
            { content: 'Tanda Tangan', styles: { halign: 'center' as const } },
            { content: 'No', styles: { halign: 'center' as const } },
            { content: 'Nama Pemantau', styles: { halign: 'center' as const } },
            { content: 'Perusahaan', styles: { halign: 'center' as const } },
            { content: 'Tanda Tangan', styles: { halign: 'center' as const } }
        ]
    ];

    const footerRows = [];
    for (let i = 0; i < 4; i++) {
        const leftIdx = i;
        const rightIdx = i + 4;
        const noLeft = `${leftIdx + 1}.`;
        const noRight = `${rightIdx + 1}.`;
        const obsLeft = data.observers[leftIdx];
        const obsRight = data.observers[rightIdx];
        footerRows.push([
            noLeft,
            obsLeft?.nama || '',
            obsLeft?.perusahaan || '',
            '',
            noRight,
            obsRight?.nama || '',
            obsRight?.perusahaan || '',
            ''
        ]);
    }

    // Observer table column widths - must match total table width (276mm)
    // Each half = 138mm (276 / 2) for 4 columns
    const halfColWidths = {
        no: 9,      // Match main table No column
        name: 70,   // Adjusted for better distribution
        org: 30,    // Adjusted
        sign: 29    // 9 + 70 + 30 + 29 = 138mm per side
    };

    autoTable(pdf, {
        startY: observerY,
        head: observerTableHeaders,
        body: footerRows,
        theme: 'grid',
        tableWidth: actualTableWidth,
        tableLineWidth: 0.4,
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            halign: 'left' as const,
            valign: 'middle' as const,
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
            minCellHeight: footerRowHeight,
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold' as const,
            halign: 'center' as const,
            valign: 'middle' as const,
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
            minCellHeight: footerHeaderHeight,
        },
        columnStyles: {
            0: { cellWidth: halfColWidths.no, halign: 'center' as const },
            1: { cellWidth: halfColWidths.name },
            2: { cellWidth: halfColWidths.org },
            3: { cellWidth: halfColWidths.sign, halign: 'center' as const },
            4: { cellWidth: halfColWidths.no, halign: 'center' as const },
            5: { cellWidth: halfColWidths.name },
            6: { cellWidth: halfColWidths.org },
            7: { cellWidth: halfColWidths.sign, halign: 'center' as const },
        },
        margin: { left: tableStartX, right: pageWidth - tableStartX - actualTableWidth },
        didDrawCell: (cellData) => {
            // Signature
            if (cellData.section === 'body' && (cellData.column.index === 3 || cellData.column.index === 7)) {
                const rowIndex = cellData.row.index;
                const obsIndex = cellData.column.index === 3 ? rowIndex : rowIndex + 4;
                const observer = data.observers[obsIndex];
                if (observer?.signatureDataUrl) {
                    try {
                        const format = observer.signatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
                        const x = cellData.cell.x + 2;
                        const y = cellData.cell.y + 2;
                        const w = cellData.cell.width - 4;
                        const h = cellData.cell.height - 4;
                        pdf.addImage(observer.signatureDataUrl, format, x, y, w, h, undefined, 'FAST');
                    } catch (e) { }
                }
            }
        }
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const footerTextY = pageHeight - 3;
    pdf.text('Mei 2020/R0', margin, footerTextY);
    pdf.text('Page 1 of 1', pageWidth - margin, footerTextY, { align: 'right' });

    return pdf;
}

export async function downloadSidakRambuAsJpg(data: SidakRambuData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakRambuPdf(data);
        const pdfArrayBuffer = pdf.output('arraybuffer');

        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdfDocument = await loadingTask.promise;
        const page = await pdfDocument.getPage(1);

        const scale = 2.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) throw new Error('Could not get canvas context');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas, canvasContext: context, viewport } as any).promise;

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create JPG blob'));
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                resolve();
            }, 'image/jpeg', 0.95);
        });
    } catch (error) {
        throw new Error(`Failed to generate JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
