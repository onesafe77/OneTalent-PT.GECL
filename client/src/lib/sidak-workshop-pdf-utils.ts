import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// SIDAK WORKSHOP EQUIPMENT INSPECTION PDF GENERATOR
// Document Code: GECL - HSE - ES - F - 3.02 - 87
// Revision: April 2025/R0
// Portrait format, 3 pages
// ============================================

// Interface compatible with both form data and API response
export interface WorkshopPDFData {
    session: {
        tanggal: string;
        namaWorkshop: string;
        lokasi: string;
        penanggungJawabArea: string;
    };
    // Support both naming conventions (equipment or records from API)
    equipment?: Array<{
        equipmentType: string;
        noRegisterPeralatan: string;
        inspectionResults: Record<string, string>;
        tindakLanjutPerbaikan: string;
        dueDate: string;
    }>;
    records?: Array<{
        equipmentType: string;
        noRegisterPeralatan: string;
        inspectionResults: Record<string, string>;
        tindakLanjutPerbaikan: string;
        dueDate: string;
    }>;
    // Support both naming conventions (inspectors or observers from API)
    inspectors?: Array<{
        nama: string;
        perusahaan: string;
        tandaTangan: string;
    }>;
    observers?: Array<{
        nama: string;
        perusahaan: string;
        tandaTangan: string;
    }>;
}

// Helper to normalize equipment type keys (HYDRAULIC_JACK -> HYDRAULIC JACK)
function normalizeEquipmentType(type: string): string {
    return type.replace(/_/g, ' ');
}

