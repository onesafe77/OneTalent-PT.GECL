
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Zap, RefreshCw, SendHorizonal, CalendarCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { InductionSchedule, Employee } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

type ScheduleWithEmployee = InductionSchedule & { employee: Employee };

export default function PushNotificationInduction() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);

    const { data: schedules, isLoading } = useQuery<ScheduleWithEmployee[]>({
        queryKey: ["/api/induction/schedules"],
    });

    const pendingSchedules = schedules?.filter(s => s.status === "pending") || [];
    const belumDikirim = pendingSchedules.filter(s => !s.notifiedAt).length;

    // Generate H-1 dari roster lama
    const generateMutation = useMutation({
        mutationFn: async () => apiRequest("/api/induction/generate-schedules", "POST", {}),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/schedules"] });
            toast({ title: "Berhasil", description: data.message || `${data.count} jadwal baru digenerate` });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Generate", description: error.message, variant: "destructive" });
        }
    });

    // Sinkron Roster H-1 (tanpa kirim WA)
    const syncRosterMutation = useMutation({
        mutationFn: async () => apiRequest("/api/induction/sync-roster", "POST", { sendReminder: false }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/schedules"] });
            setSyncResult(data);
            toast({ title: "Sinkron Selesai", description: data.message });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Sinkron", description: error.message, variant: "destructive" });
        }
    });

    // Sinkron Roster H-1 + Kirim WA sekaligus
    const syncAndSendMutation = useMutation({
        mutationFn: async () => apiRequest("/api/induction/sync-roster", "POST", { sendReminder: true }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/schedules"] });
            setSyncResult(data);
            toast({ title: "Sinkron & Kirim Selesai", description: data.message });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    // Kirim WA ke semua pending
    const sendAllMutation = useMutation({
        mutationFn: async () => apiRequest("/api/induction/send-all-pending", "POST", {}),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/schedules"] });
            toast({ title: "Kirim Semua Selesai", description: data.message });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Kirim", description: error.message, variant: "destructive" });
        }
    });

    // Kirim satu reminder
    const sendReminderMutation = useMutation({
        mutationFn: async (scheduleId: string) => apiRequest("/api/induction/send-reminder", "POST", { scheduleId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/schedules"] });
            toast({ title: "Berhasil", description: "Pengingat WhatsApp berhasil dikirim" });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleSend = async (scheduleId: string) => {
        setSendingId(scheduleId);
        try {
            await sendReminderMutation.mutateAsync(scheduleId);
        } finally {
            setSendingId(null);
        }
    };

    const isAnyLoading = generateMutation.isPending || syncRosterMutation.isPending || syncAndSendMutation.isPending || sendAllMutation.isPending;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Push Notifikasi - Induksi K3</h1>
                    <p className="text-muted-foreground">Kirim pengingat WhatsApp ke driver yang memiliki jadwal induksi pending.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => generateMutation.mutate()}
                        disabled={isAnyLoading}
                        variant="outline"
                        className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700"
                    >
                        {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                        Generate Jadwal H-1
                    </Button>
                    <Button
                        onClick={() => syncRosterMutation.mutate()}
                        disabled={isAnyLoading}
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                    >
                        {syncRosterMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Sinkron Roster
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirm(`Sinkron roster H-1 dan langsung kirim WA ke semua driver yang besok kerja setelah cuti?`))
                                syncAndSendMutation.mutate();
                        }}
                        disabled={isAnyLoading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {syncAndSendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
                        Sinkron Roster & Kirim WA
                    </Button>
                    {belumDikirim > 0 && (
                        <Button
                            onClick={() => {
                                if (confirm(`Kirim WA reminder ke ${belumDikirim} driver yang belum menerima notifikasi?`))
                                    sendAllMutation.mutate();
                            }}
                            disabled={isAnyLoading}
                            variant="secondary"
                        >
                            {sendAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SendHorizonal className="h-4 w-4 mr-2" />}
                            Kirim Semua ({belumDikirim})
                        </Button>
                    )}
                </div>
            </div>

            {/* Hasil Sinkron Roster */}
            {syncResult && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-700">Hasil Sinkron Roster H-1</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-800 font-medium mb-2">{syncResult.message}</p>
                        {syncResult.drivers?.length > 0 ? (
                            <div className="space-y-1">
                                {syncResult.drivers.map((d: any, i: number) => (
                                    <div key={i} className="text-xs text-blue-700 flex gap-2 items-center">
                                        <Badge variant="outline" className={d.action === 'created' ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-300 text-gray-600'}>
                                            {d.action === 'created' ? 'Baru' : 'Sudah Ada'}
                                        </Badge>
                                        <span>ID: {d.employeeId} — Cuti {d.consecutiveLeaveDays} hari berturut — Kerja besok {d.scheduledDate}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-blue-600">Tidak ada driver yang terdeteksi kembali dari cuti besok.</p>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Jadwal Induksi Pending ({pendingSchedules.length})</CardTitle>
                    <CardDescription>
                        Daftar karyawan yang belum menyelesaikan induksi. {belumDikirim > 0 && <span className="text-amber-600 font-medium">{belumDikirim} belum dikirim WA.</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : pendingSchedules.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">Tidak ada jadwal pending saat ini.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Karyawan</TableHead>
                                    <TableHead>NIK</TableHead>
                                    <TableHead>Tanggal Jadwal</TableHead>
                                    <TableHead>Status Notifikasi</TableHead>
                                    <TableHead>Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingSchedules.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.employee.name}</TableCell>
                                        <TableCell>{s.employee.id}</TableCell>
                                        <TableCell>{new Date(s.scheduledDate).toLocaleDateString("id-ID")}</TableCell>
                                        <TableCell>
                                            {s.notifiedAt ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Terkirim: {new Date(s.notifiedAt).toLocaleDateString()}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-500">Belum Dikirim</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSend(s.id)}
                                                disabled={sendingId === s.id || isAnyLoading}
                                            >
                                                {sendingId === s.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Send className="h-4 w-4 mr-2" />
                                                )}
                                                Kirim Reminder
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Preview Pesan WhatsApp</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-white rounded-lg border text-sm whitespace-pre-wrap">
                        {`Yth. [Nama Karyawan],

Harap segera merapat ke kantor untuk melakukan *Refresh Induksi* dan *Pengambilan SIMPER* pada:
📅 Tanggal: *[Tanggal]*
🕒 Pukul: *14:00 WITA*

Kehadiran Anda wajib tepat waktu.

Terima kasih,
HSE Team`}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
