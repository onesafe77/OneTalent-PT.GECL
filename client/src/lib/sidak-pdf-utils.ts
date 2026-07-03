import { jsPDF } from 'jspdf';
import { loadGeclLogo } from "./pdf-logo";
import autoTable from 'jspdf-autotable';
import type {
  SidakFatigueSession,
  SidakFatigueRecord,
  SidakFatigueObserver,
  SidakRosterSession,
  SidakRosterRecord,
  SidakRosterObserver
} from '@shared/schema';

// ============================================
// SIDAK FATIGUE PDF GENERATOR
// Form: GECL-HSE-ES-F-3.02-16
// ============================================

interface SidakFatigueData {
  session: SidakFatigueSession;
  records: SidakFatigueRecord[];
  observers: SidakFatigueObserver[];
}

export async function generateSidakFatiguePdf(data: SidakFatigueData): Promise<jsPDF> {
  const pdf = new jsPDF('landscape', 'mm', 'a4', true);
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 10;
  const EMPLOYEES_PER_PAGE = 10;

  // Pre-load logo image once for reuse
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await loadGeclLogo();
  } catch (error) {
    console.error('Logo loading failed, will use text fallback:', error);
  }

  // Helper function to draw header and info section (reused for each page)
  const drawHeaderAndInfo = (yStart: number): number => {
    let yPosition = yStart;

    // ==================== HEADER ====================
    if (logoImg) {
      const logoWidth = 45;
      const logoHeight = 10;
      pdf.addImage(logoImg, 'PNG', margin, yPosition, logoWidth, logoHeight);
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 139);
      pdf.text('PT. Goden Energi Cemerlang Lesrari', margin, yPosition + 6);
    }

    // Form code at top right
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('GECL – HSE – ES – F – 3.02 – 16', pageWidth - margin, yPosition + 4, { align: 'right' });

    yPosition += 12;

    // Main title with gray background
    const titleYStart = yPosition;
    pdf.setFillColor(220, 220, 220);
    pdf.rect(margin, titleYStart, pageWidth - (margin * 2), 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('OBSERVASI PENGECEKAN KELELAHAN', pageWidth / 2, titleYStart + 5.5, { align: 'center' });

    yPosition += 10;

    // Subtitle
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Formulir ini digunakan sebagai catatan hasil pengecekan kelelahan yang dilaksanakan di PT. Goden Energi Cemerlang Lesrari', pageWidth / 2, yPosition + 2, { align: 'center' });

    yPosition += 4;

    // ==================== INFO SECTION TABLE ====================
    const infoTableData = [
      ['Tanggal / Shift', `${data.session.tanggal} / ${data.session.shift}`, 'Lokasi', data.session.lokasi],
      ['Waktu', `${data.session.waktuMulai} sampai ${data.session.waktuSelesai}`, 'Total Sampel', data.records.length.toString()],
      ['Area / Departemen', `${data.session.area} / ${data.session.departemen}`, '', '']
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
        0: { cellWidth: 40, fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'left' },
        1: { cellWidth: (pageWidth - (margin * 2)) / 2 - 40, halign: 'left' },
        2: { cellWidth: 40, fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'left' },
        3: { cellWidth: (pageWidth - (margin * 2)) / 2 - 40, halign: 'left' },
      },
      margin: { left: margin, right: margin },
    });

    return (pdf as any).lastAutoTable.finalY + 2;
  };

  // Helper function to draw employee table for a chunk of records
  const drawEmployeeTable = (records: SidakFatigueRecord[], startIndex: number, yStart: number): number => {
    const tableHeaders = [
      ['No', 'Nama / NIK', 'Jabatan', 'No.\nLambung',
        'Jam tidur\nkaryawan\nsebelum\nbekerja\n(jam)', 'Jam\nMonitoring',
        'Ada\nkonsumsi\nobat', 'Ada\nmasalah\npribadi', 'PVT\n(ms)',
        'Pemeriksaan\nkonsentrasi\nkaryawan', 'Pemeriksaan\nkesehatan\nkaryawan',
        'Karyawan\nsiap untuk\nbekerja', 'Fit Untuk\nBekerja',
        'Tanda\nTangan\nPekerja',
        'Istirahat\nSebentar\ndan\nDimonitor\nkembali',
        'Pekerja\ndiistirahatkan\n(> 1 Jam) -\nKonseling',
        'Tidak\nDiijinkan\nuntuk\nKembali\nBekerja\n(Konseling)']
    ];

    const tableData = records.map((record, index) => [
      (startIndex + index + 1).toString(),
      `${record.nama}\n${record.nik}`,
      record.jabatan,
      record.nomorLambung || '-',
      record.jamTidur.toString(),
      '-',
      record.konsumiObat ? '\u2713' : 'X',
      record.masalahPribadi ? '\u2713' : 'X',
      record.pvtMeanRT != null ? `${record.pvtMeanRT}` : '-',
      record.pemeriksaanKonsentrasi ? '\u2713' : 'X',
      record.pemeriksaanKesehatan ? '\u2713' : 'X',
      record.karyawanSiapBekerja ? '\u2713' : 'X',
      record.fitUntukBekerja ? '\u2713' : 'X',
      '',
      record.istirahatDanMonitor ? '\u2713' : 'X',
      record.istirahatLebihdariSatuJam ? '\u2713' : 'X',
      record.tidakBolehBekerja ? '\u2713' : 'X',
    ]);

    const availableWidth = pageWidth - (margin * 2);

    autoTable(pdf, {
      startY: yStart,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      tableWidth: availableWidth,
      styles: {
        fontSize: 5.5,
        cellPadding: 0.5,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        minCellHeight: 6.5,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.2,
        fontSize: 5.5,
        cellPadding: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40, halign: 'left', fontSize: 5.5 },
        2: { cellWidth: 30, halign: 'left' },
        3: { cellWidth: 18 },
        4: { cellWidth: 14 },
        5: { cellWidth: 14 },
        6: { cellWidth: 14 },
        7: { cellWidth: 14 },
        8: { cellWidth: 14 },
        9: { cellWidth: 14 },
        10: { cellWidth: 14 },
        11: { cellWidth: 14 },
        12: { cellWidth: 14 },
        13: { cellWidth: 18 },
        14: { cellWidth: 14 },
        15: { cellWidth: 14 },
        16: { cellWidth: 9 },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (cellData) => {
        if (cellData.column.index === 13 && cellData.section === 'body') {
          const record = records[cellData.row.index];
          if (record && record.employeeSignature) {
            try {
              const imgWidth = 18;
              const imgHeight = 10;
              const xPos = cellData.cell.x + (cellData.cell.width - imgWidth) / 2;
              const yPos = cellData.cell.y + (cellData.cell.height - imgHeight) / 2;
              pdf.addImage(record.employeeSignature, 'PNG', xPos, yPos, imgWidth, imgHeight);
            } catch (error) {
              console.error('Error drawing employee signature:', error);
            }
          }
        }

        const booleanColumns = [6, 7, 9, 10, 11, 12, 14, 15, 16];
        if (booleanColumns.includes(cellData.column.index) && cellData.section === 'body') {
          const cellText = cellData.cell.text[0];
          if (cellText === '\u2713' || cellText === '✓') {
            const x = cellData.cell.x + cellData.cell.width / 2;
            const y = cellData.cell.y + cellData.cell.height / 2;
            const size = 1.8;

            pdf.setLineWidth(0.3);
            pdf.setDrawColor(0, 0, 0);

            pdf.line(x - size, y, x - size / 3, y + size);
            pdf.line(x - size / 3, y + size, x + size, y - size);
          }
        }
      }
    });

    return (pdf as any).lastAutoTable.finalY + 1.5;
  };

  // Helper function to draw observer signatures
  const drawObserverSignatures = (yStart: number): number => {
    const observerTableData = [
      [
        '1.', data.observers[0]?.nama || '', data.observers[0]?.perusahaan || '', '',
        '4.', data.observers[3]?.nama || '', data.observers[3]?.perusahaan || '', ''
      ],
      [
        '2.', data.observers[1]?.nama || '', data.observers[1]?.perusahaan || '', '',
        '5.', data.observers[4]?.nama || '', data.observers[4]?.perusahaan || '', ''
      ],
      [
        '3.', data.observers[2]?.nama || '', data.observers[2]?.perusahaan || '', '',
        '6.', data.observers[5]?.nama || '', data.observers[5]?.perusahaan || '', ''
      ]
    ];

    autoTable(pdf, {
      startY: yStart,
      head: [[
        'No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan',
        'No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan'
      ]],
      body: observerTableData,
      theme: 'grid',
      tableWidth: pageWidth - (margin * 2),
      styles: {
        fontSize: 6.5,
        cellPadding: 0.8,
        halign: 'left',
        valign: 'middle',
        minCellHeight: 8,
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: 0.8,
        minCellHeight: 8,
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 11, halign: 'center' },
        1: { cellWidth: 69, halign: 'left' },
        2: { cellWidth: 32, halign: 'left' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 11, halign: 'center' },
        5: { cellWidth: 69, halign: 'left' },
        6: { cellWidth: 32, halign: 'left' },
        7: { cellWidth: 26, halign: 'center' },
      },
      didDrawCell: (cellData) => {
        if ((cellData.column.index === 3 || cellData.column.index === 7) && cellData.section === 'body') {
          const rowIndex = cellData.row.index;
          const observerIndex = cellData.column.index === 3 ? rowIndex : rowIndex + 3;
          const observer = data.observers[observerIndex];

          if (observer?.signatureDataUrl) {
            try {
              const format = observer.signatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
              const cellX = cellData.cell.x;
              const cellY = cellData.cell.y;
              const cellWidth = cellData.cell.width;
              const cellHeight = cellData.cell.height;

              pdf.addImage(
                observer.signatureDataUrl,
                format,
                cellX + 1,
                cellY + 1,
                cellWidth - 2,
                cellHeight - 2,
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

  // Helper function to draw footer
  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Mei 2022/R1', margin, pageHeight - 10);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  // Split records into chunks of EMPLOYEES_PER_PAGE
  const chunks: SidakFatigueRecord[][] = [];
  for (let i = 0; i < data.records.length; i += EMPLOYEES_PER_PAGE) {
    chunks.push(data.records.slice(i, i + EMPLOYEES_PER_PAGE));
  }

  // If no records, create a single page with empty table
  if (chunks.length === 0) {
    chunks.push([]);
  }

  const totalPages = chunks.length;

  // Generate pages
  for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    let yPosition = margin;

    // Draw header and info section
    yPosition = drawHeaderAndInfo(yPosition);

    // Draw employee table for this chunk
    const startIndex = pageIndex * EMPLOYEES_PER_PAGE;
    yPosition = drawEmployeeTable(chunks[pageIndex], startIndex, yPosition);

    // Add observer signatures on every page (identical format)
    drawObserverSignatures(yPosition);

    // Draw footer with page numbers
    drawFooter(pageIndex + 1, totalPages);
  }

  return pdf;
}

// ============================================
// JPG EXPORT FOR SIDAK FATIGUE
// Using PDF.js with bundled worker (Vite-compatible approach)
// ============================================
export async function downloadSidakFatigueAsJpg(data: SidakFatigueData, filename: string, roster?: SidakRosterData): Promise<void> {
  // Guard against server-side execution (SSR/Node.js)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('JPG download can only be executed in browser environment');
  }

  try {
    // Import PDF.js (Vite compatible)
    const pdfjsLib = await import('pdfjs-dist');

    // Import bundled worker as URL (Vite will handle this properly)
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

    // Configure PDF.js to use bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

    // Generate the PDF (+ halaman form Sidak Roster tersambung bila ada)
    const pdf = await generateSidakFatiguePdf(data);
    if (roster) await generateSidakRosterPdf(roster, pdf);

    // Get PDF as array buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');

    // Load PDF with PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const totalPages = pdfDocument.numPages;
    const scale = 2.5;

    // Helper function to download a single page as JPG
    const downloadPage = async (pageNum: number): Promise<void> => {
      const page = await pdfDocument.getPage(pageNum);
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

            // Create filename with page number if multiple pages
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

    // Download all pages sequentially with a small delay between downloads
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      await downloadPage(pageNum);
      // Small delay between downloads to ensure browser handles them properly
      if (pageNum < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    throw new Error(`Failed to generate JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================
// SIDAK ROSTER PDF GENERATOR
// Form: GECL-HSE-PPO-F
// ============================================

export interface SidakRosterData {
  session: SidakRosterSession;
  records: SidakRosterRecord[];
  observers: SidakRosterObserver[];
}

export async function generateSidakRosterPdf(data: SidakRosterData, existingPdf?: jsPDF): Promise<jsPDF> {
  // Landscape A4 (297mm x 210mm). Bila existingPdf diberikan (lampiran di PDF Fatigue),
  // form roster digambar sebagai halaman baru di dokumen itu.
  const pdf = existingPdf ?? new jsPDF('landscape', 'mm', 'a4', true);
  if (existingPdf) pdf.addPage('a4', 'landscape');
  const pageWidth = pdf.internal.pageSize.width; // 297mm
  const pageHeight = pdf.internal.pageSize.height; // 210mm
  const margin = 10;
  let yPosition = margin;

  // ==================== HEADER WITH LOGO ====================
  // Load and add company logo (async)
  try {
    const logoImg = await loadGeclLogo();

    // Add logo to top-left corner with proper dimensions
    pdf.addImage(logoImg, 'PNG', margin, margin, 45, 10);
  } catch (error) {
    // Fallback to text logo if image fails
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text('PT. Goden Energi Cemerlang Lesrari', margin, yPosition + 6);
  }

  // Form code on top-right
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.text('GECL – HSE – PPO – F – xxx - xx', pageWidth - margin, yPosition + 4, { align: 'right' });

  yPosition += 12; // Space after logo for proper layout

  // Main title with gray background
  const titleYStart = yPosition;
  pdf.setFillColor(220, 220, 220); // Gray background
  pdf.rect(margin, titleYStart, pageWidth - (margin * 2), 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('SIDAK ROSTER/ GILIR KERJA', pageWidth / 2, titleYStart + 5.5, { align: 'center' });

  yPosition += 10;

  // Subtitle - center aligned italic
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Membandingkan antara data absensi karyawan dengan plan roster', pageWidth / 2, yPosition + 2, { align: 'center' });

  yPosition += 4; // Reduced spacing before info table

  // ==================== INFO SECTION (2-column layout) ====================
  // Left column: Tanggal, Jam, Shift
  // Right column: Perusahaan, Departemen, Lokasi
  const infoTableData = [
    ['Tanggal Pelaksanaan', data.session.tanggalPelaksanaan || '', 'Perusahaan', data.session.perusahaan || ''],
    ['Jam Pelaksanaan', data.session.jamPelaksanaan || '', 'Departemen', data.session.departemen || ''],
    ['Shift', data.session.shift || '', 'Lokasi', data.session.lokasi || '']
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
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255], halign: 'left' },
      1: { cellWidth: (pageWidth - (margin * 2)) / 2 - 50, halign: 'left' },
      2: { cellWidth: 50, fontStyle: 'bold', fillColor: [255, 255, 255], halign: 'left' },
      3: { cellWidth: (pageWidth - (margin * 2)) / 2 - 50, halign: 'left' },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 2; // Reduced gap

  // ==================== EMPLOYEE ROSTER COMPLIANCE TABLE ====================
  // Template columns: NO | Nama-NIK | No lambung | Apakah roster driver sudah sesuai (Ya/Tidak split) | Keterangan
  const tableHeaders = [
    [
      { content: 'NO', rowSpan: 2 },
      { content: 'Nama-NIK\n(contoh : Gede – C-024955)', rowSpan: 2 },
      { content: 'No lambung\n(contoh : RBT 4023)', rowSpan: 2 },
      { content: 'Apakah roster driver sudah sesuai', colSpan: 2 },
      { content: 'Keterangan', rowSpan: 2 }
    ],
    ['Ya', 'Tidak']
  ];

  const tableData = data.records.map((record, index) => [
    (index + 1).toString(),
    `${record.nama}\n${record.nik}`,
    record.nomorLambung || '-',
    record.rosterSesuai ? '\u2713' : '', // Ya column
    record.rosterSesuai ? '' : '\u2713', // Tidak column
    record.keterangan || '',
  ]);

  // Calculate exact available width for table
  const availableWidth = pageWidth - (margin * 2); // 277mm

  autoTable(pdf, {
    startY: yPosition,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    tableWidth: availableWidth,
    styles: {
      fontSize: 6,
      cellPadding: 0.5,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      minCellHeight: 6.5, // Increased row height for better readability (like Fatigue)
    },
    headStyles: {
      fillColor: [220, 220, 220], // Gray background like template
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.2,
      fontSize: 6,
      cellPadding: 0.5,
    },
    columnStyles: {
      // Total = 277mm, now with 6 columns (Ya/Tidak split)
      0: { cellWidth: 12 }, // NO
      1: { cellWidth: 75, halign: 'left', fontSize: 5.5 }, // Nama-NIK (wider for combined field)
      2: { cellWidth: 30 }, // No lambung
      3: { cellWidth: 45 }, // Ya column (half of previous 90mm)
      4: { cellWidth: 45 }, // Tidak column (half of previous 90mm)
      5: { cellWidth: 70, halign: 'left' }, // Keterangan
    },
    margin: { left: margin, right: margin },
    didDrawCell: (cellData) => {
      // Draw checkmark manually for Ya column (3) and Tidak column (4)
      if ((cellData.column.index === 3 || cellData.column.index === 4) && cellData.section === 'body') {
        const cellText = cellData.cell.text[0];
        if (cellText === '\u2713' || cellText === '✓') {
          // Draw checkmark manually
          const x = cellData.cell.x + cellData.cell.width / 2;
          const y = cellData.cell.y + cellData.cell.height / 2;
          const size = 1.8;

          pdf.setLineWidth(0.3);
          pdf.setDrawColor(0, 0, 0);

          // First line: bottom-left to middle
          pdf.line(x - size, y, x - size / 3, y + size);
          // Second line: middle to top-right
          pdf.line(x - size / 3, y + size, x + size, y - size);
        }
      }
    }
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 1.5; // Reduced gap to observer section

  // ==================== OBSERVER SIGNATURES ====================
  // Disable new page - always fit on single page
  // Create table for observers (6 positions in 3 rows x 2 columns)
  // Row 1: Observer 1 (left) | Observer 4 (right)
  // Row 2: Observer 2 (left) | Observer 5 (right)
  // Row 3: Observer 3 (left) | Observer 6 (right)
  const observerTableData = [
    [
      '1.', data.observers[0]?.nama || '', data.observers[0]?.perusahaan || '', '',
      '4.', data.observers[3]?.nama || '', data.observers[3]?.perusahaan || '', ''
    ],
    [
      '2.', data.observers[1]?.nama || '', data.observers[1]?.perusahaan || '', '',
      '5.', data.observers[4]?.nama || '', data.observers[4]?.perusahaan || '', ''
    ],
    [
      '3.', data.observers[2]?.nama || '', data.observers[2]?.perusahaan || '', '',
      '6.', data.observers[5]?.nama || '', data.observers[5]?.perusahaan || '', ''
    ]
  ];

  autoTable(pdf, {
    startY: yPosition,
    head: [[
      'NO', 'NAMA', 'PERUSAHAAN', 'TANDA TANGAN',
      'NO', 'NAMA', 'PERUSAHAAN', 'TANDA TANGAN'
    ]],
    body: observerTableData,
    theme: 'grid',
    tableWidth: pageWidth - (margin * 2),
    styles: {
      fontSize: 6.5,
      cellPadding: 0.8,
      halign: 'left',
      valign: 'middle',
      minCellHeight: 8, // Reduced observer row height for compact layout (like Fatigue)
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 0.8,
      minCellHeight: 8,
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' }, // NO (left)
      1: { cellWidth: 69, halign: 'left' }, // NAMA (left)
      2: { cellWidth: 32, halign: 'left' }, // JABATAN (left)
      3: { cellWidth: 26, halign: 'center' }, // TANDA TANGAN (left)
      4: { cellWidth: 11, halign: 'center' }, // NO (right)
      5: { cellWidth: 69, halign: 'left' }, // NAMA (right)
      6: { cellWidth: 32, halign: 'left' }, // JABATAN (right)
      7: { cellWidth: 26, halign: 'center' }, // TANDA TANGAN (right)
    },
    didDrawCell: (cellData) => {
      // Add signature images to TANDA TANGAN columns (columns 3 and 7)
      if ((cellData.column.index === 3 || cellData.column.index === 7) && cellData.section === 'body') {
        const rowIndex = cellData.row.index; // 0, 1, or 2
        // Column 3 = left observer (0, 1, 2), Column 7 = right observer (3, 4, 5)
        const observerIndex = cellData.column.index === 3 ? rowIndex : rowIndex + 3;
        const observer = data.observers[observerIndex];

        if (observer?.signatureDataUrl) {
          try {
            const format = observer.signatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
            const cellX = cellData.cell.x;
            const cellY = cellData.cell.y;
            const cellWidth = cellData.cell.width;
            const cellHeight = cellData.cell.height;

            pdf.addImage(
              observer.signatureDataUrl,
              format,
              cellX + 1,
              cellY + 1,
              cellWidth - 2,
              cellHeight - 2,
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

  // Add page footer with date and page number
  const finalY = (pdf as any).lastAutoTable.finalY;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Januari 2020/R0', margin, pageHeight - 5);
  pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 5, { align: 'right' });

  return pdf;
}

// ============================================
// JPG EXPORT FOR SIDAK ROSTER
// Using PDF.js with bundled worker (same approach as Fatigue)
// ============================================
export async function downloadSidakRosterAsJpg(data: SidakRosterData, filename: string): Promise<void> {
  // Guard against server-side execution (SSR/Node.js)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('JPG download can only be executed in browser environment');
  }

  try {
    // Import PDF.js (Vite compatible)
    const pdfjsLib = await import('pdfjs-dist');

    // Import bundled worker as URL (Vite will handle this properly)
    const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

    // Configure PDF.js to use bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

    // Generate the PDF
    const pdf = await generateSidakRosterPdf(data);

    // Get PDF as array buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');

    // Load PDF with PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
    const pdfDocument = await loadingTask.promise;

    // Get the first page
    const page = await pdfDocument.getPage(1);

    // Set render scale for high quality (2-3x for crisp output)
    const scale = 2.5;
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render PDF page to canvas
    const renderContext = {
      canvas,
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext as any).promise;

    // Convert canvas to JPG blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create JPG blob'));
            return;
          }

          // Download
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
        0.95 // 95% quality
      );
    });
  } catch (error) {
    throw new Error(`Failed to generate JPG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
