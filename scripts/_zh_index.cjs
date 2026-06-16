const XLSX = require('xlsx');
const fs = require('fs');
const path = process.argv[2];
const wb = XLSX.read(fs.readFileSync(path), { type: 'buffer', cellFormula: true, cellDates: true });
console.log('TOTAL SHEETS:', wb.SheetNames.length);
console.log('');
wb.SheetNames.forEach((name, i) => {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'] || 'EMPTY';
  let rows = 0, cols = 0;
  if (ws['!ref']) { const r = XLSX.utils.decode_range(ws['!ref']); rows = r.e.r - r.s.r + 1; cols = r.e.c - r.s.c + 1; }
  const merges = (ws['!merges'] || []).length;
  console.log(`${String(i+1).padStart(2)}. "${name}"  [${rows}r x ${cols}c]  merges=${merges}`);
});
