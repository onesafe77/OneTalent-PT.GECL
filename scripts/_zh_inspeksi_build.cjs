const XLSX=require('xlsx'),fs=require('fs');
const wb=XLSX.read(fs.readFileSync(process.argv[2]),{type:'buffer',cellFormula:true});
// index Inspeksi: by (nik, week) → {total, sesuai}
const ins=XLSX.utils.sheet_to_json(wb.Sheets['Inspeksi'],{header:1,defval:''});
// C=2 nik, W=22 week, Z=25 kesesuaian
const tot=new Map(),ses=new Map();
for(let i=1;i<ins.length;i++){const r=ins[i];const nik=String(r[2]||'').trim();const wk=String(r[22]||'').trim();const z=String(r[25]||'').trim();if(!nik||!wk)continue;const k=nik+'|'+wk;tot.set(k,(tot.get(k)||0)+1);if(z==='Sesuai')ses.set(k,(ses.get(k)||0)+1);}
const sh=wb.Sheets['3.2.2 Kesesuaian Waktu Inspeksi'];const R=XLSX.utils.decode_range(sh['!ref']);
const g=(r,c)=>{const cc=sh[XLSX.utils.encode_cell({r,c})];return cc?cc.v:undefined;};
// week header row2 (idx1) from col F(5)
const weekCol={};for(let c=5;c<=R.e.c;c++){const v=String(g(1,c)||'').trim();if(/^W\d+$/.test(v))weekCol[c]=+v.slice(1);}
const workers=[];let checked=0,match=0;
for(let r=3;r<=R.e.r;r++){const nik=String(g(r,2)||'').trim();const nama=String(g(r,1)||'').trim();if(!nik||!nama)continue;
  workers.push({nik,nama,dept:String(g(r,3)||'').trim(),jabatan:String(g(r,4)||'').trim()});
  for(const c in weekCol){const wk='W'+weekCol[c];const capCell=sh[XLSX.utils.encode_cell({r,c:+c})];if(!capCell||capCell.f==null)continue;
    const k=nik+'|'+wk;const t=tot.get(k)||0;const s=ses.get(k)||0;const mine=t>0?Math.min(s/t,1):0;
    const cached=typeof capCell.v==='number'?capCell.v:null;if(cached!=null){checked++;if(Math.abs(mine-cached)<0.01)match++;}
  }
}
fs.writeFileSync('scripts/zh_inspeksi_seed.json',JSON.stringify([{code:'3.2.2',name:'Kesesuaian Waktu Inspeksi',pillar:3,workers}]));
console.log(`3.2.2: workers=${workers.length} | validasi ${match}/${checked} | WROTE seed`);
