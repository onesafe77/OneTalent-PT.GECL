// Bangun sheet mentah (OPK/Hazard/Inspeksi/Observasi/Attendance/FMS/Validasi) untuk
// HyperFormula DARI tabel zh_* (data live hasil Import) — bukan dari blob upload statis.
// Urutan kolom diambil dari "zh_raw_meta" (disimpan saat upload master) agar referensi
// kolom (OPK!$D, FMS!$I, dst) di rumus tetap resolve.
import { sql } from "drizzle-orm";
import { db } from "../db";

// nama sheet di workbook → tabel DB
const SHEET_TO_TABLE: Record<string, string> = {
  OPK: "zh_opk",
  Hazard: "zh_hazard",
  Inspeksi: "zh_inspeksi",
  Observasi: "zh_observasi",
  Attendance: "zh_attendance",
  FMS: "zh_fms",
};

export interface RawMeta {
  // header berurutan per sheet mentah (index = kolom)
  headers: Record<string, string[]>;
  // grid penuh sheet Validasi (tak ada tabel zh_); cellData Univer values-only
  validasi?: { name: string; cellData: Record<number, Record<number, { v?: any }>> } | null;
}

interface UniverSheet { id: string; name: string; cellData: Record<number, Record<number, { v?: any }>>; rowCount?: number; columnCount?: number; }

// Zero Harm 2.0 mulai ISO week 14 → minggu-program W1 (programWeek = isoWeek - 13).
// Sumber data iSafe/OPK menyimpan ISO week ("W18".."W24"); template & KPI pakai minggu-program
// ("W5".."W11"). Konversi HANYA utk nilai ISO (>= start); nilai <= 13 (sudah minggu-program) dibiarkan.
export const ZH_PROGRAM_START_ISO_WEEK = 14;
export function toProgramWeekLabel(v: any): any {
  if (v == null) return v;
  const m = /^W?\s*(\d{1,2})$/.exec(String(v).trim());
  if (!m) return v;
  const iso = Number(m[1]);
  if (iso < ZH_PROGRAM_START_ISO_WEEK) return v;
  return `W${iso - (ZH_PROGRAM_START_ISO_WEEK - 1)}`;
}

/** Susun cellData Univer (values-only) dari header + baris raw jsonb. */
function buildSheet(name: string, headers: string[], rows: Array<Record<string, any>>): UniverSheet {
  const cellData: Record<number, Record<number, { v?: any }>> = {};
  // baris 0 = header
  cellData[0] = {};
  headers.forEach((h, c) => { cellData[0][c] = { v: h }; });
  // kolom "Week": konversi ISO week (W18..W24) → minggu-program (W5..W11) agar cocok header template.
  const lower = headers.map((h) => String(h).trim().toLowerCase());
  // baris data
  rows.forEach((rawJson, i) => {
    const r = i + 1;
    let rowObj: Record<number, { v?: any }> | null = null;
    headers.forEach((h, c) => {
      let v = rawJson ? rawJson[h] : undefined;
      if (lower[c] === "week") v = toProgramWeekLabel(v);
      if (v == null || v === "") return;
      if (!rowObj) { rowObj = {}; cellData[r] = rowObj; }
      rowObj[c] = { v };
    });
  });
  const lastRow = rows.length; // index baris terakhir (0-based header + N data)
  return { id: name, name, cellData, rowCount: lastRow + 1, columnCount: headers.length };
}

/**
 * Versi murni (tanpa DB): bangun workbook mentah dari rawMeta + baris jsonb per sheet.
 * Dipakai oleh buildRawWorkbookFromDb dan oleh uji offline.
 */
export function buildRawWorkbookFromRows(
  rawMeta: RawMeta | null,
  rowsBySheet: Record<string, Array<Record<string, any>>>,
): { sheetOrder: string[]; sheets: Record<string, UniverSheet> } | null {
  if (!rawMeta || !rawMeta.headers) return null;
  const sheets: Record<string, UniverSheet> = {};
  const sheetOrder: string[] = [];
  for (const sheetName of Object.keys(SHEET_TO_TABLE)) {
    const headers = rawMeta.headers[sheetName];
    if (!headers || !headers.length) continue;
    const rows = rowsBySheet[sheetName] || [];
    sheets[sheetName] = buildSheet(sheetName, headers, rows);
    sheetOrder.push(sheetName);
  }
  // Validasi: tak ada tabel zh_ → pakai grid dari rawMeta apa adanya
  if (rawMeta.validasi && rawMeta.validasi.cellData) {
    const name = "Validasi";
    sheets[name] = { id: name, name, cellData: rawMeta.validasi.cellData };
    sheetOrder.push(name);
  }
  return { sheetOrder, sheets };
}

/**
 * Kembalikan workbook mentah {sheetOrder, sheets} (di-key NAMA sheet) dari DB.
 * Mengembalikan null bila rawMeta tak ada (caller fallback ke blob lama).
 */
export async function buildRawWorkbookFromDb(rawMeta: RawMeta | null): Promise<{ sheetOrder: string[]; sheets: Record<string, UniverSheet> } | null> {
  if (!rawMeta || !rawMeta.headers) return null;
  const rowsBySheet: Record<string, Array<Record<string, any>>> = {};
  for (const [sheetName, tableName] of Object.entries(SHEET_TO_TABLE)) {
    if (!rawMeta.headers[sheetName]?.length) continue;
    const res: any = await db.execute(sql.raw(`SELECT raw FROM ${tableName} ORDER BY id`));
    rowsBySheet[sheetName] = (res.rows || []).map((x: any) => x.raw || {});
  }
  return buildRawWorkbookFromRows(rawMeta, rowsBySheet);
}

/** Ekstrak rawMeta (header per sheet + grid Validasi) dari workbook raw hasil parse upload. */
export function extractRawMeta(rawWb: { sheetOrder: string[]; sheets: Record<string, any> }): RawMeta {
  const headers: Record<string, string[]> = {};
  let validasi: RawMeta["validasi"] = null;
  for (const id of rawWb.sheetOrder || []) {
    const s = rawWb.sheets[id];
    if (!s) continue;
    const name = String(s.name || "").trim();
    // header = baris 0
    const hdrRow = s.cellData?.[0] || {};
    const cols = Object.keys(hdrRow).map(Number).sort((a, b) => a - b);
    const maxC = cols.length ? cols[cols.length - 1] : -1;
    const arr: string[] = [];
    for (let c = 0; c <= maxC; c++) arr[c] = hdrRow[c]?.v != null ? String(hdrRow[c].v) : "";
    if (name === "Validasi") {
      // simpan grid penuh (kecil) values-only
      const cellData: Record<number, Record<number, { v?: any }>> = {};
      for (const rk of Object.keys(s.cellData || {})) {
        const r = +rk; cellData[r] = {};
        for (const ck of Object.keys(s.cellData[r] || {})) {
          const c = +ck; const v = s.cellData[r][c]?.v;
          if (v != null) cellData[r][c] = { v };
        }
      }
      validasi = { name, cellData };
    } else {
      headers[name] = arr;
    }
  }
  return { headers, validasi };
}
