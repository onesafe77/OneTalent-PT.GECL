import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart3,
    CheckCircle2,
    AlertCircle,
    Clock,
    FileWarning,
    TrendingUp,
    Download
} from "lucide-react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Button } from "@/components/ui/button";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

// Type definitions
interface DashboardStats {
    overallCompliance: number;
    mandatoryCompliance: number;
    openDevelopment: number;
    dataErrors: number;
    totalEntries: number;
    totalMandatory: number;
    totalComplied: number;
}

interface DepartmentCompliance {
    department: string;
    compliance: number;
}

interface TnaSummaryRow {
    employeeId: string;
    employeeName: string;
    position: string;
    department: string;
    period: string;
    planMandatory: number;
    planDevelopment: number;
    totalPlan: number;
    actualComplied: number;
    actualNotComplied: number;
    mandatoryCompliance: number | null;
    overallCompliance: number | null;
    trainingCount: number;
}

export default function TnaDashboard() {
    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ["/api/hse/tna-dashboard/stats"],
    });

    const { data: gaps, isLoading: gapsLoading } = useQuery<{ trainingName: string, gap: number }[]>({
        queryKey: ["/api/hse/tna-dashboard/gap-analysis"],
    });

    const { data: deptCompliance, isLoading: deptLoading } = useQuery<DepartmentCompliance[]>({
        queryKey: ["/api/hse/tna-dashboard/department-compliance"],
    });

    // Fetch all TNA entries for the table (aggregated by employee + period)
    const { data: allEntries, isLoading: entriesLoading } = useQuery<TnaSummaryRow[]>({
        queryKey: ["/api/hse/tna-dashboard/all-entries"],
    });

    const kpiCards = [
        {
            title: "Overall Compliance",
            value: stats ? `${stats.overallCompliance}%` : "-",
            desc: "Total plan fulfilled",
            icon: CheckCircle2,
            color: "text-foreground",
            bg: "bg-muted"
        },
        {
            title: "Mandatory Compliance",
            value: stats ? `${stats.mandatoryCompliance}%` : "-",
            desc: "Critical training completed",
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-900/10"
        },
        {
            title: "Open Development",
            value: stats ? stats.openDevelopment : "-", // Real data from API
            desc: "Plan D not yet C",
            icon: TrendingUp,
            color: "text-orange-600",
            bg: "bg-orange-50 dark:bg-orange-900/10"
        },
        {
            title: "Data Errors",
            value: stats ? stats.dataErrors : "-",
            desc: "Missing Plan/Actual Logic",
            icon: FileWarning,
            color: "text-gray-600",
            bg: "bg-gray-50 dark:bg-gray-900/10"
        }
    ];

    const gapChartData = {
        labels: gaps?.map(g => g.trainingName) || [],
        datasets: [
            {
                label: 'Gap (Training needed)',
                data: gaps?.map(g => g.gap) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 4
            }
        ]
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-black min-h-screen font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
                        TNA Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">Training Needs Analysis & Compliance Overview</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> Export Report
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                                <h3 className={`text-2xl font-bold mt-1 ${card.color}`}>{statsLoading ? "..." : card.value}</h3>
                                <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${card.bg}`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-2 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Gap Analysis by Training Name</CardTitle>
                        <CardDescription>Top 10 Unresolved Training Needs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            {gapsLoading ? (
                                <div className="flex items-center justify-center h-full text-gray-400">Loading chart...</div>
                            ) : (
                                <Bar options={{
                                    maintainAspectRatio: false,
                                    indexAxis: 'y' as const,
                                    plugins: {
                                        legend: { display: false }
                                    }
                                }} data={gapChartData} />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Department Compliance</CardTitle>
                        <CardDescription>Top departments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {deptLoading ? (
                                <div className="text-gray-400 text-sm">Loading...</div>
                            ) : deptCompliance && deptCompliance.length > 0 ? (
                                deptCompliance.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{d.department}</span>
                                            <span className="text-xs text-gray-400">Target: 85%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${d.compliance >= 85 ? 'bg-primary' : 'bg-red-500'}`}
                                                    style={{ width: `${d.compliance}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold w-8 text-right">{d.compliance}%</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-400 text-sm">No data available</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TNA Summary Table (Aggregated per Employee + Period) */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>All TNA Entries</CardTitle>
                    <CardDescription>Summary per employee per period - auto-updates on save</CardDescription>
                </CardHeader>
                <CardContent>
                    {entriesLoading ? (
                        <div className="text-gray-400 text-center py-8">Loading entries...</div>
                    ) : allEntries && allEntries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50 dark:bg-zinc-900">
                                        <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">NIK</th>
                                        <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">Employee Name</th>
                                        <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">Jabatan</th>
                                        <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">Department</th>
                                        <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs">PLAN (M)</th>
                                        <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs">ACTUAL (C)</th>
                                        <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs">Compliance (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allEntries.map((row, idx) => (
                                        <tr key={`${row.employeeId}_${row.period}_${idx}`} className="border-b hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                                            <td className="px-3 py-2 text-xs text-gray-500 font-mono">{row.employeeId}</td>
                                            <td className="px-3 py-2"><span className="font-bold text-sm">{row.employeeName}</span></td>
                                            <td className="px-3 py-2 text-xs text-gray-400">{row.position}</td>
                                            <td className="px-3 py-2 text-xs text-gray-500">{row.department}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                    {row.planMandatory}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                                    {row.actualComplied}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {row.planMandatory > 0 ? (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${(row.mandatoryCompliance ?? 0) >= 100 ? 'bg-muted text-foreground' :
                                                        (row.mandatoryCompliance ?? 0) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {row.mandatoryCompliance}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-center py-8">No TNA entries yet. Start by adding training assignments in TNA Input.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
