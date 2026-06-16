const XLSX = require('xlsx');
const fs = require('fs');
const [file, sheet, maxR, maxC] = [process.argv[2], process.argv[3], +(process.argv[4]||40), +(process.argv[5]||20)];
const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellFormula: true, cellDates: true });
const ws = wb.Sheets[sheet];
if (!ws) { console.log('NO SHEET', sheet); process.exit(0); }
const r = XLSX.utils.decode_range(ws['!ref']);
const eR = Math.min(r.e.r, maxR-1), eC = Math.min(r.e.c, maxC-1);
console.log(`### "${sheet}" (showing ${eR+1}r x ${eC+1}c of ${r.e.r+1}x${r.e.c+1})`);
for (let R = 0; R <= eR; R++) {
  let line = [];
  for (let C = 0; C <= eC; C++) {
    const addr = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = ws[addr];
    if (!cell) continue;
    const val = cell.w != null ? cell.w : cell.v;
    if (cell.f) line.push(`${addr}=[f:${cell.f}]→${val}`);
    else if (val !== '' && val != null) line.push(`${addr}:${String(val).slice(0,40)}`);
  }
  if (line.length) console.log(`R${R+1}| ` + line.join('  '));
}
