import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, X, ChevronLeft, ChevronRight, AlertTriangle, Building2, Loader2 } from "lucide-react";
import { angka } from "@/lib/hse-statistik";

/**
 * Riwayat Pelanggaran (Semua Kontraktor).
 *
 * Satu-satunya halaman yang melihat pelanggaran di luar GEC/GECL. Gunanya:
 * melihat rekam jejak seseorang di kontraktor sebelumnya. Digerbangi HSE/HRGA
 * di sisi server; setiap pembukaan riwayat per-orang tercatat di log.
 */

const KOSONG = <span className="text-muted-foreground">—</span>;
const tgl = (s: string | null) => (s ? new Date(s + "T12:00:00").toLocaleDateString("id-ID") : null);

function BadgeSanksi({ s }: { s: string }) {
    if (!s) return KOSONG;
    const kelas = /PHK|SP 3/i.test(s)
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-400"
        : /SP 2/i.test(s)
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400"
            : "border-border bg-muted text-muted-foreground";
    return <Badge className={kelas}>{s}</Badge>;
}

/** Linimasa satu orang — dibuka dari baris daftar. */
function Riwayat({ nik, onTutup }: { nik: string; onTutup: () => void }) {
    const { data, isLoading } = useQuery<any>({ queryKey: [`/api/hse/riwayat-pelanggaran/${nik}`] });
    const o = data?.orang;
    const r = data?.ringkas ?? {};

    return (
        <Dialog open onOpenChange={(v) => !v && onTutup()}>
            <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[20px] tracking-[-0.02em]">
                        {isLoading ? "Memuat…" : `${o?.nama || "(tanpa nama)"} · ${nik}`}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center gap-2 py-12 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Memuat riwayat…
                    </div>
                ) : !o ? (
                    <p className="py-12 text-center text-muted-foreground">NIK ini tidak ada dalam korpus pelanggaran.</p>
                ) : (
                    <div className="space-y-5">
                        {/* Peringatan identitas — WAJIB tampil sebelum apa pun diputuskan. */}
                        {o.namaBentrok && (
                            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
                                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-600 dark:text-red-400" />
                                <div className="text-[13px] leading-relaxed text-red-800 dark:text-red-300">
                                    <p className="font-semibold">Hati-hati: NIK ini tercatat dengan lebih dari satu nama.</p>
                                    <p className="mt-1">
                                        Tercatat sebagai <strong>{o.nama}</strong> dan <strong>{o.namaLain.join(", ")}</strong>.
                                        Bisa jadi salah ketik, bisa jadi memang dua orang berbeda.
                                        Pastikan orangnya benar sebelum riwayat ini dipakai mengambil keputusan.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Cakupan FMS tidak merata — "tidak ada catatan" ≠ "bersih". */}
                        {(r.fmsTidakMerekam ?? []).length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                                <strong>Cakupan tidak penuh.</strong> Data FMS hanya merekam sebagian kontraktor.
                                Untuk {r.fmsTidakMerekam.join(", ")}, yang tercatat di sini hanya pelanggaran jarak aman —
                                tidak adanya catatan FMS berarti <em>tidak terekam</em>, bukan bersih.
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { l: "Total pelanggaran", v: angka(o.total) },
                                { l: "Sebelum masuk GECL", v: angka(o.sebelumGecl) },
                                { l: "Sanksi terberat", v: o.sanksiTerberat || "—" },
                                { l: "Sanksi masih berlaku", v: angka(o.sanksiAktif) },
                            ].map((x) => (
                                <div key={x.l} className="rounded-xl border border-border bg-muted/40 p-3">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{x.l}</p>
                                    <p className="mt-1.5 text-[17px] font-semibold leading-tight text-foreground">{x.v}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>Tercatat di:</span>
                            {o.perusahaan.map((p: string) => (
                                <Badge key={p} variant="outline" className="border-border">{p}</Badge>
                            ))}
                            {o.masukKita && <span className="ml-1">· tercatat di GEC/GECL sejak {tgl(o.masukKita)}</span>}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead><TableHead>Perusahaan</TableHead>
                                        <TableHead>Sumber</TableHead><TableHead>Pelanggaran</TableHead>
                                        <TableHead className="text-right">Ukuran</TableHead>
                                        <TableHead>Lokasi</TableHead><TableHead>Sanksi</TableHead>
                                        <TableHead className="pr-4">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(data.baris ?? []).map((x: any) => (
                                        <TableRow key={x.kunci} className={x.sebelumGecl ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}>
                                            <TableCell className="whitespace-nowrap tabular-nums">
                                                {tgl(x.tanggal) ?? KOSONG}
                                                {x.sebelumGecl && (
                                                    <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-500">
                                                        pra-GECL
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap font-medium">{x.perusahaan || KOSONG}</TableCell>
                                            <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">{x.sumber}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {x.pelanggaran || KOSONG}
                                                {x.kodePelanggaran && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{x.kodePelanggaran}</span>}
                                            </TableCell>
                                            {/* Dua sumber, dua satuan: FMS km/jam, Safe Distance detik. */}
                                            <TableCell className="whitespace-nowrap text-right tabular-nums">
                                                {x.detik !== null ? `${x.detik.toFixed(2)} dtk`
                                                    : x.kecepatan !== null ? <>{angka(x.kecepatan)}<span className="text-muted-foreground"> / {angka(x.batas)}</span></>
                                                        : KOSONG}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{x.lokasiKm ? `KM ${x.lokasiKm}` : KOSONG}</TableCell>
                                            <TableCell className="whitespace-nowrap"><BadgeSanksi s={x.sanksi} /></TableCell>
                                            <TableCell className="whitespace-nowrap pr-4">
                                                {x.status === "Closed" ? (
                                                    <Badge className="border-border bg-muted text-foreground">Closed</Badge>
                                                ) : x.status ? (
                                                    <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400">{x.status}</Badge>
                                                ) : KOSONG}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function RiwayatPelanggaran() {
    const [cari, setCari] = useState("");
    const [perusahaan, setPerusahaan] = useState("all");
    const [lintas, setLintas] = useState(false);
    const [kita, setKita] = useState(false);
    const [hal, setHal] = useState(1);
    const [per, setPer] = useState("50");
    const [buka, setBuka] = useState<string | null>(null);

    const q = new URLSearchParams({
        cari, perusahaan, hanyaLintas: lintas ? "1" : "", hanyaKita: kita ? "1" : "",
        hal: String(hal), per,
    }).toString();
    const { data, isLoading, error } = useQuery<any>({ queryKey: [`/api/hse/riwayat-pelanggaran?${q}`], retry: false });

    const r = data?.ringkas ?? {};
    const baris = data?.data ?? [];
    const halaman = data?.halaman ?? { ke: 1, jumlah: 1 };
    const aktifSaring = (cari ? 1 : 0) + (perusahaan !== "all" ? 1 : 0) + (lintas ? 1 : 0) + (kita ? 1 : 0);
    const reset = () => { setCari(""); setPerusahaan("all"); setLintas(false); setKita(false); setHal(1); };

    if (error) {
        return (
            <div className="p-6 md:p-8">
                <Card className="rounded-xl border border-border bg-card">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-3 text-[15px] font-medium text-foreground">Halaman ini terbatas</p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            Riwayat lintas kontraktor hanya dapat dibuka oleh departemen HSE dan HRGA.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Riwayat Pelanggaran — Semua Kontraktor</h1>
                <p className="mt-1 text-[15px] text-muted-foreground">
                    {isLoading ? "Memuat…"
                        : `${angka(data?.total ?? 0)} orang${aktifSaring ? ` dari ${angka(data?.totalSemua ?? 0)}` : ""} · ${angka(r.barisTerindeks ?? 0)} pelanggaran FMS & Safe Distance`}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { l: "Orang terindeks", v: angka(r.barisTerindeks ? data?.totalSemua : 0), ket: `${angka(r.tanpaNik ?? 0)} baris dibuang tanpa NIK sah` },
                    { l: "Pernah pindah kontraktor", v: angka(r.lintasKontraktor ?? 0), ket: "tercatat di lebih dari satu perusahaan" },
                    { l: "Karyawan kita, riwayat luar", v: angka(r.kitaPunyaRiwayatLuar ?? 0), ket: "punya pelanggaran sebelum masuk GECL" },
                    { l: "Identitas perlu dicek", v: angka(r.namaBentrok ?? 0), ket: "satu NIK, lebih dari satu nama" },
                ].map((x) => (
                    <Card key={x.l} className="rounded-xl border border-border bg-card">
                        <CardContent className="p-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{x.l}</p>
                            <p className="mt-2.5 text-[28px] font-semibold leading-none tabular-nums text-foreground">{x.v}</p>
                            <p className="mt-2 text-[12px] text-muted-foreground">{x.ket}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="space-y-3 p-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Cari NIK atau nama — mis. C-010801 atau HERY"
                            value={cari} onChange={(e) => { setCari(e.target.value); setHal(1); }} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={perusahaan} onValueChange={(v) => { setPerusahaan(v); setHal(1); }}>
                            <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua perusahaan</SelectItem>
                                {(data?.pilihan?.perusahaan ?? []).map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant={lintas ? "default" : "outline"} size="sm" className="h-9"
                            onClick={() => { setLintas((v) => !v); setHal(1); }}>
                            Pernah pindah kontraktor
                        </Button>
                        <Button variant={kita ? "default" : "outline"} size="sm" className="h-9"
                            onClick={() => { setKita((v) => !v); setHal(1); }}>
                            Karyawan GEC/GECL saja
                        </Button>
                        {aktifSaring > 0 && (
                            <Button variant="ghost" size="sm" onClick={reset} className="h-9">
                                <X className="mr-1.5 h-3.5 w-3.5" /> Hapus {aktifSaring} saringan
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
                                    <TableHead>NIK</TableHead><TableHead>Nama</TableHead>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">FMS</TableHead>
                                    <TableHead className="text-right">Jarak aman</TableHead>
                                    <TableHead className="text-right">Pra-GECL</TableHead>
                                    <TableHead>Sanksi terberat</TableHead>
                                    <TableHead>Periode</TableHead>
                                    <TableHead className="pr-4"> </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                                ) : baris.length === 0 ? (
                                    <TableRow><TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                                        Tidak ada orang yang cocok. Coba cari dengan NIK, mis. <span className="font-mono">C-010801</span>.
                                    </TableCell></TableRow>
                                ) : baris.map((o: any) => (
                                    <TableRow key={o.nik} className="cursor-pointer" onClick={() => setBuka(o.nik)}>
                                        <TableCell className="whitespace-nowrap font-mono text-[12px]">{o.nik}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {o.nama || KOSONG}
                                            {o.namaBentrok && (
                                                <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-red-600 dark:text-red-400"
                                                    aria-label="NIK ini tercatat dengan lebih dari satu nama" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {o.perusahaan.slice(0, 4).map((p: string) => (
                                                    <Badge key={p} variant="outline"
                                                        className={`border-border text-[11px] ${["GEC", "GECL"].includes(p) ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                                        {p}
                                                    </Badge>
                                                ))}
                                                {o.perusahaan.length > 4 && <span className="text-[11px] text-muted-foreground">+{o.perusahaan.length - 4}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums">{angka(o.total)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{angka(o.totalFms)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{angka(o.totalSd)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {o.sebelumGecl > 0
                                                ? <span className="font-semibold text-amber-700 dark:text-amber-500">{angka(o.sebelumGecl)}</span>
                                                : KOSONG}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap"><BadgeSanksi s={o.sanksiTerberat} /></TableCell>
                                        <TableCell className="whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">
                                            {o.pertama ? `${o.pertama.slice(0, 7)} – ${o.terakhir?.slice(0, 7)}` : "—"}
                                        </TableCell>
                                        <TableCell className="pr-4 text-right">
                                            <span className="text-[12px] text-muted-foreground underline decoration-border underline-offset-2">Riwayat</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                        <p className="text-[13px] text-muted-foreground">
                            Halaman {angka(halaman.ke)} dari {angka(halaman.jumlah)} · {angka(data?.total ?? 0)} orang
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

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                Sumber: Google Sheet SiCantik, tab FMS ({angka((r.perusahaanFms ?? []).length)} perusahaan) dan
                tab Safe Distance ({angka((r.perusahaanSd ?? []).length)} perusahaan), <strong>tanpa</strong> saringan GEC/GECL.
                Cakupan kedua tab tidak sama — untuk kontraktor yang tidak terekam FMS, tidak adanya catatan berarti tidak terekam, bukan bersih.
                Halaman ini terbatas untuk HSE dan HRGA, dan setiap pembukaan riwayat per-orang tercatat di log server.
            </div>
        </div>
    );
}
