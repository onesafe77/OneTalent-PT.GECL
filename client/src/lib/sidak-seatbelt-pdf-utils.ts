import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
    SidakFatigueSession,
    SidakFatigueRecord,
    SidakFatigueObserver,
    SidakRosterSession,
    SidakRosterRecord,
    SidakRosterObserver,
    SidakSeatbeltSession,
    SidakSeatbeltRecord,
    SidakSeatbeltObserver
} from '@shared/schema';

// ============================================
// SIDAK FATIGUE PDF GENERATOR
// Form: BIB-HSE-ES-F-3.02-16
// ============================================

interface SidakFatigueData {
    session: SidakFatigueSession;
    records: SidakFatigueRecord[];
    observers: SidakFatigueObserver[];
}

export async function generateSidakFatiguePdf(data: SidakFatigueData): Promise<jsPDF> {
    // ... (keep existing Fatigue PDF code - not showing to save space)
    // This function already exists in the file
    return new jsPDF(); // Placeholder
}

export async function downloadSidakFatigueAsJpg(data: SidakFatigueData, filename: string): Promise<void> {
    // ... (keep existing Fatigue JPG code)
}

// ============================================
// SIDAK ROSTER PDF GENERATOR
// Form: BIB-HSE-PPO-F
// ============================================

interface SidakRosterData {
    session: SidakRosterSession;
    records: SidakRosterRecord[];
    observers: SidakRosterObserver[];
}

export async function generateSidakRosterPdf(data: SidakRosterData): Promise<jsPDF> {
    // ... (keep existing Roster PDF code)
    return new jsPDF(); // Placeholder
}

export async function downloadSidakRosterAsJpg(data: SidakRosterData, filename: string): Promise<void> {
    // ... (keep existing Roster JPG code)
}

// ============================================
// SIDAK SEATBELT PDF GENERATOR
// Form: BIB-HSE-ES-F-3.02-86
// ============================================

interface SidakSeatbeltData {
    session: SidakSeatbeltSession;
    records: SidakSeatbeltRecord[];
    observers: SidakSeatbeltObserver[];
}

