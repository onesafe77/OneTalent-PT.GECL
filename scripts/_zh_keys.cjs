const XLSX = require('xlsx');
const fs = require('fs');
const file = process.argv[2];
const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellFormula: true });
const sheets = ["3.5 Sidak P2H","3.6 Sidak Seatbelt","3.7 Sidak SIMPER","3.8 Sidak Kecepatan","3.9 Sidak Jarak Aman","3.10 Sidak Kepatuhan Rambu","5.1 Sidak Roster","5.2 Sidak Fatigue","7.2 Sidak LOTOTO","12.1 Sidak Keberadaan Pengawas","12.2 Sidak Fungsi Pengawas","12.3 Sidak Pencahayaan","12.4 IKK"];
const g = (ws, a) => { const c = ws[a]; return c ? (c.v != null ? c.v : '') : ''; };
for (const s of sheets) {
  const ws = wb.Sheets[s];
  if (!ws) { console.log(`MISSING: ${s}`); continue; }
  const f6 = g(ws,'F6');         // program key (jenisPekerjaan filter)
  const f7 = g(ws,'F7');         // target/week
  const a2 = String(g(ws,'A2')).slice(0,55); // target text
  const h7 = ws['H7'] && ws['H7'].f ? ws['H7'].f : '';
  // referenced raw sheet (OPK vs other) + program literal in formula
  const refSheet = (h7.match(/([A-Za-z]+)!\$[A-Z]/) || [])[1] || '';
  console.log(`• "${s}"`);
  console.log(`    F6(key)="${f6}"  F7(target)=${f7}  ref=${refSheet}  A2="${a2}"`);
}
