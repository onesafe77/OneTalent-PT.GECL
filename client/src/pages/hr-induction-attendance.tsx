import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, FileSpreadsheet, FileText, UserCheck, Calendar, Phone, Briefcase, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Copy, Check, BarChart3, List } from "lucide-react";
import { generateQRCodeDataURL } from "@/lib/qr-utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InductionStats } from "@/components/hr/induction-stats";
import { apiRequest } from "@/lib/queryClient";

interface InductionAttendance {
    id: string;
    nik: string;
    namaKaryawan: string;
    jabatan: string;
    nomorTelepon: string | null;
    pemateri: string;
    tandaTangan: string;
    fotoSelfie: string | null;
    tanggalRefreshInduksi: string;
    waktu: string | null;
    createdAt: string;
}

export default function HrInductionAttendance() {
    const [searchTerm, setSearchTerm] = useState("");
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();
    const [syncResult, setSyncResult] = useState<any>(null);

    const syncPhonesMutation = useMutation({
        mutationFn: async () => apiRequest("/api/induction-attendance/sync-phones", "POST", {}),
        onSuccess: (data) => {
            setSyncResult(data);
            toast({
                title: "Sinkron Selesai",
                description: data.message,
            });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Sinkron", description: error.message, variant: "destructive" });
        }
    });

    const publicInductionUrl = `${window.location.origin}/absensi-induksi`;

    const handleShowQr = async () => {
        try {
            const dataUrl = await generateQRCodeDataURL(publicInductionUrl, { width: 300 });
            setQrDataUrl(dataUrl);
        } catch (error) {
            console.error("Failed to generate QR:", error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicInductionUrl);
        setIsCopied(true);
        toast({
            title: "Link disalin",
            description: "Link absensi induksi telah disalin ke clipboard.",
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    const { data: attendanceData, isLoading } = useQuery<InductionAttendance[]>({
        queryKey: ["/api/induction-attendance/all", { year: yearFilter, search: searchTerm }],
        queryFn: async ({ queryKey }) => {
            const [_url, params] = queryKey as [string, { year: string, search: string }];
            const searchParams = new URLSearchParams();
            if (params.year) searchParams.append("year", params.year);
            if (params.search) searchParams.append("search", params.search);

            const response = await fetch(`/api/induction-attendance/all?${searchParams.toString()}`);
            if (!response.ok) throw new Error("Gagal mengambil data");
            return response.json();
        },
    });

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

    const handleExportExcel = () => {
        if (!attendanceData) return;

        const exportData = attendanceData.map((item) => ({
            "Tanggal Refresh Induksi": item.tanggalRefreshInduksi,
            "Waktu": item.waktu || "-",
            "NIK": item.nik,
            "Nama Karyawan": item.namaKaryawan,
            "Jabatan": item.jabatan,
            "Nomor Telepon": item.nomorTelepon || "-",
            "Pemateri": item.pemateri,
            "Waktu Submit": format(new Date(item.createdAt), "dd/MM/yyyy HH:mm"),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Absensi Induksi");
        XLSX.writeFile(wb, `Absensi_Induksi_${yearFilter}_${format(new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!attendanceData) return;

        const doc = new jsPDF("landscape");
        doc.text(`Rekap Absensi Induksi - Tahun ${yearFilter}`, 14, 15);

        const tableData = attendanceData.map((item) => [
            item.tanggalRefreshInduksi,
            item.waktu || "-",
            item.nik,
            item.namaKaryawan,
            item.jabatan,
            item.nomorTelepon || "-",
            item.pemateri,
        ]);

        autoTable(doc, {
            head: [["Tanggal", "Waktu", "NIK", "Nama Karyawan", "Jabatan", "No. Telepon", "Pemateri"]],
            body: tableData,
            startY: 20,
            theme: "striped",
            headStyles: { fillColor: [220, 38, 38] }, // Red-600
        });

        doc.save(`Absensi_Induksi_${yearFilter}.pdf`);
    };

    return (
        <div className="p-4 sm:-mx-4 lg:-mx-6 px-4 space-y-6 w-auto max-w-none">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserCheck className="w-8 h-8 text-red-600" />
                        Monitoring Absensi Induksi
                    </h1>
                    <p className="text-gray-500">
                        Daftar seluruh karyawan yang telah melakukan induksi secara mandiri.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || !attendanceData?.length}>
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                        Export Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPdf} disabled={isLoading || !attendanceData?.length}>
                        <FileText className="w-4 h-4 mr-2 text-red-600" />
                        Export PDF
                    </Button>
                    <Button
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                        onClick={() => {
                            if (confirm("Update nomor telepon karyawan dari data absensi induksi? Hanya nomor yang kosong atau berbeda yang akan diperbarui."))
                                syncPhonesMutation.mutate();
                        }}
                        disabled={syncPhonesMutation.isPending}
                    >
                        {syncPhonesMutation.isPending
                            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Menyinkron...</>
                            : <><Phone className="w-4 h-4 mr-2" />Sinkron No. Telepon</>
                        }
                    </Button>

                    <Dialog onOpenChange={(open) => open && handleShowQr()}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700 text-white">
                                <QrCode className="w-4 h-4 mr-2" />
                                Share Link & QR
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Share Link Absensi Induksi</DialogTitle>
                                <DialogDescription>
                                    Karyawan dapat menscan QR code ini atau menggunakan link di bawah untuk mengisi absensi.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center space-y-4 py-4">
                                {qrDataUrl ? (
                                    <div className="p-4 bg-white border rounded-xl shadow-inner">
                                        <img src={qrDataUrl} alt="QR Code Induksi" className="w-48 h-48" />
                                    </div>
                                ) : (
                                    <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-xl" />
                                )}

                                <div className="flex w-full items-center space-x-2">
                                    <div className="grid flex-1 gap-2">
                                        <Input
                                            id="link"
                                            defaultValue={publicInductionUrl}
                                            readOnly
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                    <Button size="sm" className="px-3" onClick={copyToClipboard}>
                                        <span className="sr-only">Copy</span>
                                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex justify-center text-xs text-gray-500">
                                Link ini dapat diakses publik tanpa login.
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Hasil Sinkron Telepon */}
            {syncResult && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Hasil Sinkron Nomor Telepon
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium text-blue-800 mb-2">{syncResult.message}</p>
                        <p className="text-xs text-blue-600 mb-2">{syncResult.skipped} karyawan dilewati (sudah sama atau tidak ditemukan)</p>
                        {syncResult.list?.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {syncResult.list.map((item: any, i: number) => (
                                    <div key={i} className="text-xs text-blue-700 flex gap-3">
                                        <span className="font-mono">{item.nik}</span>
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-green-700">→ {item.phone}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="list" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="list" className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            Data List
                        </TabsTrigger>
                        <TabsTrigger value="dashboard" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Dashboard Evaluasi
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Filter & Pencarian</CardTitle>
                            <CardDescription>Cari berdasarkan nama atau NIK dan filter per tahun.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Cari Nama atau NIK..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:w-48">
                                    <Select value={yearFilter} onValueChange={setYearFilter}>
                                        <SelectTrigger>
                                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                            <SelectValue placeholder="Pilih Tahun" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((y) => (
                                                <SelectItem key={y} value={y}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[150px]">Tanggal Refresh</TableHead>
                                        <TableHead>Waktu</TableHead>
                                        <TableHead>NIK</TableHead>
                                        <TableHead>Nama Karyawan</TableHead>
                                        <TableHead>Jabatan</TableHead>
                                        <TableHead>No. Telepon</TableHead>
                                        <TableHead>Pemateri</TableHead>
                                        <TableHead className="text-center">Tanda Tangan</TableHead>
                                        <TableHead className="text-center">Foto Selfie</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center">
                                                Memuat data...
                                            </TableCell>
                                        </TableRow>
                                    ) : attendanceData?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                                                Tidak ada data ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        attendanceData?.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-gray-50/50">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3 h-3 text-red-600" />
                                                        {item.tanggalRefreshInduksi}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        {item.waktu || "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono">{item.nik}</Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold">{item.namaKaryawan}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3 text-gray-400" />
                                                        {item.jabatan}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.nomorTelepon ? (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            {item.nomorTelepon}
                                                        </div>
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell>{item.pemateri}</TableCell>
                                                <TableCell className="text-center">
                                                    {item.tandaTangan && (
                                                        <div className="flex justify-center">
                                                            <img
                                                                src={item.tandaTangan}
                                                                alt="TTD"
                                                                className="h-10 w-20 object-contain border rounded bg-white p-0.5"
                                                            />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {item.fotoSelfie ? (
                                                        <a href={item.fotoSelfie} target="_blank" rel="noopener noreferrer" className="inline-block">
                                                            <img
                                                                src={item.fotoSelfie}
                                                                alt="Foto Selfie"
                                                                className="h-12 w-12 object-cover border rounded-full bg-white hover:scale-150 transition-transform"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="dashboard">
                    <InductionStats data={attendanceData || []} year={yearFilter} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
