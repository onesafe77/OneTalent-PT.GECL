import { useState, useMemo } from "react";
import { getWeeksInMonth } from "@/lib/weekCutoffs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, ReferenceLine, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Search, Loader2, Calendar, Users, AlertTriangle, Activity, Zap, Eye, ImageIcon, X, Upload, Trash2, FileText, Camera } from "lucide-react";
import * as XLSX from 'xlsx';

interface ViolationDetail {
    id: string;
    violationDate: string;
    violationTime: string;
    vehicleNo: string;
    violationType: string;
    location: string;
    validationStatus: string;
    manualDriverName?: string | null;
    manualDriverNik?: string | null;
    evidenceUrl?: string | null;
}

interface WeekLevelHistory {
    weekKey: string;
    weekNumber: number;
    weekLabel: string;
    startDate: string;
    endDate: string;
    alertCount: number;
    consecutiveDays: number;
    alertDates: string[];
    level: 1 | 2 | 3 | null;
    levelTrigger: string | null;
}

interface DriverLevelHistory {
    currentLevel: 1 | 2 | 3 | 4 | null;
    levelReason: string;
    weekHistory: WeekLevelHistory[];
}

interface DriverEvaluation {
    rank: number;
    driverName: string;
    driverNik: string;
    vehicleNos: string;
    totalAlert: number;
    mataTertutup: number;
    kelelahan: number;
    sidakCount: number;
    pvtAvgRT: number | null;
    pvtTotalTests: number;
    pvtStatus: string;
    level: 1 | 2 | 3 | 4 | null;
}

