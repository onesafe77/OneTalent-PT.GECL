
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Calendar, AlertTriangle, CheckCircle, XCircle, FileSpreadsheet, Sparkles, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

export default function FmsDashboard() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State - Combined DateTime (format: "YYYY-MM-DDTHH:mm")
    const [dateTimeRange, setDateTimeRange] = useState({
        start: format(startOfMonth(new Date()), "yyyy-MM-dd") + "T00:00",
        end: format(endOfMonth(new Date()), "yyyy-MM-dd") + "T23:59"
    });
    // Multi-select filters (arrays)
    const [filters, setFilters] = useState({
        violationTypes: [] as string[],   // Multi-select
        shifts: [] as string[],           // Multi-select
        validationStatuses: [] as string[], // Multi-select
        weeks: [] as number[]             // Multi-select for weeks (1-5)
    });
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Build query string from state
    const buildQueryString = () => {
        const params = new URLSearchParams();
        // Split datetime into date and time parts
        const [startDate, startTime] = dateTimeRange.start.split("T");
        const [endDate, endTime] = dateTimeRange.end.split("T");
        params.append("startDate", startDate);
        params.append("endDate", endDate);
        if (startTime) params.append("startTime", startTime);
        if (endTime) params.append("endTime", endTime);
        // Multi-select: send comma-separated values
        if (filters.violationTypes.length > 0) params.append("violationType", filters.violationTypes.join(","));
        if (filters.shifts.length > 0) params.append("shift", filters.shifts.join(","));
        if (filters.validationStatuses.length > 0) params.append("validationStatus", filters.validationStatuses.join(","));
        if (filters.weeks.length > 0) params.append("week", filters.weeks.join(","));
        return params.toString();
    };

    // Queries
    const { data: analytics, isLoading, isError, error } = useQuery({
        queryKey: ["fms-analytics", dateTimeRange, filters],
        queryFn: async () => {
            const res = await apiRequest(`/api/fms/analytics?${buildQueryString()}`, "GET");
            return res;
        }
    });

    // Mutations
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/fms/upload", {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["fms-analytics"] });
            toast({
                title: "Upload Berhasil",
                description: `Memproses ${data.processed} baris data.`,
                variant: "default"
            });
            setIsUploadOpen(false);
        },
        onError: (err) => {
            toast({
                title: "Upload Gagal",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    // derived data for charts
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
            datalabels: {
                color: 'black',
                font: { weight: 'bold' as const },
                formatter: (value: number) => value > 0 ? value : ''
            }
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-500">
                <AlertTriangle className="w-10 h-10 mb-2" />
                <p>Gagal memuat data: {error ? String(error) : "Unknown error"}</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Coba Lagi</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 pb-12">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all duration-300">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 uppercase tracking-tight">FMS Command Center</h1>
                            </div>
                            <p className="text-slate-500 text-xs font-medium mt-1 ml-3.5 tracking-wide">Monitoring & Validasi Keselamatan Operasional</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-full border border-slate-200 shadow-inner">
                                <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                                <input
                                    type="datetime-local"
                                    className="bg-transparent text-xs font-bold text-slate-600 outline-none w-36 px-1"
                                    value={dateTimeRange.start}
                                    onChange={(e) => setDateTimeRange(prev => ({ ...prev, start: e.target.value }))}
                                />
                                <span className="text-slate-300 text-xs mx-1">to</span>
                                <input
                                    type="datetime-local"
                                    className="bg-transparent text-xs font-bold text-slate-600 outline-none w-36 px-1"
                                    value={dateTimeRange.end}
                                    onChange={(e) => setDateTimeRange(prev => ({ ...prev, end: e.target.value }))}
                                />
                            </div>

                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
                                        <Upload className="w-3.5 h-3.5 mr-2" />
                                        Upload Data
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Upload Data FMS</DialogTitle>
                                    </DialogHeader>
                                    <div
                                        className="mt-4 border-2 border-dashed border-indigo-100 rounded-2xl p-10 text-center hover:bg-slate-50/50 hover:border-indigo-300 transition-all cursor-pointer group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
                                        </div>
                                        <p className="text-sm text-slate-700 font-semibold">Klik untuk upload file Excel</p>
                                        <p className="text-xs text-slate-400 mt-2">Format .xlsx atau .xls (Smart Upsert enabled)</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx, .xls"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                    {uploadMutation.isPending && (
                                        <div className="flex items-center justify-center gap-2 mt-4 text-sm font-medium text-indigo-600 animate-pulse">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Memproses data...
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

                {/* FILTER CARD */}
                <div className="relative z-40 bg-white/60 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/40 flex flex-wrap items-center gap-2">
                    <div className="px-4 py-2 flex items-center gap-2 text-slate-400 border-r border-slate-200/60 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                    </div>
                    {/* Filter Dropdowns - Using standard styles but clean */}
                    {/* Violation Type Multi-Select */}
                    <div className="relative">
                        <details className="group">
                            <summary className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-sm font-medium text-slate-600 transition-colors min-w-[160px] shadow-sm">
                                <span className="truncate">
                                    {filters.violationTypes.length === 0
                                        ? "Semua Jenis"
                                        : `${filters.violationTypes.length} Jenis Dipilih`}
                                </span>
                                <span className="ml-auto opacity-50 text-[10px]">▼</span>
                            </summary>
                            <div className="absolute z-20 mt-2 w-72 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 max-h-80 overflow-y-auto ring-1 ring-black/5">
                                {(analytics?.availableViolationTypes || analytics?.byViolation)?.map((v: any) => (
                                    <label key={v.type} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.violationTypes.includes(v.type)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setFilters(prev => ({ ...prev, violationTypes: [...prev.violationTypes, v.type] }));
                                                    else setFilters(prev => ({ ...prev, violationTypes: prev.violationTypes.filter(t => t !== v.type) }));
                                                }}
                                                className="peer h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <span className="text-sm text-slate-700">{v.type}</span>
                                    </label>
                                ))}
                            </div>
                        </details>
                    </div>

                    {/* Shift Multi-Select */}
                    <div className="relative">
                        <details className="group">
                            <summary className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-sm font-medium text-slate-600 transition-colors min-w-[140px] shadow-sm">
                                <span className="truncate">
                                    {filters.shifts.length === 0 ? "Semua Shift" : filters.shifts.join(", ")}
                                </span>
                                <span className="ml-auto opacity-50 text-[10px]">▼</span>
                            </summary>
                            <div className="absolute z-20 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 ring-1 ring-black/5">
                                {["Shift 1", "Shift 2"].map((shift) => (
                                    <label key={shift} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={filters.shifts.includes(shift)}
                                            onChange={(e) => {
                                                if (e.target.checked) setFilters(prev => ({ ...prev, shifts: [...prev.shifts, shift] }));
                                                else setFilters(prev => ({ ...prev, shifts: prev.shifts.filter(s => s !== shift) }));
                                            }}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700">{shift}</span>
                                    </label>
                                ))}
                            </div>
                        </details>
                    </div>

                    {/* Validation Status Multi-Select */}
                    <div className="relative">
                        <details className="group">
                            <summary className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-sm font-medium text-slate-600 transition-colors min-w-[150px] shadow-sm">
                                <span className="truncate">
                                    {filters.validationStatuses.length === 0 ? "Semua Status" : filters.validationStatuses.join(", ")}
                                </span>
                                <span className="ml-auto opacity-50 text-[10px]">▼</span>
                            </summary>
                            <div className="absolute z-20 mt-2 w-52 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 ring-1 ring-black/5">
                                {["Valid", "Tidak Valid"].map((status) => (
                                    <label key={status} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={filters.validationStatuses.includes(status)}
                                            onChange={(e) => {
                                                if (e.target.checked) setFilters(prev => ({ ...prev, validationStatuses: [...prev.validationStatuses, status] }));
                                                else setFilters(prev => ({ ...prev, validationStatuses: prev.validationStatuses.filter(s => s !== status) }));
                                            }}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700">{status}</span>
                                    </label>
                                ))}
                            </div>
                        </details>
                    </div>

                    {/* Week Multi-Select */}
                    <div className="relative">
                        <details className="group">
                            <summary className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-sm font-medium text-slate-600 transition-colors min-w-[140px] shadow-sm">
                                <span className="truncate">
                                    {filters.weeks.length === 0 ? "Semua Week" : `Week ${filters.weeks.sort((a, b) => a - b).join(", ")}`}
                                </span>
                                <span className="ml-auto opacity-50 text-[10px]">▼</span>
                            </summary>
                            <div className="absolute z-20 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 ring-1 ring-black/5">
                                {(analytics?.availableWeeks || [1, 2, 3, 4, 5])
                                    .map((w: any) => Number(w))
                                    .sort((a: number, b: number) => a - b)
                                    .map((week: number) => (
                                        <label key={week} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={filters.weeks.includes(week)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setFilters(prev => ({ ...prev, weeks: [...prev.weeks, week] }));
                                                    else setFilters(prev => ({ ...prev, weeks: prev.weeks.filter(w => w !== week) }));
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700">Week {week}</span>
                                        </label>
                                    ))}
                            </div>
                        </details>
                    </div>

                    <div className="ml-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setFilters({ violationTypes: [], shifts: [], validationStatuses: [], weeks: [] })}
                        >
                            Reset Filter
                        </Button>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <KPICard
                        title="Total Violation"
                        value={analytics?.summary?.totalViolations || 0}
                        icon={<AlertTriangle className="w-8 h-8 text-rose-500" />}
                        trend="vs Last Month"
                        color="bg-rose-500 text-rose-700"
                    />
                    <KPICard
                        title="Valid Data"
                        value={analytics?.summary?.validCount || 0}
                        icon={<CheckCircle className="w-8 h-8 text-emerald-500" />}
                        subValue={`${((analytics?.summary?.validCount / (analytics?.summary?.totalViolations || 1)) * 100).toFixed(1)}%`}
                        color="bg-emerald-500 text-emerald-700"
                    />
                    <KPICard
                        title="Invalid Data"
                        value={analytics?.summary?.invalidCount || 0}
                        icon={<XCircle className="w-8 h-8 text-slate-500" />}
                        subValue={`${((analytics?.summary?.invalidCount / (analytics?.summary?.totalViolations || 1)) * 100).toFixed(1)}%`}
                        color="bg-slate-500 text-slate-700"
                    />
                    <KPICard
                        title="Unit Terlibat"
                        value={analytics?.summary?.totalUnits || 0}
                        icon={<FileSpreadsheet className="w-8 h-8 text-indigo-500" />}
                        color="bg-indigo-500 text-indigo-700"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Main Charts */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* PARETO CHART */}
                        <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/50 border-none rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white/50 border-b border-white/20 pb-4">
                                <CardTitle className="text-lg font-bold text-slate-800">Pareto Jenis Pelanggaran</CardTitle>
                                <CardDescription>Analisa frekuensi berdasarkan tipe pelanggaran</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] p-6">
                                <Bar
                                    data={{
                                        labels: analytics?.byViolation?.map((v: any) => v.type),
                                        datasets: [{
                                            label: 'Jumlah Pelanggaran',
                                            data: analytics?.byViolation?.map((v: any) => v.count),
                                            backgroundColor: (context) => {
                                                const ctx = context.chart.ctx;
                                                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                                                gradient.addColorStop(0, '#3b82f6');
                                                gradient.addColorStop(1, '#60a5fa');
                                                return gradient;
                                            },
                                            borderRadius: 8,
                                            borderSkipped: false,
                                            barThickness: 40
                                        }]
                                    }}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false } },
                                            x: { grid: { display: false }, border: { display: false } }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        {/* SHIFT ANALYSIS CHART */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/50 border-none rounded-3xl overflow-hidden">
                                <CardHeader className="bg-white/50 border-b border-white/20 pb-4">
                                    <CardTitle className="text-lg font-bold text-slate-800">Distribusi per Shift</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] p-6">
                                    <Bar
                                        data={{
                                            labels: analytics?.byShift?.map((v: any) => v.shift || "Unknown"),
                                            datasets: [{
                                                label: 'Jumlah',
                                                data: analytics?.byShift?.map((v: any) => v.count),
                                                backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b'],
                                                borderRadius: 20
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: { display: false },
                                                x: { grid: { display: false }, border: { display: false } }
                                            }
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/50 border-none rounded-3xl overflow-hidden">
                                <CardHeader className="bg-white/50 border-b border-white/20 pb-4">
                                    <CardTitle className="text-lg font-bold text-slate-800">Validasi Rate</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] flex items-center justify-center p-6 bg-slate-50/50">
                                    <Doughnut
                                        data={{
                                            labels: ['Valid', 'Invalid'],
                                            datasets: [{
                                                data: [analytics?.summary?.validCount || 0, analytics?.summary?.invalidCount || 0],
                                                backgroundColor: ['#10b981', '#cbd5e1'],
                                                borderWidth: 0,
                                                hoverOffset: 10
                                            }]
                                        }}
                                        options={{
                                            cutout: '75%',
                                            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }
                                        }}
                                    />
                                    <div className="absolute text-center pointer-events-none">
                                        <p className="text-3xl font-bold text-slate-800">{((analytics?.summary?.validCount / (analytics?.summary?.totalViolations || 1)) * 100).toFixed(0)}%</p>
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Valid Rate</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* TABLE MATRIX */}
                        <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-orange-100/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-amber-900 font-bold">Alert FMS Summary Matrix</CardTitle>
                                        <CardDescription className="text-amber-700/60">Rekapitulasi detail validasi pelanggaran</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-amber-50/50 text-amber-900 font-bold text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4 border-b border-orange-100 pl-6">Alert FMS Type</th>
                                                <th className="p-4 border-b border-orange-100 text-center">Total</th>
                                                <th className="p-4 border-b border-orange-100 text-center text-emerald-600">Valid</th>
                                                <th className="p-4 border-b border-orange-100 text-center text-rose-600">Invalid</th>
                                                <th className="p-4 border-b border-orange-100 text-center">Valid %</th>
                                                <th className="p-4 border-b border-orange-100 text-center">Invalid %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {analytics?.validationStats?.map((row: any, i: number) => {
                                                const validPct = row.total > 0 ? (row.valid / row.total * 100).toFixed(0) + '%' : '0%';
                                                const invalidPct = row.total > 0 ? (row.invalid / row.total * 100).toFixed(0) + '%' : '0%';
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="p-4 pl-6 font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{row.violationType}</td>
                                                        <td className="p-4 text-center font-bold text-slate-600 bg-slate-50/30">{row.total}</td>
                                                        <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/10">{row.valid}</td>
                                                        <td className="p-4 text-center font-bold text-rose-600 bg-rose-50/10">{row.invalid}</td>
                                                        <td className="p-4 text-center font-medium">{validPct}</td>
                                                        <td className="p-4 text-center font-medium text-slate-400">{invalidPct}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-900 text-white font-bold text-sm">
                                            <tr>
                                                <td className="p-4 pl-6">Grand Total</td>
                                                <td className="p-4 text-center bg-white/10">{analytics?.summary?.totalViolations}</td>
                                                <td className="p-4 text-center text-emerald-400 bg-white/5">{analytics?.summary?.validCount}</td>
                                                <td className="p-4 text-center text-rose-400 bg-white/5">{analytics?.summary?.invalidCount}</td>
                                                <td className="p-4 text-center">
                                                    {analytics?.summary?.totalViolations ? (analytics.summary.validCount / analytics.summary.totalViolations * 100).toFixed(0) : 0}%
                                                </td>
                                                <td className="p-4 text-center text-slate-400">
                                                    {analytics?.summary?.totalViolations ? (analytics.summary.invalidCount / analytics.summary.totalViolations * 100).toFixed(0) : 0}%
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-8">
                        {/* MYSTIC AI CARD */}
                        <MysticAnalysisCard data={analytics} />

                        {/* HOURLY DISTRIBUTION */}
                        <Card className="bg-white border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white/50 pb-4 border-b border-slate-100">
                                <CardTitle className="text-base font-bold text-slate-800">Pola Jam Pelanggaran</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-4 gap-2">
                                    {Array.from({ length: 24 }).map((_, hour) => {
                                        const hourData = analytics?.byHour?.find((h: any) => h.hour === hour);
                                        const count = hourData?.count || 0;
                                        const maxCount = Math.max(...(analytics?.byHour?.map((h: any) => h.count) || [1]));
                                        const intensity = count / maxCount;

                                        let bgClass = "bg-slate-50 text-slate-400";
                                        if (count > 0) bgClass = "bg-rose-100 text-rose-600";
                                        if (intensity > 0.3) bgClass = "bg-rose-300 text-rose-800";
                                        if (intensity > 0.6) bgClass = "bg-rose-400 text-white";
                                        if (intensity > 0.8) bgClass = "bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-300";

                                        return (
                                            <div key={hour} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold ${bgClass} transition-all duration-300 hover:scale-110 cursor-help`} title={`${count} violations at ${hour}:00`}>
                                                <span>{String(hour).padStart(2, '0')}</span>
                                                {count > 0 && <span className="text-[10px] opacity-80 scale-75">{count}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* WEEKLY STATS TABLE */}
                        <Card className="bg-white border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white/50 pb-4 border-b border-slate-100">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <span>📅</span> Statistik Mingguan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-left pl-6">Minggu</th>
                                            <th className="p-3 text-center">Total</th>
                                            <th className="p-3 text-center">Valid %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {analytics?.byWeek?.length > 0 ? analytics.byWeek.map((w: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 pl-6 font-medium text-slate-600">Week {w.week || "N/A"}</td>
                                                <td className="p-3 text-center text-slate-800 font-bold">{w.total}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${w.valid / (w.total || 1) > 0.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {((w.valid / (w.total || 1)) * 100).toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={3} className="text-center py-6 text-slate-400 italic">No trend data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* DRIVER LEADERBOARD */}
                        <Card className="bg-white border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 pb-4 border-b border-orange-100">
                                <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
                                    <span>🏆</span> Top 10 Violators
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {analytics?.topDrivers?.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {analytics.topDrivers.map((d: any, i: number) => (
                                            <div key={d.rank} className="p-4 flex items-center gap-4 hover:bg-amber-50/30 transition-colors">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    i === 1 ? 'bg-slate-200 text-slate-700' :
                                                        i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-400'
                                                    }`}>
                                                    {d.rank}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{d.driverName}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{d.vehicleNo} • {d.driverNik}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-lg text-xs font-bold">
                                                        {d.validCount} Valid
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 italic">No violator data</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, subValue, trend, color }: any) {
    return (
        <Card className="shadow-sm hover:shadow-lg transition-all duration-300 border-none bg-white/60 backdrop-blur-sm ring-1 ring-slate-100 group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
                        {subValue && (
                            <div className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit flex items-center gap-1 ${color} bg-opacity-10 backdrop-blur-md`}>
                                {subValue}
                                <span className="opacity-60 font-normal">rate</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function MysticAnalysisCard({ data }: any) {
    // Generate Heuristic Insights
    const insights = [];

    if (data) {
        // 1. Dominant Violation
        const topV = data.byViolation?.[0];
        if (topV) {
            insights.push(`Pelanggaran terbanyak adalah "${topV.type}" dengan total ${topV.count} kejadian (${parseInt(topV.percentage)}%).`);
        }

        // 2. High Invalid Rate
        const invalidRate = data.summary?.invalidCount / data.summary?.totalViolations;
        if (invalidRate > 0.5) {
            insights.push(`⚠️ Perhatian: Tingkat data "Tidak Valid" sangat tinggi (${(invalidRate * 100).toFixed(0)}%). Disarankan review proses validasi.`);
        }

        // 3. Shift Pattern
        const shift1 = data.byShift?.find((s: any) => s.shift === 'Shift 1')?.count || 0;
        const shift2 = data.byShift?.find((s: any) => s.shift === 'Shift 2')?.count || 0;

        if (shift2 > shift1 * 1.5) {
            insights.push(`🌙 Pola Shift: Shift 2 memiliki pelanggaraan ${(shift2 / shift1).toFixed(1)}x lipat lebih tinggi dibanding Shift 1. Indikasi kelelahan malam hari.`);
        }

        // 4. Peak Hour
        // Find hour with max count
        const peakHour = data.byHour?.reduce((prev: any, current: any) => (prev.count > current.count) ? prev : current, { count: -1 });
        if (peakHour && peakHour.count > 0) {
            insights.push(`⏰ Waktu Rawan: Puncak pelanggaran terjadi pada jam ${peakHour.hour}:00.`);
        }
    }

    return (
        <Card className="relative overflow-hidden border-none shadow-2xl group">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black z-0"></div>

            {/* Animated Glow Effects */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

            <CardHeader className="relative z-10 pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg ring-1 ring-yellow-500/30">
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400">
                            Mystic AI Insights
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs font-medium">
                            Analisa otomatis berbasis pola data
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
                {insights.length > 0 ? (
                    <ul className="space-y-4">
                        {insights.map((insight, i) => (
                            <li key={i} className="text-sm leading-relaxed flex gap-3 text-slate-200">
                                <span className="text-yellow-400 mt-0.5 text-lg">•</span>
                                <span className="opacity-90 font-light tracking-wide">{insight}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-8 text-slate-500 text-sm italic">
                        Belum cukup data untuk analisa mendalam.
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center group-hover:translate-y-0 transition-transform">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                        Mystic Engine v2.1
                    </span>
                    <Button size="sm" variant="secondary" className="h-8 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 transition-all font-medium backdrop-blur-sm">
                        Generate Report
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
