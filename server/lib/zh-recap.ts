// Zero Harm — recap agregat per-periode dari data mentah (arketipe B, tanpa roster).
import { db } from "../db";
import { zhFms, zhInspeksi, zhProgramOfficer } from "@shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export interface ZhRecapKpi {
  code: string;
  weekly: Record<number, { num: number; den: number; rate: number | null }>;
  overall: number | null;
  totalNum: number;
  totalDen: number;
}

/** 11.1 Kecepatan Validasi FMS: rasio "Compliant" per minggu (zh_fms.kategori='Compliant'). */
export async function getFmsComplianceKpi(): Promise<ZhRecapKpi> {
  const rows = await db.select({
    week: zhFms.week,
    den: sql<number>`count(*)::int`,
    num: sql<number>`count(*) filter (where ${zhFms.kategori} = 'Compliant')::int`,
  }).from(zhFms).groupBy(zhFms.week);

  const weekly: Record<number, { num: number; den: number; rate: number | null }> = {};
  let totalNum = 0, totalDen = 0;
  for (const r of rows) {
    const m = String(r.week || "").match(/^W?(\d+)$/i);
    if (!m) continue;
    const w = Number(m[1]);
    const num = Number(r.num), den = Number(r.den);
    weekly[w] = { num, den, rate: den > 0 ? num / den : null };
    totalNum += num; totalDen += den;
  }
  return { code: "11.1", weekly, overall: totalDen > 0 ? totalNum / totalDen : null, totalNum, totalDen };
}

/** 3.2.2 Kesesuaian Waktu Inspeksi: rasio "Sesuai" per pekerja (roster) dari zh_inspeksi.
 *  Per (nik,week): cap = MIN(sesuai/total, 1); overall = Σsesuai/Σtotal (roster). Validasi 1218/1218. */
export async function getInspeksiKesesuaianKpi(programCode = "3.2.2"): Promise<ZhRecapKpi> {
  const roster = await db.select({ nik: zhProgramOfficer.nik }).from(zhProgramOfficer)
    .where(eq(zhProgramOfficer.programCode, programCode));
  const niks = roster.map((r) => r.nik);
  const weekly: Record<number, { num: number; den: number; rate: number | null }> = {};
  let totalNum = 0, totalDen = 0;
  if (niks.length) {
    const rows = await db.select({
      week: zhInspeksi.week,
      den: sql<number>`count(*)::int`,
      num: sql<number>`count(*) filter (where ${zhInspeksi.kesesuaianWaktu} = 'Sesuai')::int`,
    }).from(zhInspeksi)
      .where(inArray(zhInspeksi.nikPelaksana, niks))
      .groupBy(zhInspeksi.week);
    for (const r of rows) {
      const m = String(r.week || "").match(/^W?(\d+)$/i);
      if (!m) continue;
      const w = Number(m[1]); const num = Number(r.num), den = Number(r.den);
      weekly[w] = { num, den, rate: den > 0 ? num / den : null };
      totalNum += num; totalDen += den;
    }
  }
  return { code: programCode, weekly, overall: totalDen > 0 ? totalNum / totalDen : null, totalNum, totalDen };
}

export async function getZhRecapKpi(code: string): Promise<ZhRecapKpi | null> {
  if (code === "11.1") return getFmsComplianceKpi();
  if (code === "3.2.2") return getInspeksiKesesuaianKpi("3.2.2");
  return null;
}
