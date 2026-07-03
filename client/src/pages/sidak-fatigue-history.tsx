import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Download, Calendar, Clock, MapPin, Building2, ArrowLeft, ChevronDown, FileText, Image, Camera, X, Upload, Trash2, User, AlertTriangle } from "lucide-react";
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
import { generateSidakFatiguePdf, downloadSidakFatigueAsJpg, generateSidakRosterPdf, type SidakRosterData } from "@/lib/sidak-pdf-utils";

// Ambil sesi Sidak Roster hasil mirror dari sesi fatigue (null bila tidak ada)
async function fetchLinkedRoster(fatigueSessionId: string): Promise<SidakRosterData | null> {
  try {
    const res = await fetch(`/api/sidak-roster/by-fatigue/${fatigueSessionId}`);
    if (!res.ok) return null;
    const d = await res.json();
    return { session: d, records: d.records || [], observers: d.observers || [] };
  } catch {
    return null;
  }
}
import type { SidakFatigueSession, SidakFatigueRecord, SidakFatigueObserver } from "@shared/schema";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface SessionWithDetails extends SidakFatigueSession {
  records?: SidakFatigueRecord[];
  observers?: SidakFatigueObserver[];
}

export default function SidakFatigueHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Warm modul pdf.js (besar) saat halaman dibuka — klik Download JPG tak lagi menunggu import
  useEffect(() => {
    void import('pdfjs-dist');
    void import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  }, []);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sessions, isLoading } = useQuery<SessionWithDetails[]>({
    queryKey: ['/api/sidak-fatigue'],
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ sessionId, files }: { sessionId: string; files: File[] }) => {
      let finalPhotos: string[] = [];

      for (const file of files) {
        // Step 1: Request presigned URL
        const urlResponse = await fetch(`/api/sidak-fatigue/${sessionId}/request-upload-url`, {
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

        // Step 2: Upload to database storage
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' }
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage');
        }

        // Get the uploaded file ID and URL from response
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.url) {
          throw new Error('Upload succeeded but no URL returned');
        }

        // Step 3: Confirm upload with the database URL
        const confirmResponse = await fetch(`/api/sidak-fatigue/${sessionId}/confirm-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: uploadResult.url }) // Use 'url' instead of 'objectPath'
        });

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json();
          throw new Error(error.error || 'Failed to confirm upload');
        }

        const result = await confirmResponse.json();
        // Use the session's current photos from server (already includes all photos)
        finalPhotos = result.photos;
      }

      return { photos: finalPhotos };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sidak-fatigue'] });
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
      const response = await fetch(`/api/sidak-fatigue/${sessionId}/photos/${photoIndex}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete photo');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sidak-fatigue'] });
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

  const handleOpenPhotoDialog = (session: SessionWithDetails) => {
    setSelectedSession(session);
    setPhotoDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedSession) {
      // Copy files to array before clearing input (FileList becomes empty after input.value = '')
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

  const handleDownloadPDF = async (sessionId: string) => {
    try {
      setDownloadingId(sessionId);

      // Fetch detail fatigue + roster tersambung secara PARALEL (bukan berurutan)
      const [response, roster] = await Promise.all([
        fetch(`/api/sidak-fatigue/${sessionId}`),
        fetchLinkedRoster(sessionId),
      ]);
      if (!response.ok) {
        throw new Error('Gagal mengambil data session');
      }

      const sessionData = await response.json();

      // Generate PDF - sessionData is already the full object with records and observers
      const pdf = await generateSidakFatiguePdf({
        session: sessionData,
        records: sessionData.records || [],
        observers: sessionData.observers || [],
      });

      // Lampirkan 1 halaman form Sidak Roster tersambung (hasil mirror) bila ada
      if (roster) await generateSidakRosterPdf(roster, pdf);

      // Download PDF
      const fileName = `Sidak_Fatigue_${sessionData.tanggal}_${sessionData.shift.replace(' ', '_')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF berhasil diunduh",
        description: `File ${fileName} telah tersimpan`,
      });
    } catch (error: any) {
      toast({
        title: "Gagal mengunduh PDF",
        description: error.message || "Terjadi kesalahan saat membuat PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadJPG = async (sessionId: string) => {
    try {
      setDownloadingId(sessionId);

      // Fetch detail fatigue + roster tersambung secara PARALEL (bukan berurutan)
      const [response, roster] = await Promise.all([
        fetch(`/api/sidak-fatigue/${sessionId}`),
        fetchLinkedRoster(sessionId),
      ]);
      if (!response.ok) {
        throw new Error('Gagal mengambil data session');
      }

      const sessionData = await response.json();

      // Download as JPG - use .jpg extension (+ halaman roster tersambung bila ada)
      const fileName = `Sidak_Fatigue_${sessionData.tanggal}_${sessionData.shift.replace(' ', '_')}.jpg`;
      await downloadSidakFatigueAsJpg({
        session: sessionData,
        records: sessionData.records || [],
        observers: sessionData.observers || [],
      }, fileName, roster || undefined);

      toast({
        title: "JPG berhasil diunduh",
        description: `File ${fileName} telah tersimpan`,
      });
    } catch (error: any) {
      toast({
        title: "Gagal mengunduh JPG",
        description: error.message || "Terjadi kesalahan saat membuat JPG",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-2xl mx-auto p-3 md:p-4 space-y-4">
        {/* Header - More compact for mobile */}
        <div className="flex items-center gap-3 pt-2">
          <Link href="/workspace/sidak">
            <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-back-sidak">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-red-600 flex-shrink-0" />
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                Riwayat Sidak Fatigue
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Form BIB-HSE-ES-F-3.02-16 - Pemeriksaan Kelelahan Karyawan
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm">Memuat data...</p>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent className="pt-0">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Belum ada riwayat Sidak Fatigue
              </p>
              <EmptyStateCreateButton href="/workspace/sidak/fatigue/new" label="Buat Sidak Baru" icon={Activity} className="mt-4 bg-red-600 hover:bg-red-700" size="sm" />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="overflow-hidden border-none shadow-lg rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-700"
                data-testid={`card-session-${session.id}`}
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />
                <CardContent className="p-5">
                  {/* Header row with title and badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Sidak Fatigue - {session.shift}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(new Date(session.tanggal), 'dd MMM yyyy', { locale: id })}</span>
                        <span className="text-gray-300">•</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{session.waktuMulai} - {session.waktuSelesai}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap border-0">
                      {session.totalSampel} Karyawan
                    </Badge>
                  </div>

                  {/* Location info - Grouped in a box */}
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-4 grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Lokasi</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.lokasi}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Area</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.area}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Dept</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{session.departemen}</p>
                    </div>
                  </div>

                  {/* Observer info */}
                  {session.observers && session.observers.length > 0 && (
                    <div className="flex items-start gap-2 mb-4 text-xs">
                      <User className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-500 font-medium mr-1">Observer:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {session.observers.map(o => o.nama).join(', ')}
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

                  {/* Single download dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={downloadingId === session.id}
                        className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-500/20 rounded-lg h-10 font-medium transition-all active:scale-[0.98]"
                        data-testid={`button-download-${session.id}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingId === session.id ? 'Mengunduh...' : 'Download Data'}
                        <ChevronDown className="h-4 w-4 ml-auto opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[calc(100vw-3rem)] sm:w-64 rounded-xl p-1 shadow-xl border-gray-200 dark:border-gray-700">
                      {(!session.activityPhotos || session.activityPhotos.length === 0) && (
                        <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg mb-1 flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>Upload foto terlebih dahulu untuk mengunduh laporan lengkap</span>
                        </div>
                      )}
                      <DropdownMenuItem
                        onClick={() => { if (!fotoKegiatanGuard(session, toast)) return; handleDownloadPDF(session.id); }}
                        disabled={!session.activityPhotos || session.activityPhotos.length === 0}
                        className={`rounded-lg py-2.5 px-3 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer ${!session.activityPhotos || session.activityPhotos.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid={`button-download-pdf-${session.id}`}
                      >
                        <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Download PDF</span>
                          <span className="text-xs text-muted-foreground">Laporan lengkap dengan foto</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { if (!fotoKegiatanGuard(session, toast)) return; handleDownloadJPG(session.id); }}
                        disabled={!session.activityPhotos || session.activityPhotos.length === 0}
                        className={`rounded-lg py-2.5 px-3 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer ${!session.activityPhotos || session.activityPhotos.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid={`button-download-jpg-${session.id}`}
                      >
                        <div className="h-8 w-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mr-3">
                          <Image className="h-4 w-4" />
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
                        className="rounded-lg py-2.5 px-3 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
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
              <Camera className="h-5 w-5 text-red-600" />
              Foto Kegiatan SIDAK
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
                  className="w-full bg-red-600 hover:bg-red-700"
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
                      accentColor="red"
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
