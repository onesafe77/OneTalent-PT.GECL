// Zero Harm — KPI Program Sidak (Fase 1)
// Capaian pengawas per minggu vs target, dihitung dari zh_opk (counter='1').
// Rumus tervalidasi 1:1 dengan master Excel (62/62 sel cocok).
import { db } from "../db";
import { zhOpk, zhProgramOfficer, zhProgramAttendance } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

export interface ZhSidakProgram {
  code: string;
  name: string;
  pillar: number;
  opkKey: string; // nilai zh_opk.jenis_pekerjaan
  target: number; // sampel/minggu
}

// 13 program Sidak (master "GECL-Database Zero Harm 2.0.xlsx")
export const ZH_SIDAK_PROGRAMS: ZhSidakProgram[] = [
  { code: "3.5", name: "Sidak P2H", pillar: 3, opkKey: "Sidak P2H", target: 10 },
  { code: "3.6", name: "Sidak Seatbelt", pillar: 3, opkKey: "Sidak Seatbelt", target: 10 },
  { code: "3.7", name: "Sidak SIMPER", pillar: 3, opkKey: "Sidak SIMPER", target: 10 },
  { code: "3.8", name: "Sidak Kecepatan", pillar: 3, opkKey: "Sidak Kecepatan", target: 10 },
  { code: "3.9", name: "Sidak Jarak Aman", pillar: 3, opkKey: "Sidak Jarak Aman", target: 10 },
  { code: "3.10", name: "Sidak Kepatuhan Rambu", pillar: 3, opkKey: "Sidak Kepatuhan Rambu", target: 10 },
  { code: "5.1", name: "Sidak Roster", pillar: 5, opkKey: "Sidak Roster", target: 10 },
  { code: "5.2", name: "Sidak Fatigue", pillar: 5, opkKey: "Sidak Fatigue", target: 10 },
  { code: "7.2", name: "Sidak LOTOTO", pillar: 7, opkKey: "Sidak LOTOTO", target: 10 },
  { code: "12.1", name: "Sidak Keberadaan Pengawas", pillar: 12, opkKey: "Sidak Keberadaan Pengawas", target: 9 },
  { code: "12.2", name: "Sidak Fungsi Pengawas", pillar: 12, opkKey: "Sidak Fungsi Pengawas", target: 9 },
  { code: "12.3", name: "Sidak Pencahayaan", pillar: 12, opkKey: "Sidak Pencahayaan", target: 9 },
  { code: "12.4", name: "IKK", pillar: 12, opkKey: "IKK", target: 10 },
];

export function getZhSidakProgram(code: string): ZhSidakProgram | undefined {
  return ZH_SIDAK_PROGRAMS.find((p) => p.code === code);
}

export interface ZhSidakCell {
  week: number;
  days: number | null; // null = NA (cuti)
  actual: number;
  denom: number;
  capaian: number | null; // null = tak dihitung (NA/blank)
}
export interface ZhSidakOfficerRow {
  nik: string;
  nama: string;
  dept: string | null;
  jabatan: string | null;
  ord: number;
  cells: Record<number, ZhSidakCell>; // key = week
  totalActual: number;
  totalDenom: number;
  capaian: number | null; // total = Σactual/Σdenom
}
export interface ZhSidakKpi {
  program: ZhSidakProgram;
  year: number;
  weeks: number[];
  officers: ZhSidakOfficerRow[];
  weekly: Record<number, number | null>; // rata-rata capaian non-null per minggu
  overall: number | null;
}

const roundUp = (n: number) => Math.ceil(n - 1e-9);

/** Hitung KPI satu program untuk satu tahun. */
export async function getZhSidakKpi(programCode: string, year: number): Promise<ZhSidakKpi | null> {
  const program = getZhSidakProgram(programCode);
  if (!program) return null;

  // 1) Roster pengawas
  const officers = await db
    .select()
    .from(zhProgramOfficer)
    .where(eq(zhProgramOfficer.programCode, programCode))
    .orderBy(zhProgramOfficer.ord);

  // 2) Grid hari-kerja
  const att = await db
    .select()
    .from(zhProgramAttendance)
    .where(and(eq(zhProgramAttendance.programCode, programCode), eq(zhProgramAttendance.year, year)));
  // attMap[nik][week] = { days, present }  (present=false → NA)
  const attMap = new Map<string, Map<number, number | null>>();
  for (const a of att) {
    if (!attMap.has(a.nik)) attMap.set(a.nik, new Map());
    attMap.get(a.nik)!.set(a.week, a.days);
  }

  // 3) Aktual dari zh_opk: count per (nik, week) untuk program ini, counter='1'
  const opkRows = await db
    .select({ nik: zhOpk.nikObserver, week: zhOpk.week, c: sql<number>`count(*)::int` })
    .from(zhOpk)
    .where(and(eq(zhOpk.jenisPekerjaan, program.opkKey), eq(zhOpk.counter, "1")))
    .groupBy(zhOpk.nikObserver, zhOpk.week);
  const actMap = new Map<string, number>(); // key `${nik}|${weekNum}`
  for (const r of opkRows) {
    const nik = (r.nik || "").trim();
    const m = String(r.week || "").match(/^W?(\d+)$/i);
    if (!nik || !m) continue;
    actMap.set(`${nik}|${Number(m[1])}`, (actMap.get(`${nik}|${Number(m[1])}`) || 0) + Number(r.c));
  }

  // 4) Susun minggu yang relevan = minggu yg ada di grid attendance (union)
  const weekSet = new Set<number>();
  for (const a of att) weekSet.add(a.week);
  const weeks = Array.from(weekSet).sort((x, y) => x - y);

  const rows: ZhSidakOfficerRow[] = [];
  const weeklyAgg = new Map<number, { sum: number; n: number }>();

  for (const o of officers) {
    const cells: Record<number, ZhSidakCell> = {};
    let totA = 0, totD = 0;
    const wk = attMap.get(o.nik);
    for (const w of weeks) {
      const days = wk?.has(w) ? wk.get(w)! : null; // null → NA/blank
      const actual = actMap.get(`${o.nik}|${w}`) || 0;
      let denom = 0, cap: number | null = null;
      if (days != null && days > 0) {
        denom = roundUp((days / 7) * program.target);
        cap = denom > 0 ? Math.min(actual / denom, 1) : 0;
        totA += actual; totD += denom;
        const agg = weeklyAgg.get(w) || { sum: 0, n: 0 };
        agg.sum += cap; agg.n += 1; weeklyAgg.set(w, agg);
      }
      cells[w] = { week: w, days, actual, denom, capaian: cap };
    }
    rows.push({
      nik: o.nik, nama: o.nama, dept: o.dept, jabatan: o.jabatan, ord: o.ord ?? 0,
      cells, totalActual: totA, totalDenom: totD,
      capaian: totD > 0 ? Math.min(totA / totD, 1) : null,
    });
  }

  const weekly: Record<number, number | null> = {};
  for (const w of weeks) {
    const agg = weeklyAgg.get(w);
    weekly[w] = agg && agg.n > 0 ? agg.sum / agg.n : null;
  }
  const totA = rows.reduce((s, r) => s + r.totalActual, 0);
  const totD = rows.reduce((s, r) => s + r.totalDenom, 0);

  return { program, year, weeks, officers: rows, weekly, overall: totD > 0 ? Math.min(totA / totD, 1) : null };
}
