import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type UsignDocument, type UsignApprovalStep } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UsignPdfEditor } from "@/components/usign/UsignPdfEditor";
import { USignSignaturePad } from "@/components/usign/SignaturePad";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Download,
    Share2,
    MoreVertical,
    History,
    PenTool,
    ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function UsignDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [activeStepId, setActiveStepId] = useState<string | null>(null);

    const { data: document, isLoading: isDocLoading } = useQuery<UsignDocument & { owner?: any }>({
        queryKey: [`/api/usign/documents/${id}`],
    });

    const { data: steps } = useQuery<(UsignApprovalStep & { approver: any, signatureImageUrl?: string })[]>({
        queryKey: [`/api/usign/documents/${id}/steps`],
    });

    const approveMutation = useMutation({
        mutationFn: async ({ stepId, signatureImageUrl }: { stepId: string, signatureImageUrl: string }) => {
            const res = await apiRequest(`/api/usign/steps/${stepId}/approve`, "POST", {
                signatureImageUrl,
                remarks: "Approved via USign Web"
            });
            return res;
        },
        onSuccess: () => {
            toast({
                title: "Berhasil",
                description: "Dokumen telah ditandatangani.",
            });
            queryClient.invalidateQueries({ queryKey: [`/api/usign/documents/${id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/usign/documents/${id}/steps`] });
            setIsSignModalOpen(false);
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal",
                description: "Gagal menyimpan tanda tangan: " + error.message,
                variant: "destructive",
            });
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ stepId, remarks }: { stepId: string, remarks: string }) => {
            await apiRequest(`/api/usign/steps/${stepId}/reject`, "POST", { remarks });
        },
        onSuccess: () => {
            toast({ title: "Dokumen Ditolak", description: "Dokumen telah dikembalikan ke pemilik." });
            queryClient.invalidateQueries({ queryKey: [`/api/usign/documents/${id}`] });
            setLocation("/workspace/usign");
        }
    });

    if (isDocLoading || !document) return <div className="p-8 text-center animate-pulse">Memuat dokumen...</div>;

    const currentStep = steps?.find(s => s.status === 'current');
    const isApprover = steps?.some(s => s.approverId === user?.nik && s.status === "current");
    const isMyTurn = currentStep?.approverId === user?.nik;

    const statusColors: any = {
        pending: "bg-amber-100 text-amber-700",
        in_progress: "bg-blue-100 text-blue-700",
        completed: "bg-emerald-100 text-emerald-700",
        rejected: "bg-rose-100 text-rose-700",
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top Navigation */}
            <header className="bg-white/80 backdrop-blur-md border-b px-6 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/workspace/usign")} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-lg truncate max-w-md">{document.title}</h1>
                            <Badge className={statusColors[document.status || 'pending']}>
                                {document.status?.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">ID: #{document.id} • Dibuat pada {format(new Date(document.createdAt!), "PPP", { locale: idLocale })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isMyTurn && (
                        <Button
                            onClick={() => {
                                setActiveStepId(currentStep!.id);
                                setIsSignModalOpen(true);
                            }}
                            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 animate-bounce-slow"
                        >
                            <PenTool className="w-4 h-4 mr-2" /> {currentStep?.actionType === 'stamp' ? 'Upload Stempel' : currentStep?.actionType === 'initial' ? 'Berikan Paraf' : 'Tanda Tangan Sekarang'}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => window.open(`/api/usign/documents/${document.id}/download`, '_blank')}
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Editor Area */}
                <main className="flex-1 relative bg-slate-200 dark:bg-slate-900 overflow-hidden">
                    <UsignPdfEditor
                        fileUrl={document.fileUrl}
                        approvers={[]} // Read only mode doesn't need approver list for selection
                        isReadOnly={true}
                        initialBoxes={steps?.map(step => ({
                            id: step.id,
                            pageNumber: step.pageNumber,
                            posX: step.posX,
                            posY: step.posY,
                            width: step.width,
                            height: step.height,
                            approverId: step.approverId,
                            approverName: step.approver?.name,
                            actionType: step.actionType as any,
                            signatureImageUrl: step.signatureImageUrl
                        })) || []}
                        onSave={() => { }}
                    />
                </main>

                {/* Sidebar Info */}
                <aside className="w-96 bg-white border-l overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Alur Approval
                        </h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100" />

                            {/* Langkah 0: Pembuat / Pengirim */}
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-12 h-12 rounded-2xl flex items-center justify-center z-10 border-4 border-white shadow-sm bg-slate-800 text-white">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Pembuat Dokumen</span>
                                    <span className="font-bold text-slate-800">
                                        {document.owner?.name || "Pembuat Teks"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{document.owner?.position || "Karyawan"}</span>
                                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-[10px] text-slate-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Dikirim pada {format(new Date(document.createdAt!), "d MMM yyyy, HH:mm")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {Array.from(
                                (steps || []).reduce((acc, step) => {
                                    const existing = acc.get(step.approverId as string);
                                    if (!existing || step.status === 'completed' || (step.status === 'current' && existing.status !== 'completed')) {
                                        acc.set(step.approverId as string, step);
                                    }
                                    return acc;
                                }, new Map<string, typeof steps extends undefined ? any : NonNullable<typeof steps>[0]>()).values()
                            ).map((step, i) => (
                                <div key={step.id} className="relative pl-12">
                                    <div className={`absolute left-0 top-1 w-12 h-12 rounded-2xl flex items-center justify-center z-10 border-4 border-white shadow-sm transition-all ${step.status === 'completed' ? 'bg-emerald-500 text-white' :
                                        step.status === 'current' ? 'bg-blue-600 text-white scale-110 shadow-lg' :
                                            'bg-slate-100 text-slate-400'
                                        }`}>
                                        {step.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                                            step.status === 'current' ? <Clock className="w-6 h-6" /> :
                                                <div className="font-bold">{i + 1}</div>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                                            {step.actionType === 'stamp' ? 'Stempel' : step.actionType === 'initial' ? 'Paraf' :
                                                step.actionType === 'signature' ? 'Penandatangan' : 'Reviewer'} {i + 1}
                                        </span>
                                        <span className={`font-bold ${step.status === 'current' ? 'text-blue-700' : 'text-slate-700'}`}>
                                            {step.approver?.name || "Approver"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{step.approver?.position || "Position"}</span>
                                        {step.status === 'completed' && (
                                            <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <p className="text-[10px] text-emerald-800 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Disetujui pada {format(new Date(step.respondedAt!), "d MMM yyyy, HH:mm")}
                                                </p>
                                            </div>
                                        )}
                                        {step.status === 'current' && (
                                            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100 shadow-inner">
                                                <p className="text-[10px] text-blue-600 font-medium italic flex items-center gap-1 animate-pulse">
                                                    <Clock className="w-3 h-3" /> Menunggu persetujuan...
                                                </p>
                                            </div>
                                        )}
                                        {step.status === 'pending' && (
                                            <p className="mt-1 text-[10px] text-slate-400 font-medium">Belum giliran</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <Separator />

                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Informasi Lainnya
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border">
                                <p className="text-xs text-slate-500 mb-1">Subjek</p>
                                <p className="text-sm text-slate-800 leading-relaxed">{document.subject || "-"}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border">
                                <p className="text-xs text-slate-500 mb-1">Tembusan (CC)</p>
                                <div className="flex flex-wrap gap-1">
                                    {document.ccEmails && (document.ccEmails as string[]).map(cc => (
                                        <Badge key={cc} variant="secondary" className="text-[10px]">{cc}</Badge>
                                    ))}
                                    {!document.ccEmails && <span className="text-sm text-slate-400 italic">Tidak ada</span>}
                                </div>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            {/* Signing Modal */}
            <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
                <DialogContent className="sm:max-w-md border-none shadow-2xl bg-white rounded-3xl overflow-hidden p-0">
                    <DialogHeader className="p-6 bg-slate-50 border-b">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <PenTool className="w-5 h-5 text-primary" /> {currentStep?.actionType === 'stamp' ? 'Unggah Stempel' : currentStep?.actionType === 'initial' ? 'Buat Paraf' : 'Tanda Tangan Digital'}
                        </DialogTitle>
                        <CardDescription className="text-slate-500 text-sm mt-1">
                            Dengan {currentStep?.actionType === 'stamp' ? 'mengunggah stempel' : currentStep?.actionType === 'initial' ? 'membuat paraf' : 'menandatangani'} dokumen ini, Anda setuju dengan isi dan ketentuan yang berlaku.
                        </CardDescription>
                    </DialogHeader>
                    <div className="p-8 bg-white">
                        <USignSignaturePad
                            onSave={(dataUrl) => {
                                approveMutation.mutate({ stepId: activeStepId!, signatureImageUrl: dataUrl });
                            }}
                            onCancel={() => setIsSignModalOpen(false)}
                            isPending={approveMutation.isPending}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
