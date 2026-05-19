import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Plus, Search, MoreVertical, Eye, Send, AlertCircle, Upload,
  CheckCircle, Clock, FileCheck, ClipboardList, User as UserIcon, Download, FileX, Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CreateDocumentDialog } from "./_components/CreateDocumentDialog";
import { documentCategories } from "@shared/schema";

type FilterTab = "all" | "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "OBSOLETE" | "mine";

const statusColors: Record<string, string> = {
  "DRAFT": "bg-gray-100 text-gray-700 border-gray-300",
  "IN_REVIEW": "bg-amber-100 text-amber-700 border-amber-300",
  "APPROVED": "bg-blue-100 text-blue-700 border-blue-300",
  "ESIGN_PENDING": "bg-purple-100 text-purple-700 border-purple-300",
  "SIGNED": "bg-green-100 text-green-700 border-green-300",
  "PUBLISHED": "bg-teal-100 text-teal-700 border-teal-300",
  "ARCHIVED": "bg-slate-100 text-slate-700 border-slate-300",
  "OBSOLETE": "bg-red-100 text-red-700 border-red-300",
};

const statusLabels: Record<string, string> = {
  "DRAFT": "Draft",
  "IN_REVIEW": "Dalam Review",
  "APPROVED": "Disetujui",
  "ESIGN_PENDING": "Menunggu eSign",
  "SIGNED": "Ditandatangani",
  "PUBLISHED": "Diterbitkan",
  "ARCHIVED": "Diarsipkan",
  "OBSOLETE": "Obsolete",
};

// Legacy API endpoint returns snake_case (raw SQL).
// We normalize to camelCase shape for the UI.
interface RawDocumentRow {
  id: string;
  document_code: string;
  title: string;
  category: string;
  department: string;
  smkp_clause?: string | null;
  retention_period?: string | null;
  current_version: number;
  current_revision?: number;
  lifecycle_status: string;
  owner_name: string;
  owner_id: string;
  next_review_date?: string | null;
  effective_date?: string | null;
}

interface DocumentRow {
  id: string;
  documentCode: string;
  title: string;
  category: string;
  department: string;
  smkpClause?: string | null;
  retentionPeriod?: string | null;
  currentVersion: number;
  currentRevision: number;
  lifecycleStatus: string;
  ownerName: string;
  ownerId: string;
  nextReviewDate?: string | null;
  effectiveDate?: string | null;
}

function normalizeDoc(r: RawDocumentRow): DocumentRow {
  return {
    id: r.id,
    documentCode: r.document_code,
    title: r.title,
    category: r.category,
    department: r.department,
    smkpClause: r.smkp_clause,
    retentionPeriod: r.retention_period,
    currentVersion: r.current_version,
    currentRevision: r.current_revision ?? 0,
    lifecycleStatus: r.lifecycle_status,
    ownerName: r.owner_name,
    ownerId: r.owner_id,
    nextReviewDate: r.next_review_date,
    effectiveDate: r.effective_date,
  };
}

