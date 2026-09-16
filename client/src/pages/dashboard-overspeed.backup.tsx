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
    RotateCcw,
    CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- Configuration ---
const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX9zYvZSIKyKXx-DfhyXZCdTMuqhPY_kXu_WxMWEZ-MHPR779_x_0NklR1VjDGN1e7aoloMaDf5jk9/pub?gid=1467622739&single=true&output=csv";
const COMPANY_FILTER_DEFAULT = "GEC";

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
    const [filteredData, setFilteredData] = useState<OverspeedData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Filters
    const [filterYear, setFilterYear] = useState<string>("All");
    const [filterMonth, setFilterMonth] = useState<string>("All");
    const [filterUnit, setFilterUnit] = useState<string>("All");

    // Unique options for filters
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [availableUnits, setAvailableUnits] = useState<string[]>([]);

    // --- Fetch Data ---
    const fetchData = () => {
        setLoading(true);
        setError(null);

        Papa.parse(CSV_URL, {
            download: true,
            header: false, // OFF: Manual parsing for robust duplicate header handling
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    const rows = results.data as string[][];
                    const headers = rows[0];
                    // Normalize headers: trim whitespace
                    const headersTrimmed = headers.map(h => h ? h.trim() : "");

                    // Find Indices
                    const iNo = headersTrimmed.indexOf("No");
                    const iSumber = headersTrimmed.indexOf("Sumber");
                    const iEksekutor = headersTrimmed.indexOf("Nama Eksekutor");
                    const iKaryawan = headersTrimmed.indexOf("Nama Karyawan");
                    const iDate = headersTrimmed.indexOf("Date");
                    const iTime = headersTrimmed.indexOf("Time");
                    const iVehicle = headersTrimmed.indexOf("Vehicle No");
                    const iCompany = headersTrimmed.indexOf("Company");
                    const iViolation = headersTrimmed.indexOf("Violation");
                    const iLocation = headersTrimmed.indexOf("Location (KM)");
                    const iDurasi = headersTrimmed.indexOf("Durasi Close");
                    const iPemenuhan = headersTrimmed.indexOf("Tanggal Pemenuhan");
                    const iWeek = headersTrimmed.indexOf("Week");
                    const iMonth = headersTrimmed.indexOf("Month");



                    // Status Columns
                    // 1. Ticket Status (Looking for "Status")
                    const iTicketStatus = headersTrimmed.indexOf("Status");

                    // 2. Validation Status (Looking for "Status Pelanggaran" or second "Status")
                    let iValidationStatus = headersTrimmed.indexOf("Status Pelanggaran");
                    if (iValidationStatus === -1) {
                        // Fallback to searching for second Status
                        iValidationStatus = headersTrimmed.lastIndexOf("Status");
                        if (iValidationStatus === iTicketStatus) iValidationStatus = -1;
                    }

                    const processedData = rows.slice(1)
                        .filter(r => r[iCompany]?.trim().toUpperCase() === COMPANY_FILTER_DEFAULT)
                        .map(r => {
                            const d = parseDate(r[iDate]);
                            return {
                                No: r[iNo],
                                Sumber: r[iSumber],
                                "Nama Eksekutor": r[iEksekutor],
                                "Nama Karyawan": r[iKaryawan],
                                Date: r[iDate],
                                Time: r[iTime],
                                "Vehicle No": r[iVehicle],
                                Company: r[iCompany],
                                Violation: r[iViolation],
                                "Location (KM)": r[iLocation],
                                "Date Opr": "",
                                Jalur: "",
                                Week: r[iWeek],
                                Month: r[iMonth],
                                Jalur2: "",
                                Coordinat: "",
                                TicketStatus: r[iTicketStatus],
                                ValidationStatus: iValidationStatus !== -1 ? r[iValidationStatus] : "",
                                "Durasi Close": r[iDurasi],
                                "Tanggal Pemenuhan": r[iPemenuhan],
                                // Helpers
                                _dateObj: d,
                                _year: d.getFullYear(),
                                _monthIndex: d.getMonth()
                            } as OverspeedData;
                        });

                    setRawData(processedData);
                    setFilteredData(processedData);
                    setLastUpdated(new Date());

                    // Extract filter options
                    const years = Array.from(new Set(processedData.map(d => d._year!))).sort().reverse();
                    const units = Array.from(new Set(processedData.map(d => d["Vehicle No"]))).sort();
                    setAvailableYears(years);
                    setAvailableUnits(units);

                } else {
                    setError("Tidak ada data ditemukan.");
                }
                setLoading(false);
            },
            error: (err) => {
                console.error("CSV Parse Error:", err);
                setError("Gagal mengambil data dari Google Sheet.");
                setLoading(false);
            },
        });
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    // --- Apply Filters ---
    const applyFilters = () => {
        let res = [...rawData];

        if (filterYear !== "All") {
            res = res.filter(row => row._year === parseInt(filterYear));
        }

        if (filterMonth !== "All") {
            res = res.filter(row => row._monthIndex === parseInt(filterMonth));
        }

        if (filterUnit !== "All") {
            res = res.filter(row => row["Vehicle No"] === filterUnit);
        }

        setFilteredData(res);
    };

    // Auto-apply when logic changes
    useEffect(() => {
        applyFilters();
    }, [filterYear, filterMonth, filterUnit, rawData]);

    const resetFilters = () => {
        setFilterYear("All");
        setFilterMonth("All");
        setFilterUnit("All");
    };

    // --- Data Aggregation (Memoized on filteredData) ---
    const stats = useMemo(() => {
        if (filteredData.length === 0) return null;

        // 1. Trend Per Month
        const monthCounts: Record<string, number> = {};
        for (let i = 0; i < 12; i++) monthCounts[getMonthName(i)] = 0;

        filteredData.forEach(row => {
            const m = getMonthName(row._monthIndex!);
            if (monthCounts[m] !== undefined) monthCounts[m]++;
        });
        const monthData = Object.keys(monthCounts).map(name => ({ name, count: monthCounts[name] }));

        // 2. Trend Per Week
        const weekCounts: Record<string, number> = {};
        filteredData.forEach(row => {
            const w = row.Week ? `Minggu ${row.Week}` : "Unknown";
            weekCounts[w] = (weekCounts[w] || 0) + 1;
        });
        const weekData = Object.keys(weekCounts)
            .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')))
            .map(name => ({ name, count: weekCounts[name] }));

        // 3. Trend Per Day (unused but kept for future)
        const dayCounts: Record<string, number> = {};
        filteredData.forEach(row => {
            const date = row.Date;
            dayCounts[date] = (dayCounts[date] || 0) + 1;
        });

        // 4. Trend Per Hour
        const hourCounts: Record<string, number> = {};
        for (let i = 0; i < 24; i++) hourCounts[i] = 0;
        filteredData.forEach(row => {
            if (row.Time) {
                const hour = parseInt(row.Time.split(":")[0]);
                if (!isNaN(hour)) hourCounts[hour]++;
            }
        });
        const hourData = Object.keys(hourCounts).map(h => ({ name: h, count: hourCounts[parseInt(h)] }));

        // 5. Top Employees (Using Nama Karyawan)
        const empCounts: Record<string, number> = {};
        filteredData.forEach(row => {
            const name = (row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase();
            if (name && name !== "BIB") empCounts[name] = (empCounts[name] || 0) + 1;
        });
        const topEmployees = Object.keys(empCounts)
            .map(name => ({ name, count: empCounts[name], unit: filteredData.find(r => (r["Nama Karyawan"] || r["Nama Eksekutor"])?.toUpperCase() === name)?.["Vehicle No"] || "-" }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 6. Top Units
        const unitCounts: Record<string, number> = {};
        filteredData.forEach(row => {
            const unit = row["Vehicle No"];
            if (unit) unitCounts[unit] = (unitCounts[unit] || 0) + 1;
        });
        const topUnits = Object.keys(unitCounts)
            .map(name => ({ name, count: unitCounts[name] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 7. Status & Duration Metrics
        let openCount = 0;
        let closedCount = 0;
        let validCount = 0;
        let invalidCount = 0;
        let totalDuration = 0;
        let durationCount = 0;

        filteredData.forEach(row => {
            // Ticket Status (from 'Status' col)
            const ticketStatus = row.TicketStatus?.trim().toLowerCase();
            if (ticketStatus === 'open') openCount++;
            else if (ticketStatus === 'closed') closedCount++;

            // Validation Status (from 'Status Pelanggaran' or second 'Status')
            const valStatus = row.ValidationStatus?.trim().toLowerCase();
            if (valStatus === 'valid') validCount++;
            else if (valStatus && valStatus.includes('invalid')) invalidCount++;

            // Duration (from 'Durasi Close')
            const dur = parseInt(row["Durasi Close"] || "0");
            if (!isNaN(dur) && dur > 0) {
                totalDuration += dur;
                durationCount++;
            }
        });
        const avgDuration = durationCount > 0 ? (totalDuration / durationCount).toFixed(1) : "0";

        return { monthData, weekData, hourData, topEmployees, topUnits, openCount, closedCount, validCount, invalidCount, avgDuration };
    }, [filteredData]);

    // --- AI Analysis Logic ---
    const aiAnalysis = useMemo(() => {
        if (!stats || filteredData.length === 0) return [];

        const topEmp = stats.topEmployees[0];
        const topUnit = stats.topUnits[0];
        const busyHour = stats.hourData.reduce((prev, curr) => (prev.count > curr.count) ? prev : curr);

        let insights = [];

        if (topEmp) {
            insights.push(`Karyawan dengan pelanggaran terbanyak di periode ini adalah **${topEmp.name}** (${topEmp.count} kasus).`);
        }
        if (topUnit) {
            insights.push(`Unit **${topUnit.name}** menjadi unit paling sering melanggar (${topUnit.count} kali).`);
        }
        if (busyHour && busyHour.count > 0) {
            insights.push(`Jam paling rawan pelanggaran terpantau pukul **${busyHour.name}:00**.`);
        }

        return insights;
    }, [stats, filteredData]);

    if (loading && !rawData.length) {
        return (
            <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                <RefreshCw className="h-10 w-10 animate-spin text-foreground" />
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

    return (
        <div className="min-h-screen bg-gray-50/30 p-4 md:p-6 space-y-6 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        Overspeed Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Total {rawData.length} data (GEC Only) fetched from Spreadsheet
                    </p>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto p-1 bg-gray-50 rounded-lg">
                    <div className="flex items-center px-2 text-gray-400 text-sm font-medium">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters:
                    </div>

                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-[100px] bg-white border-gray-200">
                            <SelectValue placeholder="Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Year</SelectItem>
                            {availableYears.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="w-[120px] bg-white border-gray-200">
                            <SelectValue placeholder="Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">Semua Bulan</SelectItem>
                            {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>{getMonthName(i)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterUnit} onValueChange={setFilterUnit}>
                        <SelectTrigger className="w-[130px] bg-white border-gray-200">
                            <SelectValue placeholder="Unit No" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">Semua Unit</SelectItem>
                            {availableUnits.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filter">
                        <RotateCcw className="w-4 h-4 text-red-500" />
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Metric */}
                <Card className="border-none shadow-sm relative overflow-hidden bg-white border-l-4 border-l-red-600">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL PELANGGARAN</p>
                                <div className="text-4xl font-extrabold text-red-600">
                                    {filteredData.length}
                                </div>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Status Breakdown */}
                <Card className="border-none shadow-sm relative overflow-hidden bg-white border-l-4 border-l-primary">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">STATUS CASE</p>
                            <div className="p-2 bg-muted rounded-lg">
                                <CheckCircle className="w-5 h-5 text-foreground" />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <div>
                                <span className="text-2xl font-bold text-foreground">{stats?.closedCount || 0}</span>
                                <span className="text-xs text-gray-400 ml-1">Closed</span>
                            </div>
                            <div className="h-4 w-px bg-gray-200"></div>
                            <div>
                                <span className="text-2xl font-bold text-orange-500">{stats?.openCount || 0}</span>
                                <span className="text-xs text-gray-400 ml-1">Open</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Duration */}
                <Card className="border-none shadow-sm relative overflow-hidden bg-white border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">RATA-RATA DURASI</p>
                                <div className="text-3xl font-extrabold text-blue-600">
                                    {stats?.avgDuration || 0}<span className="text-sm font-medium text-gray-400 ml-1">Hari</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Waktu penyelesaian case</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Validation Status */}
                <Card className="border-none shadow-sm relative overflow-hidden bg-white border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">VALIDASI</p>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <div>
                                <span className="text-2xl font-bold text-purple-600">{stats?.validCount || 0}</span>
                                <span className="text-xs text-gray-400 ml-1">Valid</span>
                            </div>
                            <div className="h-4 w-px bg-gray-200"></div>
                            <div>
                                <span className="text-2xl font-bold text-red-500">{stats?.invalidCount || 0}</span>
                                <span className="text-xs text-gray-400 ml-1">Invalid</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid: Charts (Left) & Sidebar (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Column: Charts (Span 2) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Main Monthly Trend */}
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-gray-900">Tren Pelanggaran (Bulanan)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[320px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.monthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                    <Bar dataKey="count" fill="#df2a33" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        <LabelList dataKey="count" position="top" fill="#df2a33" fontSize={12} formatter={(val: number) => val > 0 ? val : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Secondary Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Weekly Trend */}
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-gray-500 uppercase">MINGGUAN</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.weekData} margin={{ top: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#df2a33" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="count" position="top" fill="#df2a33" fontSize={11} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Hourly Trend */}
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader>
                                <CardTitle className="text-xs font-bold text-gray-500 uppercase">JAM RAWAN</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.hourData} margin={{ top: 20 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" fill="#df2a33" radius={[2, 2, 0, 0]}>
                                            <LabelList dataKey="count" position="top" fill="#df2a33" fontSize={10} formatter={(val: number) => val > 0 ? val : ''} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Unit Distribution (Wide) */}
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold text-gray-500 uppercase">UNIT DISTRIBUTION (TOP 10)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.topUnits} layout="vertical" margin={{ top: 0, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#757575" radius={[0, 4, 4, 0]} barSize={15}>
                                        <LabelList dataKey="count" position="right" fill="#757575" fontSize={11} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: AI Analysis & Lists (Span 1) */}
                <div className="space-y-6">

                    {/* AI Analysis - Vertical Card */}
                    <Card className="bg-gray-900 text-white border-none shadow-custom overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <BrainCircuit className="w-32 h-32" />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-purple-400" />
                                <CardTitle className="text-base">AI Analysis</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(aiAnalysis || []).length > 0 ? (aiAnalysis || []).map((text, i) => (
                                <div key={i} className="bg-white/10 p-3 rounded-lg border border-white/5 text-sm leading-relaxed relative z-10">
                                    <div className="absolute -left-1 top-3 w-1 h-6 bg-purple-500 rounded-r-lg"></div>
                                    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<span class="text-yellow-300 font-bold">$1</span>') }} />
                                </div>
                            )) : (
                                <p className="text-gray-500 italic text-sm">Data tidak cukup.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Employees List */}
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-gray-900">Top 5 Pelanggar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats?.topEmployees.length ? stats.topEmployees.map((emp, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-gray-100 hover:bg-red-50/50 rounded-xl transition-colors group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {i + 1}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold text-gray-800 truncate" title={emp.name}>{emp.name}</p>
                                                <p className="text-xs text-gray-400">{emp.unit}</p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-red-100 text-red-700 font-bold flex-shrink-0">
                                            {emp.count}
                                        </Badge>
                                    </div>
                                )) : <div className="text-center text-gray-400 py-10">Tidak ada data</div>}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            <div className="text-center text-xs text-gray-300 pb-8">
                Dashboard Version 2.1 • Data updated at {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
            </div>
        </div>
    );
}
