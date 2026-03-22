// File: sidak-behavior-pdf-utils.ts
// Layout PDF Inspeksi Sidak Tingkah Laku Driver
// Copy-paste dari InspectionPDF_v2.tsx, adapted untuk database schema
//
// PENTING: @react-pdf/renderer TIDAK support CSS transform rotate.
// Solusi: gunakan verticalText() (letter stacking) untuk teks rotasi.

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    pdf,
    Image,
} from "@react-pdf/renderer";
import type { SidakBehaviorSession, SidakBehaviorRecord, SidakBehaviorObserver } from '@shared/schema';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ============================================================
// COLORS
// ============================================================
const GRAY = "#D9D9D9";
const DARK_GRAY = "#BFBFBF";
const LIGHT_GRAY = "#F2F2F2";
const WHITE = "#FFFFFF";
const BLACK = "#000000";

// ============================================================
// PARAMETERS (labels from InspectionPDF_v2, keys from our DB schema)
// ============================================================
const PARAMETER_PERILAKU = [
    { key: "mataTertutup", label: "Mata Tertutup > 2d" },
    { key: "seringMengedip", label: "Sering Mengedip" },
    { key: "menguapBerulang", label: "Menguap Berulang" },
    { key: "kepalaMengangguk", label: "Kepala Mengangguk" },
    { key: "posturMembungkuk", label: "Postur Membungkuk" },
    { key: "keluarJalur", label: "Keluar Jalur/Zig-zag" },
    { key: "reaksiRadioLambat", label: "Reaksi Radio Lambat" },
    { key: "tidakMeresponRadio", label: "Tdk Respon Radio" },
    { key: "alarmFatigueFmsAktif", label: "Alarm FMS Aktif" },
    { key: "mengemudiTidakStabil", label: "Mengemudi T.Stabil" },
];

const TINDAKAN = [
    { key: "edukasiTwoWay", label: "Edukasi Two-Way" },
    { key: "monitoringUlang", label: "Monitoring Ulang" },
    { key: "instruksiBerhenti", label: "Instruksi Berhenti" },
    { key: "stretchingMinum", label: "Stretching/Minum" },
    { key: "parkirAman", label: "Parkir Aman" },
    { key: "gantiDriver", label: "Ganti Driver" },
    { key: "mandatoryRest", label: "Mandatory Rest" },
    { key: "koordinasiPengawas", label: "Koord. Pengawas" },
];

const ALL_PARAMS = [...PARAMETER_PERILAKU, ...TINDAKAN];

// ============================================================
// HELPER: Convert text to vertical letter stack
// "Hello" => "H\ne\nl\nl\no"
// ============================================================
function verticalText(text: string): string {
    // Split by spaces so it stacked words vertically instead of letters, far more readable.
    return text.split(" ").join("\n");
}

// ============================================================
// LAYOUT CALCULATIONS
// A4 Landscape = 842 x 595 pt
// ============================================================
const PAGE_W = 842;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COL_NO = 18;
const COL_NAMA = 40;
const COL_LAMBUNG = 40;
const FIXED_W = COL_NO + COL_NAMA + COL_LAMBUNG;
const PARAM_W = (CONTENT_W - FIXED_W) / ALL_PARAMS.length; // ~40.8 per col

