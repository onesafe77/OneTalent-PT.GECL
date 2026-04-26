import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  name: string;
  position?: string;
  department?: string;
}

interface MeetingAttendance {
  id: string;
  meetingId: string;
  employeeId: string | null;
  scanTime: string;
  scanDate: string;
  deviceInfo?: string | null;
  attendanceType: string;
  manualName?: string | null;
  manualNik?: string | null;
  manualPosition?: string | null;
  manualDepartment?: string | null;
  manualSignature?: string | null;
  employee?: Employee;
}

interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organizer: string;
  status: string;
  meetingPhotos?: string[] | null;
}

interface MeetingAttendanceData {
  meeting: Meeting;
  attendance: MeetingAttendance[];
  totalAttendees: number;
}

// Helper function to convert image URL to base64 with format detection
async function imageUrlToBase64(url: string): Promise<{ data: string; format: 'JPEG' | 'PNG' }> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const mimeType = blob.type;

    // Detect format from MIME type
    let format: 'JPEG' | 'PNG' = 'JPEG';
    if (mimeType === 'image/png') {
      format = 'PNG';
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      format = 'JPEG';
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        data: reader.result as string,
        format
      });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Helper function to add meeting photos page - 2 FOTO LANDSCAPE PER HALAMAN
async function addMeetingPhotosPages(pdf: jsPDF, photoUrls: string[]): Promise<void> {
  // Split photos into groups of 2 (2 photos per page)
  const photosPerPage = 2;
  const photoGroups: string[][] = [];

  for (let i = 0; i < photoUrls.length; i += photosPerPage) {
    photoGroups.push(photoUrls.slice(i, i + photosPerPage));
  }

  // Get base page number before adding photo pages
  const basePage = pdf.getNumberOfPages();

  // Process each group on a separate page
  for (let groupIndex = 0; groupIndex < photoGroups.length; groupIndex++) {
    const group = photoGroups[groupIndex];

    // Add new page in landscape orientation
    pdf.addPage('landscape');

    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15; // Margin minimal untuk maksimalkan foto

    // ==================== HEADER SECTION ====================
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(220, 38, 38); // Red color
    pdf.text('Foto Meeting', pageWidth / 2, margin + 8, { align: 'center' });

    // Underline dengan garis merah
    pdf.setLineWidth(2);
    pdf.setDrawColor(220, 38, 38);
    pdf.line(margin + 50, margin + 12, pageWidth - margin - 50, margin + 12);

    const yStart = margin + 28; // Start position untuk foto (lebih rapat ke header)

    // ==================== LAYOUT 2 FOTO VERTIKAL (ATAS-BAWAH) ====================
    // Calculate dimensions untuk 2 foto vertikal dalam A4 landscape
    const spaceBetween = 8; // Jarak tipis antar foto (atas-bawah)
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = pageHeight - yStart - margin;

    // Lebar penuh untuk setiap foto
    const maxPhotoWidth = availableWidth;

    // Calculate slot height untuk setiap foto
    const slotHeight = (availableHeight - spaceBetween) / 2;

    // Process each photo in the group (max 2)
    for (let index = 0; index < group.length; index++) {
      const photoUrl = group[index];

      try {
        // Load and convert image to base64 with format detection
        const { data: base64Image, format } = await imageUrlToBase64(photoUrl);

        // Get image properties
        const imageProps = pdf.getImageProperties(base64Image);
        const aspectRatio = imageProps.width / imageProps.height;

        // Calculate optimal dimensions dengan aspect ratio terjaga
        // Start dengan lebar penuh
        let finalWidth = maxPhotoWidth;
        let finalHeight = finalWidth / aspectRatio;

        // Jika tinggi melebihi slot height, scale down berdasarkan tinggi
        if (finalHeight > slotHeight) {
          finalHeight = slotHeight;
          finalWidth = finalHeight * aspectRatio;
        }

        // Calculate slot top position untuk foto ini
        const slotTop = yStart + (index * (slotHeight + spaceBetween));

        // Center foto secara vertikal dalam slot
        const photoY = slotTop + (slotHeight - finalHeight) / 2;

        // Center foto secara horizontal
        const photoX = margin + (maxPhotoWidth - finalWidth) / 2;

        // Add image to PDF with detected format (JPEG or PNG)
        pdf.addImage(base64Image, format, photoX, photoY, finalWidth, finalHeight);

        // Add border around image untuk tampilan professional
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.8);
        pdf.rect(photoX, photoY, finalWidth, finalHeight);

      } catch (error) {
        console.error('Error adding image to PDF:', error);

        // Add placeholder jika foto gagal dimuat
        const slotTop = yStart + (index * (slotHeight + spaceBetween));
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, slotTop, maxPhotoWidth, slotHeight, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Gambar tidak dapat dimuat', pageWidth / 2, slotTop + slotHeight / 2, { align: 'center' });
      }
    }

    // Add page footer
    const footerY = pageHeight - 20;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Halaman ${basePage + groupIndex + 1}`, pageWidth / 2, footerY, { align: 'center' });
  }
}

export async function generateMeetingAttendancePDF(data: MeetingAttendanceData): Promise<void> {
  console.log('Starting PDF generation with data:', {
    meeting: data.meeting.title,
    attendanceCount: data.attendance.length,
    totalAttendees: data.totalAttendees
  });

  try {
    // Validate data first
    if (!data || !data.meeting) {
      throw new Error('Data meeting tidak valid');
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const currentDateTime = new Date();

    // ==================== MODERN HEADER SECTION ====================
    // Clean background with subtle shadow effect
    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, pageWidth, 50, 'F');

    // Company branding area - subtle
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text('PT. GECL - Sistem Manajemen Meeting', margin, 12);

    // Print timestamp - top right, modern styling
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Dicetak pada: ${currentDateTime.toLocaleDateString('id-ID')} ${currentDateTime.toLocaleTimeString('id-ID')}`, pageWidth - margin, 12, { align: 'right' });

    // Main title - MODERN & BOLD with shadow effect
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 38, 38); // Modern red
    pdf.text('LAPORAN KEHADIRAN MEETING', pageWidth / 2, 32, { align: 'center' });

    // Elegant underline - single bold line
    pdf.setLineWidth(2);
    pdf.setDrawColor(220, 38, 38); // Modern red
    pdf.line(margin + 30, 37, pageWidth - margin - 30, 37);

    // Subtle accent line
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(156, 163, 175); // Cool gray
    pdf.line(margin, 42, pageWidth - margin, 42);

    // ==================== MODERN INFORMATION CARD ====================
    let yPosition = 58;
    const cardHeight = 65;
    const cardMargin = margin + 5;
    const cardWidth = pageWidth - 2 * cardMargin;

    // Modern card with shadow effect
    pdf.setFillColor(248, 249, 250);
    pdf.rect(cardMargin, yPosition, cardWidth, cardHeight, 'F');

    // Subtle border with modern styling
    pdf.setLineWidth(0.8);
    pdf.setDrawColor(229, 231, 235);
    pdf.rect(cardMargin, yPosition, cardWidth, cardHeight, 'S');

    // Left accent line - modern red
    pdf.setLineWidth(4);
    pdf.setDrawColor(220, 38, 38);
    pdf.line(cardMargin, yPosition, cardMargin, yPosition + cardHeight);

    // Modern header section
    pdf.setFillColor(220, 38, 38);
    pdf.rect(cardMargin + 1, yPosition + 1, cardWidth - 2, 18, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('INFORMASI MEETING', cardMargin + 10, yPosition + 12);

    // Content area with proper spacing
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    yPosition += 25;
    const lineHeight = 8;

    const meetingDate = new Date(data.meeting.date);

    // Compact 2-column layout
    const leftColX = cardMargin + 10;
    const rightColX = cardMargin + cardWidth / 2 + 5;

    // Left column - compact styling
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Judul Meeting', leftColX, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(data.meeting.title.length > 30 ? data.meeting.title.substring(0, 27) + '...' : data.meeting.title, leftColX, yPosition + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Tanggal', leftColX, yPosition + lineHeight * 2);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(meetingDate.toLocaleDateString('id-ID'), leftColX, yPosition + lineHeight * 2 + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Waktu', leftColX, yPosition + lineHeight * 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(`${data.meeting.startTime} - ${data.meeting.endTime}`, leftColX, yPosition + lineHeight * 4 + 5);

    // Right column
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Lokasi', rightColX, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(data.meeting.location, rightColX, yPosition + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Penyelenggara', rightColX, yPosition + lineHeight * 2);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(31, 41, 55);
    pdf.text(data.meeting.organizer, rightColX, yPosition + lineHeight * 2 + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Total Peserta Hadir', rightColX, yPosition + lineHeight * 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(220, 38, 38);
    pdf.text(`${data.totalAttendees} orang`, rightColX, yPosition + lineHeight * 4 + 5);

    yPosition += cardHeight + 18;

    // ==================== CLEAN TABLE SECTION ====================
    // Simple section header
    pdf.setFillColor(249, 250, 251);
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 18, 'F');

    // Left accent line
    pdf.setLineWidth(3);
    pdf.setDrawColor(220, 38, 38);
    pdf.line(margin, yPosition - 5, margin, yPosition + 13);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(220, 38, 38);
    pdf.text('DAFTAR KEHADIRAN', margin + 8, yPosition + 6);

    // Compact participant count badge
    pdf.setFillColor(220, 38, 38);
    pdf.roundedRect(pageWidth - margin - 55, yPosition - 2, 45, 10, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${data.totalAttendees} Peserta`, pageWidth - margin - 52, yPosition + 3);

    yPosition += 20;

    if (data.attendance && data.attendance.length > 0) {
      console.log(`📊 PDF: Processing ${data.attendance.length} attendance records for table`);

      const tableData = data.attendance.map((attendance, index) => {
        const row = [
          (index + 1).toString(), // Simple number format
          attendance.attendanceType === 'manual_entry' ? (attendance.manualNik || '-') : (attendance.employee?.id || '-'),
          attendance.attendanceType === 'manual_entry' ? (attendance.manualName || '-') : (attendance.employee?.name || 'Unknown'),
          attendance.attendanceType === 'manual_entry' ? (attendance.manualPosition || '-') : (attendance.employee?.position || '-'),
          attendance.attendanceType === 'manual_entry' ? (attendance.manualDepartment || '-') : (attendance.employee?.department || '-'),
          new Date(attendance.scanDate).toLocaleDateString('id-ID'),
          attendance.scanTime ? `${attendance.scanTime} WITA` : '-' // Single line format
        ];
        console.log(`📝 Row ${index + 1}:`, row);
        return row;
      });

      console.log(`✅ PDF: Created ${tableData.length} rows for table`);

      autoTable(pdf, {
        head: [['NO', 'NIK', 'Nama Karyawan', 'Position', 'Department', 'Tanggal', 'Waktu']],
        body: tableData,
        startY: yPosition,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 3,
          lineColor: [229, 231, 235],
          lineWidth: 0.3,
          font: 'helvetica',
          textColor: [55, 65, 81],
          minCellHeight: 12,
          valign: 'middle',
          overflow: 'hidden',
          halign: 'center' // Default alignment untuk semua cell
        },
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          cellPadding: 3,
          minCellHeight: 12,
          lineWidth: 0.5,
          lineColor: [180, 30, 30],
          overflow: 'hidden'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', valign: 'middle' },  // NO
          1: { cellWidth: 20, halign: 'center', valign: 'middle' }, // NIK
          2: { cellWidth: 40, halign: 'left', valign: 'middle', cellPadding: { left: 2, right: 2 } },   // Nama Karyawan
          3: { cellWidth: 25, halign: 'left', valign: 'middle', cellPadding: { left: 2, right: 2 } },   // Position
          4: { cellWidth: 30, halign: 'left', valign: 'middle', cellPadding: { left: 2, right: 2 } },   // Department
          5: { cellWidth: 20, halign: 'center', valign: 'middle' }, // Tanggal
          6: { cellWidth: 25, halign: 'center', valign: 'middle' }  // Waktu
        },
        margin: { left: margin, right: margin },
        tableWidth: 172, // Total column width: 12+20+40+25+30+20+25 = 172
        showHead: 'everyPage'
      });
    } else {
      // Modern empty state message
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'F');
      pdf.setLineWidth(1);
      pdf.setDrawColor(229, 231, 235);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'S');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Belum ada peserta yang hadir pada meeting ini.', pageWidth / 2, yPosition + 18, { align: 'center' });
    }

    // ==================== MODERN FOOTER SECTION ====================
    const footerY = pageHeight - 40;

    // Clean footer background
    pdf.setFillColor(249, 250, 251);
    pdf.rect(0, footerY - 10, pageWidth, 50, 'F');

    // Elegant separator line
    pdf.setLineWidth(1);
    pdf.setDrawColor(220, 38, 38);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Modern footer text - left aligned
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Laporan dibuat oleh Sistem Manajemen Meeting PT.GECL', margin, footerY + 5);

    // Print timestamp - right aligned as requested
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Dicetak pada: ${currentDateTime.toLocaleDateString('id-ID')} ${currentDateTime.toLocaleTimeString('id-ID')}`, pageWidth - margin, footerY + 5, { align: 'right' });

    // Modern signature area - simplified and elegant
    const signatureX = pageWidth - 100;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.text('Mengetahui,', signatureX, footerY + 15);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Penyelenggara Meeting', signatureX, footerY + 22);

    // Clean signature line
    pdf.setLineWidth(0.8);
    pdf.setDrawColor(156, 163, 175);
    pdf.line(signatureX, footerY + 30, signatureX + 70, footerY + 30);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    pdf.text(`(${data.meeting.organizer})`, signatureX + 5, footerY + 37);

    // ==================== ADD MEETING PHOTOS (AFTER ATTENDANCE LIST) ====================
    // Check if meeting has photos and add them after attendance list
    if (data.meeting.meetingPhotos && data.meeting.meetingPhotos.length > 0) {
      console.log(`Adding ${data.meeting.meetingPhotos.length} meeting photos to PDF`);
      await addMeetingPhotosPages(pdf, data.meeting.meetingPhotos);
    }

    // Generate professional filename
    const dateStr = meetingDate.toISOString().split('T')[0];
    const titleStr = (data.meeting.title || 'meeting').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `Laporan-Kehadiran-Meeting-${titleStr}-${dateStr}.pdf`;

    console.log('PDF generation completed, saving as:', filename);
    pdf.save(filename);

  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw new Error(`Gagal membuat PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateBIBAttendancePDF(data: MeetingAttendanceData & { agenda?: string; pemateri?: string }): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.width;   // 210mm
  const H = pdf.internal.pageSize.height;  // 297mm
  const L = 13; // left margin (outer border)
  const R = 13; // right margin
  const innerW = W - L - R; // 184mm

  const meetingDate = new Date(data.meeting.date);
  const dateStr = meetingDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = `${data.meeting.startTime} - ${data.meeting.endTime} WITA`;

  pdf.setDrawColor(0, 0, 0);
  pdf.setTextColor(0, 0, 0);

  // ── OUTER BORDER ────────────────────────────────────────────────────────────
  pdf.setLineWidth(0.8);
  pdf.rect(L, 13, innerW, H - 26);

  let y = 13; // current Y position (top of outer border)

  // ── HEADER ROW (logo | doc code) ─────────────────────────────────────────────
  const headerH = 16;
  const logoW = 60;

  // Vertical divider between logo and doc code
  pdf.setLineWidth(0.4);
  pdf.line(L + logoW, y, L + logoW, y + headerH);
  // Bottom of header
  pdf.line(L, y + headerH, L + innerW, y + headerH);

  // ── LOGO MARK (drawn geometric BIB mark, left of text) ──────────────────────
  const lx = L + 3;   // logo mark X
  const ly = y + 2.5; // logo mark Y
  const lw = 12;      // logo mark width
  const lh = 11;      // logo mark height

  // Outer black square
  pdf.setFillColor(0, 0, 0);
  pdf.rect(lx, ly, lw, lh, 'F');

  // Inner white stripes to simulate the BIB logo style
  pdf.setFillColor(255, 255, 255);
  pdf.rect(lx + 1.5, ly + 1.5, 4, 3, 'F');
  pdf.rect(lx + 1.5, ly + 6.5, 4, 3, 'F');
  pdf.rect(lx + 6.5, ly + 1.5, 4, 3, 'F');
  pdf.rect(lx + 6.5, ly + 6.5, 4, 3, 'F');

  // PT BORNEO INDOBARA text beside the logo mark
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('PT BORNEO INDOBARA', lx + lw + 2, ly + 7);

  // Document code (right side)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('BIB \u2013 HSE \u2013 ES \u2013 F \u2013 1.04 \u2013 01', L + innerW - 2, y + 5, { align: 'right' });
  pdf.text('Feb 2018/R1   Page 1 of 1', L + innerW - 2, y + 10.5, { align: 'right' });

  y += headerH;

  // ── TITLE BLOCK ─────────────────────────────────────────────────────────────
  const titleH = 16;
  // bottom border
  pdf.setLineWidth(0.4);
  pdf.line(L, y + titleH, L + innerW, y + titleH);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('DAFTAR HADIR', W / 2, y + 9, { align: 'center' });

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  pdf.text(
    'Isilah form daftar hadir ini dengan lengkap sebagai bukti pelibatan personil dalam penerapan SMKPLH di PT Borneo Indobara',
    W / 2, y + 14, { align: 'center' }
  );

  y += titleH;

  // ── CHECKBOX SECTION ─────────────────────────────────────────────────────────
  // 3 rows × 3 cols, each row height ~7mm, total ~21mm
  const cbRowH = 7;
  const cbRows = [
    ['Komunikasi KP (Safety Talk)', 'Rapat Kordinasi / Komite KP', 'Audit internal / eksternal'],
    ['Penyelidikan Insiden', 'Sosialisasi Prosedur / Kebijakan', 'Partisipasi & Konsultasi'],
    ['Pendidikan & Pelatihan', 'Induksi Keselamatan Pertambangan', '. . . . . . . . . . . . . . . . . . . . . .'],
  ];
  const colW = innerW / 3;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setLineWidth(0.3);

  cbRows.forEach((row, ri) => {
    const rowY = y + ri * cbRowH;
    // bottom border per row
    if (ri < 2) pdf.line(L, rowY + cbRowH, L + innerW, rowY + cbRowH);
    row.forEach((label, ci) => {
      const cellX = L + ci * colW;
      // right border (not last col)
      if (ci < 2) pdf.line(cellX + colW, rowY, cellX + colW, rowY + cbRowH);
      // checkbox square
      const bx = cellX + 4;
      const by = rowY + 2;
      pdf.rect(bx, by, 3.5, 3.5);
      // label
      pdf.text(label, bx + 5, rowY + 5.5);
    });
  });

  y += cbRowH * 3;

  // bottom border after checkboxes (already drawn last row)
  pdf.setLineWidth(0.4);
  pdf.line(L, y, L + innerW, y);

  // ── INFO FIELDS TABLE ────────────────────────────────────────────────────────
  // 4 rows: Agenda, Pemateri, Hari/Tanggal/Waktu, Tempat
  const infoRows = [
    ['Agenda', data.agenda || data.meeting.description || ''],
    ['Pemateri', data.pemateri || data.meeting.organizer || ''],
    ['Hari / Tanggal / Waktu', `${dateStr} / ${timeStr}`],
    ['Tempat', data.meeting.location || ''],
  ];
  const infoRowH = 7;
  const labelColW = 40;

  pdf.setLineWidth(0.3);
  infoRows.forEach(([label, value], ri) => {
    const rowY = y + ri * infoRowH;
    // divider between label and value
    pdf.line(L + labelColW, rowY, L + labelColW, rowY + infoRowH);
    // bottom border
    pdf.line(L, rowY + infoRowH, L + innerW, rowY + infoRowH);

    // label bold
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(label, L + 2, rowY + 5);

    // value normal
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const maxLen = innerW - labelColW - 4;
    const truncated = pdf.splitTextToSize(value, maxLen)[0] || '';
    pdf.text(truncated, L + labelColW + 2, rowY + 5);
  });

  y += infoRowH * 4;

  // ── ATTENDANCE TABLE ─────────────────────────────────────────────────────────
  const minRows = 20;
  const attendanceRows = (data.attendance || []).map((att, idx) => [
    (idx + 1).toString(),
    att.attendanceType === 'manual_entry' ? (att.manualName || '') : (att.employee?.name || ''),
    att.attendanceType === 'manual_entry' ? (att.manualPosition || '') : (att.employee?.position || ''),
    att.attendanceType === 'manual_entry' ? (att.manualDepartment || '') : (att.employee?.department || ''),
    '',
  ]);
  const emptyCount = Math.max(0, minRows - attendanceRows.length);
  const emptyRows = Array.from({ length: emptyCount }, (_, i) => [
    (attendanceRows.length + i + 1).toString(), '', '', '', ''
  ]);
  const tableData = [...attendanceRows, ...emptyRows];

  // Calculate row height to fill remaining page space
  const remainingH = H - 13 - y; // from y to bottom border
  const rowHeight = Math.max(7, Math.floor((remainingH - 8) / (tableData.length + 1))); // +1 for header

  autoTable(pdf, {
    head: [['No', 'NAMA', 'JABATAN', 'DEPT / PERUSAHAAN', 'TANDA TANGAN']],
    body: tableData,
    startY: y,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      font: 'helvetica',
      textColor: [0, 0, 0],
      minCellHeight: rowHeight,
      valign: 'middle',
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.4,
      lineColor: [0, 0, 0],
      minCellHeight: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55, halign: 'left' },
      2: { cellWidth: 38, halign: 'left' },
      3: { cellWidth: 50, halign: 'left' },
      4: { cellWidth: 31, halign: 'center' },
    },
    margin: { left: L, right: R },
    tableWidth: innerW,
    showHead: 'firstPage',
    didDrawCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const att = (data.attendance || [])[hookData.row.index];
        if (att && att.manualSignature) {
          try {
            const { x, y: cy, width, height } = hookData.cell;
            const pad = 1.5;
            pdf.addImage(att.manualSignature, 'PNG', x + pad, cy + pad, width - pad * 2, height - pad * 2);
          } catch (_) { /* skip */ }
        }
      }
    },
  });

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Feb 2018/R1', L, H - 8);
  pdf.text('Page 1 of 1', L + innerW, H - 8, { align: 'right' });

  // Save
  const titleStr = (data.meeting.title || 'meeting').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const dateFile = meetingDate.toISOString().split('T')[0];
  pdf.save(`Daftar-Hadir-BIB-${titleStr}-${dateFile}.pdf`);
}

function getMeetingStatusLabel(status: string): string {
  const statusLabels: { [key: string]: string } = {
    scheduled: 'Terjadwal',
    ongoing: 'Berlangsung',
    completed: 'Selesai',
    cancelled: 'Dibatalkan'
  };
  return statusLabels[status] || status;
}

function getShortDeviceInfo(deviceInfo: string): string {
  // Extract browser name and OS from user agent string
  if (deviceInfo.includes('Chrome')) return 'Chrome';
  if (deviceInfo.includes('Firefox')) return 'Firefox';
  if (deviceInfo.includes('Safari')) return 'Safari';
  if (deviceInfo.includes('Edge')) return 'Edge';
  if (deviceInfo.includes('Mobile')) return 'Mobile';
  if (deviceInfo.includes('Android')) return 'Android';
  if (deviceInfo.includes('iPhone')) return 'iPhone';
  return 'Other';
}

export function generateMeetingQRCodePDF(meeting: Meeting, qrDataURL: string): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;

  // Header
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('QR CODE MEETING', pageWidth / 2, 40, { align: 'center' });

  // Meeting info
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(meeting.title, pageWidth / 2, 60, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');

  let yPos = 80;
  pdf.text(`Tanggal: ${new Date(meeting.date).toLocaleDateString('id-ID')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  pdf.text(`Waktu: ${meeting.startTime} - ${meeting.endTime}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  pdf.text(`Lokasi: ${meeting.location}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 30;

  // QR Code
  if (qrDataURL) {
    const qrSize = 120;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = yPos;

    pdf.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize);
    yPos += qrSize + 20;
  }

  // Instructions
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CARA ABSENSI:', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const instructions = [
    '1. Buka halaman "Scan QR Meeting" di aplikasi atau browser mobile',
    '2. Masukkan NIK karyawan pada form yang tersedia',
    '3. Tekan tombol "Mulai Scan QR Code" untuk mengaktifkan kamera',
    '4. Arahkan kamera ke QR code di atas hingga berhasil terbaca',
    '5. Sistem akan otomatis mencatat kehadiran Anda di meeting ini'
  ];

  instructions.forEach((instruction, index) => {
    pdf.text(instruction, margin, yPos + (index * 8));
  });

  // Footer
  const footerY = pageHeight - 30;
  pdf.setFontSize(8);
  pdf.text(`Meeting ID: ${meeting.id}`, margin, footerY);
  pdf.text(`Generated: ${new Date().toLocaleString('id-ID')}`, pageWidth - margin, footerY, { align: 'right' });

  // Generate filename
  const meetingDate = new Date(meeting.date).toISOString().split('T')[0];
  const meetingTitle = meeting.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const filename = `meeting-qr-${meetingTitle}-${meetingDate}.pdf`;

  // Download PDF
  pdf.save(filename);
}