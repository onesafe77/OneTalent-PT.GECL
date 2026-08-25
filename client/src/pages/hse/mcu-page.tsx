import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    Hammer,
    FileText,
    Upload,
    Trash2,
    Edit,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Search,
    Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { McuRecord } from "@shared/schema";
import * as XLSX from "xlsx";

export default function McuPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: records = [], isLoading } = useQuery<McuRecord[]>({
        queryKey: ["/api/hse/mcu"],
    });

    const { data: stats } = useQuery<{ total: number; fit: number; unfit: number; expiredSoon: number }>({
        queryKey: ["/api/hse/mcu/stats"],
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<McuRecord | null>(null);

    const simpanMutation = useMutation({
        mutationFn: async (data: any) => {
            const url = editing ? `/api/hse/mcu/${editing.id}` : "/api/hse/mcu";
            return apiRequest(url, editing ? "PUT" : "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hse/mcu"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/mcu/stats"] });
            toast({ title: editing ? "Data MCU diperbarui" : "Data MCU ditambahkan" });
            setFormOpen(false);
            setEditing(null);
        },
        onError: (e: any) => {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest(`/api/hse/mcu/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hse/mcu"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/mcu/stats"] });
            toast({ title: "Berhasil", description: "Data MCU berhasil dihapus" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleDelete = (id: string) => {
        if (confirm("Apakah anda yakin ingin menghapus data ini?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(records.map((r, i) => ({
            No: i + 1,
            NIK: (r as any).nik,
            Nama: r.nama,
            Jabatan: r.posisi,
            Departemen: (r as any).departemen,
            Perusahaan: r.perusahaan,
            Klinik: r.klinik,
            "MCU Baru": r.tanggalBaru ? format(new Date(r.tanggalBaru), "dd/MM/yyyy") : "-",
            "MCU Berkala": r.tanggalBerkala ? format(new Date(r.tanggalBerkala), "dd/MM/yyyy") : "-",
            "Masa Berlaku": r.tanggalAkhir ? format(new Date(r.tanggalAkhir), "dd/MM/yyyy") : "-",
            "Hasil": r.hasilKesimpulan,
            "Saran": r.verifikasiSaran,
            "Follow Up": r.followUp
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data MCU");
        XLSX.writeFile(workbook, `Data_MCU_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const filteredRecords = records.filter(r =>
        r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.perusahaan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r as any).nik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r as any).departemen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.hasilKesimpulan?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string | null) => {
        const s = status?.toUpperCase() || "";
        if (s.includes("UNFIT")) return <Badge variant="destructive">{status}</Badge>;
        if (s.includes("TEMPORARY")) return <Badge className="bg-orange-500">{status}</Badge>;
        if (s.includes("NOTE")) return <Badge className="bg-yellow-500">{status}</Badge>;
        return <Badge className="bg-green-500">{status}</Badge>;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Medical Check Up (MCU)</h1>
                    <p className="text-muted-foreground">Monitor kesehatan personil dan hasil evaluasi MCU.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Excel
                    </Button>
                    <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Manual
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Personil</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">Terdaftar di database MCU</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fit to Work</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.fit || 0}</div>
                        <p className="text-xs text-muted-foreground">Kondisi Prima</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unfit / Evaluation</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.unfit || 0}</div>
                        <p className="text-xs text-muted-foreground">Perlu pemantauan khusus</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired Soon</CardTitle>
                        <Calendar className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.expiredSoon || 0}</div>
                        <p className="text-xs text-muted-foreground">Expiring in 30 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Data MCU Personil</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama, NIK, dept, PT, status..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">No</TableHead>
                                    <TableHead>NIK</TableHead>
                                    <TableHead className="min-w-[180px]">Nama</TableHead>
                                    <TableHead>Jabatan</TableHead>
                                    <TableHead>Dept</TableHead>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead>Klinik</TableHead>
                                    <TableHead>Tgl Baru</TableHead>
                                    <TableHead>Tgl Berkala</TableHead>
                                    <TableHead>Tgl Akhir</TableHead>
                                    <TableHead>Kesimpulan Berkala</TableHead>
                                    <TableHead>Kesimpulan Akhir</TableHead>
                                    <TableHead>Hasil (Status)</TableHead>
                                    <TableHead>Saran</TableHead>
                                    <TableHead>Follow Up</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={16} className="h-24 text-center">
                                            Memuat data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={16} className="h-24 text-center">
                                            Tidak ada data ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record, index) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-mono text-xs whitespace-nowrap">{(record as any).nik || "-"}</TableCell>
                                            <TableCell className="font-medium">{record.nama}</TableCell>
                                            <TableCell className="text-xs">{record.posisi || "-"}</TableCell>
                                            <TableCell className="text-xs">{(record as any).departemen || "-"}</TableCell>
                                            <TableCell>{record.perusahaan || "-"}</TableCell>
                                            <TableCell>{record.klinik || "-"}</TableCell>
                                            <TableCell>
                                                {record.tanggalBaru ? format(new Date(record.tanggalBaru), "dd/MM/yyyy") : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {record.tanggalBerkala ? format(new Date(record.tanggalBerkala), "dd/MM/yyyy") : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {record.tanggalAkhir ? format(new Date(record.tanggalAkhir), "dd/MM/yyyy") : "-"}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={record.kesimpulanBerkala || ""}>
                                                {record.kesimpulanBerkala || "-"}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={record.kesimpulanAkhir || ""}>
                                                {record.kesimpulanAkhir || "-"}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(record.hasilKesimpulan)}</TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={record.verifikasiSaran || ""}>
                                                {record.verifikasiSaran || "-"}
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={record.followUp || ""}>
                                                {record.followUp || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" title="Ubah" onClick={() => { setEditing(record); setFormOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(record.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <DialogMcu
                open={formOpen}
                editing={editing}
                menyimpan={simpanMutation.isPending}
                onClose={() => { setFormOpen(false); setEditing(null); }}
                onSimpan={(data) => simpanMutation.mutate(data)}
            />

            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                                <span className="text-lg">🤖</span> Integrasi WhatsApp Webhook
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Gunakan URL ini untuk menghubungkan bot WhatsApp (e.g., via AppScript atau layanan 3rd party).
                                Bot akan otomatis memparsing pesan dengan kata kunci <strong>"MCU"</strong>.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto bg-white dark:bg-gray-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                            <code className="text-xs font-mono text-gray-600 dark:text-gray-300 px-2 truncate max-w-[300px]">
                                {window.location.origin}/api/webhook/whatsapp
                            </code>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/api/webhook/whatsapp`);
                                    toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
                                }}
                            >
                                Copy
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground text-center pb-8">
                <p>Tips: Kirim hasil MCU via WhatsApp ke bot dengan caption "MCU [Nama]" untuk input otomatis.</p>
            </div>
        </div>
    );
}

const KOSONG = {
    employeeId: null as string | null,
    nama: "", nik: "", posisi: "", departemen: "", perusahaan: "", klinik: "",
    tanggalBaru: "", tanggalBerkala: "", tanggalAkhir: "",
    kesimpulanBerkala: "", kesimpulanAkhir: "",
    hasilKesimpulan: "FIT TO WORK", verifikasiSaran: "", followUp: "",
};

const HASIL = ["FIT TO WORK", "FIT WITH NOTE", "TEMPORARY UNFIT", "UNFIT TO WORK"];

function DialogMcu({ open, editing, menyimpan, onClose, onSimpan }: {
    open: boolean; editing: McuRecord | null; menyimpan: boolean;
    onClose: () => void; onSimpan: (d: any) => void;
}) {
    const [f, setF] = useState<any>(KOSONG);
    const [galat, setGalat] = useState("");

    // Isi ulang tiap kali dialog dibuka, bukan tiap render, agar ketikan tidak tertimpa.
    useEffect(() => {
        if (!open) return;
        setGalat("");
        if (!editing) { setF(KOSONG); return; }
        const tgl = (v: any) => (v ? String(v).slice(0, 10) : "");
        setF({
            employeeId: (editing as any).employeeId || null,
            nama: editing.nama || "", nik: (editing as any).nik || "",
            posisi: editing.posisi || "", departemen: (editing as any).departemen || "",
            perusahaan: editing.perusahaan || "", klinik: editing.klinik || "",
            tanggalBaru: tgl(editing.tanggalBaru), tanggalBerkala: tgl(editing.tanggalBerkala),
            tanggalAkhir: tgl(editing.tanggalAkhir),
            kesimpulanBerkala: editing.kesimpulanBerkala || "",
            kesimpulanAkhir: editing.kesimpulanAkhir || "",
            hasilKesimpulan: editing.hasilKesimpulan || "FIT TO WORK",
            verifikasiSaran: editing.verifikasiSaran || "", followUp: editing.followUp || "",
        });
    }, [open, editing]);

    const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

    const kirim = () => {
        if (!f.nama.trim()) { setGalat("Nama wajib diisi."); return; }
        // Kolom tanggal di Postgres menolak string kosong — kirim null.
        const bersih: any = { ...f, nama: f.nama.trim() };
        for (const k of ["tanggalBaru", "tanggalBerkala", "tanggalAkhir"]) {
            if (!bersih[k]) bersih[k] = null;
        }
        onSimpan(bersih);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editing ? "Ubah Data MCU" : "Tambah Data MCU"}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label>Nama <span className="text-destructive">*</span></Label>
                        <PilihKaryawan
                            nama={f.nama}
                            onPilih={(k) => setF((p: any) => ({
                                ...p,
                                employeeId: k.id, nama: k.name, nik: k.id,
                                posisi: k.position || "", departemen: k.department || "",
                            }))}
                            onKetik={(v) => setF((p: any) => ({ ...p, nama: v, employeeId: null, nik: "" }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Cari nama dari data manpower — NIK, jabatan, dan departemen terisi otomatis.
                            Nama di luar daftar boleh diketik manual.
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label>NIK</Label>
                        <Input value={f.nik} onChange={set("nik")} placeholder="mis. C-019066" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Jabatan</Label>
                        <Input value={f.posisi} onChange={set("posisi")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Departemen</Label>
                        <Input value={f.departemen} onChange={set("departemen")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Perusahaan</Label>
                        <Input value={f.perusahaan} onChange={set("perusahaan")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Klinik</Label>
                        <Input value={f.klinik} onChange={set("klinik")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tgl MCU Baru</Label>
                        <Input type="date" value={f.tanggalBaru} onChange={set("tanggalBaru")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tgl MCU Berkala</Label>
                        <Input type="date" value={f.tanggalBerkala} onChange={set("tanggalBerkala")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tgl MCU Akhir (masa berlaku)</Label>
                        <Input type="date" value={f.tanggalAkhir} onChange={set("tanggalAkhir")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Hasil (Status)</Label>
                        <Select value={f.hasilKesimpulan} onValueChange={(v) => setF((p: any) => ({ ...p, hasilKesimpulan: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {HASIL.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label>Kesimpulan Berkala</Label>
                        <Textarea rows={2} value={f.kesimpulanBerkala} onChange={set("kesimpulanBerkala")} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label>Kesimpulan Akhir</Label>
                        <Textarea rows={2} value={f.kesimpulanAkhir} onChange={set("kesimpulanAkhir")} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label>Verifikasi / Saran</Label>
                        <Textarea rows={2} value={f.verifikasiSaran} onChange={set("verifikasiSaran")} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label>Follow Up</Label>
                        <Textarea rows={2} value={f.followUp} onChange={set("followUp")} />
                    </div>
                </div>

                {galat && <p className="text-sm text-destructive">{galat}</p>}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={menyimpan}>Batal</Button>
                    <Button onClick={kirim} disabled={menyimpan}>
                        {menyimpan ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type KaryawanRingkas = { id: string; name: string; position?: string | null; department?: string | null };

function PilihKaryawan({ nama, onPilih, onKetik }: {
    nama: string;
    onPilih: (k: KaryawanRingkas) => void;
    onKetik: (v: string) => void;
}) {
    const [buka, setBuka] = useState(false);
    const [cari, setCari] = useState("");

    const { data, isLoading } = useQuery<any>({ queryKey: ["/api/employees"], enabled: buka });
    const semua: KaryawanRingkas[] = Array.isArray(data) ? data : (data?.data ?? []);

    // Batasi yang dirender; 320 karyawan tanpa batas bikin daftar berat dibuka.
    const cocok = semua.filter((k) => {
        const q = cari.toLowerCase();
        return !q || k.name?.toLowerCase().includes(q) || k.id?.toLowerCase().includes(q)
            || k.department?.toLowerCase().includes(q);
    }).slice(0, 50);

    return (
        <Popover open={buka} onOpenChange={setBuka}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={buka}
                    className="w-full justify-between font-normal">
                    <span className={cn("flex items-center gap-2 truncate", !nama && "text-muted-foreground")}>
                        <UserRound className="h-4 w-4 shrink-0 opacity-50" />
                        {nama || "Cari nama personil..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput placeholder="Ketik nama, NIK, atau dept..." value={cari} onValueChange={setCari} />
                    <CommandList>
                        {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">Memuat data manpower...</div>}
                        {!isLoading && cocok.length === 0 && (
                            <CommandEmpty>
                                <div className="px-2 py-3 text-sm">
                                    <p className="text-muted-foreground">Tidak ada di data manpower.</p>
                                    {cari.trim() && (
                                        <Button variant="link" className="h-auto p-0 text-sm"
                                            onClick={() => { onKetik(cari.trim()); setBuka(false); }}>
                                            Pakai "{cari.trim()}" sebagai nama manual
                                        </Button>
                                    )}
                                </div>
                            </CommandEmpty>
                        )}
                        {cocok.length > 0 && (
                            <CommandGroup>
                                {cocok.map((k) => (
                                    <CommandItem key={k.id} value={k.id}
                                        onSelect={() => { onPilih(k); setBuka(false); setCari(""); }}>
                                        <Check className={cn("mr-2 h-4 w-4", nama === k.name ? "opacity-100" : "opacity-0")} />
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">{k.name}</div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {k.id}{k.position ? ` \u00b7 ${k.position}` : ""}{k.department ? ` \u00b7 ${k.department}` : ""}
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
