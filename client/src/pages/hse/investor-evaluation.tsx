
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Loader2,
    Calendar,
    AlertTriangle,
    Shield,
    Users,
    Car,
    FileSpreadsheet,
    TrendingUp,
    Activity
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    ChartDataLabels
);

export default function InvestorEvaluationPage() {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

    const { data, isLoading, isError } = useQuery({
        queryKey: ["investor-evaluation", startDate, endDate],
        queryFn: async () => {
            const res = await apiRequest(`/api/fms/investor-evaluation?startDate=${startDate}&endDate=${endDate}`, "GET");
            return res;
        }
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            <p className="text-muted-foreground animate-pulse font-medium">Memuat Data Evaluasi...</p>
        </div>
    );

    if (isError) return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-destructive">
            <AlertTriangle className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-bold">Gagal Memuat Data</h2>
            <p className="text-muted-foreground mt-2">Terjadi kesalahan saat mengambil data dari server.</p>
            <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Coba Lagi</Button>
        </div>
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
            datalabels: {
                color: '#475569',
                font: { weight: 'bold' as const },
                formatter: (value: number) => value > 0 ? value : ''
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Evaluasi Investor Group</h1>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium ml-4">Monitoring Pelanggaran Valid per Unit & Investor</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                    <input
                        type="date"
                        className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="text-slate-300 text-xs font-bold px-1">s/d</span>
                    <input
                        type="date"
                        className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Pelanggaran Valid"
                    value={data?.summary?.total || 0}
                    icon={<Shield className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-600"
                    description="Total semua kategori valid"
                />
                <KPICard
                    title="Overspeed"
                    value={data?.summary?.overspeed || 0}
                    icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-600"
                    description="Kecepatan melebihi batas"
                />
                <KPICard
                    title="Jarak Aman"
                    value={data?.summary?.jarakAman || 0}
                    icon={<AlertTriangle className="w-6 h-6 text-rose-600" />}
                    color="bg-rose-600"
                    description="Pelanggaran jarak kendaraan"
                />
                <KPICard
                    title="Monitoring Fatigue"
                    value={data?.summary?.fatigue || 0}
                    icon={<Activity className="w-6 h-6 text-emerald-600" />}
                    color="bg-emerald-600"
                    description="Indikasi kelelahan/mengantuk"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <Card className="xl:col-span-2 shadow-sm border-none bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-lg font-bold">Top 10 Pelanggaran per Investor Group</CardTitle>
                        <CardDescription>Peringkat 10 besar pemilik unit dengan pelanggaran terbanyak</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px] p-6">
                        <Bar
                            data={{
                                labels: data?.byInvestor?.slice(0, 10).map((i: any) => i.company || "Unknown"),
                                datasets: [
                                    {
                                        label: "Total Pelanggaran",
                                        data: data?.byInvestor?.slice(0, 10).map((i: any) => i.total),
                                        backgroundColor: "rgba(37, 99, 235, 0.8)",
                                        borderRadius: 8,
                                    }
                                ]
                            }}
                            options={chartOptions}
                        />
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-lg font-bold">Komposisi Pelanggaran</CardTitle>
                        <CardDescription>Persentase berdasarkan kategori</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px] flex items-center justify-center p-6 bg-slate-50/20">
                        <Doughnut
                            data={{
                                labels: ["Overspeed", "Jarak Aman", "Fatigue"],
                                datasets: [{
                                    data: [
                                        data?.summary?.overspeed || 0,
                                        data?.summary?.jarakAman || 0,
                                        data?.summary?.fatigue || 0
                                    ],
                                    backgroundColor: [
                                        "rgba(249, 115, 22, 0.8)",
                                        "rgba(225, 29, 72, 0.8)",
                                        "rgba(16, 185, 129, 0.8)"
                                    ],
                                    borderWidth: 0,
                                }]
                            }}
                            options={{
                                ...chartOptions,
                                cutout: "70%",
                            }}
                        />
                        <div className="absolute text-center">
                            <p className="text-3xl font-black text-slate-800">{data?.summary?.total || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center">Total Valid</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table Section */}
            <Card className="shadow-lg border-none bg-white rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black flex items-center gap-3">
                                <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                                Matrix Evaluasi Unit & Investor
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium text-base">
                                Breakdown pelanggaran per Nomor Lambung dan Pemilik Unit
                            </CardDescription>
                        </div>
                        <Button
                            variant="secondary"
                            className="bg-white/10 hover:bg-white/20 border-white/10 text-white font-bold rounded-xl h-12 px-6"
                            onClick={() => {
                                // Logic for export could be added here
                                alert("Fitur Export akan segera tersedia");
                            }}
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export Data
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 border-slate-100 hover:bg-slate-50/80">
                                    <TableHead className="w-[80px] p-6 text-center font-bold text-slate-500 uppercase tracking-wider text-xs">No</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-500 uppercase tracking-wider text-xs">Nomor Lambung</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">Pemilik Unit / Investor</TableHead>
                                    <TableHead className="p-6 font-bold text-orange-600 uppercase tracking-wider text-xs text-center bg-orange-50/30">Overspeed</TableHead>
                                    <TableHead className="p-6 font-bold text-rose-600 uppercase tracking-wider text-xs text-center bg-rose-50/30">Jarak Aman</TableHead>
                                    <TableHead className="p-6 font-bold text-emerald-600 uppercase tracking-wider text-xs text-center bg-emerald-50/30">Fatigue</TableHead>
                                    <TableHead className="p-6 font-bold text-slate-900 uppercase tracking-wider text-xs text-center bg-slate-100/50">Total Valid</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.byUnit?.map((unit: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-50 hover:bg-blue-50/30 transition-colors group">
                                        <TableCell className="p-6 text-center font-mono text-slate-400 group-hover:text-blue-500 transition-colors">{idx + 1}</TableCell>
                                        <TableCell className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform">
                                                    <Car className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <span className="font-black text-slate-700 tracking-tight text-lg">{unit.vehicleNo}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-6 text-center">
                                            <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-bold px-3 py-1 rounded-lg">
                                                <Users className="w-3 h-3 mr-1.5" />
                                                {unit.company || "-"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="p-6 text-center text-orange-700 font-black text-xl bg-orange-50/20">{unit.overspeed || 0}</TableCell>
                                        <TableCell className="p-6 text-center text-rose-700 font-black text-xl bg-rose-50/20">{unit.jarakAman || 0}</TableCell>
                                        <TableCell className="p-6 text-center text-emerald-700 font-black text-xl bg-emerald-50/20">{unit.fatigue || 0}</TableCell>
                                        <TableCell className="p-6 text-center text-slate-900 font-black text-xl bg-slate-100/30 group-hover:bg-blue-100/50 transition-colors">
                                            {unit.total || 0}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!data?.byUnit || data.byUnit.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="p-20 text-center text-muted-foreground italic font-medium">
                                            Tidak ada data pelanggaran valid ditemukan untuk periode ini.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function KPICard({ title, value, icon, color, description }: any) {
    return (
        <Card className="shadow-sm hover:shadow-xl transition-all duration-300 border-none bg-white p-6 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
            <div className="flex justify-between items-start">
                <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">{title}</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight">{value}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
                </div>
                <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
            </div>
        </Card>
    );
}
