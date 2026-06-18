import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getWeeksInMonth } from "@/lib/weekCutoffs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, LabelList, ComposedChart, ReferenceLine
} from "recharts";
import { Download, Search, AlertTriangle, Monitor, TrendingUp, ChevronDown, Edit2, Check, X, Upload, Loader2, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

// FMS Analytics Type matching what the backend returns
type FmsAnalyticsData = {
    summary: { totalViolations: number; totalUnits: number; validCount: number; invalidCount: number };
    byShift: { shift: string; count: number }[];
    byViolation: { violationType: string; count: number }[];
    byDate: { date: string; count: number }[];
    byHour: { hour: string; count: number }[];
    byWeek: { week: number; total: number; valid: number; invalid: number }[];
    byMonth: { month: string; total: number; valid: number; invalid: number }[];
    byLocation: { location: string; count: number }[];
    topDrivers: { rank: number; vehicleNo: string; driverName: string; driverNik: string; validCount: number; totalCount: number }[];
    allDrivers: {
        rank: number;
        vehicleNo: string;
        driverName: string;
        driverNik: string;
        validCount: number;
        totalCount: number;
        mataTertutupCount: number;
        mengantukCount: number;
        kelelahanCount: number;
        unassignedCount: number;
    }[];
    validationStats: any[];
    availableWeeks: number[];
    availableViolationTypes: any[];
};

type FmsViolation = {
    id: string;
    violationDate: string;
    violationTime: string;
    violationTimestamp: string;
    vehicleNo: string;
    violationType: string;
    location: string;
    shift: string;
    validationStatus: string;
    manualDriverName?: string | null;
    manualDriverNik?: string | null;
    evidenceUrl?: string | null;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function FmsFatigueMonitoringDashboard() {

    const year = new Date().getFullYear();
    const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const washKey = (s: string) => s ? s.toString().replace(/\s+/g, "").toUpperCase() : "";

    const { data: unitMitraMap } = useQuery<Record<string, string>>({
        queryKey: ["unit-mitra-map"],
        queryFn: async () => {
            const res = await fetch("/api/fms/unit-mitra-map");
            if (!res.ok) return {};
            return res.json();
        }
    });

    const [dateFilter, setDateFilter] = useState<string>("");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [weekFilter, setWeekFilter] = useState<string>("all"); // value: "YYYY-MM-DD|YYYY-MM-DD" or "all"

    const weekOptions = useMemo(() => {
        const month = monthFilter !== 'all' ? monthFilter : MONTH_NAMES[new Date().getMonth()];
        return getWeeksInMonth(year, month);
    }, [year, monthFilter]);
    const [validationFilter, setValidationFilter] = useState<string>("all");
    const [evalThreshold, setEvalThreshold] = useState<number>(100);
    const [violationTypeFilter, setViolationTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<{ vehicleNo: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [overrideName, setOverrideName] = useState("");
    const [overrideNik, setOverrideNik] = useState("");
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
    const [employeeResults, setEmployeeResults] = useState<Array<{ id: string; name: string; nomorLambung?: string }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const searchEmployees = useCallback((query: string) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!query || query.length < 2) {
            setEmployeeResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/employees?search=${encodeURIComponent(query)}&per_page=10`);
                if (res.ok) {
                    const json = await res.json();
                    const emps = json.data || json || [];
                    setEmployeeResults(emps.slice(0, 8));
                }
            } catch (e) {
                console.error("Employee search error:", e);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, []);

    const updateDriverMutation = useMutation({
        mutationFn: async (data: { id: string, manualDriverName: string, manualDriverNik: string, evidence?: File | null }) => {
            const formData = new FormData();
            formData.append('manualDriverName', data.manualDriverName);
            formData.append('manualDriverNik', data.manualDriverNik);
            if (data.evidence) {
                formData.append('evidence', data.evidence);
            }
            const res = await fetch(`/api/fms/violations/${data.id}/driver`, {
                method: 'PATCH',
                body: formData
            });
            if (!res.ok) throw new Error("Gagal menyimpan nama driver");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/fms/analytics'] });
            queryClient.invalidateQueries({ queryKey: ['/api/fms/violations'] });
            toast({ title: "Berhasil", description: "Nama driver & evidence berhasil disimpan." });
            setOverrideName("");
            setOverrideNik("");
            setEvidenceFile(null);
            setEvidencePreview(null);
            setIsModalOpen(false);
        },
        onError: (err) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });


    console.log("[DEBUG Dashboard] month:", monthFilter, "week:", weekFilter, "status:", validationFilter);

    // The critical filter for this dashboard
    // The critical filter for this dashboard - now dynamic

    const { data, isLoading, isError } = useQuery<FmsAnalyticsData>({
        queryKey: ['/api/fms/analytics', { violationType: violationTypeFilter, date: dateFilter, month: monthFilter, week: weekFilter, validationStatus: validationFilter }],
        queryFn: async () => {
            const params = new URLSearchParams();

            params.append('violationType', violationTypeFilter === 'all' ? 'Mata Tertutup,Mengantuk,Kelelahan' : violationTypeFilter);
            if (dateFilter) {
                params.append('startDate', dateFilter);
                params.append('endDate', dateFilter);
            }
            if (weekFilter !== 'all') {
                const [sd, ed] = weekFilter.split('|');
                params.append('startDate', sd);
                params.append('endDate', ed);
            } else if (monthFilter !== 'all') {
                params.append('month', monthFilter);
            }
            if (validationFilter !== 'all') params.append('validationStatus', validationFilter);

            const res = await fetch(`/api/fms/analytics?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        }
    });

    // Fetch detailed violations for a selected vehicle
    const { data: violationsDetail, isLoading: isLoadingDetail } = useQuery<FmsViolation[]>({
        queryKey: ['/api/fms/violations', { vehicleNo: selectedDriver?.vehicleNo, date: dateFilter, month: monthFilter, week: weekFilter, validationStatus: validationFilter, violationType: violationTypeFilter }],
        queryFn: async () => {
            if (!selectedDriver) return [];
            const params = new URLSearchParams();
            params.append('vehicleNo', selectedDriver.vehicleNo);
            params.append('violationType', violationTypeFilter === 'all' ? 'Mata Tertutup,Mengantuk,Kelelahan' : violationTypeFilter);
            if (dateFilter) {
                params.append('startDate', dateFilter);
                params.append('endDate', dateFilter);
            }
            if (weekFilter !== 'all') {
                const [sd, ed] = weekFilter.split('|');
                params.append('startDate', sd);
                params.append('endDate', ed);
            } else if (monthFilter !== 'all') {
                params.append('month', monthFilter);
            }
            if (validationFilter !== 'all') params.append('validationStatus', validationFilter);

            const res = await fetch(`/api/fms/violations?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch violations");
            return res.json();
        },
        enabled: !!selectedDriver && isModalOpen
    });

    const filteredTableData = data?.allDrivers?.filter(driver =>
        driver.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const MONTH_ORDER: { [key: string]: number } = {
        "Januari": 1, "Februari": 2, "Maret": 3, "April": 4,
        "Mei": 5, "Juni": 6, "Juli": 7, "Agustus": 8,
        "September": 9, "Oktober": 10, "November": 11, "Desember": 12
    };

    const sortedByMonth = data?.byMonth ? [...data.byMonth].sort((a, b) => {
        const aVal = MONTH_ORDER[a.month] || 99;
        const bVal = MONTH_ORDER[b.month] || 99;
        return aVal - bVal;
    }) : [];

    return (
        <div className="flex-1 space-y-6 lg:space-y-8 p-4 md:p-6 lg:p-8 max-w-[1920px] w-full mx-auto bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="bg-red-50 p-2 rounded-xl">
                            <Monitor className="h-6 w-6 text-red-600" />
                        </div>
                        Monitoring Fatigue (FMS)
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Pantauan khusus alert Mata Tertutup, Mengantuk, dan Kelelahan dari data FMS. Status validasi mengikuti FAMOUS dan disegarkan otomatis tiap hari — alert yang baru muncul berstatus <b>Belum Validasi</b> sampai divalidasi petugas, jadi pilih <b>Semua Status</b> untuk total terkini.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-[140px] bg-white text-sm"
                    />
                    <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setWeekFilter("all"); }}>
                        <SelectTrigger className="w-[140px] bg-white text-sm">
                            <SelectValue placeholder="Semua Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Bulan</SelectItem>
                            {Object.keys(MONTH_ORDER).map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={weekFilter} onValueChange={setWeekFilter}>
                        <SelectTrigger className="w-[200px] bg-white text-sm">
                            <SelectValue placeholder="Semua Minggu" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Minggu</SelectItem>
                            {weekOptions.map(w => (
                                <SelectItem key={w.weekNumber} value={`${w.startDate}|${w.endDate}`}>
                                    {w.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={validationFilter} onValueChange={setValidationFilter}>
                        <SelectTrigger className="w-[150px] bg-white text-sm">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="Valid">Valid</SelectItem>
                            <SelectItem value="Tidak Valid">Tidak Valid</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={violationTypeFilter} onValueChange={setViolationTypeFilter}>
                        <SelectTrigger className="w-[180px] bg-white text-sm">
                            <SelectValue placeholder="Semua Pelanggaran" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Pelanggaran</SelectItem>
                            <SelectItem value="Mata Tertutup">Mata Tertutup</SelectItem>
                            <SelectItem value="Mengantuk">Mengantuk</SelectItem>
                            <SelectItem value="Kelelahan">Kelelahan</SelectItem>
                        </SelectContent>
                    </Select>

                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-[120px] w-full rounded-2xl" />
                    <Skeleton className="h-[120px] w-full rounded-2xl" />
                    <Skeleton className="h-[120px] w-full rounded-2xl" />
                    <Skeleton className="h-[120px] w-full rounded-2xl" />
                </div>
            ) : isError ? (
                <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Gagal memuat data FMS. Silakan coba lagi.
                </div>
            ) : data ? (
                <>
                    {/* Petunjuk: 0 saat filter status spesifik karena periode ini belum ada yang berstatus itu */}
                    {data.summary.totalViolations === 0 && validationFilter !== 'all' && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>
                                Belum ada alert berstatus <b>{validationFilter}</b> untuk periode ini. Alert yang baru muncul berstatus <b>Belum Validasi</b> sampai divalidasi petugas di FAMOUS.
                                <button onClick={() => setValidationFilter('all')} className="ml-2 underline font-semibold hover:text-amber-900">Tampilkan Semua</button>
                            </span>
                        </div>
                    )}
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-[5px] h-full bg-red-500" />
                            <CardContent className="p-6 border-l-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Alert Fatigue</p>
                                        <p className="text-4xl font-extrabold text-gray-800 tracking-tight">{data.summary.totalViolations}</p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-2xl group-hover:bg-red-100 transition-colors">
                                        <AlertTriangle className="h-7 w-7 text-red-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-[5px] h-full bg-amber-500" />
                            <CardContent className="p-6 border-l-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unit Terlibat</p>
                                        <p className="text-4xl font-extrabold text-gray-800 tracking-tight">{data.summary.totalUnits}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-2xl group-hover:bg-amber-100 transition-colors">
                                        <Monitor className="h-7 w-7 text-amber-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-[5px] h-full bg-blue-500" />
                            <CardContent className="p-6 border-l-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Alert Tervalidasi (Valid)</p>
                                        <p className="text-4xl font-extrabold text-gray-800 tracking-tight">{data.summary.validCount}</p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                        <TrendingUp className="h-7 w-7 text-blue-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-[5px] h-full bg-emerald-500" />
                            <CardContent className="p-6 border-l-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Driver Terdampak</p>
                                        <p className="text-4xl font-extrabold text-gray-800 tracking-tight">{data.allDrivers.length}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                                        <Monitor className="h-7 w-7 text-emerald-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Top 10 Drivers */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Top 10 Nomor Lambung & Karyawan</CardTitle>
                                <CardDescription>Kendaraan dengan alert fatigue terbanyak</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={data.topDrivers}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="vehicleNo"
                                                type="category"
                                                width={140}
                                                interval={0}
                                                tick={{ fontSize: 11, fontWeight: 'bold' }}
                                                tickFormatter={(value) => {
                                                    const mitra = unitMitraMap?.[washKey(value)];
                                                    return mitra ? `${value} • ${mitra}` : value;
                                                }}
                                            />
                                            <RechartsTooltip
                                                formatter={(value, name, props) => {
                                                    const driverName = props.payload.driverName;
                                                    const vehicleNo = props.payload.vehicleNo;
                                                    const mitra = unitMitraMap?.[washKey(vehicleNo)];
                                                    const label = mitra ? `${driverName} (${mitra})` : driverName;

                                                    if (name === 'totalCount') return [value, `Total Alert - ${label}`];
                                                    if (name === 'validCount') return [value, `Alert Valid - ${label}`];
                                                    return [value, name];
                                                }}
                                            />
                                            <Legend />
                                            <Bar dataKey="totalCount" name="Total Alert" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="totalCount" position="right" fill="#6b7280" fontSize={12} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Shift Distribution */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Distribusi Berdasarkan Shift</CardTitle>
                                <CardDescription>Perbandingan jumlah alert per shift</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center flex-col h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.byShift.filter(s => s.shift && s.shift.trim() !== '')}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="count"
                                            nameKey="shift"
                                        >
                                            {data.byShift.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Hourly Trend */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Trend Per Jam (Waktu Rawan)</CardTitle>
                                <CardDescription>Distribusi alert fatigue sepanjang hari</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.byHour.sort((a, b) => parseInt(a.hour) - parseInt(b.hour))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="hour" tickFormatter={(val) => `${String(val).padStart(2, '0')}:00`} tick={{ fontSize: 10, fill: '#6B7280' }} interval={0} angle={-35} textAnchor="end" height={40} />
                                            <YAxis />
                                            <RechartsTooltip formatter={(val) => [val, 'Jumlah Alert']} labelFormatter={(l) => `Pukul ${l}:00`} />
                                            <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                                {data.byHour.sort((a, b) => parseInt(a.hour) - parseInt(b.hour)).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.count > 10 ? '#ef4444' : (entry.count > 5 ? '#f59e0b' : '#3b82f6')} />
                                                ))}
                                                <LabelList dataKey="count" position="top" fill="#6b7280" fontSize={11} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Monthly Trend */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Trend Per Bulan</CardTitle>
                                <CardDescription>Perkembangan alert fatigue tiap bulan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={sortedByMonth} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <RechartsTooltip />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="total" name="Total Alert" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                                <LabelList dataKey="total" position="top" fill="#6b7280" fontSize={12} offset={10} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Daily Trend (Sparkline) */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Trend Harian</CardTitle>
                                <CardDescription>Pergerakan alert fatigue harian</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.byDate} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(val) => {
                                                    const parts = val.split('-');
                                                    return parts.length === 3 ? parts[2] : val;
                                                }}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                axisLine={true}
                                                tickLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                dx={-10}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#71717A', border: 'none', borderRadius: '4px', padding: '8px' }}
                                                itemStyle={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}
                                                labelStyle={{ color: '#fff', fontSize: 12, marginBottom: '4px' }}
                                                labelFormatter={(l) => {
                                                    // Add time dummy since image has time
                                                    return `${l} 00:00:00`;
                                                }}
                                                formatter={(val) => [val, 'value']}
                                            />
                                            <Line
                                                type="linear"
                                                dataKey="count"
                                                stroke="#38bdf8"
                                                strokeWidth={2}
                                                dot={{ r: 3, fill: '#fff', stroke: '#38bdf8', strokeWidth: 2 }}
                                                activeDot={{ r: 6, fill: '#06b6d4', stroke: '#06b6d4', strokeWidth: 8, strokeOpacity: 0.2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Weekly Trend (Optional/Extra) */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Trend Per Minggu</CardTitle>
                                <CardDescription>Melihat lonjakan alert pada minggu-minggu tertentu</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.byWeek} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="week" tickFormatter={(v) => `MG-${v}`} />
                                            <YAxis />
                                            <RechartsTooltip labelFormatter={(l) => `Minggu ke-${l}`} />
                                            <Legend />
                                            <Area type="monotone" dataKey="total" name="Total Alert" stroke="#ef4444" fillOpacity={1} fill="url(#colorTotal)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trend Per Lokasi */}
                        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-gray-900">Trend Per Lokasi</CardTitle>
                                <CardDescription>Lokasi dengan alert fatigue terbanyak</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    {(!data.byLocation || data.byLocation.length === 0) ? (
                                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                                            Tidak ada data lokasi
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={data.byLocation}
                                                layout="vertical"
                                                margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="location"
                                                    width={130}
                                                    tick={{ fontSize: 11, fill: '#6B7280' }}
                                                    interval={0}
                                                />
                                                <RechartsTooltip formatter={(val) => [val, 'Jumlah Alert']} />
                                                <Bar dataKey="count" name="Jumlah Alert" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                                    {data.byLocation.map((entry, index) => (
                                                        <Cell
                                                            key={`loc-cell-${index}`}
                                                            fill={entry.count > 10 ? '#ef4444' : (entry.count > 5 ? '#f59e0b' : '#3b82f6')}
                                                        />
                                                    ))}
                                                    <LabelList dataKey="count" position="right" fill="#6b7280" fontSize={11} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Employee Evaluation Combo Chart */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl mt-6">
                        <CardHeader className="pb-2 flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <CardTitle className="text-base font-semibold text-gray-900">Grafik Evaluasi Karyawan</CardTitle>
                                <CardDescription>Visualisasi gabungan (Combo Chart) untuk Alert Fatigue karyawan</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <Label htmlFor="threshold-input" className="text-xs text-slate-600 whitespace-nowrap px-1">Treshold Target:</Label>
                                <Input
                                    id="threshold-input"
                                    type="number"
                                    className="w-[80px] h-8 text-sm bg-white"
                                    value={evalThreshold}
                                    onChange={(e) => setEvalThreshold(Number(e.target.value) || 0)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={filteredTableData.slice(0, 15)} // Limit to 15 to avoid crowding the X-Axis
                                        margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="driverName"
                                            tickFormatter={(val) => val ? val.split(' ')[0] : 'Unknown'}
                                            angle={-35}
                                            textAnchor="end"
                                            height={60}
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                        />
                                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value, name) => [value, name === 'totalCount' ? 'Total Alert' : name]}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <ReferenceLine y={evalThreshold} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: `Batas Maksimum (${evalThreshold})`, fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                                        <Bar dataKey="totalCount" name="Total Alert (Bar)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40}>
                                            <LabelList dataKey="totalCount" position="top" fill="#6B7280" fontSize={12} fontWeight="bold" />
                                        </Bar>
                                        <Line type="monotone" dataKey="totalCount" name="Trend Total Alert (Line)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Table */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl mt-6 overflow-hidden">
                        <CardHeader className="pb-4 bg-white border-b border-gray-50">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                    <CardTitle className="text-base font-semibold text-gray-900">Tabel Evaluasi Karyawan</CardTitle>
                                    <CardDescription>Rincian pelanggaran fatigue untuk setiap driver / karyawan</CardDescription>
                                </div>
                                <div className="relative w-full md:w-[300px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="search"
                                        placeholder="Cari Nama Karyawan atau No Lambung..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="w-full">
                                <Table>
                                    <TableHeader className="bg-slate-50/80">
                                        <TableRow>
                                            <TableHead className="w-[80px] text-center">Rank</TableHead>
                                            <TableHead>Nomor Lambung</TableHead>
                                            <TableHead className="text-center text-red-600 font-semibold">Total Alert</TableHead>
                                            <TableHead className="text-center">Mata Tertutup</TableHead>
                                            <TableHead className="text-center">Mengantuk</TableHead>
                                            <TableHead className="text-center">Kelelahan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTableData.length > 0 ? (
                                            filteredTableData.map((driver) => (
                                                <TableRow key={driver.vehicleNo}>
                                                    <TableCell className="font-medium text-center">{driver.rank}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-bold text-left"
                                                                    onClick={() => {
                                                                        setSelectedDriver({ vehicleNo: driver.vehicleNo });
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                >
                                                                    {driver.vehicleNo}
                                                                </button>
                                                                <span className="text-[10px] text-gray-400 font-normal">
                                                                    {unitMitraMap?.[washKey(driver.vehicleNo)] || ""}
                                                                </span>
                                                                {driver.unassignedCount > 0 && (
                                                                    <span className="flex h-2.5 w-2.5 relative">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {driver.unassignedCount > 0 && (
                                                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-h-4 h-4 bg-red-100 text-red-700 hover:bg-red-200 border-none rounded">
                                                                    {driver.unassignedCount} Belum Diinput
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-red-600 bg-red-50/50">
                                                        {driver.totalCount}
                                                    </TableCell>
                                                    <TableCell className="text-center">{driver.mataTertutupCount}</TableCell>
                                                    <TableCell className="text-center">{driver.mengantukCount}</TableCell>
                                                    <TableCell className="text-center">{driver.kelelahanCount}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                                    Tidak ada data yang ditemukan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Driver Detail Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                            <DialogHeader className="p-6 pb-2 border-b">
                                <DialogTitle className="text-xl flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Rincian Alert: {selectedDriver?.vehicleNo}
                                </DialogTitle>
                                <DialogDescription>
                                    Menampilkan daftar lengkap alert fatigue untuk unit {selectedDriver?.vehicleNo}. Klik tombol edit untuk menginput nama driver.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-hidden p-6 pt-2">
                                {isLoadingDetail ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : violationsDetail && violationsDetail.length > 0 ? (
                                    <ScrollArea className="h-full pr-4">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[150px]">Tanggal & Waktu</TableHead>
                                                    <TableHead>Jenis Pelanggaran</TableHead>
                                                    <TableHead>Driver</TableHead>
                                                    <TableHead>Lokasi</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                    <TableHead className="w-[80px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {violationsDetail.map((v) => (
                                                    <TableRow key={v.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm">{v.violationDate}</span>
                                                                <span className="text-xs text-gray-500">{v.violationTime}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`
                                                                ${v.violationType === 'Mata Tertutup' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                                                    v.violationType === 'Mengantuk' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                                                        'border-emerald-200 bg-emerald-50 text-emerald-700'}
                                                            `}>
                                                                {v.violationType}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {v.manualDriverName ? (
                                                                <span className="font-medium text-green-700">{v.manualDriverName}</span>
                                                            ) : (
                                                                <span className="text-gray-400 italic">Belum diisi</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm max-w-[200px] truncate" title={v.location}>
                                                            {v.location || "-"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                v.validationStatus === 'Valid' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none' : 'bg-red-100 text-red-700 hover:bg-red-200 border-none'
                                                            }>
                                                                {v.validationStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-96" side="left" onOpenAutoFocus={(e) => { e.preventDefault(); setEmployeeResults([]); setOverrideName(""); setOverrideNik(""); setEvidenceFile(null); setEvidencePreview(null); }}>
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <h4 className="font-medium leading-none">Ubah Driver</h4>
                                                                            <p className="text-xs text-muted-foreground mt-1">Ketik nama untuk mencari karyawan.</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label htmlFor={`name-${v.id}`} className="text-xs">Nama Karyawan</Label>
                                                                            <div className="relative">
                                                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                                                <Input
                                                                                    id={`name-${v.id}`}
                                                                                    placeholder="Ketik minimal 2 huruf..."
                                                                                    defaultValue={v.manualDriverName || ''}
                                                                                    className="pl-9 h-9"
                                                                                    onChange={(e) => {
                                                                                        setOverrideName(e.target.value);
                                                                                        searchEmployees(e.target.value);
                                                                                    }}
                                                                                    autoComplete="off"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {/* Autocomplete Results - Inline */}
                                                                        {isSearching && (
                                                                            <div className="text-center text-xs text-gray-400 py-2">Mencari...</div>
                                                                        )}
                                                                        {employeeResults.length > 0 && (
                                                                            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white">
                                                                                {employeeResults.map((emp) => (
                                                                                    <button
                                                                                        key={emp.id}
                                                                                        type="button"
                                                                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b last:border-b-0 flex justify-between items-center"
                                                                                        onClick={() => {
                                                                                            setOverrideName(emp.name);
                                                                                            setOverrideNik(emp.id);
                                                                                            setEmployeeResults([]);
                                                                                            const nameInput = document.getElementById(`name-${v.id}`) as HTMLInputElement;
                                                                                            const nikInput = document.getElementById(`nik-${v.id}`) as HTMLInputElement;
                                                                                            if (nameInput) nameInput.value = emp.name;
                                                                                            if (nikInput) nikInput.value = emp.id;
                                                                                        }}
                                                                                    >
                                                                                        <div>
                                                                                            <div className="font-medium text-sm text-gray-800">{emp.name}</div>
                                                                                            <div className="text-xs text-gray-500">NIK: {emp.id}</div>
                                                                                        </div>
                                                                                        {emp.nomorLambung && (
                                                                                            <Badge variant="outline" className="text-xs bg-gray-50 shrink-0">{emp.nomorLambung}</Badge>
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        <div className="space-y-1">
                                                                            <Label htmlFor={`nik-${v.id}`} className="text-xs">NIK Karyawan</Label>
                                                                            <Input
                                                                                id={`nik-${v.id}`}
                                                                                placeholder="Otomatis terisi"
                                                                                defaultValue={v.manualDriverNik || ''}
                                                                                onChange={(e) => setOverrideNik(e.target.value)}
                                                                                className="bg-gray-50 h-9"
                                                                            />
                                                                        </div>
                                                                        {/* Evidence Upload */}
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">📷 Evidence / Bukti Foto</Label>
                                                                            {v.evidenceUrl && !evidencePreview && (
                                                                                <div className="mb-2">
                                                                                    <img src={v.evidenceUrl} alt="Evidence" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                                                                                    <p className="text-xs text-green-600 mt-1">✓ Evidence sudah ada</p>
                                                                                </div>
                                                                            )}
                                                                            {evidencePreview && (
                                                                                <div className="mb-2 relative">
                                                                                    <img src={evidencePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg border-2 border-blue-300" />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                                                        onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}
                                                                                    >×</button>
                                                                                    <p className="text-xs text-blue-600 mt-1">File baru dipilih</p>
                                                                                </div>
                                                                            )}
                                                                            <Input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                className="h-9 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) {
                                                                                        setEvidenceFile(file);
                                                                                        const reader = new FileReader();
                                                                                        reader.onload = (ev) => setEvidencePreview(ev.target?.result as string);
                                                                                        reader.readAsDataURL(file);
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                                                            onClick={() => {
                                                                                updateDriverMutation.mutate({
                                                                                    id: v.id,
                                                                                    manualDriverName: overrideName || v.manualDriverName || "",
                                                                                    manualDriverNik: overrideNik || v.manualDriverNik || "",
                                                                                    evidence: evidenceFile
                                                                                });
                                                                            }}
                                                                            disabled={updateDriverMutation.isPending}
                                                                        >
                                                                            {updateDriverMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                                                                        </Button>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-gray-500">
                                        Tidak ada rincian alert yang ditemukan untuk filter ini.
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}
        </div>
    );
}
