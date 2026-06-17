import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ArrowLeft, CalendarCheck, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const OFFICERS = ["Dimas Saputra", "Renaldi", "Jumaidi"];

// Minggu ISO-8601 dari tanggal
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return { year: date.getUTCFullYear(), week };
}

type Status = "MASUK" | "NA";
interface PlanRow { officerName: string; year: number; week: number; shift1: Status; shift2: Status; nik?: string | null; }

export default function SafetyPatrolAttendancePlan() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const now = new Date();
  const cur = isoWeek(now);

  const [year, setYear] = useState(cur.year);
  const [fromWeek, setFromWeek] = useState(Math.max(1, cur.week));
  const [toWeek, setToWeek] = useState(Math.min(53, cur.week + 11));
  const [saving, setSaving] = useState(false);
  // map[`${officer}|${week}`] = {shift1, shift2}
  const [grid, setGrid] = useState<Record<string, { shift1: Status; shift2: Status }>>({});

  const { data, isLoading, refetch } = useQuery<{ year: number; plan: PlanRow[] }>({
    queryKey: ["/api/safety-patrol/attendance-plan", year],
    queryFn: async () => {
      const res = await fetch(`/api/safety-patrol/attendance-plan?year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  // Sinkronkan grid dari data server
  useEffect(() => {
    const g: Record<string, { shift1: Status; shift2: Status }> = {};
    for (const r of data?.plan || []) {
      g[`${r.officerName}|${r.week}`] = {
        shift1: r.shift1 === "NA" ? "NA" : "MASUK",
        shift2: r.shift2 === "NA" ? "NA" : "MASUK",
      };
    }
    setGrid(g);
  }, [data]);

  const weeks = useMemo(() => {
    const arr: number[] = [];
    for (let w = fromWeek; w <= toWeek; w++) arr.push(w);
    return arr;
  }, [fromWeek, toWeek]);

  const getCell = (officer: string, week: number) =>
    grid[`${officer}|${week}`] || { shift1: "MASUK" as Status, shift2: "MASUK" as Status };

  const toggle = (officer: string, week: number, shift: "shift1" | "shift2") => {
    const key = `${officer}|${week}`;
    setGrid((prev) => {
      const curCell = prev[key] || { shift1: "MASUK" as Status, shift2: "MASUK" as Status };
      return { ...prev, [key]: { ...curCell, [shift]: curCell[shift] === "NA" ? "MASUK" : "NA" } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows: PlanRow[] = [];
      for (const officer of OFFICERS) {
        for (const week of weeks) {
          const c = getCell(officer, week);
          rows.push({ officerName: officer, year, week, shift1: c.shift1, shift2: c.shift2 });
        }
      }
      await apiRequest("/api/safety-patrol/attendance-plan", "POST", { rows });
      toast({ title: "Plan kehadiran tersimpan", description: `${rows.length} sel disimpan untuk ${year}` });
      refetch();
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e?.message || "Coba lagi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    try {
      const r: any = await apiRequest("/api/safety-patrol/attendance-plan/sync", "POST", { year });
      toast({ title: "Sync dari Google Sheet berhasil", description: `${r?.officers ?? 0} petugas · ${r?.count ?? 0} baris untuk ${year}` });
      refetch();
    } catch (e: any) {
      toast({ title: "Sync gagal", description: e?.message || "Pastikan sheet di-share 'anyone with link'.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const StatusBtn = ({ s, onClick }: { s: Status; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-12 h-7 rounded text-xs font-semibold transition-colors ${
        s === "NA" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"
      }`}
      title="Klik untuk ganti Masuk/NA"
    >
      {s === "NA" ? "NA" : "✓"}
    </button>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <CalendarCheck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Plan Kehadiran Pengawas</h1>
            <p className="text-sm text-muted-foreground">Tandai Masuk / NA (cuti) per minggu & shift — memengaruhi target KPI</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/workspace/safety-patrol/kpi")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> KPI
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing} className="bg-teal-600 hover:bg-teal-700">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Sync dari Google Sheet
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Periode</CardTitle>
          <CardDescription>Pilih tahun & rentang minggu (W). Hijau ✓ = Masuk, merah NA = cuti.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Tahun</label>
              <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || cur.year)}
                className="block border rounded px-2 py-1 w-28 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Dari Minggu (W)</label>
              <input type="number" min={1} max={53} value={fromWeek} onChange={(e) => setFromWeek(Math.min(53, Math.max(1, parseInt(e.target.value) || 1)))}
                className="block border rounded px-2 py-1 w-24 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sampai Minggu (W)</label>
              <input type="number" min={1} max={53} value={toWeek} onChange={(e) => setToWeek(Math.min(53, Math.max(1, parseInt(e.target.value) || 1)))}
                className="block border rounded px-2 py-1 w-24 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white z-10 border px-2 py-1 text-left min-w-[140px]">Pengawas</th>
                    {weeks.map((w) => (
                      <th key={w} colSpan={2} className="border px-1 py-1 text-center bg-amber-50">W{w}</th>
                    ))}
                  </tr>
                  <tr>
                    <th className="sticky left-0 bg-white z-10 border px-2 py-1"></th>
                    {weeks.map((w) => (
                      <>
                        <th key={`${w}-s1`} className="border px-1 py-0.5 text-center text-[10px] text-muted-foreground">S1</th>
                        <th key={`${w}-s2`} className="border px-1 py-0.5 text-center text-[10px] text-muted-foreground">S2</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OFFICERS.map((officer) => (
                    <tr key={officer}>
                      <td className="sticky left-0 bg-white z-10 border px-2 py-1 font-medium">{officer}</td>
                      {weeks.map((w) => {
                        const c = getCell(officer, w);
                        return (
                          <>
                            <td key={`${officer}-${w}-s1`} className="border px-1 py-1 text-center">
                              <StatusBtn s={c.shift1} onClick={() => toggle(officer, w, "shift1")} />
                            </td>
                            <td key={`${officer}-${w}-s2`} className="border px-1 py-1 text-center">
                              <StatusBtn s={c.shift2} onClick={() => toggle(officer, w, "shift2")} />
                            </td>
                          </>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Catatan: sel yang belum diatur dianggap <b>Masuk</b>. Tandai <b>NA</b> untuk minggu/shift cuti → target KPI minggu itu tidak dihitung.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
