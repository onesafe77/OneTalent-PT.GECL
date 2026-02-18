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
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
            Nama: r.nama,
            Perusahaan: r.perusahaan,
            Posisi: r.posisi,
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
                    <Button>
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
                                placeholder="Cari nama, PT, status..."
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
                                    <TableHead className="min-w-[200px]">Nama / Posisi</TableHead>
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
                                        <TableCell colSpan={13} className="h-24 text-center">
                                            Memuat data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={13} className="h-24 text-center">
                                            Tidak ada data ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record, index) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                <div>{record.nama}</div>
                                                <div className="text-xs text-muted-foreground">{record.posisi || "-"}</div>
                                            </TableCell>
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
