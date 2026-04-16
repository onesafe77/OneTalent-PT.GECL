
import React, { useState, useMemo } from "react";
import { getWeeksInMonth } from "@/lib/weekCutoffs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { Loader2, Clock, HardHat, Settings, TrendingUp, BarChart3, Timer, Zap, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Types ---
interface KPI {
    total: number;
    fast: number;
    slow: number;
    pctSlow: number;
}

interface SupervisorCard {
    fast: number;
    slow5: number;
    slow10: number;
    slow15: number;
}

interface BreakdownItem {
    label: string;
    fast: number;
    slow5: number;
    slow10: number;
    slow15: number;
}

interface ViolationValidationSummary {
    kpi: KPI;
    hourlyTrend: number[];
    supervisorCards: Record<string, SupervisorCard>;
    breakdownCharts: BreakdownItem[];
    availableSupervisors: string[];
    availableWeeks: number[];
    availableMonths: string[];
}

export default function ViolationValidationDashboard() {
    const year = new Date().getFullYear();
    const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

    // Filters
    const [supervisor, setSupervisor] = useState<string>("all");
    const [month, setMonth] = useState<string>("all");
    const [week, setWeek] = useState<string>("all"); // value: "YYYY-MM-DD|YYYY-MM-DD" or "all"

    const weekOptions = useMemo(() => {
        const m = month !== 'all' ? month : MONTH_NAMES[new Date().getMonth()];
        return getWeeksInMonth(year, m);
    }, [year, month]);
    const [shift, setShift] = useState<string>("all");
    const [validationStatus, setValidationStatus] = useState<string>("all");
    const [period, setPeriod] = useState<string>("day");

    // Fetch Data
    const { data, isLoading } = useQuery<ViolationValidationSummary>({
        queryKey: ["violation-validation-summary", supervisor, month, week, shift, validationStatus, period],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (supervisor !== "all") params.append("supervisor", supervisor);
            if (week !== "all") {
                const [sd, ed] = week.split("|");
                params.append("startDate", sd);
                params.append("endDate", ed);
            } else if (month !== "all") {
                params.append("month", month);
            }
            if (shift !== "all") params.append("shift", shift);
            if (validationStatus !== "all") params.append("validationStatus", validationStatus);
            params.append("period", period);

            const res = await fetch(`/api/fms/violation-validation/summary?${params}`);
            if (!res.ok) throw new Error("Failed to fetch summary");
            return res.json() as Promise<ViolationValidationSummary>;
        },
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-yellow-600" /></div>;
    if (!data) return <div className="p-8">No data available</div>;

    // Prepare Chart Data
    const pieData = data?.kpi ? [
        { name: "Fast (< 5 Min)", value: data.kpi.fast, color: "#22c55e" },
        { name: "Slow (> 5 Min)", value: data.kpi.slow, color: "#ef4444" },
    ] : [];

    const hourlyData = data?.hourlyTrend?.map((count, i) => ({
        hour: `${String(i).padStart(2, '0')}:00`,
        count
    })) || [];

    // Supervisor entries sorted by total (fast first)
    const sortedSupervisors = data ? Object.entries(data.supervisorCards)
        .filter(([name]) => name !== 'Unknown')
        .sort(([, a], [, b]) => (b.fast + b.slow5 + b.slow10 + b.slow15) - (a.fast + a.slow5 + a.slow10 + a.slow15))
        : [];

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans selection:bg-yellow-200/50 pb-20">
            {/* --- TOP GRADIENT ACCENT --- */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-amber-50/50 to-transparent pointer-events-none" />

            {/* --- HEADER --- */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm transition-all duration-300">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                                <div className="relative h-12 w-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-black text-[10px] p-1 text-center leading-3 shadow-lg ring-2 ring-white">
                                    PT GEC
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    Monitoring Kecepatan Validasi FMS
                                    <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold tracking-wider">KPI</span>
                                </h1>
                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
                                    PT Goden Energi Cemelang Lestari
                                    <span className="w-1 h-1 rounded-full bg-slate-300 mx-1"></span>
                                    Evaluasi Pengawas FMS
                                </p>
                            </div>
                        </div>

                        {/* Period Toggle */}
                        <Tabs value={period} onValueChange={setPeriod} className="bg-white border border-slate-200 rounded-xl shadow-sm">
                            <TabsList className="bg-transparent p-1 gap-1">
                                <TabsTrigger value="day" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg text-xs font-bold px-4">
                                    Per Hari
                                </TabsTrigger>
                                <TabsTrigger value="week" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg text-xs font-bold px-4">
                                    Per Minggu
                                </TabsTrigger>
                                <TabsTrigger value="month" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg text-xs font-bold px-4">
                                    Per Bulan
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

                {/* --- FILTERS --- */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/40 flex flex-wrap items-center gap-2">
                    <div className="px-4 py-2 flex items-center gap-2 text-slate-400 border-r border-slate-200/60 mr-2">
                        <Settings className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                    </div>

                    {/* Supervisor */}
                    <Select value={supervisor} onValueChange={setSupervisor}>
                        <SelectTrigger className="h-10 bg-white border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 min-w-[180px] shadow-sm hover:border-amber-300 transition-colors focus:ring-2 focus:ring-amber-100">
                            <SelectValue placeholder="Semua Pengawas" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">Semua Pengawas</SelectItem>
                            {data?.availableSupervisors?.map(sup => (
                                <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Week */}
                    <Select value={week} onValueChange={setWeek}>
                        <SelectTrigger className="h-10 bg-white border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 w-[200px] shadow-sm hover:border-amber-300 transition-colors">
                            <SelectValue placeholder="Semua Week" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">Semua Week</SelectItem>
                            {weekOptions.map(w => (
                                <SelectItem key={w.weekNumber} value={`${w.startDate}|${w.endDate}`}>
                                    {w.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Month */}
                    <Select value={month} onValueChange={(v) => { setMonth(v); setWeek("all"); }}>
                        <SelectTrigger className="h-10 bg-white border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 w-[140px] shadow-sm hover:border-amber-300 transition-colors">
                            <SelectValue placeholder="Bulan" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">Semua Bulan</SelectItem>
                            {data?.availableMonths?.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Shift */}
                    <Select value={shift} onValueChange={setShift}>
                        <SelectTrigger className="h-10 bg-white border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 w-[120px] shadow-sm hover:border-amber-300 transition-colors">
                            <SelectValue placeholder="Shift" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Shift</SelectItem>
                            <SelectItem value="Shift 1">Shift 1</SelectItem>
                            <SelectItem value="Shift 2">Shift 2</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Validation Status */}
                    <Select value={validationStatus} onValueChange={setValidationStatus}>
                        <SelectTrigger className="h-10 bg-white border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600 w-[160px] shadow-sm hover:border-amber-300 transition-colors">
                            <SelectValue placeholder="Status Validasi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="Valid">Valid</SelectItem>
                            <SelectItem value="Tidak Valid">Tidak Valid</SelectItem>
                            <SelectItem value="Belum Validasi">Belum Validasi</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs"
                            onClick={() => {
                                setSupervisor("all");
                                setMonth("all");
                                setWeek("all");
                                setShift("all");
                                setValidationStatus("all");
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                {/* --- SECTION 1: OVERVIEW + SUPERVISOR CARDS --- */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* KPI DONUT + HOURLY */}
                    <div className="xl:col-span-5 space-y-6">
                        {/* Donut Chart */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/40 border-none rounded-3xl overflow-hidden relative group">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-yellow-500" />
                                    Status Validasi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center p-6 relative">
                                <div className="relative w-[220px] h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                                    border: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Stats */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-5xl font-black text-slate-800 tracking-tighter drop-shadow-sm">{data?.kpi?.pctSlow}%</span>
                                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full mt-1">SLOW {">"} 5m</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 mt-6 w-full max-w-[280px]">
                                    <div className="flex flex-col items-center p-3 rounded-2xl bg-green-50/50 border border-green-100">
                                        <span className="text-green-600 font-bold text-xl">{data?.kpi?.fast?.toLocaleString()}</span>
                                        <span className="text-[10px] uppercase font-bold text-green-400 tracking-wider">Fast</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 rounded-2xl bg-red-50/50 border border-red-100">
                                        <span className="text-red-500 font-bold text-xl">{data?.kpi?.slow?.toLocaleString()}</span>
                                        <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Slow</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hourly Trend */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/40 border-none rounded-3xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-emerald-500" />
                                    Trend Jam Validasi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px] p-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyData}>
                                        <defs>
                                            <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} interval={1} />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="count" fill="url(#hourlyGradient)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* SUPERVISOR CARDS */}
                    <div className="xl:col-span-7 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <HardHat className="w-4 h-4" />
                                Kartu Pengawas FMS
                            </h2>
                            <Badge variant="outline" className="bg-white text-[10px] text-slate-400 font-mono">
                                {sortedSupervisors.length} Pengawas
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto pr-2 custom-scrollbar">
                            {sortedSupervisors.map(([name, stats]) => {
                                const total = stats.fast + stats.slow5 + stats.slow10 + stats.slow15;
                                const pctFast = total > 0 ? ((stats.fast / total) * 100).toFixed(0) : '0';
                                return (
                                    <div key={name} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-amber-200 transition-all duration-200">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="flex-shrink-0">
                                                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 group-hover:scale-105 transition-transform">
                                                    <HardHat className="text-yellow-400 w-7 h-7" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Pengawas FMS</p>
                                                <h3 className="font-black text-slate-800 text-sm truncate">{name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all" style={{ width: `${pctFast}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-green-600">{pctFast}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="bg-green-50 rounded-xl p-2.5 text-center border border-green-100">
                                                <div className="text-[9px] font-bold text-green-500 mb-1">{"<"} 5 Mnt</div>
                                                <div className="text-lg font-black text-green-700">{stats.fast.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-yellow-50 rounded-xl p-2.5 text-center border border-yellow-100">
                                                <div className="text-[9px] font-bold text-yellow-600 mb-1">{">"} 5 Mnt</div>
                                                <div className="text-lg font-black text-yellow-700">{stats.slow5}</div>
                                            </div>
                                            <div className="bg-orange-50 rounded-xl p-2.5 text-center border border-orange-100">
                                                <div className="text-[9px] font-bold text-orange-600 mb-1">{">"} 10 Mnt</div>
                                                <div className="text-lg font-black text-orange-700">{stats.slow10}</div>
                                            </div>
                                            <div className="bg-red-50 rounded-xl p-2.5 text-center border border-red-100">
                                                <div className="text-[9px] font-bold text-red-600 mb-1">{">"} 15 Mnt</div>
                                                <div className="text-lg font-black text-red-700">{stats.slow15}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- SECTION 2: BREAKDOWN CHARTS --- */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-amber-600" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">
                            Jumlah Validasi by Kategori
                        </h2>
                        <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">
                            {period === 'day' ? 'Per Hari' : period === 'week' ? 'Per Minggu' : 'Per Bulan'}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fast < 5 Min */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/40 border-none rounded-3xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-green-600 uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Validasi {"<"} 5 Menit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[280px] p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.breakdownCharts}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }}
                                            tickFormatter={(val) => period === 'day' ? (val ? format(new Date(val), 'dd-MMM') : '') : val}
                                        />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#f0fdf4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="fast" name="< 5 Menit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Slow > 5 Min */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/40 border-none rounded-3xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 to-amber-500"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-yellow-600 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Validasi {">"} 5 Menit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[280px] p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.breakdownCharts}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }}
                                            tickFormatter={(val) => period === 'day' ? (val ? format(new Date(val), 'dd-MMM') : '') : val}
                                        />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#fefce8' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="slow5" name="> 5 Menit" fill="#eab308" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Slow > 10 Min */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/40 border-none rounded-3xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Validasi {">"} 10 Menit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[280px] p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.breakdownCharts}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }}
                                            tickFormatter={(val) => period === 'day' ? (val ? format(new Date(val), 'dd-MMM') : '') : val}
                                        />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#fff7ed' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="slow10" name="> 10 Menit" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Slow > 15 Min */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/40 border-none rounded-3xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-400 to-rose-500"></div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Validasi {">"} 15 Menit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[280px] p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.breakdownCharts}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }}
                                            tickFormatter={(val) => period === 'day' ? (val ? format(new Date(val), 'dd-MMM') : '') : val}
                                        />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: '#fef2f2' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="slow15" name="> 15 Menit" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}
