import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    FileText,
    Plus,
    Search,
    ArrowLeft,
    Eye,
    Edit,
    Trash2,
    Send,
    Share2,
    Filter,
    MoreVertical,
    CheckCircle,
    Clock,
    AlertCircle,
    FileCheck,
    FolderOpen,
    XCircle,
    User,
    Users,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@shared/rbac";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { documentCategories } from "@shared/schema";
import { PDFViewer } from "@/components/PDFViewer";

// Tab types
type TabType = "masterlist" | "control" | "inbox" | "distribution" | "external" | "records";

// Status badge colors
const statusColors: Record<string, string> = {
    "DRAFT": "bg-gray-100 text-gray-700 border-gray-300",
    "IN_REVIEW": "bg-amber-100 text-amber-700 border-amber-300",
    "APPROVED": "bg-blue-100 text-blue-700 border-blue-300",
    "ESIGN_PENDING": "bg-purple-100 text-purple-700 border-purple-300",
    "SIGNED": "bg-muted text-foreground border-border",
    "PUBLISHED": "bg-teal-100 text-teal-700 border-teal-300",
    "ARCHIVED": "bg-slate-100 text-slate-700 border-slate-300",
    "OBSOLETE": "bg-red-100 text-red-700 border-red-300",
};

const statusLabels: Record<string, string> = {
    "DRAFT": "Draft",
    "IN_REVIEW": "Dalam Review",
    "APPROVED": "Disetujui",
    "ESIGN_PENDING": "Menunggu Tanda Tangan",
    "SIGNED": "Ditandatangani",
    "PUBLISHED": "Diterbitkan",
    "ARCHIVED": "Diarsipkan",
    "OBSOLETE": "Usang",
};

// Department options
const departments = [
    "HSE",
    "Operation",
    "Plant",
    "HR",
    "Finance",
    "Procurement",
    "IT",
    "General",
];

