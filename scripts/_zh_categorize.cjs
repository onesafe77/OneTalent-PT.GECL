const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.read(fs.readFileSync(process.argv[2]), { type: 'buffer', cellFormula: true });
const RAW = new Set(['Validasi','Hazard','Inspeksi','Observasi','OPK','Attendance','FMS']);
const DONE = new Set(['3.5 Sidak P2H','3.6 Sidak Seatbelt','3.7 Sidak SIMPER','3.8 Sidak Kecepatan','3.9 Sidak Jarak Aman','3.10 Sidak Kepatuhan Rambu','5.1 Sidak Roster','5.2 Sidak Fatigue','7.2 Sidak LOTOTO','12.1 Sidak Keberadaan Pengawas','12.2 Sidak Fungsi Pengawas','12.3 Sidak Pencahayaan','12.4 IKK']);
for (const name of wb.SheetNames) {
  if (RAW.has(name) || DONE.has(name)) continue;
  const ws = wb.Sheets[name]; if (!ws['!ref']) { console.log(`"${name}" EMPTY`); continue; }
  const R = XLSX.utils.decode_range(ws['!ref']);
  let formulas = 0, dataRows = 0; const refSheets = new Set(); let kw = new Set();
  const KW = ['target','capaian','pencapaian','%','realisasi','rencana','plan','aktual','score','nilai','persentase'];
  for (let r = R.s.r; r <= Math.min(R.e.r, 2000); r++) {
    let rowHas = false;
    for (let c = R.s.c; c <= R.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({r,c})]; if (!cell) continue; rowHas = true;
      if (cell.f) { formulas++; const m = cell.f.match(/'?([A-Za-z0-9 ._]+)'?!/g); if (m) m.forEach(x=>refSheets.add(x.replace(/[!']/g,'').trim())); }
      const v = String(cell.v||'').toLowerCase();
      for (const k of KW) if (v.includes(k)) kw.add(k);
    }
    if (rowHas) dataRows++;
  }
  const hdr = [];
  for (let c = R.s.c; c <= Math.min(R.e.c, 12); c++){ const cell=ws[XLSX.utils.encode_cell({r:R.s.r,c})]; if(cell&&cell.v!=null&&cell.v!=='') hdr.push(String(cell.v).slice(0,18)); }
  console.log(`\n"${name}" [${R.e.r+1}r×${R.e.c+1}c] f=${formulas} dataRows~${dataRows}`);
  console.log(`   kw: ${[...kw].join(',')||'-'} | refs: ${[...refSheets].slice(0,6).join(',')||'-'}`);
  console.log(`   hdr: ${hdr.join(' | ').slice(0,140)}`);
}
