import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
    Upload,
    Download,
    FileSpreadsheet,
    X,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function ModalImportPeralatanWorkshop({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const downloadTemplate = () => {
        const templateData = [
            {
                "No": 1,
                "Jenis Unit": "AIR COMPRESSORE",
                "No Lambung": "AC-LV-ST0001-001",
                "Kapasitas": "200 psi",
                "Area/Lokasi": "Storing BMD",
                "Komisioner": "PT.BTI",
                "Tgl Sertifikat": "01 July 2025",
                "EXP": "01 July 2026",
                "Status": "AKTIF",
                "Keterangan": "-"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PERALATAN 2");
        XLSX.writeFile(wb, "Template_Peralatan_Workshop.xlsx");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const ab = evt.target?.result;
                    const wb = XLSX.read(ab, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
                    setPreview(data.slice(0, 5));
                } catch (err) {
                    toast({ title: "Gagal membaca file", variant: "destructive" });
                }
            };
            reader.readAsArrayBuffer(selected);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setIsUploading(true);
        setProgress(20);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/spip/peralatan/workshop/import", {
                method: "POST",
                body: formData,
            });
            setProgress(70);
            const result = await res.json();

            if (res.ok) {
                toast({
                    title: "Import Berhasil",
                    description: `Berhasil mengimport ${result.imported} data workshop tool.`
                });
                setProgress(100);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 500);
            } else {
                toast({ title: "Import Gagal", description: result.error, variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Terjadi Kesalahan", description: err.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Upload className="w-5 h-5 text-red-600" />
                        Import Peralatan Workshop
                    </DialogTitle>
                    <DialogDescription>
                        Unggah file Excel (.xlsx) dengan format kolom sesuai sheet "PERALATAN 2".
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                        <div className="bg-red-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="font-bold text-slate-700">Pilih File Excel Anda</h3>
                        <p className="text-sm text-slate-500 mb-6">Maksimal ukuran file 5MB (.xlsx, .xls)</p>

                        <div className="flex gap-3">
                            <Button variant="outline" className="bg-white" onClick={() => document.getElementById('fileUpload')?.click()}>
                                Browse File
                            </Button>
                            <Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-semibold" onClick={downloadTemplate}>
                                <Download className="w-4 h-4 mr-2" /> Download Template
                            </Button>
                        </div>
                        <input type="file" id="fileUpload" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        {file && (
                            <div className="mt-4 flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle className="w-4 h-4" /> {file.name}
                            </div>
                        )}
                    </div>

                    {preview.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-slate-400" />
                                Preview Data (5 Baris Pertama)
                            </h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                <Table className="text-xs">
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            {Object.keys(preview[0]).map(key => <TableHead key={key} className="font-bold text-slate-700">{key}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.map((row, i) => (
                                            <TableRow key={i} className="bg-white">
                                                {Object.values(row).map((val: any, j) => (
                                                    <TableCell key={j} className="text-slate-600 max-w-[150px] truncate">{val?.toString()}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                                <span>Sedang memproses data...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-slate-100" />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>Batal</Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || isUploading}
                        className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
                    >
                        {isUploading ? "Mengimport..." : "Import Sekarang"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
