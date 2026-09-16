import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Download,
    FileSpreadsheet,
    Users,
    CheckCircle2,
    AlertCircle,
    Filter,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TnaSummaryRow {
    employeeId: string;
    employeeName: string;
    position: string;
    department: string;
    period: string;
    planMandatory: number;
    planDevelopment: number;
    totalPlan: number;
    actualComplied: number;
    actualNotComplied: number;
    mandatoryCompliance: number | null;
    overallCompliance: number | null;
    trainingCount: number;
}

export default function TnaRekap() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDepartment, setFilterDepartment] = useState<string>("all");
    const [filterPeriod, setFilterPeriod] = useState<string>("all");

    // Fetch all TNA entries
    const { data: allEntries = [], isLoading, refetch } = useQuery<TnaSummaryRow[]>({
        queryKey: ["/api/hse/tna-dashboard/all-entries"],
    });

    // Extract unique departments and periods for filters
    const uniqueDepartments = useMemo(() => {
        const depts = new Set(allEntries.map(e => e.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [allEntries]);

    const uniquePeriods = useMemo(() => {
        const periods = new Set(allEntries.map(e => e.period).filter(Boolean));
        return Array.from(periods).sort().reverse();
    }, [allEntries]);

    // Filter and search logic
    const filteredEntries = useMemo(() => {
        return allEntries.filter(entry => {
            // Search filter
            const searchMatch = searchQuery === "" ||
                entry.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());

            // Department filter
            const deptMatch = filterDepartment === "all" || entry.department === filterDepartment;

            // Period filter
            const periodMatch = filterPeriod === "all" || entry.period === filterPeriod;

            return searchMatch && deptMatch && periodMatch;
        });
    }, [allEntries, searchQuery, filterDepartment, filterPeriod]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const totalEmployees = filteredEntries.length;
        const totalMandatory = filteredEntries.reduce((sum, e) => sum + e.planMandatory, 0);
        const totalComplied = filteredEntries.reduce((sum, e) => sum + e.actualComplied, 0);
        const avgCompliance = totalMandatory > 0 ? Math.round((totalComplied / totalMandatory) * 100) : 0;

        return { totalEmployees, totalMandatory, totalComplied, avgCompliance };
    }, [filteredEntries]);

    const handleExport = () => {
        // Simple CSV export
        const headers = ["NIK", "Nama", "Jabatan", "Department", "Period", "Plan (M)", "Plan (D)", "Actual (C)", "Compliance (%)"];
        const rows = filteredEntries.map(e => [
            e.employeeId,
            e.employeeName,
            e.position || "-",
            e.department || "-",
            e.period,
            e.planMandatory,
            e.planDevelopment,
            e.actualComplied,
            e.mandatoryCompliance ?? "-"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `rekap-tna-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-black min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
                        Rekap TNA Tersimpan
                    </h1>
                    <p className="text-gray-500 text-sm">Daftar semua data Training Needs Analysis yang sudah disimpan</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                    <Button onClick={handleExport} className="gap-2 bg-primary hover:bg-primary/90">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total Karyawan</p>
                            <p className="text-xl font-bold">{summaryStats.totalEmployees}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total Mandatory</p>
                            <p className="text-xl font-bold">{summaryStats.totalMandatory}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <CheckCircle2 className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total Complied</p>
                            <p className="text-xl font-bold">{summaryStats.totalComplied}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Avg Compliance</p>
                            <p className="text-xl font-bold">{summaryStats.avgCompliance}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Cari Karyawan</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Cari berdasarkan NIK atau Nama..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Department</label>
                            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Dept" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Department</SelectItem>
                                    {uniqueDepartments.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-40">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Period</label>
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Period</SelectItem>
                                    {uniquePeriods.map(period => (
                                        <SelectItem key={period} value={period}>{period}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Data TNA Tersimpan</CardTitle>
                            <CardDescription>
                                Menampilkan {filteredEntries.length} dari {allEntries.length} record
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-gray-400 text-center py-12">Loading data...</div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="text-gray-400 text-center py-12">
                            {allEntries.length === 0
                                ? "Belum ada data TNA tersimpan. Mulai dengan menambahkan data di TNA Input."
                                : "Tidak ada data yang cocok dengan filter."
                            }
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-semibold text-xs">NIK</TableHead>
                                        <TableHead className="font-semibold text-xs">Nama Karyawan</TableHead>
                                        <TableHead className="font-semibold text-xs">Jabatan</TableHead>
                                        <TableHead className="font-semibold text-xs">Department</TableHead>
                                        <TableHead className="font-semibold text-xs">Period</TableHead>
                                        <TableHead className="font-semibold text-xs text-center">PLAN (M)</TableHead>
                                        <TableHead className="font-semibold text-xs text-center">PLAN (D)</TableHead>
                                        <TableHead className="font-semibold text-xs text-center">ACTUAL (C)</TableHead>
                                        <TableHead className="font-semibold text-xs text-center">Compliance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEntries.map((row, idx) => (
                                        <TableRow key={`${row.employeeId}_${row.period}_${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50">
                                            <TableCell className="font-mono text-xs text-gray-500">{row.employeeId}</TableCell>
                                            <TableCell className="font-semibold">{row.employeeName}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{row.position || "-"}</TableCell>
                                            <TableCell className="text-xs">{row.department || "-"}</TableCell>
                                            <TableCell className="text-xs">
                                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                                                    {row.period}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                    {row.planMandatory}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                                    {row.planDevelopment}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                                    {row.actualComplied}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {row.planMandatory > 0 ? (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-bold",
                                                        (row.mandatoryCompliance ?? 0) >= 100 ? "bg-muted text-foreground" :
                                                            (row.mandatoryCompliance ?? 0) >= 50 ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-red-100 text-red-700"
                                                    )}>
                                                        {row.mandatoryCompliance}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
