// Tab "Analisis" pada halaman Safety Patrol — rekap semua kegiatan + jumlah sampel.
//
// Catatan penting soal angka sampel: tim menuliskannya di kalimat temuan
// ("Dari 15 driver yang dilakukan ..."), bukan di kolom tersendiri. Karena itu
// setiap total sampel SELALU ditampilkan bersama cakupannya — berapa persen laporan
// yang benar-benar mencantumkan. Tanpa itu, "210 sampel" pada Inspeksi Jalan terlihat
// setara dengan "2.795 sampel" pada Wake up call, padahal yang pertama hanya berasal
// dari 8% laporan.

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Activity, Users, ClipboardList, AlertTriangle, RotateCcw, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

type BarisAnalisis = {
    kegiatan: string; laporan: number; sampel: number; laporanBersampel: number;
    cakupan: number; rataSampel: number; jumlahPetugas: number; resmi: boolean;
    perBulan: Record<string, SelBulan>; contohMentah: string[];
};
type SelBulan = { laporan: number; sampel: number; bersampel: number };
type Hasil = {
    data: BarisAnalisis[];
    totalPerBulan: Record<string, SelBulan>;
    ringkasan: {
        totalLaporan: number; totalSampel: number; laporanBersampel: number;
        cakupanSampel: number; kegiatanTerpakai: number;
        kegiatanResmiKosong: string[]; bulan: string[];
    };
};

const nf = (n: number) => n.toLocaleString("id-ID");

