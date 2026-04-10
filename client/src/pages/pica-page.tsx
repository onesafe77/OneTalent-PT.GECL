import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    RefreshCw,
    Search,
    Filter,
    ArrowLeft,
    ChevronRight,
    User,
    Calendar,
    MoreVertical,
    ExternalLink,
    Edit2,
    Trash2,
    Paperclip
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PicaRecord } from "@shared/schema";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PicaPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [selectedRecord, setSelectedRecord] = useState<PicaRecord | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

    // Fetch PICA data
    const { data: records, isLoading } = useQuery<PicaRecord[]>({
        queryKey: ['/api/pica'],
    });

    // Sync Mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("/api/pica/sync", "POST");
            return res;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/pica'] });
            toast({
                title: "Sinkronisasi Berhasil",
                description: `Ditemukan ${data.count} temuan baru.`,
                variant: "default"
            });
        },
        onError: (err: any) => {
            toast({
                title: "Gagal Sinkronisasi",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    // Delete All Mutation
    const deleteAllMutation = useMutation({
        mutationFn: async () => {
            if (!confirm("Apakah Anda yakin ingin menghapus semua data temuan PICA? Tindakan ini tidak dapat dibatalkan.")) {
                throw new Error("Dibatalkan");
            }
            return await apiRequest("/api/pica", "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/pica"] });
            toast({ title: "Berhasil", description: "Semua data temuan berhasil dihapus", variant: "default" });
        },
        onError: (err: any) => {
            if (err.message !== "Dibatalkan") {
                toast({ title: "Gagal Menghapus Data", description: err.message, variant: "destructive" });
            }
        }
    });

    // Update Record Mutation
    const updateMutation = useMutation({
        mutationFn: async (vars: { id: string, updates: Partial<PicaRecord> }) => {
            const res = await apiRequest(`/api/pica/${vars.id}`, "PATCH", vars.updates);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/pica'] });
            setIsEditDialogOpen(false);
            toast({ title: "Update Berhasil", variant: "default" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal Update", description: err.message, variant: "destructive" });
        }
    });

    // Stats
    const stats = useMemo(() => {
        if (!records) return { open: 0, inProgress: 0, closed: 0 };
        return {
            open: records.filter(r => r.status === "OPEN").length,
            inProgress: records.filter(r => r.status === "IN_PROGRESS").length,
            closed: records.filter(r => r.status === "CLOSED").length,
        };
    }, [records]);

    // Filtered Records
    const filteredRecords = useMemo(() => {
        if (!records) return [];
        return records.filter(r => {
            const matchesSearch =
                r.findingDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.moduleSource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.pic || "").toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [records, searchTerm, statusFilter]);

    const handleEditClick = (record: PicaRecord) => {
        setSelectedRecord(record);
        setEvidenceFile(null); // reset file when opening dialog
        setIsEditDialogOpen(true);
    };

    const handleUpdateStatus = (status: "OPEN" | "IN_PROGRESS" | "CLOSED") => {
        if (selectedRecord) {
            updateMutation.mutate({ id: selectedRecord.id, updates: { status } });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OPEN": return <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100 p-1.5 px-3 rounded-full">OPEN</Badge>;
            case "IN_PROGRESS": return <Badge className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 p-1.5 px-3 rounded-full">IN PROGRESS</Badge>;
            case "CLOSED": return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 p-1.5 px-3 rounded-full">CLOSED</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "HIGH": return <Badge variant="destructive" className="rounded-full">HIGH</Badge>;
            case "MEDIUM": return <Badge className="bg-blue-500 rounded-full">MEDIUM</Badge>;
            case "LOW": return <Badge variant="secondary" className="rounded-full">LOW</Badge>;
            default: return <Badge variant="secondary">{priority}</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 pb-20 lg:pb-10">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-10 box-border">
                <div className="container max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/workspace/sidak">
                                <Button variant="ghost" size="icon" className="group rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <ArrowLeft className="h-5 w-5 text-gray-500 group-hover:text-red-600 transition-colors" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                                    PICA Dashboard
                                </h1>
                                <p className="text-sm text-gray-500 font-medium">Problem Identification and Corrective Action</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => deleteAllMutation.mutate()}
                                disabled={deleteAllMutation.isPending}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl h-11 px-6 shadow-sm transition-all"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus Semua
                            </Button>

                            <Button
                                onClick={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-none rounded-xl h-11 px-6 transition-all active:scale-95"
                            >
                                <RefreshCw className={cn("h-4 w-4 mr-2", syncMutation.isPending && "animate-spin")} />
                                Sync Findings
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                        <Card className="border-none shadow-sm ring-1 ring-red-100 dark:ring-red-900/10 bg-gradient-to-br from-red-50/50 to-white dark:from-gray-900 dark:to-gray-800">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-600 uppercase tracking-wider opacity-80">OPEN</p>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.open}</h3>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm ring-1 ring-amber-100 dark:ring-amber-900/10 bg-gradient-to-br from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-800">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-600 uppercase tracking-wider opacity-80">IN PROGRESS</p>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.inProgress}</h3>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/10 bg-gradient-to-br from-emerald-50/50 to-white dark:from-gray-900 dark:to-gray-800">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider opacity-80">CLOSED</p>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.closed}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-4 py-8">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari deskripsi, sumber, atau PIC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 border-gray-200 dark:border-gray-800 rounded-xl focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] h-11 border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl p-1">
                                <SelectItem value="ALL" className="rounded-lg">Semua Status</SelectItem>
                                <SelectItem value="OPEN" className="rounded-lg">Open</SelectItem>
                                <SelectItem value="IN_PROGRESS" className="rounded-lg">In Progress</SelectItem>
                                <SelectItem value="CLOSED" className="rounded-lg">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Sumber / Tanggal</th>
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Deskripsi Temuan</th>
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none text-center">Prioritas</th>
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Tindakan Perbaikan</th>
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">PIC / Deadline</th>
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none text-center">Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-8 border-b border-gray-50 dark:border-gray-800">
                                            <div className="flex gap-4">
                                                <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-md w-3/4" />
                                                    <div className="h-3 bg-gray-50 dark:bg-gray-800/50 rounded-md w-1/2" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="h-16 w-16 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                                <Search className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Tidak ada temuan</h4>
                                            <p className="text-gray-500 text-sm">Coba sesuaikan filter pencarian atau sinkronkan data temuan baru.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1 opacity-80">{record.moduleSource.replace('_', ' ')}</span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    <Calendar className="h-3 w-3" />
                                                    {record.createdAt ? format(new Date(record.createdAt), 'dd/MM/yyyy') : '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed line-clamp-2 w-full max-w-sm">
                                                {record.findingDescription}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 align-top text-center">
                                            {getPriorityBadge(record.priority || "MEDIUM")}
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic max-w-xs">
                                                {record.correctiveAction || "Belum ada tindakan perbaikan"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 group/pic">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-500 font-bold border border-white dark:border-gray-900 shadow-sm transition-transform group-hover/pic:scale-110">
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{record.pic || "-"}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">
                                                    Due: {record.dueDate ? format(new Date(record.dueDate), 'dd MMM yyyy') : 'No Date'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top text-center">
                                            {getStatusBadge(record.status || "OPEN")}
                                        </td>
                                        <td className="px-6 py-5 align-top text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl p-1 shadow-lg border-gray-100 dark:border-gray-800">
                                                    <DropdownMenuItem onClick={() => handleEditClick(record)} className="rounded-lg py-2.5 cursor-pointer">
                                                        <Edit2 className="h-4 w-4 mr-2 text-blue-500" />
                                                        <span className="font-bold text-sm">Update Progress</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-lg py-2.5 cursor-pointer border-t mt-1">
                                                        <ExternalLink className="h-4 w-4 mr-2 text-gray-400" />
                                                        <span className="font-bold text-sm text-gray-600">Lihat Detail Sidak</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden space-y-4">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="animate-pulse rounded-2xl overflow-hidden border-none shadow-sm h-32" />
                        ))
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200">
                            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold">Tidak ada temuan</p>
                        </div>
                    ) : (
                        filteredRecords.map((record) => (
                            <Card key={record.id} className="overflow-hidden border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-800">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <Badge className="w-fit bg-red-50 text-red-700 text-[10px] font-black border-none mb-1 rounded-full">{record.moduleSource.replace('_', ' ')}</Badge>
                                            <span className="text-[10px] font-bold text-gray-400">{record.createdAt ? format(new Date(record.createdAt), 'dd MMM yyyy') : ''}</span>
                                        </div>
                                        {getStatusBadge(record.status || "OPEN")}
                                    </div>

                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-3 line-clamp-2">
                                        {record.findingDescription}
                                    </h3>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800 mt-auto">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-gray-500" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{record.pic || "-"}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditClick(record)}
                                            className="text-blue-600 font-bold text-xs h-8 px-3 rounded-lg hover:bg-blue-50"
                                        >
                                            Update
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl p-6 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-red-500 to-emerald-500" />
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Edit2 className="h-5 w-5 text-blue-600" />
                            Update Deskripsi PICA
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRecord && (
                        <div className="grid gap-6 py-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Temuan</p>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed italic">"{selectedRecord.findingDescription}"</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">Status Keadaan</Label>
                                    <Select
                                        defaultValue={selectedRecord.status || "OPEN"}
                                        onValueChange={(val: any) => setSelectedRecord({ ...selectedRecord, status: val })}
                                    >
                                        <SelectTrigger className="rounded-xl border-gray-200 h-11 shadow-sm font-bold">
                                            <SelectValue placeholder="Pilih Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="OPEN" className="font-bold text-red-600 rounded-lg">OPEN</SelectItem>
                                            <SelectItem value="IN_PROGRESS" className="font-bold text-amber-600 rounded-lg">IN PROGRESS</SelectItem>
                                            <SelectItem value="CLOSED" className="font-bold text-emerald-600 rounded-lg">CLOSED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">Prioritas Temuan</Label>
                                    <Select
                                        defaultValue={selectedRecord.priority || "MEDIUM"}
                                        onValueChange={(val: any) => setSelectedRecord({ ...selectedRecord, priority: val })}
                                    >
                                        <SelectTrigger className="rounded-xl border-gray-200 h-11 shadow-sm font-bold">
                                            <SelectValue placeholder="Pilih Prioritas" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="HIGH" className="font-bold text-red-600 rounded-lg">HIGH</SelectItem>
                                            <SelectItem value="MEDIUM" className="font-bold text-blue-600 rounded-lg">MEDIUM</SelectItem>
                                            <SelectItem value="LOW" className="font-bold text-gray-500 rounded-lg">LOW</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">Penanggung Jawab (PIC)</Label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={selectedRecord.pic || ""}
                                        onChange={(e) => setSelectedRecord({ ...selectedRecord, pic: e.target.value })}
                                        placeholder="Nama penanggung jawab..."
                                        className="pl-10 h-11 rounded-xl border-gray-200 font-bold focus:ring-red-500/10 shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">Batas Waktu (Deadline)</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="date"
                                        value={selectedRecord.dueDate ? format(new Date(selectedRecord.dueDate), 'yyyy-MM-dd') : ""}
                                        onChange={(e) => setSelectedRecord({ ...selectedRecord, dueDate: e.target.value as any })}
                                        className="pl-10 h-11 rounded-xl border-gray-200 font-bold shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">Tindakan Perbaikan (Corrective Action)</Label>
                                <Textarea
                                    value={selectedRecord.correctiveAction || ""}
                                    onChange={(e) => setSelectedRecord({ ...selectedRecord, correctiveAction: e.target.value })}
                                    placeholder="Deskripsikan tindakan korektif yang dilakukan..."
                                    className="rounded-xl border-gray-200 min-h-[100px] font-medium leading-relaxed shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider ml-1">Evidence (Bukti Perbaikan)</Label>
                                <div className="space-y-3">
                                    {selectedRecord.verificationEvidence && (
                                        <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 rounded-xl">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                                <Paperclip className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">Sudi di-upload</p>
                                                <a href={selectedRecord.verificationEvidence} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">
                                                    Lihat Berkas
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    <Input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setEvidenceFile(e.target.files[0]);
                                            }
                                        }}
                                        className="h-11 rounded-xl shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                                    />
                                    <p className="text-[10px] text-gray-400 font-medium px-1">Upload foto/dokumen sebagai bukti jika temuan akan di-CLOSED.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-8 gap-3 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-bold h-11 px-6">
                            Batal
                        </Button>
                        <Button
                            onClick={() => {
                                if (selectedRecord) {
                                    updateMutation.mutate({
                                        id: selectedRecord.id,
                                        updates: {
                                            status: selectedRecord.status,
                                            priority: selectedRecord.priority,
                                            pic: selectedRecord.pic,
                                            dueDate: selectedRecord.dueDate,
                                            correctiveAction: selectedRecord.correctiveAction,
                                            updatedAt: new Date()
                                        }
                                    }, {
                                        onSuccess: async () => {
                                            if (evidenceFile) {
                                                const formData = new FormData();
                                                formData.append('evidence', evidenceFile);
                                                try {
                                                    const res = await fetch(`/api/pica/${selectedRecord.id}/upload-evidence`, {
                                                        method: 'POST',
                                                        body: formData
                                                    });
                                                    if (res.ok) {
                                                        queryClient.invalidateQueries({ queryKey: ["/api/pica"] });
                                                        toast({ title: "Evidence Uploaded", variant: "default" });
                                                    }
                                                } catch (e) {
                                                    toast({ title: "Gagal Upload Evidence", variant: "destructive" });
                                                }
                                            }
                                            setEvidenceFile(null);
                                        }
                                    });
                                }
                            }}
                            disabled={updateMutation.isPending || deleteAllMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-10 shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            {updateMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
