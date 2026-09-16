import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWeeksInMonth } from "@/lib/weekCutoffs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Users, CheckCircle, XCircle, Timer, Search, Loader2, Calendar, Filter, Eye, Clock, Activity, Zap, BarChart3 } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface PvtDriverStats {
    id: string;
    nama: string;
    nik: string;
    avgRT: number | null;
    lastRT: number | null;
    totalTests: number;
    status: string;
}

interface PvtEvaluationData {
    summary: {
        totalDrivers: number;
        totalTested: number;
        totalUntested: number;
        avgSystemRT: number;
        totalTests: number;
    };
    drivers: PvtDriverStats[];
    month: string;
}

/**
 * Chart.js butuh warna nyata, tidak bisa membaca var() CSS. Diambil dari token
 * --grafik-* saat render supaya grafik ikut tema terang/gelap.
 */
const tokenGrafik = (nama: string, cadangan: string) => {
    if (typeof window === "undefined") return cadangan;
    return getComputedStyle(document.documentElement).getPropertyValue(nama).trim() || cadangan;
};

export default function EvaluasiPvt() {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [weekFilter, setWeekFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("semua");
    const [pvtStatusFilter, setPvtStatusFilter] = useState("semua");

    const MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const weekOptions = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        return getWeeksInMonth(y, MONTH_NAMES_ID[m - 1]);
    }, [selectedMonth]);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);

    // Fetch evaluation data with explicit queryFn to ensure correct URL construction
    const { data, isLoading } = useQuery<PvtEvaluationData>({
        queryKey: ['/api/evaluasi-pvt', selectedMonth, statusFilter, pvtStatusFilter, weekFilter],
        queryFn: async () => {
            const p = new URLSearchParams({ month: selectedMonth, status: statusFilter, pvtStatus: pvtStatusFilter });
            if (weekFilter !== "all") {
                const [sd, ed] = weekFilter.split('|');
                p.set('startDate', sd);
                p.set('endDate', ed);
            }
            const res = await fetch(`/api/evaluasi-pvt?${p.toString()}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    // Fetch detail data when dialog is open
    const { data: detailData, isLoading: isLoadingDetail } = useQuery<{
        employee: { name: string; nik: string; position: string };
        records: any[];
    }>({
        queryKey: [`/api/evaluasi-pvt/${selectedDriverId}/details?month=${selectedMonth}`],
        enabled: !!selectedDriverId && showDetailDialog,
    });

    const filteredDrivers = useMemo(() => {
        if (!data?.drivers) return [];
        const query = searchQuery.toLowerCase();
        return data.drivers.filter(driver =>
            driver.nama.toLowerCase().includes(query) ||
            driver.nik.toLowerCase().includes(query)
        );
    }, [data?.drivers, searchQuery]);

    // Chart Data: RT Distribution
    const rtDistributionData = useMemo(() => {
        if (!data?.drivers) return { labels: [], datasets: [] };

        const testedDrivers = data.drivers.filter(d => d.avgRT !== null);
        const ranges = ["< 300ms", "300-350ms", "350-400ms", "400-450ms", "450-500ms", "> 500ms"];
        const counts = [0, 0, 0, 0, 0, 0];

        testedDrivers.forEach(d => {
            const rt = d.avgRT!;
            if (rt < 300) counts[0]++;
            else if (rt <= 350) counts[1]++;
            else if (rt <= 400) counts[2]++;
            else if (rt <= 450) counts[3]++;
            else if (rt <= 500) counts[4]++;
            else counts[5]++;
        });

        return {
            labels: ranges,
            datasets: [
                {
                    label: 'Jumlah Driver',
                    data: counts,
                    // Tangga keparahan: cepat (hijau) -> lambat (merah).
                    // Warna pekat, bukan alfa — alfa di atas latar gelap jadi lumpur.
                    backgroundColor: [
                        '#96161C', '#E15A61',
                        '#d97706', '#f59e0b',
                        '#D98806', '#dc2626',
                    ],
                    borderColor: 'transparent',
                    borderRadius: 8,
                }
            ]
        };
    }, [data?.drivers]);

    const monthOptions = useMemo(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
            options.push({ value, label });
        }
        return options;
    }, []);

    const exportToExcel = () => {
        if (!data) return;
        const ws = XLSX.utils.json_to_sheet(
            filteredDrivers.map((driver, index) => ({
                No: index + 1,
                Nama: driver.nama,
                NIK: driver.nik,
                'Avg RT (ms)': driver.avgRT || '-',
                'Last RT (ms)': driver.lastRT || '-',
                'Total Tes': driver.totalTests,
                Status: driver.status,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Evaluasi PVT');
        const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        XLSX.writeFile(wb, `Evaluasi_PVT_${monthLabel}.xlsx`);
    };

    const exportToPDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
        doc.setFontSize(16);
        doc.text('Evaluasi Data PVT (Reaction Time)', 14, 15);
        doc.setFontSize(12);
        doc.text(`Periode: ${monthLabel}`, 14, 22);
        autoTable(doc, {
            startY: 30,
            head: [['No', 'Nama Driver', 'NIK', 'Avg RT', 'Tests', 'Status']],
            body: filteredDrivers.map((driver, index) => [
                index + 1,
                driver.nama,
                driver.nik,
                driver.avgRT ? `${driver.avgRT}ms` : '-',
                driver.totalTests,
                driver.status,
            ]),
        });
        doc.save(`Evaluasi_PVT_${monthLabel}.pdf`);
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground font-medium">Memuat Data Evaluasi PVT...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 p-4 md:p-8 space-y-8 font-sans relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-[500px] to-transparent pointer-events-none -z-10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl shadow-sm border border-border relative z-10">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                        Evaluasi Data PVT
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-muted text-foreground border-border px-3 py-1">
                            Reaction Time Analysis
                        </Badge>
                        <p className="text-muted-foreground text-sm font-medium">
                            Analisis performa waktu reaksi driver dalam tes PVT
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportToExcel} className="bg-card border-border text-foreground hover:bg-muted">
                        <FileDown className="mr-2 h-4 w-4" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} className="bg-card border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400">
                        <FileDown className="mr-2 h-4 w-4" /> PDF
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Periode
                    </label>
                    <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setWeekFilter("all"); }}>
                        <SelectTrigger className="bg-card border-border h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>{monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Minggu
                    </label>
                    <Select value={weekFilter} onValueChange={setWeekFilter}>
                        <SelectTrigger className="bg-card border-border h-10 rounded-lg"><SelectValue placeholder="Semua Minggu" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Minggu</SelectItem>
                            {weekOptions.map(w => (
                                <SelectItem key={w.weekNumber} value={`${w.startDate}|${w.endDate}`}>{w.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filter Tes
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-card border-border h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Driver</SelectItem>
                            <SelectItem value="tested">Sudah Tes PVT</SelectItem>
                            <SelectItem value="untested">Belum Tes PVT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Status Hasil
                    </label>
                    <Select value={pvtStatusFilter} onValueChange={setPvtStatusFilter}>
                        <SelectTrigger className="bg-card border-border h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Hasil</SelectItem>
                            <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                            <SelectItem value="Cukup">Cukup</SelectItem>
                            <SelectItem value="Lambat">Lambat</SelectItem>
                            <SelectItem value="Belum Ada Data">Belum Ada Data</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Cari
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Cari nama atau NIK..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-card border-border h-10 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Summary Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Driver</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold text-foreground">{data?.summary.totalDrivers || 0}</div>
                        <p className="text-xs text-muted-foreground font-medium mt-1">Driver aktif terdaftar</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Partisipasi Tes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold text-foreground">{data?.summary.totalTested || 0}</div>
                        <p className="text-xs text-foreground font-medium mt-1">Driver sudah melakukan PVT</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Belum Tes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold text-red-600 dark:text-red-400">{data?.summary.totalUntested || 0}</div>
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">Driver belum ada data PVT</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Zap className="h-4 w-4" /> Rata-rata Respon</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-semibold tabular-nums text-foreground">
                            {data?.summary.avgSystemRT || 0} <span className="text-lg text-muted-foreground">ms</span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Rata-rata sistem bulan ini</p>
                    </CardContent>
                </Card>
            </div>

            {/* Distribution Chart */}
            <Card className="p-6">
                <CardHeader className="px-0">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-muted-foreground" /> Distribusi Waktu Reaksi
                    </CardTitle>
                    <CardDescription>Visualisasi jumlah driver berdasarkan kategori waktu reaksi (ms)</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="h-[300px]">
                        <Bar
                            data={rtDistributionData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    // Tanpa warna eksplisit, label sumbu memakai abu tua bawaan
                                    // Chart.js yang hilang di latar gelap.
                                    y: {
                                        beginAtZero: true,
                                        ticks: { color: tokenGrafik('--grafik-label', '#757575') },
                                        grid: { color: tokenGrafik('--grafik-garis', '#E0E0E0') },
                                        border: { display: false },
                                    },
                                    x: {
                                        ticks: { color: tokenGrafik('--grafik-label', '#757575') },
                                        grid: { display: false },
                                        border: { display: false },
                                    }
                                }
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <CardHeader className="border-b bg-card">
                    <div className="flex justify-between items-center">
                        <CardTitle>Daftar Analisis Per Driver</CardTitle>
                        <Badge variant="secondary">Total: {filteredDrivers.length} Driver</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">No</TableHead>
                                <TableHead>Nama Driver</TableHead>
                                <TableHead>NIK</TableHead>
                                <TableHead className="text-center">Avg RT (ms)</TableHead>
                                <TableHead className="text-center">Tes</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center w-20">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDrivers.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada data ditemukan</TableCell></TableRow>
                            ) : (
                                filteredDrivers.map((driver, index) => (
                                    <TableRow key={driver.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                        <TableCell className="font-semibold text-foreground">{driver.nama}</TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs">{driver.nik}</TableCell>
                                        <TableCell className="text-center font-bold">
                                            {driver.avgRT ? (
                                                <span className={driver.avgRT <= 350 ? "text-foreground" : driver.avgRT <= 500 ? "text-yellow-600" : "text-red-600"}>
                                                    {driver.avgRT}ms
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-muted">{driver.totalTests}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={
                                                driver.status === "Sangat Baik" ? "bg-muted text-foreground" :
                                                    driver.status === "Cukup" ? "bg-yellow-100 text-yellow-700" :
                                                        driver.status === "Lambat" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
                                            }>
                                                {driver.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedDriverId(driver.id); setShowDetailDialog(true); }}>
                                                <Eye className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detail Histori PVT Driver</DialogTitle>
                        <DialogDescription>Riwayat tes reaksi periode {selectedMonth}</DialogDescription>
                    </DialogHeader>

                    {isLoadingDetail ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : detailData?.employee ? (
                        <div className="flex flex-col gap-4 overflow-hidden">
                            <div className="bg-muted p-4 rounded-lg flex items-center gap-4">
                                <div className="h-12 w-12 bg-card rounded-full flex items-center justify-center text-muted-foreground font-bold border border-border">
                                    {detailData.employee.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">{detailData.employee.name}</h3>
                                    <p className="text-sm text-muted-foreground">{detailData.employee.nik}</p>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 -mx-6 px-6">
                                <div className="space-y-3 pb-4">
                                    {detailData.records.map((r, i) => (
                                        <div key={i} className="border rounded-lg p-4 flex justify-between items-center bg-card">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="bg-muted">{r.tanggal}</Badge>
                                                    <span className="text-xs text-muted-foreground">{r.waktu} • {r.lokasi}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground italic">Evaluator: {r.evaluator}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-semibold text-muted-foreground">{r.pvtMeanRT}ms</div>
                                                <Badge className={r.pvtMeanRT <= 350 ? "bg-muted text-foreground" : r.pvtMeanRT <= 500 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                                                    {r.pvtMeanRT <= 350 ? "Sangat Baik" : r.pvtMeanRT <= 500 ? "Cukup" : "Lambat"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : <div className="p-4 text-center text-red-500">Gagal memuat data</div>}
                </DialogContent>
            </Dialog>
        </div>
    );
}
