
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subMonths, startOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, LabelList
} from "recharts";
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
    Download,
    ClipboardList,
    AlertTriangle,
    File
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SickLeave {
    id: string;
    name: string;
    nik: string | null;
    position: string | null;
    date: string;
    reason: string;
    status: string;
    attachmentUrl: string | null;
    attachmentType: string | null;
    aiConfidence: number | null;
    originalMessage: string;
    aiAnalysis: any;
    created_at: string;
}

interface StatsData {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    thisMonth: number;
}

export default function SickLeavePage() {
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedLeave, setSelectedLeave] = useState<SickLeave | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const { toast } = useToast();

    const { data: leaves, isLoading, refetch } = useQuery<SickLeave[]>({
        queryKey: ['/api/hse/sick-leaves'],
        refetchInterval: 30000,
    });

    const { data: stats } = useQuery<StatsData>({
        queryKey: ['/api/hse/sick-leaves/stats'],
        refetchInterval: 30000,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest(`/api/hse/sick-leaves/${id}`, "DELETE");
        },
        onSuccess: () => {
            toast({ title: "Berhasil", description: "Data berhasil dihapus" });
            queryClient.invalidateQueries({ queryKey: ['/api/hse/sick-leaves'] });
            queryClient.invalidateQueries({ queryKey: ['/api/hse/sick-leaves/stats'] });
            setDetailOpen(false);
        },
        onError: () => {
            toast({ title: "Gagal", description: "Gagal menghapus data", variant: "destructive" });
        }
    });

    // --- Chart Data ---
    const statusChartData = [
        { name: "Menunggu", value: stats?.pending || 0, color: "#f59e0b" },
        { name: "Disetujui", value: stats?.approved || 0, color: "#22c55e" },
        { name: "Ditolak", value: stats?.rejected || 0, color: "#ef4444" },
    ].filter(d => d.value > 0);

    const monthlyChartData = (() => {
        const months: { label: string; key: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(startOfMonth(new Date()), i);
            months.push({
                label: format(d, "MMM yy", { locale: idLocale }),
                key: format(d, "yyyy-MM"),
                count: 0,
            });
        }
        (leaves || []).forEach(l => {
            const key = l.date.slice(0, 7);
            const m = months.find(m => m.key === key);
            if (m) m.count++;
        });
        return months.map(({ label, count }) => ({ bulan: label, jumlah: count }));
    })();

    const topEmployeesData = (() => {
        const map: Record<string, number> = {};
        (leaves || []).forEach(l => { map[l.name] = (map[l.name] || 0) + 1; });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, jumlah]) => ({ name: name.length > 16 ? name.slice(0, 15) + "…" : name, jumlah }));
    })();

    const confidenceChartData = (() => {
        let tinggi = 0, sedang = 0, rendah = 0, tidakAda = 0;
        (leaves || []).forEach(l => {
            if (l.aiConfidence == null) tidakAda++;
            else if (l.aiConfidence >= 80) tinggi++;
            else if (l.aiConfidence >= 50) sedang++;
            else rendah++;
        });
        return [
            { label: "Tinggi (≥80%)", jumlah: tinggi, color: "#22c55e" },
            { label: "Sedang (50–79%)", jumlah: sedang, color: "#f59e0b" },
            { label: "Rendah (<50%)", jumlah: rendah, color: "#ef4444" },
            { label: "Tidak Ada", jumlah: tidakAda, color: "#9ca3af" },
        ];
    })();

    const filteredLeaves = leaves?.filter(leave => {
        if (statusFilter !== "all" && leave.status !== statusFilter) return false;
        if (dateFrom && leave.date < dateFrom) return false;
        if (dateTo && leave.date > dateTo) return false;
        return true; // Search query logic can be added here
    }) || [];

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "dd MMM yyyy", { locale: idLocale });
        } catch {
            return dateStr;
        }
    };

    const handleViewDetail = (leave: SickLeave) => {
        setSelectedLeave(leave);
        setDetailOpen(true);
    };

    const handleExportExcel = () => {
        if (!filteredLeaves || filteredLeaves.length === 0) {
            toast({ title: "Info", description: "Tidak ada data untuk diekspor" });
            return;
        }

        try {
            const dataToExport = filteredLeaves.map((l) => ({
                "Tanggal": format(new Date(l.date), "yyyy-MM-dd"),
                "NIK": l.nik || "-",
                "Nama Karyawan": l.name,
                "Jabatan": l.position || "-",
                "Alasan": l.reason,
                "Status": l.status,
                "AI Confidence": l.aiConfidence ? `${(l.aiConfidence).toFixed(0)}%` : "-",
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ijin Sakit");
            XLSX.writeFile(wb, `Ijin_Sakit_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

            toast({ title: "Berhasil", description: "File Excel berhasil diunduh" });
        } catch (error) {
            console.error("Export Error:", error);
            toast({ title: "Gagal", description: "Gagal mengekspor data", variant: "destructive" });
        }
    };

    const webhookUrl = `${window.location.origin}/api/webhook/whatsapp`;

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
                return <Badge className="bg-green-100 text-green-800 border-green-200">Disetujui</Badge>;
            case "rejected":
                return <Badge className="bg-red-100 text-red-800 border-red-200">Ditolak</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Menunggu</Badge>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-6 w-6 text-orange-500" />
                        Data Ijin Sakit (WhatsApp)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Monitoring ijin sakit yang masuk via WhatsApp Gateway
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

            {/* Webhook URL Info */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-blue-900">Webhook URL</p>
                            <p className="text-sm text-blue-700 mt-1">
                                Gunakan URL ini di notif.my.id untuk menerima pesan WhatsApp:
                            </p>
                            <code className="block mt-2 p-2 bg-white rounded border text-sm break-all font-mono text-gray-700">
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
                        <CardTitle className="text-sm font-medium text-gray-500">Total Pengajuan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats?.total || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Menunggu Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-yellow-600">
                            {stats?.pending || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Bulan Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-600">
                            {stats?.thisMonth || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Disetujui</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">
                            {stats?.approved || 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            {leaves && leaves.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pie: Distribusi Status */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Distribusi Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={statusChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={85}
                                        innerRadius={45}
                                        label={({ name, value, percent }) =>
                                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                                        }
                                        labelLine={true}
                                    >
                                        {statusChartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => [`${v} pengajuan`]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Bar: Tren Bulanan */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Tren 6 Bulan Terakhir</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={monthlyChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [`${v} pengajuan`, "Jumlah"]} />
                                    <Bar dataKey="jumlah" fill="#f97316" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="jumlah" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Horizontal Bar: Top 5 Karyawan */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Top 5 Karyawan Paling Sering Sakit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={topEmployeesData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                                    <Tooltip formatter={(v: number) => [`${v} pengajuan`, "Jumlah"]} />
                                    <Bar dataKey="jumlah" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="jumlah" position="right" style={{ fontSize: 12, fontWeight: 700, fill: "#1d4ed8" }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Bar: Distribusi AI Confidence */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Distribusi AI Confidence</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={confidenceChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [`${v} pengajuan`, "Jumlah"]} />
                                    <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="jumlah" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} />
                                        {confidenceChartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg border">
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
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="Pending">Menunggu</SelectItem>
                            <SelectItem value="Approved">Disetujui</SelectItem>
                            <SelectItem value="Rejected">Ditolak</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); }}>
                    Reset Filter
                </Button>
            </div>

            {/* Reports Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Daftar Ijin Sakit ({filteredLeaves.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">Memuat data...</div>
                    ) : filteredLeaves.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Belum ada data ijin sakit</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>NIK</TableHead>
                                        <TableHead>Nama Karyawan</TableHead>
                                        <TableHead>Jabatan</TableHead>
                                        <TableHead>Alasan</TableHead>
                                        <TableHead>Lampiran</TableHead>
                                        <TableHead>AI Confidence</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLeaves.map((leave) => (
                                        <TableRow key={leave.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewDetail(leave)}>
                                            <TableCell className="font-medium">
                                                {format(new Date(leave.date), "dd MMM yyyy", { locale: idLocale })}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{leave.nik || "-"}</TableCell>
                                            <TableCell className="font-bold">{leave.name}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{leave.position || "-"}</TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <span className="truncate block">{leave.reason}</span>
                                            </TableCell>
                                            <TableCell>
                                                {leave.attachmentUrl ? (
                                                    <a href={leave.attachmentUrl} target="_blank" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center gap-1">
                                                        {leave.attachmentType === 'application/pdf' ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        Lihat
                                                    </a>
                                                ) : <span className="text-gray-400">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                {leave.aiConfidence ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className={`h-full ${leave.aiConfidence > 80 ? 'bg-green-500' : leave.aiConfidence > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${leave.aiConfidence}%` }} />
                                                        </div>
                                                        <span className="text-xs text-gray-500">{leave.aiConfidence}%</span>
                                                    </div>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(leave.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Hapus data ini?")) {
                                                            deleteMutation.mutate(leave.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            Detail Ijin Sakit
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLeave && (
                        <Tabs defaultValue="info" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="info">Info</TabsTrigger>
                                <TabsTrigger value="raw">Pesan Asli</TabsTrigger>
                                <TabsTrigger value="ai">Analisis AI</TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-gray-50">
                                    <div>
                                        <p className="text-sm text-gray-500">Nama Karyawan</p>
                                        <p className="font-semibold text-lg">{selectedLeave.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Status</p>
                                        <div className="mt-1">{getStatusBadge(selectedLeave.status)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Shield className="h-3 w-3" /> NIK
                                        </p>
                                        <p className="font-mono">{selectedLeave.nik || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" /> Jabatan
                                        </p>
                                        <p>{selectedLeave.position || "-"}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Tanggal Sakit
                                    </p>
                                    <p>{format(new Date(selectedLeave.date), "EEEE, dd MMMM yyyy", { locale: idLocale })}</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Alasan</p>
                                    <p className="text-gray-800 bg-gray-50 p-3 rounded border">{selectedLeave.reason || "-"}</p>
                                </div>

                                {selectedLeave.attachmentUrl && (
                                    <div className="mt-4">
                                        <h3 className="font-medium mb-2 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Lampiran Dokter / Bukti
                                        </h3>
                                        {selectedLeave.attachmentType === 'application/pdf' ? (
                                            <iframe src={selectedLeave.attachmentUrl} className="w-full h-[400px] border rounded" title="Lampiran PDF" />
                                        ) : (
                                            <img src={selectedLeave.attachmentUrl} alt="Bukti Sakit" className="w-full max-h-[400px] object-contain border rounded bg-gray-100" />
                                        )}
                                        <Button asChild variant="outline" className="mt-2 w-full">
                                            <a href={selectedLeave.attachmentUrl} target="_blank">Buka Lampiran di Tab Baru</a>
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="raw" className="mt-4">
                                <ScrollArea className="h-[300px]">
                                    <pre className="text-sm whitespace-pre-wrap bg-gray-100 p-4 rounded-lg font-mono text-gray-800">
                                        {selectedLeave.originalMessage}
                                    </pre>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="ai" className="mt-4">
                                <ScrollArea className="h-[300px]">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm font-medium text-blue-900 mb-2">Analisis Gemini AI:</p>
                                        <pre className="text-xs text-blue-800 whitespace-pre-wrap overflow-x-auto">
                                            {JSON.stringify(selectedLeave.aiAnalysis, null, 2)}
                                        </pre>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
