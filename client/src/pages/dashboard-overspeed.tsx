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

    const processRows = (rows: string[][], headers: string[]) => {
        const headersTrimmed = headers.map(h => h ? h.trim() : "");
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
        const iStatusClosedNC = headersTrimmed.indexOf("Status Closed NC"); // Need exact match
        const iWeek = headersTrimmed.indexOf("Week");
        const iMonth = headersTrimmed.indexOf("Month");
        const iTicketStatus = headersTrimmed.indexOf("Status");
        let iValidationStatus = headersTrimmed.indexOf("Status Pelanggaran");
        if (iValidationStatus === -1) {
            iValidationStatus = headersTrimmed.lastIndexOf("Status");
            if (iValidationStatus === iTicketStatus) iValidationStatus = -1;
        }

        return rows
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
                    ValidationStatus: r[iValidationStatus],
                    "Durasi Close": r[iDurasi],
                    "Tanggal Pemenuhan": r[iPemenuhan],
                    StatusClosedNC: r[iStatusClosedNC],
                    _dateObj: d,
                    _year: d.getFullYear(),
                    _monthIndex: d.getMonth(),
                } as OverspeedData;
            });
    };

    // --- Fetch Data from Google Sheets API ---
    const fetchFromGoogleSheets = async () => {
        if (!sheetConfig) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/google-sheets/data/${sheetConfig.spreadsheetId}/${encodeURIComponent(sheetConfig.sheetName)}`);
            if (!res.ok) throw new Error("Gagal mengambil data dari Google Sheets");
            const data = await res.json();

            if (data.rows && data.rows.length > 0) {
                const headers = data.columns.map((c: any) => c.name);
                const rows = data.rows.map((row: any) => headers.map((h: string) => row[h] || ""));
                const processedData = processRows(rows, headers);

                const years = Array.from(new Set(processedData.map(d => d._year).filter(Boolean))) as number[];
                const units = Array.from(new Set(processedData.map(d => d["Vehicle No"]).filter(Boolean))) as string[];

                setRawData(processedData);
                setFilteredData(processedData);
                setAvailableYears(years.sort((a, b) => b - a));
                setAvailableUnits(units.sort());
                setDataSource("sheets");
            }
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err.message || "Gagal mengambil data");
            fetchFromCSV();
        } finally {
            setLoading(false);
        }
    };

    // --- Fetch Data from CSV (Fallback) ---
    const fetchFromCSV = () => {
        setLoading(true);
        setError(null);

        Papa.parse(CSV_URL, {
            download: true,
            header: false,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    const rows = results.data as string[][];
                    const headers = rows[0];
                    const headersTrimmed = headers.map(h => h ? h.trim() : "");

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
                    const iStatusClosedNC = headersTrimmed.indexOf("Status Closed NC");
                    const iWeek = headersTrimmed.indexOf("Week");
                    const iMonth = headersTrimmed.indexOf("Month");

                    const iTicketStatus = headersTrimmed.indexOf("Status");
                    let iValidationStatus = headersTrimmed.indexOf("Status Pelanggaran");
                    if (iValidationStatus === -1) {
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
                                StatusClosedNC: r[iStatusClosedNC],
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

    const fetchData = () => {
        if (sheetConfig) {
            fetchFromGoogleSheets();
        } else {
            fetchFromCSV();
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300000); // 5 mins
        return () => clearInterval(interval);
    }, [sheetConfig]);

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

        if (filterViolation !== "All") {
            if (filterViolation === "Merokok") {
                res = res.filter(row => row.Violation && row.Violation.toLowerCase().includes("merokok"));
            } else if (filterViolation === "OverSpeed") {
                res = res.filter(row => row.Violation && row.Violation.toLowerCase().includes("overspeed"));
            }
        }

        setFilteredData(res);
    };

    // Auto-apply when logic changes
    useEffect(() => {
        applyFilters();
    }, [filterYear, filterMonth, filterUnit, filterViolation, rawData]);

    const resetFilters = () => {
        setFilterYear("All");
        setFilterMonth("All");
        setFilterUnit("All");
        setFilterViolation("All");
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

        let violationMerokok = 0;
        let violationOverspeed = 0;

        // Status Closed NC Metrics
        let closedOntime = 0;
        let closedOverdue = 0;

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

        return {
            monthData, weekData, hourData, topEmployees, topUnits,
            openCount, closedCount, validCount, invalidCount, avgDuration,
            violationMerokok, violationOverspeed,
            closedOntime, closedOverdue
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
                    <Card key={i} className={`border-none shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300 bg-white`}>
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

                    {/* Secondary Charts */}
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
                                            { name: 'VERIF', value: (stats?.validCount || 0) + (stats?.invalidCount || 0), fill: '#8b5cf6' },
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
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">
                    {/* AI Analysis Card */}
                    <Card className="border-none shadow-xl bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative rounded-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <BrainCircuit className="w-40 h-40 text-white" />
                        </div>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                    <Sparkles className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-white">Mystic AI Insights</CardTitle>
                                    <CardDescription className="text-gray-400 text-xs">Automated Pattern Recognition</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            {isAnalyzing ? (
                                <div className="flex items-center gap-3 text-gray-300 animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Analyzing data patterns...</span>
                                </div>
                            ) : (aiInsights || []).length > 0 ? (aiInsights || []).map((text, i) => (
                                <div key={i} className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/5 text-sm leading-relaxed text-gray-200">
                                    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<span class="text-yellow-400 font-bold">$1</span>') }} />
                                </div>
                            )) : (
                                <div className="text-center py-6 text-gray-500 text-sm">
                                    No insights generated yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Violators List */}
                    <Card className="border-none shadow-lg bg-white rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-gray-900 border-l-4 border-red-500 pl-3">
                                Top Violators
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {stats?.topEmployees.map((emp, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                i === 1 ? 'bg-gray-100 text-gray-700' :
                                                    'bg-orange-50 text-orange-700'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-700 text-sm">{emp.name}</p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Truck className="w-3 h-3" /> {emp.unit}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="border-red-200 text-red-600 font-mono font-bold">
                                            {emp.count}
                                        </Badge>
                                    </div>
                                ))}
                                {(!stats?.topEmployees?.length) && (
                                    <div className="p-8 text-center text-gray-400 text-sm">No data available</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
