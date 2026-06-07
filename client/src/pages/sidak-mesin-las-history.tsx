import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Download, Calendar, Clock, MapPin, ArrowLeft, ChevronDown, Camera, FileText, Image, Shield, Trash2, Plus } from "lucide-react";
import { PhotoThumbnail } from "@/components/ui/image-with-fallback";
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
import type { SidakMesinLasSession, SidakMesinLasRecord, SidakMesinLasObserver } from "@shared/schema";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface SessionWithDetails extends SidakMesinLasSession {
    records?: SidakMesinLasRecord[];
    observers?: SidakMesinLasObserver[];
}

export default function SidakMesinLasHistory() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: sessions, isLoading } = useQuery<SessionWithDetails[]>({
        queryKey: ['/api/sidak-mesin-las/sessions'],
    });

    const uploadPhotosMutation = useMutation({
        mutationFn: async ({ sessionId, base64Photos }: { sessionId: string; base64Photos: string[] }) => {
            const res = await apiRequest(`/api/sidak-mesin-las/${sessionId}/photos`, "POST", {
                photos: base64Photos
            });
            return res;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-mesin-las/sessions'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({ title: "Foto berhasil diupload" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal upload foto", description: error.message, variant: "destructive" });
        },
    });

    const deletePhotoMutation = useMutation({
        mutationFn: async ({ sessionId, photoIndex }: { sessionId: string; photoIndex: number }) => {
            const res = await apiRequest(`/api/sidak-mesin-las/${sessionId}/photos/${photoIndex}`, "DELETE");
            return res;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-mesin-las/sessions'] });
            setSelectedSession(prev => prev ? { ...prev, activityPhotos: data.photos } : null);
            toast({ title: "Foto berhasil dihapus" });
        },
    });

    const deleteSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            await apiRequest(`/api/sidak-mesin-las/sessions/${sessionId}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/sidak-mesin-las/sessions'] });
            toast({ title: "Sesi berhasil dihapus" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal menghapus sesi", description: error.message, variant: "destructive" });
        }
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
            const response = await fetch(`/api/sidak-mesin-las/${sessionId}`);
            if (!response.ok) throw new Error('Gagal mengambil data session');
            const data = await response.json();

            const { generateSidakMesinLasPDF } = await import('@/lib/sidak-mesin-las-pdf-utils');
            await generateSidakMesinLasPDF({
                session: data.session,
                records: data.records,
                observers: data.observers
            });

            toast({ title: "PDF berhasil diunduh" });
        } catch (error: any) {
            toast({ title: "Gagal mengunduh PDF", description: error.message, variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container max-w-2xl mx-auto p-3 md:p-4 space-y-4 pt-10">
                <div className="flex items-center gap-3 pt-2">
                    <Link href="/workspace/sidak">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-gray-200">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-orange-600 flex-shrink-0" />
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                                Riwayat Inspeksi Mesin Las
                            </h1>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="text-gray-600 mt-3 text-sm">Memuat data...</p>
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <Card className="text-center py-12 border-dashed border-2 border-gray-200 rounded-3xl">
                        <CardContent>
                            <Shield className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium font-bold">Belum ada riwayat inspeksi mesin las</p>
                            <EmptyStateCreateButton href="/workspace/sidak/mesin-las/new" label="Mulai Inspeksi Baru Sekarang" className="mt-6 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold px-8 shadow-lg shadow-orange-100 dark:shadow-none" />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <Card key={session.id} className="overflow-hidden border-none shadow-sm rounded-3xl bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-700">
                                <div className="h-2 w-full bg-orange-500" />
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white line-clamp-1 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-orange-500" />
                                                {session.lokasi}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{session.namaObjekInspeksi}</p>
                                            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <Calendar className="h-3 w-3 text-orange-500" />
                                                    <span>{format(new Date(session.tanggal), 'dd MMM yyyy', { locale: id })}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <Clock className="h-3 w-3 text-orange-500" />
                                                    <span>{session.shift}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className="bg-orange-50 text-orange-700 border-none rounded-xl px-4 py-2 font-black text-xs">
                                            {session.totalMesinLas} UNIT
                                        </Badge>
                                    </div>

                                    {session.activityPhotos && session.activityPhotos.length > 0 && (
                                        <div className="mb-6">
                                            <div className="flex gap-3">
                                                {session.activityPhotos.slice(0, 3).map((photo, idx) => (
                                                    <div key={idx} className="relative aspect-square w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-700 shadow-md">
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
                                                        className="aspect-square w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center cursor-pointer font-black text-xs shadow-inner"
                                                        onClick={() => handleOpenPhotoDialog(session)}
                                                    >
                                                        +{session.activityPhotos.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 font-bold shadow-lg shadow-blue-50 dark:shadow-none">
                                                    <Download className="h-5 w-5 mr-2" />
                                                    OPSI LAPORAN
                                                    <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[calc(100vw-3rem)] sm:w-64 rounded-3xl p-3 shadow-2xl border-none">
                                                <DropdownMenuItem onClick={() => handleDownloadPDF(session.id)} disabled={downloadingId === session.id} className="rounded-2xl py-4 cursor-pointer hover:bg-red-50 focus:bg-red-50 transition-all group">
                                                    <div className="h-10 w-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm text-gray-900">Download PDF</span>
                                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Laporan Inspeksi Resmi</span>
                                                    </div>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => handleOpenPhotoDialog(session)} className="rounded-2xl py-4 cursor-pointer hover:bg-orange-50 focus:bg-orange-50 transition-all group mt-1">
                                                    <div className="h-10 w-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                                        <Camera className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm text-gray-900">Kelola Foto</span>
                                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Dokumentasi Temuan</span>
                                                    </div>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (confirm("Apakah Anda yakin ingin menghapus sesi ini?")) {
                                                            deleteSessionMutation.mutate(session.id);
                                                        }
                                                    }}
                                                    className="rounded-2xl py-4 cursor-pointer hover:bg-red-600 focus:bg-red-600 hover:text-white focus:text-white transition-all group mt-1 border-t pt-4"
                                                >
                                                    <div className="h-10 w-10 rounded-2xl bg-red-50 group-hover:bg-red-500 text-red-600 group-hover:text-white flex items-center justify-center mr-4 transition-colors">
                                                        <Trash2 className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm">Hapus Sesi</span>
                                                        <span className="text-[9px] uppercase tracking-widest font-black opacity-60">Tindakan Irreversible</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none dark:bg-gray-800 shadow-2xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black italic tracking-tighter">
                            <div className="h-10 w-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white rotate-3">
                                <Camera className="h-6 w-6" />
                            </div>
                            DOKUMENTASI SIDAK
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSession && (
                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                {selectedSession.activityPhotos?.map((photo, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-[1.5rem] overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-md ring-2 ring-white dark:ring-gray-600">
                                        <img src={photo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Sidak" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => deletePhotoMutation.mutate({ sessionId: selectedSession.id, photoIndex: idx })}
                                                className="p-3 bg-red-600 text-white rounded-2xl hover:scale-110 transition-transform active:scale-95 shadow-xl"
                                            >
                                                <Trash2 className="h-6 w-6 font-bold" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {(selectedSession.activityPhotos?.length || 0) < 6 && (
                                    <label className="flex flex-col items-center justify-center aspect-square rounded-[1.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 hover:bg-orange-50 hover:border-orange-200 transition-all cursor-pointer text-gray-400 group">
                                        <div className="h-12 w-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 group-hover:text-orange-600 transition-all">
                                            <Plus className="h-6 w-6" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-orange-600">Tambah Foto</span>
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

                            <Button
                                className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-lg tracking-tight hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                onClick={() => setPhotoDialogOpen(false)}
                            >
                                SELESAI & TUTUP
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
