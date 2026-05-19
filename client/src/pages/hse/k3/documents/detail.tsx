import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Send, Download, Upload, FileX, History, ExternalLink, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { PDFViewer } from "@/components/PDFViewer";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface DocRaw {
  id: string;
  document_code: string;
  title: string;
  category: string;
  department: string;
  smkp_clause?: string | null;
  retention_period?: string | null;
  lifecycle_status: string;
  current_version: number;
  current_revision: number;
  owner_name: string;
  owner_id: string;
  effective_date?: string | null;
  next_review_date?: string | null;
}

interface VersionRaw {
  id: string;
  version_number: number;
  revision_number: number;
  file_path: string;
  file_name: string;
  mime_type?: string | null;
  changes_note?: string | null;
  status: string;
  uploaded_by_name?: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  IN_REVIEW: "bg-amber-100 text-amber-700 border-amber-300",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-300",
  ESIGN_PENDING: "bg-purple-100 text-purple-700 border-purple-300",
  SIGNED: "bg-green-100 text-green-700 border-green-300",
  PUBLISHED: "bg-teal-100 text-teal-700 border-teal-300",
  OBSOLETE: "bg-red-100 text-red-700 border-red-300",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Dalam Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Diterbitkan",
  SIGNED: "Ditandatangani",
  OBSOLETE: "Obsolete",
};

