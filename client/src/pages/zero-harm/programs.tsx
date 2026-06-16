import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ChevronRight, Loader2 } from "lucide-react";

interface Row {
  code: string; name: string; pillar: number; target?: number; unit?: string;
  source: string; status: "live" | "pending"; overall: number | null; detailPath?: string;
}
interface Resp { year: number; pillars: Record<number, string>; programs: Row[]; }

const pct = (v: number | null) => (v == null ? "—" : Math.round(v * 100) + "%");
const color = (v: number | null) => {
  if (v == null) return "text-slate-400";
  if (v >= 0.8) return "text-green-600";
  if (v >= 0.5) return "text-amber-600";
  return "text-red-600";
};
const barColor = (v: number | null) => {
  if (v == null) return "bg-slate-200";
  if (v >= 0.8) return "bg-green-500";
  if (v >= 0.5) return "bg-amber-500";
  return "bg-red-500";
};

export default function ZeroHarmPrograms() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["zh-programs-summary", 2026],
    queryFn: () => apiRequest("/api/zero-harm/programs/summary?year=2026", "GET"),
  });

  const programs = data?.programs ?? [];
  const pillars = data?.pillars ?? {};
  const live = programs.filter((p) => p.status === "live");
  const liveAvg = live.length
    ? live.reduce((s, p) => s + (p.overall ?? 0), 0) / live.filter((p) => p.overall != null).length
    : null;

  // group by pillar
  const byPillar = new Map<number, Row[]>();
  for (const p of programs) { if (!byPillar.has(p.pillar)) byPillar.set(p.pillar, []); byPillar.get(p.pillar)!.push(p); }
  const pillarNums = Array.from(byPillar.keys()).sort((a, b) => a - b);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header banner SIMANTIK */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-teal-600 to-violet-600 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Zero Harm 2.0 — Program Monitoring</h1>
        <p className="text-sm opacity-90">SIMANTIK · Monitoring {programs.length} program dalam 18 pilar · Tahun {data?.year ?? 2026}</p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Total Program</p><p className="text-2xl font-bold">{programs.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Aktif (otomatis)</p><p className="text-2xl font-bold text-teal-600">{live.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Rata-rata Capaian (aktif)</p><p className={`text-2xl font-bold ${color(liveAvg)}`}>{pct(liveAvg)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Pilar</p><p className="text-2xl font-bold">{pillarNums.length}</p></Card>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-4">
          {pillarNums.map((pn) => (
            <div key={pn}>
              <h2 className="text-sm font-bold text-slate-700 mb-2">Pilar {pn} — {pillars[pn]}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byPillar.get(pn)!.map((p) => (
                  <Card
                    key={p.code}
                    className={`p-4 ${p.detailPath ? "cursor-pointer hover:shadow-md transition" : ""}`}
                    onClick={() => p.detailPath && navigate(p.detailPath)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-mono">{p.code}</p>
                        <p className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{p.source}</p>
                      </div>
                      {p.status === "live"
                        ? <span className={`text-lg font-bold ${color(p.overall)}`}>{pct(p.overall)}</span>
                        : <Badge variant="secondary" className="text-[10px] shrink-0">menunggu</Badge>}
                    </div>
                    {p.status === "live" && (
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor(p.overall)}`} style={{ width: `${Math.round((p.overall ?? 0) * 100)}%` }} />
                      </div>
                    )}
                    {p.detailPath && (
                      <div className="mt-2 flex items-center text-[11px] text-teal-600">Lihat detail <ChevronRight className="w-3 h-3" /></div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Hijau ≥80% · Kuning 50–79% · Merah &lt;50%. Program "menunggu" akan dihitung otomatis bertahap (Kehadiran, Inspeksi, FMS, dll) atau lewat Import Excel.
      </p>
    </div>
  );
}
