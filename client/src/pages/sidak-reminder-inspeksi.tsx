import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    Bell, CheckCircle2, XCircle, Send, RefreshCw,
    ClipboardCheck, Users, AlertTriangle,
    Phone, Building2, Briefcase, BarChart2
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, LabelList, LineChart, Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SidakStatus {
    type: string;
    label: string;
    count: number;
    lastDate: string | null;
    done: boolean;
}

interface MonthlyCheckData {
    month: string;
    sidakTypes: SidakStatus[];
}

interface Supervisor {
    id: string;
    name: string;
    position: string | null;
    department: string | null;
    phone: string;
}

interface MonthHistory {
    month: string;
    label: string;
    done: number;
    notDone: number;
    total: number;
    percentage: number;
}

interface MonthlyHistoryData {
    history: MonthHistory[];
    totalTypes: number;
}

function formatMonthLabel(month: string) {
    try {
        return format(new Date(month + "-01"), "MMMM yyyy", { locale: idLocale });
    } catch {
        return month;
    }
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    try {
        return format(new Date(dateStr), "dd MMM yyyy", { locale: idLocale });
    } catch {
        return dateStr;
    }
}

function buildMessage(month: string, sidakTypes: SidakStatus[]): string {
    const monthLabel = formatMonthLabel(month);
    const done = sidakTypes.filter(s => s.done);
    const notDone = sidakTypes.filter(s => !s.done);

    const doneList = done.map(s => `  ✅ ${s.label} (terakhir: ${formatDate(s.lastDate)})`).join("\n");
    const notDoneList = notDone.map(s => `  ❌ ${s.label}`).join("\n");

    return `🔔 *REMINDER INSPEKSI BULANAN*
Periode: ${monthLabel}

Yth. Bapak/Ibu Pengawas,

Berikut adalah status pelaksanaan inspeksi/sidak bulan ${monthLabel}:

✅ *Sudah Dilakukan (${done.length} jenis):*
${doneList || "  (Belum ada)"}

❌ *Belum Dilakukan (${notDone.length} jenis):*
${notDoneList || "  (Semua sudah dilakukan 👍)"}

Mohon segera pastikan seluruh inspeksi terlaksana sesuai jadwal.

📋 OneTalent - HSE System`;
}

