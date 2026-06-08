import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { SidakP3kSession, SidakP3kItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyStateCreateButton } from "@/components/sidak/empty-state-create-button";
import { Badge } from "@/components/ui/badge";
import {
    Eye, Printer, Loader2, ArrowLeft, History, FileText,
    Calendar, MapPin, User, Clock, CheckCircle2, MoreVertical,
    Download, Trash2, ShieldAlert, ImageIcon, Camera, Upload, X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { P3kPdfPreview } from "@/components/sidak/p3k-pdf-preview";
import { P3kDetailView } from "@/components/sidak/p3k-detail-view";
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { apiRequest } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { fotoKegiatanGuard } from "@/lib/sidak-foto-guard";
import { PhotoThumbnail, PhotoGalleryItem } from "@/components/ui/image-with-fallback";

export default function SidakP3kHistory() {
    const [, navigate] = useLocation();
    const { data: sessions, isLoading } = useQuery<SidakP3kSession[]>({
        queryKey: ["/api/sidak-p3k"],
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/workspace/sidak")}
                        className="-ml-2 hover:bg-blue-50 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <History className="h-5 w-5 text-blue-600" />
                            Riwayat Inspeksi P3K
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Daftar pemeriksaan kotak P3K
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                        <Loader2 className="h-10 w-10 animate-spin mb-3 text-blue-500" />
                        <p>Memuat data...</p>
                    </div>
                ) : sessions?.length === 0 ? (
                    <Card className="border-dashed border-2 bg-white/50 dark:bg-gray-800/50">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="h-20 w-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                                <ShieldAlert className="h-10 w-10 text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Belum ada inspeksi</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6 max-w-xs mx-auto">
                                Belum ada data pemeriksaan kotak P3K yang tercatat. Mulai inspeksi baru sekarang.
                            </p>
                            <EmptyStateCreateButton href="/workspace/sidak/p3k/new" label="Mulai Inspeksi" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sessions?.map((session) => (
                            <HistoryCard key={session.id} session={session} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function HistoryCard({ session }: { session: SidakP3kSession }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
    const [details, setDetails] = useState<(SidakP3kSession & { items: SidakP3kItem[] }) | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const handleOpen = async () => {
        setIsOpen(true);
        if (!details) {
            setLoadingDetail(true);
            try {
                // apiRequest returns the parsed JSON data directly
                const data = await apiRequest(`/api/sidak-p3k/${session.id}`);
                setDetails(data);
            } catch (err) {
                console.error("Failed to load details", err);
            } finally {
                setLoadingDetail(false);
            }
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Inspeksi_P3K_${session.tanggal}_${session.lokasi}`,
    });

    const handleDownloadJPG = async () => {
        if (!printRef.current) return;
        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            });
            const link = document.createElement("a");
            link.download = `Inspeksi_P3K_${session.tanggal}_${session.lokasi}.jpg`;
            link.href = canvas.toDataURL("image/jpeg", 0.9);
            link.click();
        } catch (err) {
            console.error("Failed to download JPG", err);
        }
    };

    // Photo Management Mutations
    const uploadPhotosMutation = useMutation({
        mutationFn: async (files: File[]) => {
            const newPhotos: string[] = [];
            // 1. Upload each file
            for (const file of files) {
                const formData = new FormData();
                formData.append('photo', file);
                const res = await fetch('/api/sidak-p3k/upload', {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) throw new Error("Upload failed");
                const data = await res.json();
                newPhotos.push(data.url);
            }

            // 2. Update session with new photos
            // session.activityPhotos might be null/undefined initially
            const currentPhotos = session.activityPhotos || [];
            const updatedPhotos = [...currentPhotos, ...newPhotos];

            const res = await fetch(`/api/sidak-p3k/${session.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityPhotos: updatedPhotos })
            });

            if (!res.ok) throw new Error("Update session failed");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sidak-p3k"] });
            toast({ title: "Foto berhasil diupload" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal upload foto", description: error.message, variant: "destructive" });
        }
    });

    const deletePhotoMutation = useMutation({
        mutationFn: async (photoIndex: number) => {
            const currentPhotos = session.activityPhotos || [];
            const updatedPhotos = [...currentPhotos];
            updatedPhotos.splice(photoIndex, 1);

            const res = await fetch(`/api/sidak-p3k/${session.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityPhotos: updatedPhotos })
            });

            if (!res.ok) throw new Error("Update session failed");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sidak-p3k"] });
            toast({ title: "Foto berhasil dihapus" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal hapus foto", description: error.message, variant: "destructive" });
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesToUpload = Array.from(e.target.files);
            setUploadingPhotos(true);
            uploadPhotosMutation.mutate(filesToUpload, {
                onSettled: () => {
                    setUploadingPhotos(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            });
        }
    };

    const handleDeletePhoto = (index: number) => {
        deletePhotoMutation.mutate(index);
    };

    return (
        <Card className="group overflow-hidden border-none shadow-lg rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-blue-300 dark:hover:ring-blue-700 transition-all duration-300">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Selesai
                            </Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {session.waktu}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1">
                            {session.lokasi}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(session.tanggal), "dd MMM yyyy", { locale: id })}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={handleOpen} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { if (!fotoKegiatanGuard(session, toast)) return; handleOpen(); setTimeout(handlePrint, 500); }} className="cursor-pointer">
                                <Printer className="mr-2 h-4 w-4" />
                                Cetak PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { if (!fotoKegiatanGuard(session, toast)) return; handleOpen(); setTimeout(handleDownloadJPG, 1000); }} className="cursor-pointer">
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Download JPG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsPhotoDialogOpen(true)} className="cursor-pointer">
                                <Camera className="mr-2 h-4 w-4" />
                                Kelola Foto
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-600 flex items-center justify-center text-gray-500 shadow-sm">
                        <User className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">INSPEKTOR</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                            {session.inspectorName}
                        </p>
                    </div>
                </div>

                {/* Photo Previews (if any) */}
                {session.activityPhotos && session.activityPhotos.length > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center gap-1 mb-2 text-xs text-gray-500 dark:text-gray-400">
                            <Camera className="h-3.5 w-3.5" />
                            <span>{session.activityPhotos.length} Foto Kegiatan</span>
                        </div>
                        <div className="flex gap-2 relative">
                            {session.activityPhotos.slice(0, 3).map((photo, idx) => (
                                <div key={idx} className="relative aspect-square w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <PhotoThumbnail
                                        photo={photo}
                                        index={idx}
                                        onClick={() => setIsPhotoDialogOpen(true)}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                            {session.activityPhotos.length > 3 && (
                                <div
                                    className="aspect-square w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setIsPhotoDialogOpen(true)}
                                >
                                    <span className="text-xs font-bold text-gray-500">+{session.activityPhotos.length - 3}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                        onClick={handleOpen}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Detail
                    </Button>
                </div>

                {/* Detail Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-[210mm] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                        <DialogHeader className="p-4 border-b bg-white dark:bg-gray-900 z-10">
                            <DialogTitle className="flex items-center justify-between">
                                <span>Laporan Inspeksi P3K</span>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => { if (!fotoKegiatanGuard(details, toast)) return; handleDownloadJPG(); }} variant="outline" className="h-8 text-xs gap-2" disabled={!details}>
                                        <ImageIcon className="h-3.5 w-3.5" /> JPG
                                    </Button>
                                    <Button size="sm" onClick={() => handlePrint()} variant="outline" className="h-8 text-xs gap-2" disabled={!details}>
                                        <Printer className="h-3.5 w-3.5" /> PDF
                                    </Button>
                                    <Button size="sm" onClick={() => setIsPhotoDialogOpen(true)} variant="outline" className="h-8 text-xs gap-2">
                                        <Camera className="h-3.5 w-3.5" /> Foto
                                    </Button>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4">
                            {loadingDetail ? (
                                <div className="flex flex-col items-center justify-center h-60">
                                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
                                    <p className="text-gray-500">Memuat detail laporan...</p>
                                </div>
                            ) : details ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-full max-w-3xl">
                                        <P3kDetailView session={details} items={details.items} />
                                    </div>
                                    {/* Hidden for Print/Export */}
                                    <div className="absolute top-0 left-[-9999px]">
                                        <div ref={printRef}>
                                            <P3kPdfPreview session={details} items={details.items} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    Gagal memuat data detail. Silakan coba lagi.
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Photo Management Dialog */}
                <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Camera className="h-5 w-5 text-blue-600" />
                                Foto Kegiatan P3K
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <p><strong>Tanggal:</strong> {format(new Date(session.tanggal), 'dd MMMM yyyy', { locale: id })}</p>
                                <p><strong>Lokasi:</strong> {session.lokasi}</p>
                            </div>

                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingPhotos || (session.activityPhotos?.length || 0) >= 6}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {uploadingPhotos ? 'Mengupload...' : 'Upload Foto (Max 6)'}
                                </Button>
                                <p className="text-xs text-gray-500 mt-1 text-center">
                                    Format: JPG, PNG. Maks 5MB per foto
                                </p>
                            </div>

                            {session.activityPhotos && session.activityPhotos.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {session.activityPhotos.map((photo, idx) => (
                                        <PhotoGalleryItem
                                            key={idx}
                                            photo={photo}
                                            index={idx}
                                            onDelete={() => handleDeletePhoto(idx)}
                                            isDeleting={deletePhotoMutation.isPending}
                                            accentColor="blue"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">Belum ada foto kegiatan</p>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => setIsPhotoDialogOpen(false)}
                                className="w-full"
                            >
                                Tutup
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
