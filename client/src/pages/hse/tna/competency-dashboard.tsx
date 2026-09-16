import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,

} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
    Search,
    Download,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Edit,
    Plus,
    Check,
    ChevronsUpDown,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO, isValid } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper to calculate status
const getMonitoringStatus = (expiryDateStr?: string | null) => {
    // If no expiry date, assume Aktif (No Expiry) - or handle as "No Info"
    if (!expiryDateStr) return { status: "Aktif", label: "Aktif (No Expiry)", color: "bg-muted text-foreground", icon: CheckCircle };

    const today = new Date();
    const expiry = parseISO(expiryDateStr);

    if (!isValid(expiry)) return { status: "Error", label: "Invalid Date", color: "bg-gray-100 text-gray-500", icon: AlertTriangle };

    const diff = differenceInDays(expiry, today);

    if (diff < 0) {
        return { status: "Expired", label: `Expired (${format(expiry, "dd MMM yyyy")})`, color: "bg-red-100 text-red-700", icon: XCircle };
    } else if (diff <= 30) {
        return { status: "Warning", label: `Akan Habis (${format(expiry, "dd MMM yyyy")})`, color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle };
    } else {
        return { status: "Aktif", label: `Aktif (${format(expiry, "dd MMM yyyy")})`, color: "bg-muted text-foreground", icon: CheckCircle };
    }
};

