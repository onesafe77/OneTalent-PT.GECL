import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Award, BarChart2, Users, Target, AlertTriangle, Shield } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// ==============================
// KPI Plan (Jadwal Pelaksanaan)
// ==============================
const WEEKLY_PLAN: Record<string, number> = {
  "Fatigue Check": 14,
  "Wake Up Call": 14,
  "Inspeksi Jalan": 14,
  "Jarak Aman Beriringan": 4,
  "Sidak Kecepatan": 4,
  "Sidak Kelengkapan": 4,
  "Observasi Rambu": 3,
  "Observasi Kepatuhan Lajur": 6,
  "Inspeksi ROM": 2,
  "Inspeksi Workshop": 2,
  "Sidak Kesesuaian Roster": 4,
};
const TOTAL_PLAN_PER_WEEK = Object.values(WEEKLY_PLAN).reduce((s, v) => s + v, 0);

// ==============================
// Color palette per person
// ==============================
const PERSON_COLORS: Record<string, { bg: string; text: string; border: string; chart: string }> = {
  "Dimas Saputra": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", chart: "#3b82f6" },
  "Renaldi":       { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", chart: "#22c55e" },
  "Jumaidi":       { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", chart: "#a855f7" },
};
const DEFAULT_COLORS = ["#f59e0b", "#ef4444", "#14b8a6", "#f97316", "#8b5cf6"];
const PIE_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4"];

interface PersonKPI {
  name: string;
  total: number;
  temuanCount: number;
  shift1: number;
  shift2: number;
  activities: { kegiatan: string; count: number }[];
  weekly: { week: string; count: number }[];
}

const DEFAULT_TARGETS = ["Dimas Saputra", "Renaldi", "Jumaidi"];

function getChartColor(name: string, idx: number) {
  return PERSON_COLORS[name]?.chart ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
}

function KPIScoreGauge({ score, color }: { score: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, score));
  const level = clamped >= 80 ? "Baik" : clamped >= 50 ? "Cukup" : "Rendah";
  const levelColor = clamped >= 80 ? "text-green-600" : clamped >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${clamped} ${100 - clamped}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{Math.round(clamped)}%</span>
        </div>
      </div>
      <span className={`text-xs font-semibold ${levelColor}`}>{level}</span>
    </div>
  );
}

