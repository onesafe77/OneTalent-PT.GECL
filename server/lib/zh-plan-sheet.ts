// Tarik Plan Kehadiran dari Google Sheet (tab GECL) via export CSV (link-share, tanpa login).
// Parse section-aware → rows {section, nik, nama, dept, perusahaan, ord, days{week:val|null}}.
import Papa from "papaparse";
import { storage } from "../storage";

// Spreadsheet khusus "Plan Kehadiran" (2 tab: GECL pengawas + SAFETY PATROL GECL), link-share.
const DEFAULT_SHEET_ID = "1DbhYWRTWjQeUdXDTtPqRj9n4tk0a-_rHdqoQBqp8-4M";

export interface PlanRow {
  section: string; nik: string; nama: string | null; dept: string | null; perusahaan: string | null; ord: number;
  days: Record<number, number | null>;
}

export interface SafetyPatrolPlanRow { officerName: string; nik: string | null; week: number; shift1: string; shift2: string; }

async function cfg(key: string, fallback: string): Promise<string> {
  try { const v = await storage.getSystemSetting(key); return v && v.trim() ? v.trim() : fallback; } catch { return fallback; }
}

function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Ambil CSV satu tab via gviz by sheet name (stabil utk multi-tab, link-share).
async function fetchSheetCsv(sheetName: string): Promise<string[][]> {
  const id = await cfg("zh_plan_sheet_id", DEFAULT_SHEET_ID);
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) throw new Error(`Google Sheet tak terjangkau (HTTP ${resp.status}). Pastikan sheet di-share 'anyone with link'.`);
  const text = await resp.text();
  if (/<html/i.test(text.slice(0, 200))) throw new Error("Sheet tidak publik (dapat halaman login). Set share ke 'anyone with link can view'.");
  return (Papa.parse(text, { skipEmptyLines: false }).data as string[][]) || [];
}

function normSection(raw: string): string | null {
  const m = /pengawas\s+(hauling|fms|workshop)/i.exec(raw || "");
  if (!m) return null;
  const w = m[1].toLowerCase();
  const label = w === "fms" ? "FMS" : w[0].toUpperCase() + w.slice(1);
  return "Pengawas " + label;
}

/** Ambil & parse tab GECL → PlanRow[]. Throw bila tak terjangkau / format tak dikenal. */
export async function fetchPlanRowsFromSheet(): Promise<PlanRow[]> {
  const sheetName = await cfg("zh_plan_sheet_tab", "GECL");
  const grid = await fetchSheetCsv(sheetName);
  if (grid.length < 2) throw new Error("Sheet kosong / format tak dikenal.");

  // baris header minggu
  let weekColOf: Record<number, number> = {}; let best = 0, headerIdx = -1;
  grid.forEach((r, i) => {
    const map: Record<number, number> = {}; let n = 0;
    r.forEach((c, ci) => { const m = /^W\s*(\d+)$/i.exec(String(c).trim()); if (m) { map[ci] = +m[1]; n++; } });
    if (n > best) { best = n; headerIdx = i; weekColOf = map; }
  });
  if (best === 0) throw new Error("Header minggu (W1, W2, …) tak ditemukan di sheet.");

  const dataRows = grid.slice(headerIdx + 1);
  // kolom NIK & section
  const nikScore: Record<number, number> = {}, secScore: Record<number, number> = {};
  dataRows.forEach((r) => r.forEach((c, ci) => {
    const t = String(c).trim();
    if (/^C-?\d+$/i.test(t)) nikScore[ci] = (nikScore[ci] || 0) + 1;
    if (/pengawas\s+(hauling|fms|workshop)/i.test(t)) secScore[ci] = (secScore[ci] || 0) + 1;
  }));
  const nikCol = Object.keys(nikScore).sort((a, b) => nikScore[+b] - nikScore[+a])[0];
  const secCol = Object.keys(secScore).sort((a, b) => secScore[+b] - secScore[+a])[0];
  if (nikCol == null) throw new Error("Kolom NIK (mis. C-014627) tak ditemukan.");
  if (secCol == null) throw new Error("Kolom Jabatan/section (Pengawas Hauling/FMS/Workshop) tak ditemukan.");
  const nc = +nikCol, sc = +secCol, namaCol = nc - 1 >= 0 ? nc - 1 : nc + 1;
  const weekCols = Object.keys(weekColOf).map(Number);

  const out: PlanRow[] = [];
  dataRows.forEach((r, idx) => {
    const nik = String(r[nc] || "").trim().toUpperCase();
    if (!/^C-?\d+$/i.test(nik)) return;
    const section = normSection(String(r[sc] || ""));
    if (!section) return;
    const days: Record<number, number | null> = {};
    for (const ci of weekCols) {
      const raw = String(r[ci] ?? "").trim();
      if (raw === "" || /^NA$/i.test(raw)) { days[weekColOf[ci]] = null; continue; }
      const n = Number(raw); if (Number.isNaN(n)) continue;
      days[weekColOf[ci]] = Math.max(0, Math.min(7, n));
    }
    out.push({ section, nik, nama: String(r[namaCol] || "").trim() || null, dept: null, perusahaan: null, ord: idx, days });
  });
  if (!out.length) throw new Error("Tidak ada baris pengawas terbaca dari sheet.");
  return out;
}

