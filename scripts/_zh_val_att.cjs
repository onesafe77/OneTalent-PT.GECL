const XLSX=require('xlsx'), fs=require('fs');
const wb=XLSX.read(fs.readFileSync(process.argv[2]),{type:'buffer',cellFormula:true});
// index Attendance: count by (nik, month, typeMatch)
const att=XLSX.utils.sheet_to_json(wb.Sheets['Attendance'],{header:1,defval:''});
// cols: D=3 tipe, G=6 nik, R=17 month
const idx=new Map();
for(let i=1;i<att.length;i++){const r=att[i];const nik=String(r[6]||'').trim();const tipe=String(r[3]||'').trim();const mon=String(r[17]||'').trim();if(!nik)continue;idx.set(`${nik}|${mon}|${tipe}`,(idx.get(`${nik}|${mon}|${tipe}`)||0)+1);}
const cnt=(nik,mon,tipe)=>idx.get(`${nik}|${mon}|${tipe}`)||0;
const sh=wb.Sheets['3.1.1 Safety Talk'];
const g=(a)=>{const c=sh[a];return c?c.v:undefined;};
const R=XLSX.utils.decode_range(sh['!ref']);
// month input cols (G,I,...) at even col idx 6,8,...; capaian formula col = inputCol+1
let checked=0,match=0,mism=[];
for(let rr=3;rr<=R.e.r;rr++){
  const nik=String(g(XLSX.utils.encode_cell({r:rr,c:2}))||'').trim(); // C
  const F=Number(g(XLSX.utils.encode_cell({r:rr,c:5}))); // F target
  if(!nik||!F)continue;
  for(let cc=6;cc<=R.e.c-1;cc+=2){
    const mon=String(g(XLSX.utils.encode_cell({r:1,c:cc}))||'').trim(); // row2 month number
    if(!/^\d+$/.test(mon))continue;
    const capCell=sh[XLSX.utils.encode_cell({r:rr,c:cc+1})];
    if(!capCell||capCell.f==null)continue;
    const G=g(XLSX.utils.encode_cell({r:rr,c:cc})); // weeks present
    const ST=cnt(nik,mon,'SAFETY TALK');
    const Sos=cnt(nik,mon,'Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules');
    const Gen=cnt(nik,mon,'GENERAL SAFETY TALK');
    let mine;
    if(G==='NA')continue;
    if(G===''||G===undefined) mine=Math.min(ST+Sos+Gen/F,1);
    else mine=Math.min(ST+Sos+Gen/((Number(G)/4)*F),1);
    const cached=typeof capCell.v==='number'?capCell.v:null;
    checked++;
    if(cached!=null&&Math.abs(mine-cached)<0.01)match++;
    else if(cached!=null)mism.push(`${nik} M${mon}: mine=${(mine*100).toFixed(0)}% xl=${(cached*100).toFixed(0)}% (ST${ST} Sos${Sos} Gen${Gen} G=${G})`);
  }
}
console.log(`3.1.1 Safety Talk — dicek ${checked} | COCOK ${match} | beda ${mism.length}`);
mism.slice(0,10).forEach(m=>console.log('  ✗ '+m));
