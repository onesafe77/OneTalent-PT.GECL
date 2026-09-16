
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, CheckCircle2, Clock, Filter, Building2, MapPin, X, ArrowRight, Activity, Calendar, Check, MessageSquare, User, Smartphone, History as HistoryIcon, Tag, Hash, FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { SimperPerpanjangan } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

export default function MonitoringSimperPerpanjanganPublic() {
 const [searchQuery, setSearchQuery] = useState("");
 const [filterStatus, setFilterStatus] = useState<string>("ALL");
 const [_, setLocation] = useLocation();

    // Fetch ALL data
 const { data: records = [], isLoading, error } = useQuery<any[]>({
 queryKey: ["simper-perpanjangan-public-all"],
 queryFn: async () => {
 return await apiRequest("/api/public/simper-perpanjangan/all", "GET");
        },
 refetchInterval: 10000, // Refresh every 10 seconds
    });

    // Extract Unique Statuses for filter
 const allStatuses = useMemo(() => {
 const statuses = records.map(r => r.statusPerpanjangan).filter((s): s is string => !!s);
 return Array.from(new Set(statuses)).sort();
    }, [records]);

    // Filter Logic (Client-side search)
 const filteredResults = useMemo(() => {
 return (records || []).filter(item => {
 if (!item) return false;
 const search = searchQuery.toLowerCase();
 const matchesSearch =
                (item.nama || "").toLowerCase().includes(search) ||
                (item.nik && item.nik.toLowerCase().includes(search));

 const matchesStatus = filterStatus === "ALL" || item.statusPerpanjangan === filterStatus;

 return matchesSearch && matchesStatus;
        });
    }, [records, searchQuery, filterStatus]);

 const getStatusStyle = (status: string) => {
 if (!status) return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", icon: null };
 const s = status.toLowerCase();
 if (s.includes("selesai") || s.includes("approved")) return { bg: "bg-muted", text: "text-foreground", border: "border-border", icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
 if (s.includes("proses") || s.includes("pengajuan") || s.includes("dalam")) return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: <Clock className="w-3 h-3 mr-1" /> };
 if (s.includes("tunggu") || s.includes("approval")) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <Clock className="w-3 h-3 mr-1" /> };
 if (s.includes("reject") || s.includes("tolak")) return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <AlertCircle className="w-3 h-3 mr-1" /> };
 return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", icon: null };
    };

 if (error) {
 return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full p-8 text-center border-none rounded-xl">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Terjadi Kesalahan</h2>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        {error instanceof Error ? error.message : "Gagal memuat data monitoring."}
                    </p>
                    <Button
 className="w-full h-12 bg-primary hover:bg-primary/90 text-background rounded-xl transition-all"
 onClick={() => window.location.reload()}
                    >
                        Muat Ulang Halaman
                    </Button>
                </Card>
            </div>
        );
    }

 return (
        <div className="min-h-screen bg-muted font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
            {/* Header Section */}
            <div className="relative bg-white pb-16 overflow-hidden border-b border-border/60 shadow-sm">
                <div className="absolute inset-0 -z-10 bg-background" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-center md:text-left space-y-3">
                            <div className="mb-2 inline-flex items-center rounded-full border border-border bg-muted px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                Official Monitoring
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                                Monitoring <span className="text-blue-600">Perpanjangan SIMPER</span>
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium">
                                Cari status perpanjangan SIMPER Anda secara transparan. Masukkan Nama atau NIK di bawah ini.
                            </p>
                        </div>
                        <div className="hidden lg:block relative">
                            <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-border bg-muted">
                                <FileText className="text-background w-16 h-16" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-border transform -rotate-12">
                                <CheckCircle2 className="text-foreground w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="sticky top-0 z-30 -mt-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card border border-white/20 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-center ring-1 ring-border/50">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-blue-600 transition-colors" />
                            <Input
 className="pl-12 h-14 bg-muted border-border focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all rounded-xl text-lg font-medium"
 placeholder="Nama / NIK..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="w-full md:w-64 flex-shrink-0">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-14 bg-muted border-border rounded-xl font-semibold text-foreground">
                                    <div className="flex items-center gap-3">
                                        <Filter className="h-5 w-5 text-blue-500" />
                                        <SelectValue placeholder="Semua Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border">
                                    <SelectItem value="ALL" className="font-medium">Semua Status</SelectItem>
                                    {allStatuses.map((status) => (
                                        <SelectItem key={status} value={status} className="font-medium">
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(searchQuery || filterStatus !== "ALL") && (
                            <Button
 variant="ghost"
 onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); }}
 className="text-muted-foreground hover:text-red-500 hover:bg-red-50 h-14 px-5 md:w-auto w-full rounded-xl transition-all"
                            >
                                <X className="h-5 w-5 md:mr-2" />
                                <span className="md:inline hidden font-bold">Clear</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                        <div className="relative w-20 h-20 mb-6">
                            <Loader2 className="w-20 h-20 animate-spin text-blue-200" />
                            <Activity className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
                        </div>
                        <p className="text-xl font-bold text-foreground tracking-tight">Menghubungkan ke Server...</p>
                        <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-xs">Mohon tunggu sebentar</p>
                    </div>
                ) : filteredResults.length > 0 ? (
                    <div className="space-y-10">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <h2 className="text-2xl font-bold text-foreground">Daftar Pengajuan</h2>
                            <Badge variant="outline" className="bg-white px-4 py-1.5 rounded-full border-border shadow-sm text-sm font-bold text-muted-foreground">
                                <Tag className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                {filteredResults.length} Data ditemukan
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredResults.map((item, index) => {
 const statusStyle = getStatusStyle(item.statusPerpanjangan || "");
 return (
                                    <div
 key={item.id}
 className="group relative bg-white rounded-[2rem] border border-border hover: transition-all duration-500 overflow-hidden flex flex-col"
 style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        {/* Status Header */}
                                        <div className={`h-1.5 w-full ${statusStyle.bg.replace('bg-', 'bg-').replace('50', '500')}`} />

                                        <div className="p-7 flex-1 space-y-6">
                                            {/* Header Info */}
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <h3 className="font-black text-foreground line-clamp-2 text-xl group-hover:text-blue-600 transition-colors leading-tight">
                                                        {item.nama}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs font-bold">
                                                        <Hash className="w-3 h-3" />
                                                        {item.nik}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-widest ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} shadow-sm w-full justify-center`}>
                                                {statusStyle.icon}
                                                {item.statusPerpanjangan}
                                            </span>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-1 gap-4 pt-2">
                                                <div className="flex items-center gap-4 p-3 bg-muted/80 rounded-xl border border-border transition-colors group-hover:bg-white group-hover:border-blue-100">
                                                    <div className="p-2.5 rounded-xl bg-white text-indigo-500 shadow-sm border border-border group-hover:border-indigo-50 transition-all">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Departemen</p>
                                                        <p className="font-bold text-foreground group-hover:text-indigo-700 transition-colors">{item.departemen || "-"}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tahapan Workflow */}
                                            <div className="pt-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle2 className="w-4 h-4 text-foreground" />
                                                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Tahapan Saat Ini</p>
                                                </div>
                                                <div className="p-4 bg-muted rounded-xl border border-border font-bold text-foreground text-sm">
                                                    {item.tahapanWorkflow || "In Queue"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="p-5 pt-0 mt-auto">
                                            <Button
 className="w-full h-14 text-sm font-black text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all duration-300 group/btn relative overflow-hidden active:scale-95"
 onClick={() => setLocation(`/public/simper-tracking/${item.trackingToken}`)}
 disabled={!item.trackingToken}
                                            >
                                                <div className="relative flex items-center justify-center gap-2">
                                                    Detail Progress
                                                    <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-32 max-w-xl mx-auto px-4 animate-in fade-in zoom-in duration-700">
                        <div className="bg-muted w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-white">
                            <Search className="h-16 w-16 text-muted-foreground" />
                        </div>
                        <h3 className="text-3xl font-black text-foreground mb-4 tracking-tight">Tidak Ada Hasil</h3>
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed mb-10">
                            Kami tidak dapat menemukan data yang cocok dengan pencarian <span className="text-blue-600 font-black underline underline-offset-4 decoration-blue-200">"{searchQuery}"</span>. Silakan periksa kembali penulisan atau gunakan filter status.
                        </p>
                        <Button
 variant="outline"
 className="h-14 px-10 rounded-xl border-border text-muted-foreground font-bold hover:bg-white hover:border-foreground transition-all text-lg shadow-sm"
 onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); }}
                        >
                            Reset Pencarian
                        </Button>
                    </div>
                )}
            </main>

            {/* Premium Footer */}
            <footer className="border-t border-border mt-auto bg-white pt-20 pb-12 w-full">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                            <FileText className="text-background w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-black text-foreground tracking-tight">OneTalent</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Simper Tracking System</p>
                        </div>
                    </div>

                    <p className="text-muted-foreground text-sm font-medium">
                        © {new Date().getFullYear()} OneTalent Management. All Rights Reserved.
                    </p>

                    <div className="flex gap-6">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-black text-foreground uppercase tracking-widest">Server Operational</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