// ============================================================
// STYLES (copy-paste dari InspectionPDF_v2.tsx)
// ============================================================
const s = StyleSheet.create({
    page: {
        padding: MARGIN,
        fontSize: 7,
        fontFamily: "Helvetica",
        backgroundColor: WHITE,
    },

    // Header
    headerBar: {
        backgroundColor: GRAY,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5 8",
        border: `0.5pt solid ${DARK_GRAY}`,
    },
    companyName: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    docInfo: { textAlign: "right" as const, fontSize: 6 },
    divider: { borderBottom: `1pt solid ${DARK_GRAY}`, marginTop: 2, marginBottom: 5 },
    title: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center" as const },
    subtitle: { fontSize: 7, fontStyle: "italic" as const, textAlign: "center" as const, marginBottom: 5 },

    // Info table
    infoRow: {
        flexDirection: "row" as const,
        border: `0.5pt solid ${DARK_GRAY}`,
        borderBottom: "none",
    },
    infoRowLast: {
        flexDirection: "row" as const,
        border: `0.5pt solid ${DARK_GRAY}`,
    },
    infoLabel: {
        width: "9%",
        backgroundColor: GRAY,
        padding: "2 4",
        fontFamily: "Helvetica-Bold",
        fontSize: 6.5,
        borderRight: `0.5pt solid ${DARK_GRAY}`,
    },
    infoValue: {
        width: "41%",
        padding: "2 4",
        fontSize: 6.5,
        borderRight: `0.5pt solid ${DARK_GRAY}`,
    },
    infoLabelR: {
        width: "11%",
        backgroundColor: GRAY,
        padding: "2 4",
        fontFamily: "Helvetica-Bold",
        fontSize: 6.5,
        borderRight: `0.5pt solid ${DARK_GRAY}`,
    },
    infoValueR: {
        width: "29%",
        padding: "2 4",
        fontSize: 6.5,
    },

    // Main table
    table: { marginTop: 5 },

    // Main Header Row (Combined)
    tableHeaderContainer: {
        flexDirection: 'row',
        border: `0.5pt solid ${BLACK}`,
        borderBottom: 'none',
        height: 100,
    },
    headerColNo: {
        width: COL_NO,
        backgroundColor: GRAY,
        justifyContent: 'center',
        alignItems: 'center',
        borderRight: `0.5pt solid ${BLACK}`,
    },
    headerColNama: {
        width: COL_NAMA,
        backgroundColor: GRAY,
        justifyContent: 'center',
        alignItems: 'center',
        borderRight: `0.5pt solid ${BLACK}`,
    },
    headerColLambung: {
        width: COL_LAMBUNG,
        backgroundColor: GRAY,
        justifyContent: 'center',
        alignItems: 'center',
        borderRight: `0.5pt solid ${BLACK}`,
    },
    colHeader: { fontSize: 6, fontFamily: "Helvetica-Bold", textAlign: "center" as const },

    headerGroupCol: {
        flexDirection: 'column',
        width: PARAM_W * ALL_PARAMS.length,
        borderRight: `0.5pt solid ${BLACK}`,
    },
    groupHeaderRow: {
        flexDirection: 'row',
        height: 18,
        borderBottom: `0.5pt solid ${BLACK}`,
    },
    groupParam: {
        width: PARAM_W * PARAMETER_PERILAKU.length,
        backgroundColor: GRAY,
        justifyContent: 'center',
        alignItems: 'center',
        borderRight: `0.5pt solid ${BLACK}`,
    },
    groupTindakan: {
        width: PARAM_W * TINDAKAN.length,
        backgroundColor: GRAY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupText: { fontSize: 6, fontFamily: "Helvetica-Bold" },

    paramHeaderRow: {
        flexDirection: 'row',
        flex: 1,
    },
    paramColHeader: {
        width: PARAM_W,
        backgroundColor: LIGHT_GRAY,
        justifyContent: 'center',
        alignItems: 'center',
        borderRight: `0.5pt solid ${BLACK}`,
    },
    paramColHeaderLast: {
        width: PARAM_W,
        backgroundColor: LIGHT_GRAY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verticalLabel: {
        fontSize: 6,
        textAlign: "center" as const,
        lineHeight: 1.1,
        fontFamily: "Helvetica",
    },

    // Data rows
    dataRow: {
        flexDirection: "row" as const,
        border: `0.5pt solid ${BLACK}`,
        borderBottom: "none",
        minHeight: 24,
    },
    dataRowLast: {
        flexDirection: "row" as const,
        border: `0.5pt solid ${BLACK}`,
        minHeight: 24,
    },
    cellNo: {
        width: COL_NO,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRight: `0.5pt solid ${BLACK}`,
    },
    cellNama: {
        width: COL_NAMA,
        justifyContent: "center" as const,
        paddingLeft: 3,
        borderRight: `0.5pt solid ${BLACK}`,
    },
    cellLambung: {
        width: COL_LAMBUNG,
        justifyContent: "center" as const,
        paddingLeft: 3,
        borderRight: `0.5pt solid ${BLACK}`,
    },
    cellCheck: {
        width: PARAM_W,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRight: `0.5pt solid ${BLACK}`,
    },
    cellCheckLast: {
        width: PARAM_W,
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
    checkText: { fontSize: 8, fontFamily: "Helvetica-Bold" },

    // Observer section
    obsSection: { flexDirection: "row" as const, marginTop: 5, gap: 6 },
    obsTable: { flex: 1 },
    obsHeaderRow: {
        flexDirection: "row" as const,
        backgroundColor: GRAY,
        border: `0.5pt solid ${BLACK}`,
        borderBottom: "none",
    },
    obsDataRow: {
        flexDirection: "row" as const,
        border: `0.5pt solid ${BLACK}`,
        borderBottom: "none",
        minHeight: 14,
    },
    obsDataRowLast: {
        flexDirection: "row" as const,
        border: `0.5pt solid ${BLACK}`,
        minHeight: 14,
    },
    obsColNo: {
        width: 18,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRight: `0.5pt solid ${BLACK}`,
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
    },
    obsColNama: {
        flex: 1,
        justifyContent: "center" as const,
        paddingLeft: 3,
        borderRight: `0.5pt solid ${BLACK}`,
        fontSize: 6,
    },
    obsColPerusahaan: {
        flex: 1.5,
        justifyContent: "center" as const,
        paddingLeft: 3,
        borderRight: `0.5pt solid ${BLACK}`,
        fontSize: 6,
    },
    obsColTTD: {
        flex: 1.5,
        justifyContent: "center" as const,
        paddingLeft: 3,
        fontSize: 6,
    },
    obsHeaderText: { fontSize: 6, fontFamily: "Helvetica-Bold", textAlign: "center" as const },

    sigImg: {
        maxHeight: 12,
        maxWidth: 45,
        objectFit: "contain" as const,
    },

    // Footer
    footer: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        marginTop: 6,
        paddingTop: 3,
        borderTop: `0.5pt solid ${DARK_GRAY}`,
    },
    footerText: { fontSize: 5, color: "#666" },
});

// ============================================================
// DATA TYPES
// ============================================================
interface SidakBehaviorData {
    session: SidakBehaviorSession;
    records: SidakBehaviorRecord[];
    observers: SidakBehaviorObserver[];
}

// ============================================================
// PDF DOCUMENT COMPONENT
// ============================================================
function SidakBehaviorPDFDocument({ data }: { data: SidakBehaviorData }) {
    const { session, records, observers } = data;

    const formatDate = (dateStr: string | Date | null) => {
        if (!dateStr) return '-';
        return format(new Date(dateStr), 'dd-MM-yyyy', { locale: idLocale });
    };

    // Pad to 10 rows
    const drivers: any[] = [...records];
    while (drivers.length < 10) {
        drivers.push({ no: drivers.length + 1, namaDriver: '', nomorLambung: '' });
    }

    // Split observers
    const leftObs: any[] = [];
    const rightObs: any[] = [];
    for (let i = 0; i < 4; i++) {
        leftObs.push(observers[i] || { nama: '', perusahaan: '' });
        rightObs.push(observers[i + 4] || { nama: '', perusahaan: '' });
    }

    const h = React.createElement;

    return h(Document, null,
        h(Page, { size: "A4", orientation: "landscape", style: s.page },

            // HEADER
            h(View, { style: s.headerBar },
                h(Text, { style: s.companyName }, "PT GOLDEN ENERGI CEMERLANG LESTARI"),
                h(View, null,
                    h(Text, { style: s.docInfo }, "GECL \u2013 HSE \u2013 ES \u2013 F \u2013 3.02"),
                    h(Text, { style: s.docInfo }, "Maret 2025/R0"),
                ),
            ),
            h(View, { style: s.divider }),

            h(Text, { style: s.title }, "INSPEKSI SIDAK TINGKAH LAKU DRIVER"),
            h(Text, { style: s.subtitle }, "Observasi Perilaku Mengemudi di Area Operasi"),

            // INFO TABLE
            h(View, { style: s.infoRow },
                h(Text, { style: s.infoLabel }, "Tanggal"),
                h(Text, { style: s.infoValue }, formatDate(session.tanggal)),
                h(Text, { style: s.infoLabelR }, "Waktu"),
                h(Text, { style: s.infoValueR }, session.waktu || '-'),
            ),
            h(View, { style: s.infoRow },
                h(Text, { style: s.infoLabel }, "Shift"),
                h(Text, { style: s.infoValue }, session.shift || '-'),
                h(Text, { style: s.infoLabelR }, "Metode Sidak"),
                h(Text, { style: s.infoValueR }, session.metodeSidak || '-'),
            ),
            h(View, { style: s.infoRowLast },
                h(Text, { style: s.infoLabel }, "Lokasi"),
                h(Text, { style: s.infoValue }, session.lokasi || '-'),
                h(Text, { style: s.infoLabelR }, "Total Sampel"),
                h(Text, { style: s.infoValueR }, `${session.totalSampel || records.length} Karyawan`),
            ),

            // MAIN TABLE
            h(View, { style: s.table },

                // Main Table Header
                h(View, { style: s.tableHeaderContainer },
                    // Left Fixed Columns
                    h(View, { style: s.headerColNo }, h(Text, { style: s.colHeader }, "No")),
                    h(View, { style: s.headerColNama }, h(Text, { style: s.colHeader }, "Nama\nDriver")),
                    h(View, { style: s.headerColLambung }, h(Text, { style: s.colHeader }, "No.\nLambung")),

                    // Center Grouped Columns
                    h(View, { style: s.headerGroupCol },
                        h(View, { style: s.groupHeaderRow },
                            h(View, { style: s.groupParam }, h(Text, { style: s.groupText }, "PARAMETER PERILAKU")),
                            h(View, { style: s.groupTindakan }, h(Text, { style: s.groupText }, "TINDAKAN"))
                        ),
                        h(View, { style: s.paramHeaderRow },
                            ...ALL_PARAMS.map((p, i) =>
                                h(View, {
                                    key: p.key,
                                    style: i < ALL_PARAMS.length - 1 ? s.paramColHeader : s.paramColHeaderLast,
                                },
                                    h(Text, { style: s.verticalLabel }, verticalText(p.label))
                                )
                            )
                        )
                    ),
                ),

                // Data Rows
                ...drivers.map((dr: any, i: number) =>
                    h(View, {
                        key: i,
                        style: i < drivers.length - 1 ? s.dataRow : s.dataRowLast,
                    },
                        h(View, { style: s.cellNo },
                            h(Text, null, `${i + 1}.`),
                        ),
                        h(View, { style: s.cellNama },
                            h(Text, null, dr.namaDriver || ''),
                        ),
                        h(View, { style: s.cellLambung },
                            h(Text, null, dr.nomorLambung || ''),
                        ),

                        ...ALL_PARAMS.map((p, j) => {
                            const checked = !!dr[p.key];
                            return h(View, {
                                key: p.key,
                                style: j < ALL_PARAMS.length - 1 ? s.cellCheck : s.cellCheckLast,
                            },
                                checked ? h(Text, { style: s.checkText }, "V") : null,
                            );
                        })
                    ),
                ),
            ),

            // OBSERVER TABLES
            h(View, { style: s.obsSection },
                ...[leftObs, rightObs].map((obsList, tableIdx) =>
                    h(View, { key: tableIdx, style: s.obsTable },
                        h(View, { style: s.obsHeaderRow },
                            h(View, { style: s.obsColNo }, h(Text, { style: s.obsHeaderText }, "No")),
                            h(View, { style: s.obsColNama }, h(Text, { style: s.obsHeaderText }, "Nama Pemantau")),
                            h(View, { style: s.obsColPerusahaan }, h(Text, { style: s.obsHeaderText }, "Perusahaan")),
                            h(View, { style: s.obsColTTD }, h(Text, { style: s.obsHeaderText }, "Tanda Tangan")),
                        ),
                        ...obsList.map((obs: any, i: number) =>
                            h(View, {
                                key: i,
                                style: i < obsList.length - 1 ? s.obsDataRow : s.obsDataRowLast,
                            },
                                h(View, { style: s.obsColNo }, h(Text, null, `${tableIdx * 4 + i + 1}.`)),
                                h(View, { style: s.obsColNama }, h(Text, null, obs.nama || '')),
                                h(View, { style: s.obsColPerusahaan }, h(Text, null, obs.perusahaan || '')),
                                h(View, { style: s.obsColTTD },
                                    obs.signatureDataUrl
                                        ? h(Image, { src: obs.signatureDataUrl, style: s.sigImg })
                                        : h(Text, null, ''),
                                ),
                            ),
                        ),
                    ),
                ),
            ),

            // FOOTER
            h(View, { style: s.footer },
                h(Text, { style: s.footerText }, "GECL \u2013 HSE \u2013 ES \u2013 F \u2013 3.02"),
                h(Text, { style: s.footerText }, "Maret 2025/R0"),
                h(Text, { style: s.footerText }, "Page 1 of 1"),
            ),
        ),
    );
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Generate PDF blob using @react-pdf/renderer
 */
export async function generateSidakBehaviorPdf(data: SidakBehaviorData): Promise<Blob> {
    const doc = React.createElement(SidakBehaviorPDFDocument, { data }) as any;
    const blob = await pdf(doc).toBlob();
    return blob;
}

/**
 * Download as PDF
 */
export async function downloadSidakBehaviorAsPdf(data: SidakBehaviorData, filename: string): Promise<void> {
    const blob = await generateSidakBehaviorPdf(data);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Download as JPG (renders via HTML template + html2canvas)
 */
export async function downloadSidakBehaviorAsJpg(data: SidakBehaviorData, filename: string): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const { getSidakBehaviorHtml } = await import('./sidak-behavior-html-template');

    const htmlContent = getSidakBehaviorHtml(data);
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1122px';
    container.style.minHeight = '793px';
    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('Failed to create image blob'));
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                resolve();
            }, 'image/jpeg', 0.95);
        });
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
}
