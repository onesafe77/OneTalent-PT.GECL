import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const MESIN_LAS_CHECKLIST = [
    {
        category: "1. Mesin Las dan Peralatan Pendukung",
        items: [
            { id: "1.1", label: "Catu daya ( generator mesin las dan rectifier) Travo" },
            { id: "1.2", label: "Kabel pembumian dan kabel elektroda" },
            { id: "1.3", label: "Pemegang elektroda ( holder)" },
            { id: "1.4", label: "Perangkat klem khusus / klem C" },
            { id: "1.5", label: "Elektroda" },
            { id: "1.6", label: "Dudukan" },
            { id: "1.7", label: "Pemegang elektroda ( berisolasi)" },
            { id: "1.8", label: "Kondisi semua konektor kabel – kabel" },
            { id: "1.9", label: "Kondisi ventilasi udara rectifier / travo" },
            { id: "1.10", label: "Kondisi komutator (kolektor arus)" },
            { id: "1.11", label: "Kebersihan mesin secara umum" },
            { id: "1.12", label: "Kipas / exchaust fan" },
        ]
    },
    {
        category: "2. APD Khusus & Alat Keselamatan",
        items: [
            { id: "2.1", label: "Apron / jaket las" },
            { id: "2.2", label: "Topeng las" },
            { id: "2.3", label: "Masker" },
            { id: "2.4", label: "Sarung tangan kulit" },
            { id: "2.5", label: "APAR memadai (min tipe C)" },
        ]
    }
];

export const generateSidakMesinLasPDF = async (data: any) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;
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

    const drawHeader = (startPos: number) => {
        let yPosition = startPos;

        // Header Section
        if (logoImg) {
            pdf.addImage(logoImg, 'PNG', margin, yPosition, 30, 8);
        } else {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('PT. GECL', margin, yPosition + 7.5);
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PT. Golden Energi Cemerlang Lestari', margin + 35, yPosition + 6);

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text('GECL – HSE – ES – F – 3.02 – 78', pageWidth - margin - 2, yPosition + 6, { align: 'right' });

        yPosition += 12;

        // Title Section
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, yPosition, availableWidth, 12, 'F');
        pdf.rect(margin, yPosition, availableWidth, 12, 'D');

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CEKLIS INSPEKSI MESIN LAS', pageWidth / 2, yPosition + 6, { align: 'center' });

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi mesin las', pageWidth / 2, yPosition + 10, { align: 'center' });

        yPosition += 12;

        const infoData = [
            ['Tanggal', data.session.tanggal || '', 'Nama Objek Inspeksi', data.session.namaObjekInspeksi || ''],
            ['Lokasi', data.session.lokasi || '', 'Penanggung jawab', data.session.penanggungJawab || '']
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

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan', margin, yPosition + 3);

        return yPosition + 5;
    };

    let currentY = drawHeader(margin);

    const buildTableData = () => {
        const rows: any[] = [];
        const records = data.records || [];

        // If no records, just return empty category headers
        if (records.length === 0) {
            MESIN_LAS_CHECKLIST.forEach((cat) => {
                rows.push([
                    { content: '', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                    { content: cat.category, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }, colSpan: 5 }
                ]);
            });
            return rows;
        }

        records.forEach((record: any) => {
            // Optional: If there are multiple records, add a sub-header for the machine
            if (records.length > 1) {
                rows.push([
                    { content: '', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
                    { content: `Mesin Las: ${record.noRegisterMesinLas || '-'}`, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] }, colSpan: 5 }
                ]);
            }

            MESIN_LAS_CHECKLIST.forEach((cat) => {
                // Category Row
                rows.push([
                    { content: '', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                    { content: cat.category, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }, colSpan: 5 }
                ]);

                cat.items.forEach((item) => {
                    const results = record.inspectionResults || {};
                    const value = results[item.id] || '';

                    rows.push([
                        item.id,
                        item.label,
                        value === 'S' ? 'S' : '',
                        value === 'TS' ? 'TS' : '',
                        record.tindakLanjutPerbaikan?.[item.id] || '',
                        (value === 'TS' && record.dueDate) ? format(new Date(record.dueDate), 'yyyy-MM-dd') : ''
                    ]);
                });
            });
        });

        return rows;
    };

    autoTable(pdf, {
        startY: currentY,
        head: [['No', 'DESKRIPSI PEMERIKSAAN', 'S', 'TS', 'TINDAK LANJUT PERBAIKAN', 'DUE DATE']],
        body: buildTableData(),
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 7,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.15,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 7,
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

    currentY = (pdf as any).lastAutoTable.finalY + 5;

    // Signature Section
    const observers = data.observers || [];
    const sigTableData: any[] = [];

    // Calculate how many rows needed for signatures (2 columns per row)
    const numRows = Math.ceil(observers.length / 2);

    for (let i = 0; i < numRows; i++) {
        const leftIdx = i * 2;
        const rightIdx = i * 2 + 1;

        const left = observers[leftIdx];
        const right = observers[rightIdx];

        sigTableData.push([
            left ? `Nama Inspektur: ${left.nama}\nPerusahaan: ${left.perusahaan || '-'}` : '',
            right ? `Nama Inspektur: ${right.nama}\nPerusahaan: ${right.perusahaan || '-'}` : ''
        ]);

        const leftSig = left?.tandaTangan;
        const rightSig = right?.tandaTangan;

        sigTableData.push([
            { content: 'Tanda tangan:', styles: { minCellHeight: 20, valign: 'top' } },
            { content: 'Tanda tangan:', styles: { minCellHeight: 20, valign: 'top' } }
        ]);
    }

    if (observers.length > 0) {
        autoTable(pdf, {
            startY: currentY,
            body: sigTableData,
            theme: 'grid',
            tableWidth: availableWidth,
            styles: {
                fontSize: 7,
                cellPadding: 2,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: availableWidth / 2 },
                1: { cellWidth: availableWidth / 2 }
            },
            didDrawCell: (hookData) => {
                if (hookData.cell.text[0] === 'Tanda tangan:' && hookData.column.index <= 1) {
                    const observerIdx = Math.floor(hookData.row.index / 2) * 2 + hookData.column.index;
                    const observer = observers[observerIdx];
                    if (observer?.tandaTangan) {
                        pdf.addImage(
                            observer.tandaTangan,
                            'PNG',
                            hookData.cell.x + 2,
                            hookData.cell.y + 5,
                            30,
                            12
                        );
                    }
                }
            },
            margin: { left: margin, right: margin }
        });
    }

    const fileName = `Sidak_Mesin_Las_${data.session.tanggal}_${data.session.id.substring(0, 8)}.pdf`;
    pdf.save(fileName);
};
