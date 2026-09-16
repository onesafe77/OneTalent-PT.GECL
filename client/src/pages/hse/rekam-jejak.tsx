import { useState } from "react";
import { fotoKecil } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, X, ChevronLeft, ChevronRight, ChevronRight as Panah } from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { angka } from "@/lib/hse-statistik";

/**
 * Rekam Jejak Karyawan — pelanggaran FMS & Safe Distance milik GEC/GECL,
 * dicocokkan ke daftar manpower.
 *
 * Berangkat dari DAFTAR KARYAWAN, bukan daftar pelanggaran. Karyawan tanpa
 * pelanggaran tetap tampil: "nol" itu informasi, bukan ketiadaan data.
 * Pencocokan hanya lewat NIK — lihat catatan di server/routes.ts.
 */

const KOSONG = <span className="text-muted-foreground">—</span>;
const inisial = (n: string) =>
    (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
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

export default function RekamJejak() {
    const [cari, setCari] = useState("");
    const [status, setStatus] = useState("aktif");
    const [department, setDepartment] = useState("all");
    const [punya, setPunya] = useState("all");
    const [hal, setHal] = useState(1);
    const [per, setPer] = useState("50");
    const [, pindah] = useLocation();

    const q = new URLSearchParams({ cari, status, department, punya, hal: String(hal), per }).toString();
    const { data, isLoading } = useQuery<any>({ queryKey: [`/api/hse/rekam-jejak?${q}`] });

    const r = data?.ringkas ?? {};
    const baris = data?.data ?? [];
    const halaman = data?.halaman ?? { ke: 1, jumlah: 1 };
    const aktifSaring = (cari ? 1 : 0) + (status !== "aktif" ? 1 : 0) + (department !== "all" ? 1 : 0) + (punya !== "all" ? 1 : 0);
    const reset = () => { setCari(""); setStatus("aktif"); setDepartment("all"); setPunya("all"); setHal(1); };
    const set = (f: (v: string) => void) => (v: string) => { f(v); setHal(1); };

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Rekam Jejak Karyawan</h1>
                <p className="mt-1 text-[15px] text-muted-foreground">
                    {isLoading ? "Memuat…"
                        : `${angka(data?.total ?? 0)} karyawan · ${angka(r.totalPelanggaran ?? 0)} pelanggaran FMS & Safe Distance GEC/GECL`}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { l: "Punya pelanggaran", v: angka(r.punyaPelanggaran ?? 0), ket: `${angka(r.persen ?? 0, 1)}% dari ${angka(r.karyawan ?? 0)} karyawan` },
                    { l: "Total pelanggaran", v: angka(r.totalPelanggaran ?? 0), ket: "FMS + Safe Distance, GEC/GECL saja" },
                    { l: "Sanksi masih berlaku", v: angka(r.sanksiAktif ?? 0), ket: "belum lewat masa pemutihan" },
                    { l: "Pelanggar di luar manpower", v: angka(r.diluarManpower ?? 0), ket: "NIK tercatat melanggar, tak ada di daftar karyawan" },
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
                        <Input className="h-9 pl-9" placeholder="Cari NIK, nama, jabatan, departemen, nomor lambung…"
                            value={cari} onChange={(e) => { setCari(e.target.value); setHal(1); }} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={status} onValueChange={set(setStatus)}>
                            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aktif">Karyawan aktif</SelectItem>
                                <SelectItem value="all">Semua status</SelectItem>
                                {(data?.pilihan?.status ?? []).filter((s: string) => s.toLowerCase() !== "aktif")
                                    .map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={department} onValueChange={set(setDepartment)}>
                            <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua departemen</SelectItem>
                                {(data?.pilihan?.department ?? []).map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={punya} onValueChange={set(setPunya)}>
                            <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua karyawan</SelectItem>
                                <SelectItem value="1">Punya pelanggaran</SelectItem>
                                <SelectItem value="0">Tanpa pelanggaran</SelectItem>
                            </SelectContent>
                        </Select>
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
                                    <TableHead className="w-[56px]"> </TableHead>
                                    <TableHead>NIK</TableHead><TableHead>Nama</TableHead>
                                    <TableHead>Jabatan</TableHead><TableHead>Departemen</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">FMS</TableHead>
                                    <TableHead className="text-right">Jarak aman</TableHead>
                                    <TableHead className="text-right">Sanksi aktif</TableHead>
                                    <TableHead>Sanksi terberat</TableHead>
                                    <TableHead>Terakhir</TableHead>
                                    <TableHead className="pr-4"> </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={12} className="py-10 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                                ) : baris.length === 0 ? (
                                    <TableRow><TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                                        Tidak ada karyawan yang cocok dengan saringan ini.
                                    </TableCell></TableRow>
                                ) : baris.map((o: any) => (
                                    <TableRow key={o.nik} className="cursor-pointer" onClick={() => pindah(`/workspace/hse/rekam-jejak/${o.nik}`)}>
                                        <TableCell className="pr-0">
                                            <Avatar className="h-8 w-8 rounded-lg border border-border">
                                                <AvatarImage src={fotoKecil(o.foto, 96)} alt={o.nama} className="object-cover" />
                                                <AvatarFallback className="rounded-lg bg-muted text-[11px] text-muted-foreground">
                                                    {inisial(o.nama)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-mono text-[12px]">{o.nik}</TableCell>
                                        <TableCell className="whitespace-nowrap font-medium text-foreground">{o.nama || KOSONG}</TableCell>
                                        <TableCell className="max-w-[190px] truncate text-[12px] text-muted-foreground" title={o.jabatan}>
                                            {o.jabatan || KOSONG}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">{o.departemen || KOSONG}</TableCell>
                                        {/* Nol ditampilkan sebagai nol, bukan strip — itu keterangan, bukan data hilang. */}
                                        <TableCell className={`text-right tabular-nums ${o.total > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                            {angka(o.total)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{angka(o.totalFms)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{angka(o.totalSd)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {o.sanksiAktif > 0
                                                ? <span className="font-semibold text-amber-700 dark:text-amber-500">{angka(o.sanksiAktif)}</span>
                                                : <span className="text-muted-foreground">0</span>}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap"><BadgeSanksi s={o.sanksiTerberat} /></TableCell>
                                        <TableCell className="whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">
                                            {o.terakhir ? tgl(o.terakhir) : KOSONG}
                                        </TableCell>
                                        <TableCell className="pr-4 text-right">
                                            <Panah className="inline h-4 w-4 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                        <p className="text-[13px] text-muted-foreground">
                            Halaman {angka(halaman.ke)} dari {angka(halaman.jumlah)} · {angka(data?.total ?? 0)} karyawan
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
                Pencocokan memakai <strong>NIK</strong>, tidak pernah nama — penulisan nama di sheet dan di manpower kerap berbeda
                (“MUHAMMAD SIDIQ” vs “M SIDIQ”) padahal orangnya sama.
                Cakupan halaman ini hanya baris berperusahaan GEC/GECL; riwayat di kontraktor lain ada di halaman Riwayat Pelanggaran.
                {r.diluarManpower ? ` ${angka(r.diluarManpower)} NIK tercatat melanggar atas nama GEC/GECL tapi tidak ada di daftar karyawan — umumnya sudah tidak bekerja di sini.` : ""}
            </div>
        </div>
    );
}
