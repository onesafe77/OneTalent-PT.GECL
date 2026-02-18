
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ClipboardCheck, ArrowRight, Activity, AlertTriangle, TrafficCone, Truck, Shield, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SidakStats {
    totalSidak: number;
    totalFatigue: number;
    totalRoster: number;
    totalSeatbelt: number;
    totalRambu: number;
    totalAntrian: number;
    totalApd: number;
    totalJarak: number;
    totalKecepatan: number;
    totalPencahayaan: number;
    totalLoto: number;
    totalDigital: number;
    totalWorkshop: number;
    totalBehavior: number;
}

interface RecapData {
    stats: SidakStats;
}

export function SidakWidget() {
    const { data, isLoading } = useQuery<RecapData>({
        queryKey: ["/api/sidak/recap"],
        refetchInterval: 300000, // 5 mins
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

    const stats = data?.stats;

    const items = [
        { label: "Fatigue", value: stats?.totalFatigue || 0, icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Roster", value: stats?.totalRoster || 0, icon: ClipboardCheck, color: "text-purple-500", bg: "bg-purple-50" },
        { label: "Seatbelt", value: stats?.totalSeatbelt || 0, icon: Shield, color: "text-green-500", bg: "bg-green-50" },
        { label: "Rambu", value: stats?.totalRambu || 0, icon: TrafficCone, color: "text-amber-500", bg: "bg-amber-50" },
        { label: "Behavior", value: stats?.totalBehavior || 0, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50" },
    ];

    return (
        <Card className="h-full border-none shadow-sm bg-white dark:bg-gray-800 flex flex-col hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Inspeksi Sidak</CardTitle>
                            <CardDescription className="text-[10px] text-gray-500">Summary Inspeksi</CardDescription>
                        </div>
                    </div>
                    <Link href="/workspace/sidak">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2">
                            Dashboard <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col px-4 pb-4">
                <div className="flex items-baseline gap-2 mb-3 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                        {stats?.totalSidak || 0}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Total Inspeksi
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    {items.map((item) => (
                        <div key={item.label} className="flex flex-col p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase">{item.label}</span>
                                <item.icon className={`w-3 h-3 ${item.color}`} />
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
