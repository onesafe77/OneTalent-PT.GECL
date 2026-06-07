import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle, Clock, FileText, Inbox, MessageSquare,
  ThumbsUp, ThumbsDown, Eye, AlertCircle, XCircle, RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface InboxItem {
  // Common
  type: "APPROVAL" | "CHANGE_REQUEST";
  documentId: string;
  document_code: string;
  title: string;
  sender_name: string;
  received_at: string;
  // APPROVAL only
  approvalId?: string;
  stepName?: string;
  stepNumber?: number;
  workflowName?: string;
  status?: string;
  assignee_id?: string;
  // CHANGE_REQUEST only
  requestId?: string;
  reason?: string;
}

type FilterTab = "all" | "APPROVAL" | "CHANGE_REQUEST";

export default function ApprovalsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [decisionItem, setDecisionItem] = useState<InboxItem | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "">("");
  const [comments, setComments] = useState("");

  const { data: items = [], isLoading, refetch, isFetching } = useQuery<InboxItem[]>({
    queryKey: [`/api/approval-inbox?userId=${user?.nik || ""}`],
    enabled: !!user?.nik,
    refetchInterval: 60000,
  });

  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!decisionItem || !decision) throw new Error("Data belum lengkap");
      return apiRequest(
        `/api/document-masterlist/${decisionItem.documentId}/approve`,
        "POST",
        {
          approvalId: decisionItem.approvalId,
          decision,
          comments: comments.trim() || undefined,
          assigneeId: user?.nik,
          assigneeName: user?.name,
        }
      );
    },
    onSuccess: () => {
      toast({
        title: decision === "APPROVED" ? "Dokumen disetujui" : "Dokumen ditolak",
        description: decisionItem?.document_code,
      });
      qc.invalidateQueries({ queryKey: ["/api/approval-inbox"] });
      qc.invalidateQueries({ queryKey: [`/api/approval-inbox?userId=${user?.nik || ""}`] });
      qc.invalidateQueries({ queryKey: ["/api/approval-inbox/count"] });
      qc.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
      closeDialog();
    },
    onError: (e: any) => {
      toast({
        title: "Gagal memproses keputusan",
        description: e?.message || "",
        variant: "destructive",
      });
    },
  });

  const closeDialog = () => {
    setDecisionItem(null);
    setDecision("");
    setComments("");
  };

  const filtered = items.filter((i) => activeTab === "all" || i.type === activeTab);

  const approvalCount = items.filter((i) => i.type === "APPROVAL").length;
  const changeRequestCount = items.filter((i) => i.type === "CHANGE_REQUEST").length;

  const fmtDate = (s?: string) => {
    if (!s) return "—";
    try {
      return format(new Date(s), "dd MMM yyyy · HH:mm", { locale: localeId });
    } catch {
      return s;
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/workspace/dashboard")}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="w-5 h-5 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Approval Inbox
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              Dokumen & permintaan perubahan yang menunggu persetujuan Anda
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard icon={Inbox} label="Total Pending" value={items.length} color="text-gray-700" />
        <StatCard icon={Clock} label="Approval Dokumen" value={approvalCount} color="text-amber-600" />
        <StatCard icon={MessageSquare} label="Change Request" value={changeRequestCount} color="text-purple-600" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { value: "all" as const, label: "Semua", count: items.length },
            { value: "APPROVAL" as const, label: "Approval Dokumen", count: approvalCount },
            { value: "CHANGE_REQUEST" as const, label: "Change Request", count: changeRequestCount },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.value
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Memuat…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center bg-white dark:bg-gray-900">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Tidak ada yang perlu disetujui
          </h3>
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? "Semua dokumen sudah diproses. Inbox Anda bersih."
              : "Tidak ada item di kategori ini — coba pilih tab lain."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <InboxItemCard
              key={`${item.type}-${item.approvalId || item.requestId || item.documentId}`}
              item={item}
              onView={() => setLocation(`/workspace/hse/k3/documents/${item.documentId}`)}
              onDecide={() => {
                if (item.type === "APPROVAL") {
                  setDecisionItem(item);
                  setDecision("");
                  setComments("");
                } else {
                  // Change request: redirect ke halaman lama untuk action (out of scope refactor)
                  setLocation(`/workspace/hse/k3/document-control?tab=inbox`);
                }
              }}
              fmtDate={fmtDate}
            />
          ))}
        </div>
      )}

      {/* Decision Dialog */}
      <Dialog
        open={!!decisionItem}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keputusan Approval</DialogTitle>
            <DialogDescription>
              {decisionItem && (
                <>
                  Dokumen <span className="font-mono">{decisionItem.document_code}</span> —{" "}
                  <span className="font-medium">{decisionItem.title}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-sm">Pilih keputusan</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setDecision("APPROVED")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    decision === "APPROVED"
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "border-gray-200 text-gray-600 hover:border-green-300"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" /> Setujui
                </button>
                <button
                  type="button"
                  onClick={() => setDecision("REJECTED")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    decision === "REJECTED"
                      ? "bg-red-50 border-red-500 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-red-300"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" /> Tolak
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm">
                Catatan {decision === "REJECTED" && <span className="text-red-600">*</span>}
              </Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder={
                  decision === "REJECTED"
                    ? "Wajib diisi — alasan penolakan"
                    : "Opsional — catatan tambahan"
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button
              disabled={
                !decision ||
                decisionMutation.isPending ||
                (decision === "REJECTED" && !comments.trim())
              }
              onClick={() => decisionMutation.mutate()}
              className={
                decision === "APPROVED"
                  ? "bg-green-600 hover:bg-green-700"
                  : decision === "REJECTED"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-600 hover:bg-gray-700"
              }
            >
              {decisionMutation.isPending ? "Memproses…" : "Submit Keputusan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number; color: string;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function InboxItemCard({ item, onView, onDecide, fmtDate }: {
  item: InboxItem;
  onView: () => void;
  onDecide: () => void;
  fmtDate: (s?: string) => string;
}) {
  const isApproval = item.type === "APPROVAL";
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isApproval ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
        }`}>
          {isApproval ? <FileText className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className={
              isApproval
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-purple-50 text-purple-700 border-purple-200"
            }>
              {isApproval ? "Approval Dokumen" : "Change Request"}
            </Badge>
            <span className="font-mono text-xs text-gray-500">{item.document_code}</span>
            {item.stepName && (
              <span className="text-xs text-gray-400">· Step {item.stepNumber}: {item.stepName}</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
            {item.title}
          </h3>
          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>Diajukan oleh <strong>{item.sender_name}</strong></span>
            <span>·</span>
            <span>{fmtDate(item.received_at)}</span>
          </div>
          {item.type === "CHANGE_REQUEST" && item.reason && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md px-3 py-2">
              <AlertCircle className="w-3 h-3 inline mr-1 text-purple-600" />
              {item.reason}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Lihat
          </Button>
          {isApproval ? (
            <Button size="sm" onClick={onDecide} className="bg-red-600 hover:bg-red-700">
              Putuskan
            </Button>
          ) : (
            <Button size="sm" onClick={onDecide} variant="outline">
              Buka
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
