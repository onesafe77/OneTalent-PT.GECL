import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, ChevronRight, Truck } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export function FmsWidget() {
    // Default range: This Month
    const dateTimeRange = {
        start: format(startOfMonth(new Date()), "yyyy-MM-dd") + "T00:00",
        end: format(endOfMonth(new Date()), "yyyy-MM-dd") + "T23:59"
    };

    const buildQueryString = () => {
        const params = new URLSearchParams();
        const [startDate, startTime] = dateTimeRange.start.split("T");
        const [endDate, endTime] = dateTimeRange.end.split("T");
        params.append("startDate", startDate);
        params.append("endDate", endDate);
        if (startTime) params.append("startTime", startTime);
        if (endTime) params.append("endTime", endTime);
        return params.toString();
    };

    const { data: analytics } = useQuery({
        queryKey: ["fms-analytics-widget", dateTimeRange],
        queryFn: async () => {
            const res = await apiRequest(`/api/fms/analytics?${buildQueryString()}`, "GET");
            return res;
        },
        refetchInterval: 300000 // 5 mins
    });

    const validRate = analytics?.summary?.totalViolations
        ? ((analytics.summary.validCount / analytics.summary.totalViolations) * 100).toFixed(0)
        : 0;

    return (
        <Card className="h-full border-none shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
            <CardHeader className="bg-rose-50/50 pb-4 border-b border-rose-100/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base text-gray-900">FMS Values</CardTitle>
                            <CardDescription className="text-xs">Pelanggaran & Validasi</CardDescription>
                        </div>
                    </div>
                    <Link href="/workspace/hse/fms-dashboard">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                            Dashboard <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Total Pelanggaran</p>
                        <p className="text-2xl font-black text-gray-800">{analytics?.summary?.totalViolations || 0}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">Status Valid</p>
                        <BadgeRate value={validRate} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">Valid</span>
                        </div>
                        <p className="text-lg font-bold text-gray-800 pl-5.5">{analytics?.summary?.validCount || 0}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">Invalid</span>
                        </div>
                        <p className="text-lg font-bold text-gray-800 pl-5.5">{analytics?.summary?.invalidCount || 0}</p>
                    </div>
                </div>

                {analytics?.byViolation?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-medium uppercase mb-2">Top Pelanggaran</p>
                        <div className="space-y-2">
                            {analytics.byViolation.slice(0, 3).map((v: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600 truncate max-w-[120px]" title={v.type}>{v.type}</span>
                                    <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{v.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function BadgeRate({ value }: { value: string | number }) {
    const num = Number(value);
    const colorClass = num > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
            {value}%
        </span>
    );
}
