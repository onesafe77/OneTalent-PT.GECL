// Terapkan Plan Kehadiran: upsert zh_plan_kehadiran + derive zh_program_attendance
// (per SECTION_PROGRAMS) + recompute Workbook. Dipakai route (paste) & cron/sync.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { SECTION_PROGRAMS } from "./zh-attendance-inject";
import { recomputeWorkbook } from "./zh-recompute";

export interface PlanApplyRow {
  section: string; nik: string; nama?: string | null; dept?: string | null; perusahaan?: string | null; ord?: number;
  days: Record<string, number | null>;
}

export async function applyZhPlanRows(year: number, rows: PlanApplyRow[]): Promise<{ planCells: number; derived: number; programs: number }> {
  const perProgram = new Map<string, Array<{ nik: string; week: number; days: number | null }>>();
  let planCells = 0;
  for (const r of rows) {
    if (!r.section || !r.nik || !r.days) continue;
    const nik = String(r.nik).trim().toUpperCase();
    const progs = SECTION_PROGRAMS[r.section.trim()] || [];
    for (const [wk, val] of Object.entries(r.days)) {
      const week = Number(wk); if (!week) continue;
      const days = val == null ? null : Number(val);
      await db.execute(sql`
        INSERT INTO zh_plan_kehadiran (section, nik, nama, dept, perusahaan, ord, year, week, days, updated_at)
        VALUES (${r.section.trim()}, ${nik}, ${r.nama ?? null}, ${r.dept ?? null}, ${r.perusahaan ?? null}, ${r.ord ?? 0}, ${year}, ${week}, ${days}, now())
        ON CONFLICT (section, nik, year, week)
        DO UPDATE SET days = ${days}, nama = ${r.nama ?? null}, dept = ${r.dept ?? null}, perusahaan = ${r.perusahaan ?? null}, ord = ${r.ord ?? 0}, updated_at = now()`);
      planCells++;
      for (const code of progs) {
        if (!perProgram.has(code)) perProgram.set(code, []);
        perProgram.get(code)!.push({ nik, week, days });
      }
    }
  }
  let derived = 0;
  for (const [code, ents] of perProgram) derived += await storage.upsertZhProgramAttendance(code, year, ents);
  try { recomputeWorkbook(); } catch (e: any) { console.error("[zh] recompute setelah plan-kehadiran gagal:", e?.message || e); }
  return { planCells, derived, programs: perProgram.size };
}
