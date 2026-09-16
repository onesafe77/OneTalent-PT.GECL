import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Layar masuk mengikuti prototipe (OneTalent.dc.html → runEntry):
//   0 tirai hitam menyapu dari kiri
//   1 lambang cakra "agung" mekar di tengah
//   2-3 label tahap berkilau + garis progres 33 → 66 → 100, lambang mulai berputar
//   4 lambang terbang mengecil ke posisi logo sidebar, lalu layar memudar
// Dipakai sebagai splash sekali per sesi (workspace.tsx) dan fallback Suspense.

interface LoadingScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
  className?: string;
}

const TAHAP = ["Memeriksa kredensial", "Memeriksa kredensial", "Memuat hak akses", "Menyiapkan workspace", "Menyiapkan workspace"];
const PROGRES = [0, 0, 33, 66, 100];
// Jadwal fase (ms). Lebih ringkas dari prototipe (3,8 dtk) karena ini diputar di aplikasi nyata.
const JADWAL = [180, 700, 1300, 1950, 2350];

// Geometri lambang agung dari prototipe (<symbol ca-l / ca-s / ca-r>).
const L = "M50 33C60.5 25.5 60.5 15 50 8C39.5 15 39.5 25.5 50 33Z";
const S = "M50 33C57 28.5 57 22.2 50 18C43 22.2 43 28.5 50 33Z";
const R = "M50 45.5C53.2 42.35 53.2 37.94 50 35C46.8 37.94 46.8 42.35 50 45.5Z";

function CakraAgung({ size, putar }: { size: number; putar: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"
      className={cn("ld-cakra", putar && "ld-putar")}>
      <circle className="ld-rim" cx={50} cy={50} r={47} />
      <circle className="ld-rim2" cx={50} cy={50} r={43} />
      <g className="ld-dept">{[0, 90, 180, 270].map((d) => <path key={d} d={L} transform={`rotate(${d} 50 50)`} />)}</g>
      <g className="ld-cross">{[45, 135, 225, 315].map((d) => <path key={d} d={S} transform={`rotate(${d} 50 50)`} />)}</g>
      <g className="ld-ros">{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <path key={d} d={R} transform={`rotate(${d} 50 50)`} />)}</g>
      <circle className="ld-dot" cx={50} cy={50} r={2.6} />
      <circle className="ld-arc" cx={50} cy={50} r={47} strokeDasharray="26.6 295.3" />
    </svg>
  );
}

