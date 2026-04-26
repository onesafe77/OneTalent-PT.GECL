import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, User, QrCode, Users, Eye, Trash2, Plus, Download, FileText, Camera, X, Upload, Pencil, ZoomIn, BookOpen, ClipboardList } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, InsertMeeting, MeetingAttendance } from "@shared/schema";
import QRCode from "qrcode";
import { generateMeetingAttendancePDF, generateBIBAttendancePDF } from "@/lib/meeting-pdf-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// QR Code Display Component
function QRCodeDisplay({ meeting }: { meeting: Meeting }) {
  const [qrDataURL, setQrDataURL] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const generateQR = async () => {
      if (meeting.qrToken) {
        try {
          // Generate QR code with direct meeting-scanner URL for instant access
          const qrUrl = `${window.location.origin}/meeting-scanner?token=${meeting.qrToken}`;

          const dataURL = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrDataURL(dataURL);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    };
    generateQR();
  }, [meeting.qrToken]);

  const downloadQR = async () => {
    if (!qrDataURL) return;

    try {
      const link = document.createElement('a');
      link.href = qrDataURL;
      link.download = `meeting-qr-${meeting.title.replace(/[^a-zA-Z0-9]/g, '-')}-${meeting.date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "QR Code Downloaded",
        description: `QR code untuk meeting "${meeting.title}" berhasil didownload`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mendownload QR code",
        variant: "destructive",
      });
    }
  };

  const copyMeetingScanURL = () => {
    const scanURL = `${window.location.origin}/meeting-scanner?token=${meeting.qrToken}`;
    navigator.clipboard.writeText(scanURL).then(() => {
      toast({
        title: "Link Copied",
        description: "Link absensi meeting berhasil dicopy ke clipboard",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Gagal copy link",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="text-center py-6">
      {qrDataURL && (
        <div className="mx-auto mb-4 inline-block p-4 bg-white rounded-lg shadow-sm">
          <img
            src={qrDataURL}
            alt={`QR Code for ${meeting.title}`}
            className="mx-auto"
            style={{ width: 300, height: 300 }}
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Informasi Meeting
          </h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <div><strong>Judul:</strong> {meeting.title}</div>
            <div><strong>Tanggal:</strong> {new Date(meeting.date).toLocaleDateString('id-ID')}</div>
            <div><strong>Waktu:</strong> {meeting.startTime} - {meeting.endTime}</div>
            <div><strong>Lokasi:</strong> {meeting.location}</div>
            <div><strong>Penyelenggara:</strong> {meeting.organizer}</div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
            Cara Absensi via Mobile
          </h4>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
            <div>1. Scan QR code di atas dengan kamera HP, atau buka link:</div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs font-mono break-all">
              {window.location.origin}/meeting-scanner?token={meeting.qrToken}
            </div>
            <div>2. Langsung masuk ke form absensi meeting ini</div>
            <div>3. Masukkan NIK dan submit</div>
            <div>4. Sistem otomatis mencatat kehadiran</div>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            onClick={downloadQR}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-download-qr-dialog"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>

          <Button
            onClick={copyMeetingScanURL}
            variant="outline"
            data-testid="button-copy-scan-url"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Copy Link Scan
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Meetings() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<InsertMeeting>({
    title: "", description: "", date: "", startTime: "", endTime: "", location: "", organizer: "", status: "scheduled", meetingType: "internal", agenda: "", pemateri: "",
  });
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState("");

  // Materi PDF dialog
  const [isMateriDialogOpen, setIsMateriDialogOpen] = useState(false);
  const [uploadedMateriFiles, setUploadedMateriFiles] = useState<File[]>([]);

  // MoM PDF dialog
  const [isMomDialogOpen, setIsMomDialogOpen] = useState(false);
  const [uploadedMomFiles, setUploadedMomFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<InsertMeeting>({
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    organizer: "",
    status: "scheduled",
    meetingType: "internal",
    agenda: "",
    pemateri: "",
  });

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (meeting: InsertMeeting) => {
      return await apiRequest("/api/meetings", "POST", meeting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsCreateOpen(false);
      setFormData({
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        organizer: "",
        status: "scheduled",
        meetingType: "internal",
        agenda: "",
        pemateri: "",
      });
      toast({
        title: "Meeting Created",
        description: "Meeting berhasil dibuat dengan QR code unik",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal membuat meeting",
        variant: "destructive",
      });
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/meetings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Meeting Deleted",
        description: "Meeting berhasil dihapus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal menghapus meeting",
        variant: "destructive",
      });
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ meetingId, photos }: { meetingId: string; photos: File[] }) => {
      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const response = await fetch(`/api/meetings/${meetingId}/upload-photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsPhotoDialogOpen(false);
      setUploadedPhotos([]);
      setPhotoPreviewUrls([]);
      toast({
        title: "Photos Uploaded",
        description: `${data.photos.length} foto berhasil diupload`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal upload foto",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async ({ meetingId, photoIndex }: { meetingId: string; photoIndex: number }) => {
      return await apiRequest(`/api/meetings/${meetingId}/photos/${photoIndex}`, "DELETE");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (selectedMeeting && selectedMeeting.id === data.meeting.id) {
        setSelectedMeeting(data.meeting);
      }
      toast({
        title: "Foto Dihapus",
        description: "Foto dokumentasi berhasil dihapus",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal menghapus foto",
        variant: "destructive",
      });
    },
  });

  // ── Materi mutations ──────────────────────────────────────────────────────
  const uploadMateriMutation = useMutation({
    mutationFn: async ({ meetingId, files }: { meetingId: string; files: File[] }) => {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const res = await fetch(`/api/meetings/${meetingId}/upload-materi`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (selectedMeeting) setSelectedMeeting({ ...selectedMeeting, ...(data.meeting || {}) });
      setUploadedMateriFiles([]);
      setIsMateriDialogOpen(false);
      toast({ title: "Materi Diupload", description: `${data.files.length} file materi berhasil disimpan` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMateriMutation = useMutation({
    mutationFn: async ({ meetingId, fileIndex }: { meetingId: string; fileIndex: number }) =>
      apiRequest(`/api/meetings/${meetingId}/materi/${fileIndex}`, "DELETE"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (selectedMeeting) setSelectedMeeting({ ...selectedMeeting, ...(data.meeting || {}) });
      toast({ title: "Materi Dihapus", description: "File materi berhasil dihapus" });
    },
    onError: () => toast({ title: "Error", description: "Gagal menghapus materi", variant: "destructive" }),
  });

  // ── MoM mutations ──────────────────────────────────────────────────────────
  const uploadMomMutation = useMutation({
    mutationFn: async ({ meetingId, files }: { meetingId: string; files: File[] }) => {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const res = await fetch(`/api/meetings/${meetingId}/upload-mom`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (selectedMeeting) setSelectedMeeting({ ...selectedMeeting, ...(data.meeting || {}) });
      setUploadedMomFiles([]);
      setIsMomDialogOpen(false);
      toast({ title: "MoM Diupload", description: `${data.files.length} file MoM berhasil disimpan` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMomMutation = useMutation({
    mutationFn: async ({ meetingId, fileIndex }: { meetingId: string; fileIndex: number }) =>
      apiRequest(`/api/meetings/${meetingId}/mom/${fileIndex}`, "DELETE"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (selectedMeeting) setSelectedMeeting({ ...selectedMeeting, ...(data.meeting || {}) });
      toast({ title: "MoM Dihapus", description: "File MoM berhasil dihapus" });
    },
    onError: () => toast({ title: "Error", description: "Gagal menghapus MoM", variant: "destructive" }),
  });

  const { data: attendanceData } = useQuery<{
    meeting: Meeting;
    attendance: (MeetingAttendance & { employee?: any })[];
    totalAttendees: number;
  }>({
    queryKey: ["/api/meetings", selectedMeeting?.id, "attendance"],
    enabled: !!selectedMeeting?.id && isAttendanceOpen,
  });

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    createMeetingMutation.mutate(formData);
  };

  const handleDelete = (meeting: Meeting) => {
    if (confirm(`Yakin ingin menghapus meeting "${meeting.title}"?`)) {
      deleteMeetingMutation.mutate(meeting.id);
    }
  };

  // Edit meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertMeeting }) => {
      return await apiRequest(`/api/meetings/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsEditOpen(false);
      toast({
        title: "Meeting Diperbarui",
        description: "Data meeting berhasil diperbarui",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal memperbarui meeting",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setEditFormData({
      title: meeting.title,
      description: meeting.description || "",
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      location: meeting.location,
      organizer: meeting.organizer,
      status: meeting.status,
      meetingType: (meeting as any).meetingType || "internal",
      agenda: (meeting as any).agenda || "",
      pemateri: (meeting as any).pemateri || "",
    });
    setIsEditOpen(true);
  };

  const handleEditMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    updateMeetingMutation.mutate({ id: selectedMeeting.id, data: editFormData });
  };

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files || !selectedMeeting) return;

    const existingPhotosCount = selectedMeeting.meetingPhotos?.length || 0;
    const remainingSlots = 4 - existingPhotosCount;

    if (remainingSlots <= 0) {
      toast({
        title: "Maksimal Foto Tercapai",
        description: "Meeting sudah memiliki 4 foto",
        variant: "destructive",
      });
      return;
    }

    const newPhotos: File[] = [];
    const newPreviewUrls: string[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        toast({
          title: "File Tidak Valid",
          description: `${file.name} bukan file gambar`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Terlalu Besar",
          description: `${file.name} lebih dari 5MB`,
          variant: "destructive",
        });
        continue;
      }

      newPhotos.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    }

    setUploadedPhotos(prev => [...prev, ...newPhotos]);
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newUrls;
    });
  };

  const handlePhotoUpload = () => {
    if (!selectedMeeting || uploadedPhotos.length === 0) return;

    uploadPhotosMutation.mutate({
      meetingId: selectedMeeting.id,
      photos: uploadedPhotos,
    });
  };

  const openPhotoDialog = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setUploadedPhotos([]);
    setPhotoPreviewUrls([]);
    setIsPhotoDialogOpen(true);
  };

  const generateQRCodeDataURL = async (qrToken: string): Promise<string> => {
    try {
      // Generate QR code with direct meeting-scanner URL for instant access
      const qrUrl = `${window.location.origin}/meeting-scanner?token=${qrToken}`;

      return await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const downloadQRCode = async (meeting: Meeting) => {
    if (!meeting.qrToken) return;

    try {
      const qrDataURL = await generateQRCodeDataURL(meeting.qrToken);

      // Create download link
      const link = document.createElement('a');
      link.href = qrDataURL;
      link.download = `meeting-qr-${meeting.title.replace(/[^a-zA-Z0-9]/g, '-')}-${meeting.date}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "QR Code Downloaded",
        description: `QR code untuk meeting "${meeting.title}" berhasil didownload`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mendownload QR code",
        variant: "destructive",
      });
    }
  };

  const downloadAttendanceReport = async () => {
    console.log('📄 Download PDF requested', { selectedMeeting, attendanceData });

    if (!selectedMeeting) {
      toast({
        title: "Error",
        description: "Meeting tidak dipilih",
        variant: "destructive",
      });
      return;
    }

    if (!attendanceData) {
      toast({
        title: "Error",
        description: "Data attendance tidak tersedia",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`📊 Total attendance from API: ${attendanceData.attendance.length}`);
      console.log(`📊 Total attendees count: ${attendanceData.totalAttendees}`);

      // Prepare and validate data for PDF generation
      const pdfData = {
        meeting: {
          id: selectedMeeting.id,
          title: selectedMeeting.title,
          description: selectedMeeting.description || undefined,
          date: selectedMeeting.date,
          startTime: selectedMeeting.startTime,
          endTime: selectedMeeting.endTime,
          location: selectedMeeting.location,
          organizer: selectedMeeting.organizer,
          status: selectedMeeting.status,
          meetingPhotos: selectedMeeting.meetingPhotos || undefined
        },
        attendance: attendanceData.attendance || [],
        totalAttendees: attendanceData.totalAttendees || 0
      };

      console.log(`✅ Passing ${pdfData.attendance.length} attendance records to PDF generator`);
      console.log('📋 Attendance data:', pdfData.attendance);

      const isBIB = (selectedMeeting as any).meetingType === "bib";
      if (isBIB) {
        await generateBIBAttendancePDF({
          ...pdfData,
          agenda: (selectedMeeting as any).agenda || "",
          pemateri: (selectedMeeting as any).pemateri || "",
        });
      } else {
        await generateMeetingAttendancePDF(pdfData);
      }

      toast({
        title: "PDF Berhasil Didownload",
        description: `Laporan meeting "${selectedMeeting.title}" telah didownload`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Error tidak dikenal';
      toast({
        title: "Gagal Download PDF",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Terjadwal", variant: "secondary" as const },
      ongoing: { label: "Berlangsung", variant: "default" as const },
      completed: { label: "Selesai", variant: "outline" as const },
      cancelled: { label: "Dibatalkan", variant: "destructive" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.scheduled;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat data meeting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meeting Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Kelola meeting dan absensi peserta dengan QR code
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-meeting" className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Buat Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Buat Meeting Baru</DialogTitle>
              <DialogDescription>
                Buat meeting baru dengan QR code untuk absensi peserta
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              {/* Meeting Type */}
              <div className="space-y-2">
                <Label>Jenis Meeting *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, meetingType: "internal" })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${formData.meetingType === "internal" ? "border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"}`}
                  >
                    Meeting Internal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, meetingType: "bib" })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${formData.meetingType === "bib" ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"}`}
                  >
                    Meeting Bersama BIB
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Meeting *</Label>
                  <Input
                    id="title"
                    data-testid="input-meeting-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Rapat Mingguan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizer">Penyelenggara *</Label>
                  <Input
                    id="organizer"
                    data-testid="input-meeting-organizer"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="Nama penyelenggara"
                    required
                  />
                </div>
              </div>

              {/* Agenda & Pemateri (for BIB) */}
              {formData.meetingType === "bib" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agenda">Agenda *</Label>
                    <Input
                      id="agenda"
                      value={formData.agenda || ""}
                      onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                      placeholder="Agenda meeting"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pemateri">Pemateri</Label>
                    <Input
                      id="pemateri"
                      value={formData.pemateri || ""}
                      onChange={(e) => setFormData({ ...formData, pemateri: e.target.value })}
                      placeholder="Nama pemateri"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  data-testid="input-meeting-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi meeting (opsional)"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal *</Label>
                  <Input
                    id="date"
                    type="date"
                    data-testid="input-meeting-date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Waktu Mulai *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    data-testid="input-meeting-start-time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">Waktu Selesai *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    data-testid="input-meeting-end-time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokasi *</Label>
                <Input
                  id="location"
                  data-testid="input-meeting-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Contoh: Ruang Meeting A, Lantai 2"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={createMeetingMutation.isPending}
                  data-testid="button-submit-meeting"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {createMeetingMutation.isPending ? "Membuat..." : "Buat Meeting"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-meeting"
                >
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daftar Meeting
          </CardTitle>
          <CardDescription>
            {meetings.length} meeting tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Belum ada meeting
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Buat meeting pertama untuk mulai menggunakan sistem absensi QR code
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-create-first-meeting"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Meeting Pertama
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Tanggal & Waktu</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Penyelenggara</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting: Meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {meeting.title}
                          {(meeting as any).meetingType === "bib" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">BIB</span>
                          )}
                        </div>
                        {meeting.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {meeting.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(meeting.date).toLocaleDateString('id-ID')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Clock className="w-4 h-4" />
                        {meeting.startTime} - {meeting.endTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {meeting.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        {meeting.organizer}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(meeting.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(meeting)}
                          data-testid={`button-edit-meeting-${meeting.id}`}
                          title="Edit Meeting"
                        >
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setIsQrOpen(true);
                          }}
                          data-testid={`button-view-qr-${meeting.id}`}
                          title="Lihat QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQRCode(meeting)}
                          data-testid={`button-download-qr-${meeting.id}`}
                          title="Download QR Code"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setIsAttendanceOpen(true);
                          }}
                          data-testid={`button-view-attendance-${meeting.id}`}
                          title="Lihat Kehadiran"
                        >
                          <Users className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPhotoDialog(meeting)}
                          data-testid={`button-upload-photos-${meeting.id}`}
                          title="Upload Foto"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedMeeting(meeting); setIsMateriDialogOpen(true); }}
                          title="Upload Materi"
                          className={(meeting as any).materiFiles?.length ? "text-blue-600 border-blue-300" : ""}
                        >
                          <BookOpen className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedMeeting(meeting); setIsMomDialogOpen(true); }}
                          title="Upload MoM"
                          className={(meeting as any).momFiles?.length ? "text-purple-600 border-purple-300" : ""}
                        >
                          <ClipboardList className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(meeting)}
                          data-testid={`button-delete-meeting-${meeting.id}`}
                          title="Hapus Meeting"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code Meeting</DialogTitle>
            <DialogDescription>
              QR code untuk absensi meeting: {selectedMeeting?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedMeeting?.qrToken && (
            <QRCodeDisplay meeting={selectedMeeting} />
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Daftar Kehadiran Meeting</DialogTitle>
                <DialogDescription className="mt-1">
                  Meeting: {selectedMeeting?.title} - {attendanceData?.totalAttendees || 0} peserta hadir
                </DialogDescription>
              </div>
              {attendanceData && attendanceData.attendance.length > 0 && (
                <Button
                  onClick={downloadAttendanceReport}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 shadow-sm"
                  data-testid="button-download-attendance-report"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 mt-4 overflow-y-auto pr-2">
            {attendanceData?.attendance?.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Belum ada peserta yang hadir
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Peserta dapat scan QR code untuk melakukan absensi pada meeting ini.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-gray-100 dark:border-gray-800">
                <Table>
                  <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-semibold whitespace-nowrap">Nama Karyawan</TableHead>
                      <TableHead className="font-semibold">NIK</TableHead>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="font-semibold">Meeting</TableHead>
                      <TableHead className="font-semibold">Tanggal</TableHead>
                      <TableHead className="font-semibold">Waktu</TableHead>
                      <TableHead className="font-semibold">Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData?.attendance?.map((att: any) => (
                      <TableRow key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell className="font-medium whitespace-nowrap">
                          {att.attendanceType === 'manual_entry' ? att.manualName : (att.employee?.name || 'Unknown')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{att.attendanceType === 'manual_entry' ? '-' : (att.employee?.id || '-')}</TableCell>
                        <TableCell className="whitespace-nowrap">{att.attendanceType === 'manual_entry' ? att.manualDepartment : (att.employee?.department || '-')}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="text-sm font-medium truncate">
                            {selectedMeeting?.title || '-'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {selectedMeeting?.location || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(att.scanDate).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {att.scanTime} WITA
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 max-w-[120px]">
                          <div className="truncate" title={att.deviceInfo}>
                            {att.deviceInfo}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Upload Foto Meeting
            </DialogTitle>
            <DialogDescription>
              Upload foto dokumentasi untuk meeting: {selectedMeeting?.title} (Maksimal 4 foto)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Existing Photos */}
              {selectedMeeting?.meetingPhotos && selectedMeeting.meetingPhotos.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Foto yang Sudah Diupload ({selectedMeeting.meetingPhotos.length}/4)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedMeeting.meetingPhotos.map((photoPath, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        data-testid={`existing-photo-${index}`}
                        onClick={() => {
                          setPreviewPhotoUrl(photoPath);
                          setIsPreviewOpen(true);
                        }}
                      >
                        <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img
                            src={photoPath}
                            alt={`Foto meeting ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            data-testid={`img-existing-photo-${index}`}
                          />
                        </div>

                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-lg">
                          <ZoomIn className="w-8 h-8 text-white" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Hapus foto ini?")) {
                                deletePhotoMutation.mutate({ meetingId: selectedMeeting.id, photoIndex: index });
                              }
                            }}
                            className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
                            data-testid={`button-delete-existing-photo-${index}`}
                            title="Hapus foto"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Photos */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Foto Baru ({(selectedMeeting?.meetingPhotos?.length || 0) + uploadedPhotos.length}/4)
                </Label>

                <div className="space-y-3">
                  {/* File Input */}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoSelect(e.target.files)}
                      className="hidden"
                      id="meeting-photos-input"
                      data-testid="input-meeting-photos"
                      disabled={(selectedMeeting?.meetingPhotos?.length || 0) + uploadedPhotos.length >= 4}
                    />
                    <label
                      htmlFor="meeting-photos-input"
                      className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${(selectedMeeting?.meetingPhotos?.length || 0) + uploadedPhotos.length >= 4
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500 dark:bg-gray-800 dark:border-gray-600'
                        : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}
                      data-testid="label-upload-photos"
                    >
                      <div className="text-center">
                        <Upload className="w-6 h-6 mx-auto mb-2" />
                        <span className="text-sm font-medium">
                          {(selectedMeeting?.meetingPhotos?.length || 0) + uploadedPhotos.length >= 4
                            ? 'Maksimal 4 foto tercapai'
                            : `Pilih foto (${(selectedMeeting?.meetingPhotos?.length || 0) + uploadedPhotos.length}/4)`
                          }
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* New Photos Preview Grid */}
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {photoPreviewUrls.map((previewUrl, index) => (
                        <div
                          key={index}
                          className="relative group"
                          data-testid={`new-photo-preview-${index}`}
                        >
                          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img
                              src={previewUrl}
                              alt={`Preview foto ${index + 1}`}
                              className="w-full h-full object-cover"
                              data-testid={`img-new-photo-preview-${index}`}
                            />
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-100 transition-opacity hover:bg-red-600"
                            data-testid={`button-remove-new-photo-${index}`}
                            title="Hapus foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedPhotos.length > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {uploadedPhotos.length} foto siap diupload
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button
              onClick={handlePhotoUpload}
              disabled={uploadedPhotos.length === 0 || uploadPhotosMutation.isPending}
              className="bg-red-600 hover:bg-red-700 flex-1"
              data-testid="button-upload-photos"
            >
              {uploadPhotosMutation.isPending ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {uploadedPhotos.length} Foto
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setIsPhotoDialogOpen(false);
                setUploadedPhotos([]);
                setPhotoPreviewUrls([]);
              }}
              data-testid="button-cancel-photo-upload"
            >
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Meeting Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>
              Perbarui informasi meeting
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditMeeting} className="space-y-4">
            {/* Meeting Type */}
            <div className="space-y-2">
              <Label>Jenis Meeting *</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, meetingType: "internal" })}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${editFormData.meetingType === "internal" ? "border-red-600 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"}`}
                >
                  Meeting Internal
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, meetingType: "bib" })}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${editFormData.meetingType === "bib" ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"}`}
                >
                  Meeting Bersama BIB
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Judul Meeting *</Label>
                <Input
                  id="edit-title"
                  data-testid="input-edit-meeting-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Contoh: Rapat Mingguan"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-organizer">Penyelenggara *</Label>
                <Input
                  id="edit-organizer"
                  data-testid="input-edit-meeting-organizer"
                  value={editFormData.organizer}
                  onChange={(e) => setEditFormData({ ...editFormData, organizer: e.target.value })}
                  placeholder="Nama penyelenggara"
                  required
                />
              </div>
            </div>

            {/* Agenda & Pemateri (for BIB) */}
            {editFormData.meetingType === "bib" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-agenda">Agenda</Label>
                  <Input
                    id="edit-agenda"
                    value={editFormData.agenda || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, agenda: e.target.value })}
                    placeholder="Agenda meeting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pemateri">Pemateri</Label>
                  <Input
                    id="edit-pemateri"
                    value={editFormData.pemateri || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, pemateri: e.target.value })}
                    placeholder="Nama pemateri"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-meeting-description"
                value={editFormData.description || ""}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Deskripsi meeting (opsional)"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Tanggal *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  data-testid="input-edit-meeting-date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Waktu Mulai *</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  data-testid="input-edit-meeting-start-time"
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-endTime">Waktu Selesai *</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  data-testid="input-edit-meeting-end-time"
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Lokasi *</Label>
              <Input
                id="edit-location"
                data-testid="input-edit-meeting-location"
                value={editFormData.location}
                onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                placeholder="Contoh: Ruang Meeting A, Lantai 2"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={updateMeetingMutation.isPending}
                data-testid="button-submit-edit-meeting"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateMeetingMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                data-testid="button-cancel-edit-meeting"
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            <img
              src={previewPhotoUrl}
              alt="Preview foto meeting"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Materi PDF Upload Dialog ─────────────────────────────────────── */}
      <Dialog open={isMateriDialogOpen} onOpenChange={(open) => { setIsMateriDialogOpen(open); if (!open) setUploadedMateriFiles([]); }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Materi Meeting
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting?.title} — Kelola file PDF materi presentasi
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-4">
              {/* Existing materi files */}
              {(selectedMeeting as any)?.materiFiles?.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium mb-2 block">File Tersimpan ({(selectedMeeting as any).materiFiles.length})</Label>
                  <div className="space-y-2">
                    {((selectedMeeting as any).materiFiles as string[]).map((url: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 font-medium">Materi {idx + 1}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* View */}
                          <Button size="sm" variant="outline" className="h-7 px-2 text-blue-700 border-blue-300 hover:bg-blue-100"
                            onClick={() => window.open(url, '_blank')}
                            title="Lihat PDF">
                            <Eye className="w-3 h-3 mr-1" />
                            <span className="text-xs">Lihat</span>
                          </Button>
                          {/* Download */}
                          <Button size="sm" variant="outline" className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-100"
                            onClick={() => window.open(`${url}?download=1`, '_blank')}
                            title="Download PDF">
                            <Download className="w-3 h-3 mr-1" />
                            <span className="text-xs">Unduh</span>
                          </Button>
                          {/* Delete */}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { if (confirm("Hapus file ini?")) deleteMateriMutation.mutate({ meetingId: selectedMeeting!.id, fileIndex: idx }); }}
                            title="Hapus file">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                  Belum ada file materi
                </div>
              )}

              {/* New file picker */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tambah File Materi (PDF, maks 20MB)</Label>
                <Input type="file" accept=".pdf,application/pdf" multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const valid = files.filter(f => {
                      if (f.size > 20 * 1024 * 1024) { toast({ title: "File terlalu besar", description: `${f.name} melebihi 20MB`, variant: "destructive" }); return false; }
                      return true;
                    });
                    setUploadedMateriFiles(prev => [...prev, ...valid]);
                    e.target.value = '';
                  }}
                />
                {uploadedMateriFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedMateriFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-1 bg-gray-50 rounded">
                        <span className="flex items-center gap-1 truncate"><FileText className="w-3 h-3 text-gray-500" />{f.name}</span>
                        <button onClick={() => setUploadedMateriFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-500 ml-2"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-3 border-t mt-2">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={uploadedMateriFiles.length === 0 || uploadMateriMutation.isPending}
              onClick={() => uploadMateriMutation.mutate({ meetingId: selectedMeeting!.id, files: uploadedMateriFiles })}>
              {uploadMateriMutation.isPending ? <><Upload className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : <><Upload className="w-4 h-4 mr-2" />Upload {uploadedMateriFiles.length} File</>}
            </Button>
            <Button variant="outline" onClick={() => { setIsMateriDialogOpen(false); setUploadedMateriFiles([]); }}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MoM PDF Upload Dialog ────────────────────────────────────────── */}
      <Dialog open={isMomDialogOpen} onOpenChange={(open) => { setIsMomDialogOpen(open); if (!open) setUploadedMomFiles([]); }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              Minutes of Meeting (MoM)
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting?.title} — Kelola file PDF notulensi meeting
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-4">
              {/* Existing MoM files */}
              {(selectedMeeting as any)?.momFiles?.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium mb-2 block">File Tersimpan ({(selectedMeeting as any).momFiles.length})</Label>
                  <div className="space-y-2">
                    {((selectedMeeting as any).momFiles as string[]).map((url: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-purple-50">
                        <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 font-medium">MoM {idx + 1}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* View */}
                          <Button size="sm" variant="outline" className="h-7 px-2 text-purple-700 border-purple-300 hover:bg-purple-100"
                            onClick={() => window.open(url, '_blank')}
                            title="Lihat PDF">
                            <Eye className="w-3 h-3 mr-1" />
                            <span className="text-xs">Lihat</span>
                          </Button>
                          {/* Download */}
                          <Button size="sm" variant="outline" className="h-7 px-2 text-green-700 border-green-300 hover:bg-green-100"
                            onClick={() => window.open(`${url}?download=1`, '_blank')}
                            title="Download PDF">
                            <Download className="w-3 h-3 mr-1" />
                            <span className="text-xs">Unduh</span>
                          </Button>
                          {/* Delete */}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { if (confirm("Hapus file ini?")) deleteMomMutation.mutate({ meetingId: selectedMeeting!.id, fileIndex: idx }); }}
                            title="Hapus file">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                  Belum ada file MoM
                </div>
              )}

              {/* New file picker */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tambah File MoM (PDF, maks 20MB)</Label>
                <Input type="file" accept=".pdf,application/pdf" multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const valid = files.filter(f => {
                      if (f.size > 20 * 1024 * 1024) { toast({ title: "File terlalu besar", description: `${f.name} melebihi 20MB`, variant: "destructive" }); return false; }
                      return true;
                    });
                    setUploadedMomFiles(prev => [...prev, ...valid]);
                    e.target.value = '';
                  }}
                />
                {uploadedMomFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedMomFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-1 bg-gray-50 rounded">
                        <span className="flex items-center gap-1 truncate"><FileText className="w-3 h-3 text-gray-500" />{f.name}</span>
                        <button onClick={() => setUploadedMomFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-500 ml-2"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-3 border-t mt-2">
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={uploadedMomFiles.length === 0 || uploadMomMutation.isPending}
              onClick={() => uploadMomMutation.mutate({ meetingId: selectedMeeting!.id, files: uploadedMomFiles })}>
              {uploadMomMutation.isPending ? <><Upload className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : <><Upload className="w-4 h-4 mr-2" />Upload {uploadedMomFiles.length} File</>}
            </Button>
            <Button variant="outline" onClick={() => { setIsMomDialogOpen(false); setUploadedMomFiles([]); }}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}