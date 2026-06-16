// Konversi xlsx -> Univer IWorkbookData dengan fidelitas penuh (mirip Excel).
// Hibrida: SheetJS (nilai, rumus, format angka, fill rgb, lebar kolom, tinggi baris, merge)
//        + ExcelJS streaming (font bold/warna/size, border, alignment) — hemat memori (skip sheet mentah).
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { Readable } from "stream";

// Sheet mentah TETAP dimuat (values-only) supaya rumus lintas-sheet hidup.
const RAW_SHEETS = new Set(["Validasi", "Hazard", "Inspeksi", "Observasi", "OPK", "Attendance", "FMS"]);
const MAX_ROWS = 2000;        // cap baris sheet program
const MAX_ROWS_RAW = 40000;   // cap baris sheet mentah (data nyata terbesar FMS ~32rb)
const MAX_COLS = 300;

// LET / _xlpm (LAMBDA helper) belum didukung Univer → simpan nilai cached
const UNSUPPORTED_FN = /\bLET\s*\(|_xlpm\./i;

// palet tema Office default (utk resolve warna theme dari ExcelJS)
const THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
function applyTint(hex: string, tint?: number): string {
  if (!tint) return hex;
  const n = parseInt(hex, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => tint < 0 ? Math.round(c * (1 + tint)) : Math.round(c + (255 - c) * tint);
  r = f(r); g = f(g); b = f(b);
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase();
}
function exceljsColor(color: any): string | undefined {
  if (!color) return undefined;
  if (color.argb) return "#" + String(color.argb).slice(-6).toUpperCase();
  if (color.theme != null) return "#" + applyTint(THEME[color.theme] || "000000", color.tint);
  return undefined;
}
function sheetjsFill(s: any): string | undefined {
  const fg = s?.fgColor;
  if (!fg) return undefined;
  if (fg.rgb) return "#" + String(fg.rgb).slice(-6).toUpperCase();
  if (fg.theme != null) return "#" + applyTint(THEME[fg.theme] || "FFFFFF", fg.tint);
  return undefined;
}
const BORDER_MAP: Record<string, number> = { thin: 1, hair: 2, dotted: 3, dashed: 4, dashDot: 5, dashDotDot: 6, double: 7, medium: 8, mediumDashed: 9, thick: 13, slantDashDot: 12 };
const HALIGN: Record<string, number> = { left: 1, center: 2, right: 3 };
const VALIGN: Record<string, number> = { top: 1, middle: 2, bottom: 3 };

export interface UniverWorkbook {
  id: string; name: string; sheetOrder: string[]; sheets: Record<string, any>;
  styles?: Record<string, any>;
}

export async function xlsxToUniver(buffer: Buffer, name = "Zero Harm 2.0"): Promise<UniverWorkbook> {
  // ---- Pass 1: SheetJS (struktur + fill + lebar + merge + format + rumus) ----
  const allNames = XLSX.read(buffer, { type: "buffer", bookSheets: true }).SheetNames;
  const wanted = allNames.filter((n) => !RAW_SHEETS.has(n));
  const wb = XLSX.read(buffer, { type: "buffer", cellFormula: true, cellStyles: true, cellNF: true, cellDates: false, sheets: wanted });

  const wbData: UniverWorkbook = { id: "zh-workbook", name, sheetOrder: [], sheets: {}, styles: {} };
  // per sheet: nameLower → { id, styleByCell: Map<"r:c", partialStyle> }
  const sheetByName = new Map<string, { id: string; cellData: any }>();
  let si = 0;

  for (const sName of wb.SheetNames) {
    if (RAW_SHEETS.has(sName)) continue;
    const ws = wb.Sheets[sName];
    if (!ws || !ws["!ref"]) continue;
    const ref = XLSX.utils.decode_range(ws["!ref"]);
    const lastRow = Math.min(ref.e.r, MAX_ROWS - 1);
    const lastCol = Math.min(ref.e.c, MAX_COLS - 1);
    const cellData: Record<number, Record<number, any>> = {};
    for (let r = 0; r <= lastRow; r++) {
      for (let c = 0; c <= lastCol; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;
        const hasF = !!cell.f;
        const v = cell.v;
        if (!hasF && (v == null || v === "")) continue;
        const uc: any = { _st: {} };
        // simpan SEMUA formula (sheet mentah dimuat → lintas-sheet resolve); LET/_xlpm → nilai cached
        if (hasF && !UNSUPPORTED_FN.test(cell.f!)) {
          uc.f = "=" + cell.f!;
          if (v != null && v !== "") uc.v = typeof v === "number" ? v : String(v);
        } else {
          uc.v = typeof v === "number" ? v : String(cell.w != null ? cell.w : v);
        }
        // format angka
        if (cell.z && cell.z !== "General") uc._st.n = { pattern: String(cell.z) };
        // fill (warna latar) dari SheetJS (rgb sudah resolve)
        const bg = sheetjsFill(cell.s);
        if (bg && bg !== "#FFFFFF") uc._st.bg = { rgb: bg };
        // warna kriteria utk sel persen numerik (override fill)
        if (cell.z && String(cell.z).includes("%") && typeof v === "number") {
          uc._st.bg = { rgb: v >= 1 ? "#C6EFCE" : v <= 0 ? "#FFC7CE" : "#FFEB9C" };
          uc._st.cl = { rgb: v >= 1 ? "#006100" : v <= 0 ? "#9C0006" : "#9C6500" };
        }
        if (!cellData[r]) cellData[r] = {};
        cellData[r][c] = uc;
      }
    }
    // lebar kolom & tinggi baris
    const columnData: Record<number, any> = {};
    (ws["!cols"] || []).forEach((col: any, idx: number) => {
      if (idx > lastCol) return;
      const w = col?.wpx || (col?.wch ? Math.round(col.wch * 7) : null);
      if (w) columnData[idx] = { w };
    });
    const rowData: Record<number, any> = {};
    (ws["!rows"] || []).forEach((row: any, idx: number) => {
      if (idx > lastRow) return;
      if (row?.hpx) rowData[idx] = { h: row.hpx };
    });
    const mergeData = (ws["!merges"] || [])
      .filter((m) => m.s.r <= lastRow && m.s.c <= lastCol)
      .map((m) => ({ startRow: m.s.r, endRow: Math.min(m.e.r, lastRow), startColumn: m.s.c, endColumn: Math.min(m.e.c, lastCol) }));

    const id = `sheet-${si++}`;
    wbData.sheets[id] = {
      id, name: sName.trim().slice(0, 31) || id,
      rowCount: Math.max(lastRow + 5, 30), columnCount: Math.max(lastCol + 3, 12),
      cellData, mergeData, columnData, rowData, defaultColumnWidth: 80, defaultRowHeight: 22,
    };
    wbData.sheetOrder.push(id);
    sheetByName.set(sName, { id, cellData });
  }

  // ---- Sheet MENTAH (values-only, extent data nyata) supaya rumus lintas-sheet resolve ----
  // TIDAK didaftarkan ke sheetByName → dilewati overlay ExcelJS (tanpa styling, ringan).
  const rawNames = allNames.filter((n) => RAW_SHEETS.has(n));
  if (rawNames.length) {
    const wbRaw = XLSX.read(buffer, { type: "buffer", cellFormula: false, cellStyles: false, cellNF: true, cellDates: false, sheets: rawNames });
    for (const sName of rawNames) {
      const ws = wbRaw.Sheets[sName];
      if (!ws || !ws["!ref"]) continue;
      const ref = XLSX.utils.decode_range(ws["!ref"]);
      const lastRow = Math.min(ref.e.r, MAX_ROWS_RAW - 1);
      const lastCol = Math.min(ref.e.c, MAX_COLS - 1);
      const cellData: Record<number, Record<number, any>> = {};
      let realLastRow = 0;
      for (let r = 0; r <= lastRow; r++) {
        for (let c = 0; c <= lastCol; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) continue;
          const v = cell.v;
          if (v == null || v === "") continue;
          if (!cellData[r]) cellData[r] = {};
          cellData[r][c] = { v: typeof v === "number" ? v : String(v) };
          if (r > realLastRow) realLastRow = r;
        }
      }
      const id = `sheet-${si++}`;
      wbData.sheets[id] = {
        id, name: sName.trim().slice(0, 31) || id,
        rowCount: realLastRow + 2, columnCount: lastCol + 1,
        cellData, mergeData: [], columnData: {}, rowData: {}, defaultColumnWidth: 80, defaultRowHeight: 20,
      };
      wbData.sheetOrder.push(id);
    }
  }

  // ---- Pass 2: ExcelJS streaming (font, border, alignment) overlay ----
  try {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(buffer), {
      styles: "cache", sharedStrings: "cache", worksheets: "emit", hyperlinks: "ignore", entries: "ignore",
    } as any);
    for await (const ws of reader as any) {
      const target = sheetByName.get(ws.name);
      if (!target) { for await (const _ of ws) { /* drain */ } continue; }
      for await (const row of ws) {
        const r = row.number - 1;
        if (r < 0 || r >= MAX_ROWS) continue;
        row.eachCell({ includeEmpty: false }, (cell: any, colNumber: number) => {
          const c = colNumber - 1;
          if (c >= MAX_COLS) return;
          const uc = target.cellData[r]?.[c];
          if (!uc) return;
          const st = uc._st;
          const font = cell.font;
          if (font) {
            if (font.bold) st.bl = 1;
            if (font.italic) st.it = 1;
            if (font.size) st.fs = font.size;
            if (font.name) st.ff = font.name;
            const fc = exceljsColor(font.color);
            if (fc && !st.cl) st.cl = { rgb: fc }; // jangan timpa warna kriteria %
          }
          const al = cell.alignment;
          if (al) {
            if (al.horizontal && HALIGN[al.horizontal]) st.ht = HALIGN[al.horizontal];
            if (al.vertical && VALIGN[al.vertical]) st.vt = VALIGN[al.vertical];
            if (al.wrapText) st.tb = 3;
          }
          const bd = cell.border;
          if (bd) {
            const conv = (side: any) => side?.style ? { s: BORDER_MAP[side.style] || 1, cl: { rgb: exceljsColor(side.color) || "#000000" } } : undefined;
            const t = conv(bd.top), b = conv(bd.bottom), l = conv(bd.left), rr = conv(bd.right);
            if (t || b || l || rr) st.bd = { t, b, l, r: rr };
          }
        });
      }
    }
  } catch (e) {
    // bila ExcelJS gagal, tetap pakai hasil SheetJS (fill+lebar+merge)
    console.warn("[univer-xlsx] ExcelJS overlay dilewati:", (e as any)?.message);
  }

  // ---- dedup styles → registry ----
  const styleByKey = new Map<string, string>();
  let stSeq = 0;
  for (const id of wbData.sheetOrder) {
    const sh = wbData.sheets[id];
    for (const rk of Object.keys(sh.cellData)) {
      for (const ck of Object.keys(sh.cellData[+rk])) {
        const uc = sh.cellData[+rk][+ck];
        const st = uc._st; delete uc._st;
        if (!st || Object.keys(st).length === 0) continue;
        const key = JSON.stringify(st);
        let sid = styleByKey.get(key);
        if (!sid) { sid = `st${stSeq++}`; styleByKey.set(key, sid); wbData.styles![sid] = st; }
        uc.s = sid;
      }
    }
  }
  return wbData;
}

