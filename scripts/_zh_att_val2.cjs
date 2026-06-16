const XLSX=require('xlsx'),fs=require('fs');
const wb=XLSX.read(fs.readFileSync(process.argv[2]),{type:'buffer',cellFormula:true});
const att=XLSX.utils.sheet_to_json(wb.Sheets['Attendance'],{header:1,defval:''});
const idx=new Map();
for(let i=1;i<att.length;i++){const r=att[i];const nik=String(r[6]||'').trim();const t=String(r[3]||'').trim();const m=String(r[17]||'').trim();if(!nik)continue;idx.set(`${nik}|${m}|${t}`,(idx.get(`${nik}|${m}|${t}`)||0)+1);}
const cnt=(nik,m,t)=>idx.get(`${nik}|${m}|${t}`)||0;
const PROG=[
 {code:'1.1',sheet:'1.1 Sosialisasi IBPR'},
 {code:'2.1',sheet:'2.1 Sosialisasi Golden Rules'},
 {code:'3.1.1',sheet:'3.1.1 Safety Talk'},
];
for(const p of PROG){
 const sh=wb.Sheets[p.sheet];const R=XLSX.utils.decode_range(sh['!ref']);
 const val=(r,c)=>{const cc=sh[XLSX.utils.encode_cell({r,c})];return cc?cc.v:undefined;};
 // month header per column: cari integer 1..12 di baris 0..4 utk tiap kolom
 const colMonth={};
 for(let c=0;c<=R.e.c;c++)for(let r=0;r<5;r++){const v=val(r,c);if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12){colMonth[c]=v;break;}}
 let checked=0,match=0,mism=[];
 for(let r=0;r<=R.e.r;r++)for(let c=0;c<=R.e.c;c++){
   const cell=sh[XLSX.utils.encode_cell({r,c})];
   if(!cell||!cell.f||!cell.f.includes('Attendance!$D'))continue;
   const mon=colMonth[c];if(!mon)continue;
   const nik=String(val(r,2)||'').trim();const F=Number(val(r,5));if(!nik||!F)continue;
   // ekstrak tipe & cek apakah term terakhir dibagi denom (pola "/$F" atau "/((G/4)*$F)")
   const types=(cell.f.match(/Attendance!\$D:\$D,"([^"]+)"/g)||[]).map(x=>x.match(/"([^"]+)"/)[1]);
   const G=val(r,c-1); // weeks-present mungkin di kolom kiri (ST) — cek bila formula pakai (G/4)
   const usesG=/\/4\)\*\$F/.test(cell.f)||/G?\d*\/4/.test(cell.f);
   let denom=F;
   if(/\(\([A-Z]+\d+\/4\)\*\$F/.test(cell.f)){ if(G==='NA'){denom=null} else if(G!==''&&G!==undefined) denom=(Number(G)/4)*F; }
   if(denom===null)continue;
   // jumlah: semua tipe kecuali terakhir utuh; terakhir dibagi denom (pola Excel)
   let sum=0;for(let k=0;k<types.length-1;k++)sum+=cnt(nik,String(mon),types[k]);
   sum+=cnt(nik,String(mon),types[types.length-1])/denom;
   const mine=Math.min(sum,1);
   const cached=typeof cell.v==='number'?cell.v:null;
   if(cached!=null){checked++;if(Math.abs(mine-cached)<0.01)match++;else mism.push(`${nik} M${mon}: ${(mine*100).toFixed(0)}% vs ${(cached*100).toFixed(0)}%`);}
 }
 console.log(`${p.code} ${p.sheet}: COCOK ${match}/${checked}`+(mism.length?` | contoh beda: ${mism.slice(0,3).join('; ')}`:''));
}
