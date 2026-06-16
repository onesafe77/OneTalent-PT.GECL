// Zero Harm — KPI program berbasis KEHADIRAN (Pilar 1/2/3.1), per pekerja per BULAN.
// Rumus tervalidasi vs Excel (Safety Talk 276/276): cap = MIN(Σcount[0..n-2] + count[n-1]/denom, 1).
// denom = mingguHadir? (mingguHadir/4)×target : target ; mingguHadir=NA → bulan tak dihitung.
import { db } from "../db";
import { zhAttendance, zhProgramOfficer, zhProgramAttendance } from "@shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export interface ZhAttProgram {
  code: string;
  name: string;
  pillar: number;
  defaultTarget: number;
  eventTypes: string[]; // urut; term TERAKHIR dibagi denom (sesuai Excel)
}

export const ZH_ATT_PROGRAMS: ZhAttProgram[] = [
  { code: "1.1", name: "Sosialisasi IBPR", pillar: 1, defaultTarget: 1, eventTypes: [
    "Sosialisasi IBPR",
    "Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules",
    "P5M, Sosialisasi IBPR, dan Sosialisasi Golden Rules",
  ] },
  { code: "2.1", name: "Sosialisasi Golden Rules", pillar: 2, defaultTarget: 1, eventTypes: [
    "Sosialisasi Golden Rules",
    "Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules",
    "P5M, Sosialisasi IBPR, dan Sosialisasi Golden Rules",
  ] },
  { code: "3.1.1", name: "Safety Talk", pillar: 3, defaultTarget: 4, eventTypes: [
    "SAFETY TALK",
    "Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules",
    "GENERAL SAFETY TALK",
  ] },
];

export function getZhAttProgram(code: string) { return ZH_ATT_PROGRAMS.find((p) => p.code === code); }

const roundCap = (n: number) => Math.min(n, 1);

export interface ZhAttKpi {
  program: ZhAttProgram;
  year: number;
  months: number[];
  officers: Array<{
    nik: string; nama: string; dept: string | null; jabatan: string | null; target: number;
    cells: Record<number, { month: number; weeksPresent: number | null; actual: number; capaian: number | null }>;
    capaian: number | null;
  }>;
  monthly: Record<number, number | null>;
  overall: number | null;
}

export async function getZhAttendanceKpi(code: string, year: number): Promise<ZhAttKpi | null> {
  const program = getZhAttProgram(code);
  if (!program) return null;

  const officers = await db.select().from(zhProgramOfficer)
    .where(eq(zhProgramOfficer.programCode, code)).orderBy(zhProgramOfficer.ord);

  // grid bulan (week = bulan). days = minggu-hadir; baris ada & days=null → NA.
  const grid = await db.select().from(zhProgramAttendance)
    .where(and(eq(zhProgramAttendance.programCode, code), eq(zhProgramAttendance.year, year)));
  const gridMap = new Map<string, number | null>(); // `${nik}|${month}` → days (null=NA)
  for (const g of grid) gridMap.set(`${g.nik}|${g.week}`, g.days);

  // hitung count per (nik, month, tipe) dari zh_attendance: nik=G(nikObserver? tidak — zh_attendance.nik),
  // month = zh_attendance.month (text angka), tipe = zh_attendance kolom tipe.
  // Ambil semua baris attendance utk tipe-event program ini, group by nik+month+tipe.
  const rows = await db.select({
    nik: zhAttendance.nik, month: zhAttendance.month, tipe: zhAttendance.tipeEvent, c: sql<number>`count(*)::int`,
  }).from(zhAttendance)
    .where(inArray(zhAttendance.tipeEvent, program.eventTypes))
    .groupBy(zhAttendance.nik, zhAttendance.month, zhAttendance.tipeEvent);
  // countMap[`${nik}|${monthNum}|${tipe}`]
  const countMap = new Map<string, number>();
  for (const r of rows) {
    const nik = (r.nik || "").trim();
    const mNum = parseInt(String(r.month || "").trim(), 10);
    if (!nik || !mNum) continue;
    countMap.set(`${nik}|${mNum}|${r.tipe}`, Number(r.c));
  }
  const cnt = (nik: string, m: number, t: string) => countMap.get(`${nik}|${m}|${t}`) || 0;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monAgg = new Map<number, { sum: number; n: number }>();
  const offRows: ZhAttKpi["officers"] = [];

  for (const o of officers) {
    const target = o.target || program.defaultTarget;
    const cells: any = {};
    let totCap = 0, totN = 0;
    for (const m of months) {
      const key = `${o.nik}|${m}`;
      const hasRow = gridMap.has(key);
      const wp = hasRow ? gridMap.get(key)! : undefined; // undefined=blank, null=NA, number=weeks
      if (hasRow && wp === null) { cells[m] = { month: m, weeksPresent: null, actual: 0, capaian: null }; continue; } // NA
      const denom = (typeof wp === "number" && wp > 0) ? (wp / 4) * target : target;
      // jumlah semua tipe kecuali terakhir; terakhir dibagi denom
      let sum = 0;
      for (let k = 0; k < program.eventTypes.length - 1; k++) sum += cnt(o.nik, m, program.eventTypes[k]);
      const last = cnt(o.nik, m, program.eventTypes[program.eventTypes.length - 1]);
      const actual = sum + last; // aktual "kasar" utk tampilan
      const cap = denom > 0 ? roundCap(sum + last / denom) : 0;
      cells[m] = { month: m, weeksPresent: typeof wp === "number" ? wp : null, actual, capaian: cap };
      totCap += cap; totN += 1;
      const a = monAgg.get(m) || { sum: 0, n: 0 }; a.sum += cap; a.n += 1; monAgg.set(m, a);
    }
    offRows.push({
      nik: o.nik, nama: o.nama, dept: o.dept, jabatan: o.jabatan, target,
      cells, capaian: totN > 0 ? totCap / totN : null,
    });
  }

  const monthly: Record<number, number | null> = {};
  for (const m of months) { const a = monAgg.get(m); monthly[m] = a && a.n > 0 ? a.sum / a.n : null; }
  const allCaps: number[] = [];
  for (const o of offRows) for (const m of months) { const c = o.cells[m]; if (c && c.capaian != null) allCaps.push(c.capaian); }
  const overall = allCaps.length ? allCaps.reduce((s, v) => s + v, 0) / allCaps.length : null;

  return { program, year, months, officers: offRows, monthly, overall };
}
