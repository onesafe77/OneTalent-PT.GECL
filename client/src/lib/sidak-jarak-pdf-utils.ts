import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type {
    SidakJarakSession,
    SidakJarakRecord,
    SidakJarakObserver
} from '@shared/schema';

interface SidakJarakData {
    session: SidakJarakSession;
    records: SidakJarakRecord[];
    observers: SidakJarakObserver[];
}

export async function generateSidakJarakPdf(data: SidakJarakData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    try {
        const logoImg = await loadGeclLogo();
        pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
    } catch (error) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text('PT. GECL', margin, yPosition + 6);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('GECL - HSE - PPO - F - 072 - 17', pageWidth - margin, yPosition + 6, { align: 'right' });

    yPosition += 14;

    const titleYStart = yPosition;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, titleYStart, availableWidth, 14, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.1);
    pdf.rect(margin, titleYStart, availableWidth, 14, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('OBSERVASI JARAK AMAN BERKENDARA', pageWidth / 2, titleYStart + 6, { align: 'center' });

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('Formulir ini digunakan sebagai catatan hasil pengecekan jarak aman beriringan antar kendaraan yang dilaksanakan di PT. GECL', pageWidth / 2, titleYStart + 11, { align: 'center' });

    yPosition += 16;

    const waktuMulai = data.session.jam || data.session.waktu || '';
    const totalSampel = data.records.length || data.session.totalSampel || 0;
    const patuhCount = data.records.filter(r => {
        const jarak = parseFloat(r.jarakAktualKedua || '0');
        return jarak >= 50;
    }).length;
    const kepatuhan = totalSampel > 0 ? Math.round((patuhCount / totalSampel) * 100) : 0;

    const infoTableData = [
        [
            { content: 'Tanggal/ Shift', styles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'bold' as const } },
            data.session.tanggal + ' / ' + (data.session.shift || ''),
            { content: 'Lokasi', styles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'bold' as const } },
            data.session.lokasi || ''
        ],
        [
            { content: 'Waktu', styles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'bold' as const } },
            waktuMulai + ' sampai selesai',
            { content: 'Total Sampel', styles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'bold' as const } },
            { content: totalSampel.toString(), styles: { halign: 'center' as const } }
        ]
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoTableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: availableWidth / 2 - 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: availableWidth / 2 - 35 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 2;

    const tableHeaders = [
        [
            { content: 'No', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'No Kendaraan', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Tipe Unit', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Lokasi', colSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Nomer lambung unit di depan', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Jarak aktual (kedua)', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Keterangan/Tanda tangan pengemudi', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } }
        ],
        [
            { content: 'Muatan', styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Kosongan', styles: { halign: 'center' as const, valign: 'middle' as const } }
        ]
    ];

    const tableData: any[][] = [];
    data.records.forEach((record, index) => {
        tableData.push([
            (index + 1).toString() + '.',
            record.noKendaraan || '',
            record.tipeUnit || '',
            record.lokasiMuatan || '',
            record.lokasiKosongan || '',
            record.nomorLambungUnit || '',
            record.jarakAktualKedua || '',
            record.keterangan || ''
        ]);
    });

    const minRows = 15;
    while (tableData.length < minRows) {
        tableData.push([
            (tableData.length + 1).toString() + '.',
            '', '', '', '', '', '', ''
        ]);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            minCellHeight: 5,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            fontSize: 7,
            cellPadding: 1,
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' as const },
            1: { cellWidth: 30 },
            2: { cellWidth: 28 },
            3: { cellWidth: 30, halign: 'center' as const },
            4: { cellWidth: 30, halign: 'center' as const },
            5: { cellWidth: 35 },
            6: { cellWidth: 30, halign: 'center' as const },
            7: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 3;

    const getObserver = (idx: number) => data.observers[idx] || null;
    const halfWidth = availableWidth / 2;

    const observerTableData: any[][] = [];
    for (let i = 0; i < 4; i++) {
        const leftIdx = i;
        const rightIdx = i + 4;
        observerTableData.push([
            (leftIdx + 1).toString() + '.',
            getObserver(leftIdx)?.nama || '',
            getObserver(leftIdx)?.perusahaan || '',
            '',
            (rightIdx + 1).toString() + '.',
            getObserver(rightIdx)?.nama || '',
            getObserver(rightIdx)?.perusahaan || '',
            ''
        ]);
    }

    autoTable(pdf, {
        startY: yPosition,
        head: [[
            { content: 'No', styles: { halign: 'center' as const } },
            'Nama Pemantau',
            'Perusahaan',
            'Tanda Tangan',
            { content: 'No', styles: { halign: 'center' as const } },
            'Nama Pemantau',
            'Perusahaan',
            'Tanda Tangan'
        ]],
        body: observerTableData,
        theme: 'grid',
        tableWidth: availableWidth,
        showHead: 'firstPage',
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            minCellHeight: 10,
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' as const },
            1: { cellWidth: halfWidth / 4 - 3 },
            2: { cellWidth: halfWidth / 4 - 3 },
            3: { cellWidth: halfWidth / 4 },
            4: { cellWidth: 12, halign: 'center' as const },
            5: { cellWidth: halfWidth / 4 - 3 },
            6: { cellWidth: halfWidth / 4 - 3 },
            7: { cellWidth: halfWidth / 4 },
        },
        didDrawCell: (cellData) => {
            if ((cellData.column.index === 3 || cellData.column.index === 7) && cellData.section === 'body') {
                const rowIndex = cellData.row.index;
                let observerIndex = -1;
                if (cellData.column.index === 3) observerIndex = rowIndex;
                if (cellData.column.index === 7) observerIndex = rowIndex + 4;

                const observer = getObserver(observerIndex);

                if (observer?.tandaTangan) {
                    try {
                        const format = observer.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                        const padding = 1;
                        pdf.addImage(
                            observer.tandaTangan,
                            format,
                            cellData.cell.x + padding,
                            cellData.cell.y + padding,
                            cellData.cell.width - (padding * 2),
                            cellData.cell.height - (padding * 2),
                            undefined,
                            'FAST'
                        );
                    } catch (error) {
                        // ignore
                    }
                }
            }
        },
        margin: { left: margin, right: margin },
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Mei 2020/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

export async function downloadSidakJarakAsJpg(data: SidakJarakData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakJarakPdf(data);
        const pdfArrayBuffer = pdf.output('arraybuffer');

        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdfDocument = await loadingTask.promise;

        const page = await pdfDocument.getPage(1);
        const scale = 2.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Could not get canvas context');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
            canvas,
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext as any).promise;

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create JPG blob'));
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
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
    } catch (error) {
        throw new Error(`Failed to generate JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
