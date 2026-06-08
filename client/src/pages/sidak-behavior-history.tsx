import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Download, Calendar, Clock, MapPin, ArrowLeft, ChevronDown, FileText, Image, Camera, X, Upload, Trash2, User, AlertTriangle, Eye, ClipboardList, Loader2 } from "lucide-react";
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
import { fotoKegiatanGuard } from "@/lib/sidak-foto-guard";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useRef } from "react";
import { downloadSidakBehaviorAsPdf, downloadSidakBehaviorAsJpg } from "@/lib/sidak-behavior-pdf-utils";

interface BehaviorSession {
    id: string;
    tanggal: string;
    waktu: string;
    shift: string;
    lokasi: string;
    metodeSidak: string;
    totalSampel: number;
    createdBy: string | null;
    activityPhotos: string[] | null;
    createdAt: string;
    updatedAt: string;
    records?: any[];
    observers?: any[];
}

export default function SidakBehaviorHistory() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<BehaviorSession | null>(null);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchSessionDetail = async (sessionId: string) => {
        const res = await fetch(`/api/sidak-behavior/${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch session detail');
        return res.json();
    };

    const handleDownloadPdf = async (session: BehaviorSession) => {
        try {
            setDownloadingId(session.id);
            const detail = await fetchSessionDetail(session.id);
            const filename = `Sidak_Behavior_${session.shift}_${format(new Date(session.tanggal), 'dd-MM-yyyy')}.pdf`;
            await downloadSidakBehaviorAsPdf({
                session: detail,
                records: detail.records || [],
                observers: detail.observers || [],
            }, filename);
            toast({ title: "PDF berhasil didownload", description: filename });
        } catch (error: any) {
            console.error('PDF download error:', error);
            toast({ title: "Gagal download PDF", description: error.message, variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadJpg = async (session: BehaviorSession) => {
        try {
            setDownloadingId(session.id);
            const detail = await fetchSessionDetail(session.id);
            const filename = `Sidak_Behavior_${session.shift}_${format(new Date(session.tanggal), 'dd-MM-yyyy')}.jpg`;
            await downloadSidakBehaviorAsJpg({
                session: detail,
                records: detail.records || [],
                observers: detail.observers || [],
            }, filename);
            toast({ title: "JPG berhasil didownload", description: filename });
        } catch (error: any) {
            console.error('JPG download error:', error);
            toast({ title: "Gagal download JPG", description: error.message, variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    const { data: sessions, isLoading } = useQuery<BehaviorSession[]>({
        queryKey: ['/api/sidak-behavior'],
    });

    // Sort sessions by date descending
    const sortedSessions = sessions?.sort((a, b) =>
        new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    const uploadPhotosMutation = useMutation({
        mutationFn: async ({ sessionId, files }: { sessionId: string; files: File[] }) => {
            let finalPhotos: string[] = [];

            for (const file of files) {
                const urlResponse = await fetch(`/api/sidak-behavior/${sessionId}/request-upload-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: file.name,
                        contentType: file.type || 'application/octet-stream'
                    })
                });

                if (!urlResponse.ok) {
                    const error = await urlResponse.json();
                    throw new Error(error.error || 'Failed to get upload URL');
                }

                const { uploadURL } = await urlResponse.json();

                const uploadResponse = await fetch(uploadURL, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type || 'application/octet-stream' }
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload file to storage');
                }

                const uploadResult = await uploadResponse.json();
                if (!uploadResult.url) {
                    throw new Error('Upload succeeded but no URL returned');
                }

                const confirmResponse = await fetch(`/api/sidak-behavior/${sessionId}/confirm-upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: uploadResult.url })
                });

                if (!confirmResponse.ok) {
                    const error = await confirmResponse.json();
                    throw new Error(error.error || 'Failed to confirm upload');
                }

                const result = await confirmResponse.json();
                finalPhotos = result.photos;
            }

            return { photos: finalPhotos };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-behavior'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({
                title: "Foto berhasil diupload",
                description: `${data.photos.length} foto kegiatan tersimpan`,
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal upload foto",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const deletePhotoMutation = useMutation({
        mutationFn: async ({ sessionId, photoIndex }: { sessionId: string; photoIndex: number }) => {
            const response = await fetch(`/api/sidak-behavior/${sessionId}/photos/${photoIndex}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete photo');
            }

            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-behavior'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({
                title: "Foto dihapus",
                description: "Foto berhasil dihapus",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal menghapus foto",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleOpenPhotoDialog = (session: BehaviorSession) => {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container max-w-2xl mx-auto p-3 md:p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 pt-2">
                    <Link href="/workspace/sidak">
                        <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-back-sidak">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Eye className="h-6 w-6 text-blue-600 flex-shrink-0" />
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                                Riwayat Sidak Tingkah Laku
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                            Observasi Tingkah Laku Driver
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm">Memuat data...</p>
                    </div>
                ) : !sortedSessions || sortedSessions.length === 0 ? (
                    <Card className="text-center py-10">
                        <CardContent className="pt-0">
                            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-400">
                                Belum ada riwayat Sidak Tingkah Laku
                            </p>
                            <EmptyStateCreateButton href="/workspace/sidak/behavior/new" label="Buat Sidak Baru" icon={Eye} className="mt-4 bg-blue-600 hover:bg-blue-700" size="sm" />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {sortedSessions.map((session) => (
                            <Card
                                key={session.id}
                                className="overflow-hidden border-none shadow-lg rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-700"
                                data-testid={`card-session-${session.id}`}
                            >
                                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                                <CardContent className="p-5">
                                    {/* Header row with title and badge */}
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                Sidak Tingkah Laku - {session.shift}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{format(new Date(session.tanggal), 'eeee, dd MMM yyyy', { locale: id })}</span>
                                                <span className="text-gray-300">•</span>
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{session.waktu}</span>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap border-0">
                                            {session.totalSampel} Karyawan
                                        </Badge>
                                    </div>

                                    {/* Location & Method info - Grouped in a box */}
                                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-4 grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Lokasi</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.lokasi}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <ClipboardList className="h-3.5 w-3.5" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Metode</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.metodeSidak}</p>
                                        </div>
                                    </div>

                                    {/* Observer info */}
                                    {session.observers && session.observers.length > 0 && (
                                        <div className="flex items-start gap-2 mb-4 text-xs">
                                            <User className="h-4 w-4 text-gray-400 mt-0.5" />
                                            <div>
                                                <span className="text-gray-500 font-medium mr-1">Observer:</span>
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {session.observers.map((o: any) => o.nama).join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Photo gallery preview if photos exist */}
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

                                    {/* Download & Actions */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 rounded-lg h-10 font-medium transition-all active:scale-[0.98]"
                                                data-testid={`button-download-${session.id}`}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Data
                                                <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[calc(100vw-3rem)] sm:w-64 rounded-xl p-1 shadow-xl border-gray-200 dark:border-gray-700">
                                            <DropdownMenuItem
                                                disabled={downloadingId === session.id}
                                                onClick={() => { if (!fotoKegiatanGuard(session, toast)) return; handleDownloadPdf(session); }}
                                                className={`rounded-lg py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer`}
                                                data-testid={`button-download-pdf-${session.id}`}
                                            >
                                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                                                    {downloadingId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Download PDF</span>
                                                    <span className="text-xs text-muted-foreground">Laporan lengkap dengan foto</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                disabled={downloadingId === session.id}
                                                onClick={() => { if (!fotoKegiatanGuard(session, toast)) return; handleDownloadJpg(session); }}
                                                className={`rounded-lg py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer`}
                                                data-testid={`button-download-jpg-${session.id}`}
                                            >
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                                                    {downloadingId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Download JPG</span>
                                                    <span className="text-xs text-muted-foreground">Format gambar untuk sharing</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                                            <DropdownMenuItem
                                                onClick={() => handleOpenPhotoDialog(session)}
                                                data-testid={`button-upload-photo-${session.id}`}
                                                className="rounded-lg py-2.5 px-3 focus:bg-blue-50 dark:focus:bg-blue-900/20 cursor-pointer"
                                            >
                                                <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mr-3">
                                                    <Camera className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Kelola Foto</span>
                                                    <span className="text-xs text-muted-foreground">Upload atau hapus dokumentasi</span>
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

            {/* Photo Upload/View Dialog */}
            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-blue-600" />
                            Foto Kegiatan SIDAK Tingkah Laku
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4">
                            {/* Session info */}
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <p><strong>Tanggal:</strong> {format(new Date(selectedSession.tanggal), 'dd MMMM yyyy', { locale: id })}</p>
                                <p><strong>Shift:</strong> {selectedSession.shift}</p>
                                <p><strong>Lokasi:</strong> {selectedSession.lokasi}</p>
                            </div>

                            {/* Upload button */}
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
                                    data-testid="button-upload-photos"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {uploadingPhotos ? 'Mengupload...' : 'Upload Foto (Max 6)'}
                                </Button>
                                <p className="text-xs text-gray-500 mt-1 text-center">
                                    Format: JPG, PNG. Maks 5MB per foto
                                </p>
                            </div>

                            {/* Photo gallery */}
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
                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">Belum ada foto kegiatan</p>
                                </div>
                            )}

                            {/* Close button */}
                            <Button
                                variant="outline"
                                onClick={() => setPhotoDialogOpen(false)}
                                className="w-full"
                                data-testid="button-close-photo-dialog"
                            >
                                Tutup
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
