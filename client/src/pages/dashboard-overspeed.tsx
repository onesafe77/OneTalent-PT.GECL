import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    LabelList,
    PieChart,
    Pie,
    Legend,
} from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    RefreshCw,
    AlertCircle,
    Clock,
    User,
    Truck,
    BrainCircuit,
    Filter,
    TrendingUp,
    CheckCircle,
    Download,
    Sparkles,
    Link2,
    Settings,
    Loader2
} from "lucide-react";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

// --- Configuration ---
const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX9zYvZSIKyKXx-DfhyXZCdTMuqhPY_kXu_WxMWEZ-MHPR779_x_0NklR1VjDGN1e7aoloMaDf5jk9/pub?gid=1467622739&single=true&output=csv";
const COMPANY_FILTER_DEFAULT = "GEC";
const DASHBOARD_ID = "overspeed";

interface SheetConfig {
    id: string;
    name: string;
    spreadsheetId: string;
    sheetName: string;
    spreadsheetTitle?: string;
}

function getSheetConfig(): SheetConfig | null {
    try {
        const saved = localStorage.getItem("google-sheets-configs");
        if (!saved) return null;
        const configs: SheetConfig[] = JSON.parse(saved);
        return configs.find(c => c.id === DASHBOARD_ID) || null;
    } catch {
        return null;
    }
}

// --- Types ---
interface OverspeedData {
    No: string;
    Sumber: string;
    "Nama Eksekutor": string;
    "Nama Karyawan": string;
    Date: string; // "03/01/2026"
    Time: string; // "12:33:20"
    "Vehicle No": string;
    Company: string; // "GEC" or "BIB"
    Violation: string;
    "Location (KM)": string;
    "Date Opr": string;
    Jalur: string;
    Week: string;
    Month: string;
    Jalur2: string;
    Coordinat: string;
    TicketStatus?: string;
    ValidationStatus?: string;
    "Durasi Close"?: string;
    "Tanggal Pemenuhan": string;
    StatusClosedNC?: string; // New field
    Shift?: string; // New field
    Jabatan?: string; // New field from CSV
    Speed?: number; // New field
    SpeedLimit?: number; // New field
    // Helper fields for easier filtering
    _dateObj?: Date;
    _year?: number;
    _monthIndex?: number; // 0-11
}

// --- Utils ---
const parseDate = (dateStr: string) => {
    // Assuming format DD/MM/YYYY
    if (!dateStr) return new Date();
    const parts = dateStr.split("/");
    if (parts.length === 3) {
        return new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
        );
    }
    return new Date();
};

const getMonthName = (monthIndex: number) => {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return months[monthIndex];
};