export default function AnalisisTab() {
    const [dari, setDari] = useState("");
    const [sampai, setSampai] = useState("");
    const [ukuran, setUkuran] = useState<"laporan" | "sampel">("laporan");
    const [kegiatan, setKegiatan] = useState("all");

    const qs = dari && sampai ? `?startDate=${dari}&endDate=${sampai}` : "";
    const { data, isLoading, isFetching } = useQuery<Hasil>({
        queryKey: ["/api/safety-patrol/analisis", dari, sampai],
        queryFn: async () => {
            const r = await fetch(`/api/safety-patrol/analisis${qs}`, { credentials: "include" });
            if (!r.ok) throw new Error("Gagal memuat analisis");
            return r.json();
        },
    });

    const semua = data?.data ?? [];
    // Penyaringan kegiatan dikerjakan di sisi klien: seluruh data sudah termuat,
    // jadi berpindah kegiatan tidak perlu memanggil server lagi.
    const baris = useMemo(
        () => (kegiatan === "all" ? semua : semua.filter((b) => b.kegiatan === kegiatan)),
        [semua, kegiatan]);

    // Kartu ringkasan ikut menyesuaikan pilihan, supaya angka di layar selalu
    // menggambarkan apa yang sedang ditampilkan — bukan seluruh data.
    const r = useMemo(() => {
        const asli = data?.ringkasan;
        if (!asli) return undefined;
        if (kegiatan === "all") return asli;
        const totalLaporan = baris.reduce((a, b) => a + b.laporan, 0);
        const totalSampel = baris.reduce((a, b) => a + b.sampel, 0);
        const laporanBersampel = baris.reduce((a, b) => a + b.laporanBersampel, 0);
        return {
            ...asli, totalLaporan, totalSampel, laporanBersampel,
            cakupanSampel: totalLaporan ? Math.round((laporanBersampel / totalLaporan) * 100) : 0,
            kegiatanTerpakai: baris.filter((b) => b.laporan > 0).length,
            kegiatanResmiKosong: baris.filter((b) => b.resmi && b.laporan === 0).map((b) => b.kegiatan),
        };
    }, [data?.ringkasan, baris, kegiatan]);

    // Baris TOTAL matriks juga dihitung ulang dari kegiatan terpilih.
    const totalBulan = useMemo(() => {
        if (kegiatan === "all") return data?.totalPerBulan ?? {};
        const t: Record<string, SelBulan> = {};
        for (const b of baris) {
            for (const [bl, v] of Object.entries(b.perBulan)) {
                const x = t[bl] || { laporan: 0, sampel: 0, bersampel: 0 };
                x.laporan += v.laporan; x.sampel += v.sampel; x.bersampel += v.bersampel;
                t[bl] = x;
            }
        }
        return t;
    }, [data?.totalPerBulan, baris, kegiatan]);

    const maxLaporan = useMemo(() => Math.max(1, ...baris.map((b) => b.laporan)), [baris]);

    if (isLoading) {
        return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-5">
            {/* ── penyaring periode ── */}
            <Card>
                <CardContent className="flex flex-wrap items-end gap-3 p-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Dari tanggal</label>
                        <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="h-9 w-[165px]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Sampai tanggal</label>
                        <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="h-9 w-[165px]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Kegiatan</label>
                        <Select value={kegiatan} onValueChange={setKegiatan}>
                            <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua kegiatan ({semua.length})</SelectItem>
                                {semua.map((b) => (
                                    <SelectItem key={b.kegiatan} value={b.kegiatan}>
                                        {b.kegiatan} · {b.laporan}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {(dari || sampai || kegiatan !== "all") && (
                        <Button variant="ghost" size="sm"
                            onClick={() => { setDari(""); setSampai(""); setKegiatan("all"); }}>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                        </Button>
                    )}
                    {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <div className="ml-auto text-xs text-muted-foreground">
                        {kegiatan !== "all" && <span className="mr-2 font-medium text-primary">{kegiatan}</span>}
                        {dari && sampai ? `${dari} s/d ${sampai}` : r?.bulan?.length ? `Seluruh data · ${r.bulan[0]} s/d ${r.bulan[r.bulan.length - 1]}` : ""}
                    </div>
                </CardContent>
            </Card>

            {/* ── kartu ringkasan ── */}
            {r && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Kartu ikon={<ClipboardList className="h-4 w-4 text-muted-foreground" />} judul="TOTAL LAPORAN"
                        nilai={nf(r.totalLaporan)} ket={`${r.kegiatanTerpakai} jenis kegiatan`} />
                    <Kartu ikon={<Activity className="h-4 w-4 text-muted-foreground" />} judul="TOTAL SAMPEL DIPERIKSA"
                        nilai={nf(r.totalSampel)} ket={`dari ${nf(r.laporanBersampel)} laporan yang mencantumkan`} />
                    <Kartu ikon={<Users className="h-4 w-4 text-muted-foreground" />} judul="CAKUPAN PENCATATAN"
                        nilai={`${r.cakupanSampel}%`} ket="laporan yang menyebut jumlah sampel" />
                    <Kartu ikon={<AlertTriangle className={cn("h-4 w-4", r.kegiatanResmiKosong.length ? "text-destructive" : "text-muted-foreground")} />} judul="KEGIATAN TANPA LAPORAN"
                        nilai={String(r.kegiatanResmiKosong.length)} nilaiKelas={r.kegiatanResmiKosong.length ? "text-destructive" : undefined}
                        ket={r.kegiatanResmiKosong.length ? r.kegiatanResmiKosong.join(", ") : "semua kegiatan ada laporannya"} />
                </div>
            )}

            {/* ── peringatan cakupan ── */}
            {r && r.cakupanSampel < 100 && (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p>
                        Jumlah sampel dibaca dari kalimat temuan (mis. <em>"Dari 15 driver yang dilakukan..."</em>),
                        karena tidak ada kolomnya sendiri. Baru <strong>{r.cakupanSampel}%</strong> laporan yang
                        mencantumkannya — kolom <strong>Cakupan</strong> di bawah menunjukkan seberapa lengkap angka
                        tiap kegiatan. Kegiatan dengan cakupan rendah berarti angka sampelnya belum menggambarkan
                        keseluruhan.
                    </p>
                </div>
            )}

            {/* ── tabel per kegiatan ── */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="px-4 py-3 text-left font-semibold">Kegiatan</th>
                                    <th className="px-3 py-3 text-right font-semibold">Laporan</th>
                                    <th className="min-w-[130px] px-3 py-3 text-left font-semibold">Porsi</th>
                                    <th className="px-3 py-3 text-right font-semibold">Sampel</th>
                                    <th className="px-3 py-3 text-right font-semibold">Cakupan</th>
                                    <th className="px-3 py-3 text-right font-semibold">Rata²</th>
                                    <th className="px-4 py-3 text-right font-semibold">Petugas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baris.length === 0 && (
                                    <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">
                                        Kegiatan ini belum punya laporan pada periode yang dipilih.
                                    </td></tr>
                                )}
                                {baris.map((b) => (
                                    <tr key={b.kegiatan} className={cn("border-b border-border last:border-0 hover:bg-muted/40",
                                        b.laporan === 0 && "opacity-55")}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{b.kegiatan}</span>
                                                {!b.resmi && <Badge variant="outline" className="text-[10px] font-normal">di luar daftar baku</Badge>}
                                                {b.resmi && b.laporan === 0 && <Badge variant="outline" className="text-[10px] font-normal text-destructive">belum ada laporan</Badge>}
                                            </div>
                                            {b.contohMentah.length > 0 && (
                                                <p className="mt-1 max-w-[420px] truncate text-[11px] text-muted-foreground"
                                                    title={b.contohMentah.join(" · ")}>
                                                    berisi: {b.contohMentah.slice(0, 3).join(" · ")}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{nf(b.laporan)}</td>
                                        <td className="px-3 py-3">
                                            <div className="h-1.5 w-full rounded-full bg-muted">
                                                <div className="h-1.5 rounded-full bg-primary"
                                                    style={{ width: `${(b.laporan / maxLaporan) * 100}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {b.sampel > 0 ? (
                                                <span className="font-semibold text-foreground">{nf(b.sampel)}</span>
                                            ) : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {b.laporan === 0 ? <span className="text-muted-foreground/40">—</span> : (
                                                <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium tabular-nums",
                                                    b.cakupan >= 80 ? "bg-muted text-foreground"
                                                        : b.cakupan >= 30 ? "bg-amber-100 text-amber-800"
                                                            : "bg-destructive/10 text-destructive")}>
                                                    {b.cakupan}%
                                                </span>
                                            )}
                                            <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                                                {b.laporan ? `${b.laporanBersampel}/${b.laporan}` : ""}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                                            {b.rataSampel > 0 ? b.rataSampel : <span className="text-muted-foreground/40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{b.jumlahPetugas || <span className="text-muted-foreground/40">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {r && (
                                <tfoot>
                                    <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                                        <td className="px-4 py-3">TOTAL</td>
                                        <td className="px-3 py-3 text-right tabular-nums">{nf(r.totalLaporan)}</td>
                                        <td />
                                        <td className="px-3 py-3 text-right tabular-nums text-foreground">{nf(r.totalSampel)}</td>
                                        <td className="px-3 py-3 text-right tabular-nums">{r.cakupanSampel}%</td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ── matriks kegiatan x bulan ── */}
            {r && r.bulan.length > 0 && (
                <Card>
                    <CardContent className="p-0">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                            <div className="flex items-center gap-2">
                                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Rincian per Bulan</h3>
                                <span className="text-xs text-muted-foreground">{r.bulan.length} bulan</span>
                            </div>
                            <div className="flex items-center gap-1 rounded-md border p-0.5">
                                {(["laporan", "sampel"] as const).map((u) => (
                                    <button key={u} onClick={() => setUkuran(u)}
                                        className={cn("rounded px-2.5 py-1 text-xs font-medium capitalize transition",
                                            ukuran === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                                        {u === "laporan" ? "Jumlah laporan" : "Jumlah sampel"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="border-collapse text-xs">
                                <thead>
                                    <tr className="bg-muted/50">
                                        {/* latar buram diulang: sel menempel akan tembus tanpa ini */}
                                        <th className="sticky left-0 z-20 min-w-[210px] border-b border-r bg-muted/50 px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                                            Kegiatan
                                        </th>
                                        {r.bulan.map((b) => (
                                            <th key={b} className="min-w-[62px] border-b border-r px-2 py-2.5 text-center font-semibold text-muted-foreground">
                                                {labelBulan(b)}
                                            </th>
                                        ))}
                                        <th className="min-w-[70px] border-b bg-muted px-3 py-2.5 text-right font-semibold uppercase tracking-wide text-muted-foreground">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {baris.filter((b) => b.laporan > 0).map((b) => {
                                        const totalBaris = ukuran === "laporan" ? b.laporan : b.sampel;
                                        return (
                                            <tr key={b.kegiatan} className="group hover:bg-muted/50">
                                                <td className="sticky left-0 z-10 border-b border-r bg-card px-4 py-2 font-medium text-foreground group-hover:bg-muted/50">
                                                    <span className="block max-w-[200px] truncate" title={b.kegiatan}>{b.kegiatan}</span>
                                                </td>
                                                {r.bulan.map((bl) => {
                                                    const sel = b.perBulan[bl];
                                                    const nilai = sel ? (ukuran === "laporan" ? sel.laporan : sel.sampel) : 0;
                                                    return (
                                                        <td key={bl}
                                                            title={sel ? `${labelBulan(bl)} · ${sel.laporan} laporan · ${sel.sampel} sampel dari ${sel.bersampel} laporan` : ""}
                                                            className={cn("border-b border-r px-2 py-2 text-center tabular-nums",
                                                                nilai === 0 ? "text-muted-foreground/30" : "font-medium text-foreground",
                                                                nilai > 0 && warnaSel(nilai, ukuran === "laporan" ? 60 : 400))}>
                                                            {nilai === 0 ? "·" : nf(nilai)}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border-b bg-muted/50 px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                                                    {nf(totalBaris)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted font-semibold">
                                        <td className="sticky left-0 z-10 border-r bg-muted px-4 py-2.5 uppercase tracking-wide text-muted-foreground">
                                            Total
                                        </td>
                                        {r.bulan.map((bl) => {
                                            const t = totalBulan[bl];
                                            const nilai = t ? (ukuran === "laporan" ? t.laporan : t.sampel) : 0;
                                            return (
                                                <td key={bl} className="border-r px-2 py-2.5 text-center tabular-nums text-foreground">
                                                    {nilai ? nf(nilai) : "·"}
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                                            {nf(ukuran === "laporan" ? r.totalLaporan : r.totalSampel)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <p className="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
                            Arahkan kursor ke sebuah sel untuk melihat jumlah laporan dan sampel bulan itu sekaligus.
                            Bulan dengan satu-dua laporan (mis. 2015, 2023) berasal dari tanggal yang salah ketik di
                            laporan lama — belum dibersihkan.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/** "2026-08" -> "Ags 26" — cukup pendek untuk kolom sempit, tetap tak ambigu. */
const BLN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
function labelBulan(b: string): string {
    const m = /^(\d{4})-(\d{2})$/.exec(b);
    if (!m) return b;
    return `${BLN_PENDEK[+m[2] - 1]} ${m[1].slice(2)}`;
}

/** Semakin besar angkanya, semakin pekat latarnya — supaya pola bulanan langsung terlihat. */
function warnaSel(n: number, acuan: number): string {
    const r = n / acuan;
    if (r >= 0.75) return "bg-primary/25";
    if (r >= 0.45) return "bg-primary/[0.14]";
    if (r >= 0.2) return "bg-primary/[0.06]";
    return "";
}

function Kartu({ ikon, judul, nilai, ket, nilaiKelas }: { ikon: React.ReactNode; judul: string; nilai: string; ket: string; nilaiKelas?: string }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{judul}</p>
                    {ikon}
                </div>
                <p className={cn("mt-1.5 text-3xl font-semibold tabular-nums", nilaiKelas || "text-foreground")}>{nilai}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ket}</p>
            </CardContent>
        </Card>
    );
}
