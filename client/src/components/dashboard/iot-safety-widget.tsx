
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Gauge, ArrowRight, Maximize2, Zap, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Papa from "papaparse";

interface IotStats {
    overspeed: number;
    jarak: number;
    fatigue: number;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX9zYvZSIKyKXx-DfhyXZCdTMuqhPY_kXu_WxMWEZ-MHPR779_x_0NklR1VjDGN1e7aoloMaDf5jk9/pub?gid=1467622739&single=true&output=csv";

export function IotSafetyWidget() {
    const [stats, setStats] = useState<IotStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(CSV_URL);
                const text = await res.text();
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const rows = results.data as any[];
                        // Simple count for now, as full parsing is heavy
                        // Assuming rows are individual events
                        const overspeedCount = rows.filter(r => r["Violation"]?.toLowerCase().includes("overspeed")).length;
                        const jarakCount = rows.filter(r => r["Violation"]?.toLowerCase().includes("jarak")).length; // Assuming logical mapping
                        // Since 'jarak' might not be in the same CSV or named differently, we'll just check specific keywords
                        // Or if this CSV is mostly overspeed/fatigue

                        // Check for fatigue keywords if present
                        const fatigueCount = rows.filter(r => r["Violation"]?.toLowerCase().includes("fatigue") || r["Violation"]?.toLowerCase().includes("merokok")).length;

                        setStats({
                            overspeed: overspeedCount || 0,
                            jarak: jarakCount || 0,
                            fatigue: fatigueCount || 0
                        });
                        setLoading(false);
                    },
                    error: () => setLoading(false)
                });
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Card className="h-full border-none shadow-sm bg-white dark:bg-gray-800 p-4">
                <Skeleton className="w-full h-8 mb-4" />
                <Skeleton className="w-full h-20 mb-4" />
                <Skeleton className="w-full h-24" />
            </Card>
        );
    }

    // Placeholder logic for Jarak if CSV doesn't have it (likely mostly overspeed)
    // We'll use a proportional dummy or just 0 if not found
    const displayOverspeed = stats?.overspeed || 0;
    const displayFatigue = stats?.fatigue || 0;

    return (
        <Card className="h-full border-none shadow-sm bg-white dark:bg-gray-800 flex flex-col hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">IoT Safety</CardTitle>
                            <CardDescription className="text-[10px] text-gray-500">Telematics & Monitoring</CardDescription>
                        </div>
                    </div>
                    <Link href="/workspace/hse/overspeed">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2">
                            Dashboard <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col px-4 pb-4">
                <div className="flex items-baseline gap-2 mb-4 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                        {displayOverspeed + displayFatigue}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Total Alerts
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="flex flex-col p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Gauge className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[10px] font-medium text-gray-600 uppercase">Overspeed</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{displayOverspeed}</span>
                    </div>

                    <div className="flex flex-col p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-[10px] font-medium text-gray-600 uppercase">Fatigue/Oth</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{displayFatigue}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
