
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee, InsertEmployee } from "@shared/schema";
import { Plus, Search, Edit, Trash2, Upload, Download, Eye, QrCode, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { DriverQRGenerator } from "@/components/qr/driver-qr-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { getExpiryStatus, getWorstExpiryLevel, type ExpiryLevel } from "@/lib/expiry-utils";

interface PaginatedResponse {
    data: Employee[];
    total: number;
    totalPages: number;
    page: number;
    perPage: number;
}

function QRCodeDisplay({ qrData, employeeName }: { qrData: string; employeeName: string }) {
    const [qrImageUrl, setQrImageUrl] = useState<string>("");
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    const generateQRImage = async () => {
        try {
            const url = await QRCode.toDataURL(qrData, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            });
            setQrImageUrl(url);
            return url;
        } catch (error) {
            console.error('Error generating QR code:', error);
            return null;
        }
    };

    const downloadQRCode = async () => {
        const url = qrImageUrl || await generateQRImage();
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_${employeeName.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const viewQRCode = async () => {
        if (!qrImageUrl) await generateQRImage();
        setIsViewDialogOpen(true);
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={viewQRCode} className="h-8 w-8 p-0"><Eye className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={downloadQRCode} className="h-8 w-8 p-0"><Download className="w-4 h-4" /></Button>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>QR Code - {employeeName}</DialogTitle></DialogHeader>
                    <div className="flex flex-col items-center space-y-4">
                        {qrImageUrl && <img src={qrImageUrl} alt={`QR Code for ${employeeName}`} className="w-64 h-64 border rounded-lg" />}
                        <Button onClick={downloadQRCode} className="flex items-center gap-2"><Download className="w-4 h-4" /> Download QR Code</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function EmployeesList() {
    const [, setLocation] = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [expiryFilter, setExpiryFilter] = useState<string>("all"); // all, expired, kritis, warning
    const [positionFilter, setPositionFilter] = useState<string>("all");
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const { toast } = useToast();
    const perPage = 20;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to page 1 on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 1 when position filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [positionFilter]);

    const { data: response, isLoading } = useQuery<PaginatedResponse>({
        queryKey: ["/api/employees", currentPage, debouncedSearch, positionFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: String(perPage),
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(positionFilter !== "all" && { position: positionFilter })
            });
            const res = await fetch(`/api/employees?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        }
    });

    const { data: allEmployeesResponse } = useQuery<{ data: Employee[]; total: number }>({
        queryKey: ["/api/employees", "all-positions"],
        queryFn: async () => {
            const res = await fetch(`/api/employees`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
    });

    const employees = response?.data || [];
    const total = response?.total || 0;
    const totalPages = response?.totalPages || 1;

    const uniquePositions = Array.from(
        new Set((allEmployeesResponse?.data ?? []).map(e => e.position).filter((p): p is string => Boolean(p)))
    ).sort();

    const deleteMutation = useMutation<void, Error, string>({
        mutationFn: (id: string) => apiRequest(`/api/employees/${id}`, "DELETE"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            toast({ title: "Berhasil", description: "Karyawan berhasil dihapus" });
        },
        onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message || "Gagal menghapus karyawan" }),
    });

    const deleteAllMutation = useMutation<{ message: string }, Error, void>({
        mutationFn: () => apiRequest("/api/employees", "DELETE"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            setIsDeleteAllOpen(false);
            setDeleteConfirmText("");
            toast({ title: "Berhasil", description: "Semua data karyawan berhasil dihapus" });
        },
        onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message || "Gagal menghapus semua data" }),
    });

    const handleEdit = (employee: Employee) => {
        setLocation(`/workspace/employees/${employee.id}`);
    };

    const handleDelete = (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) deleteMutation.mutate(id);
    };

    const handleNewEmployee = () => {
        setLocation("/workspace/employees/new");
    };

    const uploadExcelMutation = useMutation<void, Error, InsertEmployee[]>({
        mutationFn: (employeeData: InsertEmployee[]) =>
            apiRequest("/api/employees/bulk", "POST", { employees: employeeData }).then(() => { }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            setIsUploadDialogOpen(false);
            toast({ title: "Berhasil", description: "Data karyawan berhasil diupload" });
        },
        onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message || "Gagal mengupload data karyawan" }),
    });

    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (positionFilter !== "all") params.set("position", positionFilter);
            const url = params.toString() ? `/api/employees?${params}` : `/api/employees`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            const list: Employee[] = json.data ?? [];

            const rows = list.map(e => ({
                NIK: e.id,
                Nama: e.name,
                Posisi: e.position ?? "",
                Departemen: e.department ?? "",
                "Investor Group": e.investorGroup ?? "",
                "No. WhatsApp": e.phone ?? "",
                Status: e.status === "active" ? "Aktif" : "Non-Aktif",
                "Expired SIM POL": e.expiredSimpol ?? "",
                "Expired SIMPER BIB": e.expiredSimperBib ?? "",
                "Expired SIMPER TIA": e.expiredSimperTia ?? "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Karyawan");
            const today = new Date().toISOString().slice(0, 10);
            const suffix = positionFilter !== "all" ? `_${positionFilter.replace(/\s+/g, "_")}` : "";
            XLSX.writeFile(workbook, `List_Karyawan${suffix}_${today}.xlsx`);

            toast({ title: "Export berhasil", description: `${rows.length} karyawan diexport` });
        } catch (err) {
            toast({ title: "Export gagal", description: "Gagal mengekspor data", variant: "destructive" });
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const rows = jsonData.slice(1) as any[][];
                const employeeData: InsertEmployee[] = rows
                    .filter(row => row.length >= 6 && row[0] && row[1])
                    .map(row => ({
                        id: row[0]?.toString() || "",
                        name: row[1]?.toString() || "",
                        position: row[2]?.toString() || "",
                        department: row[3]?.toString() || "",
                        investorGroup: row[4]?.toString() || "",
                        phone: row[5]?.toString() || "",
                        status: "active",
                    }));

                if (employeeData.length === 0) {
                    toast({ title: "Error", variant: "destructive", description: "File Excel tidak memiliki data yang valid" });
                    return;
                }
                uploadExcelMutation.mutate(employeeData);
            } catch (error) {
                toast({ title: "Error", variant: "destructive", description: "Gagal membaca file Excel" });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Pagination helpers
    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, total);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push("...");

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">List Karyawan</h1>
                    <p className="text-sm text-muted-foreground">Kelola data seluruh karyawan</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={async () => {
                            try {
                                const response = await apiRequest("/api/qr/update-all", "POST", {});
                                toast({
                                    title: "QR Code Update",
                                    description: response.message || "Semua QR Code berhasil diupdate ke format URL",
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                            } catch (error) {
                                toast({
                                    title: "Error",
                                    description: "Gagal mengupdate QR Code",
                                    variant: "destructive",
                                });
                            }
                        }}
                        variant="outline"
                        size="sm"
                        className="hidden md:flex"
                    >
                        <QrCode className="w-4 h-4 mr-2" />
                        Update QR URL
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                    </Button>
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Import Data Karyawan</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={handleNewEmployee} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah
                    </Button>
                    <AlertDialog open={isDeleteAllOpen} onOpenChange={(open) => { setIsDeleteAllOpen(open); if (!open) setDeleteConfirmText(""); }}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Semua
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-600">⚠️ Hapus Semua Data Karyawan?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                    <div className="space-y-3">
                                        <p>Aksi ini akan menghapus <strong>SEMUA {total} karyawan</strong> dari database secara permanen. Data yang dihapus tidak bisa dikembalikan.</p>
                                        <p>Untuk konfirmasi, ketik <code className="bg-red-100 px-2 py-0.5 rounded text-red-700 font-mono">HAPUS SEMUA</code> di bawah ini:</p>
                                        <Input
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="Ketik HAPUS SEMUA"
                                            autoComplete="off"
                                        />
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={deleteConfirmText !== "HAPUS SEMUA" || deleteAllMutation.isPending}
                                    onClick={(e) => { e.preventDefault(); deleteAllMutation.mutate(); }}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {deleteAllMutation.isPending ? "Menghapus..." : "Hapus Semua"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="list">Daftar Karyawan</TabsTrigger>
                    <TabsTrigger value="qr-generator">Generator QR Driver</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari karyawan..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {/* Position Filter */}
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Filter Posisi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Posisi</SelectItem>
                                            {uniquePositions.map(pos => (
                                                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Expiry Status Filter */}
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filter SIM/SIMPER" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Status</SelectItem>
                                            <SelectItem value="expired">🔴 EXPIRED</SelectItem>
                                            <SelectItem value="near_expired">🟡 NEAR EXPIRED (≤60 hari)</SelectItem>
                                            <SelectItem value="aktif">🟢 AKTIF (&#62;60 hari)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Foto</TableHead>
                                            <TableHead>NIK</TableHead>
                                            <TableHead>Nama</TableHead>
                                            <TableHead className="hidden md:table-cell">Posisi</TableHead>
                                            <TableHead className="hidden md:table-cell">Departemen</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-center">SIM/SIMPER</TableHead>
                                            <TableHead className="text-center">QR</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={9} className="text-center h-24">Memuat data...</TableCell></TableRow>
                                        ) : employees.length === 0 ? (
                                            <TableRow><TableCell colSpan={9} className="text-center h-24">Tidak ada data karyawan ditemukan</TableCell></TableRow>
                                        ) : (
                                            employees
                                                .filter((employee) => {
                                                    if (expiryFilter === "all") return true;
                                                    const levels = [
                                                        getExpiryStatus(employee.expiredSimpol).level,
                                                        getExpiryStatus(employee.expiredSimperBib).level,
                                                        getExpiryStatus(employee.expiredSimperTia).level
                                                    ];
                                                    return levels.includes(expiryFilter as ExpiryLevel);
                                                })
                                                .map((employee) => {
                                                    const simpolStatus = getExpiryStatus(employee.expiredSimpol);
                                                    const bibStatus = getExpiryStatus(employee.expiredSimperBib);
                                                    const tiaStatus = getExpiryStatus(employee.expiredSimperTia);

                                                    return (
                                                        <TableRow key={employee.id}>
                                                            <TableCell>
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={employee.photoUrl || ""} />
                                                                    <AvatarFallback className="text-[10px]">{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                            </TableCell>
                                                            <TableCell className="font-medium text-xs md:text-sm">{employee.id}</TableCell>
                                                            <TableCell className="text-xs md:text-sm">{employee.name}</TableCell>
                                                            <TableCell className="hidden md:table-cell text-xs md:text-sm">{employee.position}</TableCell>
                                                            <TableCell className="hidden md:table-cell text-xs md:text-sm">{employee.department}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={employee.status === "active" ? "default" : "destructive"} className="text-[10px] md:text-xs">
                                                                    {employee.status === "active" ? "Aktif" : "Non-Aktif"}
                                                                </Badge>
                                                            </TableCell>
                                                            {/* SIM/SIMPER Status Badges */}
                                                            <TableCell className="text-center">
                                                                <TooltipProvider>
                                                                    <div className="flex justify-center gap-1">
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge className={`${simpolStatus.badgeClass} text-[8px] px-1`}>POL</Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>SIMPOL: {simpolStatus.status} - {simpolStatus.displayText}</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge className={`${bibStatus.badgeClass} text-[8px] px-1`}>BIB</Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>SIMPER BIB: {bibStatus.status} - {bibStatus.displayText}</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge className={`${tiaStatus.badgeClass} text-[8px] px-1`}>TIA</Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>SIMPER TIA: {tiaStatus.status} - {tiaStatus.displayText}</p></TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </TooltipProvider>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex justify-center">
                                                                    <QRCodeDisplay
                                                                        qrData={employee.qrCode || `https://onetalent.app/driver-view?nik=${employee.id}`}
                                                                        employeeName={employee.name}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right space-x-1 md:space-x-2">
                                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}><Edit className="w-4 h-4" /></Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                                <p className="text-sm text-muted-foreground">
                                    Menampilkan {startItem}–{endItem} dari {total} data
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Prev
                                    </Button>
                                    {getPageNumbers().map((page, idx) => (
                                        typeof page === "number" ? (
                                            <Button
                                                key={idx}
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className="w-8"
                                            >
                                                {page}
                                            </Button>
                                        ) : (
                                            <span key={idx} className="px-2">...</span>
                                        )
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="qr-generator" className="mt-4">
                    <DriverQRGenerator />
                </TabsContent>
            </Tabs>
        </div>
    );
}
