import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";

interface Cell { month: number; weeksPresent: number | null; actual: number; capaian: number | null; }
interface Officer { nik: string; nama: string; dept: string | null; jabatan: string | null; target: number; cells: Record<number, Cell>; capaian: number | null; }
interface Kpi {
  program: { code: string; name: string; pillar: number; defaultTarget: number };
  year: number; months: number[]; officers: Officer[]; monthly: Record<number, number | null>; overall: number | null;
  allPrograms: { code: string; name: string; pillar: number }[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pct = (v: number | null | undefined) => (v == null ? "—" : Math.round(v * 100) + "%");
const colorOf = (v: number | null) => {
  if (v == null) return "bg-slate-100 text-slate-400";
  if (v >= 0.8) return "bg-green-100 text-green-700";
  if (v >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
};

export default function ZeroHarmAttendanceKpi() {
  const search = useSearch();
  const initial = new URLSearchParams(search).get("program") || "3.1.1";
  const [program, setProgram] = useState(initial);
  useEffect(() => { const p = new URLSearchParams(search).get("program"); if (p) setProgram(p); }, [search]);
  const year = 2026;

  const { data: kpi, isLoading, isFetching } = useQuery<Kpi>({
    queryKey: ["zh-att-kpi", program, year],
    queryFn: () => apiRequest(`/api/zero-harm/attendance/kpi?program=${encodeURIComponent(program)}&year=${year}`, "GET"),
    placeholderData: (p) => p,
  });

  const programs = kpi?.allPrograms ?? [];
  const months = kpi?.months ?? Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-teal-600" /> KPI Kehadiran — Zero Harm 2.0</h1>
          <p className="text-xs text-slate-500">Partisipasi pekerja per bulan vs target (sumber: Attendance). Tahun {year}</p>
        </div>
        <select value={program} onChange={(e) => setProgram(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white font-medium">
          {programs.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Capaian Keseluruhan</p><p className="text-2xl font-bold">{pct(kpi?.overall)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Target / Bulan</p><p className="text-2xl font-bold">{kpi?.program.defaultTarget ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Pekerja</p><p className="text-2xl font-bold">{kpi?.officers.length ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Pilar</p><p className="text-2xl font-bold">{kpi?.program.pillar ?? "—"}</p></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading && !kpi ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto relative">
            {isFetching && <div className="absolute top-2 right-2 text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> memuat…</div>}
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold border-b min-w-[170px]">Pekerja</th>
                  {months.map((m) => <th key={m} className="px-2 py-2 text-center font-semibold border-b border-l">{MONTHS[m - 1]}</th>)}
                  <th className="px-2 py-2 text-center font-semibold border-b border-l bg-slate-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {kpi?.officers.map((o) => (
                  <tr key={o.nik} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-b">
                      <div className="font-medium text-slate-700">{o.nama}</div>
                      <div className="text-[10px] text-slate-400">{o.nik} · {o.jabatan || "-"}</div>
                    </td>
                    {months.map((m) => {
                      const c = o.cells[m];
                      return (
                        <td key={m} className={`border-b border-l text-center py-1.5 font-medium ${colorOf(c?.capaian ?? null)}`}
                            title={c ? `Hadir: ${c.actual} · minggu: ${c.weeksPresent ?? "-"}` : ""}>
                          {c?.capaian == null ? (c && c.weeksPresent === null && Object.prototype.hasOwnProperty.call(o.cells, m) ? "NA" : "—") : pct(c.capaian)}
                        </td>
                      );
                    })}
                    <td className={`border-b border-l text-center py-1.5 font-bold ${colorOf(o.capaian)}`}>{pct(o.capaian)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-semibold">
                  <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 border-t">Rata-rata Bulanan</td>
                  {months.map((m) => <td key={m} className={`border-t border-l text-center py-2 ${colorOf(kpi?.monthly[m] ?? null)}`}>{pct(kpi?.monthly[m])}</td>)}
                  <td className="border-t border-l text-center py-2 bg-slate-200">{pct(kpi?.overall)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-slate-400">Hijau ≥80% · Kuning 50–79% · Merah &lt;50% · NA = tidak dihitung. Capaian = MIN(Σ kehadiran / target, 100%). Sumber: sheet Attendance (otomatis).</p>
    </div>
  );
}
