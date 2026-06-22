// Migrasi sekali-jalan: PDF prosedur K3 (dari /tmp/k3-migrate/files/<DEPT>) → Dokumen K3 OneTalent.
// - Kelompokkan per kode prosedur; revisi tertinggi = versi aktif, revisi lama = riwayat versi.
// - Status PUBLISHED. Metadata judul/last-review dari Master List xlsx (fallback nama file).
// - Idempoten: lewati documentCode yang sudah ada.
// Jalankan: npx tsx server/scripts/migrate-k3-docs.ts
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { db } from "../db";
import { documentMasterlist, documentVersions, uploadedFiles } from "@shared/schema";
import { eq } from "drizzle-orm";

const ROOT = "/tmp/k3-migrate/files";
const XLSX_PATH = "/tmp/k3-migrate/masterlist.xlsx";
const OWNER_NAME = "BAGUS ANDYKA FIRMANSYAH";
const OWNER_ID = "C-075768"; // employees.id Bagus Andyka Firmansyah

const DEPT_CATEGORY: Record<string, string> = {
  HSE: "Prosedur - Dept HSE",
  OPR: "Prosedur - Dept Opr",
  PLANT: "Prosedur - Dept Plant",
};

// ---- helpers ----
function excelSerialToISO(n: number): string | null {
  // Excel serial (1900 system) → YYYY-MM-DD
  if (!n || n < 20000 || n > 60000) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
const BULAN: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
  juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12",
};
function parseReviewDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return excelSerialToISO(v);
  const s = String(v).trim();
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s);
  if (m) {
    const mm = BULAN[m[2].toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${String(+m[1]).padStart(2, "0")}`;
  }
  return null;
}
function addYearISO(iso: string | null, years: number): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// Parse nama file PDF → {code, clause, rev, signed, title}
function parseFile(deptFolder: string, fileName: string) {
  let s = fileName.replace(/\.pdf$/i, "");
  const signed = /_signed/i.test(s);
  s = s.replace(/_signed/i, "");
  // dept token
  const deptTok = (/\b(HSE|HAUL|PLANT|OPR)\b/i.exec(s)?.[1] || deptFolder).toUpperCase();
  // revisi: R diikuti angka (R0, R00, R13)
  const revM = /\bR\s?(\d{1,2})\b/i.exec(s);
  const rev = revM ? parseInt(revM[1], 10) : 0;
  // klausul: angka bertitik (4.1.1, 4.2.10, 4.1.18.1)
  const clauseM = /(\d+\.\d+(?:\.\d+){0,2})/.exec(s);
  const clause = clauseM ? clauseM[1] : null;
  if (!clause) return null;
  const code = `GECL-${deptTok}-PPO-${clause}`;
  // judul: buang token GECL, dept, PPO, klausul, Rxx, dan tanda hubung
  let title = s
    .replace(/GECL/ig, " ").replace(/\bPPO\b/ig, " ").replace(/\b(HSE|HAUL|PLANT|OPR)\b/ig, " ")
    .replace(/\bR\s?\d{1,2}\b/ig, " ").replace(clause, " ").replace(/[-–]/g, " ")
    .replace(/\s+/g, " ").trim();
  return { code, clause, rev, signed, title, deptFolder };
}

function normCode(c: string): string {
  return String(c).toUpperCase().replace(/\s+/g, "").replace(/[–]/g, "-");
}

// ---- baca Master List (judul + last review per kode) ----
function loadMasterList(): Map<string, { title: string; lastReview: string | null }> {
  const map = new Map<string, { title: string; lastReview: string | null }>();
  if (!fs.existsSync(XLSX_PATH)) return map;
  const wb = XLSX.read(fs.readFileSync(XLSX_PATH), { type: "buffer" });
  for (const sn of wb.SheetNames) {
    if (!/^PPO /i.test(sn)) continue;
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sn], { header: 1, defval: "" });
    for (const r of rows) {
      const code = String(r[1] || "").trim();
      if (!/^GECL[-\s]/i.test(code)) continue;
      const title = String(r[2] || "").trim();
      map.set(normCode(code), { title, lastReview: parseReviewDate(r[3]) });
    }
  }
  return map;
}

async function main() {
  const master = loadMasterList();
  console.log(`[migrate] Master List: ${master.size} kode`);

  // Kumpulkan semua file per dept
  type FileRec = ReturnType<typeof parseFile> & { abspath: string; fileName: string };
  const groups = new Map<string, FileRec[]>(); // code → file revisions
  const skippedFiles: string[] = [];
  for (const dept of ["HSE", "PLANT", "OPR"]) {
    const dir = path.join(ROOT, dept);
    if (!fs.existsSync(dir)) continue;
    for (const fn of fs.readdirSync(dir)) {
      if (!fn.toLowerCase().endsWith(".pdf")) continue;
      const parsed = parseFile(dept, fn);
      if (!parsed) { skippedFiles.push(`${dept}/${fn}`); continue; }
      const rec = { ...parsed, abspath: path.join(dir, fn), fileName: fn } as FileRec;
      const key = `${dept}|${parsed.code}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(rec);
    }
  }
  console.log(`[migrate] ${groups.size} dokumen unik dari file; ${skippedFiles.length} file tak terparse`);
  if (skippedFiles.length) console.log("  tak terparse:", skippedFiles.join(", "));

  let created = 0, skipped = 0, versions = 0;
  for (const [key, recs] of Array.from(groups.entries())) {
    const dept = key.split("|")[0];
    const code = recs[0]!.code;
    // urut revisi naik; signed diutamakan di revisi sama
    recs.sort((a, b) => (a!.rev - b!.rev) || (Number(a!.signed) - Number(b!.signed)));
    const latest = recs[recs.length - 1]!;

    // idempoten: skip bila kode sudah ada
    const existing = await db.select().from(documentMasterlist).where(eq(documentMasterlist.documentCode, code));
    if (existing.length > 0) { skipped++; continue; }

    const ml = master.get(normCode(code));
    const title = (ml?.title && ml.title.length > 2) ? ml.title : (latest.title || code);
    const effectiveDate = ml?.lastReview || null;
    const nextReviewDate = addYearISO(effectiveDate, 1);
    const smkpClause = dept === "HSE" ? latest.clause : null;

    // 1) buat masterlist (PUBLISHED), current = revisi terbaru
    const [doc] = await db.insert(documentMasterlist).values({
      documentCode: code,
      title,
      category: DEPT_CATEGORY[dept],
      department: dept,
      currentVersion: 1,
      currentRevision: latest.rev,
      ownerId: OWNER_ID,
      ownerName: OWNER_NAME,
      lifecycleStatus: "PUBLISHED",
      controlType: "CONTROLLED",
      effectiveDate: effectiveDate as any,
      nextReviewDate: nextReviewDate as any,
      signRequired: false,
      smkpClause: smkpClause as any,
      retentionPeriod: "5_tahun",
      createdBy: "migration",
    } as any).returning();

    // 2) tiap revisi → uploaded_files + document_versions (lama→baru)
    for (const rec of recs) {
      const buf = fs.readFileSync(rec.abspath);
      const [uf] = await db.insert(uploadedFiles).values({
        data: buf.toString("base64"),
        filename: rec.fileName,
        mimeType: "application/pdf",
      } as any).returning();
      const isLatest = rec === latest;
      await db.insert(documentVersions).values({
        documentId: doc.id,
        versionNumber: 1,
        revisionNumber: rec.rev,
        fileName: rec.fileName,
        filePath: `/api/uploads/${uf.id}`,
        fileSize: buf.length,
        mimeType: "application/pdf",
        status: isLatest ? "ACTIVE" : "SUPERSEDED",
        changesNote: rec.signed ? "Versi ditandatangani (signed)" : "Migrasi dari arsip Drive",
        uploadedBy: "migration",
        uploadedByName: OWNER_NAME,
      } as any);
      versions++;
    }
    created++;
    console.log(`  ✓ ${code} — ${title} (${recs.length} revisi, current R${latest.rev})`);
  }

  console.log(`\n[migrate] SELESAI: dokumen dibuat=${created}, dilewati(ada)=${skipped}, total versi=${versions}`);
  process.exit(0);
}

main().catch((e) => { console.error("[migrate] GAGAL:", e); process.exit(1); });