/** Ambil & parse tab SAFETY PATROL GECL → rows {officerName, nik, week, shift1, shift2}. */
export async function fetchSafetyPatrolPlanFromSheet(): Promise<SafetyPatrolPlanRow[]> {
  const sheetName = await cfg("zh_plan_sp_tab", "SAFETY PATROL GECL");
  const grid = await fetchSheetCsv(sheetName);
  if (grid.length < 2) throw new Error("Tab Safety Patrol kosong / format tak dikenal.");

  // baris header = baris dgn sel terbanyak cocok "W<n> Shift <1|2>"
  let headerIdx = -1, best = 0;
  // map: week → { 1?: col, 2?: col }
  let weekShiftCol: Record<number, { 1?: number; 2?: number }> = {};
  grid.forEach((r, i) => {
    const map: Record<number, { 1?: number; 2?: number }> = {}; let n = 0;
    r.forEach((c, ci) => {
      const m = /^W\s*(\d+)\s*Shift\s*([12])$/i.exec(String(c).trim());
      if (m) { const wk = +m[1], sh = +m[2] as 1 | 2; (map[wk] ||= {})[sh] = ci; n++; }
    });
    if (n > best) { best = n; headerIdx = i; weekShiftCol = map; }
  });
  if (best === 0) throw new Error("Header 'W<n> Shift 1/2' tak ditemukan di tab Safety Patrol.");

  const header = grid[headerIdx].map((c) => String(c).trim().toLowerCase());
  const findCol = (...names: string[]) => header.findIndex((h) => names.some((nm) => h.includes(nm)));
  const nikCol = findCol("nik");
  const namaCol = findCol("nama safety patrol", "nama");
  if (namaCol < 0) throw new Error("Kolom 'Nama Safety Patrol' tak ditemukan.");

  // mirror sheet (seperti OPK pengawas): hanya nilai non-kosong & bukan "NA" → MASUK; kosong/NA → NA
  const mapVal = (raw: string): string => (raw.trim() !== "" && !/^NA$/i.test(raw.trim())) ? "MASUK" : "NA";
  const out: SafetyPatrolPlanRow[] = [];
  for (const r of grid.slice(headerIdx + 1)) {
    const nama = String(r[namaCol] || "").trim();
    if (!nama) continue;
    const nik = nikCol >= 0 ? (String(r[nikCol] || "").trim() || null) : null;
    // tulis SEMUA minggu di header (kosong → NA) agar halaman mencerminkan sheet apa adanya
    for (const [wkStr, cols] of Object.entries(weekShiftCol)) {
      const week = Number(wkStr);
      const raw1 = cols[1] != null ? String(r[cols[1]] ?? "").trim() : "";
      const raw2 = cols[2] != null ? String(r[cols[2]] ?? "").trim() : "";
      out.push({ officerName: titleCase(nama), nik, week, shift1: mapVal(raw1), shift2: mapVal(raw2) });
    }
  }
  if (!out.length) throw new Error("Tidak ada baris safety patrol terisi di tab.");
  return out;
}
