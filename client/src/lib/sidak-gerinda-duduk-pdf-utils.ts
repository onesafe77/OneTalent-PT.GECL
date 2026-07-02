import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK GERINDA DUDUK INSPECTION PDF GENERATOR
// Document Code: GECL – HSE – ES – F – 3.02 – 76
// Revision: April 2024/R1
// Portrait format
// ============================================

export interface GerindaDudukPDFData {
    session: {
        tanggal: string;
        namaObjekInspeksi?: string;
        lokasi: string;
        shift: string;
        waktu?: string;
        penanggungJawab?: string;
        activityPhotos?: string[];
    };
    records: Array<{
        namaObjek?: string;
        inspectionResults: Record<string, string>;
        tindakLanjutPerbaikan: Record<string, string>;
        dueDate?: string | null;
        keterangan?: string | null;
    }>;
    observers: Array<{
        nama: string;
        jabatan?: string;
        departemen?: string;
        perusahaan: string;
        tandaTangan: string;
    }>;
}

export const GERINDA_DUDUK_INSPECTION_ITEMS = [
    // 1. Mesin Gerinda
    { id: "1.1", category: "1 Mesin Gerinda", label: "1.1. Pegangan Pengangkat (Handle Lever)" },
    { id: "1.2", category: "1 Mesin Gerinda", label: "1.2. Tutup Dinamis (Cover Dynamic)" },
    { id: "1.3", category: "1 Mesin Gerinda", label: "1.3. Tutup Statis (Cover Static)" },
    { id: "1.4", category: "1 Mesin Gerinda", label: "1.4. Batu Gerinda (Cutting Disc)" },
    { id: "1.5", category: "1 Mesin Gerinda", label: "1.5. Pengukur potongan (Adjustment Cutting)" },
    { id: "1.6", category: "1 Mesin Gerinda", label: "1.6. Pelindung Percikan (Plate Sparks)" },
    { id: "1.7", category: "1 Mesin Gerinda", label: "1.7. Dudukan (Based Cutting)" },
    { id: "1.8", category: "1 Mesin Gerinda", label: "1.8. Stang Pengunci (Stopper)" },
    { id: "1.9", category: "1 Mesin Gerinda", label: "1.9. Pengunci Ulir (Lock Stopper)" },
    { id: "1.10", category: "1 Mesin Gerinda", label: "1.10. Lengan Ulir Pencekam (Shaft Stopper)" },
    { id: "1.11", category: "1 Mesin Gerinda", label: "1.11. Pengunci Batu Gerinda (Lock of Cutting Disc)" },
    { id: "1.12", category: "1 Mesin Gerinda", label: "1.12. Penggerak Mesin (Motor Dynamo)" },
    { id: "1.13", category: "1 Mesin Gerinda", label: "1.13. Pembatas kedalaman potong (Cutting Depth)" },
    { id: "1.14", category: "1 Mesin Gerinda", label: "1.14. Karet dudukan (Based Rubber)" },

    // 2. Sistem Kelistrikan
    { id: "2.1", category: "2 Sistem Kelistrikan", label: "2.1. Tombol On Off (Switch On Off)" },
    { id: "2.2", category: "2 Sistem Kelistrikan", label: "2.2. Kabel power (Cable Power)" },
    { id: "2.3", category: "2 Sistem Kelistrikan", label: "2.3. Kondisi steker listrik" },
];

function getResult(record: any, key: string): string {
    if (record.inspectionResults && record.inspectionResults[key]) return record.inspectionResults[key];
    return '';
}

function getTindakLanjutForItem(record: any, itemId: string): string {
    const result = getResult(record, itemId);
    if (result !== 'TS') return '';
    return record.tindakLanjutPerbaikan?.[itemId] || '';
}