export default function SidakReminderInspeksi() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
    const [customMessage, setCustomMessage] = useState<string>("");
    const [sendResults, setSendResults] = useState<{ name: string; phone: string; status: string }[] | null>(null);
    const { toast } = useToast();

    const { data: historyData, refetch: refetchHistory } = useQuery<MonthlyHistoryData>({
        queryKey: ['/api/sidak/monthly-history', selectedMonth],
        queryFn: () => apiRequest(`/api/sidak/monthly-history?months=6&endMonth=${selectedMonth}`),
    });

    const { data: monthlyData, isLoading: loadingMonthly, refetch } = useQuery<MonthlyCheckData>({
        queryKey: ['/api/sidak/monthly-check', selectedMonth],
        queryFn: () => apiRequest(`/api/sidak/monthly-check?month=${selectedMonth}`),
    });

    const { data: supervisors, isLoading: loadingSupervisors } = useQuery<Supervisor[]>({
        queryKey: ['/api/sidak/supervisors'],
    });

    const autoMessage = useMemo(() => {
        if (!monthlyData) return "";
        return buildMessage(selectedMonth, monthlyData.sidakTypes);
    }, [monthlyData, selectedMonth]);

    const message = customMessage || autoMessage;

    const seedMutation = useMutation({
        mutationFn: async (months: string[]) =>
            apiRequest('/api/sidak/seed-months', 'POST', { months }),
        onSuccess: (data: any) => {
            toast({ title: "Data berhasil ditambahkan", description: `${data.created} sesi dibuat untuk ${data.months.join(', ')}` });
            queryClient.invalidateQueries({ queryKey: ['/api/sidak/monthly-history'] });
            queryClient.invalidateQueries({ queryKey: ['/api/sidak/monthly-check'] });
        },
        onError: () => toast({ title: "Gagal", description: "Gagal menambahkan data seed", variant: "destructive" }),
    });

    const sendMutation = useMutation({
        mutationFn: async () => {
            return apiRequest('/api/sidak/send-inspection-reminder', 'POST', {
                month: selectedMonth,
                supervisorIds: selectedSupervisors,
                message,
            });
        },
        onSuccess: (data: any) => {
            setSendResults(data.results);
            toast({
                title: "Reminder Terkirim",
                description: `${data.sent} berhasil, ${data.failed} gagal`,
                variant: data.failed > 0 ? "destructive" : "default",
            });
        },
        onError: () => {
            toast({ title: "Gagal", description: "Gagal mengirim reminder", variant: "destructive" });
        }
    });

    const sidakTypes = monthlyData?.sidakTypes || [];
    const doneCount = sidakTypes.filter(s => s.done).length;
    const notDoneCount = sidakTypes.filter(s => !s.done).length;

    const toggleSupervisor = (id: string) => {
        setSelectedSupervisors(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (!supervisors) return;
        if (selectedSupervisors.length === supervisors.length) {
            setSelectedSupervisors([]);
        } else {
            setSelectedSupervisors(supervisors.map(s => s.id));
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="h-6 w-6 text-orange-500" />
                        Reminder Pelaksanaan Inspeksi
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Monitor pelaksanaan sidak bulanan dan kirim reminder ke pengawas via WhatsApp
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Periode</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => { setSelectedMonth(e.target.value); setCustomMessage(""); setSendResults(null); }}
                            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { refetch(); refetchHistory(); }} className="mt-5">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
                            <ClipboardCheck className="h-4 w-4" /> Total Jenis Sidak
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{sidakTypes.length}</p>
                        <p className="text-xs text-gray-400 mt-1">periode {formatMonthLabel(selectedMonth)}</p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Sudah Dilakukan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-700">{doneCount}</p>
                        <p className="text-xs text-green-600 mt-1">dari {sidakTypes.length} jenis</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> Belum Dilakukan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-700">{notDoneCount}</p>
                        <p className="text-xs text-red-600 mt-1">perlu segera dilaksanakan</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts: Riwayat Pencapaian */}
            {historyData && historyData.history.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bar Chart: Done vs Not Done per month */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <BarChart2 className="h-4 w-4 text-orange-500" />
                                    Rekapitulasi 6 Bulan Terakhir
                                </CardTitle>
                                {historyData.history.some(h => h.done < h.total) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 px-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                                        disabled={seedMutation.isPending}
                                        onClick={() => {
                                            if (window.confirm("Ini akan menambahkan data seed untuk Jan–Apr 2026 (semua 24 jenis sidak). Lanjutkan?")) {
                                                seedMutation.mutate(["2026-01", "2026-02", "2026-03", "2026-04"]);
                                            }
                                        }}
                                    >
                                        {seedMutation.isPending ? (
                                            <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Memproses...</>
                                        ) : (
                                            "Isi Data Jan–Apr 2026"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={historyData.history} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} domain={[0, historyData.totalTypes]} />
                                    <Tooltip
                                        formatter={(v: number, name: string) => [
                                            `${v} jenis`,
                                            name === "done" ? "Terlaksana" : "Belum"
                                        ]}
                                    />
                                    <Legend formatter={(v) => v === "done" ? "Terlaksana" : "Belum Terlaksana"} />
                                    <Bar dataKey="done" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a">
                                        <LabelList dataKey="done" position="inside" style={{ fontSize: 11, fontWeight: 700, fill: "#fff" }} />
                                    </Bar>
                                    <Bar dataKey="notDone" fill="#fca5a5" radius={[4, 4, 0, 0]} stackId="a">
                                        <LabelList dataKey="notDone" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "#dc2626" }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Line Chart: Persentase pencapaian */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <BarChart2 className="h-4 w-4 text-blue-500" />
                                Tren Tingkat Kepatuhan (%)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={historyData.history} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [`${v}%`, "Kepatuhan"]} />
                                    <Line
                                        type="monotone"
                                        dataKey="percentage"
                                        stroke="#f97316"
                                        strokeWidth={2.5}
                                        dot={{ r: 5, fill: "#f97316" }}
                                        label={{ position: "top", fontSize: 11, fontWeight: 700, fill: "#f97316", formatter: (v: number) => `${v}%` }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sidak Status Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardCheck className="h-5 w-5 text-orange-500" />
                        Status Pelaksanaan Sidak — {formatMonthLabel(selectedMonth)}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingMonthly ? (
                        <div className="text-center py-8 text-gray-400">Memuat data...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sidakTypes.map(s => (
                                <div
                                    key={s.type}
                                    className={`rounded-lg border-2 p-3 ${s.done
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-red-200 bg-red-50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                        <span className="text-xs font-semibold leading-tight">{s.label}</span>
                                        {s.done
                                            ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                            : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        }
                                    </div>
                                    {s.done ? (
                                        <>
                                            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1.5">
                                                {s.count}x dilakukan
                                            </Badge>
                                            <p className="text-[10px] text-green-700 mt-1">
                                                Terakhir: {formatDate(s.lastDate)}
                                            </p>
                                        </>
                                    ) : (
                                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5">
                                            Belum dilakukan
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Supervisors Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-5 w-5 text-blue-500" />
                        Daftar Pengawas Penerima Reminder
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingSupervisors ? (
                        <div className="text-center py-4 text-gray-400">Memuat data...</div>
                    ) : !supervisors?.length ? (
                        <div className="text-center py-6 text-gray-400">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Tidak ada karyawan dengan jabatan Group Leader ditemukan</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={selectedSupervisors.length === supervisors.length && supervisors.length > 0}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead>Nama Karyawan</TableHead>
                                    <TableHead>Jabatan</TableHead>
                                    <TableHead>Departemen</TableHead>
                                    <TableHead>No. HP</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supervisors.map(sup => {
                                    const result = sendResults?.find(r => r.name === sup.name);
                                    return (
                                        <TableRow key={sup.id} className={selectedSupervisors.includes(sup.id) ? "bg-blue-50" : ""}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedSupervisors.includes(sup.id)}
                                                    onCheckedChange={() => toggleSupervisor(sup.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-sm">{sup.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{sup.id}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                                                    {sup.position || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                                    {sup.department || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                    {sup.phone || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {result ? (
                                                    result.status === 'sent'
                                                        ? <Badge className="bg-green-100 text-green-800 border-green-200">Terkirim</Badge>
                                                        : <Badge className="bg-red-100 text-red-800 border-red-200">Gagal</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-400">Belum dikirim</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Message Preview & Send */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Send className="h-5 w-5 text-green-600" />
                        Pesan WhatsApp
                        {customMessage && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto text-xs text-gray-400"
                                onClick={() => setCustomMessage("")}
                            >
                                Reset ke otomatis
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={message}
                        onChange={e => setCustomMessage(e.target.value)}
                        rows={16}
                        className="font-mono text-xs bg-gray-50"
                        placeholder="Pesan akan terbentuk otomatis setelah data dimuat..."
                    />
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            {selectedSupervisors.length === 0
                                ? <span className="text-orange-500 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Pilih minimal 1 pengawas</span>
                                : <span className="text-blue-600">{selectedSupervisors.length} pengawas dipilih</span>
                            }
                        </div>
                        <Button
                            onClick={() => sendMutation.mutate()}
                            disabled={selectedSupervisors.length === 0 || !message || sendMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {sendMutation.isPending ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Mengirim...</>
                            ) : (
                                <><Send className="h-4 w-4 mr-2" /> Kirim Reminder WhatsApp</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
