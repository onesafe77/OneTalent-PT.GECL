import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { type UsignDocument, type UsignApprovalStep } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ArrowRight,
    History,
    TrendingUp,
    Filter,
    Bell,
    ExternalLink,
    PenTool
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DashboardStats {
    pendingCount: number;
    approvedCount: number;
    avgResponseTime: number;
}

export function UsignDashboard({ userId, nik }: { userId?: string, nik: string }) {
    const { data: stats } = useQuery<DashboardStats>({
        queryKey: [`/api/usign/stats?userId=${nik}`],
    });

    const { data: myRequests } = useQuery<UsignDocument[]>({
        queryKey: [`/api/usign/my-requests?ownerId=${nik}`],
    });

    const { data: myApprovals } = useQuery<(UsignApprovalStep & { document: UsignDocument })[]>({
        queryKey: [`/api/usign/my-approvals?approverId=${nik}`],
    });

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-8 p-1">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            USign Dashboard
                        </h1>
                        {stats && stats.pendingCount > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-red-500/30 animate-bounce"
                            >
                                {stats.pendingCount}
                            </motion.div>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Kelola persetujuan dan tanda tangan dokumen digital Anda.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {stats && stats.pendingCount > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-9 px-3 bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 text-xs font-bold whitespace-nowrap"
                                >
                                    <Bell className="w-4 h-4 mr-2" />
                                    {stats.pendingCount} Tugas Pending
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                                    <h4 className="font-bold text-sm">Notifikasi USign</h4>
                                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                                        {stats.pendingCount} Pending
                                    </Badge>
                                </div>
                                <ScrollArea className="max-h-[400px]">
                                    <div className="p-2 space-y-1">
                                        {myApprovals?.filter(a => a.status === "current").map((approval) => (
                                            <Link key={approval.id} href={`/workspace/usign/document/${approval.document.id}`}>
                                                <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 animate-pulse">
                                                            <PenTool className="w-4 h-4 text-red-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                                {approval.document.title}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                Butuh tanda tangan Anda
                                                            </p>
                                                        </div>
                                                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors mt-1" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    {(!myApprovals || myApprovals.filter(a => a.status === "current").length === 0) && (
                                        <div className="p-8 text-center text-xs text-muted-foreground">
                                            Tidak ada tugas pending.
                                        </div>
                                    )}
                                </ScrollArea>
                                <Separator />
                                <div className="p-2 bg-slate-50/50">
                                    <Link href="/workspace/usign/history">
                                        <Button variant="ghost" size="sm" className="w-full text-[11px] h-8 hover:bg-white hover:text-primary">
                                            Lihat Semua Riwayat <History className="w-3 h-3 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        <Plus className="w-4 h-4 mr-2" /> Buat Permintaan
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <motion.div variants={item}>
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow border-none bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Clock className="w-16 h-16 text-amber-600" />
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-amber-600 mb-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Menunggu</span>
                            </div>
                            <div className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                                {stats?.pendingCount || 0}
                            </div>
                            <p className="text-sm text-amber-700/70 dark:text-amber-300/50 mt-1">Dokumen perlu respon</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow border-none bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Selesai</span>
                            </div>
                            <div className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">
                                {stats?.approvedCount || 0}
                            </div>
                            <p className="text-sm text-emerald-700/70 dark:text-emerald-300/50 mt-1">Dokumen ditandatangani</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item}>
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-shadow border-none bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-16 h-16 text-blue-600" />
                        </div>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Respons</span>
                            </div>
                            <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                                {stats?.avgResponseTime || 0}h
                            </div>
                            <p className="text-sm text-blue-700/70 dark:text-blue-300/50 mt-1">Rata-rata waktu approval</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Main Content Sections */}
            <Tabs defaultValue="approvals" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="approvals" className="flex items-center gap-2 px-6 relative">
                            <CheckCircle2 className="w-4 h-4" /> Persetujuan
                            {stats && stats.pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                                    {stats.pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="flex items-center gap-2 px-6">
                            <FileText className="w-4 h-4" /> Permintaan Saya
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2 px-6">
                            <History className="w-4 h-4" /> Riwayat
                        </TabsTrigger>
                    </TabsList>

                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                </div>

                <TabsContent value="approvals">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="approvals"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="grid gap-4"
                        >
                            {myApprovals && myApprovals.filter(a => a.status === 'current' || a.status === 'pending').length > 0 ? (
                                myApprovals.filter(a => a.status === 'current' || a.status === 'pending').map((approval) => (
                                    <DocumentCard key={approval.id} doc={approval.document} isApproval={true} currentStep={approval} />
                                ))
                            ) : (
                                <EmptyState icon={<CheckCircle2 className="w-12 h-12" />} title="Tidak ada persetujuan tertunda" description="Semua dokumen Anda telah diproses." />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </TabsContent>

                <TabsContent value="requests">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid gap-4"
                        >
                            {myRequests && myRequests.length > 0 ? (
                                myRequests.map((doc) => (
                                    <DocumentCard key={doc.id} doc={doc} isApproval={false} />
                                ))
                            ) : (
                                <EmptyState icon={<FileText className="w-12 h-12" />} title="Belum membuat permintaan" description="Mulai dengan mengupload dokumen baru." />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </TabsContent>

                <TabsContent value="history">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid gap-4"
                        >
                            {myApprovals && myApprovals.filter(a => a.status === 'completed' || a.status === 'rejected').length > 0 ? (
                                myApprovals.filter(a => a.status === 'completed' || a.status === 'rejected').map((approval) => (
                                    <DocumentCard key={approval.id} doc={approval.document} isApproval={false} currentStep={approval} />
                                ))
                            ) : (
                                <EmptyState icon={<History className="w-12 h-12" />} title="Belum ada riwayat" description="Anda belum pernah memproses dokumen." />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DocumentCard({ doc, isApproval, currentStep }: { doc: UsignDocument, isApproval: boolean, currentStep?: UsignApprovalStep }) {
    const statusColors: any = {
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        in_progress: "bg-blue-100 text-blue-700 border-blue-200",
        completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
        rejected: "bg-rose-100 text-rose-700 border-rose-200",
        void: "bg-slate-100 text-slate-700 border-slate-200",
    };

    return (
        <Link href={`/workspace/usign/document/${doc.id}`}>
            <Card className="hover:border-primary/50 transition-colors shadow-sm group cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                            <FileText className="w-6 h-6 text-slate-600 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{doc.title}</h3>
                                <Badge variant="outline" className={`${statusColors[doc.status || 'pending']} border text-[10px] h-5 px-1.5 uppercase font-bold tracking-tight`}>
                                    {doc.status}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-md">
                                {doc.subject || "No subject provided"} • {format(new Date(doc.createdAt!), "d MMM yyyy", { locale: id })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium">
                        {isApproval && currentStep && currentStep.status === 'current' && (
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white animate-pulse">
                                Butuh {currentStep.actionType === 'stamp' ? 'Stempel' : currentStep.actionType === 'initial' ? 'Paraf' : 'Tanda Tangan'}
                            </Badge>
                        )}
                        {isApproval && currentStep && currentStep.status === 'completed' && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                Selesai
                            </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-slate-50/50">
            <div className="text-slate-300 mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">{description}</p>
        </div>
    );
}
