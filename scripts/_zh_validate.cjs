const XLSX = require('xlsx');
const fs = require('fs');
const file = process.argv[2];
const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellFormula: true });

// Build OPK index: count by (nik, week, jenisPekerjaan) where Counter==1
const opk = wb.Sheets['OPK'];
const rows = XLSX.utils.sheet_to_json(opk, { header: 1, defval: '' });
// header row 0: C=2 nik, P=15 jenis, R=17 counter, S=18 week
const idx = new Map();
let counted = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const nik = String(r[2]||'').trim();
  const jenis = String(r[15]||'').trim();
  const counter = String(r[17]||'').trim();
  const week = String(r[18]||'').trim();
  if (!nik || !jenis || counter !== '1') continue;
  const k = `${nik}|${week}|${jenis}`;
  idx.set(k, (idx.get(k)||0) + 1);
  counted++;
}
console.log('OPK rows total:', rows.length-1, '| counter=1 indexed:', counted, '| distinct keys:', idx.size);

// Validate "3.5 Sidak P2H": recompute pencapaian for cells that have formula, compare to cached
const sh = wb.Sheets['3.5 Sidak P2H'];
const target = 10, key = 'Sidak P2H';
const R = XLSX.utils.decode_range(sh['!ref']);
const g = (a) => { const c = sh[a]; return c ? c.v : undefined; };
// week header at row5 (index4); officer rows from row7 (index6)
// For each officer row, for each week-pair: hari col c, pencapaian col c+1
let checked = 0, match = 0, mism = [];
for (let rr = 6; rr <= R.e.r; rr++) {
  const nik = String(g(XLSX.utils.encode_cell({r:rr,c:2}))||'').trim(); // C
  if (!nik) continue;
  for (let cc = 6; cc <= R.e.c; cc += 2) {
    const wk = String(g(XLSX.utils.encode_cell({r:4,c:cc}))||'').trim(); // row5 header
    const hariAddr = XLSX.utils.encode_cell({r:rr,c:cc});
    const capAddr = XLSX.utils.encode_cell({r:rr,c:cc+1});
    const capCell = sh[capAddr];
    if (!capCell || capCell.f == null) continue; // only formula cells
    const hari = g(hariAddr);
    if (hari === 'NA' || hari === undefined || hari === '') continue;
    const denom = Math.ceil((Number(hari)/7)*target);
    const actual = idx.get(`${nik}|${wk}|${key}`) || 0;
    const mine = denom > 0 ? Math.min(actual/denom, 1) : 0;
    const cached = typeof capCell.v === 'number' ? capCell.v : null;
    checked++;
    if (cached != null && Math.abs(mine - cached) < 0.01) match++;
    else if (cached != null) mism.push(`${nik} ${wk}: mine=${(mine*100).toFixed(0)}% excel=${(cached*100).toFixed(0)}% (hari=${hari} actual=${actual} denom=${denom})`);
  }
}
console.log(`\n3.5 Sidak P2H — dicek ${checked} sel | COCOK ${match} | beda ${mism.length}`);
mism.slice(0,12).forEach(m=>console.log('  ✗ '+m));
