
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, Search, Download, Trash2, RefreshCw, Link as LinkIcon, Save, Settings, Share2, ExternalLink, Copy, Smartphone } from "lucide-react";
import { SimperEvMonitoring } from "@shared/schema";
import * as XLSX from "xlsx";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function MonitoringSimperEvAdmin() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [csvUrl, setCsvUrl] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Public URL Construction
    const publicUrl = window.location.origin + "/monitoring-simper-ev";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Helper Functions
    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicUrl);
        toast({ title: "Link Disalin", description: "URL publik telah disalin ke clipboard." });
    };

    const shareWhatsApp = () => {
        const text = `Cek Status Simper EV Anda di sini: ${publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const openPublicPage = () => {
        window.open(publicUrl, "_blank");
    };

    // Fetch All Records
    const { data: records = [], isLoading } = useQuery<SimperEvMonitoring[]>({
        queryKey: ["simper-ev-all"],
        queryFn: async () => {
            const data = await apiRequest("/api/simper-ev/all", "GET");
            return data;
        },
    });

    // Fetch Settings
    useQuery({
        queryKey: ["simper-ev-settings"],
        queryFn: async () => {
            const data = await apiRequest("/api/simper-ev/settings", "GET");
            if (data.url) setCsvUrl(data.url);
            return data;
        },
    });

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const downloadTemplate = () => {
        // Create a CSV template
        const headers = [
            "Unit", "No", "Nama", "NIK Simper", "Asal Mitra",
            "Simper", "Simper Orientasi", "Simper Permanen",
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

    const filteredData = records.filter(item =>
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.nikSimper && item.nikSimper.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitoring Simper EV</h1>
                    <p className="text-gray-500">Kelola data pengajuan Simper EV</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["simper-ev-all"] })}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload CSV
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
                </div>
            </div>

            {/* Public Access & Mobile Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* QR Code */}
                        <div className="flex-shrink-0 bg-white p-2 rounded-lg shadow-sm">
                            <img src={qrCodeUrl} alt="QR Code Public Access" className="w-32 h-32 object-contain" />
                        </div>

                        {/* Info & Actions */}
                        <div className="flex-1 space-y-4 w-full text-center md:text-left">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center justify-center md:justify-start gap-2 text-blue-900 dark:text-blue-100">
                                    <Smartphone className="h-5 w-5" />
                                    Akses Publik & Mobile
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    Bagikan QR Code atau link di bawah ini kepada karyawan untuk pengecekan mandiri via HP.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Input value={publicUrl} readOnly className="pr-10 bg-white/80" />
                                    <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-full text-gray-500 hover:text-blue-600" onClick={copyToClipboard}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={shareWhatsApp}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share WA
                                </Button>
                                <Button variant="outline" onClick={openPublicPage}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Buka Halaman
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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

            <Card>
                <CardHeader>
                    <CardTitle>Data Pengajuan</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari Nama atau NIK..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>NIK Simper</TableHead>
                                        <TableHead>Asal Mitra</TableHead>
                                        <TableHead>Simper</TableHead>
                                        <TableHead>Orientasi</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Updated</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                                Tidak ada data ditemukan. Upload CSV atau Sinkronisasi URL untuk menambahkan data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell>{record.unit}</TableCell>
                                                <TableCell className="font-medium">{record.nama}</TableCell>
                                                <TableCell>{record.nikSimper}</TableCell>
                                                <TableCell>{record.asalMitra}</TableCell>
                                                <TableCell>{record.simper}</TableCell>
                                                <TableCell>
                                                    {record.simperOrientasi === "Sudah" ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sudah</Badge>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{record.statusPengajuan || "Unknown"}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-gray-500">
                                                    {record.updatedOf ? new Date(record.updatedOf).toLocaleDateString() : "-"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
