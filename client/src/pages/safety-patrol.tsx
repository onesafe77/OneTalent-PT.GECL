import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Shield,
  Calendar,
  Users,
  FileText,
  RefreshCw,
  Trash2,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  BookOpen,
  LayoutList,
  Download
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
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
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
    refetchInterval: 30000, // Auto-refresh setiap 30 detik
  });

  const { data: stats } = useQuery<StatsData>({
    queryKey: ['/api/safety-patrol/stats'],
    refetchInterval: 30000, // Auto-refresh setiap 30 detik
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/safety-patrol/reports/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Laporan berhasil dihapus" });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/stats'] });
    },
    onError: () => {
      toast({ title: "Gagal", description: "Gagal menghapus laporan", variant: "destructive" });
    }
  });

  const batchReparseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/safety-patrol/batch-reparse?limit=20", "POST");
    },
    onSuccess: (data) => {
      toast({ title: "Batch Re-parse Selesai", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/stats'] });
    },
    onError: () => {
      toast({ title: "Gagal", description: "Batch re-parse gagal", variant: "destructive" });
    }
  });

  const reparseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/safety-patrol/reports/${id}/reparse`, "POST");
    },
    onSuccess: (data) => {
      toast({ title: "Berhasil", description: "Laporan berhasil diproses ulang dengan AI" });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/safety-patrol/stats'] });
      if (data) {
        setSelectedReport(data);
      }
    },
    onError: () => {
      toast({ title: "Gagal", description: "Gagal memproses ulang laporan", variant: "destructive" });
    }
  });

  const filteredReports = reports?.filter(report => {
    if (typeFilter !== "all" && report.jenisLaporan !== typeFilter) return false;
    if (activityFilter !== "all" && report.kegiatan !== activityFilter) return false;
    if (dateFrom && report.tanggal < dateFrom) return false;
    if (dateTo && report.tanggal > dateTo) return false;
    return true;
  }) || [];

  // Mendapatkan daftar kegiatan unik untuk filter
  const uniqueActivities = Array.from(new Set(reports?.map(r => r.kegiatan).filter(Boolean))) as string[];

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  const handleViewDetail = (report: SafetyPatrolReport) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const handleExportExcel = () => {
    if (!filteredReports || filteredReports.length === 0) {
      toast({ title: "Info", description: "Tidak ada data untuk diekspor" });
      return;
    }

    try {
      const dataToExport = filteredReports.map(report => ({
        Tanggal: formatDate(report.tanggal),
        Bulan: report.bulan || "-",
        Week: report.week || "-",
        Waktu: report.waktuPelaksanaan || "-",
        Shift: report.shift || "-",
        Lokasi: report.lokasi || "-",
        Kategori: report.jenisLaporan,
        Kegiatan: report.kegiatan || "-",
        Pelaksana: report.namaPelaksana || report.senderName || "-",
        Temuan: report.temuan || "-",
        "Bukti Kegiatan": report.buktiKegiatan?.join(", ") || "-",
        Status: report.status
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Safety Patrol");
      XLSX.writeFile(wb, `Safety_Patrol_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      toast({ title: "Berhasil", description: "File Excel berhasil diunduh" });
    } catch (error) {
      console.error("Export Error:", error);
      toast({ title: "Gagal", description: "Gagal mengekspor data", variant: "destructive" });
    }
  };

  const webhookUrl = `${window.location.origin}/api/webhook/whatsapp`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            Safety Patrol Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Rekap laporan Safety Patrol dari WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
            <LayoutList className="h-4 w-4" />
            Laporan
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2" data-testid="tab-templates">
            <BookOpen className="h-4 w-4" />
            Knowledge Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6 space-y-6">
          {/* Webhook URL Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Webhook URL untuk notif.my.id</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Salin URL berikut dan paste di dashboard notif.my.id:
                  </p>
                  <code className="block mt-2 p-2 bg-white rounded border text-sm break-all">
                    {webhookUrl}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Laporan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.totalReports || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Daily Briefing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.reportsByType?.["Daily Briefing"] || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Temuan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.reportsByType?.["Temuan"] || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Laporan Lain</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-600">
                  {Object.entries(stats?.reportsByType || {})
                    .filter(([key]) => !["Daily Briefing", "Temuan"].includes(key))
                    .reduce((sum, [, count]) => sum + count, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Dari Tanggal</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sampai Tanggal</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Jenis Laporan</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
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
            <div>
              <label className="text-sm font-medium mb-1 block">Kegiatan</label>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Semua Kegiatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kegiatan</SelectItem>
                  {uniqueActivities.sort().map(activity => (
                    <SelectItem key={activity} value={activity}>{activity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); setTypeFilter("all"); setActivityFilter("all"); }}>
              Reset Filter
            </Button>
          </div>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Daftar Laporan ({filteredReports.length})
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchReparseMutation.mutate()}
                  disabled={batchReparseMutation.isPending}
                  title="Re-parse laporan yang info-nya masih kosong (maks 20 per klik)"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${batchReparseMutation.isPending ? 'animate-spin' : ''}`} />
                  {batchReparseMutation.isPending ? "Memproses..." : "Re-parse Kosong"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Memuat data...</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Belum ada laporan masuk</p>
                  <p className="text-sm mt-2">Kirim pesan ke WhatsApp untuk mulai</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Tanggal</TableHead>
                        <TableHead className="min-w-[80px]">Bulan</TableHead>
                        <TableHead className="min-w-[60px]">Week</TableHead>
                        <TableHead className="min-w-[100px]">Waktu</TableHead>
                        <TableHead className="min-w-[60px]">Shift</TableHead>
                        <TableHead className="min-w-[120px]">Lokasi</TableHead>
                        <TableHead className="min-w-[140px]">Kegiatan</TableHead>
                        <TableHead className="min-w-[120px]">Pelaksana</TableHead>
                        <TableHead className="min-w-[80px]">Bukti</TableHead>
                        <TableHead className="min-w-[150px]">Temuan</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[80px] text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow
                          key={report.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleViewDetail(report)}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatDate(report.tanggal)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {report.bulan || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {report.week ? `W${report.week}` : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {report.waktuPelaksanaan || "-"}
                          </TableCell>
                          <TableCell>{report.shift || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={report.lokasi || ""}>
                            {report.lokasi || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={report.kegiatan ? "default" : "secondary"} className="whitespace-nowrap">
                              {report.kegiatan || report.jenisLaporan}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {report.namaPelaksana || report.senderName || "-"}
                          </TableCell>
                          <TableCell>
                            {report.buktiKegiatan?.length ? (
                              <div className="flex items-center gap-1">
                                {report.buktiKegiatan.slice(0, 2).map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="block w-10 h-10 rounded border overflow-hidden bg-gray-100 hover:opacity-80"
                                  >
                                    <img
                                      src={url}
                                      alt={`Foto ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "";
                                        (e.target as HTMLImageElement).className = "hidden";
                                      }}
                                    />
                                  </a>
                                ))}
                                {report.buktiKegiatan.length > 2 && (
                                  <span className="text-xs text-gray-500">+{report.buktiKegiatan.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={report.temuan || ""}>
                            {report.temuan || "-"}
                          </TableCell>
                          <TableCell>
                            {report.status === "processed" ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            ) : report.status === "failed" ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                <XCircle className="h-3 w-3 mr-1" />
                                Gagal
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); handleViewDetail(report); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Hapus laporan ini?")) {
                                    deleteMutation.mutate(report.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* Detail Dialog */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detail Laporan - {selectedReport?.jenisLaporan}
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedReport && reparseMutation.mutate(selectedReport.id)}
                    disabled={reparseMutation.isPending}
                    data-testid="button-reparse"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${reparseMutation.isPending ? 'animate-spin' : ''}`} />
                    {reparseMutation.isPending ? "Memproses..." : "Re-parse AI"}
                  </Button>
                </div>
              </DialogHeader>

              {selectedReport && (
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info">Info</TabsTrigger>
                    <TabsTrigger value="attendance">Kehadiran ({selectedReport.attendance?.length || 0})</TabsTrigger>
                    <TabsTrigger value="raw">Pesan Asli</TabsTrigger>
                    <TabsTrigger value="ai">Analisis AI</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4 space-y-4">
                    <ScrollArea className="h-[350px]">
                      <div className="grid grid-cols-3 gap-4 pr-4">
                        <div>
                          <p className="text-sm text-gray-500">Tanggal</p>
                          <p className="font-medium">{formatDate(selectedReport.tanggal)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Bulan</p>
                          <p className="font-medium">{selectedReport.bulan || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Week</p>
                          <p className="font-medium">{selectedReport.week ? `Minggu ke-${selectedReport.week}` : "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Waktu Pelaksanaan</p>
                          <p className="font-medium">{selectedReport.waktuPelaksanaan || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Shift</p>
                          <p className="font-medium">{selectedReport.shift || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Lokasi</p>
                          <p className="font-medium">{selectedReport.lokasi || "-"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Kegiatan</p>
                          <Badge variant="default" className="mt-1">{selectedReport.kegiatan || selectedReport.jenisLaporan}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Pelaksana</p>
                          <p className="font-medium">{selectedReport.namaPelaksana || selectedReport.senderName || "-"}</p>
                        </div>
                      </div>

                      {selectedReport.temuan && (
                        <div className="mt-4 bg-yellow-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-500 mb-1">Temuan</p>
                          <p className="font-medium text-yellow-800">{selectedReport.temuan}</p>
                        </div>
                      )}

                      {selectedReport.pemateri && selectedReport.pemateri.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Pemateri</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.pemateri.map((p, idx) => (
                              <Badge key={idx} variant="outline">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedReport.buktiKegiatan?.length ? (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Bukti Kegiatan</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {selectedReport.buktiKegiatan.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative group block overflow-hidden rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors h-24"
                              >
                                <ImageWithFallback
                                  src={url}
                                  alt={`Foto ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  fallbackClassName="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs bg-gray-50"
                                  index={idx}
                                  showClickHint={true}
                                  accentColor="blue"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-500">Pengirim WhatsApp</p>
                        <p className="font-medium">{selectedReport.senderName || selectedReport.senderPhone}</p>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="attendance" className="mt-4">
                    <ScrollArea className="h-[300px]">
                      {selectedReport.attendance && selectedReport.attendance.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Unit</TableHead>
                              <TableHead>Shift</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Keterangan</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReport.attendance.map((att) => (
                              <TableRow key={att.id}>
                                <TableCell className="font-medium">{att.unitCode}</TableCell>
                                <TableCell>{att.shift}</TableCell>
                                <TableCell>
                                  <Badge variant={att.status === "Hadir" ? "default" : "secondary"}>
                                    {att.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{att.keterangan || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-gray-500 py-8">Tidak ada data kehadiran</p>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="raw" className="mt-4">
                    <ScrollArea className="h-[300px]">
                      <pre className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                        {selectedReport.rawMessage}
                      </pre>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="ai" className="mt-4">
                    <ScrollArea className="h-[300px]">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">Analisis Gemini AI:</p>
                        <p className="text-sm text-blue-800">
                          {selectedReport.aiAnalysis || "Tidak ada analisis tersedia"}
                        </p>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <SafetyPatrolTemplates />
        </TabsContent>
      </Tabs>
    </div >
  );
}
