import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Loader2, Search, Plus, Edit, Trash2, RefreshCw,
    FileText, Calendar, Users, AlertTriangle, CheckCircle2,
    Clock, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Download, Upload, History, Copy, Share2, ExternalLink, QrCode
} from "lucide-react";
import { generateQRCodeCanvas } from "@/lib/qr-utils";
import { SimperPerpanjangan, SimperPerpanjanganHistory, SimperMitra } from "@shared/schema";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";

// Status colors mapping
const statusColors: Record<string, string> = {
    "Belum Diproses": "bg-gray-500",
    "Dalam Proses": "bg-blue-500",
    "Menunggu Approval": "bg-yellow-500",
    "Approved": "bg-green-500",
    "Rejected": "bg-red-500",
    "Selesai": "bg-emerald-600",
};

// Jenis SIMPER options
const jenisSimperOptions = [
    { value: "BIB", label: "SIMPER BIB" },
    { value: "TIA", label: "SIMPER TIA" },
    { value: "BOTH", label: "Keduanya" },
];

// Status options
const statusOptions = [
    "Belum Diproses",
    "Dalam Proses",
    "Menunggu Approval",
    "Approved",
    "Rejected",
    "Selesai",
];

// Tahapan workflow options
const tahapanOptions = [
    "Submit by Admin Mitra Kerja",
    "Waiting Approval by PJO Mitra Kerja",
    "Waiting Approval by Head Custodioan",
    "Waiting Approval by Dokter Perusahan",
    "Waiting Approval by Admin STC",
    "Simper can be picked up at the office GECL",
    "Selesai",
];