export default function K3DocumentDetail() {
  const params = useParams<{ id: string }>();
  const documentId = params?.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [obsoleteOpen, setObsoleteOpen] = useState(false);

  const { data: detailResp, isLoading } = useQuery<{ document: DocRaw; versions: VersionRaw[] }>({
    queryKey: [`/api/document-masterlist/${documentId}`],
    enabled: !!documentId,
  });

  const doc = detailResp?.document;
  const versions = detailResp?.versions || [];
  const currentVersion = versions.find(
    (v) => v.version_number === doc?.current_version && v.revision_number === doc?.current_revision
  ) || versions[0];

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/document-masterlist/${documentId}/submit`, "POST", {
        userId: user?.nik,
        userName: user?.name,
      });
    },
    onSuccess: () => {
      toast({ title: "Diajukan untuk review" });
      qc.invalidateQueries({ queryKey: [`/api/document-masterlist/${documentId}`] });
      qc.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
      qc.invalidateQueries({ queryKey: ["/api/approval-inbox/count"] });
    },
    onError: (e: any) => {
      toast({ title: "Gagal mengajukan", description: e?.message || "", variant: "destructive" });
    },
  });

  const obsoleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/document-masterlist/${documentId}`, "PATCH", {
        lifecycleStatus: "OBSOLETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Ditandai obsolete" });
      qc.invalidateQueries({ queryKey: [`/api/document-masterlist/${documentId}`] });
      qc.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
      setObsoleteOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Gagal", description: e?.message || "", variant: "destructive" });
    },
  });

  // Auto-trigger actions from query param (?action=upload-version|obsolete|download|submit)
  // Triggered from dropdown menu items in the masterlist page.
  useEffect(() => {
    if (!detailResp?.document) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;
    if (action === "upload-version") setUploadOpen(true);
    else if (action === "obsolete") setObsoleteOpen(true);
    else if (action === "download") {
      const v = detailResp.versions?.[0];
      if (v?.file_path) window.open(v.file_path, "_blank");
    } else if (action === "submit" && detailResp.document.lifecycle_status === "DRAFT") {
      submitMutation.mutate();
    }
    // Clear action param from URL after handling so it doesn't re-trigger.
    const url = new URL(window.location.href);
    url.searchParams.delete("action");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailResp?.document?.id]);

  if (isLoading) return <div className="p-8 text-center text-gray-400">Memuat…</div>;
  if (!doc) return <div className="p-8 text-center text-gray-400">Dokumen tidak ditemukan.</div>;

  const isDraft = doc.lifecycle_status === "DRAFT";
  const isObsolete = doc.lifecycle_status === "OBSOLETE";
  const pdfUrl = currentVersion?.file_path;
  const fmtDate = (s?: string | null) => s ? format(new Date(s), "dd MMM yyyy", { locale: localeId }) : "—";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/workspace/hse/k3/documents")} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-gray-500">{doc.document_code}</span>
              <Badge variant="outline" className={statusColors[doc.lifecycle_status] || ""}>
                {statusLabels[doc.lifecycle_status] || doc.lifecycle_status}
              </Badge>
              <span className="text-xs text-gray-400">v{doc.current_version}.{doc.current_revision ?? 0}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{doc.title}</h1>
            <div className="text-sm text-gray-500 mt-0.5">
              {doc.category} · {doc.department} · Owner: {doc.owner_name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pdfUrl && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1.5" /> Tab Baru
              </Button>
              <a href={pdfUrl} download={currentVersion?.file_name}>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1.5" /> Download
                </Button>
              </a>
            </>
          )}
          {!isObsolete && (
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload Versi Baru
            </Button>
          )}
          {isDraft && (
            <Button
              size="sm"
              disabled={!pdfUrl || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {submitMutation.isPending ? "Mengajukan…" : "Ajukan Review"}
            </Button>
          )}
          {!isObsolete && (
            <Button variant="outline" size="sm" onClick={() => setObsoleteOpen(true)} className="text-red-600">
              <FileX className="w-4 h-4 mr-1.5" /> Tandai Obsolete
            </Button>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetaCard label="Klausul SMKP" value={doc.smkp_clause || "—"} />
        <MetaCard label="Retensi" value={retentionLabel(doc.retention_period)} />
        <MetaCard label="Tgl Efektif" value={fmtDate(doc.effective_date)} />
        <MetaCard label="Review Berikutnya" value={fmtDate(doc.next_review_date)} />
      </div>

      {/* PDF Preview */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Preview Dokumen (PDF)</h2>
        {pdfUrl ? (
          <div className="h-[70vh] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <PDFViewer
              pdfPath={pdfUrl}
              title={doc.title}
              inline
              watermark={doc.lifecycle_status !== "PUBLISHED" && doc.lifecycle_status !== "SIGNED" ? "UNCONTROLLED COPY" : undefined}
            />
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Belum ada file PDF. Upload versi pertama untuk dokumen ini.</p>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="mt-3">
              <Upload className="w-4 h-4 mr-1.5" /> Upload PDF
            </Button>
          </div>
        )}
      </div>

      {/* Version history */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <History className="w-4 h-4" /> Riwayat Versi ({versions.length})
        </h2>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Versi</th>
                <th className="px-4 py-2 text-left">Nama File</th>
                <th className="px-4 py-2 text-left">Catatan</th>
                <th className="px-4 py-2 text-left">Uploaded By</th>
                <th className="px-4 py-2 text-left">Tanggal</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {versions.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Belum ada versi.</td></tr>
              )}
              {versions.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 font-mono">v{v.version_number}.{v.revision_number}</td>
                  <td className="px-4 py-2 truncate max-w-[200px]" title={v.file_name}>{v.file_name}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{v.changes_note || "—"}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{v.uploaded_by_name || "—"}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{fmtDate(v.created_at)}</td>
                  <td className="px-4 py-2"><Badge variant="outline" className="text-[10px]">{v.status}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <a href={v.file_path} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">Buka</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload new version dialog */}
      <UploadVersionDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        documentId={doc.id}
        onUploaded={() => {
          qc.invalidateQueries({ queryKey: [`/api/document-masterlist/${documentId}`] });
          qc.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
        }}
      />

      {/* Obsolete confirmation */}
      <Dialog open={obsoleteOpen} onOpenChange={setObsoleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai sebagai Obsolete?</DialogTitle>
            <DialogDescription>
              Dokumen yang sudah obsolete tidak akan muncul di tab "Diterbitkan" dan tidak boleh dipakai. Aksi ini bisa di-revert hanya lewat database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsoleteOpen(false)}>Batal</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={obsoleteMutation.isPending}
              onClick={() => obsoleteMutation.mutate()}
            >
              Ya, Tandai Obsolete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
      <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function retentionLabel(p?: string | null): string {
  if (!p) return "—";
  const map: Record<string, string> = {
    "1_tahun": "1 tahun", "3_tahun": "3 tahun", "5_tahun": "5 tahun",
    "10_tahun": "10 tahun", "permanent": "Permanen",
  };
  return map[p] || p;
}

function UploadVersionDialog({ open, onOpenChange, documentId, onUploaded }: {
  open: boolean; onOpenChange: (v: boolean) => void; documentId: string; onUploaded: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("File belum dipilih");
      const fd = new FormData();
      fd.append("document", file);
      fd.append("uploadedBy", user?.nik || "");
      fd.append("uploadedByName", user?.name || "");
      if (note.trim()) fd.append("changesNote", note.trim());
      return apiRequest(`/api/document-masterlist/${documentId}/versions`, "POST", fd);
    },
    onSuccess: () => {
      toast({ title: "Versi baru di-upload" });
      onUploaded();
      onOpenChange(false);
      setFile(null);
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => {
      toast({ title: "Upload gagal", description: e?.message || "", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Versi Baru</DialogTitle>
          <DialogDescription>
            Upload PDF revisi terbaru. Revisi number akan otomatis naik (v1.0 → v1.1, dst).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>File PDF *</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm border border-gray-200 dark:border-gray-700 rounded-md p-2 cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
            {file && (
              <p className="text-xs text-gray-500 mt-1">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <div>
            <Label>Catatan Perubahan (opsional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="mis. Update prosedur sesuai temuan audit 2026"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={!file || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
            className="bg-red-600 hover:bg-red-700"
          >
            {uploadMutation.isPending ? "Mengupload…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
