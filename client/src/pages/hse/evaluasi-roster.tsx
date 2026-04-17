import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Search, Loader2, Calendar, Users, AlertTriangle, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { getWeeksInMonth } from "@/lib/weekCutoffs";

interface DriverEvaluation {
    id: string;
    nama: string;
    nik: string;
    investorGroup: string;
    totalSidak: number;   // count for selected period (week or month)
    monthTotal: number;   // full-month count (for monthly compliance)
    status: string;       // "Sudah SIDAK" | "Belum SIDAK" — based on full-month count
}

interface EvaluasiRosterResponse {
    summary: {
        totalDrivers: number;
        sudahSidak: number;
        belumSidak: number;
        totalSidakKeseluruhan: number;
    };
    drivers: DriverEvaluation[];
    month: string;
}

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export default function EvaluasiRoster() {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [statusFilter, setStatusFilter] = useState("semua");
    const [weekFilter, setWeekFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    const weekOptions = useMemo(() => {
        return getWeeksInMonth(selectedYear, MONTH_NAMES_ID[selectedMonth - 1]);
    }, [selectedMonth, selectedYear]);

    // Reset week filter when month/year changes
    const handleMonthChange = (v: string) => { setSelectedMonth(parseInt(v)); setWeekFilter("all"); };
    const handleYearChange = (v: string) => { setSelectedYear(parseInt(v)); setWeekFilter("all"); };

    const { data, isLoading } = useQuery<EvaluasiRosterResponse>({
        queryKey: ["/api/evaluasi-roster", monthParam, statusFilter, weekFilter],
        queryFn: async () => {
            const p = new URLSearchParams({ month: monthParam, status: statusFilter });
            if (weekFilter !== "all") {
                const [sd, ed] = weekFilter.split('|');
                p.set('startDate', sd);
                p.set('endDate', ed);
            }
            const res = await fetch(`/api/evaluasi-roster?${p.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        placeholderData: (prev) => prev,
    });

    const filteredDrivers = useMemo(() => {
        if (!data?.drivers) return [];
        if (!searchQuery) return data.drivers;
        const q = searchQuery.toLowerCase();
        return data.drivers.filter(d =>
            d.nama.toLowerCase().includes(q) || d.nik.toLowerCase().includes(q)
        );
    }, [data?.drivers, searchQuery]);

    const weekOption = weekFilter !== "all"
        ? weekOptions.find(w => `${w.startDate}|${w.endDate}` === weekFilter)
        : null;
    const weekLabel = weekOption?.label || "Semua Minggu";
    const monthLabel = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

    const exportToExcel = () => {
        if (!data) return;
        const statusLabel = statusFilter === "sudah" ? "Sudah SIDAK"
            : statusFilter === "belum" ? "Belum SIDAK" : "Semua";

        const ws = XLSX.utils.json_to_sheet(
            filteredDrivers.map((d, i) => ({
                "No": i + 1,
                "NIK": d.nik,
                "Nama": d.nama,
                "Investor Group": d.investorGroup,
                "Total SIDAK Roster": d.totalSidak,
                "Status": d.status,
            }))
        );

        // Add summary at the top via header rows
        XLSX.utils.sheet_add_aoa(ws, [
            [`Evaluasi SIDAK Roster - ${monthLabel}`],
            [`Minggu: ${weekLabel}`, `Filter: ${statusLabel}`],
            [`Total Driver: ${data.summary.totalDrivers}`, `Sudah SIDAK: ${data.summary.sudahSidak}`, `Belum SIDAK (bulan): ${data.summary.belumSidak}`],
            [],
        ], { origin: "A1" });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Evaluasi Roster");
        const weekSuffix = weekOption ? `_${weekOption.label.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        const statusSuffix = statusFilter !== "semua" ? `_${statusLabel.replace(/\s+/g, '_')}` : '';
        XLSX.writeFile(wb, `Evaluasi_SIDAK_Roster_${monthLabel}${weekSuffix}${statusSuffix}.xlsx`);
    };

    const summary = data?.summary;
    const completionPercent = summary ? Math.round((summary.sudahSidak / Math.max(summary.totalDrivers, 1)) * 100) : 0;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Evaluasi SIDAK Roster
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Rekap kesesuaian gilir kerja per driver per bulan
                    </p>
                </div>
                <Button onClick={exportToExcel} variant="outline" size="sm" disabled={!data}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Export Excel
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MONTHS.map((m, i) => (
                            <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={String(selectedYear)} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[2024, 2025, 2026, 2027].map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Week filter */}
                <Select value={weekFilter} onValueChange={setWeekFilter}>
                    <SelectTrigger className="w-52">
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

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="semua">Semua Status</SelectItem>
                        <SelectItem value="sudah">Sudah SIDAK</SelectItem>
                        <SelectItem value="belum">Belum SIDAK</SelectItem>
                    </SelectContent>
                </Select>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari nama/NIK..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 w-48"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-4 text-center">
                                <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                <p className="text-2xl font-bold">{summary.totalDrivers}</p>
                                <p className="text-xs text-gray-500">Total Driver (bulan)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 text-center">
                                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                <p className="text-2xl font-bold text-green-600">{summary.sudahSidak}</p>
                                <p className="text-xs text-gray-500">
                                    {weekFilter !== "all" ? `SIDAK di ${weekLabel}` : "Sudah SIDAK bulan ini"}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 text-center">
                                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                                <p className="text-2xl font-bold text-red-600">{summary.belumSidak}</p>
                                <p className="text-xs text-gray-500">Belum SIDAK (bulan ini)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4 text-center">
                                <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                                <p className="text-2xl font-bold">{completionPercent}%</p>
                                <p className="text-xs text-gray-500">Penyelesaian</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress Bar */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Progress Evaluasi SIDAK Roster</span>
                                <span className="text-sm font-medium">{completionPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all ${completionPercent === 100 ? 'bg-green-500' : completionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${completionPercent}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Driver Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">
                                    Daftar Driver ({filteredDrivers.length})
                                </CardTitle>
                                {weekFilter !== "all" && statusFilter === "belum" && (
                                    <span className="text-xs text-gray-500">
                                        Belum SIDAK • bekerja di {weekLabel}
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white dark:bg-gray-900">
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">No</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">NIK</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Nama</th>
                                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Investor Group</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Total SIDAK</th>
                                            <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredDrivers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                                                    Tidak ada data driver ditemukan
                                                </td>
                                            </tr>
                                        ) : filteredDrivers.map((driver, idx) => (
                                            <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="py-2 px-3 text-sm">{idx + 1}</td>
                                                <td className="py-2 px-3 text-sm font-mono">{driver.nik}</td>
                                                <td className="py-2 px-3 text-sm">{driver.nama}</td>
                                                <td className="py-2 px-3 text-sm text-gray-600">{driver.investorGroup}</td>
                                                <td className="py-2 px-3 text-center text-sm font-semibold">{driver.totalSidak}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <Badge className={driver.status === "Sudah SIDAK"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                                    }>
                                                        {driver.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