export default function CompetencyDashboard() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDepartment, setFilterDepartment] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    // Edit Modal State
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [editForm, setEditForm] = useState({
        certificateNumber: "",
        issuer: "",
        issueDate: "",
        expiryDate: ""
    });

    // Add Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [openEmployeeCombobox, setOpenEmployeeCombobox] = useState(false);
    const [addForm, setAddForm] = useState({
        employeeId: "",
        trainingId: "",
        certificateNumber: "",
        issuer: "",
        issueDate: "",
        expiryDate: ""
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch Lists
    const { data: trainings = [] } = useQuery<any[]>({ queryKey: ["/api/hse/trainings"] });
    const { data: employeesResponse } = useQuery<{ data: any[], total: number }>({ queryKey: ["/api/employees?per_page=1000"] });
    const employees = employeesResponse?.data || [];

    // Fetch all TNA entries (using same endpoint as dashboard, we flatten it)
    const { data: allSummaries = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/hse/tna-dashboard/all-entries"],
    });

    // Flatten logic
    const allRows = useMemo(() => {
        if (!allSummaries || !Array.isArray(allSummaries)) return [];
        return allSummaries.flatMap(summary =>
            (summary.trainings || []).map((t: any) => ({
                ...t,
                employeeId: summary.employeeId,
                employeeName: summary.employeeName,
                department: summary.department,
                position: summary.position,
            }))
        );
    }, [allSummaries]);

    // Derived Filters
    const uniqueDepartments = useMemo(() => {
        const depts = new Set(allRows.map(r => r.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [allRows]);

    // Filtering
    const filteredRows = useMemo(() => {
        return allRows.filter(row => {
            const monitoring = getMonitoringStatus(row.expiryDate);

            // Search
            const searchMatch = searchQuery === "" ||
                row.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.trainingName?.toLowerCase().includes(searchQuery.toLowerCase());

            // Department
            const deptMatch = filterDepartment === "all" || row.department === filterDepartment;

            // Status
            const statusMatch = filterStatus === "all" || monitoring.status === filterStatus;

            return searchMatch && deptMatch && statusMatch;
        });
    }, [allRows, searchQuery, filterDepartment, filterStatus]);

    // Mutation for Update
    const updateMutation = useMutation({
        mutationFn: async (vars: { id: string, data: any }) => {
            const res = await apiRequest(`/api/hse/tna/entries/${vars.id}`, "PATCH", vars.data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/all-entries"] });
            toast({
                title: "Berhasil update sertifikat",
                description: "Data sertifikat telah diperbarui",
            });
            setEditingEntry(null);
        },
        onError: (err) => {
            toast({
                title: "Gagal update",
                description: "Terjadi kesalahan saat menyimpan data",
                variant: "destructive"
            });
        }
    });

    // Mutation for Create
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("/api/hse/tna/entries/simple", "POST", data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/all-entries"] });
            toast({
                title: "Berhasil menambah data",
                description: "Sertifikat baru berhasil disimpan",
            });
            setIsAddOpen(false);
            setAddForm({
                employeeId: "",
                trainingId: "",
                certificateNumber: "",
                issuer: "",
                issueDate: "",
                expiryDate: ""
            });
            setSelectedFile(null);
        },
        onError: (err: any) => {
            console.error("Mutation Error:", err);
            toast({
                title: "Gagal menambah data",
                description: err.message || "Terjadi kesalahan saat menyimpan",
                variant: "destructive"
            });
        }
    });

    const handleSaveAdd = async () => {
        if (!addForm.employeeId || !addForm.trainingId) {
            toast({
                title: "Validasi Gagal",
                description: "Mohon pilih Karyawan dan Kompetensi",
                variant: "destructive"
            });
            return;
        }

        let evidenceFileUrl = "";

        if (selectedFile) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);

                // Use fetch directly for FormData to avoid header issues with apiRequest wrapper if it enforces JSON
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });

                if (!res.ok) throw new Error("Upload failed");

                const data = await res.json();
                evidenceFileUrl = data.url;
            } catch (error) {
                toast({
                    title: "Upload Gagal",
                    description: "Gagal mengupload file sertifikat",
                    variant: "destructive"
                });
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        createMutation.mutate({ ...addForm, evidenceFile: evidenceFileUrl });
    };

    const handleEditClick = (entry: any) => {
        setEditingEntry(entry);
        setEditForm({
            certificateNumber: entry.certificateNumber || "",
            issuer: entry.issuer || "",
            issueDate: entry.issueDate || "", // format YYYY-MM-DD
            expiryDate: entry.expiryDate || ""
        });
    };

    const handleSaveEdit = () => {
        if (!editingEntry) return;
        updateMutation.mutate({
            id: editingEntry.id,
            data: {
                certificateNumber: editForm.certificateNumber,
                issuer: editForm.issuer,
                issueDate: editForm.issueDate || null,
                expiryDate: editForm.expiryDate || null
            }
        });
    };

    const handleExport = () => {
        const headers = [
            "NIK", "Nama Karyawan", "Jabatan", "Department",
            "Nama Kompetensi", "Kategori",
            "Nomor Sertifikat", "Lembaga Penerbit", "Tanggal Terbit", "Tanggal Expired",
            "Monitoring Harian", "Status Expiry"
        ];

        const rows = filteredRows.map(r => {
            const m = getMonitoringStatus(r.expiryDate);
            return [
                r.employeeId,
                r.employeeName,
                r.position || "-",
                r.department || "-",
                r.trainingName || "-",
                r.trainingCategory || "-",
                r.certificateNumber || "-",
                r.issuer || "-",
                r.issueDate || "-",
                r.expiryDate || "-",
                m.label, // Monitoring column content
                m.status // Status Expiry
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `monitoring-kompetensi-${format(new Date(), "yyyy-MM-dd")}.csv`;
        link.click();
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-black min-h-screen font-sans" >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-red-600">
                        Monitoring Kompetensi & Sertifikasi
                    </h1>
                    <p className="text-gray-500 text-sm">Monitor status masa berlaku sertifikat kompetensi karyawan (Daily Auto-Check)</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                        <Plus className="w-4 h-4" /> Tambah Data
                    </Button>
                    <Button onClick={handleExport} className="gap-2 bg-primary hover:bg-primary/90">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm" >
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Cari (Nama/NIK/Kompetensi)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search..."
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
                                    <SelectValue placeholder="All Dept" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Dept</SelectItem>
                                    {uniqueDepartments.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Status Monitoring</label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="Aktif">Aktif</SelectItem>
                                    <SelectItem value="Warning">Akan Habis (≤30 Hari)</SelectItem>
                                    <SelectItem value="Expired">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card >

            {/* Main Table */}
            < Card className="border-none shadow-sm overflow-hidden" >
                <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/20">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg text-red-800 dark:text-red-300">Data Sertifikat</CardTitle>
                            <CardDescription>
                                Menampilkan {filteredRows.length} kompetensi
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table className="whitespace-nowrap">
                        <TableHeader>
                            <TableRow className="border-b border-red-100 dark:border-red-900">
                                <TableHead className="w-[50px] text-xs font-semibold text-red-700 dark:text-red-300 text-center">No</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">NIK</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Nama Karyawan</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Jabatan</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Department</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Nama Kompetensi</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Kategori</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">No. Sertifikat</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Lembaga</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Tgl Terbit</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Tgl Expired</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300">Monitoring Harian</TableHead>
                                <TableHead className="text-xs font-semibold text-red-700 dark:text-red-300 text-center">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8 text-gray-400">Loading data...</TableCell>
                                </TableRow>
                            ) : filteredRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="text-center py-8 text-gray-400">Tidak ada data ditemukan</TableCell>
                                </TableRow>
                            ) : (
                                filteredRows.map((row, idx) => {
                                    const monitor = getMonitoringStatus(row.expiryDate);
                                    const StatusIcon = monitor.icon;

                                    return (
                                        <TableRow key={row.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                            <TableCell className="text-center text-xs text-gray-500">{idx + 1}</TableCell>
                                            <TableCell className="text-xs font-mono text-gray-600">{row.employeeId}</TableCell>
                                            <TableCell className="text-xs font-medium max-w-[150px] truncate" title={row.employeeName}>{row.employeeName}</TableCell>
                                            <TableCell className="text-xs text-gray-500 max-w-[120px] truncate" title={row.position}>{row.position || "-"}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{row.department || "-"}</TableCell>
                                            <TableCell className="text-xs font-medium max-w-[200px] truncate" title={row.trainingName}>{row.trainingName}</TableCell>
                                            <TableCell className="text-xs text-gray-500">{row.trainingCategory || "-"}</TableCell>

                                            {/* Certification Data */}
                                            <TableCell className="text-xs">{row.certificateNumber || <span className="text-gray-300 italic">Empty</span>}</TableCell>
                                            <TableCell className="text-xs">{row.issuer || "-"}</TableCell>
                                            <TableCell className="text-xs">{row.issueDate ? format(parseISO(row.issueDate), "dd/MM/yyyy") : "-"}</TableCell>
                                            <TableCell className="text-xs font-mono">{row.expiryDate ? format(parseISO(row.expiryDate), "dd/MM/yyyy") : "-"}</TableCell>

                                            {/* Monitoring Badge */}
                                            <TableCell>
                                                <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border", monitor.color)}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {monitor.label}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-red-600 hover:text-red-800"
                                                    onClick={() => handleEditClick(row)}
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card >

            {/* Edit Modal */}
            < Dialog open={!!editingEntry
            } onOpenChange={(open) => !open && setEditingEntry(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Update Sertifikat</DialogTitle>
                        <DialogDescription>
                            Input detail sertifikat untuk kompetensi: <br />
                            <span className="font-bold text-black dark:text-white">{editingEntry?.trainingName}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nomor Sertifikat</Label>
                                <Input
                                    placeholder="Contoh: 123/SERT/2026"
                                    value={editForm.certificateNumber}
                                    onChange={e => setEditForm(prev => ({ ...prev, certificateNumber: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lembaga Penerbit</Label>
                                <Input
                                    placeholder="Contoh: BNSP / Internal"
                                    value={editForm.issuer}
                                    onChange={e => setEditForm(prev => ({ ...prev, issuer: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tanggal Terbit</Label>
                                <Input
                                    type="date"
                                    value={editForm.issueDate}
                                    onChange={e => setEditForm(prev => ({ ...prev, issueDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tanggal Expired</Label>
                                <Input
                                    type="date"
                                    value={editForm.expiryDate}
                                    onChange={e => setEditForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                />
                                <p className="text-[10px] text-gray-500">
                                    *Monitoring harian akan dihitung dari tanggal ini.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Upload Bukti Sertifikat (PDF/Gambar)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                            {selectedFile && (
                                <span className="text-xs text-foreground font-medium whitespace-nowrap">
                                    File dipilih
                                </span>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleSaveAdd}
                            disabled={createMutation.isPending || isUploading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {createMutation.isPending || isUploading ? "Menyimpan..." : "Simpan Data"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Add Modal */}
            < Dialog open={isAddOpen} onOpenChange={setIsAddOpen} >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tambah Data Sertifikat</DialogTitle>
                        <DialogDescription>
                            Tambahkan data sertifikat kompetensi baru secara manual.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2 flex flex-col">
                            <Label>Pilih Karyawan</Label>
                            <Popover open={openEmployeeCombobox} onOpenChange={setOpenEmployeeCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openEmployeeCombobox}
                                        className="w-full justify-between"
                                    >
                                        {addForm.employeeId
                                            ? employees.find((emp: any) => emp.id === addForm.employeeId)?.name
                                            : "Pilih Karyawan..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[460px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Cari karyawan..." />
                                        <CommandList>
                                            <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
                                            <CommandGroup>
                                                {employees.map((emp: any) => (
                                                    <CommandItem
                                                        key={emp.id}
                                                        value={emp.name}
                                                        onSelect={() => {
                                                            setAddForm(prev => ({ ...prev, employeeId: emp.id }));
                                                            setOpenEmployeeCombobox(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                addForm.employeeId === emp.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {emp.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label>Pilih Kompetensi</Label>
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombobox}
                                        className="w-full justify-between"
                                    >
                                        {addForm.trainingId
                                            ? trainings.find((t: any) => t.id.toString() === addForm.trainingId)?.name
                                            : "Pilih Kompetensi..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[460px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Cari kompetensi..." />
                                        <CommandList>
                                            <CommandEmpty>Kompetensi tidak ditemukan.</CommandEmpty>
                                            <CommandGroup>
                                                {trainings.map((t: any) => (
                                                    <CommandItem
                                                        key={t.id}
                                                        value={t.name}
                                                        onSelect={() => {
                                                            setAddForm(prev => ({ ...prev, trainingId: t.id.toString() }));
                                                            setOpenCombobox(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                addForm.trainingId === t.id.toString() ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {t.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nomor Sertifikat</Label>
                                <Input
                                    placeholder="Nomor Sertifikat"
                                    value={addForm.certificateNumber}
                                    onChange={e => setAddForm(prev => ({ ...prev, certificateNumber: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lembaga Penerbit</Label>
                                <Input
                                    placeholder="Lembaga Penerbit"
                                    value={addForm.issuer}
                                    onChange={e => setAddForm(prev => ({ ...prev, issuer: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tanggal Terbit</Label>
                                <Input
                                    type="date"
                                    value={addForm.issueDate}
                                    onChange={e => setAddForm(prev => ({ ...prev, issueDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tanggal Expired</Label>
                                <Input
                                    type="date"
                                    value={addForm.expiryDate}
                                    onChange={e => setAddForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Upload Bukti Sertifikat (PDF/Gambar)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer"
                                />
                                {selectedFile && (
                                    <span className="text-xs text-foreground font-medium whitespace-nowrap">
                                        File dipilih
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleSaveAdd}
                            disabled={createMutation.isPending || isUploading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {createMutation.isPending || isUploading ? "Menyimpan..." : "Simpan Data"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    );
}
