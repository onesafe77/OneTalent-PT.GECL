import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK APAR INSPECTION PDF GENERATOR
// Document Code: BIB – HSE – ES – F – 3.02 – 87
// Revision: April 2025/R0
// Portrait format
// ============================================

export interface AparPDFData {
    session: {
        tanggal: string;
        namaWorkshop?: string;
        lokasi: string;
        shift: string;
        penanggungJawabArea?: string;
        activityPhotos?: string[];
        id: string;
    };
    records: Array<{
        noRegister?: string;
        noRegisterPeralatan?: string;
        inspectionResults?: Record<string, string>;
        tindakLanjut?: Record<string, string> | string;
        tindakLanjutPerbaikan?: Record<string, string> | string;
        dueDate?: string | null;
        keterangan?: string | null;
    }>;
    observers: Array<{
        nama: string;
        perusahaan: string;
        tandaTangan: string;
    }>;
}

// Inspection items matching the official GECL APAR template
const INSPECTION_ITEMS = [
    { id: "1.1", label: "1.1. Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
    { id: "1.2", label: "1.2. Apakah tagging Masih Berlaku?" },
    { id: "1.3", label: "1.3. Apakah Kondisi tabung bagus, Tidak retak, Bersih dan tidak corrosive?" },
    { id: "1.4", label: "1.4. Apakah selang ada, Kondisinya normal, tidak putus dan tidak tersumbat?" },
    { id: "1.5", label: "1.5. Apakah pin pengunci ada?" },
    { id: "1.6", label: "1.6. Apakah kondisi handle normal dan tidak corrosive?" },
    { id: "1.7", label: "1.7. Apakah jarum penunjuk tekanan pressure dalam kondisi normal?" },
    { id: "1.8", label: "1.8. Tekanan gas sesuai, Tidak low atau over pressure?" },
    { id: "1.9", label: "1.9. Apakah bracket penahan APAR dalam kondisi bagus?" },
    { id: "1.10", label: "1.10. Apakah ada tanda stiker APAR?" },
    { id: "1.11", label: "1.11. Apakah APAR tidak terhalang benda-benda lain?" }
];

// Helper to get inspection result from a record
function getResult(record: any, key: string): string {
    if (record.inspectionResults && record.inspectionResults[key]) return record.inspectionResults[key];
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
    return tl[itemId] || '';
}

export async function generateSidakAparPDF(data: AparPDFData): Promise<jsPDF> {
    const inspectorData = data.observers || [];

    const pdf = new jsPDF('portrait', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);

    let logoImg: HTMLImageElement | string | null = null;
    try {
        logoImg = await loadGeclLogo();
    } catch (error) {
        console.error('Logo loading failed:', error);
    }

    const drawHeader = (yStart: number): number => {
        let yPosition = yStart;

        if (logoImg) {
            pdf.addImage(logoImg, 'PNG', margin, yPosition, 40, 9);
        } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 139);
            pdf.text('PT. GECL', margin, yPosition + 5);
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text('BIB – HSE – ES – F – 3.02 – 87', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        pdf.setFillColor(255, 200, 200);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CHECKLIST INSPEKSI APAR', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi Fire Extinguisher (APAR)', pageWidth / 2, yPosition + 8, { align: 'center' });

        yPosition += 12;

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
                0: { cellWidth: 30, fillColor: [255, 240, 240], fontStyle: 'bold' },
                1: { cellWidth: availableWidth / 2 - 30 },
                2: { cellWidth: 40, fillColor: [255, 240, 240], fontStyle: 'bold' },
                3: { cellWidth: availableWidth / 2 - 40 },
            },
            margin: { left: margin, right: margin },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 2;

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(6.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan. Pemeriksaan harus dilakukan permasing-masing peralatan', margin, yPosition + 2);

        return yPosition + 5;
    };

    const buildTableData = () => {
        const tableRows: any[] = [];

        data.records.forEach((record, recordIndex) => {
            const registerNo = getRegister(record);

            tableRows.push({
                isHeader: true,
                data: [
                    { content: `${recordIndex + 1}`, styles: { fontStyle: 'bold', fillColor: [255, 220, 220] } },
                    { content: `APAR – No Register Peralatan : ${registerNo}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [255, 220, 220], halign: 'left' } }
                ]
            });

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

    const drawInspectorSignatures = (yStart: number): number => {
        let yPosition = yStart;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('Inspektur:', margin, yPosition);
        yPosition += 3;

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
                fillColor: [255, 230, 230],
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

    const allTableData = buildTableData();
    const flattenedRows: any[] = [];
    allTableData.forEach(row => {
        flattenedRows.push(row.data);
    });

    let yPosition = drawHeader(margin);
    const tableHeaders = [['No', 'Deskripsi Pemeriksaan', 'Kesesuaian', 'Tindak Lanjut Perbaikan', 'Due Date']];

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
            fillColor: [255, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            minCellHeight: 6,
        },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 80, halign: 'left' },
            2: { cellWidth: 20 },
            3: { cellWidth: 50, halign: 'left' },
            4: { cellWidth: 28 },
        },
        margin: { left: margin, right: margin, bottom: 15 },
        showHead: 'everyPage',
        willDrawCell: (hookData) => {
            const rowData = hookData.row.raw;
            if (Array.isArray(rowData) && rowData.length > 0) {
                const firstCell = rowData[0];
                if (typeof firstCell === 'object' && firstCell !== null && 'styles' in firstCell) {
                    hookData.cell.styles.fillColor = [255, 220, 220];
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    const finalTableY = (pdf as any).lastAutoTable.finalY;
    const remainingSpace = pageHeight - finalTableY - 15;
    if (remainingSpace < 30) {
        pdf.addPage();
        drawInspectorSignatures(margin + 5);
    } else {
        drawInspectorSignatures(finalTableY + 5);
    }

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

export async function downloadSidakAparAsJpg(data: AparPDFData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakAparPDF(data);
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
