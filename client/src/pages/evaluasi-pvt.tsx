import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function EvaluasiPvt() {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [statusFilter, setStatusFilter] = useState("semua");
    const [pvtStatusFilter, setPvtStatusFilter] = useState("semua");
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);

    // Fetch evaluation data
    const { data, isLoading } = useQuery<PvtEvaluationData>({
        queryKey: [`/api/evaluasi-pvt?month=${selectedMonth}&status=${statusFilter}&pvtStatus=${pvtStatusFilter}`],
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
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(34, 197, 94, 0.5)',
                        'rgba(234, 179, 8, 0.5)',
                        'rgba(234, 179, 8, 0.7)',
                        'rgba(249, 115, 22, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
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
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Memuat Data Evaluasi PVT...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-8 font-sans relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none -z-10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 relative z-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                        Evaluasi Data PVT
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1">
                            Reaction Time Analysis
                        </Badge>
                        <p className="text-gray-500 text-sm font-medium">
                            Analisis performa waktu reaksi driver dalam tes PVT
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportToExcel} className="bg-white/80 border-green-200 text-green-700 hover:bg-green-50">
                        <FileDown className="mr-2 h-4 w-4" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} className="bg-white/80 border-red-200 text-red-700 hover:bg-red-50">
                        <FileDown className="mr-2 h-4 w-4" /> PDF
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Periode
                    </label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>{monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filter Tes
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="semua">Semua Driver</SelectItem>
                            <SelectItem value="tested">Sudah Tes PVT</SelectItem>
                            <SelectItem value="untested">Belum Tes PVT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Status Hasil
                    </label>
                    <Select value={pvtStatusFilter} onValueChange={setPvtStatusFilter}>
                        <SelectTrigger className="bg-white border-gray-200 h-10 rounded-lg"><SelectValue /></SelectTrigger>
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Cari
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input placeholder="Cari nama atau NIK..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-white border-gray-200 h-10 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Summary Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Driver</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-800">{data?.summary.totalDrivers || 0}</div>
                        <p className="text-xs text-indigo-600 font-medium mt-1">Driver aktif terdaftar</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Partisipasi Tes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-600">{data?.summary.totalTested || 0}</div>
                        <p className="text-xs text-green-600 font-medium mt-1">Driver sudah melakukan PVT</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Belum Tes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-500">{data?.summary.totalUntested || 0}</div>
                        <p className="text-xs text-red-500 font-medium mt-1">Driver belum ada data PVT</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg border-none">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-indigo-100">Rata-rata Respon</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{data?.summary.avgSystemRT || 0} <span className="text-lg">ms</span></div>
                        <p className="text-xs text-indigo-100 mt-1">Rata-rata sistem bulan ini</p>
                    </CardContent>
                </Card>
            </div>

            {/* Distribution Chart */}
            <Card className="p-6">
                <CardHeader className="px-0">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" /> Distribusi Waktu Reaksi
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
                                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                                    x: { grid: { display: false } }
                                }
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <CardHeader className="border-b bg-white/40">
                    <div className="flex justify-between items-center">
                        <CardTitle>Daftar Analisis Per Driver</CardTitle>
                        <Badge variant="secondary">Total: {filteredDrivers.length} Driver</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
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
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">Tidak ada data ditemukan</TableCell></TableRow>
                            ) : (
                                filteredDrivers.map((driver, index) => (
                                    <TableRow key={driver.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                        <TableCell className="font-semibold text-gray-700">{driver.nama}</TableCell>
                                        <TableCell className="text-gray-500 font-mono text-xs">{driver.nik}</TableCell>
                                        <TableCell className="text-center font-bold">
                                            {driver.avgRT ? (
                                                <span className={driver.avgRT <= 350 ? "text-green-600" : driver.avgRT <= 500 ? "text-yellow-600" : "text-red-600"}>
                                                    {driver.avgRT}ms
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-gray-50">{driver.totalTests}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={
                                                driver.status === "Sangat Baik" ? "bg-green-100 text-green-700" :
                                                    driver.status === "Cukup" ? "bg-yellow-100 text-yellow-700" :
                                                        driver.status === "Lambat" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                                            }>
                                                {driver.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedDriverId(driver.id); setShowDetailDialog(true); }}>
                                                <Eye className="w-4 h-4 text-indigo-600" />
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
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
                    ) : detailData?.employee ? (
                        <div className="flex flex-col gap-4 overflow-hidden">
                            <div className="bg-indigo-50 p-4 rounded-lg flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                    {detailData.employee.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{detailData.employee.name}</h3>
                                    <p className="text-sm text-gray-500">{detailData.employee.nik}</p>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 -mx-6 px-6">
                                <div className="space-y-3 pb-4">
                                    {detailData.records.map((r, i) => (
                                        <div key={i} className="border rounded-lg p-4 flex justify-between items-center bg-white">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="bg-gray-100">{r.tanggal}</Badge>
                                                    <span className="text-xs text-gray-400">{r.waktu} • {r.lokasi}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 italic">Evaluator: {r.evaluator}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-indigo-600">{r.pvtMeanRT}ms</div>
                                                <Badge className={r.pvtMeanRT <= 350 ? "bg-green-100 text-green-700" : r.pvtMeanRT <= 500 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
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