export default function DocumentsDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rawDocs = [], isLoading } = useQuery<RawDocumentRow[]>({
    queryKey: ["/api/document-masterlist"],
  });
  const documents = useMemo(() => rawDocs.map(normalizeDoc), [rawDocs]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const needReview = documents.filter((d) => {
      if (!d.nextReviewDate) return false;
      const rev = new Date(d.nextReviewDate);
      const diffDays = (rev.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }).length;

    return {
      total: documents.length,
      inReview: documents.filter((d) => d.lifecycleStatus === "IN_REVIEW").length,
      published: documents.filter((d) => d.lifecycleStatus === "PUBLISHED" || d.lifecycleStatus === "SIGNED").length,
      draft: documents.filter((d) => d.lifecycleStatus === "DRAFT").length,
      needReview,
    };
  }, [documents]);

  // Filter
  const filtered = useMemo(() => {
    return documents.filter((d) => {
      // Tab filter
      if (activeTab === "mine") {
        if (d.ownerId !== user?.nik) return false;
      } else if (activeTab !== "all") {
        if (d.lifecycleStatus !== activeTab) return false;
      }
      // Department
      if (filterDept !== "all" && d.department !== filterDept) return false;
      // Category
      if (filterCategory !== "all" && d.category !== filterCategory) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!d.title.toLowerCase().includes(q) &&
            !d.documentCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [documents, activeTab, filterDept, filterCategory, search, user?.nik]);

  const uniqueDepts = useMemo(() => {
    return Array.from(new Set(documents.map((d) => d.department))).sort();
  }, [documents]);

  const formatDate = (s?: string | null) => {
    if (!s) return "—";
    try {
      return format(new Date(s), "dd MMM yyyy", { locale: localeId });
    } catch {
      return s;
    }
  };

  const tabs: Array<{ value: FilterTab; label: string; count?: number }> = [
    { value: "all", label: "Semua", count: documents.length },
    { value: "DRAFT", label: "Draft", count: stats.draft },
    { value: "IN_REVIEW", label: "Dalam Review", count: stats.inReview },
    { value: "PUBLISHED", label: "Diterbitkan", count: stats.published },
    { value: "OBSOLETE", label: "Obsolete" },
    { value: "mine", label: "Dokumen Saya" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dokumen K3</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola seluruh dokumen K3 dalam satu tempat</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Dokumen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={FileText} label="Total" value={stats.total} color="text-gray-700" />
        <StatCard icon={Clock} label="Dalam Review" value={stats.inReview} color="text-amber-600" />
        <StatCard icon={CheckCircle} label="Diterbitkan" value={stats.published} color="text-teal-600" />
        <StatCard icon={Edit} label="Draft" value={stats.draft} color="text-gray-500" />
        <StatCard icon={AlertCircle} label="Perlu Ditinjau" value={stats.needReview} color="text-red-600" />
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
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
              {t.count !== undefined && (
                <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari kode atau judul dokumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Dept</SelectItem>
            {uniqueDepts.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {documentCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Judul</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-left">Klausul SMKP</th>
                <th className="px-4 py-3 text-left">Dept</th>
                <th className="px-4 py-3 text-left">Retensi</th>
                <th className="px-4 py-3 text-left">Ver</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Review Date</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                  Tidak ada dokumen yang cocok dengan filter.
                </td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.documentCode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{d.title}</td>
                  <td className="px-4 py-3 text-gray-600">{d.category}</td>
                  <td className="px-4 py-3 text-gray-600">{d.smkpClause || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{d.department}</td>
                  <td className="px-4 py-3 text-gray-600">{retentionLabel(d.retentionPeriod)}</td>
                  <td className="px-4 py-3 text-gray-600">v{d.currentVersion}.{d.currentRevision ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[d.lifecycleStatus] || ""}>
                      {statusLabels[d.lifecycleStatus] || d.lifecycleStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.ownerName}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(d.nextReviewDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/documents/${d.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> Lihat dokumen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/documents/${d.id}?action=download`)}>
                          <Download className="w-4 h-4 mr-2" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/documents/${d.id}?action=upload-version`)}>
                          <Upload className="w-4 h-4 mr-2" /> Upload versi baru
                        </DropdownMenuItem>
                        {d.lifecycleStatus === "DRAFT" && (
                          <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/documents/${d.id}?action=submit`)}>
                            <Send className="w-4 h-4 mr-2" /> Ajukan Review
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/documents/${d.id}#versions`)}>
                          <FileCheck className="w-4 h-4 mr-2" /> Riwayat versi
                        </DropdownMenuItem>
                        {d.lifecycleStatus !== "OBSOLETE" && (
                          <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/documents/${d.id}?action=obsolete`)} className="text-red-600">
                            <FileX className="w-4 h-4 mr-2" /> Tandai Obsolete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links to companion pages */}
      <div className="grid md:grid-cols-2 gap-3 mt-6">
        <Link href="/workspace/hse/k3/documents/smkp-mapping">
          <a className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Mapping SMKP</div>
                <div className="text-xs text-gray-500">Cross-reference klausul SMKP ↔ prosedur K3</div>
              </div>
            </div>
          </a>
        </Link>
        <Link href="/workspace/hse/k3/documents/checklist">
          <a className="block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <UserIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Checklist Arsip Bulanan</div>
                <div className="text-xs text-gray-500">Monitoring kelengkapan rekaman wajib</div>
              </div>
            </div>
          </a>
        </Link>
      </div>

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number; color: string;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function retentionLabel(p?: string | null): string {
  if (!p) return "—";
  const map: Record<string, string> = {
    "1_tahun": "1 tahun",
    "3_tahun": "3 tahun",
    "5_tahun": "5 tahun",
    "10_tahun": "10 tahun",
    "permanent": "Permanen",
  };
  return map[p] || p;
}
