import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getWeeksInMonth } from "@/lib/weekCutoffs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Search, AlertTriangle, Monitor, TrendingUp, Users, ChevronDown, Edit2, Check, X, Upload, Loader2, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Bab, Kartu, Tegak, Mendatar, Kosong } from "@/components/fms/grafik";
import { angka } from "@/lib/hse-statistik";

// FMS Analytics Type matching what the backend returns
type FmsAnalyticsData = {
    summary: { totalViolations: number; totalUnits: number; validCount: number; invalidCount: number };
    byShift: { shift: string; count: number }[];
    byViolation: { violationType: string; count: number }[];
    byDate: { date: string; count: number }[];
    byHour: { hour: string; count: number }[];
    byWeek: { week: number; total: number; valid: number; invalid: number }[];
    byMonth: { month: string; total: number; valid: number; invalid: number }[];
    byLocation: { location: string; count: number }[];
    topDrivers: { rank: number; vehicleNo: string; driverName: string; driverNik: string; validCount: number; totalCount: number }[];
    allDrivers: {
        rank: number;
        vehicleNo: string;
        driverName: string;
        driverNik: string;
        validCount: number;
        totalCount: number;
        mataTertutupCount: number;
        mengantukCount: number;
        kelelahanCount: number;
        unassignedCount: number;
    }[];
    validationStats: any[];
    availableWeeks: number[];
    availableViolationTypes: any[];
};

type FmsViolation = {
    id: string;
    violationDate: string;
    violationTime: string;
    violationTimestamp: string;
    vehicleNo: string;
    violationType: string;
    location: string;
    shift: string;
    validationStatus: string;
    manualDriverName?: string | null;
    manualDriverNik?: string | null;
    evidenceUrl?: string | null;
};



function isFmsPath(s: string): boolean {
    return /^E:[\\/]VssService/i.test(s) || /vssFiles/i.test(s) || /[\\/]hftp[\\/]/i.test(s);
}

// Sumber gambar evidence yang BISA ditampilkan di OneTalent:
//  - /api/uploads/... , /uploads/... , http… (upload manual pengawas) → pakai apa adanya
//  - path server FMS (E:/VssService/..., vssFiles, hftp) → TIDAK bisa (diproteksi anti-bot VSS) → null
//  - lainnya/kosong → null (tampilkan placeholder, bukan ikon rusak)
function resolveEvidenceSrc(url?: string | null): string | null {
    const s = (url || "").trim();
    if (!s) return null;
    if (s.startsWith("/api/uploads/") || s.startsWith("/uploads/") || s.startsWith("http")) return s;
    return null;
}

/**
 * Kerangka muat. Bentuknya sengaja meniru tata letak sesungguhnya — 4 kartu KPI
 * lalu dua bab grafik — supaya halaman tidak melompat saat data tiba, dan
 * pengguna langsung tahu apa yang sedang dimuat.
 */