// Equipment inspection items by category - UPDATED to match official GECL template (April 2025/R0)
// IDs match the form component for consistency
const EQUIPMENT_ITEMS: Record<string, { id: string; description: string }[]> = {
    'APAR': [
        { id: '1.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '1.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '1.3', description: 'Apakah Kondisi tabung bagus, Tidak retak, Bersih dan tidak corrosive?' },
        { id: '1.4', description: 'Apakah selang ada, Kondisinya normal, tidak putus dan tidak tersumbat?' },
        { id: '1.5', description: 'Apakah pin pengunci ada?' },
        { id: '1.6', description: 'Apakah kondisi handle normal dan tidak corrosive?' },
        { id: '1.7', description: 'Apakah jarum penunjuk tekanan pressure dalam kondisi normal?' },
        { id: '1.8', description: 'Tekanan gas sesuai, Tidak low atau over pressure?' },
        { id: '1.9', description: 'Apakah bracket penahan APAR dalam kondisi bagus?' },
        { id: '1.10', description: 'Apakah ada tanda stiker APAR?' },
        { id: '1.11', description: 'Apakah APAR tidak terhalang benda-benda lain?' }
    ],
    'COMPRESSOR': [
        { id: '2.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '2.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '2.3', description: 'Apakah kondisi Permukaan oli compressor aman?' },
        { id: '2.4', description: 'Apakah tidak terdapat Kebocoran oli compressor?' },
        { id: '2.5', description: 'Apakah Kondisi fan belt compressor ada tanda-tanda keausan (retak)?' },
        { id: '2.6', description: 'Apakah Baut pengikat compressor aman dan tidak longgar?' },
        { id: '2.7', description: 'Apakah Kondisi cable instalasi listrik ada yang terkelupas?' },
        { id: '2.8', description: 'Apakah kelistrikan dari system kinerja air compressor berfungsi?' },
        { id: '2.9', description: 'Apakah tidak terdapat Keretakan structural?' },
        { id: '2.10', description: 'Apakah kondisi tekanan angin sesuai?' },
        { id: '2.11', description: 'Apakah kondisi kran pengaman tabung aman?' },
        { id: '2.12', description: 'Apakah terdapat kebocoran selang compressor?' },
        { id: '2.13', description: 'Kondisi Switch ON/OF berfungsi normal?' },
        { id: '2.14', description: 'Lakukan pembuangan air pada penampungan tabung udara Pada bagian bawah tabung?' },
        { id: '2.15', description: 'Apakah guard pengaman pulley compressor terpasang dan tersedia?' }
    ],
    'IMPACT': [
        { id: '3.1.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '3.1.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '3.1.3', description: 'Apakah tidak ada keretakan pada bagian Impact? (visual check)' },
        { id: '3.1.4', description: 'Apakah tidak ada kerusakan pada bagian adaptor angin?' },
        { id: '3.1.5', description: 'Apakah valve switch putaran kanan dan kiri berfungsi dengan baik?' },
        { id: '3.1.6', description: 'Apakah selang supply untuk angin tidak ada kebocoran dan kerusakan?' },
        { id: '3.1.7', description: 'Apakah setelan torsi berfungsi dengan baik?' }
    ],
    'HYDRAULIC JACK': [
        { id: '4.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '4.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '4.3', description: 'Apakah tidak terdapat rembesan oli hydraulic pada body jack?' },
        { id: '4.4', description: 'Apakah kondisi pompa hydraulic jack berfungsi dengan baik?' },
        { id: '4.5', description: 'Apakah valve pengunci hydraulic masih berfungsi dengan baik?' },
        { id: '4.6', description: 'Apakah cylinder rod jack tidak ada yang tergores atau rusak?' },
        { id: '4.7', description: 'Apakah label SWL masih terlihat dengan jelas?' },
        { id: '4.8', description: 'Apakah stang jack tersedia dan tidak terdapat kebocoran?' }
    ],
    'GERINDA': [
        { id: '5.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '5.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '5.3', description: 'Apakah Pengunci pada mata gerinder dalam kondisi baik (Tidak Patah, Longgar)?' },
        { id: '5.4', description: 'Apakah Control Switch ON/OfF pada grinder Berfungsi Dengan Baik?' },
        { id: '5.5', description: 'Apakah kabel dalam kondisi baik? (Tidak Sobek, Terkelupas)' },
        { id: '5.6', description: 'Apakah Socket kabel Grinder Dalam kondisi baik?' },
        { id: '5.7', description: 'Apakah tutup/pelindung mata grinder masih terpasang dengan baik?' },
        { id: '5.8', description: 'Apakah mesin grinder berfungsi dengan benar?' },
        { id: '5.9', description: 'Apakah kondisi kelayakan mata grinder masih baik?' }
    ],
    'HAMMER': [
        { id: '6.1', description: 'Apakah kondisi kepala palu layak? (tidak ada keretakan atau pecah pada bagian permukaan untuk memukul)' },
        { id: '6.2', description: 'Apakah kondisi permukaan kepala palu untuk bagian memukul rata?' },
        { id: '6.3', description: 'Apakah kondisi palu layak dan tidak di modifikasi?' },
        { id: '6.4', description: 'Apakah gagang palu dalam kondisi baik dan tidak patah?' },
        { id: '6.5', description: 'Apakah gagang palu terbuat dari fiber dan tidak licin?' },
        { id: '6.6', description: 'Apakah gagang palu tidak terbuat besi?' },
        { id: '6.7', description: 'Apakah kondisi kepala palu layak? (tidak ada keretakan atau pecah)' }
    ],
    'ENGINE WELDING': [
        { id: '7.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '7.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '7.3', description: 'Apakah Kondisi instalasi kabel mesin las layak?' },
        { id: '7.4', description: 'Apakah Kondisi kabel Las ada yang terkelupas?' },
        { id: '7.5', description: 'Apakah Kondisi stick Las layak?' },
        { id: '7.6', description: 'Apakah Kondisi Switch ON/OF berfungsi?' },
        { id: '7.7', description: 'Apakah Kondisi Alat pemadam api berfungsi?' },
        { id: '7.8', description: 'Apakah tersedia Apron, sarung tangan las, face shield (Topeng las), dan pelindung sepatu?' }
    ],
    'CUTTING TORCH': [
        { id: '8.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '8.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '8.3', description: 'Apakah kondisi tabung aman?' },
        { id: '8.4', description: 'Apakah kondisi baut katub tabung aman?' },
        { id: '8.5', description: 'Apakah kondisi regulator accetylin terpasang flash back arrestor dan tersedia putaran valve serta berfungsi dengan baik?' },
        { id: '8.6', description: 'Apakah kondisi regulator oksigen terpasang flash back arrestor dan tersedia putaran valve serta berfungsi dengan baik?' },
        { id: '8.7', description: 'Apakah ada keretakan kaca tekanan accetylin?' },
        { id: '8.8', description: 'Apakah ada keretakan kaca tekanan oksigen?' },
        { id: '8.9', description: 'Apakah kondisi katub pengaman aman?' },
        { id: '8.10', description: 'Apakah kondisi selang dan sambungan aman?' },
        { id: '8.11', description: 'Apakah kondisi alat pemotong sesuai?' },
        { id: '8.12', description: 'Apakah kondisi Pengaman tabung aman?' }
    ],
    'KERANGKENG': [
        { id: '9.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '9.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '9.3', description: 'Apakah tidak ada ada keretakan pada besi sangkar pengaman tyre?' },
        { id: '9.4', description: 'Apakah tidak ada ada keretakan terjadi pada dinding sangkar pengaman tyre?' },
        { id: '9.5', description: 'Apakah pengunci pintu sangkar pengaman tyre berfungsi dengan baik?' },
        { id: '9.6', description: 'Apakah tidak terdapat kebengkokan pada tiang penyanggah sangkar pengaman tyre?' },
        { id: '9.7', description: 'Apakah tiang penyangga sangkar pengaman tyre di kuatkan pada lantai bangunan?' },
        { id: '9.8', description: 'Apakah engsel pintu sangkar pengaman tyre tidak terdapat korosive atau berfungsi dengan baik?' }
    ],
    'GREASE GUN': [
        { id: '10.1', description: 'Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?' },
        { id: '10.2', description: 'Apakah tagging Masih Berlaku?' },
        { id: '10.3', description: 'Apakah kondisi tabung grease aman dan tidak terdapat kebocoran dan penyok?' },
        { id: '10.4', description: 'Apakah kondisi regulator sesuai?' },
        { id: '10.5', description: 'Apakah kondisi hose aman dan tidak bocor?' },
        { id: '10.6', description: 'Apakah kondisi stik grease aman?' },
        { id: '10.7', description: 'Apakah kondisi pompa grease aman?' },
        { id: '10.8', description: 'Apakah kondisi roda aman? Tidak pecah, macet?' },
        { id: '10.9', description: 'Apakah kondisi rakor/penampung air aman? Tidak bocor?' }
    ]
};

