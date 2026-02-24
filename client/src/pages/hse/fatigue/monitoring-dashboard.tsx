import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, LabelList, ComposedChart
} from "recharts";
import { Download, Search, AlertTriangle, Monitor, TrendingUp } from "lucide-react";

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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// FMS Analytics Type matching what the backend returns
type FmsAnalyticsData = {
    summary: { totalViolations: number; totalUnits: number; validCount: number; invalidCount: number };
    byShift: { shift: string; count: number }[];
    byViolation: { violationType: string; count: number }[];
    byDate: { date: string; count: number }[];
    byHour: { hour: string; count: number }[];
    byWeek: { week: number; total: number; valid: number; invalid: number }[];
    byMonth: { month: string; total: number; valid: number; invalid: number }[];
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
    }[];
    validationStats: any[];
    availableWeeks: number[];
    availableViolationTypes: any[];
    topDrivers: any[];
    allDrivers: {
        rank: number;
        vehicleNo: string;
        driverName: string;
        driverNik: string;
        totalCount: number;
        mataTertutupCount: number;
        mengantukCount: number;
        kelelahanCount: number;
    }[];
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
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function FmsFatigueMonitoringDashboard() {

    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [weekFilter, setWeekFilter] = useState<string>("all");
    const [validationFilter, setValidationFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<{ vehicleNo: string; driverName: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    console.log("[DEBUG Dashboard] month:", monthFilter, "week:", weekFilter, "status:", validationFilter);

    // The critical filter for this dashboard
    const violationTypeFilter = "Mata Tertutup,Mengantuk,Kelelahan";

    const { data, isLoading, isError } = useQuery<FmsAnalyticsData>({
        queryKey: ['/api/fms/analytics', { violationType: violationTypeFilter, month: monthFilter, week: weekFilter, validationStatus: validationFilter }],
        queryFn: async () => {
            const params = new URLSearchParams();

            params.append('violationType', violationTypeFilter);
            if (monthFilter !== 'all') params.append('month', monthFilter);
            if (weekFilter !== 'all') params.append('week', weekFilter);
            if (validationFilter !== 'all') params.append('validationStatus', validationFilter);

            const res = await fetch(`/api/fms/analytics?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        }
    });

    // Fetch detailed violations for a specific driver when selected
    const { data: violationsDetail, isLoading: isLoadingDetail } = useQuery<FmsViolation[]>({
        queryKey: ['/api/fms/violations', { vehicleNo: selectedDriver?.vehicleNo, month: monthFilter, week: weekFilter, validationStatus: validationFilter, violationType: violationTypeFilter }],
        queryFn: async () => {
            if (!selectedDriver) return [];
            const params = new URLSearchParams();
            params.append('vehicleNo', selectedDriver.vehicleNo);
            params.append('violationType', violationTypeFilter);
            if (monthFilter !== 'all') params.append('month', monthFilter);
            if (weekFilter !== 'all') params.append('week', weekFilter);
            if (validationFilter !== 'all') params.append('validationStatus', validationFilter);

            console.log(`[DEBUG Modal Fetch] fetching for ${selectedDriver.vehicleNo} with params: ${params.toString()}`);

            const res = await fetch(`/api/fms/violations?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch violations");
            const jsonData = await res.json();
            console.log(`[DEBUG Modal Fetch] Received ${jsonData.length} records`);
            return jsonData;
        },
        enabled: !!selectedDriver && isModalOpen
    });

    const filteredTableData = data?.allDrivers?.filter(driver =>
        driver.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                        Pantauan khusus alert Mata Tertutup, Mengantuk, dan Kelelahan dari data FMS.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
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
                        <SelectTrigger className="w-[140px] bg-white text-sm">
                            <SelectValue placeholder="Semua Minggu" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Minggu</SelectItem>
                            {data?.availableWeeks?.sort((a, b) => a - b).map(w => (
                                <SelectItem key={w} value={w.toString()}>Minggu ke-{w}</SelectItem>
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
                                            <YAxis dataKey="vehicleNo" type="category" width={90} interval={0} tick={{ fontSize: 13 }} />
                                            <RechartsTooltip
                                                formatter={(value, name, props) => {
                                                    const driverName = props.payload.driverName;
                                                    // If 'value' is requested, we show it next to driverName
                                                    if (name === 'totalCount') return [value, `Total Alert (${driverName})`];
                                                    if (name === 'validCount') return [value, `Alert Valid (${driverName})`];
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
                                            <XAxis dataKey="hour" tickFormatter={(val) => `${val}:00`} />
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

                    </div>

                    {/* Employee Evaluation Combo Chart */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-2xl mt-6">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Grafik Evaluasi Karyawan</CardTitle>
                            <CardDescription>Visualisasi gabungan (Combo Chart) untuk Alert Fatigue karyawan</CardDescription>
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
                                        <Bar dataKey="totalCount" name="Total Alert (Bar)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
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
                                            <TableHead>Nama Karyawan</TableHead>
                                            <TableHead>NIK / ID</TableHead>
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
                                                <TableRow key={driver.vehicleNo + driver.driverNik}>
                                                    <TableCell className="font-medium text-center">{driver.rank}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <button
                                                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-bold text-left"
                                                            onClick={() => {
                                                                setSelectedDriver({ vehicleNo: driver.vehicleNo, driverName: driver.driverName });
                                                                setIsModalOpen(true);
                                                            }}
                                                        >
                                                            {driver.driverName || "Tidak Diketahui"}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell className="text-gray-500">{driver.driverNik || "-"}</TableCell>
                                                    <TableCell>{driver.vehicleNo}</TableCell>
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
                                                <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                                    Tidak ada data karyawan yang ditemukan.
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
                                    Rincian Alert: {selectedDriver?.driverName}
                                </DialogTitle>
                                <DialogDescription>
                                    Menampilkan daftar lengkap alert fatigue untuk unit {selectedDriver?.vehicleNo}
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
                                                    <TableHead>Lokasi</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
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
