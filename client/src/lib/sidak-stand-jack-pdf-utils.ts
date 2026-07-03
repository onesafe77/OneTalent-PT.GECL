import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK STAND JACK INSPECTION PDF GENERATOR
// Document Code: PT. GECL – F - HSE - 002 - R0
// Revision: April 2025/R0
// Portrait format — Layout matches Sidak Workshop
// ============================================

export interface StandJackPDFData {
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
        tabungJack?: string;
        pompaJack?: string;
        silinderJack?: string;
        stangJack?: string;
        rodaJack?: string;
        labelSwl?: string;
        kebersihan?: string;
        tagging?: string;
        tindakLanjut?: string;
        tindakLanjutPerbaikan?: string;
        dueDate?: string | null;
        keterangan?: string | null;
        inspectionResults?: Record<string, string>;
    }>;
    observers: Array<{
        nama: string;
        perusahaan: string;
        tandaTangan: string;
    }>;
}

// Inspection categories matching the official GECL template
const INSPECTION_CATEGORIES: Record<string, { id: string; label: string }[]> = {
    'Kondisi Visual & Body': [
        { id: '1.1', label: '1.1 Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '1.2', label: '1.2 Apakah tagging Masih Berlaku?' },
        { id: '1.3', label: '1.3 Apakah Kondisi tabung bagus, Tidak retak, Bersih dan tidak corrosive?' },
        { id: '1.4', label: '1.4 Apakah Keempat kaki dalam kondisi lurus (tidak bengkok/deformasi)?' },
        { id: '1.5', label: '1.5 Apakah Tidak ada retakan pada seluruh sambungan las (welding)?' },
        { id: '1.6', label: '1.6 Apakah Bebas dari korosi berat yang dapat mengurangi ketebalan plat?' },
        { id: '1.7', label: '1.7 Apakah Dasar kaki rata dan stabil saat diletakkan di lantai?' }
    ],
    'Mekanisme Pengunci (Ratchet/Pin)': [
        { id: '2.1', label: '2.1 Apakah Gigi pada batang penyangga tajam (tidak tumpul/aus)?' },
        { id: '2.2', label: '2.2 Apakah Tuas pengunci (handle) berfungsi lancar dan kembali ke posisi kunci?' },
        { id: '2.3', label: '2.3 Apakah Pin pengunci (jika ada) dalam kondisi lurus dan memiliki rantai?' },
        { id: '2.4', label: '2.4 Apakah Mekanisme Safety Lock berfungsi otomatis saat dinaikkan?' }
    ],
    'Batang Penyangga & Saddle': [
        { id: '3.1', label: '3.1 Apakah Dudukan atas (saddle) tidak retak atau pecah?' },
        { id: '3.2', label: '3.2 Apakah Batang penyangga tegak lurus (tidak miring saat beban penuh)?' }
    ]
};

const CATEGORY_ORDER = ['Kondisi Visual & Body', 'Mekanisme Pengunci (Ratchet/Pin)', 'Batang Penyangga & Saddle'];

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

export async function generateSidakStandJackPDF(data: StandJackPDFData): Promise<jsPDF> {
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

    // Helper function to draw header on each page (same as Workshop)
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
        pdf.text('PT. GECL – F - HSE - 002 - R0', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        // Main title with gray background
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CHECKLIST INSPEKSI PERALATAN STAND JACK', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi stand jack', pageWidth / 2, yPosition + 8, { align: 'center' });

        yPosition += 12;

        // Header info table (same layout as Workshop)
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

    // Build the table data for all records (each Stand Jack unit)
    const buildTableData = () => {
        const tableRows: any[] = [];

        data.records.forEach((record, recordIndex) => {
            const registerNo = getRegister(record);

            // Unit header row (gray background) — same as Workshop
            tableRows.push({
                isHeader: true,
                data: [
                    { content: `${recordIndex + 1}`, styles: { fontStyle: 'bold', fillColor: [200, 200, 200] } },
                    { content: `STAND JACK – No Register Peralatan : ${registerNo}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [200, 200, 200], halign: 'left' } }
                ]
            });

            // Inspection items per category
            let dueDateShown = false;
            CATEGORY_ORDER.forEach((categoryName, catIndex) => {
                const items = INSPECTION_CATEGORIES[categoryName];

                // Category sub-header row
                tableRows.push({
                    isHeader: true,
                    data: [
                        { content: `${catIndex + 1}`, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
                        { content: categoryName, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'left' } }
                    ]
                });

                items.forEach((item) => {
                    const result = getResult(record, item.id);
                    const tindakLanjut = getTindakLanjutForItem(record, item.id);
                    let dueDate = '';
                    if (result === 'TS' && record.dueDate && !dueDateShown) {
                        dueDate = record.dueDate;
                        dueDateShown = true;
                    }

                    tableRows.push({
                        isHeader: false,
                        data: [item.id, item.label, result, tindakLanjut, dueDate]
                    });
                });
            });
        });

        return tableRows;
    };

    // Helper function to draw inspector signatures section (same as Workshop)
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
                // Signature columns: 2 and 5
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

    // Column headers for the main table (same as Workshop)
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
            // Check if this is a header row (equipment header)
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

export async function downloadSidakStandJackAsJpg(data: StandJackPDFData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakStandJackPDF(data);
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
