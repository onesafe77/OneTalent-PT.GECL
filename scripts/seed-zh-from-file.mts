import "dotenv/config";
import { readFileSync } from "fs";
import pg from "pg";
import { xlsxToUniver } from "../server/lib/univer-xlsx";
import { computeLightWorkbook } from "../server/lib/zh-hf";

const RAW = new Set(["Validasi", "Hazard", "Inspeksi", "Observasi", "OPK", "Attendance", "FMS"]);
const file = process.argv[2];
if (!file) { console.log("Usage: tsx seed-zh-from-file.mts <path.xlsx>"); process.exit(1); }

// 1) baca + parse Excel LOKAL (tanpa DB)
const wb: any = await xlsxToUniver(readFileSync(file));
const program: any = { id: wb.id, name: wb.name, sheetOrder: [], sheets: {}, styles: wb.styles || {} };
const raw: any = { sheetOrder: [], sheets: {} };
for (const id of wb.sheetOrder) {
  const sh = wb.sheets[id];
  if (RAW.has(String(sh.name || "").trim())) { raw.sheetOrder.push(id); raw.sheets[id] = sh; }
  else { program.sheetOrder.push(id); program.sheets[id] = sh; }
}
console.log("parsed: program", program.sheetOrder.length, "raw", raw.sheetOrder.length);

// 2) compute light (tanpa DB)
const t0 = Date.now();
const light = computeLightWorkbook(program, raw);
console.log("compute", ((Date.now() - t0) / 1000).toFixed(0) + "s | light", (JSON.stringify(light).length / 1024 / 1024).toFixed(1) + "MB");

// 3) tulis ke DB: active(program), raw, computed — write kecil per item, dgn retry
async function writeRow(id: string, name: string, data: any) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      await c.query("INSERT INTO zh_workbook (id,name,data,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (id) DO UPDATE SET data=$3, name=$2, updated_at=now()", [id, name, data]);
      await c.end();
      console.log("  tulis", id, "OK");
      return;
    } catch (e: any) {
      try { await c.end(); } catch { /* noop */ }
      console.log("  tulis", id, "gagal (attempt " + attempt + "):", e?.message);
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
await writeRow("active", wb.name, program);
await writeRow("raw", "raw", raw);
await writeRow("computed", "computed", light);
console.log("SELESAI ✅");
process.exit(0);
