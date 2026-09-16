import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import {
    ArrowLeft,
    FileText,
    Eye,
    History,
    CheckCircle,
    Share2,
    ClipboardList,
    Download,
    Printer,
    Upload,
    Send,
    XCircle,
    User,
    Users,
    Calendar,
    Building,
    Clock,
    AlertTriangle
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@shared/rbac";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { PDFViewer } from "@/components/PDFViewer";

// Status colors
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

type DetailTab = "preview" | "versions" | "approval" | "distribution" | "audit";

export default function DocumentDetailPage() {
    const { toast } = useToast();
    const { user, hasPermission } = useAuth();
    const [, setLocation] = useLocation();
    const [, params] = useRoute("/workspace/hse/k3/document/:id");
    const documentId = params?.id;
    const canManage = hasPermission(Permission.MANAGE_DOCUMENTS);

    const [activeTab, setActiveTab] = useState<DetailTab>("preview");
    const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
    const [distributeData, setDistributeData] = useState({
        recipientSearch: "",
        selectedRecipients: [] as { id: string; name: string; department?: string }[],
        deadline: "",
        isMandatory: true,
    });

    // Approval Dialog State
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [approvalAction, setApprovalAction] = useState<"APPROVED" | "REJECTED" | null>(null);
    const [approvalNote, setApprovalNote] = useState("");
    const [currentStepId, setCurrentStepId] = useState<string | null>(null); // To store which step is being approved
    const [currentStepNumber, setCurrentStepNumber] = useState<number | null>(null);
    const [currentApprovalId, setCurrentApprovalId] = useState<string | null>(null);

    // Fetch document details
    const { data: docData, isLoading } = useQuery<any>({
        queryKey: ["/api/document-masterlist", documentId],
        queryFn: async () => {
            const res = await fetch(`/api/document-masterlist/${documentId}`);
            return res.json();
        },
        enabled: !!documentId,
    });

    const document = docData?.document;
    const versions = docData?.versions || [];

    // Fetch employees for distribution
    const { data: employeesResponse } = useQuery<any>({
        queryKey: ["/api/employees"],
    });
    const employees = Array.isArray(employeesResponse?.data) ? employeesResponse.data : [];

    // Fetch distributions
    const { data: distributionsResponse } = useQuery<any>({
        queryKey: ["/api/document-masterlist", documentId, "distributions"],
        queryFn: async () => {
            const res = await fetch(`/api/document-masterlist/${documentId}/distributions`);
            return res.json();
        },
        enabled: !!documentId,
    });
    const distributions = Array.isArray(distributionsResponse) ? distributionsResponse : [];

    // Fetch approvals
    const { data: approvalsResponse } = useQuery<any>({
        queryKey: ["/api/document-masterlist", documentId, "approvals"],
        queryFn: async () => {
            const res = await fetch(`/api/document-masterlist/${documentId}/approvals`);
            return res.json();
        },
        enabled: !!documentId,
    });
    const approvals = Array.isArray(approvalsResponse) ? approvalsResponse : [];

    // Publish mutation
    const publishMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(`/api/document-masterlist/${documentId}/publish`, "POST", {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist"] });
            toast({ title: "Dokumen berhasil dipublish" });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal publish dokumen",
                description: error?.message,
                variant: "destructive"
            });
        }
    });

    // Upload Version Mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('uploadedBy', user?.nik || '');
            formData.append('uploadedByName', user?.name || '');

            const res = await fetch(`/api/document-masterlist/${documentId}/versions`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Upload failed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist", documentId] });
            toast({ title: "Versi baru berhasil diupload" });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal upload versi baru",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    // Distribute mutation
    const distributeMutation = useMutation({
        mutationFn: async (data: any) => {
            return apiRequest(`/api/document-masterlist/${documentId}/distribute`, "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist", documentId, "distributions"] });
            toast({ title: "Dokumen berhasil didistribusikan" });
            setDistributeDialogOpen(false);
            setDistributeData({ recipientSearch: "", selectedRecipients: [], deadline: "", isMandatory: true });
        },
        onError: () => {
            toast({ title: "Gagal distribusi dokumen", variant: "destructive" });
        }
    });

    const handleDistribute = () => {
        if (distributeData.selectedRecipients.length === 0) {
            toast({ title: "Pilih minimal satu penerima", variant: "destructive" });
            return;
        }
        distributeMutation.mutate({
            recipients: distributeData.selectedRecipients,
            deadline: distributeData.deadline || null,
            isMandatory: distributeData.isMandatory,
            distributedBy: user?.nik,
        });
    };

    // Submit Mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            // Hardcoded for demo: Version ID is needed. 
            // In real app, we might select which version. 
            // Here we assume the latest version is the one to submit.
            const latestVersion = versions[0];
            if (!latestVersion) throw new Error("Belum ada versi dokumen yang diupload");

            return apiRequest(`/api/document-masterlist/${documentId}/submit`, "POST", {
                versionId: latestVersion.id,
                userId: user?.nik,
                userName: user?.name
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist", documentId] });
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist", documentId, "approvals"] });
            toast({ title: "Dokumen berhasil disubmit untuk review" });
            setSubmitDialogOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Gagal submit", description: error.message, variant: "destructive" });
        }
    });

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: async () => {
            return apiRequest(`/api/document-masterlist/${documentId}/approve`, "POST", {
                approvalId: currentApprovalId,
                stepNumber: currentStepNumber,
                userId: user?.nik,
                userName: user?.name,
                decision: approvalAction,
                notes: approvalNote
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist", documentId] });
            queryClient.invalidateQueries({ queryKey: ["/api/document-masterlist", documentId, "approvals"] });
            toast({ title: approvalAction === "APPROVED" ? "Approval berhasil" : "Dokumen ditolak" });
            setApproveDialogOpen(false);
            setApprovalAction(null);
            setApprovalNote("");
        },
        onError: (error: any) => {
            toast({ title: "Gagal memproses approval", description: error.message, variant: "destructive" });
        }
    });

    const handleApprovalClick = (approvalId: string, stepNumber: number, action: "APPROVED" | "REJECTED") => {
        setCurrentApprovalId(approvalId);
        setCurrentStepNumber(stepNumber);
        setApprovalAction(action);
        setApproveDialogOpen(true);
    };

    const addRecipient = (emp: any) => {
        if (!distributeData.selectedRecipients.find(r => r.id === emp.id)) {
            setDistributeData({
                ...distributeData,
                selectedRecipients: [...distributeData.selectedRecipients, {
                    id: emp.id,
                    name: emp.name,
                    department: emp.department
                }],
                recipientSearch: "",
            });
        }
    };

    const removeRecipient = (id: string) => {
        setDistributeData({
            ...distributeData,
            selectedRecipients: distributeData.selectedRecipients.filter(r => r.id !== id),
        });
    };

    const filteredEmployees = (Array.isArray(employees) ? employees : []).filter((emp: any) =>
        emp.name?.toLowerCase().includes(distributeData.recipientSearch.toLowerCase()) &&
        !distributeData.selectedRecipients.find(r => r.id === emp.id)
    ).slice(0, 5);

    const tabs: { id: DetailTab; label: string; icon: any }[] = [
        { id: "preview", label: "Preview", icon: Eye },
        { id: "versions", label: "Versions", icon: History },
        { id: "approval", label: "Approval", icon: CheckCircle },
        { id: "distribution", label: "Distribution", icon: Share2 },
        { id: "audit", label: "Audit Trail", icon: ClipboardList },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Dokumen tidak ditemukan</p>
                <Button variant="outline" className="mt-4" onClick={() => setLocation("/workspace/hse/k3/document-control")}>
                    Kembali
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            {/* Red Header */}
            <div className="bg-red-600 text-white">
                <div className="flex items-center gap-3 p-4">
                    <button
                        onClick={() => setLocation("/workspace/hse/k3/document-control")}
                        className="p-1 hover:bg-red-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Detail Dokumen</h1>
                </div>
            </div>

            {/* Document Identity Card */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm font-bold text-gray-600">
                                {document.document_code}
                            </span>
                            <Badge variant="outline" className={statusColors[document.lifecycle_status]}>
                                {statusLabels[document.lifecycle_status]}
                            </Badge>
                            {document.control_type === "UNCONTROLLED" && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                    Uncontrolled
                                </Badge>
                            )}
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {document.title}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                {document.department}
                            </span>
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {document.owner_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                v{document.current_version}.{document.current_revision}
                            </span>
                            {document.effective_date && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Berlaku: {(() => {
                                        try {
                                            const d = new Date(document.effective_date);
                                            return isNaN(d.getTime()) ? document.effective_date : format(d, "dd MMM yyyy", { locale: idLocale });
                                        } catch (e) {
                                            return document.effective_date;
                                        }
                                    })()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {document.lifecycle_status === "APPROVED" && canManage && (
                            <Button
                                onClick={() => publishMutation.mutate()}
                                disabled={publishMutation.isPending}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {publishMutation.isPending ? "Publishing..." : "Publish"}
                            </Button>
                        )}
                        {document.lifecycle_status === "APPROVED" && canManage && (
                            <div className="relative inline-block">
                                <input
                                    type="file"
                                    id="signed-upload"
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                />
                                <Button
                                    className="bg-purple-600 hover:bg-purple-700 text-white ml-2"
                                    onClick={() => window.document.getElementById('signed-upload')?.click()}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Signed Copy
                                </Button>
                            </div>
                        )}
                        {document.lifecycle_status === "PUBLISHED" && canManage && (
                            <Button
                                onClick={() => setDistributeDialogOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Distribute
                            </Button>
                        )}
                        {document.lifecycle_status === "DRAFT" && canManage && (
                            <Button
                                onClick={() => setSubmitDialogOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Submit Approval
                            </Button>
                        )}
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                        </Button>
                        <Button variant="outline" size="sm">
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? "border-red-500 text-red-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {/* Preview Tab */}
                {activeTab === "preview" && (
                    <div className="h-[70vh] flex flex-col">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                            <div className="flex items-center gap-2 justify-center text-xs text-amber-700">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span>Preview ini dilengkapi watermark otomatis sebagai <strong>PENGENDALIAN DOKUMEN</strong>.</span>
                            </div>
                        </div>
                        {versions.length > 0 ? (
                            <div className="flex-1 w-full min-h-0 bg-gray-50 rounded-lg shadow-inner overflow-hidden border">
                                <PDFViewer
                                    pdfPath={versions[0].file_path}
                                    title={document.title}
                                    watermark={
                                        (document.control_type === "UNCONTROLLED" || document.lifecycle_status !== "PUBLISHED")
                                            ? "UNCONTROLLED COPY"
                                            : undefined
                                    }
                                    inline={true}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-12 bg-gray-50">
                                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">Belum ada file yang diupload</p>
                                <p className="text-gray-400 text-sm mt-1">Gunakan tab "Versions" untuk mengupload file pertama.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setActiveTab("versions")}
                                >
                                    Pindah ke Tab Versions
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Versions Tab */}
                {activeTab === "versions" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Riwayat Versi</h3>
                            {document.lifecycle_status === "DRAFT" && canManage && (
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="version-upload"
                                        className="hidden"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                    />
                                    <Button
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => window.document.getElementById('version-upload')?.click()}
                                        disabled={uploadMutation.isPending}
                                    >
                                        <Upload className="w-4 h-4 mr-1" />
                                        {uploadMutation.isPending ? "Mengupload..." : "Upload Versi Baru"}
                                    </Button>
                                </div>
                            )}
                        </div>
                        {versions.length === 0 ? (
                            <div className="text-center py-8">
                                <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500">Belum ada versi file</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {versions.map((v: any, i: number) => (
                                    <div key={v.id} className="border rounded-lg p-3 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">v{v.version_number}.{v.revision_number}</span>
                                                {i === 0 && <Badge className="bg-muted text-foreground">Current</Badge>}
                                            </div>
                                            <p className="text-sm text-gray-500">{v.file_name}</p>
                                            <p className="text-xs text-gray-400">
                                                {v.uploaded_by_name} • {(() => {
                                                    try {
                                                        const d = new Date(v.uploaded_at);
                                                        return isNaN(d.getTime()) ? "" : format(d, "dd MMM yyyy HH:mm", { locale: idLocale });
                                                    } catch (e) { return ""; }
                                                })()}
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}



                {/* Approval Tab (Enhanced Stepper) */}
                {
                    activeTab === "approval" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Workflow Approval</h3>
                                {approvals.length > 0 && approvals[0].status === "PENDING" && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
                                        In Progress
                                    </Badge>
                                )}
                            </div>

                            {approvals.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Belum ada proses approval</p>
                                    {document.lifecycle_status === "DRAFT" && canManage && (
                                        <Button variant="outline" className="mt-4" onClick={() => setSubmitDialogOpen(true)}>
                                            Mulai Approval
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {approvals.map((approval: any) => (
                                        <div key={approval.id} className="border rounded-xl p-6 bg-white shadow-sm">
                                            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                                                <div className="p-2 bg-blue-50 rounded-lg">
                                                    <ClipboardList className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{approval.workflow_name || "Standard Approval"}</h4>
                                                    <p className="text-xs text-gray-500">
                                                        Started by {approval.initiated_by_name} on {format(new Date(approval.initiated_at), "dd MMM yyyy HH:mm")}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Stepper Visualization */}
                                            <div className="relative">
                                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 -z-10" />
                                                <div className="space-y-8">
                                                    {approval.steps?.map((step: any, index: number) => {
                                                        const isCurrent = step.status === "PENDING" && approval.status !== "REJECTED";
                                                        const isCompleted = step.status === "COMPLETED";
                                                        const isRejected = step.status === "REJECTED";

                                                        return (
                                                            <div key={step.id} className="relative flex items-start gap-4">
                                                                <div className={`
                                                                w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 bg-white
                                                                ${isCompleted ? "border-border text-foreground" :
                                                                        isRejected ? "border-red-500 text-red-500" :
                                                                            isCurrent ? "border-blue-500 text-blue-500 animate-ring" : "border-gray-300 text-gray-300"}
                                                            `}>
                                                                    {isCompleted ? <CheckCircle className="w-5 h-5" /> :
                                                                        isRejected ? <XCircle className="w-5 h-5" /> :
                                                                            <span className="text-sm font-bold">{index + 1}</span>}
                                                                </div>

                                                                <div className="flex-1 pt-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <h5 className={`font-semibold ${isCurrent ? "text-blue-700" : "text-gray-900"}`}>
                                                                                {step.step_name}
                                                                            </h5>
                                                                            <p className="text-sm text-gray-500">
                                                                                {step.status === "PENDING" ? "Menunggu keputusan..." :
                                                                                    step.status === "COMPLETED" ? `Disetujui pada ${step.completed_at ? format(new Date(step.completed_at), "dd MMM HH:mm") : "-"}` :
                                                                                        "Ditolak"}
                                                                            </p>
                                                                        </div>

                                                                        {/* Action Buttons for Current Step */}
                                                                        {isCurrent && canManage && (
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="text-red-600 hover:bg-red-50 border-red-200"
                                                                                    onClick={() => handleApprovalClick(approval.id, step.step_number, "REJECTED")}
                                                                                >
                                                                                    Reject
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="bg-primary hover:bg-primary/90 text-white"
                                                                                    onClick={() => handleApprovalClick(approval.id, step.step_number, "APPROVED")}
                                                                                >
                                                                                    Approve
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Distribution Tab */}
                {
                    activeTab === "distribution" && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Status Distribusi</h3>
                                {document.lifecycle_status === "PUBLISHED" && canManage && (
                                    <Button size="sm" onClick={() => setDistributeDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                        <Share2 className="w-4 h-4 mr-1" />
                                        Distribute
                                    </Button>
                                )}
                            </div>

                            {/* KPI Summary */}
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{distributions.length}</p>
                                    <p className="text-xs text-gray-500">Total</p>
                                </div>
                                <div className="bg-muted rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-foreground">
                                        {(Array.isArray(distributions) ? distributions : []).filter((d: any) => d.status === "acknowledged").length}
                                    </p>
                                    <p className="text-xs text-gray-500">Sudah Baca</p>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-amber-600">
                                        {(Array.isArray(distributions) ? distributions : []).filter((d: any) => d.status === "pending").length}
                                    </p>
                                    <p className="text-xs text-gray-500">Belum Baca</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-red-600">
                                        {(Array.isArray(distributions) ? distributions : []).filter((d: any) => d.deadline && new Date(d.deadline) < new Date() && !d.acknowledged_at).length}
                                    </p>
                                    <p className="text-xs text-gray-500">Overdue</p>
                                </div>
                            </div>

                            {distributions.length === 0 ? (
                                <div className="text-center py-8">
                                    <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">Belum ada distribusi</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50">
                                            <th className="text-left py-2 px-3">Penerima</th>
                                            <th className="text-left py-2 px-3">Dept</th>
                                            <th className="text-left py-2 px-3">Status</th>
                                            <th className="text-left py-2 px-3">Waktu Baca</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distributions.map((d: any) => (
                                            <tr key={d.id} className="border-b hover:bg-muted">
                                                <td className="py-2 px-3">{d.recipient_name}</td>
                                                <td className="py-2 px-3 text-gray-500">{d.recipient_department}</td>
                                                <td className="py-2 px-3">
                                                    <Badge variant="outline" className={
                                                        d.status === "acknowledged" ? "bg-muted text-foreground" :
                                                            "bg-gray-100 text-gray-700"
                                                    }>
                                                        {d.status === "acknowledged" ? "Sudah Baca" : "Belum"}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-3 text-gray-500">
                                                    {d.acknowledged_at ? (() => {
                                                        try {
                                                            const date = new Date(d.acknowledged_at);
                                                            return isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy HH:mm", { locale: idLocale });
                                                        } catch (e) { return "-"; }
                                                    })() : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )
                }

                {/* Audit Trail Tab */}
                {
                    activeTab === "audit" && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Audit Trail & Evidence Pack</h3>
                                {canManage && (
                                    <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700"
                                        onClick={() => {
                                            toast({ title: "Generating Evidence Pack...", description: "PDF will be ready soon" });
                                            // In production, this would call an API to generate PDF
                                        }}
                                    >
                                        <Download className="w-4 h-4 mr-1" />
                                        Export Evidence Pack
                                    </Button>
                                )}
                            </div>

                            {/* Evidence Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-4 border">
                                    <p className="text-2xl font-bold text-gray-900">{versions.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">Versi File</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                    <p className="text-2xl font-bold text-blue-600">{approvals.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">Approval Cycle</p>
                                </div>
                                <div className="bg-muted rounded-lg p-4 border border-border">
                                    <p className="text-2xl font-bold text-foreground">{distributions.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">Distribusi</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                    <p className="text-2xl font-bold text-purple-600">
                                        {(Array.isArray(distributions) ? distributions : []).filter((d: any) => d.status === "acknowledged").length}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Read Receipts</p>
                                </div>
                            </div>

                            {/* Evidence Pack Contents Preview */}
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h4 className="font-medium text-gray-900 mb-3">Evidence Pack Contents:</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-foreground" />
                                        Document metadata & identity
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-foreground" />
                                        Version history ({versions.length} versions)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-foreground" />
                                        Approval timeline ({approvals.length} cycles)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-foreground" />
                                        Distribution list ({distributions.length} recipients)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-foreground" />
                                        Read receipts with timestamps
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-foreground" />
                                        eSign status (if applicable)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Distribute Dialog */}
            < Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen} >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-500" />
                            Distribusikan Dokumen
                        </DialogTitle>
                        <DialogDescription>
                            Pilih penerima dari Data Karyawan
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cari Penerima</Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Ketik nama karyawan..."
                                    value={distributeData.recipientSearch}
                                    onChange={(e) => setDistributeData({ ...distributeData, recipientSearch: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                            {distributeData.recipientSearch && filteredEmployees.length > 0 && (
                                <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                                    {filteredEmployees.map((emp: any) => (
                                        <button
                                            key={emp.id}
                                            onClick={() => addRecipient(emp)}
                                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm flex items-center gap-2"
                                        >
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span>{emp.name}</span>
                                            <span className="text-gray-400 text-xs">- {emp.department}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {distributeData.selectedRecipients.length > 0 && (
                            <div className="space-y-2">
                                <Label>Penerima Terpilih ({distributeData.selectedRecipients.length})</Label>
                                <div className="flex flex-wrap gap-2">
                                    {distributeData.selectedRecipients.map((r) => (
                                        <Badge key={r.id} variant="outline" className="flex items-center gap-1 py-1">
                                            {r.name}
                                            <button onClick={() => removeRecipient(r.id)} className="ml-1 hover:text-red-500">
                                                <XCircle className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline Baca</Label>
                            <Input
                                id="deadline"
                                type="date"
                                value={distributeData.deadline}
                                onChange={(e) => setDistributeData({ ...distributeData, deadline: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="mandatory"
                                checked={distributeData.isMandatory}
                                onChange={(e) => setDistributeData({ ...distributeData, isMandatory: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="mandatory">Wajib dibaca</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDistributeDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleDistribute}
                            disabled={distributeMutation.isPending || distributeData.selectedRecipients.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {distributeMutation.isPending ? "Mendistribusikan..." : "Distribusikan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Submit Confirmation Dialog */}
            < Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Document for Approval</DialogTitle>
                        <DialogDescription>
                            Anda akan memulai proses approval untuk dokumen ini.
                            Notifikasi WhatsApp akan dikirimkan ke Sect Head dan PJO.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            <Send className="w-5 h-5 shrink-0" />
                            <p>Proses: <strong>Sect Head Review</strong> → <strong>PJO Approval</strong></p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Batal</Button>
                        <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                            {submitMutation.isPending ? "Submitting..." : "Submit Now"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Approve/Reject Dialog */}
            < Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {approvalAction === "APPROVED" ? "Setujui Dokumen" : "Tolak Dokumen"}
                        </DialogTitle>
                        <DialogDescription>
                            Berikan catatan untuk keputusan Anda (opsional).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Label>Catatan / Komentar</Label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder={approvalAction === "APPROVED" ? "Ok, dokumen sudah sesuai..." : "Mohon revisi bagian..."}
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Batal</Button>
                        <Button
                            className={approvalAction === "APPROVED" ? "bg-primary hover:bg-primary/90" : "bg-red-600 hover:bg-red-700"}
                            onClick={() => approveMutation.mutate()}
                            disabled={approveMutation.isPending}
                        >
                            {approveMutation.isPending ? "Processing..." : "Konfirmasi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    );
}