export function LoadingScreen({ isLoading, onComplete, className }: LoadingScreenProps) {
  const [fase, setFase] = useState(0);
  const [pudar, setPudar] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const hemat = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Fallback Suspense (tanpa onComplete): cukup tampil berputar sampai halaman siap.
    if (!onComplete) { const t = setTimeout(() => setFase(3), 150); return () => clearTimeout(t); }
    if (hemat) { const t = setTimeout(onComplete, 400); return () => clearTimeout(t); }
    const timer = JADWAL.map((ms, i) => setTimeout(() => setFase(i + 1), ms));
    timer.push(setTimeout(() => setPudar(true), 2600));
    timer.push(setTimeout(() => onComplete(), 2900));
    return () => timer.forEach(clearTimeout);
  }, [isLoading, onComplete]);

  if (!isLoading) return null;

  const terbang = fase >= 5;

  return (
    <div role="status" aria-live="polite" aria-label={TAHAP[Math.min(fase, 4)]}
      className={cn("fixed inset-0 z-[160] overflow-hidden transition-opacity duration-300", pudar && "opacity-0",
        // Cek sesi saat refresh biasanya < 200 ms: jangan kedipkan layar untuk itu.
        !onComplete && "bg-white [animation:ld-muncul_200ms_ease-out_300ms_both]", className)}>
      <style>{`
        @keyframes ld-tirai{from{transform:translateX(-100%)}to{transform:none}}
        @keyframes ld-muncul{from{opacity:0}to{opacity:1}}
        @keyframes ld-mekar{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
        @keyframes ld-cw{to{transform:rotate(360deg)}}
        @keyframes ld-ccw{to{transform:rotate(-360deg)}}
        @keyframes ld-denyut{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
        @keyframes ld-kilau{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .ld-cakra{display:block;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
        .ld-cakra .ld-rim{opacity:.4}.ld-cakra .ld-rim2{opacity:.22}
        .ld-cakra .ld-cross{opacity:.6}.ld-cakra .ld-ros{opacity:.46}
        .ld-cakra .ld-dot{fill:currentColor;stroke:none}
        .ld-cakra .ld-arc{opacity:0;stroke:hsl(var(--primary));stroke-width:2}
        .ld-dept,.ld-cross,.ld-ros,.ld-arc,.ld-dot{transform-box:view-box;transform-origin:50px 50px}
        .ld-putar .ld-dept{animation:ld-cw 8s linear infinite}
        .ld-putar .ld-cross{animation:ld-ccw 11s linear infinite}
        .ld-putar .ld-ros{animation:ld-cw 16s linear infinite}
        .ld-putar .ld-arc{animation:ld-cw 2.6s linear infinite;opacity:1}
        .ld-putar .ld-dot{animation:ld-denyut 2s ease-in-out infinite}
        .ld-kilau{background:linear-gradient(90deg,#9A9A9A 40%,#0A0A0A 50%,#9A9A9A 60%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ld-kilau 2s linear infinite}
        @media (prefers-reduced-motion:reduce){.ld-putar *,.ld-kilau,.ld-tirai-a,.ld-mekar-a{animation:none!important}}
      `}</style>

      {/* Tirai + garis tepi terang yang ikut menyapu */}
      {onComplete && <>
        <div className="ld-tirai-a absolute inset-0 bg-white [animation:ld-tirai_520ms_cubic-bezier(.32,.72,0,1)_both]" />
        <div className="ld-tirai-a absolute bottom-0 left-0 top-0 w-px origin-left bg-gradient-to-b from-transparent via-black/20 to-transparent [animation:ld-tirai_520ms_cubic-bezier(.32,.72,0,1)_both]" />
      </>}

      {/* Lambang: mekar di tengah, lalu terbang ke posisi logo sidebar */}
      <div className="absolute left-1/2 top-1/2 text-[#0A0A0A] transition-[transform,opacity] duration-[620ms] ease-[cubic-bezier(.32,.72,0,1)]"
        style={{
          transform: terbang
            ? "translate(calc(-50% - 50vw + 25px), calc(-50% - 50vh + 26px)) scale(.183)"
            : "translate(-50%,-50%) scale(1)",
          opacity: terbang ? 0.9 : 1,
        }}>
        <div className="ld-mekar-a [animation:ld-mekar_700ms_cubic-bezier(.32,.72,0,1)_260ms_both]">
          <CakraAgung size={120} putar={fase >= 3} />
        </div>
      </div>

      {/* Label tahap + garis progres */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 translate-y-[88px] flex-col items-center gap-6 transition-opacity duration-150"
        style={{ opacity: (fase >= 2 && fase < 5) || (!onComplete && fase >= 3) ? 1 : 0 }}>
        <span className="ld-kilau font-mono text-[11px] uppercase tracking-[0.16em]">
          {onComplete ? TAHAP[Math.min(fase, 4)] : "Memuat halaman"}
        </span>
        <span className="relative block h-px w-[180px] bg-gray-200">
          <span className="absolute left-0 top-0 h-px bg-[#0A0A0A] transition-[width] duration-300 ease-[cubic-bezier(.32,.72,0,1)]"
            style={{ width: onComplete ? `${PROGRES[Math.min(fase, 4)]}%` : "60%" }} />
        </span>
      </div>
    </div>
  );
}
