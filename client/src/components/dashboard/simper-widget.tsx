import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, ArrowRight, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface SimperAnalytics {
    totalKaryawan: number;
    bibStats: {
        segera: number;
        mendekati: number;
        menuju: number;
        aktif: number;
    };
    tiaStats: {
        segera: number;
        mendekati: number;
        menuju: number;
        aktif: number;
    };
}

export function SimperWidget() {
    const { data: analytics, isLoading } = useQuery<SimperAnalytics>({
        queryKey: ["/api/simper-monitoring/analytics"],
        refetchInterval: 300000,
    });

    if (isLoading) {
        return (
            <Card className="h-full border-none shadow-sm bg-white dark:bg-gray-800 p-4">
                <Skeleton className="w-full h-8 mb-4" />
                <Skeleton className="w-full h-20 mb-4" />
                <Skeleton className="w-full h-24" />
            </Card>
        );
    }

    const bibUrgent = (analytics?.bibStats.segera || 0) + (analytics?.bibStats.mendekati || 0);
    const tiaUrgent = (analytics?.tiaStats.segera || 0) + (analytics?.tiaStats.mendekati || 0);
    const totalUrgent = bibUrgent + tiaUrgent;

    return (
        <Card className="h-full border-none shadow-sm bg-white dark:bg-gray-800 flex flex-col hover:shadow-md transition-all duration-200 group">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg transition-colors ${totalUrgent > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">SIMPER Monitor</CardTitle>
                            <CardDescription className="text-[10px] text-gray-500">Masa Berlaku Izin</CardDescription>
                        </div>
                    </div>
                    <Link href="/workspace/simper-monitoring">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2">
                            Detail <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col px-4 pb-4">
                <div className="flex items-baseline gap-2 mb-4 mt-1">
                    <span className={`text-3xl font-black ${totalUrgent > 0 ? "text-red-500" : "text-green-600"}`}>
                        {totalUrgent}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Need Action
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                    {/* BIB Stats */}
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-red-700 dark:text-red-400">BIB</span>
                            <AlertCircle className="w-3 h-3 text-red-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{bibUrgent}</span>
                            <span className="text-[10px] text-gray-500">Expired soon</span>
                        </div>
                    </div>

                    {/* TIA Stats */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">TIA</span>
                            <Clock className="w-3 h-3 text-blue-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{tiaUrgent}</span>
                            <span className="text-[10px] text-gray-500">Expired soon</span>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{(analytics?.bibStats.aktif || 0) + (analytics?.tiaStats.aktif || 0)} Simper Aktif</span>
                </div>
            </CardContent>
        </Card>
    );
}
