import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ClipboardCheck, Activity, ClipboardList, ArrowLeft, TrafficCone, Truck, Shield, Maximize2, Gauge, Sun, Lock, Tablet, PenTool, Search, Bell, FileText, History, BriefcaseMedical, Eye, Radio, ChevronRight, Zap, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

const historyItems = [
    {
        title: "Riwayat Fatigue",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/fatigue/history",
        icon: Activity,
        color: "blue"
    },
    {
        title: "Riwayat Roster",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/roster/history",
        icon: ClipboardList,
        color: "purple"
    },
    {
        title: "Riwayat Seatbelt",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/seatbelt/history",
        icon: ClipboardCheck,
        color: "green"
    },
    {
        title: "Riwayat Rambu",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/rambu/history",
        icon: TrafficCone,
        color: "amber"
    },
    {
        title: "Riwayat Antrian",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/antrian/history",
        icon: Truck,
        color: "rose"
    },
    {
        title: "Riwayat Jarak",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/jarak/history",
        icon: Maximize2,
        color: "blue"
    },
    {
        title: "Riwayat Kecepatan",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/kecepatan/history",
        icon: Gauge,
        color: "orange"
    },
    {
        title: "Riwayat APD",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/apd/history",
        icon: Shield,
        color: "purple"
    },
    {
        title: "Riwayat LOTO",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/loto/history",
        icon: Lock,
        color: "orange"
    },
    {
        title: "Riwayat Digital",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/digital/history",
        icon: Tablet,
        color: "blue"
    },
    {
        title: "Riwayat Workshop",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/workshop/history",
        icon: PenTool,
        color: "orange"
    },
    {
        title: "Riwayat P3K",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/p3k/history",
        icon: BriefcaseMedical,
        color: "red"
    },
    {
        title: "Riwayat Tingkah Laku",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/behavior/history",
        icon: Eye,
        color: "indigo"
    },
    {
        title: "Riwayat Charging Station",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/charging-station/history",
        icon: Zap,
        color: "amber"
    },
    {
        title: "Riwayat SOP Kritis",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/sop-kritis/history",
        icon: ShieldAlert,
        color: "rose"
    },
    {
        title: "Riwayat Intercom",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/intercom/history",
        icon: Radio,
        color: "sky"
    },
    {
        title: "Riwayat Pencahayaan",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/pencahayaan/history",
        icon: Sun,
        color: "amber"
    },
    {
        title: "Riwayat Stand Jack",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/stand-jack/history",
        icon: Shield,
        color: "orange"
    },
    {
        title: "Riwayat Hydraulic Jack",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/hydraulic-jack/history",
        icon: Shield,
        color: "teal"
    },
    {
        title: "Riwayat Bottle Jack",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/bottle-jack/history",
        icon: Shield,
        color: "orange"
    },
    {
        title: "Riwayat Impact",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/impact/history",
        icon: Shield,
        color: "blue"
    },
    {
        title: "Riwayat Mesin Las",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/mesin-las/history",
        icon: Shield,
        color: "orange"
    },
    {
        title: "Riwayat Fuel Storage",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/fuel-storage/history",
        icon: Shield,
        color: "indigo"
    },
    {
        title: "Riwayat Mesin Kompresor",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/mesin-kompresor/history",
        icon: Shield,
        color: "blue"
    },
    {
        title: "Riwayat Gerinda Duduk",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/gerinda-duduk/history",
        icon: Shield,
        color: "blue"
    },
    {
        title: "Riwayat APAR",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/apar/history",
        icon: Shield,
        color: "red"
    },
    {
        title: "Riwayat Pemenuhan Tyre",
        subtitle: "Data Logs & PDF",
        href: "/workspace/sidak/pemenuhan-tyre/history",
        icon: Shield,
        color: "sky"
    }
];

const colorMap: Record<string, { bg: string, text: string, hoverText: string, hoverBg: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", hoverText: "group-hover:text-blue-600", hoverBg: "group-hover:bg-blue-100" },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", hoverText: "group-hover:text-purple-600", hoverBg: "group-hover:bg-purple-100" },
    green: { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", hoverText: "group-hover:text-green-600", hoverBg: "group-hover:bg-green-100" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", hoverText: "group-hover:text-amber-600", hoverBg: "group-hover:bg-amber-100" },
    rose: { bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", hoverText: "group-hover:text-rose-600", hoverBg: "group-hover:bg-rose-100" },
    orange: { bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", hoverText: "group-hover:text-orange-700", hoverBg: "group-hover:bg-orange-100" },
    red: { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", hoverText: "group-hover:text-red-600", hoverBg: "group-hover:bg-red-100" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", hoverText: "group-hover:text-indigo-600", hoverBg: "group-hover:bg-indigo-100" },
    sky: { bg: "bg-sky-50 dark:bg-sky-900/30", text: "text-sky-600 dark:text-sky-400", hoverText: "group-hover:text-sky-600", hoverBg: "group-hover:bg-sky-100" },
    teal: { bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", hoverText: "group-hover:text-teal-600", hoverBg: "group-hover:bg-teal-100" },
};

export default function HistoryPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredItems = useMemo(() => {
        return historyItems.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Mobile Header - Modern Style */}
            <div className="bg-red-600 dark:bg-red-900 pt-8 pb-8 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <Link href="/workspace">
                            <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                                <Bell className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Riwayat</h1>
                        <p className="text-red-100 text-sm">Arsip Inspeksi & Laporan</p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                        <Input
                            placeholder="Cari riwayat laporan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 h-12 rounded-2xl bg-white text-gray-900 border-0 focus-visible:ring-2 focus-visible:ring-white/50 shadow-lg shadow-red-900/20"
                        />
                    </div>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-4 space-y-6">
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item, index) => {
                            const colors = colorMap[item.color] || colorMap.blue;
                            const Icon = item.icon;
                            return (
                                <Link key={index} href={item.href}>
                                    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                                        <div className={`h-16 w-16 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} mr-4 flex-shrink-0`}>
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-bold text-gray-900 dark:text-white ${colors.hoverText} transition-colors`}>{item.title}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</p>
                                        </div>
                                        <div className={`h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 ${colors.hoverBg} ${colors.hoverText} transition-colors`}>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Tidak ada hasil ditemukan</h3>
                        <p className="text-gray-500 dark:text-gray-400">Coba gunakan kata kunci pencarian yang lain.</p>
                        <Button
                            variant="ghost"
                            className="mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setSearchTerm("")}
                        >
                            Hapus Pencarian
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
