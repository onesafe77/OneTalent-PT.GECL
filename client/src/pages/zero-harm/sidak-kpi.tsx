import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Pencil, Save, X, Loader2 } from "lucide-react";

interface Program { code: string; name: string; pillar: number; target: number; }
interface Cell { week: number; days: number | null; actual: number; denom: number; capaian: number | null; }
interface OfficerRow { nik: string; nama: string; dept: string | null; jabatan: string | null; ord: number; cells: Record<number, Cell>; totalActual: number; totalDenom: number; capaian: number | null; }
interface Kpi { program: Program; year: number; weeks: number[]; officers: OfficerRow[]; weekly: Record<number, number | null>; overall: number | null; }

const pct = (v: number | null | undefined) => (v == null ? "—" : Math.round(v * 100) + "%");
const colorOf = (v: number | null) => {
  if (v == null) return "bg-slate-100 text-slate-400";
  if (v >= 0.8) return "bg-green-100 text-green-700";
  if (v >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
};

export default function ZeroHarmSidakKpi() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [program, setProgram] = useState("3.5");
  const [year] = useState(2026);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, number | null>>({});

  const { data: progData } = useQuery<{ programs: Program[] }>({
    queryKey: ["zh-sidak-programs"],
    queryFn: () => apiRequest("/api/zero-harm/sidak/programs", "GET"),
  });
  const { data: kpi, isLoading, isFetching } = useQuery<Kpi>({
    queryKey: ["zh-sidak-kpi", program, year],
    queryFn: () => apiRequest(`/api/zero-harm/sidak/kpi?program=${encodeURIComponent(program)}&year=${year}`, "GET"),
    placeholderData: (p) => p,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(edits).map(([k, days]) => {
        const [nik, week] = k.split("|");
        return { nik, week: Number(week), days };
      });
      return apiRequest("/api/zero-harm/sidak/attendance", "POST", { programCode: program, year, entries });
    },
    onSuccess: () => {
      toast({ title: "Hari kerja tersimpan", description: `${Object.keys(edits).length} sel diperbarui` });
      setEdits({}); setEditMode(false);
      qc.invalidateQueries({ queryKey: ["zh-sidak-kpi", program, year] });
    },
    onError: (e: any) => toast({ title: "Gagal menyimpan", description: e?.message, variant: "destructive" }),
  });

  const weeks = kpi?.weeks ?? [];
  const programs = progData?.programs ?? [];
  const editVal = (nik: string, w: number, fallback: number | null) => {
    const k = `${nik}|${w}`;
    return k in edits ? edits[k] : fallback;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" /> KPI Program Sidak — Zero Harm 2.0
          </h1>
          <p className="text-xs text-slate-500">Capaian pengawas per minggu vs target (sumber: OPK). Tahun {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={program}
            onChange={(e) => { setProgram(e.target.value); setEdits({}); setEditMode(false); }}
            className="text-sm border rounded-lg px-3 py-2 bg-white font-medium"
          >
            {programs.map((p) => (
              <option key={p.code} value={p.code}>{p.code} · {p.name} (T{p.target})</option>
            ))}
          </select>
          {!editMode ? (
            <Button size="sm" variant="outline" onClick={() => setEditMode(true)}><Pencil className="w-4 h-4 mr-1" /> Edit Hari Kerja</Button>
          ) : (
            <>
              <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !Object.keys(edits).length}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Simpan ({Object.keys(edits).length})
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEdits({}); setEditMode(false); }}><X className="w-4 h-4" /></Button>
            </>
          )}
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Capaian Keseluruhan</p>
          <p className="text-2xl font-bold text-slate-800">{pct(kpi?.overall)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Target / Minggu</p>
          <p className="text-2xl font-bold text-slate-800">{kpi?.program.target ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Pengawas</p>
          <p className="text-2xl font-bold text-slate-800">{kpi?.officers.length ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Pilar</p>
          <p className="text-2xl font-bold text-slate-800">{kpi?.program.pillar ?? "—"}</p>
        </Card>
      </div>

      {/* Tabel */}
      <Card className="p-0 overflow-hidden">
        {isLoading && !kpi ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto relative">
            {isFetching && <div className="absolute top-2 right-2 text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> memuat…</div>}
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold border-b min-w-[160px]">Pengawas</th>
                  {weeks.map((w) => (
                    <th key={w} className="px-2 py-2 text-center font-semibold border-b border-l whitespace-nowrap">W{w}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold border-b border-l bg-slate-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {kpi?.officers.map((o) => (
                  <tr key={o.nik} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-b">
                      <div className="font-medium text-slate-700">{o.nama}</div>
                      <div className="text-[10px] text-slate-400">{o.nik}</div>
                    </td>
                    {weeks.map((w) => {
                      const c = o.cells[w];
                      if (editMode) {
                        const v = editVal(o.nik, w, c?.days ?? null);
                        return (
                          <td key={w} className="border-b border-l p-0.5 text-center">
                            <input
                              type="number" min={0} max={7}
                              value={v == null ? "" : v}
                              placeholder="NA"
                              onChange={(e) => {
                                const raw = e.target.value;
                                setEdits((prev) => ({ ...prev, [`${o.nik}|${w}`]: raw === "" ? null : Number(raw) }));
                              }}
                              className="w-10 text-center text-xs border rounded py-1 bg-white"
                            />
                          </td>
                        );
                      }
                      return (
                        <td key={w} className={`border-b border-l text-center py-1.5 font-medium ${colorOf(c?.capaian ?? null)}`}
                            title={c ? `Hari: ${c.days ?? "NA"} · Aktual: ${c.actual} / Target: ${c.denom}` : ""}>
                          {c?.capaian == null ? (c?.days == null ? "NA" : "—") : pct(c.capaian)}
                        </td>
                      );
                    })}
                    <td className={`border-b border-l text-center py-1.5 font-bold ${colorOf(o.capaian)}`}>{pct(o.capaian)}</td>
                  </tr>
                ))}
                {/* Ringkasan mingguan */}
                <tr className="bg-slate-100 font-semibold">
                  <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 border-t">Rata-rata Mingguan</td>
                  {weeks.map((w) => (
                    <td key={w} className={`border-t border-l text-center py-2 ${colorOf(kpi?.weekly[w] ?? null)}`}>{pct(kpi?.weekly[w])}</td>
                  ))}
                  <td className="border-t border-l text-center py-2 bg-slate-200">{pct(kpi?.overall)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-slate-400">
        Hijau ≥80% · Kuning 50–79% · Merah &lt;50% · NA = cuti (tak dihitung). Capaian = MIN(aktual ÷ ROUNDUP(hari/7 × target), 100%). Aktual dari OPK (Counter=1).
      </p>
    </div>
  );
}
