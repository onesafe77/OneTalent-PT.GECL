import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type {
    SidakIntercomSession,
    SidakIntercomRecord,
    SidakIntercomObserver
} from '@shared/schema';

// ============================================
// SIDAK INTERCOM PDF GENERATOR
// Form: GECL – HSE – ES – F – 3.02 – 101 (Example)
// ============================================

interface SidakIntercomData {
    session: SidakIntercomSession;
    records: SidakIntercomRecord[];
    observers: SidakIntercomObserver[];
}

export async function generateSidakIntercomPdf(data: SidakIntercomData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    let yPosition = margin;

    // ==================== HEADER WITH LOGO ====================
    try {
        const logoImg = await loadGeclLogo();
        if (!logoImg) throw new Error("logo tidak tersedia");
        pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
    } catch (error) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text('PT. Golden Energi Cemerlang Lestari', margin, yPosition + 6);
    }

    // Form code (fictional)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('GECL – HSE – ES – F – 3.02 – 101', pageWidth - margin, yPosition + 4, { align: 'right' });

    yPosition += 12;

    // Main title
    const titleYStart = yPosition;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, titleYStart, pageWidth - (margin * 2), 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('SIDAK INTERCOM FMS', pageWidth / 2, titleYStart + 5.5, { align: 'center' });

    yPosition += 10;

    // Info section
    const session = data.session;
    const infoTableData = [
        [
            'Hari/Tanggal',
            session.tanggal || '',
            'Shift/Waktu',
            `${session.shift || ''} / ${session.waktu || ''}`
        ],
        [
            'Lokasi',
            session.lokasi || '',
            'Reviewer',
            session.personilHse || '-'
        ],
        [
            'Total Sampel',
            session.totalSampel?.toString() || data.records.length.toString(),
            'Kepatuhan',
            `${session.persenKepatuhan || 0}%`
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
            0: { cellWidth: 30, fontStyle: 'bold', fillColor: [255, 255, 255] },
            1: { cellWidth: (pageWidth - (margin * 2)) / 2 - 30 },
            2: { cellWidth: 30, fontStyle: 'bold', fillColor: [255, 255, 255] },
            3: { cellWidth: (pageWidth - (margin * 2)) / 2 - 30 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 2;

    // ==================== INTERCOM RECORDS TABLE ====================
    const tableHeaders = [[
        'No',
        'Nama Pengawas',
        'NIK',
        'No Lambung',
        'Waktu Temuan',
        'Waktu Intervensi',
        'SLA (Mnt)',
        'SLA Respons',
        'Identifikasi',
        'Kualitas Komunikasi',
        'Instruksi K3',
        'Verifikasi Tindakan',
        'Keterangan'
    ]];

    const tableData = data.records.map((rec, index) => [
        (index + 1).toString(),
        rec.nama || '',
        rec.nik || '',
        rec.nomorLambung || '',
        rec.waktuTemuan || '',
        rec.waktuIntervensi || '',
        rec.waktuResponsMenit || '',
        rec.q1_slaRespons ? 'v' : 'x',
        rec.q2_identifikasi ? 'v' : 'x',
        rec.q3_kualitasKomunikasi ? 'v' : 'x',
        rec.q4_instruksiK3 ? 'v' : 'x',
        rec.q5_verifikasiTindakan ? 'v' : 'x',
        rec.keterangan || ''
    ]);

    // Padding empty rows up to 5
    while (tableData.length < 5) {
        tableData.push([
            (tableData.length + 1).toString(), '', '', '', '', '', '', '', '', '', '', ''
        ]);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: pageWidth - (margin * 2),
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
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 6,
        },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 32, halign: 'left' },
            2: { cellWidth: 15 },
            3: { cellWidth: 20 },
            4: { cellWidth: 15 },
            5: { cellWidth: 15 },
            6: { cellWidth: 12 },
            7: { cellWidth: 15 },
            8: { cellWidth: 15 },
            9: { cellWidth: 15 },
            10: { cellWidth: 15 },
            11: { cellWidth: 15 },
            12: { cellWidth: 30, halign: 'left' }
        }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 3;

    // ==================== SIGNATURES SECTION ====================
    const signatureHeaders = [[
        'Tanda Tangan Pengawas'
    ]];

    const signatureBody = [
        ['', '', '', '']
    ];

    autoTable(pdf, {
        startY: yPosition,
        head: [['No', 'Nama Pengawas', 'Perusahaan', 'Tanda Tangan']],
        body: data.observers.map((obs, idx) => [
            (idx + 1).toString(),
            obs.nama || '',
            obs.perusahaan || '',
            ''
        ]),
        theme: 'grid',
        tableWidth: pageWidth - (margin * 2),
        styles: {
            fontSize: 7,
            cellPadding: 1,
            minCellHeight: 12,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 60 },
            3: { cellWidth: 40 }
        },
        didDrawCell: (cellData) => {
            if (cellData.column.index === 3 && cellData.section === 'body') {
                const observer = data.observers[cellData.row.index];
                if (observer?.tandaTangan) {
                    try {
                        const format = observer.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                        pdf.addImage(
                            observer.tandaTangan,
                            format,
                            cellData.cell.x + 2,
                            cellData.cell.y + 1,
                            cellData.cell.width - 4,
                            cellData.cell.height - 2
                        );
                    } catch (e) {
                        console.error('Error adding signature:', e);
                    }
                }
            }
        }
    });

    // Add activity photos on a new page if they exist
    if (session.activityPhotos && session.activityPhotos.length > 0) {
        pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('DOKUMENTASI KEGIATAN', margin, margin + 5);

        let imgX = margin;
        let imgY = margin + 15;
        const imgWidth = 80;
        const imgHeight = 60;
        const spacing = 10;

        for (let i = 0; i < session.activityPhotos.length; i++) {
            try {
                const photo = session.activityPhotos[i];
                const format = photo.includes('image/png') ? 'PNG' : 'JPEG';
                pdf.addImage(photo, format, imgX, imgY, imgWidth, imgHeight);

                imgX += imgWidth + spacing;
                if (imgX + imgWidth > pageWidth - margin) {
                    imgX = margin;
                    imgY += imgHeight + spacing;
                }

                if (imgY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    imgX = margin;
                    imgY = margin + 15;
                }
            } catch (e) {
                console.error('Error adding activity photo:', e);
            }
        }
    }

    return pdf;
}

export async function downloadSidakIntercomAsJpg(data: SidakIntercomData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakIntercomPdf(data);
        const pdfArrayBuffer = pdf.output('arraybuffer');
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdfDocument = await loadingTask.promise;

        // Render each page to canvas then merge or just first page
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

        await page.render({ canvasContext: context, viewport, canvas }).promise;

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
    } catch (error) {
        console.error('Failed to generate JPG:', error);
        throw error;
    }
}
