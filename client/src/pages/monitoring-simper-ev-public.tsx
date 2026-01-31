
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, CheckCircle2, Clock, Filter, Building2, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { SimperEvMonitoring } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MonitoringSimperEvPublic() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMitra, setFilterMitra] = useState<string>("ALL");

    // Fetch ALL data
    const { data: records = [], isLoading, error } = useQuery<SimperEvMonitoring[]>({
        queryKey: ["simper-ev-all"], // Re-use the same key as admin for caching efficiency
        queryFn: async () => {
            const res = await apiRequest("/api/simper-ev/all", "GET");
            return res;
        },
    });

    // Extract Unique Mitra
    const uniqueMitra = useMemo(() => {
        const mitras = records.map(r => r.asalMitra).filter((m): m is string => !!m); // Get all non-empty mitra
        return Array.from(new Set(mitras)).sort();
    }, [records]);

    // Filter Logic
    const filteredResults = useMemo(() => {
        return records.filter(item => {
            const matchesSearch =
                item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.nikSimper && item.nikSimper.toLowerCase().includes(searchQuery.toLowerCase()));

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

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Hero Section with Glassmorphism */}
            <div className="relative bg-white pb-12 overflow-hidden border-b border-slate-200/60 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-slate-50/50 -z-10" />
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <svg width="200" height="200" viewBox="0 0 100 100" className="text-blue-600 fill-current">
                        <circle cx="50" cy="50" r="40" />
                    </svg>
                </div>

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
                            {/* Optional: Right side illustration or logo placeholder */}
                            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform rotate-3">
                                <span className="text-white font-bold text-2xl">EV</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Search & Filter Bar */}
            <div className="sticky top-0 z-30 -mt-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-lg p-4 flex flex-col md:flex-row gap-3 items-center">
                        <div className="relative flex-1 w-full">
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
                                    {uniqueMitra.map((mitra) => (
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                        <p className="text-sm font-medium">Memuat data...</p>
                    </div>
                ) : filteredResults.length > 0 ? (
                    <>
                        <p className="text-sm text-slate-500 mb-6 font-medium">
                            Menampilkan <span className="text-slate-900 font-bold">{filteredResults.length}</span> data
                            {filterMitra !== "ALL" && <span> dari mitra <span className="text-blue-600">{filterMitra}</span></span>}
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
                                            <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <div className="w-16 h-16 rounded-full bg-blue-600 blur-xl"></div>
                                            </div>

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
                                                        <div>
                                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Unit & Mitra</p>
                                                            <p className="text-sm font-semibold text-slate-700">{item.unit || "-"} • {item.asalMitra || "-"}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3">
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

                                        <div className="bg-slate-50/50 border-t border-slate-100 p-4 grid grid-cols-2 gap-px text-center">
                                            <div className="pr-4 border-r border-slate-200/60">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Orientasi</p>
                                                <p className={`text-sm font-semibold ${item.simperOrientasi === 'Sudah' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    {item.simperOrientasi || "-"}
                                                </p>
                                            </div>
                                            <div className="pl-4">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Permanen</p>
                                                <p className={`text-sm font-semibold ${item.simperPermanen === 'Sudah' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    {item.simperPermanen || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 max-w-md mx-auto">
                        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Tidak ada data ditemukan</h3>
                        <p className="text-slate-500">
                            Kami tidak dapat menemukan data yang cocok dengan pencarian "{searchQuery}"
                            {filterMitra !== "ALL" && ` di mitra "${filterMitra}"`}.
                            Coba kata kunci lain atau reset filter.
                        </p>
                        <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(""); setFilterMitra("ALL"); }}>
                            Reset Pencarian
                        </Button>
                    </div>
                )}
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-slate-200 mt-auto bg-white py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Monitoring Simper EV. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