export default function DashboardOverspeed() {
    // --- State ---
    const [rawData, setRawData] = useState<OverspeedData[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
    const [dataSource, setDataSource] = useState<"sheets" | "csv">("csv");

    // Filters
    const [filterYear, setFilterYear] = useState<string>("All");
    const [filterMonth, setFilterMonth] = useState<string>("All");
    const [filterUnit, setFilterUnit] = useState<string>("All");
    const [filterViolation, setFilterViolation] = useState<string>("All");

    // Unique options for filters
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [availableUnits, setAvailableUnits] = useState<string[]>([]);

    useEffect(() => {
        const config = getSheetConfig();
        setSheetConfig(config);
    }, []);

    const processRows = (rows: any[], headers: string[]) => {
        // Simple mapping if headers match, but we need to ensure numbers
        return rows.map(r => {
            const dStr = r["Date"] || r["Date Opr"] || "";
            const d = parseDate(dStr);

            // Parse Speed Numbers
            const speed = parseFloat(r["Speed (Kph)"] || r["Speed"] || "0");
            const limit = parseFloat(r["Speed Limit"] || r["SpeedLimit"] || "0");
            const shift = r["Shift"] || r["Shift "] || "Unknown"; // Handle "Shift " with space

            // Fix Mapping Status (Handle unexpected CSV headers)
            // CSV Header might be: "Status", "Status ", "Status Pelanggaran ", "Status Closed NC "
            const ticketStatus = r["Status"] || r["TicketStatus"] || "Open";
            const validationStatus = r["Status Pelanggaran "] || r["Status Pelanggaran"] || r["ValidationStatus"] || "";
            const statusClosedNC = r["Status Closed NC "] || r["Status Closed NC"] || r["StatusClosedNC"] || "";
            const durasiClose = r["Durasi Close"] || r["Durasi Close "] || "0";

            return {
                ...r,
                Shift: shift.trim(),
                Speed: isNaN(speed) ? 0 : speed,
                SpeedLimit: isNaN(limit) ? 0 : limit,
                _dateObj: d,
                _year: d.getFullYear() || 0,
                _monthIndex: d.getMonth() || 0,
                // Explicitly map these fields to ensure they are populated
                TicketStatus: ticketStatus,
                ValidationStatus: validationStatus,
                StatusClosedNC: statusClosedNC,
                "Durasi Close": durasiClose
            };
        }).filter(r => r.Company === COMPANY_FILTER_DEFAULT || !r.Company); // Default filter
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check for custom config first
            const config = getSheetConfig();
            let url = CSV_URL;

            if (config) {
                // If custom config exists, use our server proxy
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Gagal mengambil data CSV");
            const text = await res.text();

            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = processRows(results.data as any[], results.meta.fields || []);
                    setRawData(rows as OverspeedData[]);
                    setLastUpdated(new Date());

                    // Extract available filters
                    const years = Array.from(new Set(rows.map(r => r._year).filter(Boolean))).sort().reverse() as number[];
                    setAvailableYears(years);

                    const units = Array.from(new Set(rows.map(r => r["Vehicle No"]).filter(Boolean))).sort();
                    setAvailableUnits(units);
                },
                error: (err: any) => {
                    setError(`Parse Error: ${err.message}`);
                }
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Aggregation ---
    const filteredData = useMemo(() => {
        if (!rawData) return [];
        return rawData.filter((r: any) => {
            const yearStr = (r?._year || "").toString();
            const monthStr = (r?._monthIndex || "").toString();

            const matchYear = filterYear === "All" || yearStr === filterYear;
            const matchMonth = filterMonth === "All" || monthStr === filterMonth;
            const matchUnit = filterUnit === "All" || r?.["Vehicle No"] === filterUnit;
            const matchVio = filterViolation === "All" ||
                (filterViolation === "OverSpeed" && r?.Violation?.toLowerCase().includes("overspeed")) ||
                (filterViolation === "Merokok" && r?.Violation?.toLowerCase().includes("merokok"));

            return matchYear && matchMonth && matchUnit && matchVio;
        });
    }, [rawData, filterYear, filterMonth, filterUnit, filterViolation]);

    const stats = useMemo(() => {
        if (!filteredData.length) return null;

        // 1. Month Data
        const monthCounts = Array(12).fill(0);
        filteredData.forEach(r => {
            if (r._monthIndex !== undefined) monthCounts[r._monthIndex]++;
        });
        const monthData = monthCounts.map((count, i) => ({
            name: getMonthName(i),
            count
        }));

        // 2. Week Data
        const weekCounts: Record<string, number> = {};
        filteredData.forEach(r => {
            const w = r.Week ? `Minggu ${r.Week}` : "Unknown";
            weekCounts[w] = (weekCounts[w] || 0) + 1;
        });
        const weekData = Object.entries(weekCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => parseInt(a.name.replace(/\D/g, '')) - parseInt(b.name.replace(/\D/g, '')));

        // 3. Hour Data
        const hourCounts = Array(24).fill(0);
        filteredData.forEach(r => {
            if (r.Time) {
                const h = parseInt(r.Time.split(":")[0]);
                if (!isNaN(h)) hourCounts[h]++;
            }
        });
        const hourData = hourCounts.map((count, i) => ({ name: i.toString(), count }));

        // 4. Employees & Units Aggregation
        const empInfo: Record<string, { count: number, unit: string, role: string }> = {};
        const unitCounts: Record<string, number> = {};
        const locationCounts: Record<string, number> = {};
        const shiftCounts: Record<string, number> = {};
        const speedData: any[] = [];

        // 5. Status & Duration Metrics
        let openCount = 0;
        let closedCount = 0;
        let validCount = 0;
        let invalidCount = 0;
        let totalDuration = 0;
        let durationCount = 0;
        let violationMerokok = 0;
        let violationOverspeed = 0;
        let closedOntime = 0;
        let closedOverdue = 0;
        let waitingCount = 0;

        filteredData.forEach((row, i) => {
            // Employee
            const name = (row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase();
            // Filter out BIB and #N/A
            if (name && name !== "BIB" && name !== "#N/A") {
                if (!empInfo[name]) {
                    empInfo[name] = { count: 0, unit: row["Vehicle No"] || "-", role: row["Jabatan"] || "-" };
                }
                empInfo[name].count++;
                // Keep latest unit/role
                if (row["Vehicle No"]) empInfo[name].unit = row["Vehicle No"];
                if (row["Jabatan"]) empInfo[name].role = row["Jabatan"];
            }

            // Unit
            const unit = row["Vehicle No"] || "Unknown";
            if (unit) unitCounts[unit] = (unitCounts[unit] || 0) + 1;

            // Location
            const loc = row["Location (KM)"] || "Unknown";
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;

            // Shift
            let shift = row.Shift || "Unknown";
            if (shift.includes("1")) shift = "Shift 1";
            else if (shift.includes("2")) shift = "Shift 2";
            shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;

            // Speed Data
            if (row.Speed && row.Speed > 0) {
                speedData.push({
                    name: unit,
                    Speed: row.Speed,
                    Limit: row.SpeedLimit || 60,
                    Deviasi: (row.Speed || 0) - (row.SpeedLimit || 0)
                });
            }

            // Ticket Status
            const ticketStatus = row.TicketStatus?.trim().toLowerCase();
            if (ticketStatus === 'open') openCount++;
            else if (ticketStatus === 'closed') closedCount++;
            else if (ticketStatus && (ticketStatus.includes('menunggu') || ticketStatus.includes('verifikasi'))) waitingCount++;

            // Validation Status
            const valStatus = row.ValidationStatus?.trim().toLowerCase();
            if (valStatus === 'valid') validCount++;
            else if (valStatus && valStatus.includes('invalid')) invalidCount++;

            // Duration
            const dur = parseInt(row["Durasi Close"] || "0");
            if (!isNaN(dur) && dur > 0) {
                totalDuration += dur;
                durationCount++;
            }

            // Violation Breakdown
            const v = row.Violation?.toLowerCase() || "";
            if (v.includes("merokok")) violationMerokok++;
            else if (v.includes("overspeed")) violationOverspeed++;

            // Status Closed NC Breakdown
            const sc = row.StatusClosedNC?.toLowerCase() || "";
            if (sc.includes("ontime")) closedOntime++;
            else if (sc.includes("overdue")) closedOverdue++;
        });

        const avgDuration = durationCount > 0 ? (totalDuration / durationCount).toFixed(1) : "0";

        const topEmployees = Object.entries(empInfo)
            .map(([name, data]) => ({ name, count: data.count, unit: data.unit, role: data.role }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const topLocations = Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const topUnits = Object.entries(unitCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const shiftData = Object.entries(shiftCounts)
            .map(([name, value]) => ({ name, value }));

        // Sort speed data by deviation
        speedData.sort((a, b) => b.Deviasi - a.Deviasi).splice(50); // Keep top 50 detailed

        return {
            monthData, weekData, hourData, topEmployees, topUnits,
            openCount, closedCount, validCount, invalidCount, avgDuration,
            violationMerokok, violationOverspeed,
            closedOntime, closedOverdue, waitingCount,
            topLocations, shiftData, speedData // New fields
        };
    }, [filteredData]);

    // --- AI Analysis Logic ---
    // --- AI Analysis Logic ---
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (!stats) return;

        const analyze = async () => {
            setIsAnalyzing(true);
            try {
                const res = await fetch("/api/ai/analyze-overspeed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stats })
                });
                const data = await res.json();
                if (data.insights) setAiInsights(data.insights);
            } catch (e) {
                console.error("AI Analysis failed", e);
                setAiInsights([
                    `Karyawan dengan pelanggaran terbanyak: ${stats.topEmployees[0]?.name || '-'}`,
                    `Unit paling sering melanggar: ${stats.topUnits[0]?.name || '-'}`
                ]);
            } finally {
                setIsAnalyzing(false);
            }
        };

        // Debounce / Check if already analyzed to avoid spam
        analyze();
    }, [stats]);

    const handleExport = async () => {
        const element = document.getElementById("dashboard-content");
        if (element) {
            const canvas = await html2canvas(element);
            canvas.toBlob((blob) => {
                if (blob) saveAs(blob, "dashboard-overspeed.jpg");
            });
        }
    };

    if (loading && !rawData.length) {
        return (
            <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                <RefreshCw className="h-10 w-10 animate-spin text-green-600" />
                <p className="text-gray-500 font-medium">Mengambil Data Pelanggaran...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-bold">Terjadi Kesalahan</h3>
                <p>{error}</p>
                <Button onClick={fetchData} className="mt-4" variant="outline">Coba Lagi</Button>
            </div>
        );
    }

    console.log("Dashboard Rendering", { stats, filteredData });

    return (
        <div id="dashboard-content" className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6 font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent pointer-events-none -z-10 blur-3xl" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 sticky top-0 z-50">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                        Overspeed Monitor
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 px-3 py-1">
                            Live Data
                        </Badge>
                        <p className="text-gray-500 text-sm font-medium">
                            Total {rawData.length} records • Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Glassy Filters */}
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-xl border border-gray-200/50 shadow-sm">
                        <Filter className="w-4 h-4 text-gray-400 ml-2" />
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger className="border-none bg-transparent h-9 w-[90px] text-xs font-bold focus:ring-0 text-gray-700">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Year</SelectItem>
                                {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger className="border-none bg-transparent h-9 w-[110px] text-xs font-bold focus:ring-0 text-gray-700">
                                <SelectValue placeholder="Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Month</SelectItem>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>{getMonthName(i)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-xl border border-gray-200/50 shadow-sm">
                        <Select value={filterUnit} onValueChange={setFilterUnit}>
                            <SelectTrigger className="border-none bg-transparent h-9 w-[120px] text-xs font-bold focus:ring-0 text-gray-700">
                                <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Units</SelectItem>
                                {availableUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <Select value={filterViolation} onValueChange={setFilterViolation}>
                            <SelectTrigger className="border-none bg-transparent h-9 w-[120px] text-xs font-bold focus:ring-0 text-gray-700">
                                <SelectValue placeholder="Violation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Type</SelectItem>
                                <SelectItem value="OverSpeed">⚡ OverSpeed</SelectItem>
                                <SelectItem value="Merokok">🚬 Merokok</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" size="icon" onClick={fetchData} className="rounded-xl border-gray-200 hover:bg-gray-100 hover:text-red-600 transition-colors">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="default" onClick={handleExport} className="rounded-xl bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/20">
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        title: "TOTAL VIOLATIONS",
                        value: filteredData.length,
                        icon: AlertCircle,
                        color: "red",
                        subtext: `${stats?.violationOverspeed || 0} Overspeed`
                    },
                    {
                        title: "AVERAGE DURATION",
                        value: `${stats?.avgDuration || 0}`,
                        unit: "Days",
                        icon: Clock,
                        color: "blue",
                        subtext: "Case Closing Time"
                    },
                    {
                        title: "CLOSED ONTIME",
                        value: stats?.closedOntime || 0,
                        icon: CheckCircle,
                        color: "emerald",
                        subtext: `${stats?.closedOverdue || 0} Overdue`
                    },
                    {
                        title: "VALIDATION RATE",
                        value: `${stats?.validCount || 0}`,
                        unit: "Valid",
                        icon: Sparkles,
                        color: "purple",
                        subtext: `${stats?.invalidCount || 0} Invalid`
                    }
                ].map((metric, i) => (
                    <Card key={i} className="border-none shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300 bg-white">
                        <div className={`absolute top-0 left-0 w-1 h-full bg-${metric.color}-500`} />
                        <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${metric.color}-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        <CardContent className="p-6 relative z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{metric.title}</p>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className={`text-4xl font-black text-${metric.color}-600 tracking-tight`}>
                                            {metric.value}
                                        </span>
                                        {metric.unit && <span className="text-sm font-bold text-gray-400">{metric.unit}</span>}
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <Badge variant="secondary" className={`bg-${metric.color}-50 text-${metric.color}-700 border-${metric.color}-100 font-bold`}>
                                            {metric.subtext}
                                        </Badge>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-2xl bg-${metric.color}-50 text-${metric.color}-600 shadow-sm group-hover:scale-110 transition-transform`}>
                                    <metric.icon className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Charts Column (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Monthly Trend */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100/50">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-800">Monthly Trends</CardTitle>
                                <CardDescription>Violation frequency over time</CardDescription>
                            </div>
                            <TrendingUp className="w-5 h-5 text-gray-400" />
                        </CardHeader>
                        <CardContent className="h-[350px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.monthData}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="count" position="top" fill="#ef4444" fontSize={12} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Secondary Charts Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Weekly Analysis */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Weekly Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.weekData}>
                                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" hide />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 4, 4]}>
                                            <LabelList dataKey="count" position="top" fill="#3b82f6" fontSize={11} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Hourly Heatmap Equivalent */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Peak Hours</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.hourData}>
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]}>
                                            <LabelList dataKey="count" position="top" fill="#f59e0b" fontSize={10} formatter={(v: number) => v > 0 ? v : ''} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gap Analysis & Status Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gap Analysis - Ontime vs Overdue */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-0 border-b border-gray-100/50 mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-gray-800">Gap Analysis</CardTitle>
                                        <CardDescription>Penyelesaian Ontime vs Overdue</CardDescription>
                                    </div>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'On Time', value: stats?.closedOntime || 0, fill: '#10b981' },
                                                { name: 'Overdue', value: stats?.closedOverdue || 0, fill: '#ef4444' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            <Cell key="cell-ontime" fill="#10b981" strokeWidth={0} />
                                            <Cell key="cell-overdue" fill="#ef4444" strokeWidth={0} />
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => [value, 'Kasus']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Status Breakdown Bar Chart */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-0 border-b border-gray-100/50 mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-gray-800">Status Breakdown</CardTitle>
                                        <CardDescription>Distribusi Status Tiket & Kualifikasi</CardDescription>
                                    </div>
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <Filter className="w-5 h-5" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'TOTAL', value: filteredData.length, fill: '#6b7280' },
                                            { name: 'CLOSED', value: stats?.closedCount || 0, fill: '#10b981' },
                                            { name: 'VERIF', value: stats?.waitingCount || 0, fill: '#8b5cf6' },
                                            { name: 'OPEN', value: stats?.openCount || 0, fill: '#f59e0b' },
                                            { name: 'ONTIME', value: stats?.closedOntime || 0, fill: '#059669' },
                                            { name: 'OVERDUE', value: stats?.closedOverdue || 0, fill: '#ef4444' },
                                        ]}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                            <LabelList dataKey="value" position="right" fill="#64748b" fontSize={11} fontWeight="bold" />
                                            {
                                                [
                                                    { name: 'TOTAL', fill: '#6b7280' },
                                                    { name: 'CLOSED', fill: '#10b981' },
                                                    { name: 'VERIF', fill: '#8b5cf6' },
                                                    { name: 'OPEN', fill: '#f59e0b' },
                                                    { name: 'ONTIME', fill: '#059669' },
                                                    { name: 'OVERDUE', fill: '#ef4444' },
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* NEW CHARTS: Top Location & Top Vehicle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top 10 Locations */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Top 10 Locations</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats?.topLocations}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20}>
                                            <LabelList dataKey="count" position="right" fill="#ec4899" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Top 10 Vehicle No */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Top 10 Vehicles</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats?.topUnits.map(u => ({ name: u.name, count: u.count }))}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20}>
                                            <LabelList dataKey="count" position="right" fill="#f97316" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* NEW CHARTS: Shift & Speed */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Shift Comparison */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Shift Comparison</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats?.shiftData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {stats?.shiftData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.name.includes('1') ? '#3b82f6' : '#a855f7'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Speed vs Limit */}
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Speed vs Speed Limit</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.speedData} margin={{ top: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" hide />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-2 border rounded shadow-md text-xs">
                                                            <p className="font-bold">{d.name}</p>
                                                            <p className="text-red-500">Speed: {d.Speed} km/h</p>
                                                            <p className="text-gray-500">Limit: {d.Limit} km/h</p>
                                                            <p className="text-blue-500">Deviasi: {d.Deviasi} km/h</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="Speed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Actual Speed" />
                                        <Bar dataKey="Limit" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Speed Limit" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">
                    {/* Insights Panel */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10" />
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                <CardTitle className="text-lg font-bold text-gray-800">AI Insights</CardTitle>
                            </div>
                            <CardDescription>Automated analysis of violation patterns</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isAnalyzing ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[90%]" />
                                    <Skeleton className="h-4 w-[80%]" />
                                </div>
                            ) : (
                                aiInsights.length > 0 ? (
                                    <ul className="space-y-3">
                                        {aiInsights.map((text, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-gray-600 bg-white/50 p-3 rounded-xl border border-gray-100">
                                                <div className="min-w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        No sufficient data for AI analysis
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Employees */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                        <CardHeader className="pb-2 border-b border-gray-100/50">
                            <CardTitle className="text-sm font-bold text-gray-500 uppercase tracking-wider">Highest Violators</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {stats?.topEmployees.map((emp, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50 transition-colors group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-red-700 transition-colors">{emp.name}</p>
                                            <p className="text-xs text-gray-400">{emp.unit} • {emp.role}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-white group-hover:bg-red-200 text-gray-600 group-hover:text-red-800 transition-colors">
                                        {emp.count} Cases
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-2xl border border-orange-100/50">
                            <p className="text-xs font-bold text-orange-400 uppercase mb-1">Cigarette Violations</p>
                            <p className="text-2xl font-black text-orange-600">{stats?.violationMerokok || 0}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-2xl border border-red-100/50">
                            <p className="text-xs font-bold text-red-400 uppercase mb-1">Overspeed</p>
                            <p className="text-2xl font-black text-red-600">{stats?.violationOverspeed || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
