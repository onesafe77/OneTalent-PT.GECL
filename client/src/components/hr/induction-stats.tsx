
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { format, parseISO, getMonth, getHours, isSameDay, isSameMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Users, CalendarCheck, Clock, TrendingUp } from "lucide-react";

interface InductionAttendance {
    id: string;
    nik: string;
    namaKaryawan: string;
    jabatan: string;
    nomorTelepon: string | null;
    pemateri: string;
    tandaTangan: string;
    tanggalRefreshInduksi: string; // YYYY-MM-DD
    waktu: string | null; // HH:mm:ss
    createdAt: string;
}

interface InductionStatsProps {
    data: InductionAttendance[];
    year: string;
}

const COLORS = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];

export function InductionStats({ data, year }: InductionStatsProps) {
    // --- 1. Summary Cards Logic ---
    const summary = useMemo(() => {
        const today = new Date();
        const totalParticipants = data.length;

        const thisMonth = data.filter(item => {
            const date = new Date(item.tanggalRefreshInduksi);
            return isSameMonth(date, today) && date.getFullYear() === today.getFullYear();
        }).length;

        const todayCount = data.filter(item => {
            return isSameDay(new Date(item.tanggalRefreshInduksi), today);
        }).length;

        // Calculate average participants per month
        const avgPerMonth = totalParticipants / 12;

        return { totalParticipants, thisMonth, todayCount, avgPerMonth };
    }, [data]);

    // --- 2. Monthly Trend Logic ---
    const monthlyData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(parseInt(year), i, 1), "MMM", { locale: idLocale }),
            count: 0
        }));

        data.forEach(item => {
            const date = new Date(item.tanggalRefreshInduksi);
            if (date.getFullYear().toString() === year) {
                months[getMonth(date)].count += 1;
            }
        });

        return months;
    }, [data, year]);

    // --- 3. Position Distribution Logic ---
    const positionData = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(item => {
            const pos = item.jabatan || "Tidak Ada Jabatan";
            counts[pos] = (counts[pos] || 0) + 1;
        });

        const result = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 positions only

        const topCount = result.reduce((acc, curr) => acc + curr.value, 0);
        if (data.length > topCount) {
            result.push({ name: "Lainnya", value: data.length - topCount });
        }

        return result;
    }, [data]);

    // --- 4. Hourly Distribution Logic (Time Evaluation) ---
    const hourlyData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i.toString().padStart(2, '0')}:00`,
            fullHour: i,
            count: 0
        }));

        data.forEach(item => {
            if (item.waktu) {
                const parts = item.waktu.split(':');
                if (parts.length >= 1) {
                    const h = parseInt(parts[0], 10);
                    if (!isNaN(h) && h >= 0 && h < 24) {
                        hours[h].count += 1;
                    }
                }
            } else if (item.createdAt) {
                const h = new Date(item.createdAt).getHours();
                hours[h].count += 1;
            }
        });

        return hours.filter(h => h.fullHour >= 6 && h.fullHour <= 20); // Focus on active hours
    }, [data]);

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Summary Cards - More Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-red-600 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Peserta ({year})</p>
                                <div className="text-3xl font-bold mt-1 text-gray-900">{summary.totalParticipants}</div>
                                <p className="text-[10px] text-gray-400 mt-1">Karyawan terdata</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg">
                                <Users className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-600 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bulan Ini</p>
                                <div className="text-3xl font-bold mt-1 text-gray-900">{summary.thisMonth}</div>
                                <p className="text-[10px] text-gray-400 mt-1">Peserta baru</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <CalendarCheck className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-green-600 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Hari Ini</p>
                                <div className="text-3xl font-bold mt-1 text-gray-900">{summary.todayCount}</div>
                                <p className="text-[10px] text-gray-400 mt-1">Sedang berlangsung</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Clock className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-orange-600 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata/Bulan</p>
                                <div className="text-3xl font-bold mt-1 text-gray-900">{Math.round(summary.avgPerMonth)}</div>
                                <p className="text-[10px] text-gray-400 mt-1">Estimasi frekuensi</p>
                            </div>
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Monthly Trend Chart - Spans 8 cols */}
                <Card className="shadow-sm lg:col-span-8">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Tren Absensi Bulanan</CardTitle>
                        <CardDescription>Visualisasi jumlah peserta per bulan</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#dc2626"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                    name="Peserta"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Position Distribution - Spans 4 cols - Taller Vertical List */}
                <Card className="shadow-sm lg:col-span-4 flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Top Jabatan</CardTitle>
                        <CardDescription>Dominasi peserta berdasarkan jabatan</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[400px] flex flex-col p-4">
                        <div className="flex-1 w-full min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={positionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {positionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 space-y-3 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                            {positionData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between text-sm group">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-gray-600 font-medium truncate max-w-[150px]" title={entry.name}>
                                            {entry.name}
                                        </span>
                                    </div>
                                    <span className="font-bold text-gray-900">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Time Evaluation - Full Width */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Evaluasi Waktu Induksi</CardTitle>
                    <CardDescription>Analisis jam sibuk pelaksanaan induksi (06:00 - 20:00)</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="hour"
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#2563eb"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorTime)"
                                name="Peserta"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
