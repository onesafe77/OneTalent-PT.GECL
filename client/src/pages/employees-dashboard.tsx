
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Users,
    UserCheck,
    UserX,
    Briefcase,
    Building2,
    TrendingUp,
    Activity,
    UserPlus,
    PieChart as PieChartIcon,
    Filter,
    X,
    AlertTriangle,
    Car,
    ShieldAlert,
    Clock,
    MoreHorizontal,
    ArrowUpRight,
    MapPin
} from "lucide-react";
import type { Employee } from "@shared/schema";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    LabelList
} from "recharts";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { getExpiryStatus, type ExpiryLevel } from "@/lib/expiry-utils";

// --- Modern Color Palette (Tailored for Glassmorphism) ---
const COLORS = [
    '#6366f1', // Indigo 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#ef4444', // Red 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
];

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

export default function EmployeesDashboard() {
    // Fetch Data
    const { data: response, isLoading } = useQuery<{ data: Employee[]; total: number }>({
        queryKey: ["/api/employees", "dashboard"],
        queryFn: async () => {
            const res = await fetch("/api/employees?page=1&per_page=1000");
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        }
    });

    const employees = response?.data || [];

    // Filters
    const [deptFilter, setDeptFilter] = useState("all");
    const [posFilter, setPosFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const activeFilterCount = [deptFilter, posFilter, statusFilter].filter(f => f !== "all").length;

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchDept = deptFilter === "all" || emp.department === deptFilter;
            const matchPos = posFilter === "all" || emp.position === posFilter;
            const matchStatus = statusFilter === "all" || emp.status === statusFilter;
            return matchDept && matchPos && matchStatus;
        });
    }, [employees, deptFilter, posFilter, statusFilter]);

    // Statistics Calculation
    const dashboardStats = useMemo(() => {
        const total = filteredEmployees.length;
        const active = filteredEmployees.filter(emp => emp.status === 'active').length;
        const inactive = filteredEmployees.filter(emp => emp.status !== 'active').length;
        const spare = filteredEmployees.filter(emp => emp.isSpareOrigin).length;

        const getDistribution = (key: keyof Employee, limit = 5, otherLabel = "Lainnya") => {
            const counts = filteredEmployees.reduce((acc, emp) => {
                const val = (emp[key] as string) || "Unknown";
                acc[val] = (acc[val] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            let sorted = Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            if (sorted.length > limit) {
                const top = sorted.slice(0, limit);
                const others = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);
                sorted = [...top, { name: otherLabel, value: others }];
            }
            return sorted;
        };

        const departmentData = getDistribution("department", 5);
        const investorData = getDistribution("investorGroup", 5);
        const investorDataDetail = getDistribution("investorGroup", 999);
        const noInvestorGroupCount = filteredEmployees.filter(e => !e.investorGroup?.trim()).length;

        const positionCounts = filteredEmployees.reduce((acc, emp) => {
            const val = (emp.position as string) || "Unknown";
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const positionData = Object.entries(positionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        const recentEmployees = [...filteredEmployees]
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 5);

        // --- NEW: Domicile Stats Calculation ---
        const domicileStats = filteredEmployees.reduce((acc, emp) => {
            const group = (emp.addressGroup || "").toLowerCase();
            const domisili = (emp.domisiliKaryawan || "").toLowerCase();
            const province = (emp.provinsi || "").toLowerCase();

            // Logic: Check addressGroup first, then domisili, then province
            const isLocal =
                group.includes('lokal') ||
                group.includes('ring 1') ||
                group.includes('ring 2') ||
                domisili.includes('tanah laut') ||
                domisili.includes('jorong') ||
                domisili.includes('kintap') ||
                province.includes('kalimantan selatan');

            if (isLocal) {
                acc.local++;
            } else {
                acc.nonLocal++;
            }
            return acc;
        }, { local: 0, nonLocal: 0 });

        const domicileData = [
            { name: "Lokal", value: domicileStats.local, color: "#10b981" }, // Emerald
            { name: "Non-Lokal", value: domicileStats.nonLocal, color: "#ef4444" }, // Red
        ];

        // Breakdown by Kota/Kab (top 10)
        const kotaKabCounts = filteredEmployees.reduce((acc, emp) => {
            const kota = (emp.kotaKab || "").trim();
            if (!kota) return acc;
            acc[kota] = (acc[kota] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const kotaKabData = Object.entries(kotaKabCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // Breakdown by Provinsi
        const provinsiCounts = filteredEmployees.reduce((acc, emp) => {
            const prov = (emp.provinsi || "").trim();
            if (!prov) return acc;
            acc[prov] = (acc[prov] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const provinsiData = Object.entries(provinsiCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Karyawan tanpa data domisili
        const noKotaKabCount = filteredEmployees.filter(e => !e.kotaKab?.trim()).length;

        const calculateSimperStats = (field: keyof Employee) => {
            const counts = { expired: 0, near_expired: 0, aktif: 0, nodata: 0 };
            filteredEmployees.forEach(emp => {
                const status = getExpiryStatus(emp[field] as string | null);
                counts[status.level]++;
            });
            return counts;
        };

        const simpolStats = calculateSimperStats('expiredSimpol');
        const bibStats = calculateSimperStats('expiredSimperBib');
        const tiaStats = calculateSimperStats('expiredSimperTia');

        const expiringEmployees: { id: string; name: string; docType: string; status: string; daysLeft: number | null; badgeClass: string }[] = [];
        filteredEmployees.forEach(emp => {
            const simpol = getExpiryStatus(emp.expiredSimpol);
            const bib = getExpiryStatus(emp.expiredSimperBib);
            const tia = getExpiryStatus(emp.expiredSimperTia);

            if (['expired', 'near_expired'].includes(simpol.level)) {
                expiringEmployees.push({ id: emp.id, name: emp.name, docType: 'SIMPOL', status: simpol.status, daysLeft: simpol.daysLeft, badgeClass: simpol.badgeClass });
            }
            if (['expired', 'near_expired'].includes(bib.level)) {
                expiringEmployees.push({ id: emp.id, name: emp.name, docType: 'SIMPER BIB', status: bib.status, daysLeft: bib.daysLeft, badgeClass: bib.badgeClass });
            }
            if (['expired', 'near_expired'].includes(tia.level)) {
                expiringEmployees.push({ id: emp.id, name: emp.name, docType: 'SIMPER TIA', status: tia.status, daysLeft: tia.daysLeft, badgeClass: tia.badgeClass });
            }
        });

        const priorityOrder = { 'EXPIRED': 0, 'NEAR EXPIRED': 1 };
        expiringEmployees.sort((a, b) => (priorityOrder[a.status as keyof typeof priorityOrder] ?? 3) - (priorityOrder[b.status as keyof typeof priorityOrder] ?? 3));

        return { total, active, inactive, spare, departmentData, investorData, investorDataDetail, noInvestorGroupCount, positionData, recentEmployees, simpolStats, bibStats, tiaStats, expiringEmployees, domicileData, kotaKabData, provinsiData, noKotaKabCount };
    }, [filteredEmployees]);

    const uniqueDepts = useMemo(() => Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort(), [employees]);
    const uniquePositions = useMemo(() => Array.from(new Set(employees.map(e => e.position).filter(Boolean))).sort(), [employees]);

    const resetFilters = () => {
        setDeptFilter("all");
        setPosFilter("all");
        setStatusFilter("all");
        setIsFilterOpen(false);
    };

    if (isLoading) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-t-indigo-500 border-indigo-200 animate-spin"></div>
                <p className="text-muted-foreground animate-pulse text-sm">Memuat Dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8 font-sans animate-in fade-in duration-700">

            {/* Header with Glassmorphism */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Dashboard <span className="text-indigo-600">Overview</span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-base font-light">
                        Pusat kendali data operasional dan statistik karyawan.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                            <X className="w-4 h-4 mr-2" /> Reset Filter
                        </Button>
                    )}
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:shadow transition-all rounded-full px-6">
                                <Filter className="w-4 h-4 mr-2 text-indigo-500" />
                                Filter
                                {activeFilterCount > 0 && (
                                    <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none rounded-full px-2">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 rounded-xl shadow-xl border-slate-100 overflow-hidden" align="end">
                            <div className="p-4 bg-slate-50 border-b border-slate-100">
                                <h4 className="font-semibold text-slate-900">Filter Dashboard</h4>
                                <p className="text-xs text-slate-500">Sesuaikan tampilan data Anda</p>
                            </div>
                            <div className="p-4 space-y-4 bg-white">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700">Departemen</label>
                                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                                        <SelectTrigger className="w-full rounded-lg bg-slate-50 border-slate-200 focus:ring-indigo-500">
                                            <SelectValue placeholder="Semua Departemen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Departemen</SelectItem>
                                            {uniqueDepts.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700">Posisi</label>
                                    <Select value={posFilter} onValueChange={setPosFilter}>
                                        <SelectTrigger className="w-full rounded-lg bg-slate-50 border-slate-200 focus:ring-indigo-500">
                                            <SelectValue placeholder="Semua Posisi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Posisi</SelectItem>
                                            {uniquePositions.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700">Status</label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full rounded-lg bg-slate-50 border-slate-200 focus:ring-indigo-500">
                                            <SelectValue placeholder="Semua Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Status</SelectItem>
                                            <SelectItem value="active">Aktif</SelectItem>
                                            <SelectItem value="inactive">Non-Aktif</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* KPI Cards - Glassmorphism Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Karyawan"
                    value={dashboardStats.total}
                    icon={Users}
                    trend="+12% bulan ini"
                    color="indigo"
                />
                <KPICard
                    title="Karyawan Aktif"
                    value={dashboardStats.active}
                    icon={UserCheck}
                    trend="Stable"
                    color="emerald"
                />
                <KPICard
                    title="Non-Aktif"
                    value={dashboardStats.inactive}
                    icon={UserX}
                    trend="Turnover rendah"
                    color="rose"
                />
                <KPICard
                    title="Unit Spare"
                    value={dashboardStats.spare}
                    icon={Activity}
                    trend="Origin Units"
                    color="purple"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column: Charts (2/3 width) */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Position Distribution Chart */}
                    <Card className="border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                        <CardHeader className="border-b border-slate-100/50 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-indigo-500" />
                                    Distribusi Jabatan
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="text-xs text-slate-400">View All</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={dashboardStats.positionData}
                                        layout="vertical"
                                        margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
                                        barSize={24}
                                    >
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} stroke="#e2e8f0" />
                                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={140}
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#475569', fontWeight: 500 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="url(#barGradient)">
                                            <Cell fill="url(#barGradient)" />
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={11} fontWeight={600} offset={8} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monitoring Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Department Distribution */}
                        <Card className="border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-emerald-500" /> Departemen
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dashboardStats.departmentData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                cornerRadius={5}
                                            >
                                                {dashboardStats.departmentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Investor Group */}
                        <Card className="border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-amber-500" /> Investor Group
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dashboardStats.investorData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {dashboardStats.investorData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} strokeWidth={1} stroke="#fff" />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detail Investor Group — All */}
                        <Card className="md:col-span-2 border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-amber-500" /> Detail Investor Group — Semua
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-1">
                                    {dashboardStats.noInvestorGroupCount > 0 && `${dashboardStats.noInvestorGroupCount} karyawan belum punya Investor Group`}
                                </p>
                            </CardHeader>
                            <CardContent>
                                {dashboardStats.investorDataDetail.length === 0 ? (
                                    <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
                                        Belum ada data Investor Group.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={Math.max(280, dashboardStats.investorDataDetail.length * 36)}>
                                        <BarChart data={dashboardStats.investorDataDetail} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]}>
                                                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detail Domisili — Top Kota/Kab */}
                        <Card className="md:col-span-2 border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-cyan-500" /> Detail Domisili — Top 10 Kota/Kabupaten
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-1">
                                    {dashboardStats.noKotaKabCount > 0 && `${dashboardStats.noKotaKabCount} karyawan belum mengisi Kota/Kab`}
                                </p>
                            </CardHeader>
                            <CardContent>
                                {dashboardStats.kotaKabData.length === 0 ? (
                                    <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
                                        Belum ada data Kota/Kab. Lengkapi field "Kota/Kab" di detail karyawan.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={Math.max(280, dashboardStats.kotaKabData.length * 32)}>
                                        <BarChart data={dashboardStats.kotaKabData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" fill="#06b6d4" radius={[0, 6, 6, 0]}>
                                                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detail Domisili — Per Provinsi */}
                        {dashboardStats.provinsiData.length > 0 && (
                            <Card className="md:col-span-2 border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-purple-500" /> Detail Domisili — Per Provinsi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={Math.max(220, dashboardStats.provinsiData.length * 36)}>
                                        <BarChart data={dashboardStats.provinsiData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" fill="#a855f7" radius={[0, 6, 6, 0]}>
                                                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Domicile Stats (NEW) */}
                        <Card className="md:col-span-2 border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-cyan-500" /> Domisili (Lokal vs Non-Lokal)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-[220px]">
                                    <div className="h-[200px] w-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={dashboardStats.domicileData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    cornerRadius={5}
                                                    startAngle={180}
                                                    endAngle={0}
                                                >
                                                    {dashboardStats.domicileData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-4 min-w-[200px]">
                                        {dashboardStats.domicileData.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-sm font-medium text-slate-600">{item.name}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-bold text-slate-900">{item.value}</span>
                                                    <span className="text-xs text-slate-400">
                                                        {((item.value / (dashboardStats.total || 1)) * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>

                {/* Right Column: Alerts & Lists (1/3 width) */}
                <div className="space-y-8">

                    {/* Document Alerts - Minimalist List */}
                    <Card className="border-none shadow-lg shadow-red-100/50 bg-white rounded-2xl overflow-hidden ring-1 ring-red-50">
                        <CardHeader className="bg-red-50/50 pb-4 border-b border-red-100/50">
                            <CardTitle className="text-lg font-bold text-red-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Perlu Perhatian
                                <Badge variant="secondary" className="ml-auto bg-red-100 text-red-700 hover:bg-red-200">
                                    {dashboardStats.expiringEmployees.length}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs text-red-600/80">
                                Dokumen expired, kritis, atau warning.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[350px]">
                                {dashboardStats.expiringEmployees.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {dashboardStats.expiringEmployees.map((item, idx) => (
                                            <div key={`${item.id}-${idx}`} className="p-4 hover:bg-red-50/30 transition-colors flex items-start gap-3 group cursor-pointer">
                                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${item.status === 'EXPIRED' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-amber-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-red-700 transition-colors">
                                                        {item.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                            {item.docType}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300">•</span>
                                                        <span className={`text-[10px] font-medium ${item.status === 'EXPIRED' ? 'text-red-600' : 'text-amber-600'}`}>
                                                            {item.daysLeft !== null ? (item.daysLeft < 0 ? `${Math.abs(item.daysLeft)} hari lalu` : `${item.daysLeft} hari lagi`) : 'Tanggal tidak valid'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        Tidak ada dokumen yang perlu perhatian.
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Status Summary - Compact Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        <StatusSummaryCard title="SIMPOL" icon={ShieldAlert} stats={dashboardStats.simpolStats} color="blue" />
                        <StatusSummaryCard title="SIMPER BIB" icon={Car} stats={dashboardStats.bibStats} color="amber" />
                        <StatusSummaryCard title="SIMPER TIA" icon={Car} stats={dashboardStats.tiaStats} color="emerald" />
                    </div>

                    {/* Recent Activity */}
                    <Card className="border-none shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-2xl">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-slate-500" /> Karyawan Terbaru
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {dashboardStats.recentEmployees.map((emp, i) => (
                                <div key={emp.id} className="flex items-center gap-3 p-3 border-b border-slate-50 last:border-none hover:bg-slate-50/80 transition-colors">
                                    <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                        <AvatarImage src={`https://avatar.vercel.sh/${emp.id}`} />
                                        <AvatarFallback className="bg-slate-100 text-slate-500 text-xs">{getInitials(emp.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{emp.name}</p>
                                        <p className="text-[10px] text-slate-400">{emp.position || "Staff"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                            {format(new Date(emp.createdAt || new Date()), 'dd/MM')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

// --- Helper Components ---

function KPICard({ title, value, icon: Icon, trend, color }: { title: string, value: number, icon: any, trend: string, color: string }) {
    const colorClasses: Record<string, string> = {
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
    };

    return (
        <Card className="border-none shadow-lg shadow-slate-200/50 bg-white/60 backdrop-blur-xl rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-white/90 group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl ${colorClasses[color]} mb-4 transition-transform group-hover:scale-110 duration-300`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-slate-500">{title}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{value.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-light flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusSummaryCard({ title, icon: Icon, stats, color }: { title: string, icon: any, stats: any, color: string }) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-500",
        amber: "text-amber-500",
        emerald: "text-emerald-500",
    };

    return (
        <Card className="border-none bg-white/40 shadow-sm backdrop-blur border border-white/60 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-white rounded-lg shadow-sm border border-slate-100 ${colorMap[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{title}</span>
            </div>
            <div className="flex items-center gap-1.5">
                {stats.expired > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-600 hover:bg-red-200 border-none font-bold text-[10px] h-5">
                        {stats.expired} Exp
                    </Badge>
                )}
                {stats.near_expired > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-600 hover:bg-yellow-200 border-none font-bold text-[10px] h-5">
                        {stats.near_expired} Near Exp
                    </Badge>
                )}
                <div className="pl-1 text-xs font-mono text-slate-400">
                    {stats.aktif} OK
                </div>
            </div>
        </Card>
    )
}
