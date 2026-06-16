const XLSX = require('xlsx');
const fs = require('fs');
const file = process.argv[2];
const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
const PROGRAMS = [
  {code:'3.5',name:'Sidak P2H',pillar:3,target:10},
  {code:'3.6',name:'Sidak Seatbelt',pillar:3,target:10},
  {code:'3.7',name:'Sidak SIMPER',pillar:3,target:10},
  {code:'3.8',name:'Sidak Kecepatan',pillar:3,target:10},
  {code:'3.9',name:'Sidak Jarak Aman',pillar:3,target:10},
  {code:'3.10',name:'Sidak Kepatuhan Rambu',pillar:3,target:10},
  {code:'5.1',name:'Sidak Roster',pillar:5,target:10},
  {code:'5.2',name:'Sidak Fatigue',pillar:5,target:10},
  {code:'7.2',name:'Sidak LOTOTO',pillar:7,target:10},
  {code:'12.1',name:'Sidak Keberadaan Pengawas',pillar:12,target:9},
  {code:'12.2',name:'Sidak Fungsi Pengawas',pillar:12,target:9},
  {code:'12.3',name:'Sidak Pencahayaan',pillar:12,target:9},
  {code:'12.4',name:'IKK',pillar:12,target:10},
];
const SHEET = { '3.5':'3.5 Sidak P2H','3.6':'3.6 Sidak Seatbelt','3.7':'3.7 Sidak SIMPER','3.8':'3.8 Sidak Kecepatan','3.9':'3.9 Sidak Jarak Aman','3.10':'3.10 Sidak Kepatuhan Rambu','5.1':'5.1 Sidak Roster','5.2':'5.2 Sidak Fatigue','7.2':'7.2 Sidak LOTOTO','12.1':'12.1 Sidak Keberadaan Pengawas','12.2':'12.2 Sidak Fungsi Pengawas','12.3':'12.3 Sidak Pencahayaan','12.4':'12.4 IKK' };
const out = [];
for (const p of PROGRAMS) {
  const sh = wb.Sheets[SHEET[p.code]];
  const R = XLSX.utils.decode_range(sh['!ref']);
  const g = (r,c) => { const cc = sh[XLSX.utils.encode_cell({r,c})]; return cc ? cc.v : undefined; };
  // week header at row5(idx4); week col pairs start col6 step2
  const weekCols = []; for (let c=6;c<=R.e.c;c+=2){ const w=String(g(4,c)||'').trim(); if(/^W\d+$/.test(w)) weekCols.push({c,wk:+w.slice(1)}); }
  const officers = [];
  for (let r=6;r<=R.e.r;r++){
    const nik=String(g(r,2)||'').trim(); const nama=String(g(r,1)||'').trim();
    if(!nik||!nama) continue;
    const att=[];
    for(const {c,wk} of weekCols){ const v=g(r,c); if(v===undefined||v==='') continue; att.push({wk, days: v==='NA'?null:Number(v)}); }
    officers.push({ ord:Number(g(r,0))||officers.length+1, nik, nama, dept:String(g(r,3)||'').trim(), jabatan:String(g(r,4)||'').trim(), attendance:att });
  }
  out.push({ ...p, officers });
  console.log(`${p.code.padEnd(5)} ${p.name.padEnd(28)} officers=${officers.length} weeksWithData=${weekCols.length}`);
}
fs.writeFileSync('scripts/zh_sidak_seed.json', JSON.stringify(out));
const totalOff = out.reduce((s,p)=>s+p.officers.length,0);
const totalAtt = out.reduce((s,p)=>s+p.officers.reduce((a,o)=>a+o.attendance.length,0),0);
console.log(`\nWROTE scripts/zh_sidak_seed.json | programs=${out.length} officers=${totalOff} attendanceCells=${totalAtt}`);
