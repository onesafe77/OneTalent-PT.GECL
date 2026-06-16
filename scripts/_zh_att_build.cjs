const XLSX=require('xlsx'),fs=require('fs');
const wb=XLSX.read(fs.readFileSync(process.argv[2]),{type:'buffer',cellFormula:true});
const att=XLSX.utils.sheet_to_json(wb.Sheets['Attendance'],{header:1,defval:''});
const idx=new Map();
for(let i=1;i<att.length;i++){const r=att[i];const nik=String(r[6]||'').trim();const tipe=String(r[3]||'').trim();const mon=String(r[17]||'').trim();if(!nik)continue;idx.set(`${nik}|${mon}|${tipe}`,(idx.get(`${nik}|${mon}|${tipe}`)||0)+1);}
const cnt=(nik,mon,t)=>idx.get(`${nik}|${mon}|${t}`)||0;
const PROG=[
 {code:'1.1',name:'Sosialisasi IBPR',pillar:1,sheet:'1.1 Sosialisasi IBPR',types:['Sosialisasi IBPR','Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules','P5M, Sosialisasi IBPR, dan Sosialisasi Golden Rules']},
 {code:'2.1',name:'Sosialisasi Golden Rules',pillar:2,sheet:'2.1 Sosialisasi Golden Rules',types:['Sosialisasi Golden Rules','Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules','P5M, Sosialisasi IBPR, dan Sosialisasi Golden Rules']},
 {code:'3.1.1',name:'Safety Talk',pillar:3,sheet:'3.1.1 Safety Talk',types:['SAFETY TALK','Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules','GENERAL SAFETY TALK']},
];
const out=[];
for(const p of PROG){
  const sh=wb.Sheets[p.sheet];const R=XLSX.utils.decode_range(sh['!ref']);
  const g=(r,c)=>{const cc=sh[XLSX.utils.encode_cell({r,c})];return cc?cc.v:undefined;};
  const workers=[];let checked=0,match=0;
  for(let rr=3;rr<=R.e.r;rr++){
    const nik=String(g(rr,2)||'').trim(),nama=String(g(rr,1)||'').trim();const F=Number(g(rr,5));
    if(!nik||!nama||!F)continue;
    const months=[];
    for(let cc=6;cc<=R.e.c-1;cc+=2){
      const mon=String(g(1,cc)||'').trim();if(!/^\d+$/.test(mon))continue;
      const G=g(rr,cc);const capCell=sh[XLSX.utils.encode_cell({r:rr,c:cc+1})];
      const c1=cnt(nik,mon,p.types[0]),c2=cnt(nik,mon,p.types[1]),c3=cnt(nik,mon,p.types[2]);
      let mine=null;
      if(G==='NA')mine=null;
      else if(G===''||G===undefined)mine=Math.min(c1+c2+c3/F,1);
      else mine=Math.min(c1+c2+c3/((Number(G)/4)*F),1);
      if(capCell&&typeof capCell.v==='number'){checked++;if(mine!=null&&Math.abs(mine-capCell.v)<0.01)match++;}
      // simpan weeks-present (proraasi) bila ada
      if(G!==''&&G!==undefined) months.push({month:Number(mon),wp:G==='NA'?null:Number(G)});
    }
    workers.push({nik,nama,dept:String(g(rr,3)||'').trim(),jabatan:String(g(rr,4)||'').trim(),target:F,months});
  }
  console.log(`${p.code} ${p.name}: workers=${workers.length} | validasi ${match}/${checked}`);
  out.push({...p,workers});
}
fs.writeFileSync('scripts/zh_att_seed.json',JSON.stringify(out));
console.log('WROTE scripts/zh_att_seed.json');