const EQUIPMENT_ORDER = [
    'APAR',
    'COMPRESSOR',
    'IMPACT',
    'HYDRAULIC JACK',
    'GERINDA',
    'HAMMER',
    'ENGINE WELDING',
    'CUTTING TORCH',
    'KERANGKENG',
    'GREASE GUN'
];

export async function generateSidakWorkshopPDF(data: WorkshopPDFData): Promise<jsPDF> {
    // Normalize data - support both equipment/records and inspectors/observers naming
    const equipmentData = data.equipment || data.records || [];
    const inspectorData = data.inspectors || data.observers || [];

    // PORTRAIT format A4 (210mm x 297mm)
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.width;  // 210mm
    const pageHeight = pdf.internal.pageSize.height; // 297mm
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);

    // Pre-load logo image once for reuse
    let logoImg: HTMLImageElement | null = null;
    try {
        logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load logo'));
            img.src = '/assets/logo-gecl.png';
        });
    } catch (error) {
        console.error('Logo loading failed, will use text fallback:', error);
    }

    // Helper function to draw header on each page
    const drawHeader = (yStart: number): number => {
        let yPosition = yStart;

        // Logo (left)
        if (logoImg) {
            pdf.addImage(logoImg, 'PNG', margin, yPosition, 40, 9);
        } else {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 139);
            pdf.text('PT. GECL', margin, yPosition + 5);
        }

        // Document code (right)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text('GECL - HSE - ES - F - 3.02 - 87', pageWidth - margin, yPosition + 5, { align: 'right' });

        yPosition += 12;

        // Main title with gray background
        pdf.setFillColor(220, 220, 220);
        pdf.rect(margin, yPosition, availableWidth, 10, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('CHECKLIST INSPEKSI PERALATAN WORKSHOP', pageWidth / 2, yPosition + 4, { align: 'center' });
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text('Formulir ini digunakan untuk pencatatan hasil inspeksi workshop', pageWidth / 2, yPosition + 8, { align: 'center' });

        yPosition += 12;

        // Header info table
        const infoData = [
            ['Tanggal', data.session.tanggal || '', 'Nama Workshop', data.session.namaWorkshop || ''],
            ['Lokasi', data.session.lokasi || '', 'Penanggung jawab area', data.session.penanggungJawabArea || '']
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
                1: { cellWidth: availableWidth / 2 - 30 },
                2: { cellWidth: 40, fillColor: [240, 240, 240], fontStyle: 'bold' },
                3: { cellWidth: availableWidth / 2 - 40 },
            },
            margin: { left: margin, right: margin },
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 2;

        // Instruction note
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(6.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Tuliskan S (sesuai) atau TS (Tidak Sesuai) pada kolom Kesesuaian sesuai hasil pengamatan. Pemeriksaan harus dilakukan permasing-masing peralatan', margin, yPosition + 2);

        return yPosition + 5;
    };

    // Build the table data for all equipment
    const buildTableData = () => {
        const tableRows: any[] = [];

        EQUIPMENT_ORDER.forEach((equipmentType, equipmentIndex) => {
            const items = EQUIPMENT_ITEMS[equipmentType];
            // Match equipment by normalized type (HYDRAULIC_JACK -> HYDRAULIC JACK)
            const eqData = equipmentData.find(e => normalizeEquipmentType(e.equipmentType) === equipmentType);
            const registerNo = eqData?.noRegisterPeralatan || '';

            // Equipment header row (gray background)
            const headerNum = equipmentIndex + 1;
            tableRows.push({
                isHeader: true,
                data: [
                    { content: `${headerNum}`, styles: { fontStyle: 'bold', fillColor: [200, 200, 200] } },
                    { content: `${equipmentType} - No Register Peralatan : ${registerNo}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [200, 200, 200], halign: 'left' } }
                ]
            });

            // Equipment inspection items
            items.forEach((item, itemIndex) => {
                const result = eqData?.inspectionResults?.[item.id] || '';
                const tindakLanjut = itemIndex === 0 ? (eqData?.tindakLanjutPerbaikan || '') : '';
                const dueDate = itemIndex === 0 ? (eqData?.dueDate || '') : '';

                tableRows.push({
                    isHeader: false,
                    data: [item.id, item.description, result, tindakLanjut, dueDate],
                    equipmentRowSpan: itemIndex === 0 ? items.length : 0,
                    equipmentTindakLanjut: eqData?.tindakLanjutPerbaikan || '',
                    equipmentDueDate: eqData?.dueDate || ''
                });
            });
        });

        return tableRows;
    };

    // Helper function to draw inspector signatures section
    const drawInspectorSignatures = (yStart: number): number => {
        let yPosition = yStart;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('Inspektur:', margin, yPosition);
        yPosition += 3;

        // Build inspector data for 2 columns with signature cells
        const inspector1 = inspectorData[0] || { nama: '', perusahaan: '', tandaTangan: '' };
        const inspector2 = inspectorData[1] || { nama: '', perusahaan: '', tandaTangan: '' };

        const inspectorTableData = [
            [
                inspector1.nama || '',
                inspector1.perusahaan || '',
                '',
                inspector2.nama || '',
                inspector2.perusahaan || '',
                ''
            ]
        ];

        autoTable(pdf, {
            startY: yPosition,
            head: [[
                'Nama Inspektor', 'Perusahaan', 'Tanda tangan',
                'Nama Inspektor', 'Perusahaan', 'Tanda tangan'
            ]],
            body: inspectorTableData,
            theme: 'grid',
            tableWidth: availableWidth,
            styles: {
                fontSize: 7,
                cellPadding: 1.5,
                valign: 'middle',
                minCellHeight: 15,
                lineWidth: 0.15,
                lineColor: [0, 0, 0],
            },
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                minCellHeight: 6,
            },
            columnStyles: {
                0: { cellWidth: availableWidth / 6, halign: 'center' },
                1: { cellWidth: availableWidth / 6, halign: 'center' },
                2: { cellWidth: availableWidth / 6, halign: 'center' },
                3: { cellWidth: availableWidth / 6, halign: 'center' },
                4: { cellWidth: availableWidth / 6, halign: 'center' },
                5: { cellWidth: availableWidth / 6, halign: 'center' },
            },
            didDrawCell: (cellData) => {
                // Signature columns: 2 and 5
                if ((cellData.column.index === 2 || cellData.column.index === 5) && cellData.section === 'body') {
                    const inspectorIndex = cellData.column.index === 2 ? 0 : 1;
                    const inspector = inspectorData[inspectorIndex];
                    if (inspector?.tandaTangan) {
                        try {
                            const format = inspector.tandaTangan.includes('image/png') ? 'PNG' : 'JPEG';
                            pdf.addImage(
                                inspector.tandaTangan,
                                format,
                                cellData.cell.x + 2,
                                cellData.cell.y + 2,
                                cellData.cell.width - 4,
                                cellData.cell.height - 4,
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

    // Build all table data
    const allTableData = buildTableData();

    // Prepare flat rows for autoTable
    const flattenedRows: any[] = [];
    allTableData.forEach(row => {
        if (row.isHeader) {
            flattenedRows.push(row.data);
        } else {
            flattenedRows.push(row.data);
        }
    });

    // Draw header on first page
    let yPosition = drawHeader(margin);

    // Column headers for the main table
    const tableHeaders = [['No', 'Deskripsi Pemeriksaan', 'Kesesuaian', 'Tindak Lanjut Perbaikan', 'Due Date']];

    // Use autoTable with page break handling
    autoTable(pdf, {
        startY: yPosition,
        head: tableHeaders,
        body: flattenedRows,
        theme: 'grid',
        tableWidth: availableWidth,
        styles: {
            fontSize: 6.5,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [0, 0, 0],
            minCellHeight: 5,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            minCellHeight: 6,
        },
        columnStyles: {
            0: { cellWidth: 12 },  // No
            1: { cellWidth: 80, halign: 'left' },  // Deskripsi Pemeriksaan
            2: { cellWidth: 20 },  // Kesesuaian
            3: { cellWidth: 50, halign: 'left' },  // Tindak Lanjut Perbaikan
            4: { cellWidth: 28 },  // Due Date
        },
        margin: { left: margin, right: margin, bottom: 15 },
        showHead: 'everyPage',
        didDrawPage: (hookData) => {
            // Draw header on new pages
            if (hookData.pageNumber > 1) {
                drawHeader(margin);
            }
        },
        willDrawCell: (hookData) => {
            // Check if this is a header row (equipment header)
            const rowData = hookData.row.raw;
            if (Array.isArray(rowData) && rowData.length > 0) {
                const firstCell = rowData[0];
                if (typeof firstCell === 'object' && firstCell !== null && 'styles' in firstCell) {
                    // This is a header row with styled cells
                    hookData.cell.styles.fillColor = [200, 200, 200];
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    // Get final Y position after table
    const finalTableY = (pdf as any).lastAutoTable.finalY;

    // Add inspector signatures on the last page
    // Check if there's enough space, otherwise add a new page
    const remainingSpace = pageHeight - finalTableY - 15;
    if (remainingSpace < 30) {
        pdf.addPage();
        const newYStart = drawHeader(margin) + 5;
        drawInspectorSignatures(newYStart);
    } else {
        drawInspectorSignatures(finalTableY + 5);
    }

    // Draw footers on all pages
    const actualTotalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= actualTotalPages; i++) {
        pdf.setPage(i);
        // Clear and redraw footer with correct page count
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        pdf.text('April 2025/R0', margin, pageHeight - 5);
        pdf.text(`Page ${i} of ${actualTotalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    return pdf;
}

export async function downloadSidakWorkshopAsJpg(data: WorkshopPDFData, filename: string): Promise<void> {
    // Guard against server-side execution
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('JPG download can only be executed in browser environment');
    }

    try {
        // Import PDF.js (Vite compatible)
        const pdfjsLib = await import('pdfjs-dist');

        // Import bundled worker as URL
        const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

        // Configure PDF.js to use bundled worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

        // Generate the PDF
        const pdf = await generateSidakWorkshopPDF(data);

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

// Alias exports for backward compatibility
export const generateSidakWorkshopPdf = generateSidakWorkshopPDF;
