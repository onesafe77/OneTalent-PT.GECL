import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type { SidakKecepatanSession, SidakKecepatanRecord, SidakKecepatanObserver } from '@shared/schema';

interface SidakKecepatanData {
    session: SidakKecepatanSession;
    records: SidakKecepatanRecord[];
    observers: SidakKecepatanObserver[];
}

export async function generateSidakKecepatanPdf(data: SidakKecepatanData): Promise<jsPDF> {
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
        pdf.text('PT. Goden Energi Cemerlang Lesrari', margin, yPosition + 6);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('GECL – HSE – PPO – F – 072 – 18', pageWidth - margin, yPosition + 6, { align: 'right' });

    yPosition += 15;

    // Gray background for title section
    pdf.setFillColor(200, 200, 200);
    pdf.rect(margin, yPosition, availableWidth, 12, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('OBSERVASI KECEPATAN BERKENDARA', pageWidth / 2, yPosition + 5, { align: 'center' });

    yPosition += 12;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('Formulir ini digunakan sebagai catatan hasil monitoring kecepatan berkendara para pengemudi yang dilaksanakan di PT. GECL', pageWidth / 2, yPosition + 3, { align: 'center' });

    yPosition += 5;

    const colWidth1 = 35; // Label width
    const colWidth2 = 55; // Value width
    const infoData = [
        [
            'Tanggal/ Shift',
            `${data.session.tanggal || ''} / ${data.session.shift || ''}`,
            'Lokasi',
            data.session.lokasi || '',
            'Sub lokasi',
            data.session.subLokasi || ''
        ],
        [
            'Waktu',
            data.session.waktu || '',
            'Total Sampel',
            (data.session.totalSampel || data.records.length).toString(),
            'Batas Kecepatan (KPH)',
            `${data.session.batasKecepatanKph || 40}`
        ]
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0], halign: 'left' },
        columnStyles: {
            0: { cellWidth: colWidth1, fillColor: [240, 240, 240], fontStyle: 'bold' },
            1: { cellWidth: colWidth2 },
            2: { cellWidth: colWidth1, fillColor: [240, 240, 240], fontStyle: 'bold' },
            3: { cellWidth: colWidth2 },
            4: { cellWidth: colWidth1, fillColor: [240, 240, 240], fontStyle: 'bold' },
            5: { cellWidth: colWidth2 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 2;

    const tableHeaders = [
        [
            { content: 'No', rowSpan: 2 },
            { content: 'No Kendaraan', rowSpan: 2 },
            { content: 'Tipe Unit', rowSpan: 2 },
            { content: 'Arah Kendaraan', colSpan: 2 },
            { content: 'Kecepatan Aktual (MPH)', rowSpan: 2 },
            { content: 'Kecepatan Aktual (KPH)', rowSpan: 2 },
            { content: 'Keterangan', rowSpan: 2 }
        ],
        [
            'Muatan',
            'Kosongan'
        ]
    ];

    const tableData = data.records.map((record, idx) => [
        (idx + 1).toString(),
        record.noKendaraan || '',
        record.tipeUnit || '',
        record.arahMuatan ? '✓' : '',
        record.arahKosongan ? '✓' : '',
        record.kecepatanMph || '',
        record.kecepatanKph || '',
        record.keterangan || ''
    ]);

    while (tableData.length < 15) {
        tableData.push([(tableData.length + 1).toString(), '', '', '', '', '', '', '']);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: { fontSize: 7.5, cellPadding: 1.5, halign: 'center', valign: 'middle', lineWidth: 0.2, minCellHeight: 6 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 38, halign: 'left' },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 32 },
            6: { cellWidth: 32 },
            7: { cellWidth: 'auto', halign: 'left' },
        },
        margin: { left: margin, right: margin },
        didDrawCell: (cellData) => {
            // Draw checkmarks for Muatan (column 3) and Kosongan (column 4)
            if ((cellData.column.index === 3 || cellData.column.index === 4) && cellData.section === 'body') {
                const cellText = cellData.cell.text[0];
                if (cellText === '✓') {
                    // Clear the text
                    cellData.cell.text = [];

                    // Draw checkmark manually
                    const centerX = cellData.cell.x + cellData.cell.width / 2;
                    const centerY = cellData.cell.y + cellData.cell.height / 2;
                    const size = 1.8;

                    pdf.setDrawColor(0, 0, 0);
                    pdf.setLineWidth(0.4);

                    // Draw checkmark shape
                    pdf.line(centerX - size, centerY, centerX - size / 3, centerY + size);
                    pdf.line(centerX - size / 3, centerY + size, centerX + size, centerY - size);
                }
            }
        },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 3;

    const getObs = (i: number) => data.observers[i] || { nama: '', nik: '', perusahaan: '', tandaTangan: '' };
    const obsData = [
        ['1', getObs(0).nama, getObs(0).nik || '', getObs(0).perusahaan || '', ''],
        ['2', getObs(1).nama, getObs(1).nik || '', getObs(1).perusahaan || '', ''],
        ['3', getObs(2).nama, getObs(2).nik || '', getObs(2).perusahaan || '', ''],
    ];

    autoTable(pdf, {
        startY: yPosition,
        head: [['No', 'Nama Pemantau', 'NIK', 'Perusahaan', 'Tanda Tangan']],
        body: obsData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle', minCellHeight: 15, lineWidth: 0.2 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 60, halign: 'left' },
            2: { cellWidth: 40, halign: 'center' },
            3: { cellWidth: 50, halign: 'left' },
            4: { cellWidth: 'auto', halign: 'center' },
        },
        didDrawCell: (cellData) => {
            if (cellData.column.index === 4 && cellData.section === 'body') {
                const obs = getObs(cellData.row.index);
                if (obs?.tandaTangan) {
                    try {
                        pdf.addImage(obs.tandaTangan, obs.tandaTangan.includes('png') ? 'PNG' : 'JPEG', cellData.cell.x + 2, cellData.cell.y + 2, cellData.cell.width - 4, cellData.cell.height - 4, undefined, 'FAST');
                    } catch { }
                }
            }
        },
        margin: { left: margin, right: margin },
    });

    pdf.setFontSize(8);
    pdf.text('Mei 2020/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

export async function downloadSidakKecepatanAsJpg(data: SidakKecepatanData, filename: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Browser only');
    const pdfjsLib = await import('pdfjs-dist');
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

    const pdf = await generateSidakKecepatanPdf(data);
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
