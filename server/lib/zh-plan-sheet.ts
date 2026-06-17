// Tarik Plan Kehadiran dari Google Sheet (tab GECL) via export CSV (link-share, tanpa login).
// Parse section-aware → rows {section, nik, nama, dept, perusahaan, ord, days{week:val|null}}.
import Papa from "papaparse";
import { storage } from "../storage";

const DEFAULT_SHEET_ID = "1VU6DfhhJEW5PvpuLbdZuvoNxJlswnU7-MoBPaxJVxGk";
const DEFAULT_GECL_GID = "278633161";

export interface PlanRow {
  section: string; nik: string; nama: string | null; dept: string | null; perusahaan: string | null; ord: number;
  days: Record<number, number | null>;
}

async function cfg(key: string, fallback: string): Promise<string> {
  try { const v = await storage.getSystemSetting(key); return v && v.trim() ? v.trim() : fallback; } catch { return fallback; }
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
  const id = await cfg("zh_plan_sheet_id", DEFAULT_SHEET_ID);
  const gid = await cfg("zh_plan_sheet_gid", DEFAULT_GECL_GID);
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) throw new Error(`Google Sheet tak terjangkau (HTTP ${resp.status}). Pastikan sheet di-share 'anyone with link'.`);
  const text = await resp.text();
  if (/<html/i.test(text.slice(0, 200))) throw new Error("Sheet tidak publik (dapat halaman login). Set share ke 'anyone with link can view'.");
  const grid: string[][] = (Papa.parse(text, { skipEmptyLines: false }).data as string[][]) || [];
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