function KerangkaMuat() {
    const KartuKosong = ({ tinggi }: { tinggi: number }) => (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-3 h-2.5 w-40" />
            {tinggi > 0 && (
                <div className="mt-5 flex items-end gap-[3px]" style={{ height: tinggi }}>
                    {/* Tinggi batang dibuat berpola tetap, bukan acak: kerangka yang
                        berubah-ubah tiap render justru terasa gelisah. */}
                    {[38, 62, 45, 80, 55, 70, 34, 58, 90, 47, 66, 52].map((t, i) => (
                        <Skeleton key={i} className="flex-1 rounded-t-[3px]" style={{ height: `${t}%` }} />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8" role="status" aria-busy="true" aria-label="Memuat data fatigue">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <KartuKosong key={i} tinggi={0} />)}
            </div>

            {[1, 2].map((bab) => (
                <div key={bab} className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <KartuKosong tinggi={140} />
                        <KartuKosong tinggi={140} />
                    </div>
                </div>
            ))}

            <span className="sr-only">Memuat data alert fatigue…</span>
        </div>
    );
}

export default function FmsFatigueMonitoringDashboard() {

    const year = new Date().getFullYear();
    const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const washKey = (s: string) => s ? s.toString().replace(/\s+/g, "").toUpperCase() : "";

    const { data: unitMitraMap } = useQuery<Record<string, string>>({
        queryKey: ["unit-mitra-map"],
        queryFn: async () => {
            const res = await fetch("/api/fms/unit-mitra-map");
            if (!res.ok) return {};
            return res.json();
        }
    });

    const [dateFilter, setDateFilter] = useState<string>("");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [weekFilter, setWeekFilter] = useState<string>("all"); // value: "YYYY-MM-DD|YYYY-MM-DD" or "all"

    const weekOptions = useMemo(() => {
        const month = monthFilter !== 'all' ? monthFilter : MONTH_NAMES[new Date().getMonth()];
        return getWeeksInMonth(year, month);
    }, [year, monthFilter]);
    const [validationFilter, setValidationFilter] = useState<string>("all");
    const [evalThreshold, setEvalThreshold] = useState<number>(100);
    const [violationTypeFilter, setViolationTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<{ vehicleNo: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [showFollowUp, setShowFollowUp] = useState(false);

    // Tindak lanjut: alert VALID yang belum lengkap (driver kosong / foto kegiatan belum upload),
    // per nomor lambung. Live — padam otomatis saat dilengkapi. (7 hari terakhir)
    const { data: followUp } = useQuery<{ ok: boolean; windowDays: number; totalUnits: number; totalIncomplete: number; byVehicle: { vehicleNo: string; total: number; needsDriver: number; needsPhoto: number }[] }>({
        queryKey: ['/api/fms/follow-up'],
        queryFn: async () => {
            const res = await fetch('/api/fms/follow-up?days=7', { credentials: 'include' });
            if (!res.ok) throw new Error('gagal');
            return res.json();
        },
        refetchInterval: 60000,
    });
    const followUpMap = useMemo(() => {
        const m: Record<string, { total: number; needsDriver: number; needsPhoto: number }> = {};
        for (const v of followUp?.byVehicle || []) m[v.vehicleNo] = { total: v.total, needsDriver: v.needsDriver, needsPhoto: v.needsPhoto };
        return m;
    }, [followUp]);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [overrideName, setOverrideName] = useState("");
    const [overrideNik, setOverrideNik] = useState("");
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
    const [employeeResults, setEmployeeResults] = useState<Array<{ id: string; name: string; nomorLambung?: string }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const searchEmployees = useCallback((query: string) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!query || query.length < 2) {
            setEmployeeResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/employees?search=${encodeURIComponent(query)}&per_page=10`);
                if (res.ok) {
                    const json = await res.json();
                    const emps = json.data || json || [];
                    setEmployeeResults(emps.slice(0, 8));
                }
            } catch (e) {
                console.error("Employee search error:", e);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, []);

    const updateDriverMutation = useMutation({
        mutationFn: async (data: { id: string, manualDriverName: string, manualDriverNik: string, evidence?: File | null }) => {
            const formData = new FormData();
            formData.append('manualDriverName', data.manualDriverName);
            formData.append('manualDriverNik', data.manualDriverNik);
            if (data.evidence) {
                formData.append('evidence', data.evidence);
            }
            const res = await fetch(`/api/fms/violations/${data.id}/driver`, {
                method: 'PATCH',
                body: formData
            });
            if (!res.ok) throw new Error("Gagal menyimpan nama driver");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/fms/analytics'] });
            queryClient.invalidateQueries({ queryKey: ['/api/fms/violations'] });
            // Penting: refresh badge "Driver/Foto belum" agar langsung akurat tanpa reload.
            // Prefix ['/api/fms/violations'] juga mencakup query pending-followup (seksi "Perlu
            // dilengkapi" di modal) sehingga alert yang baru diisi langsung hilang dari daftar.
            queryClient.invalidateQueries({ queryKey: ['/api/fms/follow-up'] });
            toast({ title: "Berhasil", description: "Nama driver & evidence tersimpan. Alert lain yang belum lengkap tetap tampil di daftar." });
            setOverrideName("");
            setOverrideNik("");
            setEvidenceFile(null);
            setEvidencePreview(null);
            // Modal SENGAJA dibiarkan terbuka: operator bisa langsung melunasi alert pending lain
            // di unit yang sama tanpa buka-tutup. Badge & seksi pending menyusut real-time.
            // Tutup manual lewat tombol X saat selesai.
        },
        onError: (err) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });


    console.log("[DEBUG Dashboard] month:", monthFilter, "week:", weekFilter, "status:", validationFilter);

    // The critical filter for this dashboard
    // The critical filter for this dashboard - now dynamic

    const { data, isLoading, isError } = useQuery<FmsAnalyticsData>({
        queryKey: ['/api/fms/analytics', { violationType: violationTypeFilter, date: dateFilter, month: monthFilter, week: weekFilter, validationStatus: validationFilter }],
        queryFn: async () => {
            const params = new URLSearchParams();

            params.append('violationType', violationTypeFilter === 'all' ? 'Mata Tertutup,Mengantuk,Kelelahan' : violationTypeFilter);
            if (dateFilter) {
                params.append('startDate', dateFilter);
                params.append('endDate', dateFilter);
            }
            if (weekFilter !== 'all') {
                const [sd, ed] = weekFilter.split('|');
                params.append('startDate', sd);
                params.append('endDate', ed);
            } else if (monthFilter !== 'all') {
                params.append('month', monthFilter);
            }
            if (validationFilter !== 'all') params.append('validationStatus', validationFilter);

            const res = await fetch(`/api/fms/analytics?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            return res.json();
        }
    });

    // Fetch detailed violations for a selected vehicle
    const { data: violationsDetail, isLoading: isLoadingDetail } = useQuery<FmsViolation[]>({
        queryKey: ['/api/fms/violations', { vehicleNo: selectedDriver?.vehicleNo, date: dateFilter, month: monthFilter, week: weekFilter, validationStatus: validationFilter, violationType: violationTypeFilter }],
        queryFn: async () => {
            if (!selectedDriver) return [];
            const params = new URLSearchParams();
            params.append('vehicleNo', selectedDriver.vehicleNo);
            params.append('violationType', violationTypeFilter === 'all' ? 'Mata Tertutup,Mengantuk,Kelelahan' : violationTypeFilter);
            if (dateFilter) {
                params.append('startDate', dateFilter);
                params.append('endDate', dateFilter);
            }
            if (weekFilter !== 'all') {
                const [sd, ed] = weekFilter.split('|');
                params.append('startDate', sd);
                params.append('endDate', ed);
            } else if (monthFilter !== 'all') {
                params.append('month', monthFilter);
            }
            if (validationFilter !== 'all') params.append('validationStatus', validationFilter);

            const res = await fetch(`/api/fms/violations?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch violations");
            return res.json();
        },
        enabled: !!selectedDriver && isModalOpen
    });

    // Alert "belum lengkap" dalam jendela follow-up 7 hari — dimuat TERLEPAS dari filter tanggal
    // dashboard, agar badge "Driver/Foto belum" selalu bisa dilunasi dari modal ini (alert di luar
    // filter, mis. hasil backfill kemarin, tetap terlihat & bisa diisi).
    const { data: pendingWindowAlerts } = useQuery<FmsViolation[]>({
        queryKey: ['/api/fms/violations', 'pending-followup', selectedDriver?.vehicleNo],
        queryFn: async () => {
            if (!selectedDriver) return [];
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 7);
            const fmt = (d: Date) => d.toISOString().split('T')[0];
            const params = new URLSearchParams();
            params.append('vehicleNo', selectedDriver.vehicleNo);
            params.append('violationType', 'Mata Tertutup,Mengantuk,Kelelahan');
            params.append('startDate', fmt(start));
            params.append('endDate', fmt(end));
            params.append('validationStatus', 'Valid');
            const res = await fetch(`/api/fms/violations?${params.toString()}`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!selectedDriver && isModalOpen
    });

    const isPendingAlert = (v: FmsViolation) => {
        const nm = (v.manualDriverName || "").trim();
        const needsDriver = !nm || /^unknown/i.test(nm);
        const ev = (v.evidenceUrl || "");
        const needsPhoto = !(ev.startsWith("/api/uploads/") || ev.startsWith("/uploads/"));
        return needsDriver || needsPhoto;
    };
    const shownIds = new Set((violationsDetail || []).map(v => v.id));
    const pendingAlerts = (pendingWindowAlerts || []).filter(v => isPendingAlert(v) && !shownIds.has(v.id));
    const pendingIds = new Set(pendingAlerts.map(v => v.id));
    // Alert pending (di luar filter) ditaruh paling atas, ditandai kuning
    const detailRows = [...pendingAlerts, ...(violationsDetail || [])];

    const filteredTableData = data?.allDrivers?.filter(driver =>
        driver.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const MONTH_ORDER: { [key: string]: number } = {
        "Januari": 1, "Februari": 2, "Maret": 3, "April": 4,
        "Mei": 5, "Juni": 6, "Juli": 7, "Agustus": 8,
        "September": 9, "Oktober": 10, "November": 11, "Desember": 12
    };

    const sortedByMonth = data?.byMonth ? [...data.byMonth].sort((a, b) => {
        const aVal = MONTH_ORDER[a.month] || 99;
        const bVal = MONTH_ORDER[b.month] || 99;
        return aVal - bVal;
    }) : [];

    // Data diratakan jadi bentuk yang dipahami komponen grafik bersama:
    // {label[], nilai[]} untuk batang tegak, Record<string,number> untuk mendatar.
    const deret = (arr: any[] | undefined, kLabel: string, kNilai: string) => ({
        label: (arr ?? []).map((x) => String(x[kLabel] ?? "")),
        nilai: (arr ?? []).map((x) => Number(x[kNilai] ?? 0)),
    });
    const peta = (arr: any[] | undefined, kLabel: string, kNilai: string) => {
        const o: Record<string, number> = {};
        (arr ?? []).forEach((x) => {
            const k = String(x[kLabel] ?? "").trim();
            if (k) o[k] = (o[k] || 0) + Number(x[kNilai] ?? 0);
        });
        return o;
    };

    // Jam selalu 00–23 penuh supaya bentuk grafiknya jujur: jam tanpa alert
    // tampil sebagai nol, bukan hilang dari sumbu.
    const perJam = {
        label: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
        nilai: Array.from({ length: 24 }, (_, i) =>
            Number(data?.byHour?.find((h) => parseInt(String(h.hour)) === i)?.count ?? 0)),
    };
    const perBulan = deret(sortedByMonth, "month", "total");
    const perMinggu = {
        label: (data?.byWeek ?? []).map((w) => `W${w.week}`),
        nilai: (data?.byWeek ?? []).map((w) => Number(w.total ?? 0)),
    };
    const perTanggal = deret(data?.byDate, "date", "count");
    const perUnit = peta(data?.topDrivers, "vehicleNo", "totalCount");
    const perShift = peta(data?.byShift, "shift", "count");
    const perLokasi = peta(data?.byLocation, "location", "count");

    return (
        <div className="flex-1 space-y-6 lg:space-y-8 p-4 md:p-6 lg:p-8 max-w-[1920px] w-full mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl shadow-sm border border-border">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Monitoring Fatigue</h1>
                    <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
                        Pantauan khusus alert Mata Tertutup, Mengantuk, dan Kelelahan dari data FMS. Status validasi mengikuti FAMOUS dan disegarkan otomatis tiap hari — alert yang baru muncul berstatus <b>Belum Validasi</b> sampai divalidasi petugas, jadi pilih <b>Semua Status</b> untuk total terkini.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-[140px] bg-card text-sm"
                    />
                    <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setWeekFilter("all"); }}>
                        <SelectTrigger className="w-[140px] bg-card text-sm">
                            <SelectValue placeholder="Semua Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Bulan</SelectItem>
                            {Object.keys(MONTH_ORDER).map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={weekFilter} onValueChange={setWeekFilter}>
                        <SelectTrigger className="w-[200px] bg-card text-sm">
                            <SelectValue placeholder="Semua Minggu" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Minggu</SelectItem>
                            {weekOptions.map(w => (
                                <SelectItem key={w.weekNumber} value={`${w.startDate}|${w.endDate}`}>
                                    {w.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={validationFilter} onValueChange={setValidationFilter}>
                        <SelectTrigger className="w-[150px] bg-card text-sm">
                            <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="Valid">Valid</SelectItem>
                            <SelectItem value="Tidak Valid">Tidak Valid</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={violationTypeFilter} onValueChange={setViolationTypeFilter}>
                        <SelectTrigger className="w-[180px] bg-card text-sm">
                            <SelectValue placeholder="Semua Pelanggaran" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Pelanggaran</SelectItem>
                            <SelectItem value="Mata Tertutup">Mata Tertutup</SelectItem>
                            <SelectItem value="Mengantuk">Mengantuk</SelectItem>
                            <SelectItem value="Kelelahan">Kelelahan</SelectItem>
                        </SelectContent>
                    </Select>

                </div>
            </div>

            {isLoading ? (
                <KerangkaMuat />
            ) : isError ? (
                <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center gap-2 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    Gagal memuat data FMS. Silakan coba lagi.
                </div>
            ) : data ? (
                <>
                    {/* Petunjuk: 0 saat filter status spesifik karena periode ini belum ada yang berstatus itu */}
                    {data.summary.totalViolations === 0 && validationFilter !== 'all' && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-2 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>
                                Belum ada alert berstatus <b>{validationFilter}</b> untuk periode ini. Alert yang baru muncul berstatus <b>Belum Validasi</b> sampai divalidasi petugas di FAMOUS.
                                <button onClick={() => setValidationFilter('all')} className="ml-2 underline font-semibold hover:text-amber-900">Tampilkan Semua</button>
                            </span>
                        </div>
                    )}
                    {/* Perlu Dilengkapi — alert VALID yang belum lengkap (driver/foto), per nomor lambung. Live. */}
                    {followUp && followUp.totalIncomplete > 0 && (
                        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 overflow-hidden dark:bg-orange-950/40 dark:border-orange-900/50">
                            <button
                                onClick={() => setShowFollowUp((s) => !s)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-orange-100/60 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-400">
                                    <span className="inline-flex h-2 w-2 flex-none rounded-full bg-orange-500" />
                                    <b>Perlu Dilengkapi:</b> {followUp.totalIncomplete} alert valid di {followUp.totalUnits} unit (driver / foto kegiatan) — {followUp.windowDays} hari terakhir
                                </span>
                                <ChevronDown className={`h-4 w-4 text-orange-600 transition-transform ${showFollowUp ? "rotate-180" : ""} dark:text-orange-400`} />
                            </button>
                            {showFollowUp && (
                                <div className="px-4 pb-3 pt-1 max-h-72 overflow-y-auto">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {(followUp.byVehicle || []).map((v) => (
                                            <button
                                                key={v.vehicleNo}
                                                onClick={() => { setSelectedDriver({ vehicleNo: v.vehicleNo }); setIsModalOpen(true); }}
                                                className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-card px-3 py-2 text-left hover:border-orange-400 hover:shadow-sm transition dark:border-orange-900/50"
                                            >
                                                <span className="font-bold text-muted-foreground text-sm">{v.vehicleNo}</span>
                                                <span className="flex gap-1">
                                                    {v.needsDriver > 0 && (
                                                        <Badge className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 border-none dark:bg-red-950/40 dark:text-red-400">driver {v.needsDriver}</Badge>
                                                    )}
                                                    {v.needsPhoto > 0 && (
                                                        <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 border-none dark:bg-amber-950/40 dark:text-amber-400">foto {v.needsPhoto}</Badge>
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-orange-600 mt-2 dark:text-orange-400">Tekan tombol <b>Lengkapi</b> di kolom Aksi pada tabel di bawah untuk mengisi. Penanda hilang otomatis saat driver terisi & foto kegiatan ter-upload.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {/* ── KPI ───────────────────────────────────────────────
                        Satu bentuk untuk keempatnya. Batang warna di tepi kiri
                        dan kotak ikon berwarna dibuang: warnanya tidak menandai
                        apa pun, cuma menambah keriuhan. */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { l: "Total alert fatigue", v: data.summary.totalViolations, Ikon: AlertTriangle, ket: "Mata Tertutup, Mengantuk, Kelelahan" },
                            { l: "Unit terlibat", v: data.summary.totalUnits, Ikon: Monitor, ket: "nomor lambung dengan alert" },
                            { l: "Alert tervalidasi", v: data.summary.validCount, Ikon: TrendingUp, ket: "sudah divalidasi petugas" },
                            { l: "Driver terdampak", v: data.allDrivers.length, Ikon: Users, ket: "driver dengan alert tercatat" },
                        ].map((k) => (
                            <Card key={k.l} className="rounded-xl border border-border bg-card">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <k.Ikon className="h-4 w-4" />
                                        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{k.l}</span>
                                    </div>
                                    <p className="mt-2.5 text-[28px] font-semibold leading-none tabular-nums text-foreground">
                                        {angka(k.v ?? 0)}
                                    </p>
                                    <p className="mt-2 text-[12px] text-muted-foreground">{k.ket}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* ── Grafik ────────────────────────────────────────────
                        Memakai komponen grafik yang sama dengan Dashboard FMS
                        dan Safe Distance, bukan Recharts dengan palet sendiri —
                        supaya satu aplikasi punya satu bahasa visual. */}
                    <Bab nomor={1} judul="Waktu" pengantar="Kapan alert fatigue paling sering muncul.">
                        <Kartu judul="Jam berapa paling rawan?" catatan="urut 00–23, bukan urut jumlah" lebar>
                            {perJam.nilai.some((n) => n > 0) ? <Tegak label={perJam.label} nilai={perJam.nilai} /> : <Kosong />}
                        </Kartu>
                        <Kartu judul="Bagaimana per bulan?" catatan="urut waktu">
                            {perBulan.label.length ? <Tegak label={perBulan.label} nilai={perBulan.nilai} /> : <Kosong />}
                        </Kartu>
                        <Kartu judul="Bagaimana per minggu?" catatan="urut minggu">
                            {perMinggu.label.length ? <Tegak label={perMinggu.label} nilai={perMinggu.nilai} /> : <Kosong />}
                        </Kartu>
                        <Kartu judul="Bagaimana harian?" catatan="seluruh tanggal pada saringan ini" lebar>
                            {perTanggal.label.length ? <Tegak label={perTanggal.label} nilai={perTanggal.nilai} /> : <Kosong />}
                        </Kartu>
                    </Bab>

                    <Bab nomor={2} judul="Unit & Shift" pengantar="Siapa dan kapan yang paling banyak menyumbang alert.">
                        <Kartu judul="Nomor lambung mana yang terbanyak?" catatan="10 teratas">
                            <Mendatar data={perUnit} batas={10} />
                        </Kartu>
                        <Kartu judul="Shift mana yang lebih rawan?" catatan="perbandingan jumlah alert">
                            <Mendatar data={perShift} batas={5} />
                        </Kartu>
                        <Kartu judul="Lokasi mana yang menonjol?" catatan="10 teratas" lebar>
                            <Mendatar data={perLokasi} batas={10} />
                        </Kartu>
                    </Bab>

                    {/* Detailed Table */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-border rounded-xl mt-6 overflow-hidden">
                        <CardHeader className="pb-4 bg-card border-b border-border">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                    <CardTitle className="text-base font-semibold text-foreground">Tabel Evaluasi Karyawan</CardTitle>
                                    <CardDescription>Rincian pelanggaran fatigue untuk setiap driver / karyawan</CardDescription>
                                </div>
                                <div className="relative w-full md:w-[300px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Cari Nama Karyawan atau No Lambung..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="w-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px] text-center">Rank</TableHead>
                                            <TableHead>Nomor Lambung</TableHead>
                                            <TableHead className="text-center text-red-600 font-semibold dark:text-red-400">Total Alert</TableHead>
                                            <TableHead className="text-center">Mata Tertutup</TableHead>
                                            <TableHead className="text-center">Mengantuk</TableHead>
                                            <TableHead className="text-center">Kelelahan</TableHead>
                                            <TableHead className="w-[150px] text-right pr-4">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTableData.length > 0 ? (
                                            filteredTableData.map((driver) => (
                                                <TableRow key={driver.vehicleNo}>
                                                    <TableCell className="font-medium text-center">{driver.rank}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    className="text-left font-semibold text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
                                                                    onClick={() => {
                                                                        setSelectedDriver({ vehicleNo: driver.vehicleNo });
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                >
                                                                    {driver.vehicleNo}
                                                                </button>
                                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                                    {unitMitraMap?.[washKey(driver.vehicleNo)] || ""}
                                                                </span>
                                                                {(() => {
                                                                    const driverPending = Math.max(followUpMap[driver.vehicleNo]?.needsDriver || 0, driver.unassignedCount || 0);
                                                                    const photoPending = followUpMap[driver.vehicleNo]?.needsPhoto || 0;
                                                                    return (driverPending > 0 || photoPending > 0) ? (
                                                                        <span className="inline-flex h-2 w-2 flex-none rounded-full bg-red-500" />
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(() => {
                                                                    const driverPending = Math.max(followUpMap[driver.vehicleNo]?.needsDriver || 0, driver.unassignedCount || 0);
                                                                    return driverPending > 0 ? (
                                                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-h-4 h-4 bg-red-100 text-red-700 hover:bg-red-200 border-none rounded dark:bg-red-950/40 dark:text-red-400" title="Driver Unknown/kosong — klik nomor lambung untuk input nama">
                                                                            {driverPending} Driver belum
                                                                        </Badge>
                                                                    ) : null;
                                                                })()}
                                                                {(followUpMap[driver.vehicleNo]?.needsPhoto || 0) > 0 && (
                                                                    <Badge className="text-[10px] px-1.5 py-0 min-h-4 h-4 bg-amber-100 text-amber-700 hover:bg-amber-200 border-none rounded dark:bg-amber-950/40 dark:text-amber-400">
                                                                        {followUpMap[driver.vehicleNo].needsPhoto} Foto belum
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-red-600 bg-red-50/50 dark:text-red-400">
                                                        {driver.totalCount}
                                                    </TableCell>
                                                    <TableCell className="text-center">{driver.mataTertutupCount}</TableCell>
                                                    <TableCell className="text-center">{driver.mengantukCount}</TableCell>
                                                    <TableCell className="text-center">{driver.kelelahanCount}</TableCell>
                                                    {/* Sebelumnya mengisi data hanya bisa lewat klik nomor lambung —
                                                        tidak terlihat sebagai tombol, jadi orang mengira tak bisa diisi. */}
                                                    <TableCell className="pr-4 text-right">
                                                        {(() => {
                                                            const perluDriver = Math.max(followUpMap[driver.vehicleNo]?.needsDriver || 0, driver.unassignedCount || 0);
                                                            const perluFoto = followUpMap[driver.vehicleNo]?.needsPhoto || 0;
                                                            const perlu = perluDriver + perluFoto;
                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    variant={perlu > 0 ? "default" : "outline"}
                                                                    className="h-8"
                                                                    onClick={() => {
                                                                        setSelectedDriver({ vehicleNo: driver.vehicleNo });
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                    title={perlu > 0
                                                                        ? `${perluDriver} driver dan ${perluFoto} foto belum dilengkapi`
                                                                        : "Lihat rincian alert unit ini"}
                                                                >
                                                                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                                                                    {perlu > 0 ? "Lengkapi" : "Rincian"}
                                                                </Button>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                    Tidak ada data yang ditemukan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Driver Detail Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                            <DialogHeader className="p-6 pb-2 border-b">
                                <DialogTitle className="text-xl flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Rincian Alert: {selectedDriver?.vehicleNo}
                                </DialogTitle>
                                <DialogDescription>
                                    Menampilkan daftar lengkap alert fatigue untuk unit {selectedDriver?.vehicleNo}. Klik tombol edit untuk menginput nama driver.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-hidden p-6 pt-2">
                                {isLoadingDetail ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : detailRows.length > 0 ? (
                                    <ScrollArea className="h-full pr-4">
                                        {pendingAlerts.length > 0 && (
                                            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:bg-amber-950/40 dark:border-amber-900/50">
                                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
                                                <p className="text-xs text-amber-800 dark:text-amber-400">
                                                    <b>{pendingAlerts.length} alert perlu dilengkapi</b> dari 7 hari terakhir (di luar filter tanggal) — ditandai kuning di bawah. Lengkapi driver &amp; foto agar penanda "belum" hilang.
                                                </p>
                                            </div>
                                        )}
                                        <Table>
                                            <TableHeader className="sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[150px]">Tanggal & Waktu</TableHead>
                                                    <TableHead>Jenis Pelanggaran</TableHead>
                                                    <TableHead>Driver</TableHead>
                                                    <TableHead>Lokasi</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                    <TableHead className="w-[80px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {detailRows.map((v) => (
                                                    <TableRow key={v.id} className={pendingIds.has(v.id) ? "bg-amber-50 dark:bg-amber-950/30" : undefined}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm">{v.violationDate}</span>
                                                                <span className="text-xs text-muted-foreground">{v.violationTime}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={
                                                                v.violationType === 'Mata Tertutup'
                                                                    ? 'border-border bg-muted text-foreground'
                                                                    : v.violationType === 'Mengantuk'
                                                                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400'
                                                                        : 'border-border bg-muted text-muted-foreground'
                                                            }>
                                                                {v.violationType}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {(() => {
                                                                const nm = (v.manualDriverName || "").trim();
                                                                const driverOk = nm && !/^unknown/i.test(nm);
                                                                const ev = (v.evidenceUrl || "");
                                                                const photoOk = ev.startsWith("/api/uploads/") || ev.startsWith("/uploads/") || ev.startsWith("http");
                                                                return (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        {driverOk ? (
                                                                            <span className="font-medium text-foreground">{nm}</span>
                                                                        ) : (
                                                                            <span className="text-red-600 italic font-medium dark:text-red-400">Driver belum diisi</span>
                                                                        )}
                                                                        {!photoOk && (
                                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠ Foto kegiatan belum diupload</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-sm max-w-[200px] truncate" title={v.location}>
                                                            {v.location || "-"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={
                                                                v.validationStatus === 'Valid' ? 'bg-muted text-foreground hover:bg-muted border-none' : 'bg-red-100 text-red-700 hover:bg-red-200 border-none'
                                                            }>
                                                                {v.validationStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-muted-foreground">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-96" side="left" onOpenAutoFocus={(e) => { e.preventDefault(); setEmployeeResults([]); setOverrideName(""); setOverrideNik(""); setEvidenceFile(null); setEvidencePreview(null); }}>
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <h4 className="font-medium leading-none">Ubah Driver</h4>
                                                                            <p className="text-xs text-muted-foreground mt-1">Ketik nama untuk mencari karyawan.</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label htmlFor={`name-${v.id}`} className="text-xs">Nama Karyawan</Label>
                                                                            <div className="relative">
                                                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                                <Input
                                                                                    id={`name-${v.id}`}
                                                                                    placeholder="Ketik minimal 2 huruf..."
                                                                                    defaultValue={v.manualDriverName || ''}
                                                                                    className="pl-9 h-9"
                                                                                    onChange={(e) => {
                                                                                        setOverrideName(e.target.value);
                                                                                        searchEmployees(e.target.value);
                                                                                    }}
                                                                                    autoComplete="off"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {/* Autocomplete Results - Inline */}
                                                                        {isSearching && (
                                                                            <div className="text-center text-xs text-muted-foreground py-2">Mencari...</div>
                                                                        )}
                                                                        {employeeResults.length > 0 && (
                                                                            <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-card">
                                                                                {employeeResults.map((emp) => (
                                                                                    <button
                                                                                        key={emp.id}
                                                                                        type="button"
                                                                                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0 flex justify-between items-center"
                                                                                        onClick={() => {
                                                                                            setOverrideName(emp.name);
                                                                                            setOverrideNik(emp.id);
                                                                                            setEmployeeResults([]);
                                                                                            const nameInput = document.getElementById(`name-${v.id}`) as HTMLInputElement;
                                                                                            const nikInput = document.getElementById(`nik-${v.id}`) as HTMLInputElement;
                                                                                            if (nameInput) nameInput.value = emp.name;
                                                                                            if (nikInput) nikInput.value = emp.id;
                                                                                        }}
                                                                                    >
                                                                                        <div>
                                                                                            <div className="font-medium text-sm text-foreground">{emp.name}</div>
                                                                                            <div className="text-xs text-muted-foreground">NIK: {emp.id}</div>
                                                                                        </div>
                                                                                        {emp.nomorLambung && (
                                                                                            <Badge variant="outline" className="text-xs bg-muted shrink-0">{emp.nomorLambung}</Badge>
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        <div className="space-y-1">
                                                                            <Label htmlFor={`nik-${v.id}`} className="text-xs">NIK Karyawan</Label>
                                                                            <Input
                                                                                id={`nik-${v.id}`}
                                                                                placeholder="Otomatis terisi"
                                                                                defaultValue={v.manualDriverNik || ''}
                                                                                onChange={(e) => setOverrideNik(e.target.value)}
                                                                                className="bg-muted h-9"
                                                                            />
                                                                        </div>
                                                                        {/* Evidence Upload */}
                                                                        <div className="space-y-1">
                                                                            <Label className="text-xs">📷 Evidence / Bukti Foto</Label>
                                                                            {!evidencePreview && (() => {
                                                                                const src = resolveEvidenceSrc(v.evidenceUrl);
                                                                                // Hanya foto upload manual yang bisa ditampilkan; snapshot FMS diproteksi VSS.
                                                                                if (!src) {
                                                                                    const isFms = isFmsPath((v.evidenceUrl || "").trim());
                                                                                    return (
                                                                                        <div className="mb-2 w-full h-20 rounded-lg border border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center text-center px-2 dark:bg-amber-950/40 dark:border-amber-900/50">
                                                                                            <span className="text-[11px] text-amber-700 font-medium dark:text-amber-400">{isFms ? "Foto kegiatan belum di-upload" : "Belum ada foto"}</span>
                                                                                            <span className="text-[10px] text-amber-500">{isFms ? "snapshot FMS hanya bisa di FAMOUS — upload foto tindak lanjut di bawah" : "upload foto di bawah"}</span>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return (
                                                                                    <div className="mb-2">
                                                                                        <img
                                                                                            src={src}
                                                                                            alt="Evidence"
                                                                                            className="w-full h-24 object-cover rounded-lg border border-border"
                                                                                            onError={(e) => {
                                                                                                const img = e.currentTarget;
                                                                                                img.style.display = "none";
                                                                                                const ph = img.nextElementSibling as HTMLElement | null;
                                                                                                if (ph) ph.style.display = "flex";
                                                                                            }}
                                                                                        />
                                                                                        <div className="w-full h-20 rounded-lg border border-dashed border-border bg-muted flex-col items-center justify-center text-center px-2" style={{ display: "none" }}>
                                                                                            <span className="text-[11px] text-muted-foreground">Foto gagal dimuat</span>
                                                                                        </div>
                                                                                        <p className="text-xs text-foreground mt-1">✓ Foto kegiatan sudah ada</p>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            {evidencePreview && (
                                                                                <div className="mb-2 relative">
                                                                                    <img src={evidencePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg border-2 border-border" />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                                                        onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}
                                                                                    >×</button>
                                                                                    <p className="text-xs text-muted-foreground mt-1">File baru dipilih</p>
                                                                                </div>
                                                                            )}
                                                                            <Input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                className="h-9 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-muted file:text-foreground hover:file:bg-muted"
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) {
                                                                                        setEvidenceFile(file);
                                                                                        const reader = new FileReader();
                                                                                        reader.onload = (ev) => setEvidencePreview(ev.target?.result as string);
                                                                                        reader.readAsDataURL(file);
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            className="w-full bg-primary hover:bg-primary/90"
                                                                            onClick={() => {
                                                                                updateDriverMutation.mutate({
                                                                                    id: v.id,
                                                                                    manualDriverName: overrideName || v.manualDriverName || "",
                                                                                    manualDriverNik: overrideNik || v.manualDriverNik || "",
                                                                                    evidence: evidenceFile
                                                                                });
                                                                            }}
                                                                            disabled={updateDriverMutation.isPending}
                                                                        >
                                                                            {updateDriverMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                                                                        </Button>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                                        Tidak ada rincian alert yang ditemukan untuk filter ini.
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}
        </div>
    );
}
