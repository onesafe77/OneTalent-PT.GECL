import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { 
  Plus, 
  Megaphone, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Image as ImageIcon, 
  Upload, 
  FileDown,
  Loader2,
  CheckCircle,
  Clock,
  X
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrls?: string[] | null;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface AnnouncementRead {
  id: string;
  announcementId: string;
  employeeId: string;
  employeeName: string;
  employeePosition?: string | null;
  readAt: string;
}

export default function Announcements() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: announcementReads = [], isLoading: readsLoading } = useQuery<AnnouncementRead[]>({
    queryKey: ["/api/announcements", selectedAnnouncement?.id, "reads"],
    queryFn: async () => {
      if (!selectedAnnouncement?.id) return [];
      const response = await fetch(`/api/announcements/${selectedAnnouncement.id}/reads`);
      if (!response.ok) throw new Error("Failed to fetch reads");
      return response.json();
    },
    enabled: !!selectedAnnouncement?.id && isDetailOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; imageUrls?: string[]; isActive: boolean; createdBy: string; createdByName: string }) => {
      return apiRequest("/api/announcements", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil dibuat" });
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Announcement> }) => {
      return apiRequest(`/api/announcements/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil diupdate" });
      resetForm();
      setIsEditOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/announcements/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Berhasil", description: "Pengumuman berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewTitle("");
    setNewContent("");
    setNewIsActive(true);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageUrls([]);
    setSelectedAnnouncement(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("image", file);
        
        const response = await fetch("/api/announcements/upload-image", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Failed to upload image");
        const data = await response.json();
        uploadedUrls.push(data.url);
      }
      
      return uploadedUrls;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Error", description: "Judul dan isi pengumuman wajib diisi", variant: "destructive" });
      return;
    }

    if (!user?.nik || !user?.name) {
      toast({ title: "Error", description: "Anda harus login untuk membuat pengumuman", variant: "destructive" });
      return;
    }

    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      imageUrls = await uploadImages();
    }

    createMutation.mutate({
      title: newTitle,
      content: newContent,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      isActive: newIsActive,
      createdBy: user.nik,
      createdByName: user.name,
    });
  };

  const handleUpdate = async () => {
    if (!selectedAnnouncement) return;

    let imageUrls = [...existingImageUrls];
    if (imageFiles.length > 0) {
      const newUrls = await uploadImages();
      imageUrls = [...imageUrls, ...newUrls];
    }

    updateMutation.mutate({
      id: selectedAnnouncement.id,
      data: {
        title: newTitle,
        content: newContent,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        isActive: newIsActive,
      },
    });
  };

  const openEditDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
    setNewIsActive(announcement.isActive);
    setExistingImageUrls(announcement.imageUrls || []);
    setImageFiles([]);
    setImagePreviews([]);
    setIsEditOpen(true);
  };

  const openDetailDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailOpen(true);
  };

  const exportReadsToPdf = () => {
    if (!selectedAnnouncement || announcementReads.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header dengan warna merah
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Judul header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN PEMBACA PENGUMUMAN", pageWidth / 2, 15, { align: "center" });
    
    // Sub-judul
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("PT. Golden Energi Cemerlang Lestari", pageWidth / 2, 23, { align: "center" });
    doc.text(`Dicetak: ${format(new Date(), "dd MMMM yyyy HH:mm")}`, pageWidth / 2, 30, { align: "center" });
    
    // Reset warna untuk konten
    doc.setTextColor(0, 0, 0);
    
    // Box informasi pengumuman
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 42, pageWidth - 28, 38, 3, 3, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(14, 42, pageWidth - 28, 38, 3, 3, 'S');
    
    // Konten informasi
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Judul Pengumuman:", 20, 52);
    doc.setFont("helvetica", "normal");
    doc.text(selectedAnnouncement.title, 70, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text("Dibuat Oleh:", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(selectedAnnouncement.createdByName, 70, 60);
    
    doc.setFont("helvetica", "bold");
    doc.text("Tanggal Dibuat:", 20, 68);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(selectedAnnouncement.createdAt), "dd MMMM yyyy HH:mm"), 70, 68);
    
    doc.setFont("helvetica", "bold");
    doc.text("Total Pembaca:", 20, 76);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 38, 38);
    doc.text(`${announcementReads.length} orang`, 70, 76);
    doc.setTextColor(0, 0, 0);

    // Tabel data pembaca
    const tableData = announcementReads.map((read, index) => [
      (index + 1).toString(),
      read.employeeName,
      read.employeePosition || "-",
      read.employeeId,
      format(new Date(read.readAt), "dd MMM yyyy HH:mm"),
    ]);

    autoTable(doc, {
      startY: 88,
      head: [["No", "Nama Karyawan", "Jabatan", "NIK", "Waktu Baca"]],
      body: tableData,
      theme: "striped",
      headStyles: { 
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { halign: "center", cellWidth: 28 },
        4: { halign: "center", cellWidth: 40 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text("Dokumen ini dihasilkan secara otomatis oleh sistem OneTalent - AttendanceQR", pageWidth / 2, finalY, { align: "center" });

    doc.save(`laporan-pembaca-${selectedAnnouncement.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}.pdf`);
    toast({ title: "Berhasil", description: "PDF berhasil diunduh" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-purple-600" />
            Kelola Pengumuman
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Buat dan kelola pengumuman untuk driver
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700" data-testid="btn-create-announcement">
              <Plus className="h-4 w-4 mr-2" />
              Buat Pengumuman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Pengumuman Baru</DialogTitle>
              <DialogDescription>Isi form berikut untuk membuat pengumuman baru</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Judul Pengumuman</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masukkan judul pengumuman"
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="content">Isi Pengumuman</Label>
                <Textarea
                  id="content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Masukkan isi pengumuman"
                  rows={5}
                  data-testid="input-content"
                />
              </div>
              <div>
                <Label>Gambar (Bisa lebih dari satu)</Label>
                <div className="mt-2 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    data-testid="input-image"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500">Klik untuk upload gambar</p>
                      <p className="text-xs text-gray-400">Bisa pilih beberapa foto sekaligus</p>
                    </div>
                  </label>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={preview} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Aktifkan Pengumuman</Label>
                <Switch
                  id="active"
                  checked={newIsActive}
                  onCheckedChange={setNewIsActive}
                  data-testid="switch-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setIsCreateOpen(false); }}>
                Batal
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending || isUploading}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="btn-submit-create"
              >
                {(createMutation.isPending || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Buat Pengumuman
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengumuman</CardTitle>
          <CardDescription>
            {announcements.length} pengumuman tersedia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada pengumuman. Buat pengumuman pertama Anda!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Pembuat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id} data-testid={`row-announcement-${announcement.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {announcement.imageUrls && announcement.imageUrls.length > 0 && (
                          <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0 relative">
                            <img 
                              src={announcement.imageUrls[0]} 
                              alt="" 
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {announcement.imageUrls.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
                                +{announcement.imageUrls.length - 1}
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{announcement.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{announcement.content}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{announcement.createdByName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={announcement.isActive ? "bg-primary" : "bg-gray-400"}>
                        {announcement.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(announcement.createdAt), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDetailDialog(announcement)}
                          data-testid={`btn-view-${announcement.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(announcement)}
                          data-testid={`btn-edit-${announcement.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            if (confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) {
                              deleteMutation.mutate(announcement.id);
                            }
                          }}
                          data-testid={`btn-delete-${announcement.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pengumuman</DialogTitle>
            <DialogDescription>Ubah informasi pengumuman</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Judul Pengumuman</Label>
              <Input
                id="edit-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Masukkan judul pengumuman"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Isi Pengumuman</Label>
              <Textarea
                id="edit-content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Masukkan isi pengumuman"
                rows={5}
              />
            </div>
            <div>
              <Label>Gambar</Label>
              <div className="mt-2 space-y-3">
                {existingImageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {existingImageUrls.map((url, index) => (
                      <div key={`existing-${index}`} className="relative">
                        <img 
                          src={url} 
                          alt={`Existing ${index + 1}`} 
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label
                  htmlFor="edit-image-upload"
                  className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Tambah gambar baru</p>
                  </div>
                </label>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative">
                        <img 
                          src={preview} 
                          alt={`New ${index + 1}`} 
                          className="w-full h-20 object-cover rounded-lg border-2 border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-0 left-0 bg-primary text-white text-xs px-1 rounded-tr">
                          Baru
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Aktifkan Pengumuman</Label>
              <Switch
                id="edit-active"
                checked={newIsActive}
                onCheckedChange={setNewIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsEditOpen(false); }}>
              Batal
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateMutation.isPending || isUploading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {(updateMutation.isPending || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Detail Pengumuman & Pembaca
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedAnnouncement.title}</CardTitle>
                  <CardDescription>
                    Dibuat oleh: {selectedAnnouncement.createdByName} | {format(new Date(selectedAnnouncement.createdAt), "dd MMM yyyy HH:mm")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedAnnouncement.imageUrls && selectedAnnouncement.imageUrls.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {selectedAnnouncement.imageUrls.map((url, index) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`${selectedAnnouncement.title} - ${index + 1}`}
                          className="w-full max-h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-foreground" />
                      Daftar Pembaca ({announcementReads.length})
                    </CardTitle>
                    <CardDescription>Karyawan yang sudah membaca pengumuman ini</CardDescription>
                  </div>
                  {announcementReads.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={exportReadsToPdf}
                      data-testid="btn-export-reads"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {readsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    </div>
                  ) : announcementReads.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Belum ada yang membaca pengumuman ini</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Nama Karyawan</TableHead>
                          <TableHead>Jabatan</TableHead>
                          <TableHead>NIK</TableHead>
                          <TableHead>Waktu Baca</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {announcementReads.map((read, index) => (
                          <TableRow key={read.id}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell className="font-medium">{read.employeeName}</TableCell>
                            <TableCell className="text-gray-600">{read.employeePosition || "-"}</TableCell>
                            <TableCell>{read.employeeId}</TableCell>
                            <TableCell>
                              {format(new Date(read.readAt), "dd MMM yyyy HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
