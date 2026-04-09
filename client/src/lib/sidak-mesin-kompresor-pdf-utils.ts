import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK MESIN KOMPRESOR INSPECTION PDF GENERATOR
// Document Code: GECL – HSE – ES – F – 3.02 – 77
// Revision: April 2024/R1
// Portrait format
// ============================================

export interface MesinKompresorPDFData {
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

export const MESIN_KOMPRESOR_INSPECTION_ITEMS = [
    // 1. Kondisi Tabung
    { id: "1.1", category: "1. Kondisi Tabung", label: "1.1. Kondisi kepala silinder / tabung" },
    { id: "1.2", category: "1. Kondisi Tabung", label: "1.2. Kondisi tabung (bersih dan tidak berkarat)" },

    // 2. Kondisi Mesin dan Selang
    { id: "2.1", category: "2. Kondisi Mesin dan Selang", label: "2.1. Kondisi pressure gauge (0,5 - 0,9 mpa)" },
    { id: "2.2", category: "2. Kondisi Mesin dan Selang", label: "2.2. Kondisi pressure switch" },
    { id: "2.3", category: "2. Kondisi Mesin dan Selang", label: "2.3. Kondisi safety valve kompresor" },
    { id: "2.4", category: "2. Kondisi Mesin dan Selang", label: "2.4. Kondisi drain cock valve (buang air dalam tabung)" },
    { id: "2.5", category: "2. Kondisi Mesin dan Selang", label: "2.5. Kondisi V - belt normal dan regangan standar" },
    { id: "2.6", category: "2. Kondisi Mesin dan Selang", label: "2.6. Tutup pengaman bagian mesin berputar (guarding) terpasang sempurna" },
    { id: "2.7", category: "2. Kondisi Mesin dan Selang", label: "2.7. Kondisi filter udara" },
    { id: "2.8", category: "2. Kondisi Mesin dan Selang", label: "2.8. Periksa selang - selang dan pipa tidak ada kebocoran" },
    { id: "2.9", category: "2. Kondisi Mesin dan Selang", label: "2.9. Kondisi sambungan - sambungan pipa / selang" },
    { id: "2.10", category: "2. Kondisi Mesin dan Selang", label: "2.10. Kondisi suara mesin normal tidak ada suara tidak biasa" },
    { id: "2.11", category: "2. Kondisi Mesin dan Selang", label: "2.11. Kondisi oli mesin (ganti per 2000 jam)" },
    { id: "2.12", category: "2. Kondisi Mesin dan Selang", label: "2.12. Kondisi baut - baut terpasang kuat" },
    { id: "2.13", category: "2. Kondisi Mesin dan Selang", label: "2.13. Pengaman putaran pulley terpasang" },
    { id: "2.14", category: "2. Kondisi Mesin dan Selang", label: "2.14. Terdapat tanda jelas informasi bahaya angin bertekanan" },
    { id: "2.15", category: "2. Kondisi Mesin dan Selang", label: "2.15. Kondisi sistem autostart (jika engkol manual harus dimodifikasi keselamatan)" },
];

function getResult(record: any, key: string): string {
    if (record.inspectionResults && record.inspectionResults[key]) return record.inspectionResults[key];
    return '';
}

function getTindakLanjutForItem(record: any, itemId: string): string {
    return record.tindakLanjutPerbaikan?.[itemId] || '';
}

export async function generateSidakMesinKompresorPDF(data: MesinKompresorPDFData): Promise<jsPDF> {
    const inspectorData = data.observers || [];

    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);

    let logoImg: HTMLImageElement | null = null;
    try {
        logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load logo'));
            img.src = '/assets/logo-gecl.png';
        });
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
            pdf.text('PT. Golden Energi Cemerlang Lestari', margin, yPosition + 5);
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text('GECL – HSE – ES – F – 3.02 – 77', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CEKLIS INSPEKSI MESIN KOMPRESOR', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi mesin kompresor', pageWidth / 2, yPosition + 8, { align: 'center' });

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
            MESIN_KOMPRESOR_INSPECTION_ITEMS.forEach((item) => {
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
            obs.jabatan || '',
            obs.departemen || '',
            obs.perusahaan,
            ''
        ]);

        autoTable(pdf, {
            startY: yPosition,
            head: [['NAMA INSPEKTOR', 'JABATAN', 'DEPARTEMEN', 'PERUSAHAAN', 'TANDA TANGAN']],
            body: body,
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
                4: { cellWidth: 30 }
            },
            didDrawCell: (cellData) => {
                if (cellData.column.index === 4 && cellData.section === 'body') {
                    const observer = inspectorData[cellData.row.index];
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
    const tableHeaders = [['NO', 'DESKRIPSI PEMERIKSAAN', 'S', 'TS', 'TINDAK LANJUT PERBAIKAN', 'TARGET']];

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

export async function downloadSidakMesinKompresorAsJpg(data: MesinKompresorPDFData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakMesinKompresorPDF(data);
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
