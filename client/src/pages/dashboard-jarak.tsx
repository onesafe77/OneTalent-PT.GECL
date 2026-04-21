import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
    CheckCircle,
    Download,
    Sparkles,
    Link2,
    Settings,
    Search,
    UserCircle,
    MapPin,
    AlertTriangle
} from "lucide-react";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

// --- Configuration ---
const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX9zYvZSIKyKXx-DfhyXZCdTMuqhPY_kXu_WxMWEZ-MHPR779_x_0NklR1VjDGN1e7aoloMaDf5jk9/pub?gid=512403277&single=true&output=csv";
const COMPANY_FILTER_DEFAULT = "GEC";
const DASHBOARD_ID = "jarak-aman";

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
    StatusClosedNC?: string;
    "Masa Berlaku Sanksi"?: string; // New field
    Level?: number; // New field
    // Helper fields for easier filtering
    _dateObj?: Date;
    _year?: number;
    _monthIndex?: number; // 0-11
    [key: string]: any; // Allow dynamic property access for CSV/Sheet columns
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

const washKey = (s?: string) => s?.toString().replace(/\s+/g, "").toUpperCase() || "";

const getMonthName = (monthIndex: number) => {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return months[monthIndex];
};

export default function DashboardJarak() {
    // --- State ---
    const [rawData, setRawData] = useState<OverspeedData[]>([]);
    const [filteredData, setFilteredData] = useState<OverspeedData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
    const [dataSource, setDataSource] = useState<"sheets" | "csv">("csv");

    // Filters
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterMonth, setFilterMonth] = useState<string>("All");
    const [filterUnit, setFilterUnit] = useState<string>("All");

    // Search and Detail Modal State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Unique options for filters
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [availableUnits, setAvailableUnits] = useState<string[]>([]);

    const { data: unitMitraMap } = useQuery({
        queryKey: ["unit-mitra-map"],
        queryFn: async () => {
            const res = await apiRequest("/api/fms/unit-mitra-map", "GET");
            return res as Record<string, string>;
        }
    });

    useEffect(() => {
        const config = getSheetConfig();
        setSheetConfig(config);
    }, []);

    const processRows = (rows: string[][], headers: string[]) => {
        const headersTrimmed = headers.map(h => h ? h.trim() : "");
        const iNo = headersTrimmed.indexOf("No");
        const iSumber = headersTrimmed.indexOf("Sumber") > -1 ? headersTrimmed.indexOf("Sumber") : headersTrimmed.indexOf("Type");
        const iEksekutor = headersTrimmed.indexOf("Nama Eksekutor");
        let iKaryawan = headersTrimmed.indexOf("Nama Karyawan");
        if (iKaryawan === -1) iKaryawan = headersTrimmed.indexOf("Slamet prihatin");
        const iNIK = headersTrimmed.indexOf("NIK");
        if (iKaryawan === -1 && iNIK > -1) iKaryawan = iNIK + 1;
        const iDate = headersTrimmed.indexOf("Date");
        const iTime = headersTrimmed.indexOf("Time");
        const iVehicle = headersTrimmed.indexOf("Vehicle No");
        const iCompany = headersTrimmed.indexOf("Company");
        const iViolation = headersTrimmed.indexOf("Violation");
        const iLocation = headersTrimmed.indexOf("Location (KM)") > -1 ? headersTrimmed.indexOf("Location (KM)") : headersTrimmed.indexOf("Location SiCantik");
        const iDurasi = headersTrimmed.indexOf("Durasi Close");
        const iPemenuhan = headersTrimmed.indexOf("Tanggal Pemenuhan");
        // Flexible matching for Status Closed NC column
        let iStatusClosedNC = headersTrimmed.indexOf("Status Closed NC");
        if (iStatusClosedNC === -1) iStatusClosedNC = headersTrimmed.findIndex(h => h.toLowerCase().includes("status closed"));
        if (iStatusClosedNC === -1) iStatusClosedNC = headersTrimmed.findIndex(h => h.toLowerCase().includes("closed nc"));
        console.log("[Dashboard Jarak] StatusClosedNC column index:", iStatusClosedNC, "Headers:", headersTrimmed.slice(0, 20));
        const iWeek = headersTrimmed.indexOf("Week");
        const iMonth = headersTrimmed.indexOf("Month");
        const iTicketStatus = headersTrimmed.indexOf("Status");
        let iValidationStatus = headersTrimmed.indexOf("Status Pelanggaran");
        if (iValidationStatus === -1) iValidationStatus = headersTrimmed.indexOf("Verifikasi");
        let iInvestorGroup = headersTrimmed.indexOf("Investor Group");
        if (iInvestorGroup === -1) iInvestorGroup = headersTrimmed.indexOf("InvestorGroup");
        if (iInvestorGroup === -1) iInvestorGroup = headersTrimmed.indexOf("Firma");

        return rows
            .filter(r => r[iCompany]?.trim().toUpperCase() === COMPANY_FILTER_DEFAULT)
            .map(r => {
                const d = parseDate(r[iDate]);
                let rawName = r[iKaryawan];
                if (!rawName || rawName === "#N/A" || rawName.trim() === "-") {
                    rawName = r[iNIK] ? `${r[iNIK]} (NIK)` : "Unknown";
                }
                return {
                    No: r[iNo],
                    Sumber: r[iSumber],
                    "Nama Eksekutor": r[iEksekutor],
                    "Nama Karyawan": rawName,
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
                    "Investor Group": r[iInvestorGroup] || r[iCompany] || "-",
                    "Masa Berlaku Sanksi": r.find && typeof r.find === 'function' ? (headersTrimmed.indexOf("Masa Berlaku Sanksi") > -1 ? r[headersTrimmed.indexOf("Masa Berlaku Sanksi")] : "-") : "-", // Flexible indexing for API
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
                console.log("[Dashboard Jarak] API Headers:", headers);
                console.log("[Dashboard Jarak] Sample raw row keys:", Object.keys(data.rows[0]));
                console.log("[Dashboard Jarak] Sample raw row full:", JSON.stringify(data.rows[0]));

                // Check if Status Closed NC exists in row keys
                const rowKeys = Object.keys(data.rows[0]);
                const statusClosedKey = rowKeys.find(k => k.toLowerCase().includes("status closed") || k.toLowerCase().includes("closed nc"));
                console.log("[Dashboard Jarak] Found Status Closed key:", statusClosedKey);

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
                    const iSumber = headersTrimmed.indexOf("Sumber") > -1 ? headersTrimmed.indexOf("Sumber") : headersTrimmed.indexOf("Type");
                    const iEksekutor = headersTrimmed.indexOf("Nama Eksekutor");
                    let iKaryawan = headersTrimmed.indexOf("Nama Karyawan");
                    if (iKaryawan === -1) iKaryawan = headersTrimmed.indexOf("Slamet prihatin");
                    if (iKaryawan === -1) {
                        const iNIK = headersTrimmed.indexOf("NIK");
                        if (iNIK > -1) iKaryawan = iNIK + 1;
                    }
                    const iDate = headersTrimmed.indexOf("Date");
                    const iTime = headersTrimmed.indexOf("Time");
                    const iVehicle = headersTrimmed.indexOf("Vehicle No");
                    const iCompany = headersTrimmed.indexOf("Company");
                    const iViolation = headersTrimmed.indexOf("Violation");
                    const iLocation = headersTrimmed.indexOf("Location (KM)") > -1 ? headersTrimmed.indexOf("Location (KM)") : headersTrimmed.indexOf("Location SiCantik");
                    const iDurasi = headersTrimmed.indexOf("Durasi Close");
                    const iPemenuhan = headersTrimmed.indexOf("Tanggal Pemenuhan");
                    const iStatusClosedNC = headersTrimmed.indexOf("Status Closed NC");
                    const iWeek = headersTrimmed.indexOf("Week");
                    const iMonth = headersTrimmed.indexOf("Month");
                    const iNIK = headersTrimmed.indexOf("NIK");
                    const iTicketStatus = headersTrimmed.indexOf("Status");
                    let iValidationStatus = headersTrimmed.indexOf("Status Pelanggaran");
                    if (iValidationStatus === -1) iValidationStatus = headersTrimmed.indexOf("Verifikasi");
                    let iInvestorGroup = headersTrimmed.indexOf("Investor Group");
                    if (iInvestorGroup === -1) iInvestorGroup = headersTrimmed.indexOf("InvestorGroup");
                    if (iInvestorGroup === -1) iInvestorGroup = headersTrimmed.indexOf("Firma");

                    const processedData = rows.slice(1)
                        .filter(r => r[iCompany]?.trim().toUpperCase() === COMPANY_FILTER_DEFAULT)
                        .map(r => {
                            const d = parseDate(r[iDate]);
                            let rawName = r[iKaryawan];
                            if (!rawName || rawName === "#N/A" || rawName.trim() === "-") {
                                rawName = r[iNIK] ? `${r[iNIK]} (NIK)` : "Unknown";
                            }
                            return {
                                No: r[iNo],
                                Sumber: r[iSumber],
                                "Nama Eksekutor": r[iEksekutor],
                                "Nama Karyawan": rawName,
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
                                "Investor Group": r[iInvestorGroup] || r[iCompany] || "-",
                                "Masa Berlaku Sanksi": headersTrimmed.indexOf("Masa Berlaku Sanksi") > -1 ? r[headersTrimmed.indexOf("Masa Berlaku Sanksi")] : "-",
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

        // New unified counters
        const unitMitraFromCsv: Record<string, string> = {};
        const unitCounts: Record<string, number> = {};
        const empCounts: Record<string, number> = {};
        const weekCounts: Record<string, number> = {};
        const hourCounts: Record<string, number> = {};
        for (let i = 0; i < 24; i++) hourCounts[i] = 0;

        let openCount = 0;
        let closedCount = 0;
        let validCount = 0;
        let invalidCount = 0;
        let totalDuration = 0;
        let durationCount = 0;
        let closedOntime = 0;
        let closedOverdue = 0;

        filteredData.forEach(row => {
            // Trend Per Week
            const w = row.Week ? `Minggu ${row.Week}` : "Unknown";
            weekCounts[w] = (weekCounts[w] || 0) + 1;

            // Trend Per Hour
            if (row.Time) {
                const hour = parseInt(row.Time.split(":")[0]);
                if (!isNaN(hour)) hourCounts[hour]++;
            }

            // Top Employees
            const name = (row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase();
            if (name && name !== "BIB") empCounts[name] = (empCounts[name] || 0) + 1;

            // Unit & Mitra
            const unit = row["Vehicle No"];
            if (unit) {
                unitCounts[unit] = (unitCounts[unit] || 0) + 1;
                // Capture Mitra from CSV if available
                const mitraLabel = row["Investor Group"] || row["InvestorGroup"] || row["Company"] || row["Firma"];
                if (mitraLabel && mitraLabel !== "#N/A" && !unitMitraFromCsv[unit]) {
                    unitMitraFromCsv[unit] = mitraLabel.toString().trim();
                }
            }

            // Ticket Status
            const ticketStatus = row.TicketStatus?.trim().toLowerCase();
            if (ticketStatus === 'open') openCount++;
            else if (ticketStatus === 'closed') closedCount++;

            // Validation Status
            const valStatus = row.ValidationStatus?.trim().toLowerCase();
            if (valStatus === 'valid' || valStatus === 'approve') validCount++;
            else if (valStatus && (valStatus.includes('invalid') || valStatus.includes('inv'))) invalidCount++;

            // Duration
            const dur = parseInt(row["Durasi Close"] || "0");
            if (!isNaN(dur) && dur > 0) {
                totalDuration += dur;
                durationCount++;
            }

            // Status Closed NC
            const sc = row.StatusClosedNC?.toLowerCase() || "";
            if (sc.includes("ontime")) closedOntime++;
            else if (sc.includes("overdue")) closedOverdue++;
        });

        const weekData = Object.keys(weekCounts)
            .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')))
            .map(name => ({ name, count: weekCounts[name] }));

        const hourData = Object.keys(hourCounts).map(h => ({ name: h, count: hourCounts[parseInt(h)] }));

        const topEmployees = Object.keys(empCounts)
            .map(name => {
                const row = filteredData.find(r => (r["Nama Karyawan"] || r["Nama Eksekutor"])?.toUpperCase() === name);
                const unit = row?.["Vehicle No"] || "-";
                const mitra = unit !== "-" ? (unitMitraMap?.[washKey(unit)] || row?.["Investor Group"] || row?.["InvestorGroup"] || row?.["Company"] || "-") : "-";
                return { name, count: empCounts[name], unit, mitra };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const topUnits = Object.keys(unitCounts)
            .map(name => {
                const washed = washKey(name);
                const fromDb = unitMitraMap?.[washed];
                const fromCsv = unitMitraFromCsv[name];
                return {
                    name,
                    count: unitCounts[name],
                    mitra: fromDb || fromCsv || "-"
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        if (filteredData.length > 0) {
            console.log("[Dashboard Jarak] CSV Columns sample:", Object.keys(filteredData[0]));
        }
        console.log("[Dashboard Jarak] Status Closed NC Stats - Ontime:", closedOntime, "Overdue:", closedOverdue);
        console.log("[Dashboard Jarak] Sample StatusClosedNC values:", filteredData.slice(0, 5).map(d => d.StatusClosedNC));
        const avgDuration = durationCount > 0 ? (totalDuration / durationCount).toFixed(1) : "0";

        return {
            monthData, weekData, hourData, topEmployees, topUnits,
            openCount, closedCount, validCount, invalidCount, avgDuration,
            closedOntime, closedOverdue
        };
    }, [filteredData, unitMitraMap]);

    // --- AI Analysis Logic ---
    // --- AI Analysis Logic ---
    const [aiInsights, setAiInsights] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (!stats) return;

        const analyze = async () => {
            setIsAnalyzing(true);
            try {
                const res = await fetch("/api/ai/analyze-jarak", {
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
                if (blob) saveAs(blob, "dashboard-jarak.jpg");
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
            <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent pointer-events-none -z-10 blur-3xl" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 sticky top-0 z-50">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Safe Distance Monitor
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                            Live Monitoring
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
                    </div>

                    <Button variant="outline" size="icon" onClick={fetchData} className="rounded-xl border-gray-200 hover:bg-gray-100 hover:text-blue-600 transition-colors">
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
                        title: "TOTAL INCIDENTS",
                        value: filteredData.length,
                        icon: AlertCircle,
                        color: "red",
                        subtext: "Safe Distance Violations"
                    },
                    {
                        title: "AVG RESOLUTION TIME",
                        value: `${stats?.avgDuration || 0}`,
                        unit: "Days",
                        icon: Clock,
                        color: "blue",
                        subtext: "Case Closing Duration"
                    },
                    {
                        title: "CLOSED ONTIME",
                        value: stats?.closedOntime || 0,
                        icon: CheckCircle,
                        color: "emerald",
                        subtext: `${stats?.closedOverdue || 0} Overdue`
                    },
                    {
                        title: "VALID INCIDENTS",
                        value: `${stats?.validCount || 0}`,
                        unit: "Valid",
                        icon: Sparkles,
                        color: "purple",
                        subtext: `${stats?.invalidCount || 0} Invalid/Rejected`
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
                                <CardTitle className="text-lg font-bold text-gray-800">Monthly Incident Trend</CardTitle>
                                <CardDescription>Frequency of distance violations</CardDescription>
                            </div>
                            <TrendingUp className="w-5 h-5 text-gray-400" />
                        </CardHeader>
                        <CardContent className="h-[350px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.monthData}>
                                    <defs>
                                        <linearGradient id="barBlueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="url(#barBlueGradient)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        <LabelList dataKey="count" position="top" fill="#3b82f6" fontSize={12} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Top 10 Vehicles */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100/50">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-800">Top 10 Vehicles</CardTitle>
                                <CardDescription>Units with highest violation frequency</CardDescription>
                            </div>
                            <Truck className="w-5 h-5 text-gray-400" />
                        </CardHeader>
                        <CardContent className="h-[400px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats?.topUnits.map(u => ({
                                        name: u.name,
                                        displayName: `${u.name} • ${u.mitra}`,
                                        count: u.count
                                    }))}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="displayName"
                                        type="category"
                                        width={160}
                                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(value: number, name: string, props: any) => [value, props.payload.displayName]}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                        <LabelList dataKey="count" position="right" fill="#3b82f6" fontSize={10} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Secondary Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Weekly Analysis */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-gray-800">MINGGUAN</CardTitle>
                                <CardDescription>Distribusi pelanggaran per minggu</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.weekData || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                                <LabelList dataKey="count" position="top" fill="#3b82f6" fontSize={11} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Hourly Analysis */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-gray-800">JAM RAWAN</CardTitle>
                                <CardDescription>Waktu kejadian paling sering</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.hourData || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                                <LabelList dataKey="count" position="top" fill="#ef4444" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: AI Analysis & Lists (Span 1) */}
                <div className="space-y-6">

                    {/* AI Analysis - Vertical Card */}
                    <Card className="bg-gradient-to-br from-white to-blue-50/30 border border-blue-100 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-5">
                            <BrainCircuit className="w-32 h-32 text-blue-900" />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-blue-600" />
                                <CardTitle className="text-base font-bold text-gray-900">AI Analysis</CardTitle>
                            </div>
                            <CardDescription className="text-xs text-gray-500">
                                Powered by Mystic AI • Real-time Insights
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isAnalyzing ? (
                                <div className="text-gray-400 italic flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
                                    <span className="text-sm">Menganalisa data...</span>
                                </div>
                            ) : (aiInsights || []).length > 0 ? (aiInsights || []).map((text, i) => (
                                <div key={i} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm text-sm text-gray-700 leading-relaxed relative z-10 pl-4">
                                    <div className="absolute left-0 top-3 w-1 h-6 bg-blue-500 rounded-r-lg"></div>
                                    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<span class="text-blue-700 font-bold">$1</span>') }} />
                                </div>
                            )) : (
                                <div className="text-sm text-gray-400 text-center py-4 italic">
                                    Belum ada analisa. Klik Refresh.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Employees List */}
                    < Card className="border-none shadow-sm bg-white" >
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-gray-900">Top 5 Pelanggar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats?.topEmployees.length ? stats.topEmployees.map((emp, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-3 border border-gray-100 hover:bg-red-50/50 rounded-xl transition-colors group cursor-pointer"
                                        onClick={() => {
                                            setSelectedEmployee(emp.name);
                                            setIsDetailOpen(true);
                                        }}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {i + 1}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-red-700 transition-colors" title={emp.name}>{emp.name}</p>
                                                <p className="text-xs text-gray-400">{emp.unit} • {emp.mitra}</p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-red-100 text-red-700 font-bold flex-shrink-0">
                                            {emp.count}
                                        </Badge>
                                    </div>
                                )) : <div className="text-center text-gray-400 py-10">Tidak ada data</div>}
                            </div>
                        </CardContent>
                    </Card >

                </div >
            </div>

            {/* Detailed Searchable Table Section */}
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden mt-6">
                <CardHeader className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-2xl font-black text-gray-900">Detailed Violation Records</CardTitle>
                            <CardDescription className="text-gray-500 mt-1">Daftar lengkap pelanggaran berdasarkan filter dan pencarian</CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                            {/* Global Search */}
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm w-full md:w-[300px] focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                <Search className="w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Cari Nama / NIK Karyawan..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-none bg-transparent h-8 text-sm font-bold focus-visible:ring-0 placeholder:text-gray-400 p-0"
                                />
                            </div>
                            <Badge variant="outline" className="px-5 py-2 bg-blue-50 text-blue-700 border-blue-100 font-black rounded-2xl whitespace-nowrap">
                                {filteredData.filter(r => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    const name = (r["Nama Karyawan"] || r["Nama Eksekutor"] || "").toLowerCase();
                                    const nik = (r["Vehicle No"] || "").toLowerCase();
                                    return name.includes(q) || nik.includes(q);
                                }).length} Results
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
                                    <TableHead className="w-[200px] py-5 px-8 font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Karyawan</TableHead>
                                    <TableHead className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">NIK / Unit</TableHead>
                                    <TableHead className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Waktu</TableHead>
                                    <TableHead className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Pelanggaran</TableHead>
                                    <TableHead className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Lokasi</TableHead>
                                    <TableHead className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Masa Berlaku Sanksi</TableHead>
                                    <TableHead className="text-right py-5 px-8 font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData
                                    .filter(row => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        const name = (row["Nama Karyawan"] || row["Nama Eksekutor"] || "").toLowerCase();
                                        const nik = (row["Vehicle No"] || "").toLowerCase();
                                        return name.includes(q) || nik.includes(q);
                                    })
                                    .slice(0, 100)
                                    .map((row, idx) => (
                                        <TableRow
                                            key={idx}
                                            className="hover:bg-gray-50/50 border-gray-50 cursor-pointer transition-all duration-200 group"
                                            onClick={() => {
                                                setSelectedEmployee((row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase());
                                                setIsDetailOpen(true);
                                            }}
                                        >
                                            <TableCell className="py-5 px-8">
                                                <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{row["Nama Karyawan"] || row["Nama Eksekutor"]}</p>
                                                <p className="text-[10px] text-gray-400 font-medium tracking-tight">Level {row.Level || "-"}</p>
                                            </TableCell>
                                            <TableCell>
                                                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">{row["Vehicle No"]}</code>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700">{row.Date || row["Date Opr"]}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{row.Time}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="font-black tracking-tighter text-[10px] rounded-full px-3 py-1 border-none shadow-sm bg-blue-500 text-white shadow-blue-500/20">
                                                    {row.Violation || "Safe Distance"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3 text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-600">{row["Location (KM)"]}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-bold text-gray-500 italic bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">
                                                    {row["Masa Berlaku Sanksi"]}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right py-5 px-8">
                                                <Badge
                                                    className={`font-black uppercase tracking-tighter text-[10px] rounded-md px-2.5 py-1 ${row.TicketStatus?.toLowerCase() === "closed"
                                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none"
                                                        : "bg-orange-50 text-orange-600 border border-orange-100 shadow-none"
                                                        }`}
                                                >
                                                    {row.TicketStatus}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                    {filteredData.length > 100 && (
                        <div className="p-4 text-center border-t border-gray-100 bg-gray-50/50">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Showing top 100 results • Use filters to refine</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogHeader className="p-8 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500 rounded-2xl shadow-lg shadow-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                                    {selectedEmployee}
                                </DialogTitle>
                                <DialogDescription className="text-gray-400 font-medium">
                                    Historical Violation Data & Sanction Records
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="h-full max-h-[60vh] p-8">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-4 bg-gray-50/50 border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Violations</p>
                                    <p className="text-3xl font-black text-gray-900 mt-1">
                                        {filteredData.filter(row => (row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase() === selectedEmployee).length}
                                    </p>
                                </Card>
                                <Card className="p-4 bg-gray-50/50 border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latest Unit</p>
                                    <p className="text-xl font-bold text-gray-900 mt-2 font-mono">
                                        {filteredData.find(row => (row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase() === selectedEmployee)?.["Vehicle No"] || "-"}
                                    </p>
                                </Card>
                            </div>

                            <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider">Tanggal</TableHead>
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider">Jam</TableHead>
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider">Unit</TableHead>
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider">Pelanggaran</TableHead>
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider">Lokasi</TableHead>
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider">Masa Berlaku Sanksi</TableHead>
                                            <TableHead className="font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData
                                            .filter(row => {
                                                const name = (row["Nama Karyawan"] || row["Nama Eksekutor"])?.trim().toUpperCase();
                                                return name === selectedEmployee;
                                            })
                                            .sort((a, b) => (b._dateObj?.getTime() || 0) - (a._dateObj?.getTime() || 0))
                                            .map((row, idx) => (
                                                <TableRow key={idx} className="hover:bg-gray-50/50 border-gray-50 transition-colors">
                                                    <TableCell className="font-medium text-gray-700">{row.Date || row["Date Opr"]}</TableCell>
                                                    <TableCell className="text-gray-500">{row.Time}</TableCell>
                                                    <TableCell className="font-bold text-gray-900">{row["Vehicle No"]}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-bold bg-blue-50 text-blue-600 border-blue-100">
                                                            {row.Violation || "Safe Distance"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-500">{row["Location (KM)"]}</TableCell>
                                                    <TableCell className="text-gray-500 italic font-medium">{row["Masa Berlaku Sanksi"]}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge
                                                            className={`font-black uppercase tracking-tighter text-[10px] ${row.TicketStatus?.toLowerCase() === "closed"
                                                                ? "bg-emerald-50 text-emerald-600"
                                                                : "bg-orange-50 text-orange-600"
                                                                }`}
                                                        >
                                                            {row.TicketStatus}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="p-6 bg-gray-50 flex justify-end">
                        <Button
                            variant="default"
                            onClick={() => setIsDetailOpen(false)}
                            className="bg-gray-900 text-white px-8 rounded-xl font-bold"
                        >
                            Close Record
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="text-center text-xs text-gray-300 pb-8 mt-12">
                Dashboard Version 2.1 • Data updated at {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
            </div>
        </div>
    );
}
