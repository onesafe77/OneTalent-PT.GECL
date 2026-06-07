import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardCheck, Download, Calendar, Clock, MapPin, ArrowLeft, ChevronDown, Camera, Upload, Trash2, Shield, User, FileText, Image } from "lucide-react";
import { PhotoThumbnail, PhotoGalleryItem } from "@/components/ui/image-with-fallback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyStateCreateButton } from "@/components/sidak/empty-state-create-button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SidakIntercomSession, SidakIntercomRecord, SidakIntercomObserver } from "@shared/schema";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useState, useRef } from "react";
import { generateSidakIntercomPdf, downloadSidakIntercomAsJpg } from "@/lib/sidak-intercom-pdf-utils";


interface SessionWithDetails extends SidakIntercomSession {
    records?: SidakIntercomRecord[];
    observers?: SidakIntercomObserver[];
}

export default function SidakIntercomHistory() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: sessions, isLoading } = useQuery<SessionWithDetails[]>({
        queryKey: ['/api/sidak-intercom/sessions'],
    });

    const uploadPhotosMutation = useMutation({
        mutationFn: async ({ sessionId, files }: { sessionId: string; files: File[] }) => {
            setUploadingPhotos(true);
            try {
                const photoPromises = files.map(file => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });

                const photoDataUrls = await Promise.all(photoPromises);

                const response = await fetch(`/api/sidak-intercom/sessions/${sessionId}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photos: photoDataUrls })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Gagal upload foto');
                }

                const data = await response.json();
                return { photos: data.photos };
            } finally {
                setUploadingPhotos(false);
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-intercom/sessions'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({ title: "Foto berhasil diupload", description: `${data.photos.length} foto kegiatan tersimpan` });
        },
        onError: (error: any) => {
            toast({ title: "Gagal upload foto", description: error.message, variant: "destructive" });
        },
    });

    const deletePhotoMutation = useMutation({
        mutationFn: async ({ sessionId, photoIndex }: { sessionId: string; photoIndex: number }) => {
            const response = await fetch(`/api/sidak-intercom/sessions/${sessionId}/photos/${photoIndex}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete photo');
            }
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-intercom/sessions'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({ title: "Foto berhasil dihapus" });
        },
    });

    const handleOpenPhotoDialog = (session: SessionWithDetails) => {
        setSelectedSession(session);
        setPhotoDialogOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && selectedSession) {
            const filesToUpload = Array.from(e.target.files);
            setUploadingPhotos(true);
            uploadPhotosMutation.mutate(
                { sessionId: selectedSession.id, files: filesToUpload },
                {
                    onSettled: () => {
                        setUploadingPhotos(false);
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    }
                }
            );
        }
    };

    const handleDeletePhoto = (photoIndex: number) => {
        if (selectedSession) {
            deletePhotoMutation.mutate({ sessionId: selectedSession.id, photoIndex });
        }
    };

    const handleDownloadPdf = async (session: SessionWithDetails) => {
        try {
            // Fetch full details (records & observers) before generating PDF
            const response = await fetch(`/api/sidak-intercom/sessions/${session.id}`);
            if (!response.ok) throw new Error('Failed to fetch full session details');
            const fullSession = await response.json();

            const data = {
                session: fullSession,
                records: fullSession.records || [],
                observers: fullSession.observers || []
            };
            const pdf = await generateSidakIntercomPdf(data);
            pdf.save(`Sidak_Intercom_${fullSession.lokasi}_${fullSession.tanggal}.pdf`);
            toast({ title: "PDF Berhasil Diunduh" });
        } catch (error: any) {
            console.error("PDF download failed:", error);
            toast({ title: "Gagal mengunduh PDF", description: error.message, variant: "destructive" });
        }
    };

    const handleDownloadJpg = async (session: SessionWithDetails) => {
        try {
            // Fetch full details (records & observers) before generating JPG
            const response = await fetch(`/api/sidak-intercom/sessions/${session.id}`);
            if (!response.ok) throw new Error('Failed to fetch full session details');
            const fullSession = await response.json();

            const data = {
                session: fullSession,
                records: fullSession.records || [],
                observers: fullSession.observers || []
            };
            await downloadSidakIntercomAsJpg(data, `Sidak_Intercom_${fullSession.lokasi}_${fullSession.tanggal}.jpg`);
            toast({ title: "JPG Berhasil Diunduh" });
        } catch (error: any) {
            console.error("JPG download failed:", error);
            toast({ title: "Gagal mengunduh JPG", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container max-w-2xl mx-auto p-3 md:p-4 space-y-4">
                <div className="flex items-center gap-3 pt-2">
                    <Link href="/workspace/sidak">
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                                Riwayat Sidak Intercom FMS
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                            Data Inspeksi Kepatuhan Intercom FMS
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-3 text-sm">Memuat data...</p>
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <Card className="text-center py-10">
                        <CardContent className="pt-0">
                            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">Belum ada riwayat Sidak Intercom</p>
                            <EmptyStateCreateButton href="/workspace/sidak/intercom/new" label="Buat Sidak Baru" icon={ClipboardCheck} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm" />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <Card
                                key={session.id}
                                className="overflow-hidden border-none shadow-lg rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-700"
                            >
                                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {session.pengawasFms || 'Pengawas FMS'} - {session.shift}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{format(new Date(session.tanggal), 'dd MMM yyyy', { locale: localeId })}</span>
                                                <span className="text-gray-300">•</span>
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{session.waktu}</span>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap border-0">
                                            {session.persenKepatuhan || 0}% Patuh
                                        </Badge>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-4 grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-0.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Lokasi</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.lokasi}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-0.5">
                                                <User className="h-3.5 w-3.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Reviewer</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.personilHse || '-'}</p>
                                        </div>
                                    </div>

                                    {session.activityPhotos && session.activityPhotos.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                    <Camera className="h-3.5 w-3.5" />
                                                    <span>{session.activityPhotos.length} Foto Kegiatan</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 relative">
                                                {session.activityPhotos.slice(0, 3).map((photo, idx) => (
                                                    <div key={idx} className="relative aspect-square w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                                                        <PhotoThumbnail
                                                            photo={photo}
                                                            index={idx}
                                                            onClick={() => handleOpenPhotoDialog(session)}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                                {session.activityPhotos.length > 3 && (
                                                    <div
                                                        className="aspect-square w-16 h-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        onClick={() => handleOpenPhotoDialog(session)}
                                                    >
                                                        <span className="text-xs font-bold text-gray-500">+{session.activityPhotos.length - 3}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 rounded-lg h-10 font-medium transition-all active:scale-[0.98]"
                                            >
                                                Pilihan Aksi
                                                <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[calc(100vw-3rem)] sm:w-64 rounded-xl p-1 shadow-xl border-gray-200 dark:border-gray-700">
                                            {(!session.activityPhotos || session.activityPhotos.length === 0) && (
                                                <div className="px-2 py-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-b mb-1 rounded-t-lg">
                                                    <Camera className="h-3 w-3 inline mr-1" />
                                                    Upload foto dulu untuk download
                                                </div>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() => handleDownloadPdf(session)}
                                                disabled={!session.activityPhotos || session.activityPhotos.length === 0}
                                                className={`rounded-lg py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer ${!session.activityPhotos || session.activityPhotos.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Download PDF</span>
                                                    <span className="text-xs text-muted-foreground">Laporan lengkap</span>
                                                </div>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                onClick={() => handleDownloadJpg(session)}
                                                disabled={!session.activityPhotos || session.activityPhotos.length === 0}
                                                className={`rounded-lg py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer ${!session.activityPhotos || session.activityPhotos.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                                                    <Image className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Download JPG</span>
                                                    <span className="text-xs text-muted-foreground">Format gambar</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                                            <DropdownMenuItem onClick={() => handleOpenPhotoDialog(session)} className="rounded-lg py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mr-3">
                                                    <Camera className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Kelola Foto</span>
                                                    <span className="text-xs text-muted-foreground">Upload/Hapus</span>
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-blue-600" />
                            Foto Kegiatan SIDAK
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600">
                                <p><strong>Tanggal:</strong> {format(new Date(selectedSession.tanggal), 'dd MMMM yyyy', { locale: localeId })}</p>
                                <p><strong>Lokasi:</strong> {selectedSession.lokasi}</p>
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
                                    disabled={uploadingPhotos || (selectedSession.activityPhotos?.length || 0) >= 6}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {uploadingPhotos ? 'Mengupload...' : 'Upload Foto (Max 6)'}
                                </Button>
                            </div>

                            {selectedSession.activityPhotos && selectedSession.activityPhotos.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedSession.activityPhotos.map((photo, idx) => (
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
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">Belum ada foto kegiatan</p>
                                </div>
                            )}

                            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)} className="w-full">
                                Tutup
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