export default function DocumentControlPage() {
    const { toast } = useToast();
    const { user, hasPermission } = useAuth();
    const [path, setLocation] = useLocation();

    // State
    const [activeTab, setActiveTab] = useState<TabType>("masterlist");

    // Sync tab with URL query parameter
    useEffect(() => {
        const syncTab = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get("tab") as TabType;
            const validTabs: TabType[] = ["masterlist", "control", "inbox", "distribution", "external", "records"];

            if (tab && validTabs.includes(tab)) {
                setActiveTab(tab);
            } else if (!tab && path === "/workspace/hse/k3/document-control") {
                setActiveTab("masterlist");
            }
        };

        syncTab();

        // Listen for browser navigation
        window.addEventListener('popstate', syncTab);

        // Also track wouter's pushState
        const originalPushState = history.pushState;
        history.pushState = function () {
            originalPushState.apply(this, arguments as any);
            syncTab();
        };

        return () => {
            window.removeEventListener('popstate', syncTab);
            history.pushState = originalPushState;
        };
    }, [path]);

    const handleTabChange = (tabId: TabType) => {
        setActiveTab(tabId);
        setLocation(`/workspace/hse/k3/document-control?tab=${tabId}`);
    };
    const canManage = hasPermission(Permission.MANAGE_DOCUMENTS);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterDepartment, setFilterDepartment] = useState<string>("all");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [controlFilter, setControlFilter] = useState<string>("all");

    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
    const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
    const [externalDialogOpen, setExternalDialogOpen] = useState(false);
    const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false);
    const [changeRequestDecisionDialogOpen, setChangeRequestDecisionDialogOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [selectedInboxItem, setSelectedInboxItem] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        documentCode: "",
        title: "",
        category: "",
        department: "",
        description: "",
        effectiveDate: "",
        nextReviewDate: "",
        currentRevision: "0",
    });

    // Change Request Form State
    const [changeRequestData, setChangeRequestData] = useState({
        reason: "",
        description: "",
        proposedChanges: "",
        priority: "NORMAL",
    });

    // Submit form state
    const [submitData, setSubmitData] = useState({
        approverSearch: "",
        selectedApprovers: [] as { id: string; name: string; position?: string }[],
        deadline: "",
    });

    // Decision form state
    const [decisionData, setDecisionData] = useState({
        decision: "" as "APPROVED" | "REJECTED" | "",
        comments: "",
    });

    // Fetch masterlist
    const { data: masterlist = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/document-masterlist"],
    });

    // Fetch employees for approver selection
    const { data: employeesResponse } = useQuery<{ data: any[], total: number }>({
        queryKey: ["/api/employees?per_page=1000"],
    });
    const employees = employeesResponse?.data || [];

    // Fetch approval inbox
    const { data: inbox = [], isLoading: inboxLoading } = useQuery<any[]>({
        queryKey: ["/api/approval-inbox", user?.nik],
        queryFn: async () => {
            if (!user?.nik) return [];
            try {
                const res = await fetch(`/api/approval-inbox?userId=${user.nik}`);
                if (!res.ok) {
                    console.error("Failed to fetch inbox");
                    return [];
                }
                const data = await res.json();
                return Array.isArray(data) ? data : [];
            } catch (error) {
                console.error("Inbox fetch error:", error);
                return [];
            }
        },
        enabled: !!user?.nik,
    });

    // Fetch my documents (distributed to me)
    const { data: myDocs = [], isLoading: myDocsLoading } = useQuery<any[]>({
        queryKey: ["/api/my-documents", user?.nik],
        queryFn: async () => {
            if (!user?.nik) return [];
            const res = await fetch(`/api/my-documents?userId=${user.nik}`);
            return res.json();
        },
        enabled: !!user?.nik,
    });

    // Fetch external documents
    const { data: externalDocs = [], isLoading: externalDocsLoading } = useQuery<any[]>({
        queryKey: ["/api/external-documents"],
    });

    // Record Control State
    const [recordSubTab, setRecordSubTab] = useState<"candidates" | "logs">("candidates");
    const [disposalConfirmDialogOpen, setDisposalConfirmDialogOpen] = useState(false);
    const [documentToDispose, setDocumentToDispose] = useState<any>(null);

    // Fetch Retention Candidates
    const { data: retentionCandidates = [], isLoading: retentionLoading } = useQuery<any[]>({
        queryKey: ["/api/documents/retention-candidates"],
        enabled: activeTab === "records"
    });

    // Fetch Disposal Logs
    const { data: disposalLogs = [], isLoading: logsLoading } = useQuery<any[]>({
        queryKey: ["/api/disposal-records"],
        enabled: activeTab === "records"
    });

    // Disposal Mutation
    const disposalMutation = useMutation({
        mutationFn: async (data: any) => {
            // 1. Create disposal record
            // 2. Ideally update masterlist status to DISPOSED?
            // Since I didn't add that logic in backend, I'll rely on the backend route or just creating the log.
            // The prompt implies "Log".
            return apiRequest("/api/disposal-records", "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/disposal-records"] });
            queryClient.invalidateQueries({ queryKey: ["/api/documents/retention-candidates"] });
            toast({ title: "Pemusnahan dokumen tercatat" });
            setDisposalConfirmDialogOpen(false);
            setDocumentToDispose(null);
        },
        onError: () => {
            toast({ title: "Gagal mencatat pemusnahan", variant: "destructive" });
        }
    });

    const handleDispose = () => {
        if (!documentToDispose) return;
        disposalMutation.mutate({
            documentId: documentToDispose.id,
            documentCode: documentToDispose.document_code,
            documentTitle: documentToDispose.title,
            disposedBy: user?.nik,
            disposedByName: user?.name,
            method: "ELECTRONIC_DELETION", // Default for now, maybe add selector in dialog
            reason: "Retention period expired",
            notes: `Automatically flagged for disposal. Retention period: ${documentToDispose.retention_period} years.`
        });
    };

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest("/api/document-masterlist", "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
            toast({ title: "Dokumen berhasil dibuat" });
            setCreateDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({
                title: "Gagal membuat dokumen",
                description: error?.message || "Silakan coba lagi",
                variant: "destructive"
            });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest(`/api/document-masterlist/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
            toast({ title: "Dokumen berhasil dihapus" });
            setDeleteDialogOpen(false);
            setSelectedDoc(null);
        },
        onError: () => {
            toast({ title: "Gagal menghapus dokumen", variant: "destructive" });
        }
    });

    // Submit for review mutation
    const submitMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest(`/api/document-masterlist/${selectedDoc?.id}/submit`, "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
            toast({ title: "Dokumen berhasil disubmit untuk review" });
            setSubmitDialogOpen(false);
            setSelectedDoc(null);
            setSubmitData({ approverSearch: "", selectedApprovers: [], deadline: "" });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal submit dokumen",
                description: error?.message || "Silakan coba lagi",
                variant: "destructive"
            });
        }
    });

    // Acknowledge document mutation
    const acknowledgeMutation = useMutation({
        mutationFn: async (distributionId: string) => {
            return apiRequest(`/api/distributions/${distributionId}/acknowledge`, "POST", {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/my-documents"] });
            toast({ title: "Dokumen berhasil ditandai sudah dibaca" });
        },
        onError: () => {
            toast({ title: "Gagal menandai dokumen", variant: "destructive" });
        }
    });

    // Decision mutation
    const decisionMutation = useMutation({
        mutationFn: async (data: any) => {
            const { documentId, ...rest } = data;
            return apiRequest(`/api/document-masterlist/${documentId}/approve`, "POST", rest);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/approval-inbox"] });
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
            toast({ title: decisionData.decision === "APPROVED" ? "Dokumen disetujui" : "Dokumen ditolak" });
            setDecisionDialogOpen(false);
            setSelectedInboxItem(null);
            setDecisionData({ decision: "", comments: "" });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal memproses keputusan",
                description: error?.message || "Internal server error",
                variant: "destructive"
            });
        }
    });

    // Change Request mutation
    const changeRequestMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest(`/api/document-masterlist/${selectedDoc?.id}/change-request`, "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
            toast({ title: "Change Request berhasil dibuat" });
            setChangeRequestDialogOpen(false);
            setChangeRequestData({ reason: "", description: "", proposedChanges: "", priority: "NORMAL" });
        },
        onError: () => {
            toast({ title: "Gagal membuat change request", variant: "destructive" });
        }
    });

    const handleChangeRequestSubmit = () => {
        if (!changeRequestData.reason) {
            toast({ title: "Alasan perubahan wajib diisi", variant: "destructive" });
            return;
        }

        changeRequestMutation.mutate({
            ...changeRequestData,
            requestedBy: user?.nik,
            requestedByName: user?.name,
        });
    };

    // Change Request Decision Mutation
    const changeRequestDecisionMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest(`/api/change-requests/${selectedInboxItem?.requestId}/status`, "PATCH", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/approval-inbox"] });
            toast({ title: decisionData.decision === "APPROVED" ? "Request Disetujui" : "Request Ditolak" });
            setChangeRequestDecisionDialogOpen(false);
            setSelectedInboxItem(null);
            setDecisionData({ decision: "", comments: "" });
        },
        onError: () => {
            toast({ title: "Gagal memproses request", variant: "destructive" });
        }
    });

    const handleChangeRequestDecision = () => {
        changeRequestDecisionMutation.mutate({
            status: decisionData.decision,
            reviewComments: decisionData.comments,
            reviewedBy: user?.nik,
            reviewedByName: user?.name,
            reviewedAt: new Date(),
        });
    };

    const resetForm = () => {
        setFormData({
            documentCode: "",
            title: "",
            category: "",
            department: "",
            description: "",
            effectiveDate: "",
            nextReviewDate: "",
            currentRevision: "0",
        });
    };

    const handleCreate = () => {
        if (!formData.documentCode || !formData.title || !formData.category || !formData.department) {
            toast({ title: "Lengkapi data yang wajib diisi", variant: "destructive" });
            return;
        }

        createMutation.mutate({
            ...formData,
            ownerId: user?.nik,
            ownerName: user?.name,
            createdBy: user?.nik,
        });
    };

    const handleSubmitForReview = () => {
        if (submitData.selectedApprovers.length === 0) {
            toast({ title: "Pilih minimal satu approver", variant: "destructive" });
            return;
        }

        submitMutation.mutate({
            approvers: submitData.selectedApprovers,
            deadline: submitData.deadline || null,
            initiatedBy: user?.nik,
            initiatedByName: user?.name,
        });
    };

    const handleDecision = () => {
        if (!decisionData.decision) {
            toast({ title: "Pilih keputusan", variant: "destructive" });
            return;
        }

        decisionMutation.mutate({
            documentId: selectedInboxItem?.documentId,
            approvalId: selectedInboxItem?.approvalId,
            stepNumber: selectedInboxItem?.stepNumber,
            userId: user?.nik,
            userName: user?.name,
            decision: decisionData.decision,
            notes: decisionData.comments,
        });
    };

    const addApprover = (emp: any) => {
        if (!submitData.selectedApprovers.find(a => a.id === emp.id)) {
            setSubmitData({
                ...submitData,
                selectedApprovers: [...submitData.selectedApprovers, { id: emp.id, name: emp.name, position: emp.position }],
                approverSearch: "",
            });
        }
    };

    const removeApprover = (id: string) => {
        setSubmitData({
            ...submitData,
            selectedApprovers: submitData.selectedApprovers.filter(a => a.id !== id),
        });
    };

    // Filter documents
    const filteredDocs = masterlist.filter((doc: any) => {
        const matchesSearch = !searchQuery ||
            doc.document_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "all" || doc.lifecycle_status === filterStatus;
        const matchesDept = filterDepartment === "all" || doc.department === filterDepartment;
        const matchesCat = filterCategory === "all" || doc.category === filterCategory;
        return matchesSearch && matchesStatus && matchesDept && matchesCat;
    });

    // Filter documents for Control tab
    const controlFilteredDocs = masterlist.filter((doc: any) => {
        if (controlFilter === "all") return true;
        if (controlFilter === "controlled") return doc.control_type === "CONTROLLED";
        if (controlFilter === "uncontrolled") return doc.control_type === "UNCONTROLLED";
        if (controlFilter === "review-soon") {
            if (!doc.next_review_date) return false;
            const reviewDate = new Date(doc.next_review_date);
            const diffDays = Math.ceil((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= 30;
        }
        if (controlFilter === "expire-soon") {
            if (!doc.expiry_date) return false;
            const expDate = new Date(doc.expiry_date);
            const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= 60;
        }
        return true;
    });

    // Filter employees for search
    const filteredEmployees = employees.filter((emp: any) =>
        emp.name?.toLowerCase().includes(submitData.approverSearch.toLowerCase()) &&
        !submitData.selectedApprovers.find(a => a.id === emp.id)
    ).slice(0, 5);

    // Tab content
    const tabs: { id: TabType; label: string; icon: any; badge?: number }[] = [
        { id: "masterlist", label: "Masterlist Dokumen", icon: FolderOpen },
        { id: "control", label: "Control Dashboard", icon: FileCheck },
        { id: "inbox", label: "Inbox Persetujuan", icon: Clock, badge: inbox.length || undefined },
        { id: "distribution", label: "Dokumen Saya", icon: Share2 },
        { id: "external", label: "Dokumen Eksternal", icon: FileText },
        { id: "records", label: "Record Control", icon: FileText },
    ];

    const getPageTitle = () => {
        const tab = tabs.find(t => t.id === activeTab);
        return tab ? tab.label : "Document Control";
    };

    const getPageDescription = () => {
        switch (activeTab) {
            case "masterlist": return "Daftar induk seluruh dokumen K3";
            case "control": return "Monitoring status dan masa berlaku dokumen";
            case "inbox": return "Daftar dokumen yang perlu persetujuan Anda";
            case "distribution": return "Dokumen yang didistribusikan kepada Anda";
            case "external": return "Daftar dokumen eksternal / regulasi";
            case "records": return "Manajemen masa retensi dan pemusnahan dokumen";
            default: return "Kelola dokumen K3";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
            {/* Dynamic Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setLocation("/workspace")}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getPageTitle()}</h1>
                                <p className="text-sm text-gray-500 mt-1">{getPageDescription()}</p>
                            </div>
                        </div>

                        {activeTab === "masterlist" && (
                            <Button
                                onClick={() => setCreateDialogOpen(true)}
                                className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Dokumen
                            </Button>
                        )}

                        {canManage && activeTab === "external" && (
                            <Button className="bg-red-600 hover:bg-red-700" onClick={() => setExternalDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Eksternal
                            </Button>
                        )}
                    </div>

                    {/* Search Bar - Only show on relevant tabs */}
                    {["masterlist", "distribution", "external"].includes(activeTab) && (
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Cari di ${getPageTitle()}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 border-none rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            {activeTab === "masterlist" && (
                <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px] h-9">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            {Object.entries(statusLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger className="w-[150px] h-9">
                            <SelectValue placeholder="Departemen" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Dept</SelectItem>
                            {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[180px] h-9">
                            <SelectValue placeholder="Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {documentCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Masterlist Tab */}
                {activeTab === "masterlist" && (
                    <>
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
                                <p className="text-gray-500 mt-3">Memuat dokumen...</p>
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">
                                    {searchQuery || filterStatus !== "all" || filterDepartment !== "all"
                                        ? "Tidak ada dokumen yang cocok"
                                        : "Belum ada dokumen dalam masterlist"}
                                </p>
                                {!searchQuery && (
                                    <Button
                                        onClick={() => setCreateDialogOpen(true)}
                                        className="mt-4 bg-red-600 hover:bg-red-700"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Tambah Dokumen Pertama
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Kode</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Judul</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Kategori</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Dept</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ver</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Owner</th>
                                            <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDocs.map((doc: any) => (
                                            <tr
                                                key={doc.id}
                                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                                onClick={() => setLocation(`/workspace/hse/k3/document/${doc.id}`)}
                                            >
                                                <td className="py-3 px-4 font-mono text-xs font-medium text-gray-900 dark:text-white">
                                                    {doc.document_code}
                                                </td>
                                                <td className="py-3 px-4 text-gray-900 dark:text-white max-w-[200px] truncate">
                                                    {doc.title}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                                                    {doc.category}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                    {doc.department}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                                    v{doc.current_version}.{doc.current_revision}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${statusColors[doc.lifecycle_status] || statusColors.DRAFT}`}
                                                    >
                                                        {statusLabels[doc.lifecycle_status] || doc.lifecycle_status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                                                    {doc.owner_name}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setLocation(`/workspace/hse/k3/document/${doc.id}`)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Lihat Detail
                                                            </DropdownMenuItem>
                                                            {doc.file_path && (
                                                                <PDFViewer
                                                                    pdfPath={doc.file_path}
                                                                    title={doc.title}
                                                                    watermark={(doc.control_type === "UNCONTROLLED" || doc.lifecycle_status !== "PUBLISHED") ? "UNCONTROLLED COPY" : undefined}
                                                                    trigger={
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                            <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                                                            Pratinjau PDF
                                                                        </DropdownMenuItem>
                                                                    }
                                                                />
                                                            )}
                                                            {doc.lifecycle_status === "DRAFT" && canManage && (
                                                                <>
                                                                    <DropdownMenuItem>
                                                                        <Edit className="w-4 h-4 mr-2" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setSelectedDoc(doc);
                                                                        setSubmitDialogOpen(true);
                                                                    }}>
                                                                        <Send className="w-4 h-4 mr-2" />
                                                                        Submit Review
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {doc.lifecycle_status === "APPROVED" && canManage && (
                                                                <DropdownMenuItem>
                                                                    <FileCheck className="w-4 h-4 mr-2" />
                                                                    Publish
                                                                </DropdownMenuItem>
                                                            )}
                                                            {doc.lifecycle_status === "PUBLISHED" && (
                                                                <>
                                                                    <DropdownMenuItem>
                                                                        <Share2 className="w-4 h-4 mr-2" />
                                                                        Distribute
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        setSelectedDoc(doc);
                                                                        setChangeRequestDialogOpen(true);
                                                                    }}>
                                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                                        Change Request
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}

                                                            {canManage && (
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => {
                                                                        setSelectedDoc(doc);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Hapus
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
                        )}
                    </>
                )}

                {/* Approval Inbox Tab */}
                {activeTab === "inbox" && (
                    <>
                        {inboxLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
                                <p className="text-gray-500 mt-3">Memuat inbox...</p>
                            </div>
                        ) : inbox.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">Tidak ada dokumen menunggu approval</p>
                                <p className="text-gray-400 text-sm mt-1">Semua dokumen sudah diproses</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {Array.isArray(inbox) && inbox.map((item: any) => (
                                    <div
                                        key={item.assignee_id || item.requestId}
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs font-medium text-gray-500">
                                                        {item.document_code}
                                                    </span>
                                                    {item.type === "CHANGE_REQUEST" ? (
                                                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                                            Change Request
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                                            Menunggu Review
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {item.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                                    <span>Dari: {item.submitted_by || item.sender_name}</span>
                                                    <span>Dept: {item.department}</span>
                                                    {item.deadline && !isNaN(new Date(item.deadline).getTime()) && (
                                                        <span className="text-orange-600">
                                                            Deadline: {format(new Date(item.deadline), "dd MMM yyyy", { locale: id })}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.type === "CHANGE_REQUEST" && (
                                                    <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100 dark:bg-gray-800 dark:border-gray-700 max-w-xl">
                                                        <div className="grid grid-cols-[80px_1fr] gap-1">
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">Priority:</span>
                                                            <span>{item.priority}</span>
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">Reason:</span>
                                                            <span>{item.reason}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 ml-4 self-center">
                                                {item.file_path && (
                                                    <PDFViewer
                                                        pdfPath={item.file_path}
                                                        title={item.title}
                                                        watermark="DRAFT REVIEW"
                                                        trigger={
                                                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                Lihat Draft
                                                            </Button>
                                                        }
                                                    />
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => {
                                                        setSelectedInboxItem(item);
                                                        setDecisionData({ decision: "REJECTED", comments: "" });
                                                        if (item.type === "CHANGE_REQUEST") {
                                                            setChangeRequestDecisionDialogOpen(true);
                                                        } else {
                                                            setDecisionDialogOpen(true);
                                                        }
                                                    }}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Tolak
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-primary hover:bg-primary/90"
                                                    onClick={() => {
                                                        setSelectedInboxItem(item);
                                                        setDecisionData({ decision: "APPROVED", comments: "" });
                                                        if (item.type === "CHANGE_REQUEST") {
                                                            setChangeRequestDecisionDialogOpen(true);
                                                        } else {
                                                            setDecisionDialogOpen(true);
                                                        }
                                                    }}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Setujui
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Distribution Tab - My Documents */}
                {activeTab === "distribution" && (
                    <>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dokumen Saya</h2>
                            <p className="text-sm text-gray-500">Dokumen yang dikirimkan kepada Anda</p>
                        </div>

                        {myDocsLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
                                <p className="text-gray-500 mt-3">Memuat dokumen...</p>
                            </div>
                        ) : myDocs.length === 0 ? (
                            <div className="text-center py-12">
                                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Tidak ada dokumen untuk Anda</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myDocs.map((doc: any) => (
                                    <div
                                        key={doc.distribution_id}
                                        className={`border rounded-lg p-4 transition-colors ${doc.acknowledged_at
                                            ? 'bg-muted border-border'
                                            : doc.is_mandatory
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs font-medium text-gray-500">
                                                        {doc.document_code}
                                                    </span>
                                                    {doc.acknowledged_at ? (
                                                        <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                                                            Sudah Baca
                                                        </Badge>
                                                    ) : doc.is_mandatory ? (
                                                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                                            Wajib Baca
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                                                            Belum Baca
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {doc.title}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                    <span>{doc.category}</span>
                                                    <span>{doc.department}</span>
                                                    {doc.deadline && !doc.acknowledged_at && (
                                                        <span className="text-orange-600">
                                                            Deadline: {format(new Date(doc.deadline), "dd MMM yyyy", { locale: id })}
                                                        </span>
                                                    )}
                                                    {doc.acknowledged_at && (
                                                        <span className="text-foreground">
                                                            Dibaca: {format(new Date(doc.acknowledged_at), "dd MMM yyyy HH:mm", { locale: id })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4 self-center">
                                                {doc.file_path && (
                                                    <PDFViewer
                                                        pdfPath={doc.file_path}
                                                        title={doc.title}
                                                        trigger={
                                                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                                                <FileText className="w-4 h-4 mr-1" />
                                                                Baca Dokumen
                                                            </Button>
                                                        }
                                                    />
                                                )}
                                                {!doc.acknowledged_at && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-primary hover:bg-primary/90"
                                                        onClick={() => acknowledgeMutation.mutate(doc.distribution_id)}
                                                        disabled={acknowledgeMutation.isPending}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Tandai Sudah Baca
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* External Documents Tab */}
                {activeTab === "external" && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white hidden">External Documents</h2>
                            </div>
                        </div>

                        {externalDocsLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
                            </div>
                        ) : externalDocs.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Belum ada dokumen eksternal</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50">
                                            <th className="text-left py-2 px-3">Kode</th>
                                            <th className="text-left py-2 px-3">Judul</th>
                                            <th className="text-left py-2 px-3">Sumber</th>
                                            <th className="text-left py-2 px-3">Versi</th>
                                            <th className="text-left py-2 px-3">Status</th>
                                            <th className="text-left py-2 px-3">Review</th>
                                            <th className="text-right py-2 px-3">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {externalDocs.map((doc: any) => (
                                            <tr key={doc.id} className="border-b hover:bg-muted cursor-pointer" onClick={() => doc.file_url && window.open(doc.file_url, '_blank')}>
                                                <td className="py-2 px-3 font-mono text-xs">{doc.document_code}</td>
                                                <td className="py-2 px-3">{doc.title}</td>
                                                <td className="py-2 px-3 text-gray-500">{doc.source}</td>
                                                <td className="py-2 px-3">{doc.version_number || "-"}</td>
                                                <td className="py-2 px-3">
                                                    <Badge variant="outline" className={
                                                        doc.status === "ACTIVE" ? "bg-muted text-foreground" :
                                                            "bg-gray-100 text-gray-700"
                                                    }>
                                                        {doc.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-3 text-gray-500 text-xs">
                                                    {doc.next_review_date || "-"}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                    {doc.file_url && (
                                                        <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                                <Eye className="w-4 h-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* Document Control Tab */}
                {activeTab === "control" && (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Document Control</h2>
                                <p className="text-sm text-gray-500">Kelola status kontrol dan monitor dokumen</p>
                            </div>
                        </div>

                        {/* Control Filters */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Button
                                size="sm"
                                variant={controlFilter === "all" ? "default" : "outline"}
                                onClick={() => setControlFilter("all")}
                                className={controlFilter === "all" ? "bg-red-600" : ""}
                            >
                                Semua
                            </Button>
                            <Button
                                size="sm"
                                variant={controlFilter === "controlled" ? "default" : "outline"}
                                onClick={() => setControlFilter("controlled")}
                                className={controlFilter === "controlled" ? "bg-blue-600" : ""}
                            >
                                Controlled
                            </Button>
                            <Button
                                size="sm"
                                variant={controlFilter === "uncontrolled" ? "default" : "outline"}
                                onClick={() => setControlFilter("uncontrolled")}
                                className={controlFilter === "uncontrolled" ? "bg-orange-600" : ""}
                            >
                                Uncontrolled
                            </Button>
                            <Button
                                size="sm"
                                variant={controlFilter === "review-soon" ? "default" : "outline"}
                                onClick={() => setControlFilter("review-soon")}
                                className={controlFilter === "review-soon" ? "bg-amber-600" : ""}
                            >
                                Akan Review (H-30)
                            </Button>
                            <Button
                                size="sm"
                                variant={controlFilter === "expire-soon" ? "default" : "outline"}
                                onClick={() => setControlFilter("expire-soon")}
                                className={controlFilter === "expire-soon" ? "bg-red-600" : ""}
                            >
                                Akan Expire
                            </Button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xl font-bold text-blue-600">
                                    {masterlist.filter((d: any) => d.control_type === "CONTROLLED").length}
                                </p>
                                <p className="text-xs text-gray-500">Controlled</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                <p className="text-xl font-bold text-orange-600">
                                    {masterlist.filter((d: any) => d.control_type === "UNCONTROLLED").length}
                                </p>
                                <p className="text-xs text-gray-500">Uncontrolled</p>
                            </div>
                            <div className="bg-muted rounded-lg p-3 border border-border">
                                <p className="text-xl font-bold text-foreground">
                                    {masterlist.filter((d: any) => d.lifecycle_status === "PUBLISHED").length}
                                </p>
                                <p className="text-xs text-gray-500">Published</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                <p className="text-xl font-bold text-amber-600">
                                    {masterlist.filter((d: any) => {
                                        if (!d.next_review_date) return false;
                                        const reviewDate = new Date(d.next_review_date);
                                        const diffDays = Math.ceil((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                        return diffDays > 0 && diffDays <= 30;
                                    }).length}
                                </p>
                                <p className="text-xs text-gray-500">Review Soon</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <p className="text-xl font-bold text-red-600">
                                    {masterlist.filter((d: any) => {
                                        if (!d.expiry_date) return false;
                                        const expDate = new Date(d.expiry_date);
                                        return expDate < new Date();
                                    }).length}
                                </p>
                                <p className="text-xs text-gray-500">Expired</p>
                            </div>
                        </div>

                        {/* Document Control Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left py-2 px-3">Kode</th>
                                        <th className="text-left py-2 px-3">Judul</th>
                                        <th className="text-left py-2 px-3">Control</th>
                                        <th className="text-left py-2 px-3">Status</th>
                                        <th className="text-left py-2 px-3">Next Review</th>
                                        <th className="text-left py-2 px-3">Expire</th>
                                        <th className="text-right py-2 px-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {controlFilteredDocs.map((doc: any) => (
                                        <tr key={doc.id} className="border-b hover:bg-muted cursor-pointer" onClick={() => setLocation(`/workspace/hse/k3/document/${doc.id}`)}>
                                            <td className="py-2 px-3 font-mono text-xs">{doc.document_code}</td>
                                            <td className="py-2 px-3">{doc.title}</td>
                                            <td className="py-2 px-3">
                                                <Badge variant="outline" className={
                                                    doc.control_type === "CONTROLLED"
                                                        ? "bg-blue-100 text-blue-700 border-blue-300"
                                                        : "bg-orange-100 text-orange-700 border-orange-300"
                                                }>
                                                    {doc.control_type}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-3">
                                                <Badge variant="outline" className={statusColors[doc.lifecycle_status]}>
                                                    {statusLabels[doc.lifecycle_status]}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-3 text-gray-500 text-xs">
                                                {doc.next_review_date || "-"}
                                            </td>
                                            <td className="py-2 px-3 text-gray-500 text-xs">
                                                {doc.expiry_date || "-"}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {doc.file_path && (
                                                        <PDFViewer
                                                            pdfPath={doc.file_path}
                                                            title={doc.title}
                                                            trigger={
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 p-0 text-blue-500" onClick={(e) => e.stopPropagation()}>
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                            }
                                                        />
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setLocation(`/workspace/hse/k3/document/${doc.id}`)}
                                                    >
                                                        <ArrowLeft className="w-4 h-4 rotate-180" onClick={(e) => e.stopPropagation()} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Records Tab */}
                {activeTab === "records" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Record Control</h2>
                                <p className="text-sm text-gray-500">Kelola masa retensi dan pemusnahan dokumen</p>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${recordSubTab === "candidates" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    onClick={() => setRecordSubTab("candidates")}
                                >
                                    Jadwal Retensi
                                </button>
                                <button
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${recordSubTab === "logs" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    onClick={() => setRecordSubTab("logs")}
                                >
                                    Log Pemusnahan
                                </button>
                            </div>
                        </div>

                        {recordSubTab === "candidates" ? (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                {retentionLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                                        <p className="mt-2 text-sm text-gray-500">Memuat data retensi...</p>
                                    </div>
                                ) : retentionCandidates.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="font-medium text-gray-900 dark:text-white">Semua Aman</p>
                                        <p className="text-sm text-gray-500">Belum ada dokumen yang memasuki masa retensi</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-medium">
                                                <tr>
                                                    <th className="py-3 px-4">Dokumen</th>
                                                    <th className="py-3 px-4">Tgl. Terbit</th>
                                                    <th className="py-3 px-4">Masa Retensi</th>
                                                    <th className="py-3 px-4">Jatuh Tempo</th>
                                                    <th className="py-3 px-4 text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {retentionCandidates.map((doc: any) => (
                                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setLocation(`/workspace/hse/k3/document/${doc.id}`)}>
                                                        <td className="py-3 px-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{doc.title}</div>
                                                            <div className="text-xs text-gray-500">{doc.document_code}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500">
                                                            {format(new Date(doc.publish_date), "dd MMM yyyy", { locale: id })}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {doc.retention_period} Tahun
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="text-red-600 font-medium bg-red-50 px-2 py-1 rounded text-xs">
                                                                {format(new Date(doc.retentionDate), "dd MMM yyyy", { locale: id })}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDocumentToDispose(doc);
                                                                    setDisposalConfirmDialogOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-1" />
                                                                Musnahkan
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                {logsLoading ? (
                                    <div className="p-8 text-center text-sm text-gray-500">Memuat log...</div>
                                ) : disposalLogs.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <p>Belum ada riwayat pemusnahan dokumen</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-medium">
                                                <tr>
                                                    <th className="py-3 px-4">Dokumen</th>
                                                    <th className="py-3 px-4">Dimusnahkan Oleh</th>
                                                    <th className="py-3 px-4">Tanggal</th>
                                                    <th className="py-3 px-4">Metode</th>
                                                    <th className="py-3 px-4">Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {disposalLogs.map((log: any) => (
                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <td className="py-3 px-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{log.documentTitle}</div>
                                                            <div className="text-xs text-gray-500">{log.documentCode}</div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-gray-900 dark:text-white">{log.disposedByName}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500">
                                                            {format(new Date(log.disposedAt), "dd MMM yyyy HH:mm", { locale: id })}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <Badge variant="outline">{log.method.replace(/_/g, " ")}</Badge>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500 italic">
                                                            {log.notes || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Document Dialog - Moved outside of tab conditionals */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-red-500" />
                            Tambah Dokumen Baru
                        </DialogTitle>
                        <DialogDescription>
                            Buat dokumen baru di masterlist. Isi data wajib (*) untuk melanjutkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="documentCode">Kode Dokumen *</Label>
                                <Input
                                    id="documentCode"
                                    placeholder="HSE-SOP-001"
                                    value={formData.documentCode}
                                    onChange={(e) => setFormData({ ...formData, documentCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Departemen *</Label>
                                <Select
                                    value={formData.department}
                                    onValueChange={(v) => setFormData({ ...formData, department: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih departemen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Judul Dokumen *</Label>
                            <Input
                                id="title"
                                placeholder="Prosedur Penanganan Keadaan Darurat"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v) => setFormData({ ...formData, category: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {documentCategories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea
                                id="description"
                                placeholder="Deskripsi singkat tentang dokumen ini..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="effectiveDate">Tanggal Berlaku</Label>
                                <Input
                                    id="effectiveDate"
                                    type="date"
                                    value={formData.effectiveDate}
                                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nextReviewDate">Tanggal Review Berikutnya</Label>
                                <Input
                                    id="nextReviewDate"
                                    type="date"
                                    onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="revision">Nomor Revisi</Label>
                            <Select
                                value={formData.currentRevision}
                                onValueChange={(v) => setFormData({ ...formData, currentRevision: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Revisi" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 11 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString()}>
                                            {i === 0 ? "Baru Dibuat (R00)" : `R${i.toString().padStart(2, '0')}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={createMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Submit for Review Dialog */}
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-500" />
                            Submit untuk Review
                        </DialogTitle>
                        <DialogDescription>
                            Pilih approver untuk mereview dokumen "{selectedDoc?.title}"
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cari Approver</Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Ketik nama karyawan..."
                                    value={submitData.approverSearch}
                                    onChange={(e) => setSubmitData({ ...submitData, approverSearch: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                            {submitData.approverSearch && filteredEmployees.length > 0 && (
                                <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                                    {filteredEmployees.map((emp: any) => (
                                        <button
                                            key={emp.id}
                                            onClick={() => addApprover(emp)}
                                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm flex items-center gap-2"
                                        >
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span>{emp.name}</span>
                                            <span className="text-gray-400 text-xs">- {emp.position || emp.department}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {submitData.selectedApprovers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Approver Terpilih ({submitData.selectedApprovers.length})</Label>
                                <div className="flex flex-wrap gap-2">
                                    {submitData.selectedApprovers.map((approver) => (
                                        <Badge
                                            key={approver.id}
                                            variant="outline"
                                            className="flex items-center gap-1 py-1"
                                        >
                                            {approver.name}
                                            <button
                                                onClick={() => removeApprover(approver.id)}
                                                className="ml-1 hover:text-red-500"
                                            >
                                                <XCircle className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline (Opsional)</Label>
                            <Input
                                id="deadline"
                                type="date"
                                value={submitData.deadline}
                                onChange={(e) => setSubmitData({ ...submitData, deadline: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmitForReview}
                            disabled={submitMutation.isPending || submitData.selectedApprovers.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {submitMutation.isPending ? "Mengirim..." : "Submit Review"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Decision Dialog */}
            <Dialog open={decisionDialogOpen} onOpenChange={setDecisionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {decisionData.decision === "APPROVED" ? (
                                <CheckCircle className="w-5 h-5 text-foreground" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            {decisionData.decision === "APPROVED" ? "Setujui Dokumen" : "Tolak Dokumen"}
                        </DialogTitle>
                        <DialogDescription>
                            {decisionData.decision === "APPROVED"
                                ? `Anda akan menyetujui dokumen "${selectedInboxItem?.title}"`
                                : `Anda akan menolak dokumen "${selectedInboxItem?.title}"`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="comments">Komentar {decisionData.decision === "REJECTED" && "*"}</Label>
                            <Textarea
                                id="comments"
                                placeholder={decisionData.decision === "REJECTED"
                                    ? "Jelaskan alasan penolakan..."
                                    : "Tambahkan komentar (opsional)..."}
                                value={decisionData.comments}
                                onChange={(e) => setDecisionData({ ...decisionData, comments: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDecisionDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleDecision}
                            disabled={decisionMutation.isPending || (decisionData.decision === "REJECTED" && !decisionData.comments)}
                            className={decisionData.decision === "APPROVED"
                                ? "bg-primary hover:bg-primary/90"
                                : "bg-red-600 hover:bg-red-700"}
                        >
                            {decisionMutation.isPending
                                ? "Memproses..."
                                : decisionData.decision === "APPROVED"
                                    ? "Setujui"
                                    : "Tolak"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change Request Decision Dialog */}
            <Dialog open={changeRequestDecisionDialogOpen} onOpenChange={setChangeRequestDecisionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {decisionData.decision === "APPROVED" ? (
                                <CheckCircle className="w-5 h-5 text-foreground" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            {decisionData.decision === "APPROVED" ? "Setujui Change Request" : "Tolak Change Request"}
                        </DialogTitle>
                        <DialogDescription>
                            {decisionData.decision === "APPROVED"
                                ? `Anda akan menyetujui request revisi untuk "${selectedInboxItem?.title}"`
                                : `Anda akan menolak request revisi untuk "${selectedInboxItem?.title}"`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cr-comments">Komentar {decisionData.decision === "REJECTED" && "*"}</Label>
                            <Textarea
                                id="cr-comments"
                                placeholder={decisionData.decision === "REJECTED"
                                    ? "Jelaskan alasan penolakan..."
                                    : "Tambahkan komentar (opsional)..."}
                                value={decisionData.comments}
                                onChange={(e) => setDecisionData({ ...decisionData, comments: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChangeRequestDecisionDialogOpen(false)}>Batal</Button>
                        <Button
                            onClick={handleChangeRequestDecision}
                            disabled={changeRequestDecisionMutation.isPending || (decisionData.decision === "REJECTED" && !decisionData.comments)}
                            className={decisionData.decision === "APPROVED" ? "bg-primary hover:bg-primary/90" : "bg-red-600 hover:bg-red-700"}
                        >
                            {changeRequestDecisionMutation.isPending ? "Memproses..." : decisionData.decision === "APPROVED" ? "Setujui" : "Tolak"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change Request Dialog */}
            <Dialog open={changeRequestDialogOpen} onOpenChange={setChangeRequestDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                            Buat Change Request
                        </DialogTitle>
                        <DialogDescription>
                            Ajukan perubahan untuk dokumen "{selectedDoc?.title}". Dokumen published akan tetap aktif sampai revisi disetujui.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="req-reason">Alasan Perubahan *</Label>
                            <Input
                                id="req-reason"
                                placeholder="Contoh: Update regulasi, penambahan prosedur..."
                                value={changeRequestData.reason}
                                onChange={(e) => setChangeRequestData({ ...changeRequestData, reason: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="req-desc">Deskripsi & Bagian Terdampak</Label>
                            <Textarea
                                id="req-desc"
                                placeholder="Jelaskan detail perubahan yang diinginkan..."
                                value={changeRequestData.description}
                                onChange={(e) => setChangeRequestData({ ...changeRequestData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="req-priority">Prioritas</Label>
                            <Select
                                value={changeRequestData.priority}
                                onValueChange={(val) => setChangeRequestData({ ...changeRequestData, priority: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low (Minor)</SelectItem>
                                    <SelectItem value="NORMAL">Normal</SelectItem>
                                    <SelectItem value="HIGH">High (Major)</SelectItem>
                                    <SelectItem value="URGENT">Urgent (Critical)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChangeRequestDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleChangeRequestSubmit}
                            disabled={changeRequestMutation.isPending || !changeRequestData.reason}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {changeRequestMutation.isPending ? "Mengajukan..." : "Ajukan Revisi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Dokumen?</DialogTitle>
                        <DialogDescription>
                            Dokumen "{selectedDoc?.title}" akan dihapus permanen beserta semua versi dan riwayatnya. Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedDoc && deleteMutation.mutate(selectedDoc.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disposal Confirmation Dialog */}
            <AlertDialog open={disposalConfirmDialogOpen} onOpenChange={setDisposalConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Pemusnahan Dokumen</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda akan memusnahkan dokumen <b>{documentToDispose?.title}</b> ({documentToDispose?.document_code}).
                            <br /><br />
                            Tindakan ini akan mencatat log pemusnahan resmi. Pastikan dokumen fisik (jika ada) juga dimusnahkan sesuai prosedur.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDispose} className="bg-red-600 hover:bg-red-700">
                            Ya, Musnahkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
