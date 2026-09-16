import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { angka, BULAN } from "@/lib/hse-statistik";

/**
 * Database Violation FMS — satu baris per kejadian, seluruh kolom sheet.
 * Halaman penelusuran; analisis ada di Dashboard Overspeed.
 */

const KOSONG = <span className="text-muted-foreground">—</span>;

export default function FmsDatabase() {
    const [cari, setCari] = useState("");
    const [hal, setHal] = useState(1);
    const [per, setPer] = useState("50");
    const [f, setF] = useState<Record<string, string>>({
        tahun: "all", bulan: "all", jenis: "all", status: "all",
        sanksi: "all", shift: "all", jalur: "all", level: "all",
    });

    const q = new URLSearchParams({ ...f, cari, hal: String(hal), per }).toString();
    const { data, isLoading } = useQuery<any>({ queryKey: [`/api/hse/fms-violations?${q}`] });
    const p = data?.pilihan ?? {};
    const baris = data?.data ?? [];
    const halaman = data?.halaman ?? { ke: 1, jumlah: 1 };

    const set = (k: string, v: string) => { setF((s) => ({ ...s, [k]: v })); setHal(1); };
    const aktif = Object.entries(f).filter(([, v]) => v !== "all").length + (cari ? 1 : 0);
    const reset = () => {
        setF({ tahun: "all", bulan: "all", jenis: "all", status: "all", sanksi: "all", shift: "all", jalur: "all", level: "all" });
        setCari(""); setHal(1);
    };

    const SARING = [
        { k: "tahun", label: "Semua tahun", opsi: p.tahun ?? [] },
        { k: "bulan", label: "Semua bulan", opsi: BULAN.map((_, i) => String(i + 1).padStart(2, "0")), nama: (x: string) => BULAN[Number(x) - 1] },
        { k: "jenis", label: "Semua jenis", opsi: p.jenis ?? [] },
        { k: "status", label: "Semua status", opsi: p.status ?? [], ekstra: [{ v: "belum", n: "Belum selesai" }] },
        { k: "sanksi", label: "Semua sanksi", opsi: p.sanksi ?? [] },
        { k: "shift", label: "Semua shift", opsi: p.shift ?? [] },
        { k: "jalur", label: "Semua jalur", opsi: p.jalur ?? [] },
        { k: "level", label: "Semua level", opsi: p.level ?? [] },
    ];

    const tgl = (s: string | null) => (s ? new Date(s + "T12:00:00").toLocaleDateString("id-ID") : null);

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Database Violation FMS</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        {isLoading ? "Memuat…"
                            : `${angka(data?.total ?? 0)} pelanggaran${aktif ? ` dari ${angka(data?.totalSemua ?? 0)}` : ""} · khusus unit GEC & GECL`}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <a href={`/api/hse/fms-violations/export?${new URLSearchParams({ ...f, cari }).toString()}`}>
                        <Download className="mr-2 h-4 w-4" /> Ekspor Excel
                    </a>
                </Button>
            </div>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="space-y-3 p-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Cari NIK, nama, unit, sanksi, kode, kategori, jalur, lokasi, status…"
                            value={cari} onChange={(e) => { setCari(e.target.value); setHal(1); }} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {SARING.map((s) => (
                            <Select key={s.k} value={f[s.k]} onValueChange={(v) => set(s.k, v)}>
                                <SelectTrigger className="h-9 w-[142px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{s.label}</SelectItem>
                                    {(s.ekstra ?? []).map((e) => <SelectItem key={e.v} value={e.v}>{e.n}</SelectItem>)}
                                    {s.opsi.map((o: string) => <SelectItem key={o} value={o}>{s.nama ? s.nama(o) : o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ))}
                        {aktif > 0 && (
                            <Button variant="ghost" size="sm" onClick={reset} className="h-9">
                                <X className="mr-1.5 h-3.5 w-3.5" /> Hapus {aktif} saringan
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead><TableHead>Hari kerja</TableHead>
                                    <TableHead>Unit</TableHead><TableHead>NIK</TableHead><TableHead>Nama</TableHead>
                                    <TableHead>Pelanggaran</TableHead><TableHead className="text-right">Kec. / batas</TableHead>
                                    <TableHead>Lokasi</TableHead><TableHead>Jalur</TableHead><TableHead>Level</TableHead>
                                    <TableHead>Sanksi</TableHead><TableHead>Berlaku s.d.</TableHead>
                                    <TableHead>Status</TableHead><TableHead className="text-right pr-4">Durasi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={14} className="py-10 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                                ) : baris.length === 0 ? (
                                    <TableRow><TableCell colSpan={14} className="py-12 text-center text-muted-foreground">
                                        Tidak ada pelanggaran untuk saringan ini. Data tersedia {p.tahun?.length ? `tahun ${p.tahun[p.tahun.length - 1]}–${p.tahun[0]}` : "—"}.
                                    </TableCell></TableRow>
                                ) : baris.map((x: any) => (
                                    <TableRow key={x.kunci}>
                                        <TableCell className="whitespace-nowrap tabular-nums">
                                            {tgl(x.tanggal) ?? KOSONG}
                                            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{x.jam?.slice(0, 5)}</span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                                            {x.hari || "—"}{x.minggu ? ` · W${x.minggu}` : ""}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-medium text-foreground">{x.unit}</TableCell>
                                        <TableCell className="font-mono text-[12px]">{x.nik || KOSONG}</TableCell>
                                        <TableCell className="whitespace-nowrap">{x.nama || KOSONG}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {x.pelanggaran || KOSONG}
                                            {x.kodePelanggaran && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{x.kodePelanggaran}</span>}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                                            {x.kecepatan !== null ? <>{angka(x.kecepatan)}<span className="text-muted-foreground"> / {angka(x.batas)}</span></> : KOSONG}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{x.lokasiKm ? `KM ${x.lokasiKm}` : KOSONG}</TableCell>
                                        <TableCell>{x.jalur || KOSONG}</TableCell>
                                        <TableCell className="whitespace-nowrap">{x.level || KOSONG}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {x.sanksi ? (
                                                <Badge className={/PHK|SP 3/i.test(x.sanksi)
                                                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-400"
                                                    : /SP 2/i.test(x.sanksi)
                                                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400"
                                                    : "border-border bg-muted text-muted-foreground"}>{x.sanksi}</Badge>
                                            ) : KOSONG}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap tabular-nums">{tgl(x.masaBerlakuSanksi) ?? KOSONG}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {x.status === "Closed" ? (
                                                <Badge className="border-border bg-muted text-foreground">Closed</Badge>
                                            ) : x.status ? (
                                                <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400">{x.status}</Badge>
                                            ) : KOSONG}
                                        </TableCell>
                                        <TableCell className="pr-4 text-right tabular-nums">
                                            {x.durasiClose !== null ? `${angka(x.durasiClose)} hari` : KOSONG}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                        <p className="text-[13px] text-muted-foreground">
                            Halaman {angka(halaman.ke)} dari {angka(halaman.jumlah)} · {angka(data?.total ?? 0)} baris
                        </p>
                        <div className="flex items-center gap-2">
                            <Select value={per} onValueChange={(v) => { setPer(v); setHal(1); }}>
                                <SelectTrigger className="h-8 w-[104px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{["25", "50", "100", "200"].map((n) => <SelectItem key={n} value={n}>{n} / halaman</SelectItem>)}</SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => setHal((h) => Math.max(1, h - 1))} disabled={halaman.ke <= 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8"
                                onClick={() => setHal((h) => Math.min(halaman.jumlah, h + 1))} disabled={halaman.ke >= halaman.jumlah}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
