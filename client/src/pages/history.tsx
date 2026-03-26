import { Link } from "wouter";
import { ClipboardCheck, Activity, ClipboardList, ArrowLeft, TrafficCone, Truck, Shield, Maximize2, Gauge, Sun, Lock, Tablet, PenTool, Search, Bell, FileText, History, BriefcaseMedical, Eye, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function HistoryPage() {
    const { user } = useAuth();

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
                            className="pl-11 h-12 rounded-2xl bg-white text-gray-900 border-0 focus-visible:ring-2 focus-visible:ring-white/50 shadow-lg shadow-red-900/20"
                        />
                    </div>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-4 space-y-6">
                {/* Quick Stats or Info could go here */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link href="/workspace/sidak/fatigue/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                                <Activity className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Riwayat Fatigue</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/roster/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-4 flex-shrink-0">
                                <ClipboardList className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">Riwayat Roster</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/seatbelt/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-4 flex-shrink-0">
                                <ClipboardCheck className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">Riwayat Seatbelt</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/rambu/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-4 flex-shrink-0">
                                <TrafficCone className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">Riwayat Rambu</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/antrian/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mr-4 flex-shrink-0">
                                <Truck className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-rose-600 transition-colors">Riwayat Antrian</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/jarak/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                                <Maximize2 className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Riwayat Jarak</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/kecepatan/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                                <Gauge className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-700 transition-colors">Riwayat Kecepatan</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/apd/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-4 flex-shrink-0">
                                <Shield className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-700 transition-colors">Riwayat APD</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/loto/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                                <Lock className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-700 transition-colors">Riwayat LOTO</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/digital/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                                <Tablet className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-700 transition-colors">Riwayat Digital</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/workshop/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                                <PenTool className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-700 transition-colors">Riwayat Workshop</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/p3k/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mr-4 flex-shrink-0">
                                <BriefcaseMedical className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">Riwayat P3K</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/behavior/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-4 flex-shrink-0">
                                <Eye className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">Riwayat Tingkah Laku</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/workspace/sidak/intercom/history">
                        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                            <div className="h-16 w-16 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 mr-4 flex-shrink-0">
                                <Radio className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-sky-600 transition-colors">Riwayat Intercom</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data Logs & PDF</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg className={className}
            width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}
