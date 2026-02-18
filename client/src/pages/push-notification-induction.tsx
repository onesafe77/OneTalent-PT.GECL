
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
import { Loader2, Send, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { InductionSchedule, Employee } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

type ScheduleWithEmployee = InductionSchedule & { employee: Employee };

export default function PushNotificationInduction() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Queries
    const { data: schedules, isLoading } = useQuery<ScheduleWithEmployee[]>({
        queryKey: ["/api/induction/schedules"],
    });

    // Filter only pending schedules
    const pendingSchedules = schedules?.filter(s => s.status === "pending") || [];

    // Generate H-1 mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            return await apiRequest("/api/induction/generate-schedules", "POST", {});
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/schedules"] });
            toast({
                title: "Berhasil",
                description: data.message || `${data.count} jadwal baru digenerate`
            });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Generate", description: error.message, variant: "destructive" });
        }
    });

    // Mutations
    const sendReminderMutation = useMutation({
        mutationFn: async (scheduleId: string) => {
            return await apiRequest("/api/induction/send-reminder", "POST", { scheduleId });
        },
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

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await generateMutation.mutateAsync();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Push Notifikasi - Induksi K3</h1>
                    <p className="text-muted-foreground">Kirim pengingat WhatsApp ke driver yang memiliki jadwal induksi pending.</p>
                </div>
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    variant="outline"
                    className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700"
                >
                    {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Zap className="h-4 w-4 mr-2" />
                    )}
                    Generate Jadwal H-1
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Jadwal Induksi Pending ({pendingSchedules.length})</CardTitle>
                    <CardDescription>
                        Daftar karyawan yang belum menyelesaikan induksi. Klik tombol kirim untuk mengirim Reminder H-1.
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
                                                disabled={sendingId === s.id}
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

Anda dijadwalkan untuk *Induksi K3* pada tanggal *[Tanggal]* pasca cuti.

Silakan buka aplikasi OneTalent dan selesaikan quiz induksi sebelum mulai bekerja.

Terima kasih,
HSE Team`}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
