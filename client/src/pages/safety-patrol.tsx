import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Shield,
  FileText,
  RefreshCw,
  Trash2,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  LayoutList,
  Download,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  Activity,
  ChevronRight,
  Search,
  Filter,
  BarChart2,
} from "lucide-react";
import * as XLSX from "xlsx";
import SafetyPatrolTemplates from "@/components/safety-patrol-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageWithFallback, PhotoThumbnail } from "@/components/ui/image-with-fallback";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SafetyPatrolAttendance {
  id: string;
  reportId: string;
  unitCode: string;
  shift: string;
  status: string;
  keterangan: string | null;
}

interface SafetyPatrolReport {
  id: string;
  tanggal: string;
  bulan: string | null;
  week: number | null;
  waktuPelaksanaan: string | null;
  jenisLaporan: string;
  kegiatan: string | null;
  shift: string | null;
  lokasi: string | null;
  namaPelaksana: string | null;
  pemateri: string[] | null;
  temuan: string | null;
  buktiKegiatan: string[] | null;
  rawMessage: string;
  parsedData: any;
  photos: string[] | null;
  senderPhone: string;
  senderName: string | null;
  status: string;
  aiAnalysis: string | null;
  createdAt: string;
  attendance: SafetyPatrolAttendance[];
}

interface StatsData {
  totalReports: number;
  reportsByType: Record<string, number>;
  reportsByDate: Record<string, number>;
  recentReports: SafetyPatrolReport[];
}