// Export sederhana (nilai + format angka). Warna/border tidak ditulis (cukup utk data).
export function univerToXlsx(wbData: UniverWorkbook): Buffer {
  const wb = XLSX.utils.book_new();
  for (const id of wbData.sheetOrder) {
    const s = wbData.sheets[id];
    if (!s) continue;
    const ws: XLSX.WorkSheet = {};
    let maxR = 0, maxC = 0;
    for (const rk of Object.keys(s.cellData || {})) {
      const r = Number(rk);
      for (const ck of Object.keys(s.cellData[r] || {})) {
        const c = Number(ck);
        const cell = s.cellData[r][c];
        if (cell == null || (cell.v == null && !cell.f)) continue;
        const addr = XLSX.utils.encode_cell({ r, c });
        const out: XLSX.CellObject = typeof cell.v === "number" ? { t: "n", v: cell.v } : { t: "s", v: cell.v == null ? "" : String(cell.v) };
        if (cell.f) out.f = String(cell.f).replace(/^=/, "");
        const pat = cell.s ? wbData.styles?.[cell.s]?.n?.pattern : undefined;
        if (pat) out.z = pat;
        ws[addr] = out;
        if (r > maxR) maxR = r; if (c > maxC) maxC = c;
      }
    }
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    if (s.mergeData?.length) ws["!merges"] = s.mergeData.map((m: any) => ({ s: { r: m.startRow, c: m.startColumn }, e: { r: m.endRow, c: m.endColumn } }));
    XLSX.utils.book_append_sheet(wb, ws, (s.name || id).slice(0, 31));
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
