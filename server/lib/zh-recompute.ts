// Recompute Workbook RINGAN (HyperFormula dari template+raw) di latar belakang → row 'computed'.
// Standalone agar dipakai routes (upload/save/import/plan) & cron.
import { eq } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { zhWorkbook } from "@shared/schema";

let zhComputing = false;
export function isZhComputing(): boolean { return zhComputing; }

export function recomputeWorkbook(): void {
  if (zhComputing) return;
  zhComputing = true;
  storage.setSystemSetting("zh_workbook_computing", "1").catch(() => {});
  setTimeout(async () => {
    try {
      const [act] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "active")).limit(1);
      if (!act) return;
      const [rawRow] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "raw")).limit(1);
      const [comp] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "computed")).limit(1);
      // gabung edit manual user (dari 'computed') ke template: sel TANPA formula diisi nilai dari computed
      const template: any = JSON.parse(JSON.stringify(act.data));
      if (comp?.data) {
        const cd: any = comp.data;
        for (const id of template.sheetOrder || []) {
          const ts = template.sheets[id]; const cs = cd.sheets?.[id]; if (!ts || !cs) continue;
          for (const r of Object.keys(cs.cellData || {})) {
            for (const c of Object.keys(cs.cellData[r] || {})) {
              const tcell = ts.cellData?.[r]?.[c];
              if (tcell && tcell.f) continue;
              const v = cs.cellData[r][c]?.v;
              if (v == null) continue;
              if (!ts.cellData[r]) ts.cellData[r] = {};
              ts.cellData[r][c] = { ...(ts.cellData[r][c] || {}), v };
            }
          }
        }
      }
      // injeksi Plan Kehadiran (hari/NA) + formula Pencapaian per pengawas×minggu (sebelum compute)
      try {
        const { loadAttendanceByProgram, injectAttendance } = await import("./zh-attendance-inject");
        const year = new Date().getFullYear();
        const att = await loadAttendanceByProgram(year);
        const n = injectAttendance(template, att);
        console.log(`[zh-hf] injeksi kehadiran ${year}: ${n} sel`);
      } catch (e: any) { console.error("[zh-hf] injeksi kehadiran gagal:", e?.message || e); }

      // data mentah: utamakan tabel zh_* (live) via zh_raw_meta; fallback blob 'raw'
      let rawForHf: any = (rawRow?.data as any) || null;
      try {
        const { extractRawMeta, buildRawWorkbookFromDb } = await import("./zh-raw-grid");
        let metaStr = await storage.getSystemSetting("zh_raw_meta");
        if (!metaStr && rawRow?.data) {
          try {
            const meta = extractRawMeta(rawRow.data as any);
            metaStr = JSON.stringify(meta);
            await storage.setSystemSetting("zh_raw_meta", metaStr);
            console.log("[zh-hf] zh_raw_meta dibuat dari blob raw (backfill)");
          } catch { /* noop */ }
        }
        if (metaStr) {
          const fromDb = await buildRawWorkbookFromDb(JSON.parse(metaStr));
          if (fromDb && fromDb.sheetOrder.length) { rawForHf = fromDb; console.log("[zh-hf] raw dari tabel zh_* →", fromDb.sheetOrder.join(",")); }
        }
      } catch (e: any) { console.error("[zh-hf] build raw dari DB gagal, pakai blob:", e?.message || e); }

      const { computeLightWorkbook } = await import("./zh-hf");
      const light = computeLightWorkbook(template, rawForHf);
      await db.insert(zhWorkbook).values({ id: "computed", name: "computed", data: light, updatedAt: new Date() })
        .onConflictDoUpdate({ target: zhWorkbook.id, set: { data: light, updatedAt: new Date() } });
      console.log("[zh-hf] recompute selesai → computed disimpan");
    } catch (e: any) {
      console.error("[zh-hf] recompute gagal:", e?.message || e);
    } finally {
      zhComputing = false;
      await storage.setSystemSetting("zh_workbook_computing", "0").catch(() => {});
    }
  }, 50);
}
