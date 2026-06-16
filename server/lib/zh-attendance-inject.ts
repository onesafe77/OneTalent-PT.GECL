// Injeksi Plan Kehadiran (hari/NA per pengawas per minggu) ke sheet OPK Sidak di Workbook.
// Mengisi kolom "Aktual Kehadiran (Hari)" + menulis formula Pencapaian untuk SETIAP
// pengawas × minggu ("rumus otomatis ke bawah"), agar HyperFormula menghitung dari OPK.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ZH_SIDAK_PROGRAMS } from "./zh-sidak";

interface UniverCell { v?: any; f?: string; s?: string; }
interface UniverSheet { id: string; name: string; cellData: Record<number, Record<number, UniverCell>>; [k: string]: any; }
interface UniverWb { sheetOrder: string[]; sheets: Record<string, UniverSheet>; [k: string]: any; }

// index kolom 0-based → huruf Excel (0→A, 6→G, 26→AA)
function colLetter(c: number): string {
  let s = ""; let n = c + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

type AttByProgram = Map<string, Map<string, Map<number, number | null>>>;

/** Muat zh_program_attendance utk tahun → Map<programCode, Map<nik, Map<week, days|null>>>. */
export async function loadAttendanceByProgram(year: number): Promise<AttByProgram> {
  const res: any = await db.execute(sql`SELECT program_code, nik, week, days FROM zh_program_attendance WHERE year = ${year}`);
  const out: AttByProgram = new Map();
  for (const r of (res.rows || [])) {
    const code = String(r.program_code);
    if (!out.has(code)) out.set(code, new Map());
    const byNik = out.get(code)!;
    if (!byNik.has(r.nik)) byNik.set(r.nik, new Map());
    byNik.get(r.nik)!.set(Number(r.week), r.days == null ? null : Number(r.days));
  }
  return out;
}

/**
 * Injeksi (mutasi in-place) attendance ke sheet OPK Sidak di programWb.
 * - cari sheet via nama berawalan `${code} ` utk tiap program ZH_SIDAK_PROGRAMS
 * - deteksi baris header minggu (sel /^W\d+$/) → kolom hari = kolom label minggu
 * - utk tiap pengawas (NIK di kolom 2) × minggu yang ADA di attendance:
 *     set sel hari = days(angka) / "NA"(null); set sel Pencapaian (kolom+1) = formula
 */
export function injectAttendance(programWb: UniverWb, attByProgram: AttByProgram): number {
  let touched = 0;
  for (const prog of ZH_SIDAK_PROGRAMS) {
    const att = attByProgram.get(prog.code);
    if (!att || att.size === 0) continue;
    // temukan sheet
    const sheet = Object.values(programWb.sheets).find(
      (s) => String(s.name || "").trim().startsWith(prog.code + " "),
    );
    if (!sheet) continue;
    const cd = sheet.cellData || (sheet.cellData = {});

    // 1) baris header minggu + map weekNum → kolom
    let weekRow = -1;
    const weekCols = new Map<number, number>(); // weekNum → colIndex
    for (let r = 0; r < 12 && weekRow < 0; r++) {
      const row = cd[r]; if (!row) continue;
      const found = new Map<number, number>();
      for (const ck of Object.keys(row)) {
        const c = +ck; const v = row[c]?.v;
        const m = typeof v === "string" && /^W(\d+)$/.exec(v.trim());
        if (m) found.set(Number(m[1]), c);
      }
      if (found.size >= 3) { weekRow = r; for (const [w, c] of found) weekCols.set(w, c); }
    }
    if (weekRow < 0) continue;
    const weekRowExcel = weekRow + 1; // utk ref absolut $<row>

    // 2) baris pengawas: NIK di kolom 2, di bawah baris header minggu
    const nikRows = new Map<string, number>();
    for (const rk of Object.keys(cd)) {
      const r = +rk; if (r <= weekRow) continue;
      const nik = cd[r]?.[2]?.v;
      if (typeof nik === "string" && /\d/.test(nik)) nikRows.set(nik.trim(), r);
    }

    // 3) injeksi per pengawas × minggu
    for (const [nik, byWeek] of att) {
      const r = nikRows.get(nik);
      if (r == null) continue; // pengawas tak ada di template sheet ini
      for (const [week, days] of byWeek) {
        const wc = weekCols.get(week);
        if (wc == null) continue;
        if (!cd[r]) cd[r] = {};
        const hariRef = `${colLetter(wc)}${r + 1}`;
        const cRef = `$C${r + 1}`;
        const weekRef = `${colLetter(wc)}$${weekRowExcel}`;
        // sel hari
        cd[r][wc] = { ...(cd[r][wc] || {}), v: days == null ? "NA" : days };
        // sel Pencapaian (kolom+1) = formula (rumus ke bawah)
        const f = `=IF(${hariRef}="NA","",MIN(COUNTIFS(OPK!$C:$C,${cRef},OPK!$S:$S,${weekRef},OPK!$R:$R,1,OPK!$P:$P,"${prog.opkKey}")/ROUNDUP((${hariRef}/7)*${prog.target},0),1))`;
        cd[r][wc + 1] = { ...(cd[r][wc + 1] || {}), f };
        touched++;
      }
    }
  }
  return touched;
}