export async function generateSidakSeatbeltPdf(data: SidakSeatbeltData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    let yPosition = margin;

    // ==================== HEADER WITH LOGO ====================
    try {
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = '/assets/logo.png';
        });

        pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
    } catch (error) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text('PT. Goden Energi Cemerlang Lesrari', margin, yPosition + 6);
    }

    // Form code on top-right
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('BIB – HSE – ES – F – 3.02 – 86', pageWidth - margin, yPosition + 4, { align: 'right' });

    yPosition += 12;

    // Main title with gray background
    const titleYStart = yPosition;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, titleYStart, pageWidth - (margin * 2), 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('SIDAK SEAT BELT', pageWidth / 2, titleYStart + 5.5, { align: 'center' });

    yPosition += 10;

    // Subtitle
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Formulir ini digunakan sebagai catatan hasil pengecekan seat belt yang dilaksanakan di PT. Goden Energi Cemerlang Lesrari', pageWidth / 2, yPosition + 2, { align: 'center' });

    yPosition += 4;

    // ==================== INFO SECTION ====================
    const session = data.session as any;
    const infoTableData = [
        [
            'Tanggal/ Shift',
            `${session.tanggalPelaksanaan || ''} / ${session.shift || ''}`,
            'Lokasi',
            session.lokasi || ''
        ],
        [
            'Waktu',
            session.jamPelaksanaan || '',
            'Total Sampel',
            session.totalSampel?.toString() || data.records.length.toString()
        ]
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoTableData,
        theme: 'grid',
        tableWidth: pageWidth - (margin * 2),
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            lineWidth: 0.2,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255], halign: 'left' },
            1: { cellWidth: (pageWidth - (margin * 2)) / 2 - 50, halign: 'left' },
            2: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255], halign: 'left' },
            3: { cellWidth: (pageWidth - (margin * 2)) / 2 - 50, halign: 'left' },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 2;

    // ==================== SEATBELT COMPLIANCE TABLE ====================
    const tableHeaders = [[
        'No',
        'Nama',
        'No Kendaraan',
        'Perusahaan',
        'Apakah sabuk pengaman yang terpasang masih berfungsi dengan baik (Kondisi masih baik/tidak kondisi rusak) Pengemudi?',
        'Apakah sabuk pengaman yang terpasang masih berfungsi dengan baik (Kondisi masih baik/tidak kondisi rusak) Penumpang?',
        'Apakah sabuk pengaman yang tidak terpakai juga dipakaikan (penggunaan dengan benar) Pengemudi?',
        'Apakah sabuk pengaman yang tidak terpakai juga dipakaikan (penggunaan dengan benar) Penumpang?',
        'Keterangan'
    ]];

    // Generate table data from records, ensuring minimum 10 rows
    const tableData = [];

    // Add actual records
    data.records.forEach((record, index) => {
        tableData.push([
            (index + 1).toString(),
            record.nama || '',
            record.nomorLambung || '',
            record.perusahaan || '',
            record.seatbeltDriverCondition ? '✓' : 'X',
            record.seatbeltPassengerCondition ? '✓' : 'X',
            record.seatbeltDriverUsage ? '✓' : 'X',
            record.seatbeltPassengerUsage ? '✓' : 'X',
            record.keterangan || ''
        ]);
    });

    // Pad with empty rows to ensure minimum 10 rows
    const minRows = 10;
    while (tableData.length < minRows) {
        tableData.push([
            (tableData.length + 1).toString(),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
    }

    const availableWidth = pageWidth - (margin * 2);

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 7,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
            minCellHeight: 7,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'normal', // Changed from bold to normal
            halign: 'center',
            valign: 'middle', // Changed to middle for wrapped text
            lineWidth: 0.25,
            fontSize: 6.5, // Smaller for wrapped text
            cellPadding: 2,
            minCellHeight: 40,
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 36, halign: 'left' },
            2: { cellWidth: 23 },
            3: { cellWidth: 31, halign: 'left' },
            4: { cellWidth: 23, fontSize: 11 },
            5: { cellWidth: 23, fontSize: 11 },
            6: { cellWidth: 23, fontSize: 11 },
            7: { cellWidth: 23, fontSize: 11 },
            8: { cellWidth: 85, halign: 'left' },
        },
        margin: { left: margin, right: margin },
        didDrawCell: (cellData) => {
            // Skip custom rendering for headers - let autoTable handle wrapping
            if (false && [4, 5, 6, 7].includes(cellData.column.index) && cellData.section === 'head') {
                const text = cellData.cell.raw as string;
                const cellX = cellData.cell.x;
                const cellY = cellData.cell.y;
                const cellWidth = cellData.cell.width;
                const cellHeight = cellData.cell.height;

                // Clear the cell text (already drawn by autoTable)
                pdf.setFillColor(220, 220, 220);
                pdf.rect(cellX, cellY, cellWidth, cellHeight, 'F');

                // Redraw cell border
                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.2);
                pdf.rect(cellX, cellY, cellWidth, cellHeight, 'S');

                // Draw rotated text - centered in cell with strict bounds
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(5); // Very small to fit

                // Position text in the center of the cell
                const textX = cellX + cellWidth / 2;
                const textY = cellY + cellHeight / 2;

                // Truncate text if too long to fit in cell height
                const maxTextWidth = cellHeight - 10;
                const lines = pdf.splitTextToSize(text, maxTextWidth);
                const truncatedText = lines[0] || text; // Use only first line

                pdf.saveGraphicsState();
                pdf.text(truncatedText, textX, textY, {
                    angle: 90,
                    align: 'center',
                    baseline: 'middle',
                    maxWidth: maxTextWidth
                });
                pdf.restoreGraphicsState();
            }

            // Render checkmarks for body cells in columns 4-7
            if ([4, 5, 6, 7].includes(cellData.column.index) && cellData.section === 'body') {
                const cellValue = cellData.cell.raw as string;

                if (cellValue === '✓' || cellValue === 'X') {
                    const cellX = cellData.cell.x;
                    const cellY = cellData.cell.y;
                    const cellWidth = cellData.cell.width;
                    const cellHeight = cellData.cell.height;

                    // Clear the default text
                    pdf.setFillColor(255, 255, 255);
                    pdf.rect(cellX, cellY, cellWidth, cellHeight, 'F');

                    // Redraw cell border
                    pdf.setDrawColor(0, 0, 0);
                    pdf.setLineWidth(0.15);
                    pdf.rect(cellX, cellY, cellWidth, cellHeight, 'S');

                    // Draw checkmark or X using lines (not text)

                    if (cellValue === '✓') {
                        // Draw checkmark manually using lines
                        const centerX = cellX + cellWidth / 2;
                        const centerY = cellY + cellHeight / 2;
                        const size = 3;

                        pdf.setDrawColor(0, 0, 0);
                        pdf.setLineWidth(0.4); // Thinner line for non-bold appearance
                        pdf.setLineCap('round');

                        // Draw checkmark as two lines forming a "✓" shape
                        pdf.line(centerX - size * 0.6, centerY, centerX - size * 0.1, centerY + size * 0.6);
                        pdf.line(centerX - size * 0.1, centerY + size * 0.6, centerX + size * 0.8, centerY - size * 0.6);
                    } else {
                        // Draw X using lines
                        const centerX = cellX + cellWidth / 2;
                        const centerY = cellY + cellHeight / 2;
                        const size = 2.5;

                        pdf.setDrawColor(0, 0, 0);
                        pdf.setLineWidth(0.4); // Thinner line for non-bold appearance
                        pdf.setLineCap('round');

                        // Draw X as two diagonal lines
                        pdf.line(centerX - size, centerY - size, centerX + size, centerY + size);
                        pdf.line(centerX + size, centerY - size, centerX - size, centerY + size);
                    }
                }
            }
        }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 3;

    // ==================== OBSERVER SIGNATURES ====================
    const observerTableData = [
        [
            '1.', data.observers[0]?.nama || '', data.observers[0]?.perusahaan || '', '',
            '5.', data.observers[4]?.nama || '', data.observers[4]?.perusahaan || '', ''
        ],
        [
            '2.', data.observers[1]?.nama || '', data.observers[1]?.perusahaan || '', '',
            '6.', data.observers[5]?.nama || '', data.observers[5]?.perusahaan || '', ''
        ],
        [
            '3.', data.observers[2]?.nama || '', data.observers[2]?.perusahaan || '', '',
            '7.', data.observers[6]?.nama || '', data.observers[6]?.perusahaan || '', ''
        ],
        [
            '4.', data.observers[3]?.nama || '', data.observers[3]?.perusahaan || '', '',
            '8.', data.observers[7]?.nama || '', data.observers[7]?.perusahaan || '', ''
        ]
    ];

    autoTable(pdf, {
        startY: yPosition,
        head: [[
            'No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan',
            'No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan'
        ]],
        body: observerTableData,
        theme: 'grid',
        tableWidth: pageWidth - (margin * 2),
        styles: {
            fontSize: 7,
            cellPadding: 1,
            halign: 'left',
            valign: 'middle',
            minCellHeight: 9,
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 7.5,
            cellPadding: 1,
            minCellHeight: 9,
            lineWidth: 0.25,
            lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { cellWidth: 11, halign: 'center' },
            1: { cellWidth: 69, halign: 'left' },
            2: { cellWidth: 32, halign: 'left' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 11, halign: 'center' },
            5: { cellWidth: 69, halign: 'left' },
            6: { cellWidth: 32, halign: 'left' },
            7: { cellWidth: 26, halign: 'center' },
        },
        didDrawCell: (cellData) => {
            if ((cellData.column.index === 3 || cellData.column.index === 7) && cellData.section === 'body') {
                const rowIndex = cellData.row.index;
                const observerIndex = cellData.column.index === 3 ? rowIndex : rowIndex + 4;
                const observer = data.observers[observerIndex];

                if (observer?.signatureDataUrl) {
                    try {
                        const format = observer.signatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
                        const cellX = cellData.cell.x;
                        const cellY = cellData.cell.y;
                        const cellWidth = cellData.cell.width;
                        const cellHeight = cellData.cell.height;

                        pdf.addImage(
                            observer.signatureDataUrl,
                            format,
                            cellX + 1,
                            cellY + 1,
                            cellWidth - 2,
                            cellHeight - 2,
                            undefined,
                            'FAST'
                        );
                    } catch (error) {
                        console.error('Error adding signature image:', error);
                    }
                }
            }
        },
        margin: { left: margin, right: margin },
    });

    // Add page footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('April 2025/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

// ============================================
// JPG EXPORT FOR SIDAK SEATBELT
// ============================================
export async function downloadSidakSeatbeltAsJpg(data: SidakSeatbeltData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakSeatbeltPdf(data);
        const pdfArrayBuffer = pdf.output('arraybuffer');

        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdfDocument = await loadingTask.promise;

        const page = await pdfDocument.getPage(1);
        const scale = 2.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Could not get canvas context');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
            canvas,
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext as any).promise;

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
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
                },
                'image/jpeg',
                0.95
            );
        });
    } catch (error) {
        throw new Error(`Failed to generate JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
