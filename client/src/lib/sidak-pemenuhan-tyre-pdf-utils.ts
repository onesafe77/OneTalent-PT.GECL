import { jsPDF } from 'jspdf';
import { loadBibLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK PEMENUHAN TYRE PDF GENERATOR
// Document Code: BIB – CLR – SKR – F – 014 – 01
// Revision: Jun 2025/R0
// Portrait format (A4, 2 halaman via page-break otomatis)
// ============================================

export const PEMENUHAN_TYRE_ITEMS: { no: number; label: string }[] = [
    { no: 1, label: "Apakah ban yang digunakan merupakan ban radial dengan konstruksi kawat baja?" },
    { no: 2, label: "Apakah informasi pada ban (nomenklatur) lengkap, meliputi:\na. Nama merek\nb. Kode spesifikasi\nc. Pola tapak\nd. Nomor seri\ne. Ukuran ban\nf. Minggu dan tahun produksi" },
    { no: 3, label: "Apakah pola tapak ban bertipe Lug dan/atau Block (off-road)?" },
    { no: 4, label: "Apakah jumlah lapisan ban minimal 18 lapis?" },
    { no: 5, label: "Apakah usia ban kurang dari 3 tahun sejak tanggal produksi?" },
    { no: 6, label: "Apakah selendang ban memiliki lebar 21–23 cm dan ban dalam 31 cm? (Khusus untuk tyre yang menggunakan ban dalam)" },
    { no: 7, label: "Apakah tekanan angin ban sesuai standar (lihat rekomendasi berdasarkan ukuran dan posisi axle)?" },
    { no: 8, label: "Apakah tinggi kembang ban lebih dari atau sama dengan 5 mm?" },
    { no: 9, label: "Apakah ukuran dan jumlah lapisan ban seragam pada satu unit?" },
    { no: 10, label: "Apakah tidak ada benda asing terselip antar ban?" },
    { no: 11, label: "Apakah tidak ada luka/cut lebih dari 5 cm pada telapak atau sisi ban?" },
    { no: 12, label: "Apakah tidak terdapat ban yang kembung?" },
    { no: 13, label: "Apakah tidak ada benda yang tertancap pada ban?" },
    { no: 14, label: "Apakah suhu ban masih dalam batas aman (dapat disentuh tangan)?" },
    { no: 15, label: "Apakah rim/velg bebas dari retakan?" },
    { no: 16, label: "Apakah semua baut roda terpasang dengan baik dan tidak rusak?" },
    { no: 17, label: "Apakah penggunaan ban bias sudah mendapatkan izin resmi dari KTT PT BIB?" },
    { no: 18, label: "Jika poin 18 dipenuhi, Apakah ban bias hanya dipasang pada posisi axle sesuai yang direkomendasikan dalam SKR?" },
    { no: 19, label: "Apakah workshop ban tersedia di sepanjang jalur hauling?" },
    { no: 20, label: "Apakah light truck tersedia untuk menyimpan dan mendistribusikan ban?" },
    { no: 21, label: "Apakah seluruh peralatan kerja yang dibutuhkan tersedia dan berfungsi? (misalnya compressor, dongkrak, tyre cage, inflator, dll – total 26 item)" },
    { no: 22, label: "Apakah seluruh tenaga kerja memiliki kompetensi sesuai tugasnya (Tyreman, Repairman, Admin, Foreman)?" },
    { no: 23, label: "Apakah jumlah pekerja sesuai kebutuhan setiap shift?\na. Shift 1 = 8 orang\nb. Shift 2 = 3 orang" },
    { no: 24, label: "Apakah workshop menyediakan layanan pemeriksaan, pengisian, perbaikan, dan rotasi ban?" },
    { no: 25, label: "Apakah ban disimpan di tempat indoor, kering, bebas cahaya matahari dan bahan kimia?" },
    { no: 26, label: "Apakah sistem rotasi penyimpanan ban menggunakan metode FIFO?" },
    { no: 27, label: "Apakah ban dikelompokkan sesuai ukuran/jenis dan disimpan dalam posisi berdiri?" },
    { no: 28, label: "Apakah tidak dilakukan metode vulkanisir pada ban yang sudah aus/scrap?" },
    { no: 29, label: "Apakah ban dalam yang ditambal (repair) telah diinspeksi dan dipastikan layak oleh pengawas tyre sesuai dengan SOP permasing-masing mitra?" },
];

export interface SidakPemenuhanTyreData {
    session: any;
    record: any | null;
    observers: any[];
}

function getResult(record: any, no: number): string {
    const val = record?.inspectionResults?.[String(no)];
    return val === 'S' || val === 'TS' ? val : '';
}

function getTindakLanjut(record: any, no: number): string {
    const tindakLanjut = record?.tindakLanjutPerbaikan?.[String(no)] || '';
    const dueDate = record?.dueDates?.[String(no)] || '';
    let text = tindakLanjut;
    if (dueDate) {
        text = text ? `${text}\nDue: ${dueDate}` : `Due: ${dueDate}`;
    }
    return text;
}

export async function generateSidakPemenuhanTyrePdf(data: SidakPemenuhanTyreData): Promise<jsPDF> {
    const observers = data.observers || [];
    const record = data.record || null;
    const session = data.session || {};

    const pdf = new jsPDF('portrait', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);

    // Kop form asli BIB-CLR-SKR-F-014-01 memakai logo PT Borneo Indobara (bukan GECL)
    let logoImg: HTMLImageElement | string | null = null;
    try {
        logoImg = await loadBibLogo();
    } catch (error) {
        console.error('Logo loading failed:', error);
    }

    let yPosition = margin;

    // ===== Kop =====
    if (logoImg) {
        // rasio logo BIB asli 681x145 ≈ 4.7:1
        pdf.addImage(logoImg, 'PNG', margin, yPosition, 42, 9);
    } else {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text('PT BORNEO INDOBARA', margin, yPosition + 5);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    pdf.text('BIB – CLR – SKR – F – 014 – 01', pageWidth - margin, yPosition + 5, { align: 'right' });

    yPosition += 12;

    // ===== Judul =====
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, yPosition, availableWidth, 13, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    const titleLines = pdf.splitTextToSize(
        'CHECKLIST INSPEKSI PEMENUHAN STANDAR TYRE MANAGEMENT MITRA KERJA HAULING',
        availableWidth - 4
    );
    pdf.text(titleLines, pageWidth / 2, yPosition + 4.5, { align: 'center' });
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.text(
        'Formulir ini digunakan untuk pencatatan hasil inspeksi pemenuhan Standar Tyre Management Mitra Kerja Hauling (sampel 5 unit random)',
        pageWidth / 2,
        yPosition + 11,
        { align: 'center' }
    );

    yPosition += 15;

    // ===== Grid header 2 kolom =====
    const infoData = [
        ['Tanggal', session.tanggal || '', 'Nama Perusahaan', session.namaPerusahaan || ''],
        ['Lokasi', session.lokasi || '', 'Nama Pengawas', session.namaPengawas || '']
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

    yPosition = (pdf as any).lastAutoTable.finalY + 3;

    // ===== Sampel Nomor Lambung DT =====
    const sampel: string[] = Array.isArray(session.sampelNomorLambung) ? session.sampelNomorLambung : [];
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text('Sampel Nomor Lambung DT:', margin, yPosition + 2);
    pdf.setFont('helvetica', 'normal');
    const sampelText = sampel
        .filter(s => (s || '').trim().length > 0)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('      ');
    const sampelLines = pdf.splitTextToSize(sampelText || '-', availableWidth - 42);
    pdf.text(sampelLines, margin + 40, yPosition + 2);
    yPosition += 2 + (sampelLines.length * 3.2);

    // ===== Baris petunjuk =====
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6.5);
    pdf.text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan', margin, yPosition + 2);
    yPosition += 5;

    // ===== Tabel checklist =====
    const tableBody = PEMENUHAN_TYRE_ITEMS.map(item => [
        String(item.no),
        item.label,
        getResult(record, item.no),
        getTindakLanjut(record, item.no),
    ]);

    const deskripsiWidth = availableWidth - 10 - 25 - 45;

    autoTable(pdf, {
        startY: yPosition,
        head: [['NO', 'DESKRIPSI PEMERIKSAAN', 'KESESUAIAN', 'TINDAK LANJUT\nDUE DATE PERBAIKAN']],
        body: tableBody,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 7,
            cellPadding: 1,
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
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: deskripsiWidth, halign: 'left' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 45, halign: 'left' },
        },
        margin: { left: margin, right: margin, bottom: 15 },
        showHead: 'everyPage',
    });

    // ===== Tabel tanda tangan inspektor =====
    const drawInspectorSignatures = (yStart: number): number => {
        const body = observers.map(obs => [
            obs.nama || '',
            obs.perusahaan || '',
            ''
        ]);

        autoTable(pdf, {
            startY: yStart,
            head: [['NAMA INSPEKTOR', 'PERUSAHAAN', 'TANDA TANGAN']],
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
                2: { cellWidth: 40 }
            },
            didDrawCell: (cellData) => {
                if (cellData.column.index === 2 && cellData.section === 'body') {
                    const observer = observers[cellData.row.index];
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

    const finalTableY = (pdf as any).lastAutoTable.finalY;
    const remainingSpace = pageHeight - finalTableY - 15;
    if (remainingSpace < 40) {
        pdf.addPage();
        drawInspectorSignatures(margin + 5);
    } else {
        drawInspectorSignatures(finalTableY + 5);
    }

    // ===== Footer tiap halaman =====
    const actualTotalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= actualTotalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Jun 2025/R0', margin, pageHeight - 5);
        pdf.text(`Page ${i} of ${actualTotalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    return pdf;
}

export async function downloadSidakPemenuhanTyreAsJpg(data: SidakPemenuhanTyreData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakPemenuhanTyrePdf(data);
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
