// Hitung rumus workbook di SERVER pakai HyperFormula (data mentah dari DB),
// hasilkan workbook RINGAN: sheet program + nilai terhitung, TANPA sheet mentah.
import { HyperFormula } from "hyperformula";

const RAW_SHEETS = new Set(["Validasi", "Hazard", "Inspeksi", "Observasi", "OPK", "Attendance", "FMS"]);
const CROSS_RAW = /(Validasi|Hazard|Inspeksi|Observasi|OPK|Attendance|FMS)!/i;

interface UniverCell { v?: any; f?: string; s?: string; }
interface UniverSheet { id: string; name: string; rowCount?: number; columnCount?: number; cellData: Record<number, Record<number, UniverCell>>; [k: string]: any; }
interface UniverWb { id: string; name: string; sheetOrder: string[]; sheets: Record<string, UniverSheet>; styles?: any; }

function sheetExtent(s: UniverSheet): { rows: number; cols: number } {
  let rows = 0, cols = 0;
  for (const rk of Object.keys(s.cellData || {})) {
    const r = +rk; if (r > rows) rows = r;
    for (const ck of Object.keys(s.cellData[r] || {})) { const c = +ck; if (c > cols) cols = c; }
  }
  return { rows: rows + 1, cols: cols + 1 };
}

// Univer cellData → 2D array utk HF (formula string '=...' / nilai)
function toGrid(s: UniverSheet): any[][] {
  const { rows, cols } = sheetExtent(s);
  const g: any[][] = Array.from({ length: rows }, () => new Array(cols).fill(null));
  for (const rk of Object.keys(s.cellData || {})) {
    const r = +rk;
    for (const ck of Object.keys(s.cellData[r] || {})) {
      const c = +ck; const cell = s.cellData[r][c];
      if (cell?.f) g[r][c] = cell.f.startsWith("=") ? cell.f : "=" + cell.f;
      else if (cell?.v != null) g[r][c] = cell.v;
    }
  }
  return g;
}

/** Hitung & kembalikan workbook ringan (program saja, nilai terhitung). */
export function computeLightWorkbook(programWb: UniverWb, rawWb: { sheets: Record<string, UniverSheet>; sheetOrder: string[] } | null): UniverWb {
  // 1) kumpulkan semua sheet (program + raw) → HF, keyed by NAME
  const sheetsForHf: Record<string, any[][]> = {};
  const nameOfId: Record<string, string> = {};
  for (const id of programWb.sheetOrder) {
    const s = programWb.sheets[id]; if (!s) continue;
    sheetsForHf[s.name] = toGrid(s); nameOfId[id] = s.name;
  }
  if (rawWb) for (const id of rawWb.sheetOrder) {
    const s = rawWb.sheets[id]; if (!s) continue;
    if (!sheetsForHf[s.name]) sheetsForHf[s.name] = toGrid(s);
  }

  let hf: HyperFormula | null = null;
  try {
    hf = HyperFormula.buildFromSheets(sheetsForHf, { licenseKey: "gpl-v3" });
  } catch (e: any) {
    console.warn("[zh-hf] build gagal, kirim nilai cached:", e?.message || e);
  }

  // 2) bangun workbook ringan: program saja, isi nilai terhitung
  const out: UniverWb = { id: programWb.id, name: programWb.name, sheetOrder: [...programWb.sheetOrder], sheets: {}, styles: programWb.styles || {} };
  for (const id of programWb.sheetOrder) {
    const s = programWb.sheets[id]; if (!s) continue;
    const sheetId = hf ? hf.getSheetId(s.name) : undefined;
    const newCellData: Record<number, Record<number, UniverCell>> = {};
    for (const rk of Object.keys(s.cellData || {})) {
      const r = +rk;
      for (const ck of Object.keys(s.cellData[r] || {})) {
        const c = +ck; const cell = { ...s.cellData[r][c] } as UniverCell;
        if (cell.f) {
          // nilai terhitung dari HF (bila ada)
          if (hf && sheetId != null && sheetId >= 0) {
            try {
              const v = hf.getCellValue({ sheet: sheetId, row: r, col: c });
              if (v != null && typeof v !== "object") cell.v = v as any;
            } catch { /* keep cached v */ }
          }
          // rumus lintas-sheet (ke raw) → drop formula (raw tak dikirim) → nilai saja
          if (CROSS_RAW.test(cell.f)) delete cell.f;
        }
        if (!newCellData[r]) newCellData[r] = {};
        newCellData[r][c] = cell;
      }
    }
    out.sheets[id] = { ...s, cellData: newCellData };
  }
  try { hf?.destroy(); } catch { /* noop */ }
  return out;
}

export { RAW_SHEETS };
