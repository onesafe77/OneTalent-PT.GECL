import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK FUEL STORAGE INSPECTION PDF GENERATOR
// Document Code: GECL – HSE – ES – F – 3.02 – 78
// Revision: April 2024/R1
// Portrait format
// ============================================

export interface FuelStoragePDFData {
    session: {
        tanggal: string;
        namaWorkshop?: string;
        lokasi: string;
        subLokasi?: string;
        shift: string;
        penanggungJawabArea?: string;
        activityPhotos?: string[];
    };
    records: Array<{
        storageName?: string;
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

export const FUEL_STORAGE_INSPECTION_ITEMS = [
    // 1. HOUSEKEEPING
    { id: "1.1", category: "1. HOUSEKEEPING", label: "1.1 Apakah area kerja dalam keadaan rapi dan teratur?" },
    { id: "1.2", category: "1. HOUSEKEEPING", label: "1.2 Apakah lantai kerja dalam keadaan bersih & bebas dari benda-benda yang tidak diperlukan?" },
    { id: "1.3", category: "1. HOUSEKEEPING", label: "1.3 Apakah kondisi lantai kerja tidak rusak?" },
    { id: "1.4", category: "1. HOUSEKEEPING", label: "1.4 Apakah jalur jalan diberi tanda/cat/demarkasi jelas?" },
    { id: "1.5", category: "1. HOUSEKEEPING", label: "1.5 Apakah jalur jalan dan lintasan bebas dari hambatan?" },
    { id: "1.6", category: "1. HOUSEKEEPING", label: "1.6 Apakah penerangan termasuk lampu dan bola lampu ada dalam keadaan yang bersih dan berfungsi?" },
    { id: "1.7", category: "1. HOUSEKEEPING", label: "1.7 Apakah permukaan halaman tidak bergelombang & tidak becek?" },
    { id: "1.8", category: "1. HOUSEKEEPING", label: "1.8 Apakah halaman bersih dari sampah?" },
    { id: "1.9", category: "1. HOUSEKEEPING", label: "1.9 Apakah drainase berfungsi dengan baik?" },

    // 2. EMERGENCY EQUIPMENT
    { id: "2.1.1", category: "2. EMERGENCY EQUIPMENT - APAR & HYDRANT", label: "2.1.1 Apakah APAR mencukupi & terdapat tanda (marking)?" },
    { id: "2.1.2", category: "2. EMERGENCY EQUIPMENT - APAR & HYDRANT", label: "2.1.2 Apakah kondisi tabung APAR dalam kondisi layak?" },
    { id: "2.1.3", category: "2. EMERGENCY EQUIPMENT - APAR & HYDRANT", label: "2.1.3 Apakah akses ke alat pemadam tidak terhalang?" },
    { id: "2.1.4", category: "2. EMERGENCY EQUIPMENT - APAR & HYDRANT", label: "2.1.4 Apakah APAR diinspeksi secara rutin dan terdapat tag?" },
    { id: "2.1.5", category: "2. EMERGENCY EQUIPMENT - APAR & HYDRANT", label: "2.1.5 Apakah hydrant untuk kebakaran (bila ada) dan perlengkapannya dalam keadaan baik?" },

    { id: "2.2.1", category: "2. EMERGENCY EQUIPMENT - EYEWASH", label: "2.2.1 Apakah eyewash dalam kondisi bersih?" },
    { id: "2.2.2", category: "2. EMERGENCY EQUIPMENT - EYEWASH", label: "2.2.2 Apakah eyewash dilakukan inspeksi secara teratur dan terdapat tag yang diisi sesuai?" },
    { id: "2.2.3", category: "2. EMERGENCY EQUIPMENT - EYEWASH", label: "2.2.3 Apakah eyewash berfungsi dengan baik?" },
    { id: "2.2.4", category: "2. EMERGENCY EQUIPMENT - EYEWASH", label: "2.2.4 Apakah akses ke tempat pencucian mata tidak terhalangi?" },

    { id: "2.3.1", category: "2. EMERGENCY EQUIPMENT - ASSEMBLY POINT", label: "2.3.1 Apakah ada peta/layout area berkumpul darurat?" },
    { id: "2.3.2", category: "2. EMERGENCY EQUIPMENT - ASSEMBLY POINT", label: "2.3.2 Apakah area berkumpul darurat diberi rambu “Assembly Point”?" },
    { id: "2.3.3", category: "2. EMERGENCY EQUIPMENT - ASSEMBLY POINT", label: "2.3.3 Apakah terdapat emergency spill kit yang memadai?" },
    { id: "2.3.4", category: "2. EMERGENCY EQUIPMENT - ASSEMBLY POINT", label: "2.3.4 Apakah terdapat kotak P3K sesuai dengan ketentuan?" },

    // 3. PERALATAN DAN FASILITAS
    { id: "3.1", category: "3. PERALATAN DAN FASILITAS", label: "3.1 Apakah pewarnaan pipa sesuai dengan standar kode warna?" },
    { id: "3.2", category: "3. PERALATAN DAN FASILITAS", label: "3.2 Apakah pipa saluran bahan bakar terbuat dari bahan yang tahan api?" },
    { id: "3.3", category: "3. PERALATAN DAN FASILITAS", label: "3.3 Apakah tangki penyimpanan terbuat dari bahan yang tahan api?" },
    { id: "3.4", category: "3. PERALATAN DAN FASILITAS", label: "3.4 Apakah tangki penyimpanan berdiri kokoh tidak miring dan stabil pada pondasi?" },
    { id: "3.5", category: "3. PERALATAN DAN FASILITAS", label: "3.5 Apakah tangki penyimpanan tidak bocor atau tidak ada rembesan?" },
    { id: "3.6", category: "3. PERALATAN DAN FASILITAS", label: "3.6 Apakah terdapat ventilasi pembuangan gas/angin diatas tangki?" },
    { id: "3.7", category: "3. PERALATAN DAN FASILITAS", label: "3.7 Apakah terdapat drainase tempat pembuangan apabila ada kebocoran dan bermuara pada oil trap?" },
    { id: "3.8", category: "3. PERALATAN DAN FASILITAS", label: "3.8 Apakah pompa fuel berada diluar pagar dan kondisi baik?" },
    { id: "3.9", category: "3. PERALATAN DAN FASILITAS", label: "3.9 Apakah tanggul dalam kondisi baik/tidak retak?" },
    { id: "3.10", category: "3. PERALATAN DAN FASILITAS", label: "3.10 Apakah tanggul mampu menampung (110% volume total) jika tangki mengalami kebocoran?" },
    { id: "3.11", category: "3. PERALATAN DAN FASILITAS", label: "3.11 Apakah terdapat kran pembuangan yang di hubungkan dengan oil trap?" },
    { id: "3.12", category: "3. PERALATAN DAN FASILITAS", label: "3.12 Apakah terdapat pagar pengaman yang layak?" },
    { id: "3.13", category: "3. PERALATAN DAN FASILITAS", label: "3.13 Apakah ada pintu pagar yang dapat dikunci?" },
    { id: "3.14", category: "3. PERALATAN DAN FASILITAS", label: "3.14 Apakah penangkal petir dalam kondisi baik dan berfungsi?" },
    { id: "3.15", category: "3. PERALATAN DAN FASILITAS", label: "3.15 Apakah terdapat oil trap yang berfungsi dengan baik dan dilakukan pembersihan secara berkala?" },
    { id: "3.16", category: "3. PERALATAN DAN FASILITAS", label: "3.16 Apakah tangki memiliki handrail (susur tangga) dan berfungsi dengan baik?" },
    { id: "3.17", category: "3. PERALATAN DAN FASILITAS", label: "3.17 Apakah pijakan tangga dalam kondisi baik?" },
    { id: "3.18", category: "3. PERALATAN DAN FASILITAS", label: "3.18 Apakah handrail dan pijakan tangga memiliki pewarnaan sesuai standar?" },
    { id: "3.19", category: "3. PERALATAN DAN FASILITAS", label: "3.19 Apakah peralatan yang digunakan telah dikalibrasi/disertifikasi? (Jika ada peralatan yang wajib dilakukan kalibrasi/disertifikasi)" },
    { id: "3.20", category: "3. PERALATAN DAN FASILITAS", label: "3.20 Apakah penyalur petir mencakup luasan area yang dilindungi?" },
    { id: "3.21", category: "3. PERALATAN DAN FASILITAS", label: "3.21 Apakah tangki penyimpanan terdapat tanda kapasitas isi dan jenisnya?" },
    { id: "3.22", category: "3. PERALATAN DAN FASILITAS", label: "3.22 Apakah semua selang pucuk pengisian dalam kondisi baik?" },
    { id: "3.23", category: "3. PERALATAN DAN FASILITAS", label: "3.23 Apakah terdapat penghalang tabrakan di sekitar area pengisian?" },
    { id: "3.24", category: "3. PERALATAN DAN FASILITAS", label: "3.24 Apakah terdapat penampung tetesan?" },
    { id: "3.25", category: "3. PERALATAN DAN FASILITAS", label: "3.25 Apakah terdapat tongkat untuk mengukur kedalaman?" },
    { id: "3.26", category: "3. PERALATAN DAN FASILITAS", label: "3.26 Apakah terdapat MSDS yang terpelihara dengan baik?" },
    { id: "3.27", category: "3. PERALATAN DAN FASILITAS", label: "3.27 Apakah kompartemen oil trap dalam kondisi bersih?" },
    { id: "3.28", category: "3. PERALATAN DAN FASILITAS", label: "3.28 Apakah unit yang dioperasikan sudah dilakukan P2H?" },
    { id: "3.29", category: "3. PERALATAN DAN FASILITAS", label: "3.29 Apakah pipa dalam kondisi baik?" },
    { id: "3.30", category: "3. PERALATAN DAN FASILITAS", label: "3.30 Apakah terdapat ganjal tyre yang dapat digunakan?" },

    // 4. PROSEDUR KERJA AMAN
    { id: "4.1", category: "4. PROSEDUR KERJA AMAN", label: "4.1 Apakah terdapat prosedur di area kerja?" },
    { id: "4.2", category: "4. PROSEDUR KERJA AMAN", label: "4.2 Apakah terdapat prosedur kerja untuk menjalankan aktivitas?" },
    { id: "4.3", category: "4. PROSEDUR KERJA AMAN", label: "4.3 Apakah prosedur kerja dapat diterapkan dilapangan?" },

    // 5. RAMBU-RAMBU
    { id: "5.1", category: "5. RAMBU-RAMBU", label: "5.1 Apakah ada rambu pemakaian “APD Standard”?" },
    { id: "5.2", category: "5. RAMBU-RAMBU", label: "5.2 Apakah ada rambu “Dilarang Merokok” untuk area yang berpotensi terjadi kebakaran dan tidak ditemukan puntung rokok?" },
    { id: "5.3", category: "5. RAMBU-RAMBU", label: "5.3 Apakah terdapat rambu lalu lintas yang memadai?" },
    { id: "5.4", category: "5. RAMBU-RAMBU", label: "5.4 Apakah ada tanda/jalur keluar darurat?" },
    { id: "5.5", category: "5. RAMBU-RAMBU", label: "5.5 Apakah terdapat rambu parkir kendaraan/unit?" },

    // 6. PENGELOLAAN SAMPAH DAN HIDROKARBON
    { id: "6.1", category: "6. PENGELOLAAN SAMPAH DAN HIDROKARBON", label: "6.1 Apakah terdapat ceceran hidrokarbon di tanah?" },
    { id: "6.2", category: "6. PENGELOLAAN SAMPAH DAN HIDROKARBON", label: "6.2 Apakah tersedia tempat sampah/limbah dan penampungan tumpahan oli?" },
    { id: "6.3", category: "6. PENGELOLAAN SAMPAH DAN HIDROKARBON", label: "6.3 Apakah tempat pembuangan sampah/limbah sudah diberi nama dan tanda yang benar dan cukup?" },

    // 7. PERLENGKAPAN UNTUK PERSONIL
    { id: "7.1", category: "7. PERLENGKAPAN UNTUK PERSONIL", label: "7.1 Apakah semua personil menggunakan APD yang sesuai?" },
    { id: "7.2", category: "7. PERLENGKAPAN UNTUK PERSONIL", label: "7.2 Apakah semua personil membawa kartu ID (Simper/Permit) yang masih berlaku?" },
    { id: "7.3", category: "7. PERLENGKAPAN UNTUK PERSONIL", label: "7.3 Apakah terdapat tindakan tidak aman?" },
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

export async function generateSidakFuelStoragePDF(data: FuelStoragePDFData): Promise<jsPDF> {
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
        pdf.text('GECL – HSE – ES – F – 3.02 – 78', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CHECKLIST INSPEKSI FUEL STORAGE', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi fuel storage', pageWidth / 2, yPosition + 8, { align: 'center' });

        yPosition += 12;

        const infoData = [
            ['Tanggal', data.session.tanggal || '', 'Sub Lokasi', data.session.subLokasi || ''],
            ['Lokasi', data.session.lokasi || '', 'Penanggung Jawab Area', data.session.penanggungJawabArea || '']
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
            FUEL_STORAGE_INSPECTION_ITEMS.forEach((item) => {
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
        willDrawCell: (hookData) => {
            const rowData = hookData.row.raw;
            if (Array.isArray(rowData) && rowData.length > 1) {
                const cell = rowData[1];
                if (cell && typeof cell === 'object' && 'content' in cell) {
                    const content = (cell as any).content;
                    if (content && content.toString().match(/^\d\./)) {
                        // This is a category header
                    }
                }
            }
        },
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

export async function downloadSidakFuelStorageAsJpg(data: FuelStoragePDFData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakFuelStoragePDF(data);
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
