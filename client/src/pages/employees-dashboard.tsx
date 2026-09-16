
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
// Tangga abu, bukan pelangi: irisan dibedakan oleh terang-gelap, bukan oleh
// warna yang seolah punya arti. Ikut mode gelap lewat token di index.css.
const COLORS = [
    'var(--grafik-1)', 'var(--grafik-2)', 'var(--grafik-3)', 'var(--grafik-4)',
    'var(--grafik-5)', 'var(--grafik-6)', 'var(--grafik-7)',
];

/** Bagian dari total, dibulatkan. Mengembalikan "–" bila total nol supaya
 * tidak memunculkan "NaN%" di layar. */
const persen = (n: number, total: number) =>
 total > 0 ? `${Math.round((n / total) * 100)}% dari total` : "–";

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
            { name: "Lokal", value: domicileStats.local, color: "var(--grafik-2)" },
            { name: "Non-Lokal", value: domicileStats.nonLocal, color: "var(--grafik-5)" },
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

        // Jumlah departemen dihitung dari himpunan yang tersaring, bukan dari
        // departmentData (yang hanya berisi 5 teratas + "Lainnya").
 const deptCount = new Set(
 filteredEmployees.map(e => (e.department || "").trim()).filter(Boolean)
        ).size;

 return { total, active, inactive, spare, deptCount, departmentData, investorData, investorDataDetail, noInvestorGroupCount, positionData, recentEmployees, simpolStats, bibStats, tiaStats, expiringEmployees, domicileData, kotaKabData, provinsiData, noKotaKabCount };
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
                <div className="h-12 w-12 rounded-full border-2 border-border border-t-foreground animate-spin"></div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Memuat</p>
            </div>
        </div>
    );

 return (
        <div className="p-6 md:p-8 space-y-8">

            {/* Header with Glassmorphism */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-foreground">
                        Dashboard Karyawan
                    </h1>
                    <p className="mt-1.5 text-[15px] text-muted-foreground">
                        Pusat kendali data operasional dan statistik karyawan.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                        <Button
 variant="ghost"
 size="sm"
 onClick={resetFilters}
 className="text-gray-600 hover:text-gray-900 hover:bg-muted transition-colors"
                        >
                            <X className="w-4 h-4 mr-2" /> Reset Filter
                        </Button>
                    )}
                    <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 rounded-lg px-4 text-[13px]">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                Filter
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 tabular-nums">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 rounded-xl border-border overflow-hidden" align="end">
                            <div className="p-4 bg-muted border-b border-border">
                                <h4 className="font-semibold text-foreground">Filter Dashboard</h4>
                                <p className="text-xs text-muted-foreground">Sesuaikan tampilan data Anda</p>
                            </div>
                            <div className="p-4 space-y-4 bg-white">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground">Departemen</label>
                                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                                        <SelectTrigger className="w-full rounded-lg bg-muted border-border focus:ring-indigo-500">
                                            <SelectValue placeholder="Semua Departemen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Departemen</SelectItem>
                                            {uniqueDepts.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground">Posisi</label>
                                    <Select value={posFilter} onValueChange={setPosFilter}>
                                        <SelectTrigger className="w-full rounded-lg bg-muted border-border focus:ring-indigo-500">
                                            <SelectValue placeholder="Semua Posisi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Posisi</SelectItem>
                                            {uniquePositions.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground">Status</label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full rounded-lg bg-muted border-border focus:ring-indigo-500">
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

            {/* Kartu KPI. Keterangan di bawah angka HARUS turunan dari data yang
 sama — dulu berisi "+12% bulan ini" dan "Turnover rendah" yang tidak
 dihitung dari apa pun, jadi kartu terlihat berwibawa tanpa dasar. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
 title="Total Karyawan"
 value={dashboardStats.total}
 icon={Users}
 trend={`${dashboardStats.deptCount} departemen`}
                />
                <KPICard
 title="Karyawan Aktif"
 value={dashboardStats.active}
 icon={UserCheck}
 trend={persen(dashboardStats.active, dashboardStats.total)}
                />
                <KPICard
 title="Non-Aktif"
 value={dashboardStats.inactive}
 icon={UserX}
 trend={persen(dashboardStats.inactive, dashboardStats.total)}
                />
                <KPICard
 title="Unit Spare"
 value={dashboardStats.spare}
 icon={Activity}
 trend="Unit cadangan"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column: Charts (2/3 width) */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Position Distribution Chart */}
                    <Card className="border border-border bg-card rounded-xl overflow-hidden">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                                    Distribusi Jabatan
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">View All</Button>
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
                                                <stop offset="0%" stopColor="var(--grafik-4)" stopOpacity={1} />
                                                <stop offset="100%" stopColor="var(--grafik-5)" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} stroke="var(--grafik-garis)" />
                                        <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'var(--grafik-label)' }} />
                                        <YAxis
 dataKey="name"
 type="category"
 width={140}
 fontSize={12}
 tickLine={false}
 axisLine={false}
 tick={{ fill: 'var(--grafik-label)' }}
                                        />
                                        <Tooltip
 cursor={{ fill: 'var(--grafik-garis)', opacity: 0.4 }}
 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="url(#barGradient)">
                                            <Cell fill="url(#barGradient)" />
                                            <LabelList dataKey="value" position="right" fill="var(--grafik-label)" fontSize={11} fontWeight={600} offset={8} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monitoring Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Department Distribution */}
                        <Card className="border border-border bg-card rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" /> Departemen
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
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8}
                                                wrapperStyle={{ fontSize: '11px' }}
                                                formatter={(value: string) => <span style={{ color: 'var(--grafik-tinta)' }}>{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Investor Group */}
                        <Card className="border border-border bg-card rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-muted-foreground" /> Investor Group
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
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} strokeWidth={1} stroke="hsl(var(--card))" />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8}
                                                wrapperStyle={{ fontSize: '11px' }}
                                                formatter={(value: string) => <span style={{ color: 'var(--grafik-tinta)' }}>{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detail Investor Group — All */}
                        <Card className="md:col-span-2 border border-border bg-card rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-muted-foreground" /> Detail Investor Group — Semua
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {dashboardStats.noInvestorGroupCount > 0 && `${dashboardStats.noInvestorGroupCount} karyawan belum punya Investor Group`}
                                </p>
                            </CardHeader>
                            <CardContent>
                                {dashboardStats.investorDataDetail.length === 0 ? (
                                    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                                        Belum ada data Investor Group.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={Math.max(280, dashboardStats.investorDataDetail.length * 36)}>
                                        <BarChart data={dashboardStats.investorDataDetail} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--grafik-garis)" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" fill="var(--grafik-4)" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detail Domisili — Top Kota/Kab */}
                        <Card className="md:col-span-2 border border-border bg-card rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" /> Detail Domisili — Top 10 Kota/Kabupaten
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {dashboardStats.noKotaKabCount > 0 && `${dashboardStats.noKotaKabCount} karyawan belum mengisi Kota/Kab`}
                                </p>
                            </CardHeader>
                            <CardContent>
                                {dashboardStats.kotaKabData.length === 0 ? (
                                    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                                        Belum ada data Kota/Kab. Lengkapi field "Kota/Kab" di detail karyawan.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={Math.max(280, dashboardStats.kotaKabData.length * 32)}>
                                        <BarChart data={dashboardStats.kotaKabData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--grafik-garis)" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" fill="var(--grafik-4)" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detail Domisili — Per Provinsi */}
                        {dashboardStats.provinsiData.length > 0 && (
                            <Card className="md:col-span-2 border border-border bg-card rounded-xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-muted-foreground" /> Detail Domisili — Per Provinsi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={Math.max(220, dashboardStats.provinsiData.length * 36)}>
                                        <BarChart data={dashboardStats.provinsiData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--grafik-garis)" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="value" fill="var(--grafik-4)" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Domicile Stats (NEW) */}
                        <Card className="md:col-span-2 border border-border bg-card rounded-xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" /> Domisili (Lokal vs Non-Lokal)
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
                                            <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-bold text-foreground">{item.value}</span>
                                                    <span className="text-xs text-muted-foreground">
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
                    <Card className="border border-red-200 bg-card rounded-xl overflow-hidden dark:border-red-900/40">
                        <CardHeader className="border-b border-border pb-4">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
                                Perlu Perhatian
                                <Badge variant="secondary" className="ml-auto tabular-nums">
                                    {dashboardStats.expiringEmployees.length}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Dokumen expired, kritis, atau warning.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[350px]">
                                {dashboardStats.expiringEmployees.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {dashboardStats.expiringEmployees.map((item, idx) => (
                                            <div key={`${item.id}-${idx}`} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-3 group cursor-pointer">
                                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${item.status === 'EXPIRED' ? 'bg-red-500' : 'bg-amber-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-gray-900 transition-colors">
                                                        {item.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                                            {item.docType}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">•</span>
                                                        <span className={`text-[10px] font-medium ${item.status === 'EXPIRED' ? 'text-red-600' : 'text-amber-600'}`}>
                                                            {item.daysLeft !== null ? (item.daysLeft < 0 ? `${Math.abs(item.daysLeft)} hari lalu` : `${item.daysLeft} hari lagi`) : 'Tanggal tidak valid'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
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
                    <Card className="border border-border bg-card rounded-xl">
                        <CardHeader className="pb-3 border-b border-border">
                            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-muted-foreground" /> Karyawan Terbaru
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {dashboardStats.recentEmployees.map((emp, i) => (
                                <div key={emp.id} className="flex items-center gap-3 p-3 border-b border-border last:border-none hover:bg-muted/80 transition-colors">
                                    <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                        <AvatarImage src={`https://avatar.vercel.sh/${emp.id}`} />
                                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">{getInitials(emp.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{emp.position || "Staff"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
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

function KPICard({ title, value, icon: Icon, trend }: { title: string, value: number, icon: any, trend: string }) {
 return (
        <Card className="rounded-xl border border-border bg-card transition-colors hover:border-gray-300 dark:hover:border-gray-700">
            <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.14em]">{title}</h3>
                </div>
                <p className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                    {value.toLocaleString("id-ID")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{trend}</p>
            </CardContent>
        </Card>
    );
}

function StatusSummaryCard({ title, icon: Icon, stats, color }: { title: string, icon: any, stats: any, color: string }) {
 const colorMap: Record<string, string> = {
 blue: "text-muted-foreground",
 amber: "text-muted-foreground",
 emerald: "text-muted-foreground",
    };

 return (
        <Card className="border border-border bg-card px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={colorMap[color]}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{title}</span>
            </div>
            <div className="flex items-center gap-1.5">
                {stats.expired > 0 && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none font-bold text-[10px] h-5">
                        {stats.expired} Exp
                    </Badge>
                )}
                {stats.near_expired > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-600 hover:bg-yellow-200 border-none font-bold text-[10px] h-5">
                        {stats.near_expired} Near Exp
                    </Badge>
                )}
                <div className="pl-1 text-xs font-mono text-muted-foreground">
                    {stats.aktif} OK
                </div>
            </div>
        </Card>
    )
}
