import "dotenv/config";
import pg from "pg";
import { computeLightWorkbook } from "../server/lib/zh-hf";

function newClient() { return new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); }

// 1) baca data lalu TUTUP koneksi (hindari idle-reset saat compute 54s)
let active: any, raw: any;
{
  const c = newClient(); await c.connect();
  const a = await c.query("SELECT data FROM zh_workbook WHERE id='active'");
  const r = await c.query("SELECT data FROM zh_workbook WHERE id='raw'");
  await c.end();
  if (!a.rows[0]) { console.log("NO active"); process.exit(1); }
  active = a.rows[0].data; raw = r.rows[0]?.data || null;
}
// 2) compute (tanpa koneksi DB)
const t0 = Date.now();
const light = computeLightWorkbook(active, raw);
console.log("compute selesai", ((Date.now() - t0) / 1000).toFixed(0) + "s");
// 3) buka koneksi BARU lalu tulis
{
  const c = newClient(); await c.connect();
  await c.query("INSERT INTO zh_workbook (id,name,data,updated_at) VALUES ('computed','computed',$1,now()) ON CONFLICT (id) DO UPDATE SET data=$1, updated_at=now()", [light]);
  const chk = await c.query("SELECT octet_length(data::text) b, jsonb_array_length(data->'sheetOrder') s FROM zh_workbook WHERE id='computed'");
  console.log("DONE computed bytes:", chk.rows[0].b, "sheets:", chk.rows[0].s);
  await c.end();
}
process.exit(0);