const ACTIVITY_COLORS: Record<string, string> = {
  "Daily Briefing": "bg-blue-100 text-blue-800 border-blue-200",
  "Temuan": "bg-orange-100 text-orange-800 border-orange-200",
  "Pelanggaran": "bg-red-100 text-red-800 border-red-200",
  "Inspeksi": "bg-purple-100 text-purple-800 border-purple-200",
  "Sidak Fatigue Driver": "bg-amber-100 text-amber-800 border-amber-200",
  "Safety Meeting": "bg-teal-100 text-teal-800 border-teal-200",
  "Safety Meeting Patrol": "bg-teal-100 text-teal-800 border-teal-200",
  "Koordinasi Bersama Pengawas Area": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function getActivityColor(activity: string): string {
  return ACTIVITY_COLORS[activity] || "bg-gray-100 text-gray-700 border-gray-200";
}

export default function SafetyPatrol() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<SafetyPatrolReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const { data: reports, isLoading, refetch } = useQuery<SafetyPatrolReport[]>({
    queryKey: ['/api/safety-patrol/reports'],
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<StatsData>({
    queryKey: ['/api/safety-patrol/stats'],
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/safety-patrol/reports/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Laporan berhasil dihapus" });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/stats'] });
    },
  });

  const batchReparseMutation = useMutation({
    mutationFn: async () => apiRequest("/api/safety-patrol/batch-reparse?limit=50", "POST"),
    onSuccess: (data) => {
      toast({ title: "Re-parse Selesai", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
    },
  });

  const reParseAllMutation = useMutation({
    mutationFn: async () => apiRequest("/api/safety-patrol/batch-reparse?limit=500", "POST"),
    onSuccess: (data) => {
      toast({ title: "Re-parse Semua Selesai", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
    },
  });

  const cleanupJunkMutation = useMutation({
    mutationFn: async () => apiRequest("/api/safety-patrol/cleanup-junk", "POST"),
    onSuccess: (data) => {
      toast({ title: "Pembersihan Selesai", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/stats'] });
    },
  });

  const reparseMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/safety-patrol/reports/${id}/reparse`, "POST"),
    onSuccess: (data) => {
      toast({ title: "Berhasil", description: "Laporan diproses ulang" });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
      if (data) setSelectedReport(data);
    },
  });

  const emptyCount = reports?.filter(r => r.rawMessage && (!r.waktuPelaksanaan || !r.lokasi || !r.shift)).length ?? 0;

  const filteredReports = reports?.filter(report => {
    if (typeFilter !== "all" && report.jenisLaporan !== typeFilter) return false;
    if (activityFilter !== "all" && report.kegiatan !== activityFilter) return false;
    if (dateFrom && report.tanggal < dateFrom) return false;
    if (dateTo && report.tanggal > dateTo) return false;
    return true;
  }) || [];

  const uniqueActivities = Array.from(new Set(reports?.map(r => r.kegiatan).filter(Boolean))) as string[];

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: idLocale });
    } catch { return dateStr; }
  };

  const handleViewDetail = (report: SafetyPatrolReport) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const handleExportExcel = () => {
    if (!filteredReports?.length) {
      toast({ title: "Info", description: "Tidak ada data untuk diekspor" });
      return;
    }
    // Jadikan URL foto absolut agar bisa diklik dari Excel.
    const toAbsUrl = (u: string) =>
      /^https?:\/\//i.test(u) ? u : `${window.location.origin}${u.startsWith("/") ? "" : "/"}${u}`;

    // Banyak foto per laporan -> kolom terpisah "Foto 1..N" (dibatasi 10 agar tidak terlalu lebar).
    const fotosOf = (r: SafetyPatrolReport) => (r.buktiKegiatan || r.photos || []) as string[];
    const maxFotos = Math.min(10, filteredReports.reduce((m, r) => Math.max(m, fotosOf(r).length), 0));

    const rows = filteredReports.map(r => {
      const base: Record<string, string> = {
        Tanggal: formatDate(r.tanggal),
        Bulan: r.bulan || "-",
        Week: r.week ? `W${r.week}` : "-",
        Waktu: r.waktuPelaksanaan || "-",
        Shift: r.shift || "-",
        Lokasi: r.lokasi || "-",
        Kegiatan: r.kegiatan || r.jenisLaporan,
        Pelaksana: r.namaPelaksana || r.senderName || "-",
        Temuan: r.temuan || "-",
        Status: r.status,
      };
      const fotos = fotosOf(r);
      for (let i = 0; i < maxFotos; i++) {
        base[`Foto ${i + 1}`] = fotos[i] ? `Foto ${i + 1}` : "";
      }
      return base;
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Pasang hyperlink (cell.l) pada sel kolom Foto yang ada isinya.
    const headerKeys = Object.keys(rows[0] || {});
    filteredReports.forEach((r, ri) => {
      const fotos = fotosOf(r);
      for (let i = 0; i < maxFotos; i++) {
        if (!fotos[i]) continue;
        const colIdx = headerKeys.indexOf(`Foto ${i + 1}`);
        if (colIdx < 0) continue;
        const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: colIdx }); // +1: baris header
        if (ws[cellRef]) {
          ws[cellRef].l = { Target: toAbsUrl(fotos[i]), Tooltip: "Buka foto kegiatan" };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Safety Patrol");
    XLSX.writeFile(wb, `Safety_Patrol_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Berhasil", description: "File Excel berhasil diunduh" });
  };

  const briefingCount = stats?.reportsByType?.["Daily Briefing"] || 0;
  const temuanCount = stats?.reportsByType?.["Temuan"] || 0;
  const otherCount = Object.entries(stats?.reportsByType || {})
    .filter(([k]) => !["Daily Briefing", "Temuan"].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  const isAnyParsing = batchReparseMutation.isPending || reParseAllMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <div className="bg-white border-b px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Safety Patrol Dashboard</h1>
              <p className="text-sm text-gray-500">Rekap laporan dari WhatsApp secara real-time</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700">
              <a href="/workspace/safety-patrol/kpi">
                <BarChart2 className="h-4 w-4 mr-1.5" />
                KPI Evaluasi
              </a>
            </Button>
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="h-9">
              <Download className="h-4 w-4 mr-1.5" />
              Export Excel
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="h-10 bg-white border">
            <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <LayoutList className="h-4 w-4" />
              Laporan
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <BookOpen className="h-4 w-4" />
              Knowledge Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-5 space-y-5">

            {/* ── STAT CARDS ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Laporan", value: stats?.totalReports || 0, color: "text-gray-900", bg: "bg-white", icon: <FileText className="h-5 w-5 text-gray-400" />, border: "border" },
                { label: "Daily Briefing", value: briefingCount, color: "text-blue-700", bg: "bg-blue-50", icon: <MessageSquare className="h-5 w-5 text-blue-500" />, border: "border-blue-100" },
                { label: "Temuan", value: temuanCount, color: "text-orange-700", bg: "bg-orange-50", icon: <AlertTriangle className="h-5 w-5 text-orange-500" />, border: "border-orange-100" },
                { label: "Laporan Lain", value: otherCount, color: "text-gray-700", bg: "bg-gray-50", icon: <Activity className="h-5 w-5 text-gray-400" />, border: "border" },
              ].map((s) => (
                <Card key={s.label} className={`${s.bg} ${s.border} shadow-none`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
                      {s.icon}
                    </div>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── WEBHOOK INFO ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <MessageSquare className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-blue-700 font-medium">Webhook URL:</span>
              <code className="text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded text-xs break-all flex-1">
                {window.location.origin}/api/webhook/whatsapp
              </code>
            </div>

            {/* ── FILTER BAR ───────────────────────────────────────── */}
            <Card className="shadow-none border">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Filter className="h-4 w-4" />
                    Filter
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Dari Tanggal</span>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Sampai Tanggal</span>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Jenis Laporan</span>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 w-44 text-sm">
                        <SelectValue placeholder="Semua Jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        <SelectItem value="Daily Briefing">Daily Briefing</SelectItem>
                        <SelectItem value="Temuan">Temuan</SelectItem>
                        <SelectItem value="Pelanggaran">Pelanggaran</SelectItem>
                        <SelectItem value="Laporan Umum">Laporan Umum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Kegiatan</span>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger className="h-8 w-52 text-sm">
                        <SelectValue placeholder="Semua Kegiatan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kegiatan</SelectItem>
                        {uniqueActivities.sort().map(a => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(dateFrom || dateTo || typeFilter !== "all" || activityFilter !== "all") && (
                    <Button variant="ghost" size="sm" className="h-8 text-sm text-gray-500"
                      onClick={() => { setDateFrom(""); setDateTo(""); setTypeFilter("all"); setActivityFilter("all"); }}>
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── REPORTS TABLE ────────────────────────────────────── */}
            <Card className="shadow-none border">
              <CardHeader className="px-5 py-4 border-b bg-gray-50/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-gray-800">
                      Daftar Laporan
                      <span className="ml-2 text-gray-400 font-normal text-sm">({filteredReports.length})</span>
                    </h2>
                    {emptyCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        {emptyCount} belum ter-parse
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => batchReparseMutation.mutate()}
                      disabled={isAnyParsing || emptyCount === 0}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${batchReparseMutation.isPending ? 'animate-spin' : ''}`} />
                      Re-parse 50
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
                      onClick={() => reParseAllMutation.mutate()}
                      disabled={isAnyParsing || emptyCount === 0}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${reParseAllMutation.isPending ? 'animate-spin' : ''}`} />
                      {reParseAllMutation.isPending ? "Memproses..." : `Re-parse Semua (${emptyCount})`}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs"
                      onClick={() => confirm("Hapus semua laporan yang hampir semua fieldnya kosong?") && cleanupJunkMutation.mutate()}
                      disabled={cleanupJunkMutation.isPending}>
                      <Trash2 className={`h-3.5 w-3.5 mr-1.5 ${cleanupJunkMutation.isPending ? 'animate-spin' : ''}`} />
                      Hapus Non-Laporan
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <RefreshCw className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm">Memuat data laporan...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                    <p className="font-medium text-gray-500">Belum ada laporan masuk</p>
                    <p className="text-sm mt-1">Kirim pesan ke WhatsApp untuk mulai</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b hover:bg-gray-50">
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide w-[110px] pl-5">Tanggal</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide w-[100px]">Waktu</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide w-[80px]">Shift</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lokasi</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kegiatan</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pelaksana</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide w-[80px]">Foto</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Temuan</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wide w-[80px] pr-5 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((report) => (
                          <TableRow
                            key={report.id}
                            className="cursor-pointer hover:bg-orange-50/40 transition-colors border-b"
                            onClick={() => handleViewDetail(report)}
                          >
                            {/* Tanggal */}
                            <TableCell className="pl-5 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-800">{formatDate(report.tanggal)}</span>
                                <span className="text-xs text-gray-400">{report.bulan} · W{report.week || '-'}</span>
                              </div>
                            </TableCell>

                            {/* Waktu */}
                            <TableCell className="py-3">
                              <span className="text-sm text-gray-600">{report.waktuPelaksanaan || <span className="text-gray-300">—</span>}</span>
                            </TableCell>

                            {/* Shift */}
                            <TableCell className="py-3">
                              {report.shift ? (
                                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${report.shift === 'Shift 1' || report.shift === 'SHIFT 1' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                                  {report.shift.replace('SHIFT ', 'S')}
                                </span>
                              ) : <span className="text-gray-300 text-sm">—</span>}
                            </TableCell>

                            {/* Lokasi */}
                            <TableCell className="py-3 max-w-[140px]">
                              {report.lokasi ? (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span className="text-sm text-gray-700 truncate" title={report.lokasi}>{report.lokasi}</span>
                                </div>
                              ) : <span className="text-gray-300 text-sm">—</span>}
                            </TableCell>

                            {/* Kegiatan */}
                            <TableCell className="py-3">
                              <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${getActivityColor(report.kegiatan || report.jenisLaporan)}`}>
                                {report.kegiatan || report.jenisLaporan}
                              </span>
                            </TableCell>

                            {/* Pelaksana */}
                            <TableCell className="py-3">
                              {(report.namaPelaksana || report.senderName) ? (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span className="text-sm text-gray-700 truncate max-w-[120px]" title={report.namaPelaksana || report.senderName || ''}>
                                    {report.namaPelaksana || report.senderName}
                                  </span>
                                </div>
                              ) : <span className="text-gray-300 text-sm">—</span>}
                            </TableCell>

                            {/* Foto */}
                            <TableCell className="py-3">
                              {report.buktiKegiatan?.length ? (
                                <div className="flex items-center gap-1">
                                  {report.buktiKegiatan.slice(0, 2).map((url, idx) => (
                                    <PhotoThumbnail
                                      key={idx}
                                      photo={url}
                                      index={idx}
                                      className="w-9 h-9"
                                      onClick={() => {
                                        window.open(url, '_blank');
                                      }}
                                    />
                                  ))}
                                  {report.buktiKegiatan.length > 2 && (
                                    <span className="text-xs text-gray-500 font-medium">+{report.buktiKegiatan.length - 2}</span>
                                  )}
                                </div>
                              ) : <span className="text-gray-300 text-sm">—</span>}
                            </TableCell>

                            {/* Temuan */}
                            <TableCell className="py-3 max-w-[160px]">
                              {report.temuan ? (
                                <p className="text-sm text-gray-700 truncate" title={report.temuan}>{report.temuan}</p>
                              ) : <span className="text-gray-300 text-sm">—</span>}
                            </TableCell>

                            {/* Aksi */}
                            <TableCell className="py-3 pr-5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-orange-100"
                                  onClick={e => { e.stopPropagation(); handleViewDetail(report); }}>
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-100"
                                  onClick={e => { e.stopPropagation(); if (confirm("Hapus laporan ini?")) deleteMutation.mutate(report.id); }}>
                                  <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── DETAIL DIALOG ────────────────────────────────────── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <div className="flex items-center justify-between pr-6">
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-orange-500" />
                      {selectedReport?.kegiatan || selectedReport?.jenisLaporan}
                      <span className="text-xs font-normal text-gray-400">· {selectedReport && formatDate(selectedReport.tanggal)}</span>
                    </DialogTitle>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => selectedReport && reparseMutation.mutate(selectedReport.id)}
                      disabled={reparseMutation.isPending}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${reparseMutation.isPending ? 'animate-spin' : ''}`} />
                      Re-parse AI
                    </Button>
                  </div>
                </DialogHeader>

                {selectedReport && (
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-9">
                      <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                      <TabsTrigger value="attendance" className="text-xs">Kehadiran ({selectedReport.attendance?.length || 0})</TabsTrigger>
                      <TabsTrigger value="raw" className="text-xs">Pesan Asli</TabsTrigger>
                      <TabsTrigger value="ai" className="text-xs">Analisis AI</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="mt-4">
                      <ScrollArea className="h-[420px] pr-1">
                        {/* Key Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { label: "Tanggal", value: formatDate(selectedReport.tanggal), icon: <Calendar className="h-3.5 w-3.5" /> },
                            { label: "Waktu", value: selectedReport.waktuPelaksanaan, icon: <Clock className="h-3.5 w-3.5" /> },
                            { label: "Shift", value: selectedReport.shift, icon: <Activity className="h-3.5 w-3.5" /> },
                            { label: "Lokasi", value: selectedReport.lokasi, icon: <MapPin className="h-3.5 w-3.5" /> },
                            { label: "Pelaksana", value: selectedReport.namaPelaksana || selectedReport.senderName, icon: <User className="h-3.5 w-3.5" /> },
                            { label: "Pengirim WA", value: selectedReport.senderName || selectedReport.senderPhone, icon: <MessageSquare className="h-3.5 w-3.5" /> },
                          ].map(item => (
                            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                                {item.icon}
                                {item.label}
                              </div>
                              <p className="text-sm font-medium text-gray-800">{item.value || <span className="text-gray-300 font-normal">—</span>}</p>
                            </div>
                          ))}
                        </div>

                        {/* Kegiatan Badge */}
                        <div className="mb-4">
                          <span className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-full border ${getActivityColor(selectedReport.kegiatan || selectedReport.jenisLaporan)}`}>
                            {selectedReport.kegiatan || selectedReport.jenisLaporan}
                          </span>
                        </div>

                        {/* Temuan */}
                        {selectedReport.temuan && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                            <p className="text-xs font-medium text-orange-600 mb-1 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> Temuan
                            </p>
                            <p className="text-sm text-orange-900">{selectedReport.temuan}</p>
                          </div>
                        )}

                        {/* Pemateri */}
                        {selectedReport.pemateri && selectedReport.pemateri.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Pemateri</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedReport.pemateri.map((p, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Foto Bukti */}
                        {selectedReport.buktiKegiatan?.length ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Bukti Kegiatan ({selectedReport.buktiKegiatan.length} foto)</p>
                            <div className="grid grid-cols-3 gap-2">
                              {selectedReport.buktiKegiatan.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                  className="relative group block overflow-hidden rounded-lg border bg-gray-50 h-24">
                                  <ImageWithFallback src={url} alt={`Foto ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    fallbackClassName="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs bg-gray-50"
                                    index={idx} showClickHint accentColor="blue" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                                    <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-4">
                      <ScrollArea className="h-[380px]">
                        {selectedReport.attendance?.length ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="text-xs">Unit</TableHead>
                                <TableHead className="text-xs">Shift</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Keterangan</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedReport.attendance.map(att => (
                                <TableRow key={att.id}>
                                  <TableCell className="font-medium text-sm">{att.unitCode}</TableCell>
                                  <TableCell className="text-sm">{att.shift}</TableCell>
                                  <TableCell>
                                    <Badge variant={att.status === "Hadir" ? "default" : "secondary"} className="text-xs">
                                      {att.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-500">{att.keterangan || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-12 text-gray-400">
                            <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Tidak ada data kehadiran unit</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="raw" className="mt-4">
                      <ScrollArea className="h-[380px]">
                        <pre className="text-xs whitespace-pre-wrap bg-gray-50 border rounded-lg p-4 text-gray-700 leading-relaxed">
                          {selectedReport.rawMessage}
                        </pre>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="ai" className="mt-4">
                      <ScrollArea className="h-[380px]">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                          <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Analisis AI</p>
                          <p className="text-sm text-blue-900 leading-relaxed">
                            {selectedReport.aiAnalysis || <span className="text-blue-400 italic">Tidak ada analisis tersedia</span>}
                          </p>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>

          </TabsContent>

          <TabsContent value="templates" className="mt-5">
            <SafetyPatrolTemplates />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
