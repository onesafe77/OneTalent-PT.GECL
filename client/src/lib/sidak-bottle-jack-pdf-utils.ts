import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK BOTTLE JACK INSPECTION PDF GENERATOR
// Document Code: BIB – HSE – ES – F – 3.02 – 87
// Revision: April 2025/R0
// Portrait format — Layout matches Sidak Workshop
// ============================================

export interface BottleJackPDFData {
    session: {
        tanggal: string;
        namaWorkshop?: string;
        lokasi: string;
        shift: string;
        penanggungJawabArea?: string;
        activityPhotos?: string[];
    };
    records: Array<{
        noRegister?: string;
        noRegisterPeralatan?: string;
        inspectionResults?: Record<string, string>;
        tindakLanjut?: string;
        tindakLanjutPerbaikan?: string;
        dueDate?: string | null;
        keterangan?: string | null;
    }>;
    observers: Array<{
        nama: string;
        perusahaan: string;
        tandaTangan: string;
    }>;
}

// Inspection items matching the official GECL Bottle Jack template
const INSPECTION_ITEMS = [
    { id: "1", label: "1. Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
    { id: "2", label: "2. Apakah tagging Masih Berlaku?" },
    { id: "3", label: "3. Apakah tidak terdapat rembesan oli pada body bottle jack ?" },
    { id: "4", label: "4. Apakah kondisi pompa bottle jack berfungsi dengan baik ?" },
    { id: "5", label: "5. Apakah valve pengunci masih berfungsi dengan baik ?" },
    { id: "6", label: "6. Apakah cylinder rod jack tidak ada yang tergores atau rusak ?" },
    { id: "7", label: "7. Apakah label SWL masih terlihat dengan jelas ?" },
    { id: "8", label: "8. Apakah stang jack tersedia dan tidak terdapat kebocoran?" }
];

// Helper to get inspection result from a record (supports both flat and JSONB formats)
function getResult(record: any, key: string): string {
    // Try inspectionResults JSONB first
    if (record.inspectionResults && record.inspectionResults[key]) return record.inspectionResults[key];
    // Try flat field
    if (record[key]) return record[key];
    return '';
}

function getRegister(record: any): string {
    return record.noRegister || record.noRegisterPeralatan || '';
}

function getTindakLanjutForItem(record: any, itemId: string): string {
    const result = getResult(record, itemId);
    if (result !== 'TS') return '';
    const tl = record.tindakLanjutPerbaikan || record.tindakLanjut || {};
    if (typeof tl === 'string') return tl;
    if (typeof tl === 'object') return tl[itemId] || '';
    return '';
}

export async function generateSidakBottleJackPDF(data: BottleJackPDFData): Promise<jsPDF> {
    const inspectorData = data.observers || [];

    // PORTRAIT format A4 (210mm x 297mm) — same as Workshop
    const pdf = new jsPDF('portrait', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.width;  // 210mm
    const pageHeight = pdf.internal.pageSize.height; // 297mm
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);

    // Pre-load logo image
    let logoImg: HTMLImageElement | string | null = null;
    try {
        logoImg = await loadGeclLogo();
    } catch (error) {
        console.error('Logo loading failed, will use text fallback:', error);
    }

    // Helper function to draw header on each page
    const drawHeader = (yStart: number): number => {
        let yPosition = yStart;

        // Logo (left)
        if (logoImg) {
            pdf.addImage(logoImg, 'PNG', margin, yPosition, 40, 9);
        } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 139);
            pdf.text('PT. GECL', margin, yPosition + 5);
        }

        // Document code (right)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text('BIB – HSE – ES – F – 3.02 – 87', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        // Main title with gray background
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CHECKLIST INSPEKSI BOTTLE JACK', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi bottle jack', pageWidth / 2, yPosition + 8, { align: 'center' });

        yPosition += 12;

        // Header info table
        const infoData = [
            ['Tanggal', data.session.tanggal || '', 'Nama Workshop', data.session.namaWorkshop || ''],
            ['Lokasi', data.session.lokasi || '', 'Shift', data.session.shift || '']
        ];

        autoTable(pdf, {
            startY: yPosition,
            body: infoData,
            theme: 'grid',
            tableWidth: availableWidth,
            styles: {
                fontSize: 7,
                cellPadding: 1.5,
                lineWidth: 0.15,
                lineColor: [0, 0, 0],
                textColor: [0, 0, 0],
                valign: 'middle',
            },
            columnStyles: {
                0: { cellWidth: 30, fillColor: [240, 240, 240], fontStyle: 'bold' },
                1: { cellWidth: availableWidth / 2 - 30 },
                2: { cellWidth: 40, fillColor: [240, 240, 240], fontStyle: 'bold' },
                3: { cellWidth: availableWidth / 2 - 40 },
            },
            margin: { left: margin, right: margin },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 2;

        // Instruction note
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(6.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan. Pemeriksaan harus dilakukan permasing-masing peralatan', margin, yPosition + 2);

        return yPosition + 5;
    };

    // Build the table data for all records
    const buildTableData = () => {
        const tableRows: any[] = [];

        data.records.forEach((record, recordIndex) => {
            const registerNo = getRegister(record);

            // Unit header row (gray background)
            tableRows.push({
                isHeader: true,
                data: [
                    { content: `${recordIndex + 1}`, styles: { fontStyle: 'bold', fillColor: [200, 200, 200] } },
                    { content: `BOTTLE JACK – No Register Peralatan : ${registerNo}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [200, 200, 200], halign: 'left' } }
                ]
            });

            // Flat inspection items
            INSPECTION_ITEMS.forEach((item, itemIndex) => {
                const result = getResult(record, item.id);
                const tindakLanjut = getTindakLanjutForItem(record, item.id);
                let dueDate = '';
                if (result === 'TS' && record.dueDate) {
                    const hasShownDueDate = INSPECTION_ITEMS.slice(0, itemIndex).some(prev => getResult(record, prev.id) === 'TS');
                    if (!hasShownDueDate) dueDate = record.dueDate;
                }

                tableRows.push({
                    isHeader: false,
                    data: [item.id, item.label, result, tindakLanjut, dueDate]
                });
            });
        });

        return tableRows;
    };

    // Helper function to draw inspector signatures section
    const drawInspectorSignatures = (yStart: number): number => {
        let yPosition = yStart;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('Inspektur:', margin, yPosition);
        yPosition += 3;

        // Build inspector data for 2 columns with signature cells
        const inspector1 = inspectorData[0] || { nama: '', perusahaan: '', tandaTangan: '' };
        const inspector2 = inspectorData[1] || { nama: '', perusahaan: '', tandaTangan: '' };

        const inspectorTableData = [
            [
                inspector1.nama || '',
                inspector1.perusahaan || '',
                '',
                inspector2.nama || '',
                inspector2.perusahaan || '',
                ''
            ]
        ];

        autoTable(pdf, {
            startY: yPosition,
            head: [[
                'Nama Inspektor', 'Perusahaan', 'Tanda tangan',
                'Nama Inspektor', 'Perusahaan', 'Tanda tangan'
            ]],
            body: inspectorTableData,
            theme: 'grid',
            tableWidth: availableWidth,
            styles: {
                fontSize: 7,
                cellPadding: 1.5,
                valign: 'middle',
                minCellHeight: 15,
                lineWidth: 0.15,
                lineColor: [0, 0, 0],
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                minCellHeight: 6,
            },
            columnStyles: {
                0: { cellWidth: availableWidth / 6, halign: 'center' },
                1: { cellWidth: availableWidth / 6, halign: 'center' },
                2: { cellWidth: availableWidth / 6, halign: 'center' },
                3: { cellWidth: availableWidth / 6, halign: 'center' },
                4: { cellWidth: availableWidth / 6, halign: 'center' },
                5: { cellWidth: availableWidth / 6, halign: 'center' },
            },
            didDrawCell: (cellData) => {
                if ((cellData.column.index === 2 || cellData.column.index === 5) && cellData.section === 'body') {
                    const inspectorIndex = cellData.column.index === 2 ? 0 : 1;
                    const inspector = inspectorData[inspectorIndex];
                    if (inspector?.tandaTangan) {
                        try {
                            const format = inspector.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                            pdf.addImage(
                                inspector.tandaTangan,
                                format,
                                cellData.cell.x + 2,
                                cellData.cell.y + 2,
                                cellData.cell.width - 4,
                                cellData.cell.height - 4,
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

        return (pdf as any).lastAutoTable.finalY;
    };

    // Build all table data
    const allTableData = buildTableData();

    // Prepare flat rows for autoTable
    const flattenedRows: any[] = [];
    allTableData.forEach(row => {
        flattenedRows.push(row.data);
    });

    // Draw header on first page
    let yPosition = drawHeader(margin);

    // Column headers for the main table
    const tableHeaders = [['No', 'Deskripsi Pemeriksaan', 'Kesesuaian', 'Tindak Lanjut Perbaikan', 'Due Date']];

    // Use autoTable with page break handling
    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: flattenedRows,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 6.5,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            minCellHeight: 5,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            minCellHeight: 6,
        },
        columnStyles: {
            0: { cellWidth: 12 },  // No
            1: { cellWidth: 80, halign: 'left' },  // Deskripsi Pemeriksaan
            2: { cellWidth: 20 },  // Kesesuaian
            3: { cellWidth: 50, halign: 'left' },  // Tindak Lanjut Perbaikan
            4: { cellWidth: 28 },  // Due Date
        },
        margin: { left: margin, right: margin, bottom: 15 },
        showHead: 'everyPage',
        willDrawCell: (hookData) => {
            const rowData = hookData.row.raw;
            if (Array.isArray(rowData) && rowData.length > 0) {
                const firstCell = rowData[0];
                if (typeof firstCell === 'object' && firstCell !== null && 'styles' in firstCell) {
                    hookData.cell.styles.fillColor = [200, 200, 200];
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    // Get final Y position after table
    const finalTableY = (pdf as any).lastAutoTable.finalY;

    // Add inspector signatures on the last page
    const remainingSpace = pageHeight - finalTableY - 15;
    if (remainingSpace < 30) {
        pdf.addPage();
        drawInspectorSignatures(margin + 5);
    } else {
        drawInspectorSignatures(finalTableY + 5);
    }

    // Draw footers on all pages
    const actualTotalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= actualTotalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        pdf.text('April 2025/R0', margin, pageHeight - 5);
        pdf.text(`Page ${i} of ${actualTotalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    return pdf;
}

export async function downloadSidakBottleJackAsJpg(data: BottleJackPDFData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakBottleJackPDF(data);
        const pdfArrayBuffer = pdf.output('arraybuffer');
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdfDocument = await loadingTask.promise;

        const totalPages = pdfDocument.numPages;
        const scale = 2.5;

        const downloadPage = async (pageNum: number): Promise<void> => {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Could not get canvas context');

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({
                canvas,
                canvasContext: context,
                viewport,
            } as any).promise;

            return new Promise((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create JPG blob'));
                            return;
                        }
                        const pageFilename = totalPages > 1
                            ? filename.replace('.jpg', `_Page${pageNum}.jpg`).replace('.jpeg', `_Page${pageNum}.jpeg`)
                            : filename;

                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = pageFilename;
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
        };

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            await downloadPage(pageNum);
            if (pageNum < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    } catch (error) {
        throw new Error(`Failed to generate JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
