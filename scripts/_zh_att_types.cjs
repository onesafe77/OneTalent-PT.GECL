const XLSX=require('xlsx'),fs=require('fs');
const wb=XLSX.read(fs.readFileSync(process.argv[2]),{type:'buffer',cellFormula:true});
for(const s of ['1.1 Sosialisasi IBPR','2.1 Sosialisasi Golden Rules','3.1.1 Safety Talk']){
  const sh=wb.Sheets[s];const R=XLSX.utils.decode_range(sh['!ref']);
  // find first formula cell in data area, extract D-match literals + target F + roster count
  let types=new Set(),sampleF=null;
  for(let rr=3;rr<=Math.min(R.e.r,30)&&!sampleF;rr++)for(let cc=6;cc<=R.e.c;cc++){const c=sh[XLSX.utils.encode_cell({r:rr,c:cc})];if(c&&c.f&&c.f.includes('Attendance')){sampleF=c.f;break;}}
  if(sampleF){const m=sampleF.match(/Attendance!\$D:\$D,"([^"]+)"/g)||[];m.forEach(x=>types.add(x.match(/"([^"]+)"/)[1]));}
  // roster count + target
  let rows=0,target=null;
  for(let rr=3;rr<=R.e.r;rr++){const nik=sh[XLSX.utils.encode_cell({r:rr,c:2})];const f=sh[XLSX.utils.encode_cell({r:rr,c:5})];if(nik&&nik.v){rows++;if(target==null&&f)target=f.v;}}
  console.log(`\n"${s}" workers=${rows} target/bln=${target}`);
  console.log('  D-types: '+[...types].map(t=>`"${t}"`).join(' | '));
}
