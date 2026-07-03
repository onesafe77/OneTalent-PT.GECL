import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type { SidakPencahayaanSession, SidakPencahayaanRecord, SidakPencahayaanObserver } from '@shared/schema';

interface SidakPencahayaanData {
    session: SidakPencahayaanSession;
    records: SidakPencahayaanRecord[];
    observers: SidakPencahayaanObserver[];
}

export async function generateSidakPencahayaanPDF(data: SidakPencahayaanData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    try {
        const logoImg = await loadGeclLogo();
        pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('PT. GECL', margin, yPosition + 6);
    }

    // Official document code (top right)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('GECL – HSE – ES – F – 3.02 – 25', pageWidth - margin, yPosition + 3, { align: 'right' });
    pdf.text('Mei 2020/R0', pageWidth - margin, yPosition + 7, { align: 'right' });

    yPosition += 14;

    // Official title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('PEMERIKSAAN DAN PENGUJIAN PENCAHAYAAN', pageWidth / 2, yPosition, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('Formulir ini digunakan sebagai catatan hasil pengecekan dan pengujian pencahayaan', pageWidth / 2, yPosition + 5, { align: 'center' });
    pdf.text('yang dilaksanakan di PT. GECL', pageWidth / 2, yPosition + 9, { align: 'center' });

    yPosition += 16;

    // Header info table - 4 rows x 2 columns layout
    const infoData = [
        ['Nama Perusahaan', data.session.namaPerusahaan || '', 'Jenis Alat & Merk', data.session.jenisAlatMerk || ''],
        ['Departemen', data.session.departemen || '', 'No Seri Alat', data.session.noSeriAlat || ''],
        ['Lokasi Pengukuran', data.session.lokasiPengukuran || '', 'Tanggal Pemeriksaan/Pengujian', data.session.tanggalPemeriksaan?.toString() || ''],
        ['Penganggungjawab Area', data.session.penanggungjawabArea || '', 'Waktu Pemeriksaan/Pengujian', data.session.waktuPemeriksaan || '']
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoData,
        theme: 'plain',
        tableWidth: availableWidth,
        styles: { fontSize: 8, cellPadding: 1.5, lineWidth: 0.1, lineColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 50, fillColor: [240, 240, 240] },
            1: { cellWidth: availableWidth / 2 - 50 },
            2: { cellWidth: 60, fillColor: [240, 240, 240] },
            3: { cellWidth: availableWidth / 2 - 60 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 2;

    // Main data table - measurement-based columns
    const tableHeaders = [[
        'No',
        'Titik Pengambilan',
        'Sumber Penerangan',
        'Jenis Pengukuran',
        'Intensitas Pencahayaan (lux)',
        'Jarak dari sumber cahaya',
        'Secara Visual*',
        'Keterangan**'
    ]];

    const tableData = data.records.map((record, idx) => [
        (idx + 1).toString(),
        record.titikPengambilan || '',
        record.sumberPenerangan || '',
        record.jenisPengukuran || '',
        record.intensitasPencahayaan ? `${record.intensitasPencahayaan} lux` : '',
        record.jarakSumberCahaya || '',
        record.secaraVisual || '',
        record.keterangan || ''
    ]);

    // Ensure minimum 10 rows
    while (tableData.length < 10) {
        tableData.push([(tableData.length + 1).toString(), '', '', '', '', '', '', '']);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', valign: 'middle', lineWidth: 0.15, minCellHeight: 7 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 35, halign: 'left' },
            2: { cellWidth: 30, halign: 'left' },
            3: { cellWidth: 28, halign: 'left' },
            4: { cellWidth: 25 },
            5: { cellWidth: 25, halign: 'left' },
            6: { cellWidth: 22 },
            7: { cellWidth: 'auto', halign: 'left' },
        },
        margin: { left: margin, right: margin },
    });

    // Notes section below table
    const finalY = (pdf as any).lastAutoTable.finalY + 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Catatan:', margin, finalY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('*Secara visual diisi dengan sangat gelap, gelap, cukup, terang, sangat terang.', margin, finalY + 4);
    pdf.text('**Di bagian keterangan dijelaskan hasil dari secara visual', margin, finalY + 8);

    yPosition = finalY + 14;

    // Observer sign-off section - 4 rows x 2 groups (max 8 observers) - matching official template
    const getObs = (i: number) => data.observers[i] || null;

    // Layout: 2 groups per row, 4 rows total
    // Left side: observers 1, 2, 3, 4 | Right side: observers 5, 6, 7, 8
    const obsData = [
        ['1.', getObs(0)?.nama || '', getObs(0)?.perusahaan || '', '', '5.', getObs(4)?.nama || '', getObs(4)?.perusahaan || '', ''],
        ['2.', getObs(1)?.nama || '', getObs(1)?.perusahaan || '', '', '6.', getObs(5)?.nama || '', getObs(5)?.perusahaan || '', ''],
        ['3.', getObs(2)?.nama || '', getObs(2)?.perusahaan || '', '', '7.', getObs(6)?.nama || '', getObs(6)?.perusahaan || '', ''],
        ['4.', getObs(3)?.nama || '', getObs(3)?.perusahaan || '', '', '8.', getObs(7)?.nama || '', getObs(7)?.perusahaan || '', ''],
    ];

    autoTable(pdf, {
        startY: yPosition,
        head: [[
            'No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan',
            'No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan'
        ]],
        body: obsData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle', minCellHeight: 10, lineWidth: 0.15 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            // Group 1 (left side)
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45, halign: 'left' },
            2: { cellWidth: 35, halign: 'left' },
            3: { cellWidth: 45 },
            // Group 2 (right side)
            4: { cellWidth: 10, halign: 'center' },
            5: { cellWidth: 45, halign: 'left' },
            6: { cellWidth: 35, halign: 'left' },
            7: { cellWidth: 45 },
        },
        didDrawCell: (cellData) => {
            // Signature columns: 3 (left group), 7 (right group)
            if ([3, 7].includes(cellData.column.index) && cellData.section === 'body') {
                // For column 3: observers 0-3 (rows 0-3)
                // For column 7: observers 4-7 (rows 0-3)
                const obsIdx = cellData.column.index === 3 ? cellData.row.index : cellData.row.index + 4;
                const obs = getObs(obsIdx);
                if (obs?.tandaTangan) {
                    try {
                        pdf.addImage(obs.tandaTangan, obs.tandaTangan.includes('png') ? 'PNG' : 'JPEG',
                            cellData.cell.x + 1, cellData.cell.y + 1,
                            cellData.cell.width - 2, cellData.cell.height - 2, undefined, 'FAST');
                    } catch { }
                }
            }
        },
        margin: { left: margin, right: margin },
    });

    // Footer
    const footerY = (pdf as any).lastAutoTable.finalY + 3;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Mei 2020/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 2', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

export async function downloadSidakPencahayaanAsJpg(data: SidakPencahayaanData, filename: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Browser only');
    const pdfjsLib = await import('pdfjs-dist');
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

    const pdf = await generateSidakPencahayaanPDF(data);
    const pdfDocument = await pdfjsLib.getDocument({ data: pdf.output('arraybuffer') }).promise;
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport } as any).promise;

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Failed'));
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
            resolve();
        }, 'image/jpeg', 0.95);
    });
}

// Alias exports for backward compatibility
export const generateSidakPencahayaanPdf = generateSidakPencahayaanPDF;