export async function generateSidakGerindaDudukPDF(data: GerindaDudukPDFData): Promise<jsPDF> {
    const inspectorData = data.observers || [];

    const pdf = new jsPDF('portrait', 'mm', 'a4');
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
            // Logo is 32mm wide, margin is 10mm. Right edge is at 42mm.
            // Putting text at 43mm gives a 1mm gap.
            pdf.addImage(logoImg, 'PNG', margin, yPosition, 32, 7);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 139);
            pdf.text('PT. GOLDEN ENERGI CEMERLANG LESTARI', margin + 33, yPosition + 5.5);
        } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 139);
            pdf.text('PT. GOLDEN ENERGI CEMERLANG LESTARI', margin, yPosition + 6);
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text('GECL – HSE – ES – F – 3.02 – 76', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CEKLIS INSPEKSI GERINDA DUDUK', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi gerinda duduk', pageWidth / 2, yPosition + 8, { align: 'center' });

        yPosition += 12;

        const infoData = [
            ['Tanggal', data.session.tanggal || '', 'Nama Objek Inspeksi', data.session.namaObjekInspeksi || ''],
            ['Lokasi', data.session.lokasi || '', 'Penanggung Jawab', data.session.penanggungJawab || '']
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
                1: { cellWidth: (availableWidth / 2) - 30 },
                2: { cellWidth: 40, fillColor: [240, 240, 240], fontStyle: 'bold' },
                3: { cellWidth: (availableWidth / 2) - 40 },
            },
            margin: { left: margin, right: margin },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 2;

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(6.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan', margin, yPosition + 2);

        return yPosition + 5;
    };

    const buildTableData = () => {
        const tableRows: any[] = [];
        let currentCategory = "";

        data.records.forEach((record) => {
            GERINDA_DUDUK_INSPECTION_ITEMS.forEach((item) => {
                if (item.category !== currentCategory) {
                    currentCategory = item.category;
                    tableRows.push({
                        isHeader: true,
                        data: [
                            { content: '', styles: { fillColor: [230, 230, 230] } },
                            { content: currentCategory, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], halign: 'left' } }
                        ]
                    });
                }

                const result = getResult(record, item.id);
                const tindakLanjut = getTindakLanjutForItem(record, item.id);
                const dueDate = record.dueDate || '';

                tableRows.push({
                    isHeader: false,
                    data: [
                        item.id,
                        item.label,
                        result === 'S' ? 'S' : '',
                        result === 'TS' ? 'TS' : '',
                        tindakLanjut,
                        result === 'TS' ? dueDate : ''
                    ]
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

        const body = inspectorData.map(obs => [
            obs.nama,
            '',
            '',
            obs.perusahaan,
            ''
        ]);

        autoTable(pdf, {
            startY: yPosition,
            head: [['NAMA INSPEKTOR', 'PERUSAHAAN', 'TANDA TANGAN', 'NAMA INSPEKTOR', 'PERUSAHAAN', 'TANDA TANGAN']],
            body: [
                [
                    inspectorData[0]?.nama || '', inspectorData[0]?.perusahaan || '', '',
                    inspectorData[1]?.nama || '', inspectorData[1]?.perusahaan || '', ''
                ]
            ],
            theme: 'grid',
            tableWidth: availableWidth,
            styles: {
                fontSize: 7,
                cellPadding: 1.5,
                valign: 'middle',
                minCellHeight: 12,
                lineWidth: 0.15,
                lineColor: [0, 0, 0],
                halign: 'center'
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
            },
            columnStyles: {
                2: { cellWidth: 30 },
                5: { cellWidth: 30 }
            },
            didDrawCell: (cellData) => {
                const signatureIndices = [2, 5];
                if (signatureIndices.includes(cellData.column.index) && cellData.section === 'body') {
                    const observerIndex = cellData.column.index === 2 ? 0 : 1;
                    const observer = inspectorData[observerIndex];
                    if (observer?.tandaTangan) {
                        try {
                            const format = observer.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                            pdf.addImage(
                                observer.tandaTangan,
                                format,
                                cellData.cell.x + 2,
                                cellData.cell.y + 1,
                                cellData.cell.width - 4,
                                cellData.cell.height - 2,
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
    const tableHeaders = [['No', 'Deskripsi Pemeriksaan', 'S', 'TS', 'Tindak Lanjut Perbaikan', 'Due Date']];

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: flattenedRows,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 7,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            minCellHeight: 4,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 85, halign: 'left' },
            2: { cellWidth: 8 },
            3: { cellWidth: 8 },
            4: { cellWidth: 59, halign: 'left' },
            5: { cellWidth: 20 },
        },
        margin: { left: margin, right: margin, bottom: 15 },
        showHead: 'everyPage',
    });

    const finalTableY = (pdf as any).lastAutoTable.finalY;
    const remainingSpace = pageHeight - finalTableY - 15;
    if (remainingSpace < 40) {
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
        pdf.text('April 2024/R1', margin, pageHeight - 5);
        pdf.text(`Page ${i} of ${actualTotalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    return pdf;
}

export async function downloadSidakGerindaDudukAsJpg(data: GerindaDudukPDFData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakGerindaDudukPDF(data);
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
