
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, Clock, User, Building2, Briefcase, Calendar, ChevronRight, Hash, Phone, FileText, UserCheck, ShieldCheck, Activity, FileCheck, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface SimperTrackingData {
    nama: string;
    nik: string;
    nomorLambung: string;
    jabatan: string;
    departemen: string;
    perusahaan: string;
    jenisSimper: string;
    statusPerpanjangan: string;
    tahapanWorkflow: string;
    catatan: string;
    updatedAt: string;
}

const STEPS = [
    { id: "Submit by Admin Mitra Kerja", label: "Submit by Admin Mitra Kerja", icon: FileText },
    { id: "Waiting Approval by PJO Mitra Kerja", label: "Waiting Approval by PJO Mitra Kerja", icon: UserCheck },
    { id: "Waiting Approval by Head Custodioan", label: "Waiting Approval by Head Custodioan", icon: ShieldCheck },
    { id: "Waiting Approval by Dokter Perusahan", label: "Waiting Approval by Dokter Perusahan", icon: Activity },
    { id: "Waiting Approval by Admin STC", label: "Waiting Approval by Admin STC", icon: FileCheck },
    { id: "Simper can be picked up at the office GECL", label: "SIMPER Siap Diambil", icon: MapPin },
    { id: "Selesai", label: "Selesai", icon: CheckCircle2 },
];

export default function PublicSimperTracking() {
    const { token } = useParams<{ token: string }>();

    const { data: record, isLoading, error } = useQuery<SimperTrackingData>({
        queryKey: ["public-simper-tracking", token],
        queryFn: async () => {
            const response = await fetch(`/api/public/simper-perpanjangan/${token}`);
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return response.json();
        },
        enabled: !!token,
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Selesai":
            case "Approved":
                return "bg-emerald-500 hover:bg-emerald-600 text-white";
            case "Rejected":
                return "bg-red-500 hover:bg-red-600 text-white";
            case "Dalam Proses":
            case "Menunggu Approval":
                return "bg-blue-500 hover:bg-blue-600 text-white";
            default:
                return "bg-slate-500 hover:bg-slate-600 text-white";
        }
    };

    const getCurrentStepIndex = (tahapan: string) => {
        const index = STEPS.findIndex(s => s.id === tahapan);
        if (index !== -1) return index;

        // Fallback for legacy statuses or subtle mismatches
        if (tahapan === "Selesai") return 6;
        if (tahapan?.includes("picked up")) return 5;
        if (tahapan?.includes("Admin STC")) return 4;
        if (tahapan?.includes("Dokter")) return 3;
        if (tahapan?.includes("Custodian")) return 2;
        if (tahapan?.includes("PJO")) return 1;
        return 0;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium animate-pulse text-lg">Memuat data pelacakan...</p>
            </div>
        );
    }

    if (error || !record) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md border-red-100 shadow-xl overflow-hidden rounded-3xl">
                    <div className="bg-red-500 h-2" />
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Tautan Tidak Valid</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            Maaf, tautan pelacakan tidak ditemukan atau sudah kedaluwarsa. Silakan hubungi admin HSE untuk mendapatkan tautan baru.
                        </p>
                        <Button
                            className="w-full h-14 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold text-lg"
                            onClick={() => window.location.href = "/"}
                        >
                            Kembali ke Beranda
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentStepIndex = getCurrentStepIndex(record.tahapanWorkflow || record.statusPerpanjangan);

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 pt-12 pb-24 px-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-300 rounded-full blur-3xl animate-pulse delay-700" />
                </div>

                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-4">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Status Tracking
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-sm">
                        Renewal SIMPER
                    </h1>
                    <p className="text-blue-100/80 text-lg font-medium">
                        Pantau proses perpanjangan kartu Anda secara real-time
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-md mx-auto px-4 -mt-16 relative z-20 space-y-6">
                {/* Status Card */}
                <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white ring-1 ring-slate-100">
                    <CardContent className="p-0">
                        <div className={`p-6 text-center ${record.statusPerpanjangan === 'Selesai' ? 'bg-emerald-50' : 'bg-blue-50/50'}`}>
                            <Badge className={`${getStatusColor(record.statusPerpanjangan)} px-6 py-2 rounded-full text-base font-bold shadow-md transform -translate-y-2`}>
                                {record.statusPerpanjangan}
                            </Badge>
                            <h2 className="text-3xl font-black text-slate-900 mt-2">
                                {record.nama}
                            </h2>
                            <p className="text-slate-500 font-bold mt-1 tracking-widest uppercase text-xs">
                                NIK: {record.nik}
                            </p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Jenis SIMPER</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                                            <Hash className="w-4 h-4" />
                                        </div>
                                        <p className="font-bold text-slate-800 text-lg">{record.jenisSimper}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No. Lambung</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                            <Hash className="w-4 h-4" />
                                        </div>
                                        <p className="font-bold text-slate-800 text-lg">{record.nomorLambung || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            <div className="space-y-5">
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Perusahaan</p>
                                        <p className="font-bold text-slate-800">{record.perusahaan}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Jabatan</p>
                                        <p className="font-bold text-slate-800">{record.jabatan} - {record.departemen}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Workflow Stepper */}
                <Card className="rounded-[40px] shadow-xl border-none overflow-hidden bg-white ring-1 ring-slate-100">
                    <CardHeader className="pt-8 pb-4">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Progress Perpanjangan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <div className="relative space-y-8 before:absolute before:inset-y-0 before:left-6 before:w-1 before:bg-slate-100 before:z-0">
                            {STEPS.map((step, index) => {
                                const isActive = index === currentStepIndex;
                                const isCompleted = index < currentStepIndex;
                                const Icon = step.icon;

                                return (
                                    <div key={step.id} className="relative z-10 flex items-center gap-6 group">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md ${isActive
                                            ? 'bg-blue-600 text-white scale-110 ring-8 ring-blue-50'
                                            : isCompleted
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white text-slate-300 border-2 border-slate-100'
                                            }`}>
                                            {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold transition-colors leading-tight ${isActive ? 'text-blue-600' : isCompleted ? 'text-slate-900 opacity-60' : 'text-slate-400'
                                                }`}>
                                                {step.label}
                                            </p>
                                            {isActive && (
                                                <p className="text-[10px] text-blue-400 font-bold mt-1 animate-pulse uppercase tracking-wider">In Progress</p>
                                            )}
                                            {isCompleted && (
                                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1 underline decoration-emerald-100 underline-offset-2">Completed</p>
                                            )}
                                        </div>
                                        {isActive && (
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {record.catatan && (
                            <div className="mt-10 p-5 bg-orange-50/50 rounded-3xl border border-orange-100/50 text-sm">
                                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> Catatan Admin
                                </p>
                                <p className="text-orange-900/80 font-medium italic leading-relaxed">
                                    "{record.catatan}"
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer Info */}
                <div className="text-center space-y-4 pt-4">
                    <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white flex items-center justify-center gap-2 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Terakhir diperbarui: {format(new Date(record.updatedAt), "d MMM yyyy, HH:mm", { locale: idLocale })}
                        </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        © {new Date().getFullYear()} PT. GECL Human Resource
                    </p>
                </div>
            </div>
        </div>
    );
}

function Button({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}
