
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, CheckCircle2, Clock, Filter, Building2, MapPin, X, ArrowRight, Activity, Calendar, Check, MessageSquare, User, Smartphone, History as HistoryIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { SimperEvMonitoring, SimperEvHistory, SimperMitra } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function MonitoringSimperEvPublic() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMitra, setFilterMitra] = useState<string>("ALL");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    // Fetch ALL data
    const { data: records = [], isLoading, error } = useQuery<SimperEvMonitoring[]>({
        queryKey: ["simper-ev-all"],
        queryFn: async () => {
            return await apiRequest("/api/simper-ev/all", "GET");
        },
        refetchInterval: 5000, // Auto-refresh every 5 seconds
    });

    // Fetch Mitras
    const { data: mitras = [] } = useQuery<SimperMitra[]>({
        queryKey: ["simper-mitras"],
        queryFn: async () => {
            return await apiRequest("/api/simper-mitra", "GET");
        },
    });

    // Active Employee (Derived from state + records)
    const activeEmployee = useMemo(() => {
        return records.find(r => r.id === selectedEmployeeId) || null;
    }, [records, selectedEmployeeId]);

    // Fetch History for selected employee
    const { data: history = [], isLoading: isLoadingHistory } = useQuery<SimperEvHistory[]>({
        queryKey: ["simper-history", activeEmployee?.nikSimper],
        queryFn: async () => {
            if (!activeEmployee?.nikSimper) return [];
            return await apiRequest(`/api/simper-ev/${activeEmployee.nikSimper}/history`, "GET");
        },
        enabled: !!activeEmployee?.nikSimper,
        refetchInterval: 5000
    });

    // Extract Unique Mitra
    const allMitras = useMemo(() => {
        const rawMitras = records.map(r => r.asalMitra).filter((m): m is string => !!m);
        const savedMitras = mitras.map(m => m.name);
        return Array.from(new Set([...rawMitras, ...savedMitras])).sort();
    }, [records, mitras]);

    // Filter Logic
    const filteredResults = useMemo(() => {
        return (records || []).filter(item => {
            if (!item) return false;
            const search = searchQuery.toLowerCase();
            const matchesSearch =
                (item.nama || "").toLowerCase().includes(search) ||
                (item.nikSimper && item.nikSimper.toLowerCase().includes(search));

            const matchesMitra = filterMitra === "ALL" || item.asalMitra === filterMitra;

            return matchesSearch && matchesMitra;
        });
    }, [records, searchQuery, filterMitra]);

    const getStatusStyle = (status: string) => {
        if (!status) return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", icon: null };
        const s = status.toLowerCase();
        if (s.includes("selesai") || s.includes("sudah")) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
        if (s.includes("proses") || s.includes("pengajuan")) return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: <Clock className="w-3 h-3 mr-1" /> };
        if (s.includes("tolak")) return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <AlertCircle className="w-3 h-3 mr-1" /> };
        return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", icon: null };
    };

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md p-6 text-center shadow-lg">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
                    <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : "Gagal memuat data"}</p>
                    <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
            {/* Hero Section */}
            <div className="relative bg-white pb-12 overflow-hidden border-b border-slate-200/60 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-slate-50/50 -z-10" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left space-y-2">
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold tracking-wide uppercase mb-2">
                                Official Monitoring
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                                Simper EV <span className="text-blue-600">Monitoring</span>
                            </h1>
                            <p className="text-lg text-slate-600 max-w-xl">
                                Pantau status pengajuan Simper EV Anda secara real-time. Cukup cari nama atau filter berdasarkan mitra.
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform rotate-3">
                                <span className="text-white font-bold text-2xl">EV</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Search & Filter Bar */}
            <div className="sticky top-0 z-30 -mt-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-lg p-4 flex flex-col md:flex-row gap-3 items-center">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            <Input
                                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all rounded-lg"
                                placeholder="Cari Nama / NIK Simper..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="w-full md:w-64 flex-shrink-0">
                            <Select value={filterMitra} onValueChange={setFilterMitra}>
                                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Filter className="h-4 w-4" />
                                        <SelectValue placeholder="Filter Mitra" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Mitra</SelectItem>
                                    {allMitras.map((mitra) => (
                                        <SelectItem key={mitra} value={mitra}>
                                            {mitra}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(searchQuery || filterMitra !== "ALL") && (
                            <Button
                                variant="ghost"
                                onClick={() => { setSearchQuery(""); setFilterMitra("ALL"); }}
                                className="text-slate-500 hover:text-red-500 hover:bg-red-50 h-11 px-3 md:w-auto w-full"
                            >
                                <X className="h-4 w-4 md:mr-2" />
                                <span className="md:inline hidden">Reset</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                        <p className="text-sm font-medium">Memuat data...</p>
                    </div>
                ) : filteredResults.length > 0 ? (
                    <div className="space-y-6">
                        <p className="text-sm text-slate-500 font-medium">
                            Menampilkan <span className="text-slate-900 font-bold">{filteredResults.length}</span> data
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredResults.map((item, index) => {
                                const statusStyle = getStatusStyle(item.statusPengajuan || "");
                                return (
                                    <div
                                        key={item.id}
                                        className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="p-5 flex-1 relative">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 line-clamp-1 text-lg group-hover:text-blue-600 transition-colors">
                                                            {item.nama}
                                                        </h3>
                                                        <p className="text-sm text-slate-500 font-mono mt-0.5">{item.nikSimper || "-"}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                                        {statusStyle.icon}
                                                        {item.statusPengajuan}
                                                    </span>
                                                </div>

                                                <div className="space-y-3 mt-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-slate-50 text-slate-400 mt-0.5">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Mitra</p>
                                                            <p className="text-sm font-semibold text-slate-700">{item.asalMitra || "-"}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                                        <div className="flex items-start gap-2">
                                                            <div className="p-1 rounded-md bg-blue-50 text-blue-400 mt-0.5">
                                                                <Activity className="w-3 h-3" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Merek</p>
                                                                <p className="text-xs font-bold text-slate-700">{item.merkUnit || "-"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="p-1 rounded-md bg-indigo-50 text-indigo-400 mt-0.5">
                                                                <Smartphone className="w-3 h-3" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Tipe</p>
                                                                <p className="text-xs font-bold text-slate-700">{item.typeUnit || "-"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3 pt-1">
                                                        <div className="p-1.5 rounded-md bg-slate-50 text-slate-400 mt-0.5">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Skill Up</p>
                                                            <p className="text-sm font-semibold text-slate-700">{item.unitSkillUp || "-"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/50 border-t border-slate-100 p-4 flex justify-center text-center">
                                            <div className="w-full text-center">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Permanen</p>
                                                <p className={`text-sm font-semibold ${item.simperPermanen === 'Sudah' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    {item.simperPermanen || "-"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white border-t border-slate-100 mt-auto">
                                            <Button
                                                variant="outline"
                                                className="w-full h-10 text-xs font-semibold text-blue-600 border-blue-100 hover:bg-blue-50 hover:border-blue-200 group/btn transition-all duration-300 rounded-xl"
                                                onClick={() => setSelectedEmployeeId(item.id)}
                                            >
                                                <Activity className="w-3.5 h-3.5 mr-2 group-hover/btn:animate-pulse" />
                                                History Pengajuan
                                                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 max-w-md mx-auto">
                        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada data ditemukan</h3>
                        <p className="text-slate-500">
                            Kami tidak dapat menemukan data yang cocok dengan pencarian "{searchQuery}".
                        </p>
                        <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(""); setFilterMitra("ALL"); }}>
                            Reset Pencarian
                        </Button>
                    </div>
                )}
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-slate-200 mt-auto bg-white py-12 w-full">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Monitoring Simper EV. All rights reserved.</p>
                </div>
            </footer>

            {/* Tracker Flow Dialog */}
            {/* Tracker Flow Dialog */}
            <Dialog open={!!activeEmployee} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
                <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
                                    <HistoryIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-bold tracking-tight">History Pengajuan</DialogTitle>
                                    <DialogDescription className="text-blue-100/90 font-medium">
                                        Riwayat lengkap perjalanan status dokumen Anda
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-6 bg-white overflow-y-auto max-h-[70vh]">
                        {activeEmployee && (
                            <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1 flex items-center gap-2">
                                        <User className="w-3 h-3" /> Pemohon
                                    </p>
                                    <p className="text-lg font-bold text-slate-900">{activeEmployee.nama}</p>
                                    <p className="text-sm font-mono text-slate-500">{activeEmployee.nikSimper}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Status Terkini</p>
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3 py-1 font-bold">
                                        {activeEmployee.statusPengajuan}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[17px] before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:to-slate-100 before:z-0 px-1">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                                    <p className="text-xs font-medium">Menganalisis riwayat...</p>
                                </div>
                            ) : !history || history.length === 0 ? (
                                <div className="text-center py-12 px-6">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <AlertCircle className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Belum ada riwayat update untuk pengajuan ini.</p>
                                </div>
                            ) : (
                                [...history]
                                    .sort((a, b) => new Date(b.approvedAt || 0).getTime() - new Date(a.approvedAt || 0).getTime())
                                    .map((log, idx) => {
                                        const isApproved = log.status === 'APPROVED';
                                        return (
                                            <div key={log.id} className="relative z-10 pl-10">
                                                <div className={`absolute left-1 top-0 w-6 h-6 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${isApproved || idx === 0
                                                    ? 'bg-emerald-500 ring-4 ring-emerald-50'
                                                    : 'bg-slate-200'
                                                    }`}>
                                                    {isApproved ? (
                                                        <Check className="w-3 h-3 text-white" />
                                                    ) : idx === 0 ? (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    )}
                                                </div>

                                                <div className={`p-4 rounded-2xl border transition-all duration-300 group hover:translate-x-1 hover:shadow-lg ${idx === 0
                                                    ? 'bg-white border-blue-100 shadow-md ring-1 ring-blue-50'
                                                    : 'bg-white border-slate-100 shadow-sm hover:border-blue-100'
                                                    }`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                {log.workflowType || "LOG"}
                                                            </span>
                                                            <h4 className="font-bold text-slate-900 mt-1.5">{log.workflowLevel}</h4>
                                                        </div>
                                                        <div className="flex items-center text-slate-400 text-[10px] font-medium">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {log.approvedAt ? format(new Date(log.approvedAt), "d MMM yyyy, HH:mm") : "-"}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                                            <MessageSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                                            <p className="text-sm text-slate-600 leading-relaxed italic">
                                                                "{log.message || "Tidak ada catatan."}"
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-1">
                                                            <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                                                <User className="w-3 h-3 text-indigo-600" />
                                                            </div>
                                                            <p className="text-[11px] font-bold text-slate-500 tracking-wide uppercase">
                                                                Oleh: <span className="text-slate-900 font-extrabold">{log.approver || "System"}</span>
                                                            </p>
                                                            <div className="ml-auto">
                                                                <Badge className={`${log.status === 'APPROVED'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                                                    } border text-[10px] font-extrabold px-2 flex items-center gap-1`}>
                                                                    {log.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                                                                    {log.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <Button
                            onClick={() => setSelectedEmployeeId(null)}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6"
                        >
                            Selesai
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
