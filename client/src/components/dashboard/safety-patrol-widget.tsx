import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, Clock, ChevronRight, Activity } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface SafetyPatrolReport {
    id: string;
    tanggal: string;
    jenisLaporan: string;
    lokasi: string;
    status: string;
    temuan: string;
}

interface StatsData {
    totalReports: number;
    reportsByType: Record<string, number>;
}

export function SafetyPatrolWidget() {
    const { data: stats } = useQuery<StatsData>({
        queryKey: ['/api/safety-patrol/stats'],
        refetchInterval: 60000,
    });

    const { data: recentReports } = useQuery<SafetyPatrolReport[]>({
        queryKey: ['/api/safety-patrol/reports'],
        select: (data) => data.slice(0, 5), // Get only 5 recent
        refetchInterval: 60000,
    });

    return (
        <Card className="h-full border-none shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
            <CardHeader className="bg-orange-50/50 pb-4 border-b border-orange-100/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Shield className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base text-gray-900">Safety Patrol</CardTitle>
                            <CardDescription className="text-xs">Inspeksi & Temuan K3</CardDescription>
                        </div>
                    </div>
                    <Link href="/workspace/safety-patrol">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                            View All <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-red-600 font-medium">Temuan</span>
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                            {stats?.reportsByType?.["Temuan"] || 0}
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-blue-600 font-medium">Briefing</span>
                            <Activity className="w-3 h-3 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                            {stats?.reportsByType?.["Daily Briefing"] || 0}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aktivitas Terbaru</h4>
                    {recentReports?.length ? (
                        <div className="space-y-2">
                            {recentReports.map(report => (
                                <div key={report.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-white">
                                                {format(new Date(report.tanggal), "dd MMM", { locale: idLocale })}
                                            </Badge>
                                            <span className="text-xs font-medium text-gray-900 truncate">
                                                {report.jenisLaporan}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 truncate pl-1">
                                            {report.lokasi || "Lokasi tidak ada"}
                                        </p>
                                    </div>
                                    <div className="shrink-0 ml-2">
                                        {report.status === 'processed' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-yellow-500" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-gray-400">
                            Belum ada laporan
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
