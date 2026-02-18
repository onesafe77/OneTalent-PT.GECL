import { Link } from "wouter";
import { ClipboardCheck, Activity, ClipboardList, ArrowLeft, History, TrafficCone, Truck, Maximize2, Gauge, Sun, Lock, Shield, Tablet, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SidakHistoryMenu() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container max-w-7xl mx-auto p-4 space-y-8">
                <div className="text-center pt-8 pb-4">
                    <div className="flex items-center justify-center gap-3 mb-3 relative">
                        <Link href="/workspace/dashboard">
                            <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 lg:hidden">
                                <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                            </Button>
                        </Link>
                        <History className="h-12 w-12 text-primary" />
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Riwayat Sidak
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg max-w-2xl mx-auto">
                        Laporan dan Arsip Inspeksi Data Karyawan
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                <ClipboardList className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Riwayat & Laporan
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Lihat hasil inspeksi sebelumnya
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/workspace/sidak/fatigue/history" data-testid="link-fatigue-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700">Riwayat Fatigue</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/roster/history" data-testid="link-roster-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-700">Riwayat Roster</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/seatbelt/history" data-testid="link-seatbelt-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-green-50 hover:text-green-700 hover:border-green-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-green-700">Riwayat Seatbelt</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/rambu/history" data-testid="link-rambu-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <TrafficCone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-700">Riwayat Rambu</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/antrian/history" data-testid="link-antrian-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Truck className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-rose-700">Riwayat Antrian</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/jarak/history" data-testid="link-jarak-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Maximize2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700">Riwayat Jarak</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/kecepatan/history" data-testid="link-kecepatan-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Gauge className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-700">Riwayat Kecepatan</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/apd/history" data-testid="link-apd-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-700">Riwayat APD</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/pencahayaan/history" data-testid="link-pencahayaan-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-yellow-700">Riwayat Pencahayaan</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/loto/history" data-testid="link-loto-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-700">Riwayat LOTO</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/digital/history" data-testid="link-digital-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Tablet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700">Riwayat Digital</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/workshop/history" data-testid="link-workshop-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <PenTool className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-700">Riwayat Workshop</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/p3k/history" data-testid="link-p3k-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-red-50 hover:text-red-700 hover:border-red-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <Truck className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-red-700">Riwayat P3K</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                        <Link href="/workspace/sidak/behavior/history" data-testid="link-behavior-history">
                            <Button variant="outline" className="w-full justify-start h-16 text-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border-gray-200 dark:border-gray-700 rounded-2xl transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex items-center w-full">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                                        <PenTool className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700">Riwayat Tingkah Laku</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Lihat data & PDF</div>
                                    </div>
                                    <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                                </div>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
