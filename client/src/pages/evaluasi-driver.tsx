import { useState, useMemo } from "react";
import { fotoKecil } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getWeeksInMonth } from "@/lib/weekCutoffs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Users, CheckCircle, XCircle, ClipboardList, Search, Loader2, Calendar, Filter, GripHorizontal, Eye, Clock, Activity, Pen } from "lucide-react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DriverEvaluation {
  id: string;
  nama: string;
  nik: string;
  investorGroup: string;
  totalSidak: number;  // count for selected period (week or month)
  monthTotal: number;  // count for full month (used for monthly compliance)
  status: string;      // "Sudah SIDAK" | "Belum SIDAK" — based on full-month count
}

interface EvaluationData {
  summary: {
    totalDrivers: number;
    sudahSidak: number;
    belumSidak: number;
    totalSidakKeseluruhan: number;
  };
  drivers: DriverEvaluation[];
  month: string;
  rosterMissing?: boolean; // roster bulan ini belum diupload → pool driver diambil dari data SIDAK
}

/**
 * Chart.js butuh warna nyata, tidak bisa membaca var() CSS. Diambil dari token
 * --grafik-* saat render supaya grafik ikut tema terang/gelap.
 */
const tokenGrafik = (nama: string, cadangan: string) => {
  if (typeof window === "undefined") return cadangan;
  return getComputedStyle(document.documentElement).getPropertyValue(nama).trim() || cadangan;
};

