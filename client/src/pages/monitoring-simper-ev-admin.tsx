
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, Search, Download, Trash2, RefreshCw, Link as LinkIcon, Save, Settings, Share2, ExternalLink, Copy, Smartphone, Plus, Edit, MessageSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Activity, AlertTriangle } from "lucide-react";
import { SimperEvMonitoring, SimperEvHistory, SimperMitra } from "@shared/schema";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from "recharts";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

export default function MonitoringSimperEvAdmin() {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [csvUrl, setCsvUrl] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMitraDialogOpen, setIsMitraDialogOpen] = useState(false);
    const [newMitraName, setNewMitraName] = useState("");
    const [newMitraPhone, setNewMitraPhone] = useState("");
    const [editingMitra, setEditingMitra] = useState<SimperMitra | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

    // Generate QR Code
    useEffect(() => {
        const url = window.location.origin + "/monitoring-simper-ev";
        QRCode.toDataURL(url, { width: 300, margin: 2 }, (err, url) => {
            if (!err) setQrCodeUrl(url);
        });
    }, []);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<Partial<SimperEvMonitoring>>({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState<SimperEvMonitoring | null>(null);
    const [isNotificationLogOpen, setIsNotificationLogOpen] = useState(false);
    const [selectedEmployeeForNotifLog, setSelectedEmployeeForNotifLog] = useState<SimperEvMonitoring | null>(null);
    const [editingHistory, setEditingHistory] = useState<SimperEvHistory | null>(null);
    const [newHistory, setNewHistory] = useState({
        approver: "",
        status: "APPROVED",
        workflowLevel: "Waiting Approval by Admin STC",
        workflowType: "VERSATILITY ORIENTASI",
        message: "Ok"
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Reset Form
    const resetForm = () => {
        setCurrentEmployee({});
        setIsEditMode(false);
    };

    const handleEdit = (record: SimperEvMonitoring) => {
        setCurrentEmployee(record);
        setIsEditMode(true);
        setIsEditDialogOpen(true);
    };

    // Fetch Records (Paginated)
    const { data: queryData, isLoading } = useQuery<{ data: SimperEvMonitoring[], total: number }>({
        queryKey: ["simper-ev-all", page, pageSize, searchTerm], // Dependencies trigger refetch
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                search: searchTerm
            });
            const data = await apiRequest(`/api/simper-ev/all?${params.toString()}`, "GET");
            // Backend should return { data, total }, but handle array fallback just in case
            if (Array.isArray(data)) return { data, total: data.length };
            return data;
        },
        placeholderData: (previousData) => previousData // Keep previous data while fetching new page
    });

    const records = queryData?.data || [];
    const totalItems = queryData?.total || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Fetch Mitras
    const { data: mitras = [] } = useQuery<SimperMitra[]>({
        queryKey: ["simper-mitras"],
        queryFn: async () => {
            return await apiRequest("/api/simper-mitra", "GET");
        },
    });

    // Fetch Settings
    const { data: settings } = useQuery({
        queryKey: ["simper-ev-settings"],
        queryFn: async () => {
            return await apiRequest("/api/simper-ev/settings", "GET");
        },
    });

    useEffect(() => {
        if (settings?.url) {
            setCsvUrl(settings.url);
        }
    }, [settings]);

    // Sync from URL Mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            return await apiRequest("/api/simper-ev/sync", "POST", { url: csvUrl });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] });
            queryClient.invalidateQueries({ queryKey: ["simper-ev-settings"] });
            toast({
                title: "Sinkronisasi Berhasil",
                description: `${data.message}. Total: ${data.count} data.`,
            });
        },
        onError: (err: any) => {
            toast({
                title: "Sinkronisasi Gagal",
                description: err.message || "Gagal melakukan sinkronisasi dengan URL.",
                variant: "destructive",
            });
        }
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("csvFile", file);
            const res = await fetch("/api/simper-ev/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] });
            setIsUploadDialogOpen(false);
            toast({
                title: "Upload Berhasil",
                description: `Import berhasil: ${data.count} data.`,
            });
        },
        onError: (err) => {
            toast({
                title: "Upload Gagal",
                description: "Gagal memproses file CSV.",
                variant: "destructive",
            });
        },
    });

    // CRUD Mutations
    const createMutation = useMutation({
        mutationFn: async (data: Partial<SimperEvMonitoring>) => {
            return await apiRequest("/api/simper-ev", "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] });
            setIsEditDialogOpen(false);
            resetForm();
            toast({ title: "Berhasil", description: "Data berhasil ditambahkan" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<SimperEvMonitoring>) => {
            return await apiRequest(`/api/simper-ev/${data.id}`, "PUT", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] });
            setIsEditDialogOpen(false);
            resetForm();
            toast({ title: "Berhasil", description: "Data berhasil diperbarui" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest(`/api/simper-ev/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] });
            toast({ title: "Berhasil", description: "Data berhasil dihapus" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    // Mitra Mutations
    const createMitraMutation = useMutation({
        mutationFn: async (data: { name: string, phoneNumber: string }) => {
            return await apiRequest("/api/simper-mitra", "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-mitras"] });
            setNewMitraName("");
            setNewMitraPhone("");
            toast({ title: "Berhasil", description: "Mitra berhasil ditambahkan" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const updateMitraMutation = useMutation({
        mutationFn: async (data: { id: string, name: string, phoneNumber: string }) => {
            return await apiRequest(`/api/simper-mitra/${data.id}`, "PUT", { name: data.name, phoneNumber: data.phoneNumber });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-mitras"] });
            setEditingMitra(null);
            setNewMitraName("");
            setNewMitraPhone("");
            toast({ title: "Berhasil", description: "Mitra berhasil diupdate" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const notifyMitraMutation = useMutation({
        mutationFn: async (data: { phone: string, message: string }) => {
            const res = await fetch("/api/simper-mitra/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Gagal kirim notifikasi");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Terkirim", description: "Notifikasi WhatsApp berhasil dikirim" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const deleteMitraMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest(`/api/simper-mitra/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["simper-mitras"] });
            toast({ title: "Berhasil", description: "Mitra berhasil dihapus" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        if (isEditMode) {
            updateMutation.mutate(currentEmployee);
        } else {
            createMutation.mutate(currentEmployee);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const downloadTemplate = () => {
        // Create a CSV template
        const headers = [
            "No", "Nama", "NIK Simper", "Asal Mitra",
            "Simper", "Simper Permanen",
            "UNIT YG DI SKILL UP", "Masa Berlaku Sertifikat OS", "Status Pengajuan"
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const csvOutput = XLSX.utils.sheet_to_csv(ws);

        // Download
        const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "template_simper_ev.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Removed client-side filtering; server handles it via 'searchTerm' in query key
    const filteredData = records;

    // History Tracker State removed from here (moved to top)


    // Fetch History
    const { data: historyRecords = [], refetch: refetchHistory } = useQuery<SimperEvHistory[]>({
        queryKey: ["simper-history", selectedHistoryEmployee?.nikSimper],
        queryFn: async () => {
            if (!selectedHistoryEmployee?.nikSimper) return [];
            return await apiRequest(`/api/simper-ev/${selectedHistoryEmployee.nikSimper}/history`, "GET");
        },
        enabled: !!selectedHistoryEmployee?.nikSimper
    });

    // Fetch Notification Logs for Selected Employee
    const { data: notificationLogs = [], refetch: refetchNotificationLogs } = useQuery<any[]>({
        queryKey: ["simper-notification-logs", selectedEmployeeForNotifLog?.nikSimper],
        queryFn: async () => {
            if (!selectedEmployeeForNotifLog?.nikSimper) return [];
            return await apiRequest(`/api/simper-ev/${selectedEmployeeForNotifLog.nikSimper}/notification-logs`, "GET");
        },
        enabled: !!selectedEmployeeForNotifLog?.nikSimper
    });

    // Fetch WhatsApp Config Status
    const { data: whatsappConfig } = useQuery({
        queryKey: ["whatsapp-config-status"],
        queryFn: async () => {
            return await apiRequest("/api/simper-ev/whatsapp-config-status", "GET");
        },
    });

    // Add History Mutation
    const addHistoryMutation = useMutation({
        mutationFn: async (data: { nikSimper: string, newRecord: typeof newHistory }) => {
            return await apiRequest(`/api/simper-ev/${data.nikSimper}/history`, "POST", data.newRecord);
        },
        onSuccess: (data, variables) => {
            refetchHistory();
            queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] });

            // Optimistically update the local selected employee state so the "Status Saat Ini" badge updates immediately
            if (selectedHistoryEmployee && variables.newRecord.workflowLevel) {
                setSelectedHistoryEmployee({
                    ...selectedHistoryEmployee,
                    statusPengajuan: variables.newRecord.workflowLevel
                });
            }

            setNewHistory(prev => ({ ...prev, message: "", workflowLevel: "" })); // Reset some fields
            toast({ title: "Berhasil", description: "Riwayat approval berhasil ditambahkan." });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const updateHistoryMutation = useMutation({
        mutationFn: async (data: { id: string, updatedRecord: Partial<SimperEvHistory> }) => {
            return await apiRequest(`/api/simper-ev/history/${data.id}`, "PUT", data.updatedRecord);
        },
        onSuccess: () => {
            refetchHistory();
            toast({ title: "Berhasil", description: "Riwayat approval berhasil diperbarui." });
            setEditingHistory(null);
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const deleteHistoryMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest(`/api/simper-ev/history/${id}`, "DELETE");
        },
        onSuccess: () => {
            refetchHistory();
            toast({ title: "Berhasil", description: "Riwayat approval berhasil dihapus." });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    // editingHistory state moved to top


    // Dashboard Statistics Calculation
    const distributionStats = useMemo(() => {
        const stats = {
            approved: records.filter(r => r.statusPengajuan === "APPROVED").length,
            pending: records.filter(r => r.statusPengajuan !== "APPROVED" && r.statusPengajuan !== "REJECTED" && !(r.statusPengajuan || "").toLowerCase().includes("selesai")).length,
            rejected: records.filter(r => r.statusPengajuan === "REJECTED").length,
            completed: records.filter(r => (r.statusPengajuan || "").toLowerCase().includes("selesai")).length,
        };
        return [
            { name: "Selesai", value: stats.completed, color: "#10b981" }, // Emerald
            { name: "Approved", value: stats.approved, color: "#3b82f6" }, // Blue
            { name: "Proses", value: stats.pending, color: "#f59e0b" },   // Amber
            { name: "Ditolak", value: stats.rejected, color: "#ef4444" }, // Red
        ].filter(i => i.value > 0);
    }, [records]);

    const mitraStats = useMemo(() => {
        const counts: Record<string, number> = {};
        records.forEach(r => {
            const mitra = r.asalMitra || "Lainnya";
            counts[mitra] = (counts[mitra] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 Mitra
    }, [records]);

    return (
        <div className="min-h-screen bg-slate-50/50 space-y-8 pb-20">
            {/* Header Modern */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 bg-white/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                                Monitoring Simper EV
                            </h1>
                            <div className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                                Dashboard Evaluasi & Manajemen Pengajuan
                                {whatsappConfig && (
                                    <Badge variant={whatsappConfig.configured ? "default" : "destructive"} className="ml-2">
                                        {whatsappConfig.configured ? "✅ WA Terkonfigurasi" : "⚠️ WA Belum Dikonfigurasi"}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] })} className="h-9">
                                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                Refresh
                            </Button>
                            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <Upload className="mr-2 h-3.5 w-3.5" />
                                        Import CSV
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload Data CSV</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Button variant="outline" onClick={downloadTemplate} className="w-full">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Template CSV
                                        </Button>
                                        <div className="grid w-full max-w-sm items-center gap-1.5">
                                            <Input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                disabled={uploadMutation.isPending}
                                            />
                                            <p className="text-xs text-gray-500">Upload file .csv dengan header yang sesuai.</p>
                                        </div>
                                        {uploadMutation.isPending && (
                                            <div className="text-center text-sm text-gray-500">
                                                <Loader2 className="animate-spin h-4 w-4 inline mr-2" />
                                                Uploading...
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={isMitraDialogOpen} onOpenChange={setIsMitraDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <Settings className="mr-2 h-3.5 w-3.5" />
                                        Mitra
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Kelola Asal Mitra</DialogTitle>
                                        <DialogDescription>Tambahkan atau hapus pilihan mitra untuk dropdown.</DialogDescription>
                                    </DialogHeader>
                                    {/* (Mitra Content preserved but omitted for brevity in this chunk if it was here, but in original code it was inline. I will re-include the Dialog content below properly if I replaced it. 
                                        Wait, the original code had the entire Dialog content here. I should keep it or refactor. 
                                        For this specific replacement, I am replacing the top part of the return. I need to be careful not to lose the Mitra Dialog content.
                                        Correct approach: Rerender the whole Header + Dashboard Section here.
                                    */}
                                    <div className="space-y-4 py-4">
                                        <div className="grid gap-2">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Nama Mitra Baru..."
                                                    value={newMitraName}
                                                    onChange={(e) => setNewMitraName(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    placeholder="No. HP / WA (08...)"
                                                    value={newMitraPhone}
                                                    onChange={(e) => setNewMitraPhone(e.target.value)}
                                                    className="w-[180px]"
                                                />
                                                <Button
                                                    onClick={() => {
                                                        if (editingMitra) {
                                                            updateMitraMutation.mutate({
                                                                id: editingMitra.id,
                                                                name: newMitraName,
                                                                phoneNumber: newMitraPhone
                                                            });
                                                            setEditingMitra(null);
                                                        } else {
                                                            createMitraMutation.mutate({ name: newMitraName, phoneNumber: newMitraPhone });
                                                        }
                                                    }}
                                                    disabled={!newMitraName || createMitraMutation.isPending || updateMitraMutation.isPending}
                                                >
                                                    {editingMitra ? "Update" : "Tambah"}
                                                </Button>
                                                {editingMitra && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingMitra(null);
                                                            setNewMitraName("");
                                                            setNewMitraPhone("");
                                                        }}
                                                    >
                                                        Batal
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="border rounded-md max-h-[300px] overflow-y-auto">
                                            <Table>
                                                <TableBody>
                                                    {mitras.length === 0 ? (
                                                        <TableRow><TableCell className="text-center text-gray-500 py-4">Belum ada mitra.</TableCell></TableRow>
                                                    ) : (
                                                        mitras.map(mitra => (
                                                            <TableRow key={mitra.id}>
                                                                <TableCell className="font-medium">{mitra.name}</TableCell>
                                                                <TableCell className="text-muted-foreground text-xs">
                                                                    {mitra.phoneNumber || "-"}
                                                                </TableCell>
                                                                <TableCell className="text-right flex items-center justify-end gap-1">
                                                                    {mitra.phoneNumber && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            title="Tes Notifikasi WhatsApp"
                                                                            onClick={() => {
                                                                                const msg = prompt("Masukkan pesan untuk tes notifikasi:", "Tes notifikasi dari OneTalent");
                                                                                if (msg) {
                                                                                    notifyMitraMutation.mutate({ phone: mitra.phoneNumber!, message: msg });
                                                                                }
                                                                            }}
                                                                        >
                                                                            <MessageSquare className="h-4 w-4 text-green-600" />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Edit Mitra"
                                                                        onClick={() => {
                                                                            setEditingMitra(mitra);
                                                                            setNewMitraName(mitra.name);
                                                                            setNewMitraPhone(mitra.phoneNumber || "");
                                                                        }}
                                                                    >
                                                                        <Edit className="h-4 w-4 text-orange-600" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => deleteMitraMutation.mutate(mitra.id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button onClick={() => { resetForm(); setIsEditDialogOpen(true); }} size="sm" className="h-9 bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                Tambah
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Dashboard Evaluasi Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Summary Cards */}
                    <div className="space-y-6">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
                            <CardContent className="p-6">
                                <p className="text-blue-100 font-medium text-sm">Total Pengajuan</p>
                                <h3 className="text-4xl font-bold mt-2">{totalItems}</h3>
                                <div className="mt-4 flex items-center text-blue-100 text-xs gap-1">
                                    <Activity className="w-4 h-4" />
                                    <span>Data tercatat dalam sistem</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-none shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Status Distribusi</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distributionStats}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {distributionStats.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Mitra */}
                    <Card className="md:col-span-2 bg-white border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Volume Pengajuan per Mitra (Top 10)</CardTitle>
                            <CardDescription>Evaluasi mitra dengan jumlah pengajuan terbanyak</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mitraStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>


                {/* Portal Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

                    <div className="relative flex flex-col md:flex-row items-center justify-between p-8 gap-8">
                        <div className="flex items-center gap-6">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md shadow-inner border border-white/20">
                                <Share2 className="h-8 w-8 text-blue-200" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Portal Monitoring Publik</h2>
                                <p className="mt-2 text-indigo-200 max-w-xl">
                                    Bagikan akses monitoring kepada karyawan atau mitra.
                                    Mereka dapat memantau status pengajuan tanpa perlu login.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="h-12 px-6 bg-white text-indigo-900 hover:bg-blue-50 border-none font-semibold text-md shadow-lg transition-all hover:-translate-y-0.5">
                                        <Smartphone className="mr-2 h-5 w-5" />
                                        Tampilkan Barcode
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md text-center">
                                    <DialogHeader>
                                        <DialogTitle className="text-center text-xl">Scan QR Code</DialogTitle>
                                        <DialogDescription className="text-center">
                                            Scan QR code ini untuk membuka halaman Monitoring Publik di HP.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-center py-6">
                                        {qrCodeUrl ? (
                                            <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-100">
                                                <img src={qrCodeUrl} alt="QR Code Monitoring" className="w-56 h-56" />
                                            </div>
                                        ) : (
                                            <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl">
                                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <Button variant="outline" onClick={() => {
                                            const link = document.createElement('a');
                                            link.download = 'simper-monitoring-qr.png';
                                            link.href = qrCodeUrl;
                                            link.click();
                                        }}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download QR
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Button
                                variant="outline"
                                className="h-12 px-6 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin + "/monitoring-simper-ev");
                                    toast({ title: "Tersalin!", description: "Link monitoring publik telah disalin ke clipboard." });
                                }}
                            >
                                <Copy className="w-5 h-5 mr-2" />
                                Salin Link
                            </Button>

                            <Button
                                variant="outline"
                                className="h-12 px-6 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                                onClick={() => window.open("/monitoring-simper-ev", "_blank")}
                            >
                                <ExternalLink className="w-5 h-5 mr-2" />
                                Buka
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Settings Section */}
                <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen} className="border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-gray-500" />
                            <h3 className="font-medium text-gray-900">Pengaturan Sinkronisasi</h3>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                <RefreshCw className={`h-4 w-4 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`} />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0 space-y-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="csv-url">URL Spreadsheet CSV (Publik)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="csv-url"
                                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                                        value={csvUrl}
                                        onChange={(e) => setCsvUrl(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={() => syncMutation.mutate()}
                                        disabled={syncMutation.isPending || !csvUrl}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {syncMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Simpan & Sinkronisasi
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Pastikan link Google Sheet Anda memiliki akses publik (Anyone with the link) dan gunakan format export=csv.
                                </p>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Main Content Table (Modernized) */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100/80">
                        <CardTitle>Data Pengajuan</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari Nama atau NIK..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1); // Reset to page 1 on search
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : (<>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>NIK Simper</TableHead>
                                            <TableHead>Mitra</TableHead>
                                            <TableHead>Merk Unit</TableHead>
                                            <TableHead>Type Unit</TableHead>
                                            <TableHead>Simper</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Updated</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                                    Tidak ada data ditemukan. Tambahkan data secara manual atau upload CSV.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredData.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell className="font-medium">{record.nama}</TableCell>
                                                    <TableCell>{record.nikSimper}</TableCell>
                                                    <TableCell>{record.asalMitra}</TableCell>
                                                    <TableCell>{record.merkUnit || "-"}</TableCell>
                                                    <TableCell>{record.typeUnit || "-"}</TableCell>
                                                    <TableCell>{record.simper}</TableCell>

                                                    <TableCell>
                                                        <Badge variant="secondary">{record.statusPengajuan || "Unknown"}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-gray-500">
                                                        {record.updatedOf || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                setSelectedEmployeeForNotifLog(record);
                                                                setIsNotificationLogOpen(true);
                                                            }}
                                                            title="Riwayat Notifikasi WA"
                                                        >
                                                            <MessageSquare className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => setSelectedHistoryEmployee(record)} title="Riwayat Approval">
                                                            <RefreshCw className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} title="Edit">
                                                            <Edit className="h-4 w-4 text-orange-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            if (confirm("Apakah anda yakin ingin menghapus data ini?")) {
                                                                deleteMutation.mutate(record.id);
                                                            }
                                                        }} title="Hapus">
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between space-x-2 py-4">
                                <div className="text-sm text-gray-500">
                                    Total {totalItems} data. Halaman {page} dari {totalPages || 1}.
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1 || isLoading}
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(old => Math.max(old - 1, 1))}
                                        disabled={page === 1 || isLoading}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Select
                                        value={pageSize.toString()}
                                        onValueChange={(val) => {
                                            setPageSize(Number(val));
                                            setPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-[70px]">
                                            <SelectValue placeholder={pageSize} />
                                        </SelectTrigger>
                                        <SelectContent side="top">
                                            {[10, 20, 50, 100].map((size) => (
                                                <SelectItem key={size} value={size.toString()}>
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(old => (totalPages > old ? old + 1 : old))}
                                        disabled={page >= totalPages || isLoading}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(totalPages)}
                                        disabled={page >= totalPages || isLoading}
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>)}
                    </CardContent>
                </Card>


                {/* History / Workflow Tracker Dialog */}
                <Dialog open={!!selectedHistoryEmployee} onOpenChange={(open) => !open && setSelectedHistoryEmployee(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Riwayat Approval</DialogTitle>
                            <DialogDescription>
                                Tracking flow approval untuk {selectedHistoryEmployee?.nama} ({selectedHistoryEmployee?.nikSimper})
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 mt-4">
                            {/* Employee Info Recap */}
                            <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500 block">Asal Mitra</span> <span className="font-semibold">{selectedHistoryEmployee?.asalMitra}</span></div>
                                <div><span className="text-gray-500 block">Simper</span> <span className="font-semibold">{selectedHistoryEmployee?.simper}</span></div>
                                <div><span className="text-gray-500 block">Status Saat Ini</span> <Badge variant="outline">{selectedHistoryEmployee?.statusPengajuan}</Badge></div>
                            </div>

                            {/* Usage Note */}
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm flex items-start">
                                <Share2 className="h-4 w-4 mr-2 mt-0.5" />
                                <p>Data riwayat ini disimpan terpisah berdasarkan NIK. Data tidak akan hilang saat sinkronisasi ulang CSV.</p>
                            </div>

                            {/* History Table */}
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Approver</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Workflow Level</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead>Pesan</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historyRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">Belum ada riwayat approval.</TableCell>
                                            </TableRow>
                                        ) : (
                                            historyRecords
                                                .sort((a, b) => new Date(b.approvedAt || 0).getTime() - new Date(a.approvedAt || 0).getTime())
                                                .map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="font-medium">{log.approver}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={log.status === 'APPROVED' ? 'default' : log.status === 'REJECTED' ? 'destructive' : 'outline'}>
                                                                {log.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{log.workflowLevel}</TableCell>
                                                        <TableCell>{log.workflowType}</TableCell>
                                                        <TableCell>{log.message}</TableCell>
                                                        <TableCell className="text-xs text-gray-500">
                                                            {(() => {
                                                                if (!log.approvedAt) return "-";
                                                                try {
                                                                    const d = new Date(log.approvedAt);
                                                                    if (isNaN(d.getTime())) return "-";
                                                                    return format(d, "d MMM yyyy HH:mm");
                                                                } catch (e) {
                                                                    return "-";
                                                                }
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                setEditingHistory(log);
                                                                setNewHistory({
                                                                    approver: log.approver || "",
                                                                    status: (log.status as any) || "PENDING",
                                                                    workflowLevel: log.workflowLevel || "",
                                                                    workflowType: log.workflowType || "",
                                                                    message: log.message || ""
                                                                });
                                                            }}>
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                if (confirm("Hapus riwayat ini?")) {
                                                                    deleteHistoryMutation.mutate(log.id);
                                                                }
                                                            }}>
                                                                <Trash2 className="h-3 w-3 text-red-500" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Manual Input Form */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-semibold">{editingHistory ? "Edit Riwayat Approval" : "Input Manual Approval"}</h4>
                                    {editingHistory && (
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setEditingHistory(null);
                                            setNewHistory({ approver: "", status: "PENDING", workflowLevel: "", workflowType: "", message: "" });
                                        }}>Batal Edit</Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nama Approver</Label>
                                        <Input
                                            value={newHistory.approver}
                                            onChange={(e) => setNewHistory({ ...newHistory, approver: e.target.value })}
                                            placeholder="Contoh: ADING FAHRIZA A"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={newHistory.status} onValueChange={(val) => setNewHistory({ ...newHistory, status: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="APPROVED">APPROVED</SelectItem>
                                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                                                <SelectItem value="PENDING">PENDING</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Workflow Level</Label>
                                        <Input
                                            value={newHistory.workflowLevel}
                                            onChange={(e) => setNewHistory({ ...newHistory, workflowLevel: e.target.value })}
                                            placeholder="Contoh: Waiting Approval by..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipe Workflow</Label>
                                        <Input
                                            value={newHistory.workflowType}
                                            onChange={(e) => setNewHistory({ ...newHistory, workflowType: e.target.value })}
                                            placeholder="Contoh: VERSATILITY ORIENTASI"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Pesan / Catatan</Label>
                                        <Textarea
                                            value={newHistory.message}
                                            onChange={(e) => setNewHistory({ ...newHistory, message: e.target.value })}
                                            placeholder="Catatan tambahan..."
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button
                                        onClick={() => {
                                            if (editingHistory) {
                                                updateHistoryMutation.mutate({ id: editingHistory.id, updatedRecord: newHistory });
                                            } else {
                                                selectedHistoryEmployee && addHistoryMutation.mutate({ nikSimper: selectedHistoryEmployee.nikSimper || "", newRecord: newHistory });
                                            }
                                        }}
                                        disabled={addHistoryMutation.isPending || updateHistoryMutation.isPending || !selectedHistoryEmployee}
                                    >
                                        {(addHistoryMutation.isPending || updateHistoryMutation.isPending) && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                                        {editingHistory ? "Simpan Perubahan" : "Simpan Riwayat"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Create/Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? "Edit Data Simper EV" : "Tambah Data Simper EV"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nama Lengkap</Label>
                                <Input
                                    value={currentEmployee.nama || ""}
                                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, nama: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>NIK Simper / NIK</Label>
                                <Input
                                    value={currentEmployee.nikSimper || ""}
                                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, nikSimper: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Asal Mitra</Label>
                                <Select
                                    value={currentEmployee.asalMitra || ""}
                                    onValueChange={(val) => setCurrentEmployee({ ...currentEmployee, asalMitra: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Mitra..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mitras.map(mitra => (
                                            <SelectItem key={mitra.id} value={mitra.name}>{mitra.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Simper</Label>
                                <Input
                                    value={currentEmployee.simper || ""}
                                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, simper: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status Pengajuan</Label>
                                <Input
                                    value={currentEmployee.statusPengajuan || ""}
                                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, statusPengajuan: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Merk Unit</Label>
                                <Input
                                    value={currentEmployee.merkUnit || ""}
                                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, merkUnit: e.target.value })}
                                    placeholder="Contoh: SANY"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Type Unit</Label>
                                <Select
                                    value={currentEmployee.typeUnit || ""}
                                    onValueChange={(val) => setCurrentEmployee({ ...currentEmployee, typeUnit: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EV">EV</SelectItem>
                                        <SelectItem value="SOLAR">SOLAR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Masa Berlaku Sertifikat</Label>
                                <Input
                                    value={currentEmployee.masaBerlakuSertifikatOs || ""}
                                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, masaBerlakuSertifikatOs: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                                Simpan
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Notification Log Dialog */}
                <Dialog open={isNotificationLogOpen} onOpenChange={(open) => !open && setIsNotificationLogOpen(false)}>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Riwayat Notifikasi WhatsApp</DialogTitle>
                            <DialogDescription>
                                Log pengiriman notifikasi WhatsApp untuk {selectedEmployeeForNotifLog?.nama} ({selectedEmployeeForNotifLog?.nikSimper})
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            {/* WhatsApp Config Status */}
                            {whatsappConfig && (
                                <div className={`p-4 rounded-lg border ${whatsappConfig.configured ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                    <div className="flex items-start gap-3">
                                        {whatsappConfig.configured ? (
                                            <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <p className={`font-semibold ${whatsappConfig.configured ? 'text-green-800' : 'text-yellow-800'}`}>
                                                {whatsappConfig.configured ? "WhatsApp API Terkonfigurasi" : "WhatsApp API Belum Dikonfigurasi"}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                API Key Source: <span className="font-mono">{whatsappConfig.apiKeySource}</span> |
                                                Admin Phone: <span className="font-mono">{whatsappConfig.adminPhone}</span>
                                            </p>
                                            {!whatsappConfig.configured && (
                                                <p className="text-sm text-yellow-700 mt-2">
                                                    ⚠️ Untuk mengaktifkan notifikasi WhatsApp, silakan set environment variable <code className="bg-yellow-100 px-1 rounded">NOTIFYME_API_KEY</code> atau masukkan API key via system settings.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notification Logs Table */}
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal Kirim</TableHead>
                                            <TableHead>Penerima</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Pesan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notificationLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                                    Belum ada riwayat notifikasi WhatsApp untuk karyawan ini.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            notificationLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-xs">
                                                        {log.sentAt ? format(new Date(log.sentAt), "dd MMM yyyy HH:mm") :
                                                            format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{log.recipientName}</p>
                                                            <p className="text-xs text-gray-500">{log.recipientPhone}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">
                                                            {log.messageType?.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            log.status === "SENT" ? "default" :
                                                                log.status === "FAILED" ? "destructive" :
                                                                    "secondary"
                                                        }>
                                                            {log.status === "SENT" ? "✅ Terkirim" :
                                                                log.status === "FAILED" ? "❌ Gagal" :
                                                                    "⏳ Pending"}
                                                        </Badge>
                                                        {log.errorMessage && (
                                                            <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <details className="text-xs">
                                                            <summary className="cursor-pointer text-blue-600 hover:underline">
                                                                Lihat Pesan
                                                            </summary>
                                                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap max-w-md">
                                                                {log.messageContent}
                                                            </pre>
                                                        </details>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setIsNotificationLogOpen(false)}>
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div >
    );
}