function LevelBadge({ level }: { level: 1 | 2 | 3 | 4 | null }) {
    if (!level) return <span className="text-gray-400 text-xs">-</span>;
    const config: Record<number, { label: string; color: string }> = {
        1: { label: "Level 1", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
        2: { label: "Level 2", color: "bg-orange-100 text-orange-700 border-orange-300" },
        3: { label: "Level 3", color: "bg-red-100 text-red-700 border-red-300" },
        4: { label: "Level 4", color: "bg-red-900 text-white border-red-900" },
    };
    const c = config[level];
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${c.color}`}>
            {c.label}
        </span>
    );
}

interface DriverEvaluationResponse {
    drivers: DriverEvaluation[];
    total: number;
}

interface DriverInvestigation {
    photoUrls: string[];
    reportUrls: string[]; // format: "url|originalName"
}

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function EvaluasiDriverFatigue() {
    const currentMonth = MONTHS[new Date().getMonth()];
    const year = new Date().getFullYear();
    const [monthFilter, setMonthFilter] = useState(currentMonth);
    const [weekFilter, setWeekFilter] = useState("all"); // value: "YYYY-MM-DD|YYYY-MM-DD" or "all"
    const [searchQuery, setSearchQuery] = useState("");
    const [thresholdTarget, setThresholdTarget] = useState(100);
    const [selectedDriver, setSelectedDriver] = useState<DriverEvaluation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    // Fetch detail violations for selected driver
    const { data: detailData, isLoading: detailLoading } = useQuery<ViolationDetail[]>({
        queryKey: ['/api/fms/driver-violations', { driverName: selectedDriver?.driverName }],
        queryFn: async () => {
            if (!selectedDriver) return [];
            const res = await fetch(`/api/fms/driver-violations?driverName=${encodeURIComponent(selectedDriver.driverName)}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!selectedDriver && isDetailOpen,
    });

    // Fetch level history for selected driver
    const { data: levelHistory } = useQuery<DriverLevelHistory>({
        queryKey: ['/api/fms/driver-level-history', { driverName: selectedDriver?.driverName }],
        queryFn: async () => {
            if (!selectedDriver) return null;
            const res = await fetch(`/api/fms/driver-level-history?driverName=${encodeURIComponent(selectedDriver.driverName)}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!selectedDriver && isDetailOpen,
    });

    const queryClient = useQueryClient();

    // Mutation to save manual overall level per driver
    const levelMutation = useMutation({
        mutationFn: async ({ driverName, level }: { driverName: string; level: number | null }) => {
            const res = await fetch('/api/fms/driver-level-manual', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverName, level }),
            });
            if (!res.ok) throw new Error("Gagal menyimpan level");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/fms/driver-evaluations'] });
        },
    });

    // Mutation to save manual level per week
    const weekLevelMutation = useMutation({
        mutationFn: async ({ driverName, weekKey, level }: { driverName: string; weekKey: string; level: number | null }) => {
            const res = await fetch('/api/fms/driver-week-level', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverName, weekKey, level }),
            });
            if (!res.ok) throw new Error("Gagal menyimpan level minggu");
            return res.json();
        },
        onSuccess: () => {
            if (selectedDriver) {
                queryClient.invalidateQueries({ queryKey: ['/api/fms/driver-level-history', { driverName: selectedDriver.driverName }] });
            }
        },
    });

    // Investigation files query & mutations
    const { data: investigationData, refetch: refetchInvestigation } = useQuery<DriverInvestigation>({
        queryKey: ['/api/fms/driver-investigation', { driverName: selectedDriver?.driverName }],
        queryFn: async () => {
            if (!selectedDriver) return { photoUrls: [], reportUrls: [] };
            const res = await fetch(`/api/fms/driver-investigation?driverName=${encodeURIComponent(selectedDriver.driverName)}`);
            return res.json();
        },
        enabled: !!selectedDriver && isDetailOpen,
    });

    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isUploadingReport, setIsUploadingReport] = useState(false);

    const uploadPhoto = async (file: File) => {
        if (!selectedDriver) return;
        setIsUploadingPhoto(true);
        try {
            const fd = new FormData();
            fd.append('photo', file);
            fd.append('driverName', selectedDriver.driverName);
            const res = await fetch('/api/fms/driver-investigation/upload-photo', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload gagal');
            await refetchInvestigation();
        } finally { setIsUploadingPhoto(false); }
    };

    const uploadReport = async (file: File) => {
        if (!selectedDriver) return;
        setIsUploadingReport(true);
        try {
            const fd = new FormData();
            fd.append('report', file);
            fd.append('driverName', selectedDriver.driverName);
            fd.append('fileName', file.name);
            const res = await fetch('/api/fms/driver-investigation/upload-report', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload gagal');
            await refetchInvestigation();
        } finally { setIsUploadingReport(false); }
    };

    const deletePhoto = async (url: string) => {
        if (!selectedDriver) return;
        await fetch('/api/fms/driver-investigation/photo', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driverName: selectedDriver.driverName, url }) });
        await refetchInvestigation();
    };

    const deleteReport = async (url: string) => {
        if (!selectedDriver) return;
        await fetch('/api/fms/driver-investigation/report', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driverName: selectedDriver.driverName, url }) });
        await refetchInvestigation();
    };

    const weekOptions = useMemo(() =>
        monthFilter !== 'all' ? getWeeksInMonth(year, monthFilter) : [],
        [year, monthFilter]
    );

    const { data, isLoading } = useQuery<DriverEvaluationResponse>({
        queryKey: ['/api/fms/driver-evaluations', { month: monthFilter, week: weekFilter }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (weekFilter !== 'all') {
                const [sd, ed] = weekFilter.split('|');
                params.append('startDate', sd);
                params.append('endDate', ed);
            } else if (monthFilter !== 'all') {
                params.append('month', monthFilter);
            }
            const res = await fetch(`/api/fms/driver-evaluations?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        }
    });

    const filteredDrivers = useMemo(() => {
        if (!data?.drivers) return [];
        const q = searchQuery.toLowerCase();
        return data.drivers.filter(d =>
            d.driverName.toLowerCase().includes(q) ||
            d.driverNik.toLowerCase().includes(q) ||
            d.vehicleNos.toLowerCase().includes(q)
        );
    }, [data?.drivers, searchQuery]);

    const summary = useMemo(() => {
        if (!data?.drivers) return { total: 0, totalAlerts: 0, avgPVT: 0 };
        const totalAlerts = data.drivers.reduce((sum, d) => sum + d.totalAlert, 0);
        const pvtDrivers = data.drivers.filter(d => d.pvtAvgRT !== null);
        const avgPVT = pvtDrivers.length > 0 ? Math.round(pvtDrivers.reduce((sum, d) => sum + (d.pvtAvgRT || 0), 0) / pvtDrivers.length) : 0;
        return { total: data.total, totalAlerts, avgPVT };
    }, [data]);

    const exportToExcel = () => {
        if (!filteredDrivers.length) return;
        const ws = XLSX.utils.json_to_sheet(
            filteredDrivers.map((d, i) => ({
                No: i + 1,
                'Nama Driver': d.driverName,
                'NIK': d.driverNik,
                'No Lambung': d.vehicleNos,
                'Total Alert': d.totalAlert,
                'Mata Tertutup': d.mataTertutup,
                'Kelelahan': d.kelelahan,
                'Sidak Fatigue': d.sidakCount,
                'PVT Avg RT (ms)': d.pvtAvgRT || '-',
                'PVT Status': d.pvtStatus,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Evaluasi Driver');
        XLSX.writeFile(wb, `Evaluasi_Driver_Fatigue_${monthFilter}.xlsx`);
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-red-600" />
                <p className="text-gray-500 font-medium">Memuat Data Evaluasi Driver...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-6 font-sans">
            <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-red-500/10 via-orange-500/5 to-transparent pointer-events-none -z-10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent">
                        Evaluasi Driver Fatigue
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 px-3 py-1">
                            Data Keselamatan
                        </Badge>
                        <p className="text-gray-500 text-sm font-medium">
                            Evaluasi lengkap driver berdasarkan data alert FMS, sidak fatigue, dan PVT
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="bg-white/80 border-green-200 text-green-700 hover:bg-green-50">
                    <FileDown className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Bulan
                    </label>
                    <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setWeekFilter("all"); }}>
                        <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Bulan</SelectItem>
                            {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Minggu
                    </label>
                    <Select value={weekFilter} onValueChange={setWeekFilter}>
                        <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Minggu</SelectItem>
                            {weekOptions.map(w => (
                                <SelectItem key={w.weekNumber} value={`${w.startDate}|${w.endDate}`}>
                                    {w.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Cari
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari nama, NIK, atau nomor lambung..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white border-gray-200 h-10 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Driver</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-800 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-500" /> {summary.total}
                        </div>
                        <p className="text-xs text-blue-600 font-medium mt-1">Driver yang sudah dievaluasi</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Alert</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-600 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6" /> {summary.totalAlerts}
                        </div>
                        <p className="text-xs text-red-500 font-medium mt-1">Total pelanggaran fatigue</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Rata-rata PVT</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-indigo-600 flex items-center gap-2">
                            <Zap className="w-6 h-6" /> {summary.avgPVT || '-'} <span className="text-lg">ms</span>
                        </div>
                        <p className="text-xs text-indigo-500 font-medium mt-1">Waktu reaksi rata-rata</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg border-none">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-100">Periode</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{monthFilter === 'all' ? 'Semua' : monthFilter}</div>
                        <p className="text-xs text-red-100 mt-1">{weekFilter === 'all' ? 'Semua Minggu' : `Minggu ${weekFilter}`}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Grafik Evaluasi Karyawan */}
            {filteredDrivers.length > 0 && (
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-white/40">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    Grafik Evaluasi Karyawan
                                </CardTitle>
                                <p className="text-xs text-gray-500 mt-1">
                                    Visualisasi gabungan (Combo Chart) untuk Alert Fatigue karyawan
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium">Treshold Target:</span>
                                <Input
                                    type="number"
                                    value={thresholdTarget}
                                    onChange={e => setThresholdTarget(Number(e.target.value))}
                                    className="w-20 h-8 text-center text-sm"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart
                                data={filteredDrivers.slice(0, 20).map(d => ({
                                    name: d.driverName.length > 12 ? d.driverName.substring(0, 12) + '...' : d.driverName,
                                    fullName: d.driverName,
                                    totalAlert: d.totalAlert,
                                }))}
                                margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#666' }}
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none' }}
                                    formatter={(value: number, name: string) => [
                                        value,
                                        name === 'totalAlert' ? 'Total Alert' : name
                                    ]}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload.length > 0) {
                                            return (payload[0].payload as any)?.fullName || label;
                                        }
                                        return label;
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                    formatter={(value) => {
                                        if (value === 'totalAlert') return 'Total Alert (Bar)';
                                        if (value === 'trendLine') return 'Trend Total Alert (Line)';
                                        return value;
                                    }}
                                />
                                <ReferenceLine
                                    y={thresholdTarget}
                                    stroke="#ef4444"
                                    strokeDasharray="8 4"
                                    strokeWidth={2}
                                    label={{
                                        value: `Batas Minimum (${thresholdTarget})`,
                                        position: 'left',
                                        fill: '#ef4444',
                                        fontSize: 11,
                                        fontWeight: 600
                                    }}
                                />
                                <Bar
                                    dataKey="totalAlert"
                                    fill="#ef4444"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                >
                                    <LabelList
                                        dataKey="totalAlert"
                                        position="top"
                                        style={{ fontSize: '11px', fontWeight: 700, fill: '#333' }}
                                    />
                                </Bar>
                                <Line
                                    type="monotone"
                                    dataKey="totalAlert"
                                    name="trendLine"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            <Card className="overflow-hidden">
                <CardHeader className="border-b bg-white/40">
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-600" />
                            Evaluasi Driver Fatigue
                        </CardTitle>
                        <Badge variant="secondary">Total: {filteredDrivers.length} Driver</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow>
                                    <TableHead className="w-16 text-center">No</TableHead>
                                    <TableHead>Nama Driver</TableHead>
                                    <TableHead>NIK</TableHead>
                                    <TableHead>No Lambung</TableHead>
                                    <TableHead className="text-center text-red-600 font-semibold">Alert</TableHead>
                                    <TableHead className="text-center">Mata Tertutup</TableHead>
                                    <TableHead className="text-center">Kelelahan</TableHead>
                                    <TableHead className="text-center bg-blue-50/50">Sidak</TableHead>
                                    <TableHead className="text-center bg-indigo-50/50">PVT (ms)</TableHead>
                                    <TableHead className="text-center bg-indigo-50/50">Status PVT</TableHead>
                                    <TableHead className="text-center bg-orange-50/50">Level</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDrivers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-16 text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Users className="w-12 h-12 text-gray-300" />
                                                <p className="font-medium text-gray-500">Belum ada data driver</p>
                                                <p className="text-sm">Input nama driver melalui Monitoring Fatigue terlebih dahulu</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDrivers.map((d, i) => (
                                        <TableRow key={d.driverName + d.driverNik} className="hover:bg-red-50/20 transition-colors cursor-pointer" onClick={() => { setSelectedDriver(d); setIsDetailOpen(true); }}>
                                            <TableCell className="font-medium text-center text-gray-500">{i + 1}</TableCell>
                                            <TableCell>
                                                <button className="font-bold text-blue-700 hover:text-blue-900 hover:underline text-left flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setSelectedDriver(d); setIsDetailOpen(true); }}>
                                                    <Eye className="w-3.5 h-3.5" />
                                                    {d.driverName}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-gray-500 font-mono text-xs">{d.driverNik}</TableCell>
                                            <TableCell className="text-sm">{d.vehicleNos}</TableCell>
                                            <TableCell className="text-center font-bold text-red-600 bg-red-50/30">{d.totalAlert}</TableCell>
                                            <TableCell className="text-center">{d.mataTertutup}</TableCell>
                                            <TableCell className="text-center">{d.kelelahan}</TableCell>
                                            <TableCell className="text-center bg-blue-50/20">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    {d.sidakCount}x
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center bg-indigo-50/20 font-bold">
                                                {d.pvtAvgRT ? (
                                                    <span className={d.pvtAvgRT <= 350 ? "text-green-600" : d.pvtAvgRT <= 500 ? "text-yellow-600" : "text-red-600"}>
                                                        {d.pvtAvgRT}ms
                                                    </span>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-center bg-indigo-50/20">
                                                <Badge className={
                                                    d.pvtStatus === "Sangat Baik" ? "bg-green-100 text-green-700 border-none" :
                                                        d.pvtStatus === "Cukup" ? "bg-yellow-100 text-yellow-700 border-none" :
                                                            d.pvtStatus === "Lambat" ? "bg-red-100 text-red-700 border-none" :
                                                                "bg-gray-100 text-gray-500 border-none"
                                                }>
                                                    {d.pvtStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center bg-orange-50/10">
                                                <Select
                                                    value={d.level ? String(d.level) : "none"}
                                                    onValueChange={(val) => levelMutation.mutate({
                                                        driverName: d.driverName,
                                                        level: val === "none" ? null : Number(val),
                                                    })}
                                                >
                                                    <SelectTrigger className="h-7 w-28 text-xs mx-auto border-0 shadow-none focus:ring-0 p-1">
                                                        <SelectValue>
                                                            <LevelBadge level={d.level} />
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none"><span className="text-gray-400 text-xs">- Belum -</span></SelectItem>
                                                        <SelectItem value="1"><LevelBadge level={1} /></SelectItem>
                                                        <SelectItem value="2"><LevelBadge level={2} /></SelectItem>
                                                        <SelectItem value="3"><LevelBadge level={3} /></SelectItem>
                                                        <SelectItem value="4"><LevelBadge level={4} /></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Modal */}
            {selectedDriver && (
                <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) { setSelectedDriver(null); setExpandedImage(null); } }}>
                    <DialogContent className="max-w-5xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Detail Alert: {selectedDriver.driverName}
                            </DialogTitle>
                            <DialogDescription>
                                NIK: {selectedDriver.driverNik} | No Lambung: {selectedDriver.vehicleNos} | Total Alert: {selectedDriver.totalAlert}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Expanded Image Overlay */}
                        {expandedImage && (
                            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={() => setExpandedImage(null)}>
                                <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2" onClick={() => setExpandedImage(null)}>
                                    <X className="w-6 h-6" />
                                </button>
                                <img src={expandedImage} alt="Evidence" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
                            </div>
                        )}

                        <ScrollArea className="max-h-[65vh]">
                            {/* Manual Level Assignment */}
                            <div className="mb-4 p-4 rounded-xl border bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-bold text-gray-700">Penetapan Level Driver</span>
                                    <Select
                                        value={selectedDriver.level ? String(selectedDriver.level) : "none"}
                                        onValueChange={(val) => {
                                            const newLevel = val === "none" ? null : Number(val) as 1 | 2 | 3 | 4;
                                            setSelectedDriver(prev => prev ? { ...prev, level: newLevel } : null);
                                            levelMutation.mutate({ driverName: selectedDriver.driverName, level: newLevel });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-36 text-xs">
                                            <SelectValue placeholder="Pilih Level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none"><span className="text-gray-400 text-xs">- Belum Ada -</span></SelectItem>
                                            <SelectItem value="1"><LevelBadge level={1} /></SelectItem>
                                            <SelectItem value="2"><LevelBadge level={2} /></SelectItem>
                                            <SelectItem value="3"><LevelBadge level={3} /></SelectItem>
                                            <SelectItem value="4"><LevelBadge level={4} /></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Alert History Section (data otomatis) */}
                            {levelHistory && levelHistory.weekHistory.some(w => w.alertCount > 0) && (
                                <div className="mb-4 p-4 rounded-xl border bg-white border-gray-200">
                                    <p className="text-xs font-bold text-gray-600 mb-3">Riwayat Alert Per Minggu</p>
                                    <div className="flex flex-col gap-2">
                                        {levelHistory.weekHistory.filter(w => w.alertCount > 0).map(w => (
                                            <div key={w.weekKey} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                                <div className="shrink-0">
                                                    <Select
                                                        value={w.level ? String(w.level) : "none"}
                                                        onValueChange={(val) => weekLevelMutation.mutate({
                                                            driverName: selectedDriver!.driverName,
                                                            weekKey: w.weekKey,
                                                            level: val === "none" ? null : Number(val),
                                                        })}
                                                    >
                                                        <SelectTrigger className="h-7 w-24 text-xs p-1 border-gray-200">
                                                            <SelectValue>
                                                                {w.level ? <LevelBadge level={w.level} /> : <span className="text-gray-400 text-xs">- Set -</span>}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none"><span className="text-gray-400 text-xs">- Hapus -</span></SelectItem>
                                                            <SelectItem value="1"><LevelBadge level={1} /></SelectItem>
                                                            <SelectItem value="2"><LevelBadge level={2} /></SelectItem>
                                                            <SelectItem value="3"><LevelBadge level={3} /></SelectItem>
                                                            <SelectItem value="4"><LevelBadge level={4} /></SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-700">{w.weekLabel}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{w.levelTrigger}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {w.alertDates.map(d => (
                                                            <span key={d} className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded font-medium">
                                                                {d}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xl font-black text-red-600">{w.alertCount}</p>
                                                    <p className="text-[10px] text-gray-400">alert</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Investigation Section */}
                            <div className="mb-4 p-4 rounded-xl border bg-blue-50/40 border-blue-200">
                                <p className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Investigasi
                                </p>
                                {/* Foto Investigasi */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Camera className="w-3 h-3" /> Foto Investigasi</span>
                                        <label className="cursor-pointer">
                                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
                                            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                                {isUploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                Upload Foto
                                            </span>
                                        </label>
                                    </div>
                                    {investigationData?.photoUrls && investigationData.photoUrls.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {investigationData.photoUrls.map((url, i) => (
                                                <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                                                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setExpandedImage(url)} />
                                                    <button onClick={() => deletePhoto(url)} className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Belum ada foto investigasi</p>
                                    )}
                                </div>
                                {/* Laporan PDF */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1"><FileText className="w-3 h-3" /> Laporan PDF</span>
                                        <label className="cursor-pointer">
                                            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadReport(f); e.target.value = ''; }} />
                                            <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                                                {isUploadingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                Upload PDF
                                            </span>
                                        </label>
                                    </div>
                                    {investigationData?.reportUrls && investigationData.reportUrls.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                            {investigationData.reportUrls.map((entry, i) => {
                                                const [url, name] = entry.split('|');
                                                return (
                                                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline truncate">
                                                            <FileText className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                                            {name || `Laporan ${i + 1}`}
                                                        </a>
                                                        <button onClick={() => deleteReport(url)} className="ml-2 text-red-400 hover:text-red-600 shrink-0">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Belum ada laporan PDF</p>
                                    )}
                                </div>
                            </div>

                            {detailLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                                    <span className="ml-3 text-gray-500">Memuat detail alert...</span>
                                </div>
                            ) : detailData && detailData.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-gray-50/80 sticky top-0">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">No</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead>Jenis Pelanggaran</TableHead>
                                            <TableHead>No Lambung</TableHead>
                                            <TableHead>Lokasi</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-center">Evidence</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailData.map((v, i) => (
                                            <TableRow key={v.id} className="hover:bg-blue-50/30">
                                                <TableCell className="text-center text-gray-500 text-sm">{i + 1}</TableCell>
                                                <TableCell className="font-medium text-sm">{v.violationDate}</TableCell>
                                                <TableCell className="text-sm text-gray-600">{v.violationTime}</TableCell>
                                                <TableCell>
                                                    <Badge variant="destructive" className="text-xs">{v.violationType}</Badge>
                                                </TableCell>
                                                <TableCell className="font-medium text-sm">{v.vehicleNo}</TableCell>
                                                <TableCell className="text-sm text-gray-600">{v.location || '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={v.validationStatus === 'Valid' ? 'bg-green-100 text-green-700 border-none' : 'bg-gray-100 text-gray-500 border-none'}>
                                                        {v.validationStatus || 'Belum'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {v.evidenceUrl ? (
                                                        <button
                                                            className="inline-block"
                                                            onClick={() => setExpandedImage(v.evidenceUrl!)}
                                                        >
                                                            <img
                                                                src={v.evidenceUrl}
                                                                alt="Evidence"
                                                                className="w-16 h-12 object-cover rounded-md border-2 border-blue-200 hover:border-blue-500 transition-all hover:scale-105 cursor-pointer"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center justify-center">
                                                            <ImageIcon className="w-5 h-5 text-gray-300" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                    <p className="font-medium">Tidak ada data alert ditemukan</p>
                                </div>
                            )}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