function PersonCard({ person, idx, weeksInRange }: { person: PersonKPI; idx: number; weeksInRange: number }) {
  const color = getChartColor(person.name, idx);
  const colorSet = PERSON_COLORS[person.name];
  const planTotal = TOTAL_PLAN_PER_WEEK * weeksInRange;
  const achievementPct = planTotal > 0 ? (person.total / planTotal) * 100 : 0;
  const temuanRate = person.total > 0 ? (person.temuanCount / person.total) * 100 : 0;

  return (
    <Card className={`border-2 ${colorSet?.border ?? "border-gray-200"}`}>
      <CardHeader className={`pb-3 rounded-t-lg ${colorSet?.bg ?? "bg-gray-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${colorSet?.text ?? "text-gray-700"}`}>{person.name}</CardTitle>
            <CardDescription className="text-xs">OHS Hauling BIB</CardDescription>
          </div>
          <KPIScoreGauge score={achievementPct} color={color} />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Stat rows */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{person.total}</p>
            <p className="text-xs text-muted-foreground">Total Laporan</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{person.temuanCount}</p>
            <p className="text-xs text-muted-foreground">Temuan</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{person.shift1}</p>
            <p className="text-xs text-muted-foreground">Shift 1 (DS)</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-indigo-600">{person.shift2}</p>
            <p className="text-xs text-muted-foreground">Shift 2 (NS)</p>
          </div>
        </div>

        {/* Top Activities */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Aktivitas Terbanyak</p>
          <div className="space-y-1.5">
            {person.activities.slice(0, 5).map((a, i) => {
              const plan = WEEKLY_PLAN[a.kegiatan] ?? null;
              const pct = plan ? Math.min(100, (a.count / (plan * weeksInRange)) * 100) : null;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-32 truncate">{a.kegiatan}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct ?? Math.min(100, (a.count / (person.total || 1)) * 200)}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{a.count}</span>
                  {pct !== null && (
                    <span className={`text-xs w-10 text-right font-semibold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}>
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="outline" className={`text-xs ${colorSet?.text ?? ""} ${colorSet?.border ?? ""}`}>
            Plan: {planTotal} laporan
          </Badge>
          <Badge variant="outline" className={`text-xs ${achievementPct >= 80 ? "text-green-700 border-green-300" : achievementPct >= 50 ? "text-amber-700 border-amber-300" : "text-red-700 border-red-300"}`}>
            Capaian: {Math.round(achievementPct)}%
          </Badge>
          <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
            Temuan Rate: {Math.round(temuanRate)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SafetyPatrolKPI() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [inputTargets, setInputTargets] = useState(DEFAULT_TARGETS.join(", "));
  const [appliedTargets, setAppliedTargets] = useState(DEFAULT_TARGETS);

  const pelaksanaParam = appliedTargets.join(",");
  const { data, isLoading, refetch } = useQuery<{ kpi: PersonKPI[]; totalReports: number }>({
    queryKey: ["/api/safety-patrol/kpi", startDate, endDate, pelaksanaParam],
    queryFn: () => apiRequest(`/api/safety-patrol/kpi?startDate=${startDate}&endDate=${endDate}&pelaksana=${encodeURIComponent(pelaksanaParam)}`, "GET"),
  });

  const kpiList = data?.kpi ?? [];

  // Calculate weeks in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksInRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerWeek));

  // Comparison bar chart data (total laporan)
  const comparisonData = kpiList.map(p => ({
    name: p.name.split(" ")[0], // Short name for chart
    fullName: p.name,
    total: p.total,
    plan: TOTAL_PLAN_PER_WEEK * weeksInRange,
    temuan: p.temuanCount,
  }));

  // Activity radar data (combined for comparison)
  const allActivities = Array.from(new Set(kpiList.flatMap(p => p.activities.map(a => a.kegiatan)))).slice(0, 8);
  const radarData = allActivities.map(act => {
    const entry: Record<string, any> = { activity: act.length > 18 ? act.substring(0, 16) + "…" : act };
    kpiList.forEach(p => {
      const found = p.activities.find(a => a.kegiatan === act);
      entry[p.name.split(" ")[0]] = found?.count ?? 0;
    });
    return entry;
  });

  // Weekly trend (combined)
  const allWeeks = Array.from(new Set(kpiList.flatMap(p => p.weekly.map(w => w.week)))).sort();
  const trendData = allWeeks.map(week => {
    const entry: Record<string, any> = { week };
    kpiList.forEach(p => {
      const found = p.weekly.find(w => w.week === week);
      entry[p.name.split(" ")[0]] = found?.count ?? 0;
    });
    return entry;
  });

  // Overall activity breakdown (pie, all people combined)
  const activityAgg: Record<string, number> = {};
  kpiList.forEach(p => p.activities.forEach(a => { activityAgg[a.kegiatan] = (activityAgg[a.kegiatan] || 0) + a.count; }));
  const pieData = Object.entries(activityAgg).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  // KPI plan vs actual per activity
  const planActualData = Object.entries(WEEKLY_PLAN).map(([kegiatan, planPerWeek]) => {
    const totalPlan = planPerWeek * weeksInRange;
    const totalActual = kpiList.reduce((s, p) => {
      const found = p.activities.find(a => {
        const normK = a.kegiatan.toLowerCase().replace(/[^a-z]/g, "");
        const normP = kegiatan.toLowerCase().replace(/[^a-z]/g, "");
        return normK.includes(normP.substring(0, 6)) || normP.includes(normK.substring(0, 6));
      });
      return s + (found?.count ?? 0);
    }, 0);
    const pct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0;
    return { kegiatan: kegiatan.length > 20 ? kegiatan.substring(0, 18) + "…" : kegiatan, plan: totalPlan, actual: totalActual, pct };
  });

  const handleApply = () => {
    const targets = inputTargets.split(",").map(t => t.trim()).filter(Boolean);
    setAppliedTargets(targets);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">KPI Evaluasi Safety Patrol</h1>
            <p className="text-sm text-muted-foreground">Analisis capaian kinerja OHS Hauling BIB</p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <TrendingUp className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Dari Tanggal</p>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 h-8 text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sampai Tanggal</p>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 h-8 text-sm" />
            </div>
            <div className="flex-1 min-w-52">
              <p className="text-xs text-muted-foreground mb-1">Nama Pelaksana (pisah koma)</p>
              <Input value={inputTargets} onChange={e => setInputTargets(e.target.value)} className="h-8 text-sm" placeholder="Dimas Saputra, Renaldi, Jumaidi" />
            </div>
            <Button onClick={handleApply} size="sm" className="bg-orange-600 hover:bg-orange-700 h-8">
              Terapkan Filter
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Rentang: <span className="font-medium">{weeksInRange} minggu</span> · Plan per orang: <span className="font-medium">{TOTAL_PLAN_PER_WEEK * weeksInRange} laporan</span>
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-orange-500" /></div>
      ) : (
        <>
          {/* Per-person cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpiList.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground">Tidak ada data ditemukan untuk pelaksana yang dipilih.</div>
            ) : (
              kpiList.map((person, idx) => (
                <PersonCard key={person.name} person={person} idx={idx} weeksInRange={weeksInRange} />
              ))
            )}
          </div>

          {kpiList.length > 0 && (
            <>
              {/* Comparison Chart: Total Laporan vs Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><BarChart2 className="h-5 w-5 text-blue-500" /> Perbandingan Total Laporan vs Target</CardTitle>
                  <CardDescription>Realisasi laporan dibandingkan dengan target Jadwal Pelaksanaan OHS</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [value, name === "plan" ? "Target Plan" : name === "total" ? "Realisasi" : "Temuan"]}
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend />
                      <Bar dataKey="plan" name="Target Plan" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                      {kpiList.map((p, idx) => null)}
                      <Bar dataKey="total" name="Realisasi" radius={[4, 4, 0, 0]}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={index} fill={getChartColor(entry.fullName, index)} />
                        ))}
                      </Bar>
                      <Bar dataKey="temuan" name="Temuan" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Plan vs Actual per Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5 text-green-500" /> Capaian per Jenis Kegiatan (Plan vs Aktual)</CardTitle>
                  <CardDescription>Berdasarkan Jadwal Pelaksanaan Sidak OHS Hauling — akumulasi semua pelaksana</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={planActualData} layout="vertical" margin={{ top: 0, right: 60, left: 120, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="kegiatan" tick={{ fontSize: 11 }} width={115} />
                      <Tooltip
                        formatter={(value, name) => [value, name === "plan" ? "Target" : "Aktual"]}
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend />
                      <Bar dataKey="plan" name="Target" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="actual" name="Aktual" radius={[0, 4, 4, 0]}>
                        {planActualData.map((entry, index) => (
                          <Cell key={index} fill={entry.pct >= 80 ? "#22c55e" : entry.pct >= 50 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground justify-center">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> ≥80% (Baik)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> 50–79% (Cukup)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> &lt;50% (Rendah)</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Weekly Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-purple-500" /> Tren Mingguan per Pelaksana</CardTitle>
                    <CardDescription>Jumlah laporan yang dikirim per minggu</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={trendData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                          <Legend />
                          {kpiList.map((p, idx) => (
                            <Line
                              key={p.name}
                              type="monotone"
                              dataKey={p.name.split(" ")[0]}
                              stroke={getChartColor(p.name, idx)}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-40 text-muted-foreground text-sm">Tidak ada data tren</div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Distribution Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Award className="h-5 w-5 text-orange-500" /> Distribusi Kegiatan (Gabungan)</CardTitle>
                    <CardDescription>Porsi jenis kegiatan dari seluruh laporan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1">
                        {pieData.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="truncate text-muted-foreground flex-1">{entry.name}</span>
                            <span className="font-semibold">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Radar: activity coverage per person */}
              {radarData.length > 0 && kpiList.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-indigo-500" /> Radar Cakupan Kegiatan per Pelaksana</CardTitle>
                    <CardDescription>Perbandingan jenis kegiatan yang dicakup oleh setiap pelaksana</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="activity" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                        {kpiList.map((p, idx) => (
                          <Radar
                            key={p.name}
                            name={p.name}
                            dataKey={p.name.split(" ")[0]}
                            stroke={getChartColor(p.name, idx)}
                            fill={getChartColor(p.name, idx)}
                            fillOpacity={0.15}
                          />
                        ))}
                        <Legend />
                        <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Evaluation Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-amber-500" /> Ringkasan Evaluasi KPI</CardTitle>
                  <CardDescription>Penilaian akhir berdasarkan capaian terhadap rencana Jadwal Pelaksanaan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-semibold text-muted-foreground">Pelaksana</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Target</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Realisasi</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Capaian</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Temuan</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Shift 1</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Shift 2</th>
                          <th className="text-center py-2 font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpiList.map((p, idx) => {
                          const plan = TOTAL_PLAN_PER_WEEK * weeksInRange;
                          const pct = plan > 0 ? (p.total / plan) * 100 : 0;
                          const color = getChartColor(p.name, idx);
                          const status = pct >= 80 ? "Baik" : pct >= 50 ? "Cukup" : "Perlu Perhatian";
                          const statusBg = pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                          return (
                            <tr key={p.name} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-3 font-medium flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                {p.name}
                              </td>
                              <td className="text-center py-3 text-muted-foreground">{plan}</td>
                              <td className="text-center py-3 font-semibold" style={{ color }}>{p.total}</td>
                              <td className="text-center py-3">
                                <span className={`font-bold text-base ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}>
                                  {Math.round(pct)}%
                                </span>
                              </td>
                              <td className="text-center py-3 text-orange-600 font-semibold">{p.temuanCount}</td>
                              <td className="text-center py-3 text-blue-600">{p.shift1}</td>
                              <td className="text-center py-3 text-indigo-600">{p.shift2}</td>
                              <td className="text-center py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBg}`}>{status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
