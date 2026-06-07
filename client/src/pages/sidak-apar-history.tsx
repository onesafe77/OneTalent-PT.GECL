import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Download, Calendar, Clock, MapPin, ArrowLeft, ChevronDown, Camera, FileText, Image, Shield, Trash2 } from "lucide-react";
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
import type { SidakAparSession, SidakAparRecord, SidakAparObserver } from "@shared/schema";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface SessionWithDetails extends SidakAparSession {
    records?: SidakAparRecord[];
    observers?: SidakAparObserver[];
}

export default function SidakAparHistory() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadingJpgId, setDownloadingJpgId] = useState<string | null>(null);
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: sessions, isLoading } = useQuery<SessionWithDetails[]>({
        queryKey: ['/api/sidak-apar/sessions'],
    });

    const uploadPhotosMutation = useMutation({
        mutationFn: async ({ sessionId, base64Photos }: { sessionId: string; base64Photos: string[] }) => {
            const res = await apiRequest(`/api/sidak-apar/${sessionId}/photos`, "POST", {
                photoUrl: base64Photos
            });
            return res;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-apar/sessions'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({ title: "Foto berhasil diupload" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal upload foto", description: error.message, variant: "destructive" });
        },
    });

    const deletePhotoMutation = useMutation({
        mutationFn: async ({ sessionId, photoIndex }: { sessionId: string; photoIndex: number }) => {
            const res = await apiRequest(`/api/sidak-apar/${sessionId}/photos/${photoIndex}`, "DELETE");
            return res;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-apar/sessions'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({ title: "Foto berhasil dihapus" });
        },
    });

    const handleOpenPhotoDialog = (session: SessionWithDetails) => {
        setSelectedSession(session);
        setPhotoDialogOpen(true);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && selectedSession) {
            const files = Array.from(e.target.files);

            const promises = files.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            });

            const base64s = await Promise.all(promises);
            uploadPhotosMutation.mutate({ sessionId: selectedSession.id, base64Photos: base64s });

            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadPDF = async (sessionId: string) => {
        try {
            setDownloadingId(sessionId);
            const response = await fetch(`/api/sidak-apar/${sessionId}`);
            if (!response.ok) throw new Error('Gagal mengambil data session');
            const data = await response.json();

            const { generateSidakAparPDF } = await import('@/lib/sidak-apar-pdf-utils');
            const doc = await generateSidakAparPDF({
                session: data.session,
                records: data.records,
                observers: data.observers
            });

            const fileName = `Sidak_APAR_${data.session.tanggal}_${data.session.id.substring(0, 5)}.pdf`;
            doc.save(fileName);
            toast({ title: "PDF berhasil diunduh" });
        } catch (error: any) {
            toast({ title: "Gagal mengunduh PDF", description: error.message, variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadJPG = async (sessionId: string) => {
        try {
            setDownloadingJpgId(sessionId);
            const response = await fetch(`/api/sidak-apar/${sessionId}`);
            if (!response.ok) throw new Error('Gagal mengambil data session');
            const data = await response.json();

            const { downloadSidakAparAsJpg } = await import('@/lib/sidak-apar-pdf-utils');
            const fileName = `Sidak_APAR_${data.session.tanggal}_${Date.now()}.jpg`;
            await downloadSidakAparAsJpg({
                session: data.session,
                records: data.records,
                observers: data.observers
            }, fileName);

            toast({ title: "JPG berhasil diunduh" });
        } catch (error: any) {
            toast({ title: "Gagal mengunduh JPG", description: error.message, variant: "destructive" });
        } finally {
            setDownloadingJpgId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container max-w-2xl mx-auto p-3 md:p-4 space-y-4 pt-10">
                <div className="flex items-center gap-3 pt-2">
                    <Link href="/workspace/sidak">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-red-600 flex-shrink-0" />
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                                Riwayat Sidak APAR
                            </h1>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
                        <p className="text-gray-600 mt-3 text-sm">Memuat data...</p>
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <Card className="text-center py-12 border-dashed border-2 border-gray-200">
                        <CardContent>
                            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Belum ada riwayat inspeksi APAR</p>
                            <EmptyStateCreateButton href="/workspace/sidak/apar/new" label="Mulai Inspeksi Baru" className="mt-6 bg-red-600 hover:bg-red-700" />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <Card key={session.id} className="overflow-hidden border-none shadow-sm rounded-2xl bg-white dark:bg-gray-800 ring-1 ring-gray-100">
                                <div className="h-1.5 w-full bg-red-500" />
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{session.lokasi}</h3>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{format(new Date(session.tanggal), 'dd MMM yyyy', { locale: id })}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{session.shift}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className="bg-red-50 text-red-700 border-none rounded-full px-3 py-1">
                                            {session.totalApar} Unit
                                        </Badge>
                                    </div>

                                    {session.activityPhotos && session.activityPhotos.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex gap-2">
                                                {session.activityPhotos.slice(0, 3).map((photo, idx) => (
                                                    <div key={idx} className="relative aspect-square w-14 h-14 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
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
                                                        className="aspect-square w-14 h-14 rounded-xl bg-red-50 text-red-600 flex items-center justify-center cursor-pointer font-bold text-xs"
                                                        onClick={() => handleOpenPhotoDialog(session)}
                                                    >
                                                        +{session.activityPhotos.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11">
                                                <Download className="h-4 w-4 mr-2" />
                                                Pilihan Aksi
                                                <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[calc(100vw-3rem)] sm:w-64 rounded-2xl p-2 shadow-xl">
                                            <DropdownMenuItem onClick={() => handleDownloadPDF(session.id)} disabled={downloadingId === session.id} className="rounded-xl py-3 cursor-pointer">
                                                <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">Download PDF</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Laporan Resmi</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDownloadJPG(session.id)} disabled={downloadingJpgId === session.id} className="rounded-xl py-3 cursor-pointer">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                                                    <Image className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">Download JPG</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Format Gambar</span>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenPhotoDialog(session)} className="rounded-xl py-3 cursor-pointer border-t mt-1 pt-3">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mr-3">
                                                    <Camera className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">Kelola Foto</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Upload/Hapus Foto</span>
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
                <DialogContent className="sm:max-w-md rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-red-600" />
                            Foto Kegiatan Inspeksi
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                {selectedSession.activityPhotos?.map((photo, idx) => (
                                    <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
                                        <img src={photo} className="w-full h-full object-cover" alt="Sidak" />
                                        <button
                                            onClick={() => deletePhotoMutation.mutate({ sessionId: selectedSession.id, photoIndex: idx })}
                                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}

                                {(selectedSession.activityPhotos?.length || 0) < 6 && (
                                    <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-gray-400">
                                        <Camera className="h-6 w-6 mb-1" />
                                        <span className="text-[10px] font-bold uppercase">Tambah Foto</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                )}
                            </div>

                            <Button variant="secondary" className="w-full rounded-xl" onClick={() => setPhotoDialogOpen(false)}>
                                Selesai
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
