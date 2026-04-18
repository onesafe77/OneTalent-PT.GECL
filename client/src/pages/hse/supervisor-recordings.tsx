import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Play, VideoOff, Search, Loader2, ShieldCheck, Users, ChevronRight } from "lucide-react";

interface RecordingEntry {
    sessionId: string;
    tanggal: string;
    shift: string;
    lokasi: string;
    area: string;
    createdBy: string;
    supervisorName: string;
    supervisorVideoUrl: string | null;
    hasRecording: boolean;
}

interface ScanRecord {
    id: string;
    nama: string;
    nik: string;
    jabatan: string;
    nomorLambung: string | null;
    karyawanSiapBekerja: boolean;
    scanVideoUrl: string | null;
    createdAt: string;
}

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function SupervisorRecordings() {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [search, setSearch] = useState("");
    const [filterHasRecording, setFilterHasRecording] = useState<"all" | "yes" | "no">("all");

    // Session video dialog
    const [playingEntry, setPlayingEntry] = useState<RecordingEntry | null>(null);

    // Scan records dialog (per session)
    const [detailSession, setDetailSession] = useState<RecordingEntry | null>(null);
    // Per-scan video to play inside detail dialog
    const [playingScan, setPlayingScan] = useState<ScanRecord | null>(null);

    const monthParam = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

    const { data, isLoading } = useQuery<RecordingEntry[]>({
        queryKey: ["/api/sidak-fatigue/supervisor-recordings", monthParam],
        queryFn: async () => {
            const res = await fetch(`/api/sidak-fatigue/supervisor-recordings?month=${monthParam}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Akses ditolak atau gagal memuat data");
            return res.json();
        },
        placeholderData: (prev) => prev,
    });

    // Fetch scan records for selected session
    const { data: scanRecords, isLoading: scanLoading } = useQuery<ScanRecord[]>({
        queryKey: ["/api/sidak-fatigue/scan-recordings", detailSession?.sessionId],
        queryFn: async () => {
            if (!detailSession) return [];
            const res = await fetch(`/api/sidak-fatigue/${detailSession.sessionId}/scan-recordings`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
        enabled: !!detailSession,
    });

    const filtered = useMemo(() => {
        if (!data) return [];
        let list = data;
        if (filterHasRecording === "yes") list = list.filter(r => r.hasRecording);
        if (filterHasRecording === "no") list = list.filter(r => !r.hasRecording);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(r =>
                r.supervisorName.toLowerCase().includes(q) ||
                r.createdBy.toLowerCase().includes(q) ||
                r.lokasi.toLowerCase().includes(q)
            );
        }
        return list;
    }, [data, filterHasRecording, search]);

    const totalSessions = data?.length ?? 0;
    const withRecording = data?.filter(r => r.hasRecording).length ?? 0;
    const withoutRecording = totalSessions - withRecording;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-red-500" />
                    Rekaman Pengawas
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Video pengawas saat membuat sesi + rekaman per-driver yang discan
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {MONTHS.map((m, i) => (
                            <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {[2024, 2025, 2026, 2027].map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterHasRecording} onValueChange={v => setFilterHasRecording(v as any)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Sesi</SelectItem>
                        <SelectItem value="yes">Ada Rekaman Sesi</SelectItem>
                        <SelectItem value="no">Tidak Ada Rekaman Sesi</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Cari nama/NIK/lokasi..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 w-48"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4 text-center">
                        <Video className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{totalSessions}</p>
                        <p className="text-xs text-gray-500">Total Sesi</p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
                    <CardContent className="pt-4 text-center">
                        <Play className="w-6 h-6 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold text-green-600">{withRecording}</p>
                        <p className="text-xs text-gray-500">Ada Rekaman Sesi</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                    <CardContent className="pt-4 text-center">
                        <VideoOff className="w-6 h-6 mx-auto mb-2 text-red-500" />
                        <p className="text-2xl font-bold text-red-600">{withoutRecording}</p>
                        <p className="text-xs text-gray-500">Tidak Ada Rekaman Sesi</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Daftar Sesi ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white dark:bg-gray-900">
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">No</th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Tanggal</th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Shift</th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Lokasi</th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Nama Pengawas</th>
                                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Rekaman Sesi</th>
                                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Rekaman Driver</th>
                                        <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Tidak ada data</td>
                                        </tr>
                                    ) : filtered.map((entry, idx) => (
                                        <tr key={entry.sessionId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="py-2 px-3 text-sm">{idx + 1}</td>
                                            <td className="py-2 px-3 text-sm font-medium">{entry.tanggal}</td>
                                            <td className="py-2 px-3 text-sm">
                                                <Badge variant="outline" className="text-xs">{entry.shift}</Badge>
                                            </td>
                                            <td className="py-2 px-3 text-sm text-gray-600">{entry.lokasi}</td>
                                            <td className="py-2 px-3 text-sm font-medium">{entry.supervisorName}</td>
                                            <td className="py-2 px-3 text-center">
                                                {entry.hasRecording ? (
                                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                                        onClick={() => setPlayingEntry(entry)}>
                                                        <Play className="w-3 h-3" /> Putar
                                                    </Button>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-700 text-xs">Tidak Ada</Badge>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => setDetailSession(entry)}>
                                                    <Users className="w-3 h-3" />
                                                    Lihat Driver
                                                    <ChevronRight className="w-3 h-3" />
                                                </Button>
                                            </td>
                                            <td className="py-2 px-3 text-center text-xs text-gray-400">{entry.createdBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* ── Session video player dialog ── */}
            <Dialog open={!!playingEntry} onOpenChange={() => setPlayingEntry(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-red-500" />
                            Rekaman Sesi — {playingEntry?.supervisorName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="text-sm text-gray-500 grid grid-cols-2 gap-2">
                            <span>Tanggal: <strong>{playingEntry?.tanggal}</strong></span>
                            <span>Shift: <strong>{playingEntry?.shift}</strong></span>
                            <span>Lokasi: <strong>{playingEntry?.lokasi}</strong></span>
                            <span>NIK: <strong>{playingEntry?.createdBy}</strong></span>
                        </div>
                        {playingEntry?.supervisorVideoUrl && (
                            <video
                                key={playingEntry.supervisorVideoUrl}
                                src={playingEntry.supervisorVideoUrl}
                                controls autoPlay
                                className="w-full rounded-lg bg-black"
                                style={{ maxHeight: 320 }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Per-driver scan recordings dialog ── */}
            <Dialog open={!!detailSession} onOpenChange={open => { if (!open) { setDetailSession(null); setPlayingScan(null); } }}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Rekaman Driver — {detailSession?.supervisorName} ({detailSession?.tanggal})
                        </DialogTitle>
                    </DialogHeader>

                    {scanLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : !scanRecords || scanRecords.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">Belum ada data driver untuk sesi ini</div>
                    ) : (
                        <div className="space-y-3">
                            {/* Video player for selected scan */}
                            {playingScan && (
                                <div className="bg-black rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
                                        <span className="text-white text-sm font-medium">{playingScan.nama}</span>
                                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-6 text-xs"
                                            onClick={() => setPlayingScan(null)}>Tutup</Button>
                                    </div>
                                    <video
                                        key={playingScan.scanVideoUrl!}
                                        src={playingScan.scanVideoUrl!}
                                        controls autoPlay
                                        className="w-full"
                                        style={{ maxHeight: 280 }}
                                    />
                                </div>
                            )}

                            {/* Driver list */}
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-gray-500">
                                        <th className="text-left py-2 px-2">No</th>
                                        <th className="text-left py-2 px-2">Nama Driver</th>
                                        <th className="text-left py-2 px-2">NIK</th>
                                        <th className="text-left py-2 px-2">Unit</th>
                                        <th className="text-center py-2 px-2">Status Fit</th>
                                        <th className="text-center py-2 px-2">Rekaman</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {scanRecords.map((rec, idx) => (
                                        <tr key={rec.id} className={`hover:bg-gray-50 ${playingScan?.id === rec.id ? 'bg-blue-50' : ''}`}>
                                            <td className="py-2 px-2">{idx + 1}</td>
                                            <td className="py-2 px-2 font-medium">{rec.nama}</td>
                                            <td className="py-2 px-2 font-mono text-xs">{rec.nik}</td>
                                            <td className="py-2 px-2 text-gray-600">{rec.nomorLambung || "-"}</td>
                                            <td className="py-2 px-2 text-center">
                                                <Badge className={rec.karyawanSiapBekerja
                                                    ? "bg-green-100 text-green-700 text-xs"
                                                    : "bg-red-100 text-red-700 text-xs"}>
                                                    {rec.karyawanSiapBekerja ? "Fit" : "Tidak Fit"}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                {rec.scanVideoUrl ? (
                                                    <Button size="sm" variant="outline"
                                                        className={`h-7 text-xs gap-1 ${playingScan?.id === rec.id ? 'border-blue-500 text-blue-600' : ''}`}
                                                        onClick={() => setPlayingScan(playingScan?.id === rec.id ? null : rec)}>
                                                        <Play className="w-3 h-3" />
                                                        {playingScan?.id === rec.id ? "Stop" : "Putar"}
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