export default function MonitoringSimperPerpanjangan() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [jenisFilter, setJenisFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<SimperPerpanjangan | null>(null);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    const publicMonitoringUrl = `${window.location.origin}/monitoring-perpanjangan-simper`;

    // Form state
    const [formData, setFormData] = useState({
        nama: "",
        nik: "",
        jabatan: "",
        departemen: "",
        perusahaan: "",
        noHp: "",
        jenisSimper: "BIB",
        expiredSimperBib: "",
        statusPerpanjangan: "Belum Diproses",
        tahapanWorkflow: "",
        catatan: "",
    });

    const { toast } = useToast();

    // Fetch all records
    const { data: queryData, isLoading, refetch } = useQuery<{ data: SimperPerpanjangan[], total: number }>({
        queryKey: ["simper-perpanjangan", page, pageSize, searchTerm, statusFilter, jenisFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                search: searchTerm,
                status: statusFilter,
                jenis: jenisFilter,
            });
            const data = await apiRequest(`/api/simper-perpanjangan?${params.toString()}`, "GET");
            if (Array.isArray(data)) return { data, total: data.length };
            return data;
        },
    });

    const records = queryData?.data || [];
    const totalItems = queryData?.total || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Fetch history for selected record
    const { data: historyRecords = [], refetch: refetchHistory } = useQuery<SimperPerpanjanganHistory[]>({
        queryKey: ["simper-perpanjangan-history", selectedRecord?.id],
        queryFn: async () => {
            if (!selectedRecord?.id) return [];
            return await apiRequest(`/api/simper-perpanjangan/${selectedRecord.id}/history`, "GET");
        },
        enabled: !!selectedRecord?.id && isHistoryDialogOpen,
    });

    // Fetch Mitras
    const { data: mitras = [] } = useQuery<SimperMitra[]>({
        queryKey: ["simper-mitras"],
        queryFn: async () => {
            return await apiRequest("/api/simper-mitra", "GET");
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest("/api/simper-perpanjangan", "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-perpanjangan"] });
            setIsAddDialogOpen(false);
            resetForm();
            toast({ title: "Berhasil", description: "Data berhasil ditambahkan" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        },
    });

    // Generate QR Code when dialog opens
    useEffect(() => {
        if (isQrDialogOpen) {
            const timer = setTimeout(() => {
                if (qrCanvasRef.current) {
                    generateQRCodeCanvas(publicMonitoringUrl, qrCanvasRef.current, {
                        width: 300,
                        margin: 2
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isQrDialogOpen, publicMonitoringUrl]);

    const handleCopyPublicLink = () => {
        navigator.clipboard.writeText(publicMonitoringUrl);
        toast({
            title: "Link Tersalin",
            description: "Link monitoring publik telah disalin ke clipboard",
        });
    };

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest(`/api/simper-perpanjangan/${data.id}`, "PUT", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-perpanjangan"] });
            setIsEditDialogOpen(false);
            resetForm();
            toast({ title: "Berhasil", description: "Data berhasil diperbarui" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest(`/api/simper-perpanjangan/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-perpanjangan"] });
            toast({ title: "Berhasil", description: "Data berhasil dihapus" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        },
    });

    // Reset form
    const resetForm = () => {
        setFormData({
            nama: "",
            nik: "",
            jabatan: "",
            departemen: "",
            perusahaan: "",
            noHp: "",
            jenisSimper: "BIB",
            expiredSimperBib: "",
            statusPerpanjangan: "Belum Diproses",
            tahapanWorkflow: "",
            catatan: "",
        });
        setSelectedRecord(null);
    };

    // Handle edit
    const handleEdit = (record: SimperPerpanjangan) => {
        setSelectedRecord(record);
        setFormData({
            nama: record.nama || "",
            nik: record.nik || "",
            jabatan: record.jabatan || "",
            departemen: record.departemen || "",
            perusahaan: record.perusahaan || "",
            noHp: record.noHp || "",
            jenisSimper: record.jenisSimper || "BIB",
            expiredSimperBib: record.expiredSimperBib || "",
            statusPerpanjangan: record.statusPerpanjangan || "Belum Diproses",
            tahapanWorkflow: record.tahapanWorkflow || "",
            catatan: record.catatan || "",
        });
        setIsEditDialogOpen(true);
    };

    // Handle view history
    const handleViewHistory = (record: SimperPerpanjangan) => {
        setSelectedRecord(record);
        setIsHistoryDialogOpen(true);
    };

    // Handle submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRecord) {
            updateMutation.mutate({ id: selectedRecord.id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    // Handle delete
    const handleDelete = (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
            deleteMutation.mutate(id);
        }
    };

    // Handle copy tracking link
    const handleCopyLink = (token: string | null | undefined) => {
        if (!token) {
            toast({
                title: "Gagal",
                description: "Token tracking tidak tersedia untuk data ini (hanya untuk data baru/dimigrasi)",
                variant: "destructive"
            });
            return;
        }

        const host = window.location.host;
        const protocol = window.location.protocol;
        const link = `${protocol}//${host}/public/simper-tracking/${token}`;

        navigator.clipboard.writeText(link).then(() => {
            toast({ title: "Berhasil", description: "Tautan pelacakan telah disalin ke clipboard" });
        }).catch(() => {
            toast({ title: "Gagal", description: "Gagal menyalin tautan", variant: "destructive" });
        });
    };

    // Get days until expiry
    const getDaysUntilExpiry = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        try {
            const date = parseISO(dateStr);
            return differenceInDays(date, new Date());
        } catch {
            return null;
        }
    };

    // Get expiry status
    const getExpiryStatus = (days: number | null) => {
        if (days === null) return { label: "-", color: "bg-gray-400" };
        if (days < 0) return { label: "Expired", color: "bg-red-600" };
        if (days <= 7) return { label: "Segera", color: "bg-red-500" };
        if (days <= 30) return { label: "Mendekati", color: "bg-yellow-500" };
        if (days <= 60) return { label: "Menuju", color: "bg-orange-500" };
        return { label: "Aktif", color: "bg-green-500" };
    };

    // Download Excel template
    const downloadTemplate = () => {
        const templateData = [
            {
                "Nama": "Contoh Nama",
                "NIK": "C-000001",
                "Jabatan": "Driver",
                "Departemen": "Operasional",
                "Mitra": "PT. XYZ",
                "No HP": "08123456789",
                "Jenis SIMPER": "BIB",
                "Expired SIMPER BIB": "2025-12-31",
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Monitoring_Perpanjangan_SIMPER.xlsx");
    };

    // Export to Excel
    const exportToExcel = () => {
        const exportData = records.map((r, idx) => ({
            "No": idx + 1,
            "Nama": r.nama,
            "NIK": r.nik,
            "Jabatan": r.jabatan || "-",
            "Departemen": r.departemen || "-",
            "Mitra": r.perusahaan || "-",
            "No HP": r.noHp || "-",
            "Jenis SIMPER": r.jenisSimper,
            "Expired BIB": r.expiredSimperBib || "-",
            "Status": r.statusPerpanjangan,
            "Tahapan": r.tahapanWorkflow || "-",
            "Catatan": r.catatan || "-",
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Perpanjangan SIMPER");
        XLSX.writeFile(wb, `Monitoring_Perpanjangan_SIMPER_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    // Statistics calculation
    const stats = useMemo(() => {
        const statusCount: Record<string, number> = {};
        const jenisCount: Record<string, number> = {};
        let expiredBib = 0;
        let nearExpiryBib = 0;

        records.forEach((r) => {
            // Status count
            statusCount[r.statusPerpanjangan] = (statusCount[r.statusPerpanjangan] || 0) + 1;

            // Jenis count
            jenisCount[r.jenisSimper] = (jenisCount[r.jenisSimper] || 0) + 1;

            // Check BIB expiry
            const bibDays = getDaysUntilExpiry(r.expiredSimperBib);
            if (bibDays !== null) {
                if (bibDays < 0) expiredBib++;
                else if (bibDays <= 30) nearExpiryBib++;
            }
        });

        return {
            total: records.length,
            statusCount,
            jenisCount,
            expiredBib,
            nearExpiryBib,
        };
    }, [records]);

    // Chart data
    const statusChartData = Object.entries(stats.statusCount).map(([name, value]) => ({
        name,
        value,
        color: statusColors[name] || "#6b7280",
    }));

    return (
        <div className="min-h-screen bg-slate-50/50 space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 bg-white/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-700 to-orange-600">
                                Monitoring Perpanjangan SIMPER
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Kelola dan pantau status perpanjangan SIMPER karyawan
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                <Download className="mr-2 h-3.5 w-3.5" />
                                Template
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToExcel}>
                                <FileText className="mr-2 h-3.5 w-3.5" />
                                Export
                            </Button>
                            <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                            >
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                Tambah Data
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
                        <CardContent className="p-4">
                            <p className="text-amber-100 text-sm font-medium">Total Data</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
                            <Users className="h-8 w-8 text-amber-200 mt-2" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-md">
                        <CardContent className="p-4">
                            <p className="text-gray-500 text-sm font-medium">SIMPER BIB</p>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-2xl font-bold text-red-600">{stats.expiredBib}</span>
                                <span className="text-sm text-gray-500">expired</span>
                            </div>
                            <p className="text-xs text-yellow-600 mt-1">{stats.nearExpiryBib} mendekati expired</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-md">
                        <CardContent className="p-4">
                            <p className="text-gray-500 text-sm font-medium">Status Selesai</p>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-2xl font-bold text-green-600">{stats.statusCount["Selesai"] || 0}</span>
                            </div>
                            <CheckCircle2 className="h-6 w-6 text-green-500 mt-1" />
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white border shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Distribusi Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        >
                                            {statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color.replace('bg-', '#').replace('-500', '')} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Jenis SIMPER</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Object.entries(stats.jenisCount).map(([name, value]) => ({ name, value }))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white border shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Cari nama, NIK, atau nomor lambung..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={jenisFilter} onValueChange={setJenisFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter Jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Jenis</SelectItem>
                                    {jenisSimperOptions.map((j) => (
                                        <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Portal Monitoring Publik Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 mb-6 shadow-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_50%)]" />

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Share2 className="text-indigo-300 w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">Portal Monitoring Publik</h2>
                            <p className="text-indigo-200/70 text-sm max-w-md leading-relaxed">
                                Bagikan akses monitoring kepada karyawan atau mitra. Mereka dapat memantau status pengajuan tanpa perlu login.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
                        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-white hover:bg-indigo-50 text-indigo-900 font-bold border-none h-12 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex-1 md:flex-none">
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Tampilkan Barcode
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md p-8 bg-white rounded-3xl border-none shadow-2xl">
                                <DialogHeader className="space-y-3 text-center pb-4">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                        <QrCode className="text-indigo-600 w-8 h-8" />
                                    </div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">QR Code Monitoring</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">
                                        Scan barcode ini untuk mengakses halaman monitoring publik secara langsung.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center py-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <canvas ref={qrCanvasRef} className="rounded-xl shadow-sm bg-white p-2" />
                                </div>
                                <div className="mt-8 space-y-3">
                                    <Button
                                        onClick={handleCopyPublicLink}
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-lg"
                                    >
                                        <Copy className="w-5 h-5 mr-3 text-indigo-500" />
                                        Salin Link Portal
                                    </Button>
                                    <Button
                                        onClick={() => setIsQrDialogOpen(false)}
                                        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-lg shadow-xl transition-all"
                                    >
                                        Tutup
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={handleCopyPublicLink}
                            className="bg-slate-800/50 hover:bg-slate-800 text-white font-bold border border-white/10 h-12 px-6 rounded-xl backdrop-blur-sm transition-all active:scale-95 flex-1 md:flex-none"
                        >
                            <Copy className="w-4 h-4 mr-2 text-indigo-300" />
                            Salin Link
                        </Button>

                        <Button
                            onClick={() => window.open(publicMonitoringUrl, '_blank')}
                            className="bg-slate-800/50 hover:bg-slate-800 text-white font-bold border border-white/10 h-12 px-6 rounded-xl backdrop-blur-sm transition-all active:scale-95 flex-1 md:flex-none"
                        >
                            <ExternalLink className="w-4 h-4 mr-2 text-indigo-300" />
                            Buka
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <Card className="bg-white border shadow-md">
                    <CardHeader>
                        <CardTitle>Daftar Perpanjangan SIMPER</CardTitle>
                        <CardDescription>Total: {totalItems} data</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">No</TableHead>
                                                <TableHead>Nama</TableHead>
                                                <TableHead>NIK</TableHead>
                                                <TableHead>Mitra</TableHead>
                                                <TableHead>Jenis</TableHead>
                                                <TableHead>Exp. BIB</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Tahapan</TableHead>
                                                <TableHead className="text-right">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                                        Tidak ada data ditemukan
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                records.map((record, idx) => {
                                                    const bibDays = getDaysUntilExpiry(record.expiredSimperBib);
                                                    const tiaDays = getDaysUntilExpiry(record.expiredSimperTia);
                                                    const bibStatus = getExpiryStatus(bibDays);
                                                    const tiaStatus = getExpiryStatus(tiaDays);

                                                    return (
                                                        <TableRow key={record.id} className="hover:bg-slate-50">
                                                            <TableCell className="font-medium">{(page - 1) * pageSize + idx + 1}</TableCell>
                                                            <TableCell className="font-medium">{record.nama}</TableCell>
                                                            <TableCell>{record.nik}</TableCell>
                                                            <TableCell>{record.perusahaan || "-"}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{record.jenisSimper}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {record.expiredSimperBib ? (
                                                                    <div>
                                                                        <span className="text-sm">{record.expiredSimperBib}</span>
                                                                        <Badge className={`ml-2 ${bibStatus.color} text-white text-xs`}>
                                                                            {bibDays !== null ? `${bibDays}h` : "-"}
                                                                        </Badge>
                                                                    </div>
                                                                ) : "-"}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={`${statusColors[record.statusPerpanjangan] || "bg-gray-500"} text-white`}>
                                                                    {record.statusPerpanjangan}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-gray-600">
                                                                {record.tahapanWorkflow || "-"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleCopyLink(record.trackingToken)}
                                                                        title="Salin Link Tracking"
                                                                    >
                                                                        <Share2 className="h-4 w-4 text-emerald-600" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleViewHistory(record)}
                                                                        title="Lihat Riwayat"
                                                                    >
                                                                        <History className="h-4 w-4 text-blue-600" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleEdit(record)}
                                                                        title="Edit"
                                                                    >
                                                                        <Edit className="h-4 w-4 text-orange-600" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDelete(record.id)}
                                                                        title="Hapus"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-sm text-gray-500">
                                            Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)} dari {totalItems}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setPage(1)}
                                                disabled={page === 1}
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setPage(page - 1)}
                                                disabled={page === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="px-3 py-1 text-sm">
                                                {page} / {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setPage(page + 1)}
                                                disabled={page === totalPages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setPage(totalPages)}
                                                disabled={page === totalPages}
                                            >
                                                <ChevronsRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddDialogOpen(false);
                    setIsEditDialogOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedRecord ? "Edit Data Perpanjangan SIMPER" : "Tambah Data Perpanjangan SIMPER"}
                        </DialogTitle>
                        <DialogDescription>
                            Lengkapi data karyawan dan informasi SIMPER
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nama">Nama Karyawan *</Label>
                                <Input
                                    id="nama"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nik">NIK *</Label>
                                <Input
                                    id="nik"
                                    value={formData.nik}
                                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jabatan">Jabatan</Label>
                                <Input
                                    id="jabatan"
                                    value={formData.jabatan}
                                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="departemen">Departemen</Label>
                                <Input
                                    id="departemen"
                                    value={formData.departemen}
                                    onChange={(e) => setFormData({ ...formData, departemen: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mitra">Mitra</Label>
                                <Select
                                    value={formData.perusahaan}
                                    onValueChange={(value) => {
                                        const selectedMitra = mitras.find(m => m.name === value);
                                        setFormData({
                                            ...formData,
                                            perusahaan: value,
                                            noHp: selectedMitra?.phoneNumber || formData.noHp
                                        });
                                    }}
                                >
                                    <SelectTrigger id="mitra">
                                        <SelectValue placeholder="Pilih Mitra..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mitras.map((mitra) => (
                                            <SelectItem key={mitra.id} value={mitra.name}>{mitra.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="noHp">No. HP</Label>
                                <Input
                                    id="noHp"
                                    value={formData.noHp}
                                    onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jenisSimper">Jenis SIMPER *</Label>
                                <Select
                                    value={formData.jenisSimper}
                                    onValueChange={(value) => setFormData({ ...formData, jenisSimper: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jenisSimperOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expiredSimperBib">Expired SIMPER BIB</Label>
                                <Input
                                    id="expiredSimperBib"
                                    type="date"
                                    value={formData.expiredSimperBib}
                                    onChange={(e) => setFormData({ ...formData, expiredSimperBib: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="statusPerpanjangan">Status Perpanjangan</Label>
                                <Select
                                    value={formData.statusPerpanjangan}
                                    onValueChange={(value) => setFormData({ ...formData, statusPerpanjangan: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tahapanWorkflow">Tahapan Workflow</Label>
                                <Select
                                    value={formData.tahapanWorkflow}
                                    onValueChange={(value) => setFormData({ ...formData, tahapanWorkflow: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tahapan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tahapanOptions.map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="catatan">Catatan</Label>
                            <Textarea
                                id="catatan"
                                value={formData.catatan}
                                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddDialogOpen(false);
                                    setIsEditDialogOpen(false);
                                    resetForm();
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-amber-600 hover:bg-amber-700"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {selectedRecord ? "Update" : "Simpan"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Riwayat Perubahan Status</DialogTitle>
                        <DialogDescription>
                            {selectedRecord?.nama} ({selectedRecord?.nik})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {historyRecords.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">Belum ada riwayat perubahan</p>
                        ) : (
                            <div className="space-y-3">
                                {historyRecords.map((history, idx) => (
                                    <div key={history.id} className="border rounded-lg p-3 bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {history.statusSebelum && (
                                                    <>
                                                        <Badge variant="outline">{history.statusSebelum}</Badge>
                                                        <span>→</span>
                                                    </>
                                                )}
                                                <Badge className={`${statusColors[history.statusSesudah] || "bg-gray-500"} text-white`}>
                                                    {history.statusSesudah}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {history.createdAt ? format(new Date(history.createdAt), "dd MMM yyyy HH:mm", { locale: id }) : "-"}
                                            </span>
                                        </div>
                                        {history.tahapan && (
                                            <p className="text-sm text-gray-600 mt-1">Tahapan: {history.tahapan}</p>
                                        )}
                                        {history.approver && (
                                            <p className="text-sm text-gray-600">Oleh: {history.approver}</p>
                                        )}
                                        {history.catatan && (
                                            <p className="text-sm text-gray-500 mt-1 italic">"{history.catatan}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
