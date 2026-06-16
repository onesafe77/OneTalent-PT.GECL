// Zero Harm — registry SEMUA program (master "Program Monitoring").
// status 'live' = capaian dihitung otomatis & tervalidasi; 'pending' = metadata saja (menyusul).
import { ZH_SIDAK_PROGRAMS, getZhSidakKpi } from "./zh-sidak";
import { getZhAttendanceKpi } from "./zh-attendance";
import { getZhRecapKpi } from "./zh-recap";

export interface ZhProgramMeta {
  code: string;
  name: string;
  pillar: number;
  target?: number;
  unit?: string;
  source: string;       // sumber data (label)
  status: "live" | "pending";
  detailPath?: string;  // route detail bila ada
  kind?: "sidak" | "attendance" | "recap"; // tipe compute utk yg live
}

// Pilar besar Zero Harm 2.0
export const ZH_PILLARS: Record<number, string> = {
  1: "Sosialisasi & IBPR", 2: "Golden Rules", 3: "Pengawasan", 4: "OPP",
  5: "Roster & Fatigue", 6: "SPIP", 7: "LOTOTO", 8: "Workshop", 9: "Ban",
  10: "Jalan Tambang", 11: "FMS", 12: "Sidak Pengawas", 13: "Subkon",
  14: "Insentif", 15: "WLA & Personil", 16: "Nearmiss/Bahaya", 17: "NC", 18: "RCA",
};

// 13 Sidak (live) dari registry zh-sidak
const SIDAK: ZhProgramMeta[] = ZH_SIDAK_PROGRAMS.map((p) => ({
  code: p.code, name: p.name, pillar: p.pillar, target: p.target, unit: "sampel/mgg",
  source: "OPK (otomatis)", status: "live", kind: "sidak", detailPath: "/workspace/zero-harm/sidak-kpi",
}));

// Program lain (metadata; capaian menyusul per-sheet dgn validasi)
const OTHERS: ZhProgramMeta[] = [
  { code: "1.1", name: "Sosialisasi IBPR", pillar: 1, source: "Attendance (otomatis)", status: "live", kind: "attendance", unit: "/bln", detailPath: "/workspace/zero-harm/attendance-kpi?program=1.1" },
  { code: "1.2", name: "Observasi CCC", pillar: 1, source: "Import (log)", status: "pending" },
  { code: "2.1", name: "Sosialisasi Golden Rules", pillar: 2, source: "Attendance (otomatis)", status: "live", kind: "attendance", unit: "/bln", detailPath: "/workspace/zero-harm/attendance-kpi?program=2.1" },
  { code: "2.2", name: "DB Pelanggaran GR & Non-GR", pillar: 2, source: "Hazard/Validasi", status: "pending" },
  { code: "3.1.1", name: "Safety Talk", pillar: 3, source: "Attendance (otomatis)", status: "live", kind: "attendance", unit: "/bln", detailPath: "/workspace/zero-harm/attendance-kpi?program=3.1.1" },
  { code: "3.1.2", name: "Pelaksanaan P5M", pillar: 3, source: "Attendance", status: "pending" },
  { code: "3.1.3", name: "Safety Committee", pillar: 3, source: "Attendance", status: "pending" },
  { code: "3.2.1", name: "SAP", pillar: 3, source: "Multi-sumber", status: "pending" },
  { code: "3.2.2", name: "Kesesuaian Waktu Inspeksi", pillar: 3, source: "Inspeksi (otomatis)", status: "live", kind: "recap", unit: "% tepat waktu" },
  { code: "3.3", name: "WINE", pillar: 3, source: "Inspeksi", status: "pending" },
  { code: "3.4", name: "Approval P2H", pillar: 3, source: "Import (log)", status: "pending" },
  { code: "3.11.1", name: "Management Work Inspect", pillar: 3, source: "Hazard/Inspeksi/Observasi", status: "pending" },
  { code: "3.11.2", name: "Sidak by Section Up", pillar: 3, source: "OPK", status: "pending" },
  { code: "3.12", name: "NAPZA", pillar: 3, source: "Import (log)", status: "pending" },
  { code: "3.13", name: "OPK (Pemenuhan)", pillar: 3, source: "Manual", status: "pending" },
  { code: "4", name: "OPP", pillar: 4, source: "Manual", status: "pending" },
  { code: "6.1", name: "DB Temuan Inspeksi SPIP", pillar: 6, source: "Manual", status: "pending" },
  { code: "6.2", name: "Jadwal Inspeksi SPIP", pillar: 6, source: "Manual", status: "pending" },
  { code: "7.1", name: "Manajemen LOTOTO", pillar: 7, source: "Manual", status: "pending" },
  { code: "8", name: "Penilaian Internal Workshop", pillar: 8, source: "Manual", status: "pending" },
  { code: "9", name: "Penanganan Ban", pillar: 9, source: "Manual", status: "pending" },
  { code: "10", name: "Penilaian Jalan Tambang", pillar: 10, source: "Manual", status: "pending" },
  { code: "11.1", name: "Kecepatan Validasi FMS", pillar: 11, source: "FMS (otomatis)", status: "live", kind: "recap", unit: "% compliant" },
  { code: "11.2a", name: "DB TindakLanjut FMS", pillar: 11, source: "Import (log)", status: "pending" },
  { code: "11.2b", name: "Pelaporan Driver", pillar: 11, source: "Import (log)", status: "pending" },
  { code: "13", name: "Manajemen Subkon", pillar: 13, source: "Manual", status: "pending" },
  { code: "14", name: "Safety dalam Skema Insentif", pillar: 14, source: "Manual", status: "pending" },
  { code: "15.1", name: "WLA", pillar: 15, source: "Import (log)", status: "pending" },
  { code: "15.2", name: "Pemenuhan Personil KP", pillar: 15, source: "Import (log)", status: "pending" },
  { code: "16.1", name: "Nearmiss", pillar: 16, source: "Manual", status: "pending" },
  { code: "16.2", name: "Bahaya Kritikal", pillar: 16, source: "Manual", status: "pending" },
  { code: "17", name: "Verifikasi NC", pillar: 17, source: "Manual", status: "pending" },
  { code: "18.1", name: "Report Analisis RCA", pillar: 18, source: "Import (log)", status: "pending" },
  { code: "18.2", name: "Evaluasi Efektivitas RCA", pillar: 18, source: "Import (log)", status: "pending" },
];

export const ZH_ALL_PROGRAMS: ZhProgramMeta[] = [...SIDAK, ...OTHERS].sort(
  (a, b) => a.pillar - b.pillar || a.code.localeCompare(b.code, undefined, { numeric: true }),
);

export interface ZhProgramSummaryRow extends ZhProgramMeta { overall: number | null; }

/** Ringkasan semua program; yg 'live' dihitung capaiannya. */
export async function getZhProgramsSummary(year: number): Promise<ZhProgramSummaryRow[]> {
  const out: ZhProgramSummaryRow[] = [];
  for (const p of ZH_ALL_PROGRAMS) {
    let overall: number | null = null;
    if (p.status === "live" && p.kind === "sidak") {
      try { overall = (await getZhSidakKpi(p.code, year))?.overall ?? null; } catch { overall = null; }
    } else if (p.status === "live" && p.kind === "attendance") {
      try { overall = (await getZhAttendanceKpi(p.code, year))?.overall ?? null; } catch { overall = null; }
    } else if (p.status === "live" && p.kind === "recap") {
      try { overall = (await getZhRecapKpi(p.code))?.overall ?? null; } catch { overall = null; }
    }
    out.push({ ...p, overall });
  }
  return out;
}
