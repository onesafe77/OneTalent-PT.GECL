
import { useState, useEffect } from "react";
import { fotoKecil } from "@/lib/utils";
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
import { Plus, Search, Edit, Trash2, Upload, Download, Eye, ChevronLeft, ChevronRight, Filter, QrCode, ImageDown } from "lucide-react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { getExpiryStatus, getWorstExpiryLevel, type ExpiryLevel } from "@/lib/expiry-utils";

interface PaginatedResponse {
 data: Employee[];
 total: number;
 totalPages: number;
 page: number;
 perPage: number;
}

/** Dua tombol unduh per baris: QR code (dirender di browser) dan pas foto. */
function TombolUnduh({ nik, nama, qrData, photoUrl }: {
    nik: string; nama: string; qrData: string; photoUrl?: string | null;
}) {
    const { toast } = useToast();
    const [sibuk, setSibuk] = useState<"qr" | "foto" | null>(null);

    const simpan = (href: string, namaBerkas: string) => {
        const a = document.createElement("a");
        a.href = href;
        a.download = namaBerkas;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const unduhQR = async () => {
        setSibuk("qr");
        try {
            const url = await QRCode.toDataURL(qrData, {
                width: 512, margin: 2, color: { dark: "#000000", light: "#FFFFFF" },
            });
            simpan(url, `QR_${nik}_${nama.replace(/\s+/g, "_")}.png`);
        } catch {
            toast({ title: "Gagal membuat QR", variant: "destructive" });
        } finally { setSibuk(null); }
    };

    const unduhFoto = async () => {
        if (!photoUrl) return;
        setSibuk("foto");
        try {
            // Diambil sebagai blob supaya atribut download benar-benar menyimpan
            // berkas, bukan membuka gambar di tab baru.
            const res = await fetch(photoUrl);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
            const objUrl = URL.createObjectURL(blob);
            simpan(objUrl, `Foto_${nik}_${nama.replace(/\s+/g, "_")}.${ext}`);
            URL.revokeObjectURL(objUrl);
        } catch {
            toast({ title: "Gagal mengunduh foto", variant: "destructive" });
        } finally { setSibuk(null); }
    };

    return (
        <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon" onClick={unduhQR} disabled={sibuk === "qr"}
                title="Unduh QR Code" aria-label="Unduh QR Code">
                <QrCode className="w-4 h-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" onClick={unduhFoto}
                disabled={!photoUrl || sibuk === "foto"}
                title={photoUrl ? "Unduh foto" : "Tidak ada foto"} aria-label="Unduh foto">
                <ImageDown className="w-4 h-4 text-primary" />
            </Button>
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

 const deleteAllMutation = useMutation<{ message: string }, Error, string[] | undefined>({
 mutationFn: (positions) => {
 const url = positions && positions.length > 0
                ? `/api/employees?positions=${encodeURIComponent(positions.join(","))}`
 : "/api/employees";
 return apiRequest(url, "DELETE");
        },
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
 setIsDeleteAllOpen(false);
 setDeleteConfirmText("");
 toast({ title: "Berhasil", description: data.message || "Data berhasil dihapus" });
        },
 onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message || "Gagal menghapus data" }),
    });

 const handleEdit = (employee: Employee) => {
 setLocation(`/workspace/employees/${employee.id}`);
    };

    // confirm() bawaan browser tidak menyebut SIAPA yang akan dihapus — pada tabel
    // 329 baris itu berbahaya. Dialog di bawah menampilkan nama & NIK-nya.
    const [targetHapus, setTargetHapus] = useState<{ id: string; name: string } | null>(null);

 const handleNewEmployee = () => {
 setLocation("/workspace/employees/new");
    };

 interface BulkResult {
 message: string;
 successCount: number;
 failureCount: number;
 failures: { row: number; nik: string; reason: string }[];
    }
 const uploadExcelMutation = useMutation<BulkResult, Error, InsertEmployee[]>({
 mutationFn: (employeeData: InsertEmployee[]) =>
 apiRequest("/api/employees/bulk", "POST", { employees: employeeData }),
 onSuccess: (result) => {
 queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
 setIsUploadDialogOpen(false);
 if (result.failureCount > 0) {
 const sample = result.failures.slice(0, 3).map(f => `Baris ${f.row} (${f.nik}): ${f.reason}`).join('\n');
 toast({
 title: `Berhasil ${result.successCount}, Gagal ${result.failureCount}`,
 description: sample + (result.failures.length > 3 ? `\n...dan ${result.failures.length - 3} lainnya. Cek console.` : ''),
 variant: result.successCount > 0 ? "default" : "destructive",
                });
 console.error("Bulk import failures:", result.failures);
            } else {
 toast({ title: "Berhasil", description: `${result.successCount} karyawan berhasil diupload` });
            }
        },
 onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message || "Gagal mengupload data karyawan" }),
    });

    const handleExportExcel = () => {
        // Berkas dirakit di server (ExcelJS) supaya bisa ber-header tebal, berbaris
        // beku, ber-filter, dan bertautan foto — hal yang tidak bisa dilakukan
        // pustaka xlsx di browser.
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (positionFilter !== "all") params.set("position", positionFilter);
        const q = params.toString();
        window.location.href = `/api/employees/export${q ? `?${q}` : ""}`;
        toast({ title: "Menyiapkan file", description: "Unduhan akan dimulai sebentar lagi" });
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
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">List Karyawan</h1>
                    <p className="text-sm text-muted-foreground">Kelola data seluruh karyawan</p>
                </div>

                <div className="flex gap-2">
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
                            {/* Aksi merusak tidak boleh jadi elemen paling menarik
                                perhatian di halaman; konfirmasi berlapis tetap di dialog. */}
                            <Button variant="outline" size="sm"
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Driver & Mechanic
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-600">⚠️ Hapus Data Driver & Mechanic?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                    <div className="space-y-3">
                                        <p>Aksi ini akan menghapus <strong>SEMUA karyawan dengan posisi Driver dan Mechanic</strong> beserta data terkait (attendance, roster, cuti, MCU, sertifikat, dll).</p>
                                        <p className="text-sm text-muted-foreground">Karyawan dengan posisi lain (HSE, Production, Maintenance, dll) tidak akan terpengaruh.</p>
                                        <p>Untuk konfirmasi, ketik <code className="bg-red-100 px-2 py-0.5 rounded text-red-700 font-mono">HAPUS</code> di bawah ini:</p>
                                        <Input
 value={deleteConfirmText}
 onChange={(e) => setDeleteConfirmText(e.target.value)}
 placeholder="Ketik HAPUS"
 autoComplete="off"
                                        />
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
 disabled={deleteConfirmText !== "HAPUS" || deleteAllMutation.isPending}
 onClick={(e) => { e.preventDefault(); deleteAllMutation.mutate(["Driver", "Mechanic"]); }}
 className="bg-gray-950 hover:bg-gray-800"
                                >
                                    {deleteAllMutation.isPending ? "Menghapus..." : "Hapus Driver & Mechanic"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">

                <TabsContent value="list" className="mt-0">
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
                                            <SelectItem value="expired">EXPIRED</SelectItem>
                                            <SelectItem value="near_expired">NEAR EXPIRED (≤60 hari)</SelectItem>
                                            <SelectItem value="aktif">AKTIF (&#62;60 hari)</SelectItem>
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
                                            <TableHead>Posisi</TableHead>
                                            <TableHead>Departemen</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-center">SIM/SIMPER</TableHead>
                                            <TableHead className="text-center">Unduh</TableHead>
                                            <TableHead className="text-right pr-4">Aksi</TableHead>
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
                                                                    <AvatarImage src={fotoKecil(employee.photoUrl, 96)} />
                                                                    <AvatarFallback className="text-[10px]">{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                            </TableCell>
                                                            <TableCell className="font-medium text-xs md:text-sm">{employee.id}</TableCell>
                                                            <TableCell className="text-xs md:text-sm">{employee.name}</TableCell>
                                                            <TableCell className="text-xs md:text-sm">{employee.position}</TableCell>
                                                            <TableCell className="text-xs md:text-sm">{employee.department}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={employee.status === "active" ? "secondary" : "destructive"} className="text-[10px] md:text-xs">
                                                                    {employee.status === "active" ? "Aktif" : "Non-Aktif"}
                                                                </Badge>
                                                            </TableCell>
                                                            {/* SIM/SIMPER Status Badges */}
                                                            <TableCell className="text-center">
                                                                <TooltipProvider>
                                                                    <div className="flex justify-center gap-1">
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge className={`${simpolStatus.badgeClass} px-1.5 font-mono text-[9px] tracking-[0.06em]`}>POL</Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>SIMPOL: {simpolStatus.status} - {simpolStatus.displayText}</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge className={`${bibStatus.badgeClass} px-1.5 font-mono text-[9px] tracking-[0.06em]`}>BIB</Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>SIMPER BIB: {bibStatus.status} - {bibStatus.displayText}</p></TooltipContent>
                                                                        </Tooltip>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge className={`${tiaStatus.badgeClass} px-1.5 font-mono text-[9px] tracking-[0.06em]`}>TIA</Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>SIMPER TIA: {tiaStatus.status} - {tiaStatus.displayText}</p></TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </TooltipProvider>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <TombolUnduh
                                                                    nik={employee.id}
                                                                    nama={employee.name}
                                                                    qrData={employee.qrCode || `https://onetalent.app/driver-view?nik=${employee.id}`}
                                                                    photoUrl={employee.photoUrl}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right space-x-1 md:space-x-2 pr-4">
                                                                {/* Lihat detail (baca saja) — terpisah dari Edit supaya membuka data
                                                                    tidak berarti masuk mode ubah. */}
                                                                <Button variant="ghost" size="icon" title="Lihat detail" aria-label="Lihat detail"
                                                                    onClick={() => setLocation(`/workspace/employees/${employee.id}?view=1`)}>
                                                                    <Eye className="w-4 h-4 text-primary" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" title="Ubah" aria-label="Ubah" onClick={() => handleEdit(employee)}><Edit className="w-4 h-4 text-primary" /></Button>
                                                                <Button variant="ghost" size="icon" title="Hapus" aria-label="Hapus" onClick={() => setTargetHapus({ id: employee.id, name: employee.name })} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
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
            </Tabs>
            {/* Konfirmasi hapus satu karyawan */}
            <AlertDialog open={!!targetHapus} onOpenChange={(o) => !o && setTargetHapus(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus karyawan ini?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <div className="rounded-lg border border-border bg-muted p-3">
                                    <p className="text-[15px] font-medium text-foreground">{targetHapus?.name}</p>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                        {targetHapus?.id}
                                    </p>
                                </div>
                                <p>
                                    Data karyawan ini akan dihapus permanen dan <strong>tidak bisa dikembalikan</strong>.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                            onClick={() => { if (targetHapus) deleteMutation.mutate(targetHapus.id); setTargetHapus(null); }}
                        >
                            Ya, hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

    );
}
