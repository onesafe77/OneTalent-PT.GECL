import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
    SidakAntrianSession,
    SidakAntrianRecord,
    SidakAntrianObserver
} from '@shared/schema';

interface SidakAntrianData {
    session: SidakAntrianSession;
    records: SidakAntrianRecord[];
    observers: SidakAntrianObserver[];
}

export async function generateSidakAntrianPdf(data: SidakAntrianData): Promise<jsPDF> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    try {
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = '/assets/logo.png';
        });
        pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
    } catch {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text('PT BORNEO INDOBARA', margin, yPosition + 6);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('BIB - HSE - PPO - F - xxx - xx', pageWidth - margin, yPosition + 6, { align: 'right' });

    yPosition += 14;

    const titleYStart = yPosition;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, titleYStart, availableWidth, 12, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.1);
    pdf.rect(margin, titleYStart, availableWidth, 12, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('OBSERVASI ANTRIAN', pageWidth / 2, titleYStart + 5.5, { align: 'center' });

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('Untuk mengetahui kepatuhan driver saat kondisi antrian', pageWidth / 2, titleYStart + 10, { align: 'center' });

    yPosition += 14;

    const infoTableData = [
        [
            'Tanggal Pelaksanaan',
            data.session.tanggal || '',
            'Perusahaan',
            data.session.perusahaan || ''
        ],
        [
            'Jam Pelaksanaan',
            data.session.waktu || '',
            'Departemen',
            data.session.departemen || ''
        ],
        [
            'Shift',
            data.session.shift || '',
            'Lokasi',
            data.session.lokasi || ''
        ]
    ];

    autoTable(pdf, {
        startY: yPosition,
        body: infoTableData,
        theme: 'plain',
        tableWidth: availableWidth,
        styles: {
            fontSize: 8,
            cellPadding: 1.5,
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 40, fillColor: [240, 240, 240] },
            1: { cellWidth: availableWidth / 2 - 40 },
            2: { cellWidth: 40, fillColor: [240, 240, 240] },
            3: { cellWidth: availableWidth / 2 - 40 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 2;

    const tableHeaders = [
        [
            { content: 'NO', rowSpan: 2, styles: { valign: 'middle' as const, halign: 'center' as const } },
            { content: 'Nama-NIK\n(contoh : Gede - C-024955)', rowSpan: 2, styles: { valign: 'middle' as const, halign: 'center' as const } },
            { content: 'No lambung\n(contoh : RBT 4023)', rowSpan: 2, styles: { valign: 'middle' as const, halign: 'center' as const } },
            { content: 'Apakah driver\nsudah mengaktif\nkan handbrake?', colSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Apakah\njarak antar unit\naman?', colSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Keterangan', rowSpan: 2, styles: { valign: 'middle' as const, halign: 'center' as const } }
        ],
        [
            { content: 'Ya', styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Tidak', styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Ya', styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: 'Tidak', styles: { halign: 'center' as const, valign: 'middle' as const } }
        ]
    ];

    const tableData: (string | { content: string; styles?: any })[][] = [];
    data.records.forEach((record, index) => {
        tableData.push([
            (index + 1).toString(),
            record.namaNik || '',
            record.noLambung || '',
            record.handbrakeAktif ? '✓' : '',
            !record.handbrakeAktif ? '✓' : '',
            record.jarakUnitAman ? '✓' : '',
            !record.jarakUnitAman ? '✓' : '',
            record.keterangan || ''
        ]);
    });

    const minRows = 15;
    while (tableData.length < minRows) {
        tableData.push([
            (tableData.length + 1).toString(),
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
            cellPadding: 1,
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            minCellHeight: 6,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            fontSize: 8,
            cellPadding: 1,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' as const },
            1: { cellWidth: 60 },
            2: { cellWidth: 40, halign: 'center' as const },
            3: { cellWidth: 15, halign: 'center' as const },
            4: { cellWidth: 15, halign: 'center' as const },
            5: { cellWidth: 15, halign: 'center' as const },
            6: { cellWidth: 15, halign: 'center' as const },
            7: { cellWidth: 107 },
        },
        margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 3;

    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, yPosition, availableWidth, 6, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.1);
    pdf.rect(margin, yPosition, availableWidth, 6, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('OBSERVER', pageWidth / 2, yPosition + 4, { align: 'center' });

    yPosition += 6;

    const observerTableData = [
        [
            { content: '1', styles: { halign: 'center' as const } },
            data.observers[0]?.nama || '',
            data.observers[0]?.jabatan || '',
            '',
            { content: '3', styles: { halign: 'center' as const } },
            data.observers[2]?.nama || '',
            data.observers[2]?.jabatan || '',
            ''
        ],
        [
            { content: '2', styles: { halign: 'center' as const } },
            data.observers[1]?.nama || '',
            data.observers[1]?.jabatan || '',
            '',
            { content: '4', styles: { halign: 'center' as const } },
            data.observers[3]?.nama || '',
            data.observers[3]?.jabatan || '',
            ''
        ]
    ];

    autoTable(pdf, {
        startY: yPosition,
        head: [[
            { content: 'NO', styles: { halign: 'center' as const } },
            'NAMA', 'JABATAN', 'TANDA TANGAN',
            { content: 'NO', styles: { halign: 'center' as const } },
            'NAMA', 'JABATAN', 'TANDA TANGAN'
        ]],
        body: observerTableData,
        theme: 'grid',
        tableWidth: availableWidth,
        showHead: 'firstPage',
        styles: {
            fontSize: 8,
            cellPadding: 1,
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            minCellHeight: 12,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 },
            4: { cellWidth: 10 },
            5: { cellWidth: 'auto' },
            6: { cellWidth: 40 },
            7: { cellWidth: 30 },
        },
        didDrawCell: (cellData) => {
            if ((cellData.column.index === 3 || cellData.column.index === 7) && cellData.section === 'body') {
                const rowIndex = cellData.row.index;
                const observerIndex = cellData.column.index === 3 ? rowIndex : rowIndex + 2;
                const observer = data.observers[observerIndex];

                if (observer?.tandaTangan) {
                    try {
                        const format = observer.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                        const padding = 2;
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
                    } catch {
                        // ignore signature errors
                    }
                }
            }
        },
        margin: { left: margin, right: margin },
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Januari 2020/R0', margin, pageHeight - 5);
    pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

    return pdf;
}

export async function downloadSidakAntrianAsJpg(data: SidakAntrianData, filename: string): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        const pdf = await generateSidakAntrianPdf(data);
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
