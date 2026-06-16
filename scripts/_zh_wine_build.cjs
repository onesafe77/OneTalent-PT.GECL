const XLSX=require('xlsx'),fs=require('fs');
const wb=XLSX.read(fs.readFileSync(process.argv[2]),{type:'buffer',cellFormula:true});
// index Inspeksi by (company|lokasi|sublokasi|week) → count
const ins=XLSX.utils.sheet_to_json(wb.Sheets['Inspeksi'],{header:1,defval:''});
// E=4 company, I=8 lokasi, J=9 sublokasi, W=22 week
const cnt=new Map();
for(let i=1;i<ins.length;i++){const r=ins[i];const co=String(r[4]||'').trim();const lo=String(r[8]||'').trim();const su=String(r[9]||'').trim();const wk=String(r[22]||'').trim();if(!lo||!wk)continue;const k=co+'|'+lo+'|'+su+'|'+wk;cnt.set(k,(cnt.get(k)||0)+1);}
const sh=wb.Sheets['3.3 WINE'];const R=XLSX.utils.decode_range(sh['!ref']);
const g=(r,c)=>{const cc=sh[XLSX.utils.encode_cell({r,c})];return cc?cc.v:undefined;};
const weekCol={};for(let c=4;c<=R.e.c;c++){const v=String(g(4,c)||'').trim();if(/^W\d+$/.test(v))weekCol[c]=+v.slice(1);}
const areas=[];let checked=0,match=0;
for(let r=5;r<=R.e.r;r++){const co=String(g(r,1)||'').trim();const lo=String(g(r,2)||'').trim();const su=String(g(r,3)||'').trim();if(!lo)continue;
  areas.push({company:co,lokasi:lo,sublokasi:su});
  for(const c in weekCol){const wk='W'+weekCol[c];const cell=sh[XLSX.utils.encode_cell({r,c:+c})];if(!cell||cell.f==null)continue;
    const k=co+'|'+lo+'|'+su+'|'+wk;const n=cnt.get(k)||0;const mine=n>1?1:0;
    const cached=typeof cell.v==='number'?cell.v:null;if(cached!=null){checked++;if(Math.abs(mine-cached)<0.01)match++;}
  }
}
fs.writeFileSync('scripts/zh_wine_seed.json',JSON.stringify(areas));
console.log(`3.3 WINE: areas=${areas.length} | validasi ${match}/${checked}`);
