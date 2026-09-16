
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Calendar, AlertTriangle, CheckCircle, XCircle, FileSpreadsheet, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

/**
 * Chart.js butuh warna nyata, tidak bisa membaca var() CSS. Jadi nilainya
 * diambil dari token --grafik-* saat render, supaya grafik ikut berubah
 * ketika tema terang/gelap berganti — bukan hex keras yang hilang di gelap.
 */
const warnaGrafik = (nama: string, cadangan: string) => {
    if (typeof window === "undefined") return cadangan;
    const v = getComputedStyle(document.documentElement).getPropertyValue(nama).trim();
    return v || cadangan;
};

/* ── Penyaring ───────────────────────────────────────────────────────────
   Satu bentuk untuk semua penyaring. Sebelumnya tiap dropdown ditulis
   ulang dengan gaya sendiri (ada rounded-lg, ada rounded-xl) dan semuanya
   menampilkan "Semua X" — sehingga tidak ada yang menandakan penyaring mana
   yang sedang hidup. Kini yang aktif berwarna merah dan membawa hitungan. */
function Saringan({ label, ringkas, jumlah, lebar = "w-56", children }: {
    label: string; ringkas: string; jumlah: number; lebar?: string; children: React.ReactNode;
}) {
    const aktif = jumlah > 0;
    return (
        <div className="relative">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
            <details className="group" name="saringan-fms">
                <summary className={cn(
                    "flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors",
                    aktif
                        ? "border-primary/40 bg-primary/10 font-medium text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                )}>
                    <span className="max-w-[10rem] truncate">{ringkas}</span>
                    {aktif && (
                        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[9px] text-primary-foreground">
                            {jumlah}
                        </span>
                    )}
                    <ChevronDown className="ml-auto h-3.5 w-3.5 flex-none opacity-50 transition-transform group-open:rotate-180" />
                </summary>
                <div className={cn("absolute z-50 mt-1.5 rounded-lg border border-border bg-popover p-1.5 shadow-lg", lebar)}>
                    {children}
                </div>
            </details>
        </div>
    );
}

function Pilihan({ teks, dipilih, onUbah }: { teks: string; dipilih: boolean; onUbah: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted">
            <input type="checkbox" checked={dipilih} onChange={(e) => onUbah(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-[hsl(var(--primary))]" />
            <span className="text-[13px] text-foreground">{teks}</span>
        </label>
    );
}

export default function FmsDashboard() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State - Combined DateTime (format: "YYYY-MM-DDTHH:mm")
    const [dateTimeRange, setDateTimeRange] = useState({
        start: format(startOfMonth(new Date()), "yyyy-MM-dd") + "T00:00",
        end: format(endOfMonth(new Date()), "yyyy-MM-dd") + "T23:59"
    });
    // Multi-select filters (arrays)
    const [filters, setFilters] = useState({
        categories: [] as string[],       // Multi-select (FAMOUS tabs)
        violationTypes: [] as string[],   // Multi-select
        shifts: [] as string[],           // Multi-select
        validationStatuses: [] as string[], // Multi-select
        weeks: [] as number[]             // Multi-select for weeks (1-5)
    });
    // Daftar kategori/tab seperti FAMOUS
    const FMS_CATEGORIES = ["Fatigue Alarm", "Non Fatigue Alarm", "AEBS", "Overspeed"];
    // Filters & Uploader states
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Token FMS (auto-pull FAMOUS)
    const [tokenOpen, setTokenOpen] = useState(false);
    const [tokenInput, setTokenInput] = useState("");
    const [tokenStatus, setTokenStatus] = useState<any>(null);
    const [tokenBusy, setTokenBusy] = useState(false);
    const loadTokenStatus = async () => {
        try { setTokenStatus(await apiRequest("/api/fms/token-status", "GET")); } catch { setTokenStatus(null); }
    };
    const saveToken = async () => {
        setTokenBusy(true);
        try {
            const r = await apiRequest("/api/fms/token", "POST", { token: tokenInput.trim() });
            toast({ title: "Token tersimpan", description: r?.expiresInHours != null ? `Berlaku ~${r.expiresInHours} jam` : "Berhasil" });
            setTokenInput(""); await loadTokenStatus();
        } catch (e: any) { toast({ title: "Gagal", description: e?.message || "Token tidak valid", variant: "destructive" }); }
        finally { setTokenBusy(false); }
    };
    const scrapeNow = async () => {
        // Tarik SEMUA data untuk rentang tanggal yang dipilih (hari-per-hari), bukan cuma 3 jam.
        const startDate = dateTimeRange.start.split("T")[0];
        const endDate = dateTimeRange.end.split("T")[0];
        setTokenBusy(true);
        try {
            const r = await apiRequest("/api/fms/scrape-now", "POST", { startDate, endDate });
            toast({ title: "Tarik selesai", description: `${startDate} s/d ${endDate} · ditarik ${r?.fetched ?? 0}, tersimpan ${r?.upserted ?? 0} (baru ${r?.inserted ?? 0})` });
            queryClient.invalidateQueries({ queryKey: ["fms-analytics"] });
        } catch (e: any) { toast({ title: "Gagal tarik", description: e?.message || "Cek token", variant: "destructive" }); }
        finally { setTokenBusy(false); }
    };
    // Backfill aman data lama (Level-2 + Overspeed) untuk rentang tanggal terpilih
    const [backfillBusy, setBackfillBusy] = useState(false);
    const backfillGap = async () => {
        const startDate = dateTimeRange.start.split("T")[0];
        const endDate = dateTimeRange.end.split("T")[0];
        setBackfillBusy(true);
        try {
            const r = await apiRequest("/api/fms/backfill", "POST", { startDate, endDate });
            toast({ title: "Lengkapi data selesai", description: `Ditarik ${r?.fetched ?? 0}, tersimpan ${r?.upserted ?? 0} alarm Level-2` });
            queryClient.invalidateQueries({ queryKey: ["fms-analytics"] });
        } catch (e: any) { toast({ title: "Gagal melengkapi", description: e?.message || "Cek token", variant: "destructive" }); }
        finally { setBackfillBusy(false); }
    };

    /* Berapa penyaring yang sedang hidup — dipakai untuk tombol bersihkan. */
    const jumlahSaringanAktif = filters.categories.length + filters.violationTypes.length
        + filters.shifts.length + filters.validationStatuses.length + filters.weeks.length;


    // Build query string from state
    const buildQueryString = () => {
        const params = new URLSearchParams();
        // Split datetime into date and time parts
        const [startDate, startTime] = dateTimeRange.start.split("T");
        const [endDate, endTime] = dateTimeRange.end.split("T");
        params.append("startDate", startDate);
        params.append("endDate", endDate);
        if (startTime) params.append("startTime", startTime);
        if (endTime) params.append("endTime", endTime);
        // Multi-select: send comma-separated values
        if (filters.categories.length > 0) params.append("category", filters.categories.join(","));
        if (filters.violationTypes.length > 0) params.append("violationType", filters.violationTypes.join(","));
        if (filters.shifts.length > 0) params.append("shift", filters.shifts.join(","));
        if (filters.validationStatuses.length > 0) params.append("validationStatus", filters.validationStatuses.join(","));
        if (filters.weeks.length > 0) params.append("week", filters.weeks.join(","));
        return params.toString();
    };

    // Queries
    const { data: analytics, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ["fms-analytics", dateTimeRange, filters],
        queryFn: async () => {
            const res = await apiRequest(`/api/fms/analytics?${buildQueryString()}`, "GET");
            return res;
        },
        placeholderData: keepPreviousData,
    });

    // Mutations
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/fms/upload", {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["fms-analytics"] });
            toast({
                title: "Upload Berhasil",
                description: `Memproses ${data.processed} baris data.`,
                variant: "default"
            });
            setIsUploadOpen(false);
        },
        onError: (err) => {
            toast({
                title: "Upload Gagal",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    // derived data for charts
    // Warna teks grafik ikut tema; 'black' membuat angka hilang di mode gelap.
    const tinta = warnaGrafik("--grafik-tinta", "#2A2A2A");
    /* Label angka duduk DI ATAS batang. Warnanya harus ikut isi batang:
       putih di atas merah tua, tinta di atas merah muda. Dipatok satu warna
       akan selalu salah di salah satu sisi. */
    const terang = (warna: string) => {
        const m = String(warna || "").trim().match(/^#?([0-9a-f]{6})$/i);
        if (!m) return true;
        const n = parseInt(m[1], 16);
        const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35;   // ambang: di atas ini dianggap terang
    };
    const labelKontras = (ctx: any) => {
        const bg = ctx?.dataset?.backgroundColor;
        const w = Array.isArray(bg) ? bg[ctx.dataIndex] : bg;
        return terang(w) ? tinta : "#FFFFFF";
    };
    const label = warnaGrafik("--grafik-label", "#757575");
    // <details> bawaan tidak menutup saat klik di luar — panelnya menggantung
    // menutupi grafik. Ini menutup semuanya begitu klik jatuh di luar bar saringan.
    const barSaringan = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const tutup = (e: MouseEvent) => {
            const bar = barSaringan.current;
            if (!bar || bar.contains(e.target as Node)) return;
            bar.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
        };
        document.addEventListener("click", tutup);
        return () => document.removeEventListener("click", tutup);
    }, []);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { color: label } },
            datalabels: {
                color: labelKontras,
                font: { weight: 'bold' as const },
                formatter: (value: number) => value > 0 ? value : ''
            }
        },
        scales: {
            x: { ticks: { color: label }, grid: { display: false }, border: { display: false } },
            y: { ticks: { color: label }, grid: { color: warnaGrafik("--grafik-garis", "#E0E0E0") }, border: { display: false } },
        },
    };

    if (isLoading && !analytics) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-muted-foreground" /></div>;

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-500">
                <AlertTriangle className="w-10 h-10 mb-2" />
                <p>Gagal memuat data: {error ? String(error) : "Unknown error"}</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Coba Lagi</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans pb-12">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">FMS Validation</h1>
                            <p className="mt-1 text-[15px] text-muted-foreground">Monitoring dan validasi pelanggaran keselamatan operasional</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                {/* Pintasan rentang sejajar dgn kotak tanggal — mengetik sendiri mudah meleset. */}
                                <div className="hidden items-center gap-0.5 md:flex">
                                    {([["Hari ini", 0], ["7 hari", 6], ["30 hari", 29]] as const).map(([teks, mundur]) => (
                                        <button
                                            key={teks}
                                            type="button"
                                            onClick={() => {
                                                const kini = new Date();
                                                const awal = new Date(kini); awal.setDate(kini.getDate() - mundur);
                                                setDateTimeRange({
                                                    start: `${format(awal, "yyyy-MM-dd")}T00:00`,
                                                    end: `${format(kini, "yyyy-MM-dd")}T23:59`,
                                                });
                                            }}
                                            className="rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                                            {teks}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setDateTimeRange({
                                            start: `${format(startOfMonth(new Date()), "yyyy-MM-dd")}T00:00`,
                                            end: `${format(endOfMonth(new Date()), "yyyy-MM-dd")}T23:59`,
                                        })}
                                        className="rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                                        Bulan ini
                                    </button>
                                    <span className="mx-1 h-4 w-px bg-border" />
                                </div>

                                <div className="flex h-9 items-center rounded-lg border border-border bg-background">
                                    <Calendar className="ml-3 h-3.5 w-3.5 flex-none text-muted-foreground" />
                                    <input
                                        type="datetime-local"
                                        aria-label="Mulai"
                                        className="w-[11.75rem] bg-transparent px-2 text-[13px] tabular-nums text-foreground outline-none"
                                        value={dateTimeRange.start}
                                        onChange={(e) => setDateTimeRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                    <span className="h-4 w-px flex-none bg-border" />
                                    <input
                                        type="datetime-local"
                                        aria-label="Sampai"
                                        className="w-[11.75rem] bg-transparent px-2 text-[13px] tabular-nums text-foreground outline-none"
                                        value={dateTimeRange.end}
                                        onChange={(e) => setDateTimeRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {isFetching && (
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span className="hidden sm:inline">Memuat…</span>
                                </div>
                            )}

                            <Dialog open={tokenOpen} onOpenChange={(o) => { setTokenOpen(o); if (o) loadTokenStatus(); }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="rounded-full px-5 mr-2">Token FMS</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg bg-card">
                                    <DialogHeader><DialogTitle>Token FMS (Auto-pull FAMOUS)</DialogTitle></DialogHeader>
                                    <div className="space-y-3 mt-2 text-sm">
                                        <div className="rounded-lg bg-background border p-3">
                                            {tokenStatus?.hasToken
                                                ? <span>Status: {tokenStatus.expired ? <b className="text-red-600">KEDALUWARSA</b> : <b className="text-foreground">Aktif</b>}{tokenStatus.expiresInHours != null && !tokenStatus.expired ? ` · berlaku ~${tokenStatus.expiresInHours} jam lagi` : ""}</span>
                                                : <span className="text-amber-700 dark:text-amber-400">Belum ada token — tempel di bawah.</span>}
                                        </div>
                                        <ol className="list-decimal ml-4 text-xs text-muted-foreground space-y-1">
                                            <li>Buka FAMOUS (sudah login) → DevTools Console (Cmd+Opt+J)</li>
                                            <li>Ketik: <code className="bg-muted px-1">localStorage.jwt_access_token</code> → salin nilainya (tanpa tanda kutip)</li>
                                            <li>Tempel di sini → Simpan. (Token berlaku ~24 jam, perbarui bila kedaluwarsa)</li>
                                        </ol>
                                        <textarea value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Tempel token (eyJ...)" rows={3}
                                            className="w-full border rounded-lg p-2 text-xs font-mono" />
                                        <div className="flex gap-2">
                                            <Button onClick={saveToken} disabled={tokenBusy || !tokenInput.trim()}>Simpan Token</Button>
                                            <Button onClick={scrapeNow} disabled={tokenBusy} variant="outline" title="Tarik semua data untuk rentang tanggal yang dipilih di atas">{tokenBusy ? "Menarik…" : "Tarik Rentang Ini"}</Button>
                                        </div>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 p-3 space-y-2">
                                            <div className="font-semibold text-foreground text-xs">Lengkapi Data Lama (alarm Level-2)</div>
                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                Upload Excel hanya berisi alarm Level-1. Tombol ini menarik <b>alarm Level-2</b> yang hilang dari FAMOUS untuk rentang tanggal yang sedang dipilih di atas (<b>{dateTimeRange.start.split("T")[0]}</b> s/d <b>{dateTimeRange.end.split("T")[0]}</b>). Aman: tidak menghapus & tidak menggandakan data lama.
                                            </p>
                                            <Button onClick={backfillGap} disabled={backfillBusy || tokenBusy} variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/40">
                                                {backfillBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                                {backfillBusy ? "Melengkapi…" : "Lengkapi Sekarang"}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-full px-6">
                                        <Upload className="w-3.5 h-3.5 mr-2" />
                                        Upload Data
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-popover border-border">
                                    <DialogHeader>
                                        <DialogTitle className="text-[17px] font-medium text-foreground">Upload Data FMS</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 leading-snug">
                                        Sumber utama kini <b>auto-pull FAMOUS</b> (otomatis tiap jam, Level-1 + Level-2). Upload Excel hanya untuk data lama/cadangan — <b>hindari mengunggah hari yang sudah ditarik otomatis</b> agar tidak terjadi data ganda.
                                    </div>
                                    <div
                                        className="mt-4 cursor-pointer rounded-xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-foreground/30 hover:bg-muted/50"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 transition-transform">
                                            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-foreground font-semibold">Klik untuk upload file Excel</p>
                                        <p className="text-xs text-muted-foreground mt-2">Format .xlsx atau .xls (Smart Upsert enabled)</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx, .xls"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                    {uploadMutation.isPending && (
                                        <div className="flex items-center justify-center gap-2 mt-4 text-sm font-medium text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Memproses data...
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>

                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

                {/* ── Baris penyaring ────────────────────────────────────────────
                    Label di atas kendali, bukan teks "Semua X" di dalamnya —
                    supaya nama penyaring dan nilainya bisa dibaca terpisah.
                    Tombol bersih hanya muncul saat ada yang aktif. */}
                <div ref={barSaringan} className="relative z-40 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                        <Saringan
                            label="Kategori"
                            ringkas={filters.categories.length === 0 ? "Semua" : filters.categories.join(", ")}
                            jumlah={filters.categories.length}>
                            {FMS_CATEGORIES.map((cat) => (
                                <Pilihan key={cat} teks={cat} dipilih={filters.categories.includes(cat)}
                                    onUbah={(v) => setFilters(prev => ({ ...prev, categories: v ? [...prev.categories, cat] : prev.categories.filter(c => c !== cat) }))} />
                            ))}
                        </Saringan>

                        <Saringan
                            label="Jenis pelanggaran"
                            ringkas={filters.violationTypes.length === 0 ? "Semua" : filters.violationTypes.length === 1 ? filters.violationTypes[0] : `${filters.violationTypes.length} jenis`}
                            jumlah={filters.violationTypes.length}
                            lebar="w-72">
                            <div className="max-h-72 overflow-y-auto">
                                {(analytics?.availableViolationTypes || analytics?.byViolation)?.map((v: any) => (
                                    <Pilihan key={v.type} teks={v.type} dipilih={filters.violationTypes.includes(v.type)}
                                        onUbah={(c) => setFilters(prev => ({ ...prev, violationTypes: c ? [...prev.violationTypes, v.type] : prev.violationTypes.filter(t => t !== v.type) }))} />
                                ))}
                            </div>
                        </Saringan>

                        <Saringan
                            label="Shift"
                            ringkas={filters.shifts.length === 0 ? "Semua" : filters.shifts.join(", ")}
                            jumlah={filters.shifts.length}
                            lebar="w-44">
                            {["Shift 1", "Shift 2"].map((sh) => (
                                <Pilihan key={sh} teks={sh} dipilih={filters.shifts.includes(sh)}
                                    onUbah={(v) => setFilters(prev => ({ ...prev, shifts: v ? [...prev.shifts, sh] : prev.shifts.filter(x => x !== sh) }))} />
                            ))}
                        </Saringan>

                        <Saringan
                            label="Status validasi"
                            ringkas={filters.validationStatuses.length === 0 ? "Semua" : filters.validationStatuses.join(", ")}
                            jumlah={filters.validationStatuses.length}
                            lebar="w-48">
                            {["Valid", "Tidak Valid"].map((st) => (
                                <Pilihan key={st} teks={st} dipilih={filters.validationStatuses.includes(st)}
                                    onUbah={(v) => setFilters(prev => ({ ...prev, validationStatuses: v ? [...prev.validationStatuses, st] : prev.validationStatuses.filter(x => x !== st) }))} />
                            ))}
                        </Saringan>

                        <Saringan
                            label="Pekan"
                            ringkas={filters.weeks.length === 0 ? "Semua" : `Pekan ${[...filters.weeks].sort((a, b) => a - b).join(", ")}`}
                            jumlah={filters.weeks.length}
                            lebar="w-44">
                            {(analytics?.availableWeeks || [1, 2, 3, 4, 5]).map((w: any) => Number(w)).sort((a: number, b: number) => a - b).map((week: number) => (
                                <Pilihan key={week} teks={`Pekan ${week}`} dipilih={filters.weeks.includes(week)}
                                    onUbah={(v) => setFilters(prev => ({ ...prev, weeks: v ? [...prev.weeks, week] : prev.weeks.filter(x => x !== week) }))} />
                            ))}
                        </Saringan>

                        {jumlahSaringanAktif > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilters({ categories: [], violationTypes: [], shifts: [], validationStatuses: [], weeks: [] })}
                                className="ml-auto flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                                <X className="h-3.5 w-3.5" />
                                Bersihkan {jumlahSaringanAktif} penyaring
                            </button>
                        )}
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <KPICard
                        title="Total Violation"
                        value={analytics?.summary?.totalViolations || 0}
                        icon={<AlertTriangle className="w-8 h-8 text-muted-foreground" />}
                        trend="vs Last Month"
                    />
                    <KPICard
                        title="Valid Data"
                        value={analytics?.summary?.validCount || 0}
                        icon={<CheckCircle className="w-8 h-8 text-muted-foreground" />}
                        subValue={`${((analytics?.summary?.validCount / (analytics?.summary?.totalViolations || 1)) * 100).toFixed(1)}%`}
                    />
                    <KPICard
                        title="Invalid Data"
                        value={analytics?.summary?.invalidCount || 0}
                        icon={<XCircle className="w-8 h-8 text-muted-foreground" />}
                        subValue={`${((analytics?.summary?.invalidCount / (analytics?.summary?.totalViolations || 1)) * 100).toFixed(1)}%`}
                        color="bg-background0 text-foreground"
                    />
                    <KPICard
                        title="Unit Terlibat"
                        value={analytics?.summary?.totalUnits || 0}
                        icon={<FileSpreadsheet className="w-8 h-8 text-muted-foreground" />}
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Main Charts */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* PARETO CHART */}
                        <Card className="bg-card border border-border rounded-xl overflow-hidden">
                            <CardHeader className="bg-card border-b border-border pb-4">
                                <CardTitle className="text-lg font-bold text-foreground">Pareto Jenis Pelanggaran</CardTitle>
                                <CardDescription>Analisa frekuensi berdasarkan tipe pelanggaran</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] p-6">
                                <Bar
                                    data={{
                                        labels: analytics?.byViolation?.map((v: any) => v.type),
                                        datasets: [{
                                            label: 'Jumlah Pelanggaran',
                                            data: analytics?.byViolation?.map((v: any) => v.count),
                                            backgroundColor: warnaGrafik('--grafik-2', '#575757'),
                                            borderRadius: 8,
                                            borderSkipped: false,
                                            barThickness: 40
                                        }]
                                    }}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            y: { beginAtZero: true, ticks: { color: label }, grid: { color: warnaGrafik('--grafik-garis', '#E0E0E0') }, border: { display: false } },
                                            x: { ticks: { color: label }, grid: { display: false }, border: { display: false } }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        {/* SHIFT ANALYSIS CHART */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-card border border-border rounded-xl overflow-hidden">
                                <CardHeader className="bg-card border-b border-border pb-4">
                                    <CardTitle className="text-lg font-bold text-foreground">Distribusi per Shift</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] p-6">
                                    <Bar
                                        data={{
                                            labels: analytics?.byShift?.map((v: any) => v.shift || "Unknown"),
                                            datasets: [{
                                                label: 'Jumlah',
                                                data: analytics?.byShift?.map((v: any) => v.count),
                                                backgroundColor: [warnaGrafik('--grafik-1', '#2A2A2A'), warnaGrafik('--grafik-3', '#757575'), warnaGrafik('--grafik-5', '#B4B4B4')],
                                                borderRadius: 20
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false }, datalabels: { color: labelKontras } },
                                            scales: {
                                                y: { display: false },
                                                x: { ticks: { color: label }, grid: { display: false }, border: { display: false } }
                                            }
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="bg-card border border-border rounded-xl overflow-hidden">
                                <CardHeader className="bg-card border-b border-border pb-4">
                                    <CardTitle className="text-lg font-bold text-foreground">Validasi Rate</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] flex items-center justify-center p-6 bg-background/50">
                                    <Doughnut
                                        data={{
                                            labels: ['Valid', 'Invalid'],
                                            datasets: [{
                                                data: [analytics?.summary?.validCount || 0, analytics?.summary?.invalidCount || 0],
                                                backgroundColor: ['#BA1B23', warnaGrafik('--grafik-6', '#C2C2C2')],
                                                borderWidth: 0,
                                                hoverOffset: 10
                                            }]
                                        }}
                                        options={{
                                            cutout: '75%',
                                            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, datalabels: { color: labelKontras } }
                                        }}
                                    />
                                    <div className="absolute text-center pointer-events-none">
                                        <p className="text-3xl font-bold text-foreground">{((analytics?.summary?.validCount / (analytics?.summary?.totalViolations || 1)) * 100).toFixed(0)}%</p>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valid Rate</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* TABLE MATRIX */}
                        <Card className="bg-card border border-border rounded-xl overflow-hidden">
                            <CardHeader className="border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-muted p-2">
                                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-[15px] font-medium text-foreground">Alert FMS Summary Matrix</CardTitle>
                                        <CardDescription className="text-[12px] text-muted-foreground">Rekapitulasi detail validasi pelanggaran</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                            <tr>
                                                <th className="p-4 border-b border-border pl-6">Alert FMS Type</th>
                                                <th className="p-4 border-b border-border text-center">Total</th>
                                                <th className="p-4 border-b border-border text-center text-foreground">Valid</th>
                                                <th className="p-4 border-b border-border text-center text-red-600 dark:text-red-500">Invalid</th>
                                                <th className="p-4 border-b border-border text-center">Valid %</th>
                                                <th className="p-4 border-b border-border text-center">Invalid %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {analytics?.validationStats?.map((row: any, i: number) => {
                                                const validPct = row.total > 0 ? (row.valid / row.total * 100).toFixed(0) + '%' : '0%';
                                                const invalidPct = row.total > 0 ? (row.invalid / row.total * 100).toFixed(0) + '%' : '0%';
                                                return (
                                                    <tr key={i} className="transition-colors hover:bg-muted/50">
                                                        <td className="p-4 pl-6 font-medium text-foreground">{row.violationType}</td>
                                                        <td className="p-4 text-center font-bold text-muted-foreground">{row.total}</td>
                                                        <td className="p-4 text-center font-bold text-foreground">{row.valid}</td>
                                                        <td className="p-4 text-center font-bold text-red-600 dark:text-red-500">{row.invalid}</td>
                                                        <td className="p-4 text-center font-medium">{validPct}</td>
                                                        <td className="p-4 text-center font-medium text-muted-foreground">{invalidPct}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Permukaan terbalik (bg-primary) memaksa SETIAP warna teks di
                                            dalamnya ikut dibalik. Hijau/merah tidak punya versi terbalik yang
                                            terbaca di kedua mode, jadi barisnya dibuat sepolaritas: bg-muted. */}
                                        <tfoot className="border-t border-border bg-muted text-[13px] font-semibold text-foreground">
                                            <tr>
                                                <td className="p-4 pl-6">Grand Total</td>
                                                <td className="p-4 text-center">{analytics?.summary?.totalViolations}</td>
                                                <td className="p-4 text-center text-foreground">{analytics?.summary?.validCount}</td>
                                                <td className="p-4 text-center text-red-600 dark:text-red-500">{analytics?.summary?.invalidCount}</td>
                                                <td className="p-4 text-center">
                                                    {analytics?.summary?.totalViolations ? (analytics.summary.validCount / analytics.summary.totalViolations * 100).toFixed(0) : 0}%
                                                </td>
                                                <td className="p-4 text-center">
                                                    {analytics?.summary?.totalViolations ? (analytics.summary.invalidCount / analytics.summary.totalViolations * 100).toFixed(0) : 0}%
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-8">

                        {/* HOURLY DISTRIBUTION */}
                        <Card className="bg-card border border-border rounded-xl overflow-hidden">
                            <CardHeader className="bg-card pb-4 border-b border-border">
                                <CardTitle className="text-base font-bold text-foreground">Pola Jam Pelanggaran</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-4 gap-2">
                                    {Array.from({ length: 24 }).map((_, hour) => {
                                        const hourData = analytics?.byHour?.find((h: any) => h.hour === hour);
                                        const count = hourData?.count || 0;
                                        const maxCount = Math.max(...(analytics?.byHour?.map((h: any) => h.count) || [1]));
                                        const intensity = count / maxCount;

                                        // Setiap jenjang membawa pasangan terang+gelap sendiri. Tanpa itu
                                        // jenjang rendah jadi merah muda menyala di atas latar gelap.
                                        let bgClass = "bg-muted text-muted-foreground";
                                        if (count > 0) bgClass = "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
                                        if (intensity > 0.3) bgClass = "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-300";
                                        if (intensity > 0.6) bgClass = "bg-red-400 text-white dark:bg-red-800 dark:text-red-50";
                                        if (intensity > 0.8) bgClass = "bg-red-600 text-white dark:bg-red-700 dark:text-white";

                                        return (
                                            <div key={hour} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold ${bgClass} cursor-help`} title={`${count} violations at ${hour}:00`}>
                                                <span>{String(hour).padStart(2, '0')}</span>
                                                {count > 0 && <span className="text-[10px] opacity-80 scale-75">{count}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* WEEKLY STATS TABLE */}
                        <Card className="bg-card border border-border rounded-xl overflow-hidden">
                            <CardHeader className="bg-card pb-4 border-b border-border">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <span>📅</span> Statistik Mingguan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-background text-muted-foreground font-semibold text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-left pl-6">Minggu</th>
                                            <th className="p-3 text-center">Total</th>
                                            <th className="p-3 text-center">Valid %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {analytics?.byWeek?.length > 0 ? analytics.byWeek.map((w: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-background transition-colors">
                                                <td className="p-3 pl-6 font-medium text-muted-foreground">Week {w.week || "N/A"}</td>
                                                <td className="p-3 text-center text-foreground font-bold">{w.total}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${w.valid / (w.total || 1) > 0.5 ? 'bg-muted text-foreground' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'}`}>
                                                        {((w.valid / (w.total || 1)) * 100).toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={3} className="text-center py-6 text-muted-foreground italic">No trend data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* DRIVER LEADERBOARD */}
                        <Card className="bg-card border border-border rounded-xl overflow-hidden">
                            <CardHeader className="pb-4 border-b border-border">
                                <CardTitle className="text-base font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                    <span></span> Top 10 Violators
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {analytics?.topDrivers?.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {analytics.topDrivers.map((d: any, i: number) => (
                                            <div key={d.rank} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    {d.rank}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{d.driverName}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{d.vehicleNo} • {d.driverNik}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                                                        {d.validCount} Valid
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground italic">No violator data</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, subValue, trend, color }: any) {
    return (
        <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{title}</span>
                </div>
                <p className="mt-2.5 text-[28px] font-semibold leading-none tabular-nums text-foreground">{value}</p>
                {subValue && (
                    <p className="mt-2 text-[12px] text-muted-foreground">
                        <span className="tabular-nums text-foreground">{subValue}</span> rate
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

