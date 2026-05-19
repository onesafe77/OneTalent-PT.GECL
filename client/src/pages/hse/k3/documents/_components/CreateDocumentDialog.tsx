import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { documentCategories } from "@shared/schema";
import {
  DEPARTMENT_OPTIONS, RETENTION_OPTIONS, generateDocumentCode,
} from "@/lib/document-code";

interface SmkpClause {
  id: string;
  clauseNo: string;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDocumentDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>("HSE");
  const [category, setCategory] = useState<string>("Prosedur - Dept HSE");
  const [smkpClause, setSmkpClause] = useState<string>("");
  const [retentionPeriod, setRetentionPeriod] = useState<string>("5_tahun");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable random suffix per dialog session for codes without SMKP clause
  const [fallbackSuffix, setFallbackSuffix] = useState<string>("");

  const { data: clauses = [], isLoading: clausesLoading, isError: clausesError } = useQuery<SmkpClause[]>({
    queryKey: ["/api/smkp-clauses"],
    enabled: open,
  });

  const documentCode = generateDocumentCode(
    department,
    category,
    smkpClause || fallbackSuffix
  );

  // Reset on close + regenerate fallback suffix on open
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDepartment("HSE");
      setCategory("Prosedur - Dept HSE");
      setSmkpClause("");
      setRetentionPeriod("5_tahun");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setFallbackSuffix(Date.now().toString(36).slice(-4).toUpperCase());
    }
  }, [open]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f) {
      const ext = f.name.toLowerCase().split(".").pop();
      if (ext !== "pdf") {
        toast({
          title: "Format tidak didukung",
          description: "Hanya file PDF yang diterima",
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.nik || !user?.name) {
        throw new Error("User belum login");
      }
      if (!file) {
        throw new Error("File PDF wajib diupload");
      }

      // 1. Create document metadata
      const body = {
        documentCode,
        title: title.trim(),
        category,
        department,
        smkpClause: smkpClause || null,
        retentionPeriod,
        description: description.trim() || undefined,
        ownerId: user.nik,
        ownerName: user.name,
        createdBy: user.nik,
        lifecycleStatus: "DRAFT",
        controlType: "CONTROLLED",
        currentVersion: 1,
        currentRevision: 0,
        signRequired: true,
      };
      const created = await apiRequest("/api/document-masterlist", "POST", body);
      const documentId = created?.id;
      if (!documentId) throw new Error("Gagal membuat dokumen (response tanpa id)");

      // 2. Upload PDF as first version
      const fd = new FormData();
      fd.append("document", file);
      fd.append("uploadedBy", user.nik);
      fd.append("uploadedByName", user.name);
      fd.append("changesNote", "Upload awal");
      await apiRequest(`/api/document-masterlist/${documentId}/versions`, "POST", fd);

      return created;
    },
    onSuccess: (created) => {
      toast({
        title: "Dokumen berhasil dibuat",
        description: `${documentCode} · PDF terupload`,
      });
      qc.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
      onOpenChange(false);
      // Buka halaman detail untuk preview
      if (created?.id) {
        setTimeout(() => {
          window.location.href = `/workspace/hse/k3/documents/${created.id}`;
        }, 200);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Gagal membuat dokumen",
        description: err?.message || "Kode dokumen mungkin sudah ada — coba klausul lain.",
        variant: "destructive",
      });
    },
  });

  const isValid = title.trim().length > 0 && file !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Dokumen K3</DialogTitle>
          <DialogDescription>
            Upload file PDF prosedur/dokumen yang sudah jadi (Word → Export to PDF).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Judul Dokumen *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Prosedur Analisis Keselamatan Kerja"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Departemen *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategori *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {documentCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Klausul SMKP (opsional)</Label>
              {smkpClause && (
                <button
                  type="button"
                  onClick={() => setSmkpClause("")}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  Hapus pilihan
                </button>
              )}
            </div>
            <Select value={smkpClause} onValueChange={setSmkpClause}>
              <SelectTrigger>
                <SelectValue placeholder={
                  clausesLoading ? "Memuat klausul..." :
                  clausesError ? "Gagal memuat — kode pakai suffix acak" :
                  "Pilih klausul SMKP (opsional)..."
                } />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {clauses.map((c) => (
                  <SelectItem key={c.id} value={c.clauseNo}>
                    <span className="font-mono text-xs mr-2">{c.clauseNo}</span>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Pilih klausul SMKP terkait. Kalau tidak relevan, biarkan kosong — kode pakai suffix acak.
            </p>
          </div>

          <div>
            <Label>Masa Retensi *</Label>
            <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Deskripsi (opsional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Singkat dan jelas..."
            />
          </div>

          <div>
            <Label>Upload Dokumen (PDF) *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileChange}
              className="hidden"
            />
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-6 text-center hover:border-red-400 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                  Klik untuk pilih file PDF
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Hanya .pdf
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
                <FileText className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Hapus file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1.5">
              Upload file PDF prosedur/dokumen yang sudah diexport dari Microsoft Word.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3">
            <div className="text-xs text-gray-500 mb-1">Kode dokumen yang akan dibuat:</div>
            <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
              {documentCode}
            </div>
            {!smkpClause && (
              <div className="text-[11px] text-gray-500 mt-1">
                Suffix acak karena klausul SMKP belum dipilih.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={!isValid || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="bg-red-600 hover:bg-red-700"
          >
            {createMutation.isPending ? "Mengupload..." : "Simpan & Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