const inisial = (n: string) =>
  (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function EvaluasiDriver() {
  // Get current month in YYYY-MM format
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [weekFilter, setWeekFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("semua");

  const MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const weekOptions = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return getWeeksInMonth(y, MONTH_NAMES_ID[m - 1]);
  }, [selectedMonth]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch detail data when dialog is open
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<{
    employee: { id: string; name: string; nik?: string; position: string; photoUrl?: string | null };
    records: any[];
  }>({
    queryKey: [`/api/evaluasi-driver/${selectedDriverId}/details?month=${selectedMonth}`],
    enabled: !!selectedDriverId && showDetailDialog,
    staleTime: 60_000,
  });

  // Fetch evaluation data with explicit queryFn to ensure correct URL construction
  const { data, isLoading } = useQuery<EvaluationData>({
    queryKey: ['/api/evaluasi-driver', selectedMonth, statusFilter, weekFilter],
    queryFn: async () => {
      const p = new URLSearchParams({ month: selectedMonth, status: statusFilter });
      if (weekFilter !== "all") {
        const [sd, ed] = weekFilter.split('|');
        p.set('startDate', sd);
        p.set('endDate', ed);
      }
      const res = await fetch(`/api/evaluasi-driver?${p.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  // Filter drivers by search query
  const filteredDrivers = useMemo(() => {
    if (!data?.drivers) return [];

    const query = searchQuery.toLowerCase();
    return data.drivers.filter(driver =>
      driver.nama.toLowerCase().includes(query) ||
      driver.nik.toLowerCase().includes(query)
    );
  }, [data?.drivers, searchQuery]);

  // Sort drivers by total SIDAK (descending)
  const sortedDrivers = useMemo(() => {
    return [...filteredDrivers].sort((a, b) => b.totalSidak - a.totalSidak);
  }, [filteredDrivers]);

  // Get top 10 drivers for bar chart
  const top10Drivers = useMemo(() => {
    return sortedDrivers.slice(0, 10);
  }, [sortedDrivers]);

  // Bar chart data
  const barChartData = {
    labels: top10Drivers.map(d => d.nama),
    datasets: [
      {
        label: 'Total SIDAK Fatigue',
        data: top10Drivers.map(d => d.totalSidak),
        backgroundColor: tokenGrafik('--grafik-2', '#575757'),
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: tokenGrafik('--grafik-garis', '#E0E0E0'),
        },
        ticks: {
          stepSize: 1,
          color: tokenGrafik('--grafik-label', '#757575'),
          font: { family: "'Inter', sans-serif", size: 11 }
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: tokenGrafik('--grafik-label', '#757575'),
          font: { family: "'Inter', sans-serif", size: 10 },
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45
        },
        border: {
          display: false
        }
      },
    },
  };

  // Pie chart data
  const pieChartData = {
    labels: ['Sudah SIDAK', 'Belum SIDAK'],
    datasets: [
      {
        data: [data?.summary.sudahSidak || 0, data?.summary.belumSidak || 0],
        // Hijau/merah dipertahankan: di sini warnanya MENANDAI patuh vs belum,
        // bukan hiasan. Nadanya dipilih agar terbaca di terang maupun gelap.
        backgroundColor: ['#BA1B23', '#dc2626'],
        borderColor: [
          `hsl(${tokenGrafik('--card', '0 0% 100%')})`,
          `hsl(${tokenGrafik('--card', '0 0% 100%')})`,
        ],
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: tokenGrafik('--grafik-label', '#757575'),
          font: { family: "'Inter', sans-serif", size: 12 }
        }
      },
    },
  };

  // Generate month options (last 12 months)
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

  // Export to Excel
  const exportToExcel = () => {
    if (!data) return;

    const ws = XLSX.utils.json_to_sheet(
      sortedDrivers.map((driver, index) => ({
        No: index + 1,
        Nama: driver.nama,
        NIK: driver.nik,
        'Total SIDAK': driver.totalSidak,
        Status: driver.status,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluasi Driver');

    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
    XLSX.writeFile(wb, `Evaluasi_Driver_${monthLabel}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

    // Resolve week label
    const weekOption = weekFilter !== "all"
      ? weekOptions.find(w => `${w.startDate}|${w.endDate}` === weekFilter)
      : null;
    const weekLabel = weekOption?.label || "Semua Minggu";

    // Resolve status label
    const statusLabel = statusFilter === "sudah" ? "Sudah SIDAK"
      : statusFilter === "belum" ? "Belum SIDAK"
      : "Semua Driver";

    // Title
    doc.setFontSize(16);
    doc.text('Evaluasi Driver SIDAK Fatigue', 14, 15);

    // Periode & filter info
    doc.setFontSize(11);
    let yPos = 23;
    doc.text(`Periode   : ${monthLabel}`, 14, yPos); yPos += 7;
    doc.text(`Minggu    : ${weekLabel}`, 14, yPos); yPos += 7;
    doc.text(`Filter    : ${statusLabel}`, 14, yPos); yPos += 10;

    // Summary
    doc.setFontSize(10);
    doc.text(`Total Driver (bulan)   : ${data.summary.totalDrivers}`, 14, yPos); yPos += 6;
    const sudahLabel = weekOption ? `Sudah SIDAK (${weekLabel})` : 'Sudah SIDAK (bulan ini)';
    doc.text(`${sudahLabel.padEnd(23)}: ${data.summary.sudahSidak}`, 14, yPos); yPos += 6;
    doc.text(`Belum SIDAK (bulan ini): ${data.summary.belumSidak}`, 14, yPos); yPos += 6;
    doc.text(`Total SIDAK Keseluruhan: ${data.summary.totalSidakKeseluruhan}`, 14, yPos); yPos += 6;
    const ditampilkanLabel = (weekOption && statusFilter === 'belum')
      ? `Belum SIDAK di ${weekLabel}`
      : 'Ditampilkan            ';
    doc.text(`${ditampilkanLabel}: ${sortedDrivers.length} driver`, 14, yPos); yPos += 8;

    // Table
    autoTable(doc, {
      startY: yPos,
      head: [['No', 'Nama Driver', 'NIK', 'Investor Group', 'Total SIDAK', 'Status']],
      body: sortedDrivers.map((driver, index) => [
        index + 1,
        driver.nama,
        driver.nik,
        driver.investorGroup,
        driver.totalSidak,
        driver.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Filename reflects active filters
    const weekSuffix = weekOption ? `_${weekOption.label.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const statusSuffix = statusFilter !== "semua" ? `_${statusLabel.replace(/\s+/g, '_')}` : '';
    doc.save(`Evaluasi_Driver_${monthLabel}${weekSuffix}${statusSuffix}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground font-medium">Memuat Data Evaluasi Driver...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8 space-y-8 font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 right-0 w-full h-[500px] to-transparent pointer-events-none -z-10 blur-3xl" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl shadow-sm border border-border relative z-10">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Evaluasi Driver SIDAK Fatigue
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-muted text-foreground border-border px-3 py-1">
              Monthly Report
            </Badge>
            <p className="text-muted-foreground text-sm font-medium">
              Monitoring partisipasi driver dalam SIDAK Fatigue
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="bg-card border-border text-foreground hover:bg-muted"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            className="bg-card border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400"
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters - Glassy Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Periode
          </label>
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setWeekFilter("all"); }}>
            <SelectTrigger className="bg-card border-border h-10 rounded-lg hover:border-blue-400 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Minggu
          </label>
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="bg-card border-border h-10 rounded-lg hover:border-blue-400 transition-colors">
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
        </div>

        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card border-border h-10 rounded-lg hover:border-blue-400 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Driver</SelectItem>
              <SelectItem value="sudah">Sudah SIDAK</SelectItem>
              <SelectItem value="belum">Belum SIDAK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Search className="w-3 h-3" /> Cari
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border h-10 rounded-lg focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Penanda mode fallback (roster bulan ini belum diupload) */}
      {data?.rosterMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Roster bulan ini belum diupload — daftar driver diambil dari data SIDAK yang masuk.
          Angka <b>&quot;Belum SIDAK&quot;</b> tidak dapat dihitung untuk bulan ini. Upload roster bulan
          tersebut untuk perhitungan penuh.
        </div>
      )}

      {/* Summary Cards with Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-border bg-card">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-muted-foreground" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">
              {data?.summary.totalDrivers || 0}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Semua driver terdaftar</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle className="w-16 h-16 text-foreground" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sudah SIDAK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">
              {data?.summary.sudahSidak || 0}
            </div>
            <p className="text-xs text-foreground font-medium mt-1">
              {weekFilter !== "all" ? "SIDAK pada minggu ini" : "Minimal 1 SIDAK bulan ini"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Belum SIDAK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-red-600 dark:text-red-400">
              {data?.summary.belumSidak || 0}
            </div>
            <p className="text-xs text-red-600 font-medium mt-1 dark:text-red-400">Belum ada SIDAK sepanjang bulan</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4" /> Total SIDAK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-foreground">
              {data?.summary.totalSidakKeseluruhan || 0}
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Total kegiatan bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <GripHorizontal className="w-5 h-5 text-muted-foreground" />
              Top 10 Driver
            </CardTitle>
            <CardDescription>Driver dengan partisipasi SIDAK Fatigue terbanyak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
              Status Kepatuhan
            </CardTitle>
            <CardDescription>Persentase driver sudah vs belum SIDAK</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Table */}
      <Card className="bg-card shadow-sm border border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-card">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-foreground">Daftar Detail Driver</CardTitle>
              <CardDescription>Data lengkap status SIDAK per driver</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Total: {filteredDrivers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 font-bold text-muted-foreground">No</TableHead>
                  <TableHead className="font-bold text-muted-foreground">Nama Driver</TableHead>
                  <TableHead className="font-bold text-muted-foreground">NIK</TableHead>
                  <TableHead className="font-bold text-muted-foreground">Investor Group</TableHead>
                  <TableHead className="text-center font-bold text-muted-foreground">Total SIDAK</TableHead>
                  <TableHead className="text-center font-bold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-center font-bold text-muted-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <XCircle className="w-8 h-8 text-muted-foreground" />
                        <p>Tidak ada data driver ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDrivers.map((driver, index) => (
                    <TableRow key={driver.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">{driver.nama}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{driver.nik}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{driver.investorGroup}</TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${driver.totalSidak > 0 ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {driver.totalSidak}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`px-3 py-1 rounded-full font-medium ${driver.status === "Sudah SIDAK" ? "bg-muted text-foreground hover:bg-muted border-border" : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" } dark:text-red-400`}
                        >
                          {driver.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedDriverId(driver.id);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Riwayat Pemeriksaan Driver</DialogTitle>
            <DialogDescription>
              Detail hasil SIDAK Fatigue untuk periode {selectedMonth}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : detailData?.employee ? (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Employee Info */}
              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <Avatar className="h-12 w-12 flex-none border border-border">
                  <AvatarImage src={fotoKecil(detailData.employee.photoUrl, 192)} alt={detailData.employee.name} className="object-cover" />
                  <AvatarFallback className="bg-card text-sm font-medium text-muted-foreground">
                    {inisial(detailData.employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{detailData.employee.name}</h3>
                  {/* NIK karyawan tersimpan di kolom `id`, bukan `nik` — kolom itu
                      tidak ada di tabel employees, jadi sebelumnya tampil kosong. */}
                  <p className="text-sm text-muted-foreground">
                    {detailData.employee.position || 'Driver'} · {detailData.employee.nik || detailData.employee.id}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-xs text-muted-foreground">Total Temuan</span>
                  <p className="text-xl font-bold">{detailData.records.length}</p>
                </div>
              </div>

              {/* Records List */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-3 pb-4">
                  {detailData.records.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Belum ada data pemeriksaan bulan ini
                    </div>
                  ) : (
                    detailData.records.map((record: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-muted">
                              {record.tanggal}
                            </Badge>
                            <Badge variant="outline" className="bg-muted">
                              {record.waktu}
                            </Badge>
                            <span className="text-xs text-muted-foreground">• {record.lokasi}</span>
                          </div>
                          <Badge className={record.karyawanSiapBekerja ? "bg-muted text-foreground hover:bg-muted" : "bg-red-100 text-red-700 hover:bg-red-200"}>
                            {record.karyawanSiapBekerja ? "FIT" : "UNFIT"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Jam Tidur
                            </span>
                            <span className="font-medium">{record.jamTidur} Jam</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Activity className="w-3 h-3" /> Respon
                            </span>
                            <span className={record.pemeriksaanRespon ? "text-foreground font-medium" : "text-red-600 font-bold"}>
                              {record.pemeriksaanRespon ? "Baik" : "Lambat"}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Konsentrasi</span>
                            <span className={record.pemeriksaanKonsentrasi ? "text-foreground font-medium" : "text-red-600 font-bold"}>
                              {record.pemeriksaanKonsentrasi ? "Fokus" : "Terganggu"}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Kesehatan</span>
                            <span className={record.pemeriksaanKesehatan ? "text-foreground font-medium" : "text-red-600 font-bold"}>
                              {record.pemeriksaanKesehatan ? "Sehat" : "Sakit"}
                            </span>
                          </div>
                        </div>

                        {/* Warnings if any */}
                        {(record.konsumiObat || record.masalahPribadi || record.tidakBolehBekerja) && (
                          <div className="mt-3 pt-3 border-t grid gap-2">
                            {record.konsumiObat && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded flex items-center gap-2 dark:bg-orange-950/40 dark:text-orange-400">
                                ⚠️ Sedang mengonsumsi obat
                              </div>
                            )}
                            {record.masalahPribadi && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded flex items-center gap-2 dark:bg-orange-950/40 dark:text-orange-400">
                                ⚠️ Ada masalah pribadi
                              </div>
                            )}
                            {record.tidakBolehBekerja && (
                              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-2 font-bold dark:bg-red-950/40 dark:text-red-400">
                                ⛔ DILARANG BEKERJA
                              </div>
                            )}
                          </div>
                        )}

                        {/* Intervention Data */}
                        {(record.catatanIntervensi || record.buktiIntervensi) && (
                          <div className="mt-3 pt-3 border-t bg-muted/50 -mx-4 px-4 pb-2">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-2 mt-2">
                              <Pen className="w-3 h-3" /> Tindak Lanjut & Bukti
                            </h4>

                            {record.catatanIntervensi && (
                              <div className="mb-3">
                                <span className="text-xs text-muted-foreground block mb-1">Catatan Intervensi:</span>
                                <p className="text-sm text-foreground bg-card p-2 rounded border border-border">
                                  {record.catatanIntervensi}
                                </p>
                              </div>
                            )}

                            {record.buktiIntervensi && (
                              <div>
                                <span className="text-xs text-muted-foreground block mb-1">Bukti Foto:</span>
                                <div className="relative group overflow-hidden rounded-lg border border-border max-w-sm">
                                  <img
                                    src={record.buktiIntervensi}
                                    alt="Bukti Intervensi"
                                    className="w-full h-auto object-cover max-h-[200px] transition-transform duration-300"
                                  />
                                  <a
                                    href={record.buktiIntervensi}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70"
                                  >
                                    Lihat Full
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="p-4 text-center text-red-500">
              Gagal memuat data driver
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PieChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  )
}
