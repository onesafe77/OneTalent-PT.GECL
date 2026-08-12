import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Search, Plus, Loader2, ShieldAlert, Pencil, Trash2, Eye, Settings2,
    TrendingUp, AlertTriangle, X,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    JENIS_KEJADIAN, DAFTAR_DIAGNOSA, STATUS_PERAWATAN, UNIT_POOL, BULAN_SINGKAT,
} from "@shared/health-ref";

const API_REG = "/api/health/sick-register";
const API_IND = "/api/health/indicators";

const angka = (n: number, desimal = 2) =>
    (n ?? 0).toLocaleString("id-ID", { minimumFractionDigits: desimal, maximumFractionDigits: desimal });

const INDIKATOR = [
    { kunci: "mfr", kode: "MFR", nama: "Morbidity Frequency Rate", thr: "thresholdMfr", desimal: 2 },
    { kunci: "ssr", kode: "SSR", nama: "Sickness Severity Rate", thr: "thresholdSsr", desimal: 2 },
    { kunci: "asr", kode: "ASR", nama: "Accident Severity Rate", thr: "thresholdAsr", desimal: 2 },
    { kunci: "cmr", kode: "CMR", nama: "Crude Morbidity Rate", thr: "thresholdCmr", desimal: 4 },
] as const;

export default function IndikatorKesehatan() {
    const kini = new Date();
    const [tahun, setTahun] = useState(String(kini.getFullYear()));
    const [bulan, setBulan] = useState("all");
    const [jenis, setJenis] = useState("all");
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState<any>(null);   // objek kejadian atau {} utk baru
    const [lihat, setLihat] = useState<any>(null);
    const [hapus, setHapus] = useState<any>(null);
    const [setelanOpen, setSetelanOpen] = useState(false);

    const { data: ind, error, refetch: refetchInd } = useQuery({
        queryKey: [API_IND, tahun],
        queryFn: async () => {
            const res = await fetch(`${API_IND}?tahun=${tahun}`);
            if (res.status === 403) throw new Error("FORBIDDEN");
            if (!res.ok) throw new Error("Gagal memuat indikator");
            return res.json();
        },
        retry: false,
    });

    const params = new URLSearchParams({
        tahun, ...(bulan !== "all" ? { bulan } : {}), ...(jenis !== "all" ? { jenis } : {}),
        ...(search ? { search } : {}),
    });
    const { data: reg, isLoading, refetch: refetchReg } = useQuery({
        queryKey: [API_REG, params.toString()],
        queryFn: async () => {
            const res = await fetch(`${API_REG}?${params.toString()}`);
            if (!res.ok) throw new Error("Gagal memuat register");
            return res.json();
        },
        retry: false,
    });

    const { data: diag, refetch: refetchDiag } = useQuery({
        queryKey: ["/api/health/diagnosa", tahun],
        queryFn: async () => (await fetch(`/api/health/diagnosa?tahun=${tahun}`)).json(),
        retry: false,
    });

    const segarkan = () => { refetchInd(); refetchReg(); refetchDiag(); };

    if (error?.message === "FORBIDDEN") {
        return (
            <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50"><ShieldAlert className="h-7 w-7 text-rose-500" /></div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Akses Ditolak</h2>
                <p className="max-w-md text-sm text-slate-500">Hanya departemen HSE, HRGA, dan PJO yang dapat membuka indikator kesehatan.</p>
            </div>
        );
    }

    const perBulan = ind?.perBulan || [];
    const ytd = ind?.ytd;
    const setting = ind?.setting;
    const rows = reg?.data || [];
    const diagnosaTerisi = (diag?.data || []).filter((d: any) => d.jumlah > 0)
        .sort((a: any, b: any) => b.jumlah - a.jumlah);

    const grafik = useMemo(() => perBulan.map((b: any) => ({
        label: BULAN_SINGKAT[b.bulan - 1], mfr: b.mfr, ssr: b.ssr, asr: b.asr,
    })), [perBulan]);

    return (
        <div className="space-y-7 pb-10">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
                <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">HSE · Kesehatan</p>
                    <h1 className="text-[26px] font-bold leading-none tracking-tight text-slate-900">Indikator Kesehatan K3</h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                        MFR · SSR · ASR · CMR — dihitung otomatis dari register kejadian
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-400">faktor pengali {angka(setting?.faktorPengali ?? 1000000, 0)}</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Select value={tahun} onValueChange={setTahun}>
                        <SelectTrigger className="w-[110px] rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(ind?.tahunTersedia || [kini.getFullYear()]).map((t: number) => (
                                <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setSetelanOpen(true)}
                        className="rounded-xl transition-transform duration-150 ease-out active:scale-[0.97]">
                        <Settings2 className="mr-2 h-4 w-4" /> Man-Hours & Threshold
                    </Button>
                    <Button onClick={() => setFormOpen({})}
                        className="rounded-xl bg-slate-900 transition-transform duration-150 ease-out hover:bg-slate-800 active:scale-[0.97]">
                        <Plus className="mr-2 h-4 w-4" /> Catat Kejadian
                    </Button>
                </div>
            </header>

            {/* Kartu indikator YTD */}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {INDIKATOR.map(i => {
                    const nilai = ytd?.[i.kunci] ?? 0;
                    const batas = setting?.[i.thr] ?? 0;
                    const lewat = nilai > batas;
                    return (
                        <Card key={i.kunci} className={`rounded-2xl shadow-none ${lewat ? "border-rose-300 bg-rose-50/40" : "border-slate-200/80"}`}>
                            <CardContent className="p-4">
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-[11px] font-bold tracking-wide text-slate-500">{i.kode}</span>
                                    {lewat
                                        ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">di atas batas</span>
                                        : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">aman</span>}
                                </div>
                                <p className={`text-2xl font-bold tabular-nums ${lewat ? "text-rose-700" : "text-slate-900"}`}>
                                    {angka(nilai, i.desimal)}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{i.nama}</p>
                                <p className="mt-1 text-[11px] tabular-nums text-slate-400">Threshold {angka(batas, i.desimal)}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </section>

            {/* Ringkasan data YTD */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                    ["Kasus Sakit", ytd?.kasusSakit ?? 0, 0],
                    ["Hari Hilang (Sakit)", ytd?.hariHilangSakit ?? 0, 0],
                    ["Hari Hilang (Kecelakaan)", ytd?.hariHilangKecelakaan ?? 0, 0],
                    ["Total Jam Kerja", ytd?.jamKerja ?? 0, 0],
                    ["Jumlah Tenaga Kerja", ytd?.tenagaKerja ?? 0, 0],
                ].map(([label, nilai, d]: any) => (
                    <div key={label} className="rounded-xl border border-slate-200/80 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="text-lg font-bold tabular-nums text-slate-900">{angka(nilai, d)}</p>
                    </div>
                ))}
            </section>

            {/* Grafik tren + rekap diagnosa */}
            <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <Card className="rounded-2xl border-slate-200/80 shadow-none">
                    <CardContent className="p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-slate-400" />
                            <h2 className="text-sm font-semibold text-slate-800">Tren Indikator per Bulan</h2>
                        </div>
                        <div className="-ml-3 h-[230px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={grafik} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="gMfr" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#e11d48" stopOpacity={0.2} />
                                            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 4" stroke="#eef2f7" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={38} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                        formatter={(v: any, n: any) => [angka(Number(v)), String(n).toUpperCase()]} />
                                    {setting?.thresholdMfr > 0 && (
                                        <ReferenceLine y={setting.thresholdMfr} stroke="#f59e0b" strokeDasharray="4 4"
                                            label={{ value: "threshold", fontSize: 10, fill: "#b45309", position: "right" }} />
                                    )}
                                    <Area type="monotone" dataKey="mfr" stroke="#e11d48" strokeWidth={2} fill="url(#gMfr)" dot={{ r: 2 }} />
                                    <Area type="monotone" dataKey="ssr" stroke="#7c3aed" strokeWidth={2} fill="transparent" dot={{ r: 2 }} />
                                    <Area type="monotone" dataKey="asr" stroke="#0284c7" strokeWidth={2} fill="transparent" dot={{ r: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 flex gap-4 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-rose-600" /> MFR</span>
                            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-violet-600" /> SSR</span>
                            <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded bg-sky-600" /> ASR</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/80 shadow-none">
                    <CardContent className="p-5">
                        <h2 className="mb-3 text-sm font-semibold text-slate-800">Rekap Diagnosa (YTD)</h2>
                        {diagnosaTerisi.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-400">Belum ada kejadian tercatat.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {diagnosaTerisi.map((d: any) => {
                                    const maks = Math.max(...diagnosaTerisi.map((x: any) => x.jumlah));
                                    return (
                                        <div key={d.diagnosa} className="flex items-center gap-3">
                                            <span className="w-[130px] shrink-0 truncate text-[12px] text-slate-700">{d.diagnosa}</span>
                                            <span className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <span className="absolute inset-y-0 left-0 rounded-full bg-slate-700"
                                                    style={{ width: `${Math.max(4, (d.jumlah / maks) * 100)}%` }} />
                                            </span>
                                            <span className="w-6 text-right text-[12px] font-semibold tabular-nums text-slate-900">{d.jumlah}</span>
                                        </div>
                                    );
                                })}
                                <div className="mt-2 flex justify-between border-t pt-2 text-[12px]">
                                    <span className="font-semibold text-slate-500">TOTAL</span>
                                    <span className="font-bold tabular-nums text-slate-900">{diag?.total ?? 0}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Tabel bulanan seperti sheet Rekap */}
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-none">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="h-9 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Uraian</TableHead>
                                {BULAN_SINGKAT.map(b => (
                                    <TableHead key={b} className="h-9 text-center text-[10px] font-semibold uppercase text-slate-400">{b}</TableHead>
                                ))}
                                <TableHead className="h-9 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">YTD</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                ["Jumlah Kasus Sakit", "kasusSakit", 0],
                                ["Hari Hilang krn Sakit", "hariHilangSakit", 0],
                                ["Hari Hilang krn Kecelakaan", "hariHilangKecelakaan", 0],
                                ["Total Jam Kerja", "jamKerja", 0],
                                ["Jumlah Tenaga Kerja", "tenagaKerja", 0],
                            ].map(([label, kunci, d]: any) => (
                                <TableRow key={kunci} className="border-slate-100">
                                    <TableCell className="py-2 text-[12px] font-medium text-slate-700">{label}</TableCell>
                                    {perBulan.map((b: any) => (
                                        <TableCell key={b.bulan} className="py-2 text-center text-[12px] tabular-nums text-slate-600">
                                            {b[kunci] ? angka(b[kunci], d) : <span className="text-slate-300">0</span>}
                                        </TableCell>
                                    ))}
                                    <TableCell className="py-2 text-center text-[12px] font-bold tabular-nums text-slate-900">
                                        {angka(ytd?.[kunci] ?? 0, d)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {INDIKATOR.map(i => (
                                <TableRow key={i.kunci} className="border-slate-100 bg-slate-50/40">
                                    <TableCell className="py-2 text-[12px] font-semibold text-slate-800">{i.kode}</TableCell>
                                    {perBulan.map((b: any) => {
                                        const lewat = b[i.kunci] > (setting?.[i.thr] ?? Infinity);
                                        return (
                                            <TableCell key={b.bulan}
                                                className={`py-2 text-center text-[12px] tabular-nums ${lewat ? "font-bold text-rose-600" : "text-slate-600"}`}>
                                                {b[i.kunci] ? angka(b[i.kunci], i.desimal) : <span className="text-slate-300">0</span>}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className={`py-2 text-center text-[12px] font-bold tabular-nums ${(ytd?.[i.kunci] ?? 0) > (setting?.[i.thr] ?? Infinity) ? "text-rose-600" : "text-slate-900"}`}>
                                        {angka(ytd?.[i.kunci] ?? 0, i.desimal)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Register kejadian */}
            <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h2 className="mr-auto text-sm font-semibold text-slate-800">Register Driver Sakit</h2>
                    <div className="relative min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input className="rounded-xl pl-9" placeholder="Cari nama, NIK, diagnosa..."
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={bulan} onValueChange={setBulan}>
                        <SelectTrigger className="w-[120px] rounded-xl"><SelectValue placeholder="Bulan" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Bulan</SelectItem>
                            {BULAN_SINGKAT.map((b, i) => <SelectItem key={b} value={String(i + 1)}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={jenis} onValueChange={setJenis}>
                        <SelectTrigger className="w-[210px] rounded-xl"><SelectValue placeholder="Jenis" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Jenis</SelectItem>
                            {JENIS_KEJADIAN.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-none">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    {["Tanggal", "Driver", "Unit", "Jenis Kejadian", "Diagnosa", "Tidak Masuk", "Hari Hilang", "Status", "Aksi"].map(h => (
                                        <TableHead key={h} className={`h-9 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 ${h === "Aksi" ? "w-[110px] text-center" : ""}`}>{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-slate-400">Memuat register...</TableCell></TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-slate-400">
                                        Belum ada kejadian tercatat. Klik "Catat Kejadian" untuk menambah.
                                    </TableCell></TableRow>
                                ) : rows.map((r: any) => (
                                    <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50/70">
                                        <TableCell className="py-2.5 whitespace-nowrap text-[12px] tabular-nums text-slate-600">
                                            {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            <p className="text-[13px] font-semibold text-slate-900">{r.namaDriver}</p>
                                            <p className="text-[11px] text-slate-400">{r.nik || "—"}{r.empPosisi ? ` · ${r.empPosisi}` : ""}</p>
                                        </TableCell>
                                        <TableCell className="text-[12px] text-slate-600">{r.unitPool || "—"}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${/kecelakaan/i.test(r.jenisKejadian) ? "text-sky-700" : /pak/i.test(r.jenisKejadian) ? "text-amber-700" : "text-slate-700"}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${/kecelakaan/i.test(r.jenisKejadian) ? "bg-sky-500" : /pak/i.test(r.jenisKejadian) ? "bg-amber-500" : "bg-slate-400"}`} />
                                                {r.jenisKejadian}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-[12px] text-slate-700">{r.diagnosa || "—"}</TableCell>
                                        <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-slate-500">
                                            {r.tglMulaiTidakMasuk ? new Date(r.tglMulaiTidakMasuk).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "—"}
                                            {r.tglMasukKembali ? ` → ${new Date(r.tglMasukKembali).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}` : ""}
                                        </TableCell>
                                        <TableCell className="text-center text-[13px] font-semibold tabular-nums text-slate-900">{r.hariHilang ?? 0}</TableCell>
                                        <TableCell className="text-[12px] text-slate-600">{r.statusPerawatan || "—"}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <Aksi judul="Lihat" warna="hover:text-slate-900" onClick={() => setLihat(r)}><Eye className="h-4 w-4" /></Aksi>
                                                <Aksi judul="Ubah" warna="hover:text-amber-600" onClick={() => setFormOpen(r)}><Pencil className="h-4 w-4" /></Aksi>
                                                <Aksi judul="Hapus" warna="hover:text-rose-600" onClick={() => setHapus(r)}><Trash2 className="h-4 w-4" /></Aksi>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {formOpen && <FormKejadian item={formOpen.id ? formOpen : null}
                onClose={() => setFormOpen(null)} onSuccess={() => { setFormOpen(null); segarkan(); }} />}
            {lihat && <DialogLihatKejadian item={lihat} onClose={() => setLihat(null)} />}
            {hapus && <KonfirmHapus item={hapus} onClose={() => setHapus(null)} onSelesai={() => { setHapus(null); segarkan(); }} />}
            {setelanOpen && <DialogSetelan tahun={tahun} perBulan={perBulan} setting={setting}
                onClose={() => setSetelanOpen(false)} onSuccess={() => { setSetelanOpen(false); segarkan(); }} />}
        </div>
    );
}

function Aksi({ children, judul, warna, onClick }: any) {
    return (
        <button type="button" title={judul} onClick={onClick}
            className={`grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-all duration-150 ease-out hover:bg-slate-100 active:scale-90 ${warna}`}>
            {children}
        </button>
    );
}

function FormKejadian({ item, onClose, onSuccess }: any) {
    const { toast } = useToast();
    const ubah = !!item;
    const [simpan, setSimpan] = useState(false);
    const [cari, setCari] = useState("");
    const [f, setF] = useState<any>({
        tanggal: item?.tanggal ? String(item.tanggal).slice(0, 10) : new Date().toISOString().slice(0, 10),
        employeeId: item?.employeeId ?? "", namaDriver: item?.namaDriver ?? "", nik: item?.nik ?? "",
        unitPool: item?.unitPool ?? "OPR", jenisKejadian: item?.jenisKejadian ?? JENIS_KEJADIAN[0],
        diagnosa: item?.diagnosa ?? "", tglMulaiTidakMasuk: item?.tglMulaiTidakMasuk ? String(item.tglMulaiTidakMasuk).slice(0, 10) : "",
        tglMasukKembali: item?.tglMasukKembali ? String(item.tglMasukKembali).slice(0, 10) : "",
        hariHilang: String(item?.hariHilang ?? 0), statusPerawatan: item?.statusPerawatan ?? STATUS_PERAWATAN[0],
        tindakLanjut: item?.tindakLanjut ?? "",
    });

    const { data: karyawan } = useQuery({
        queryKey: ["/api/employees", "kejadian"],
        queryFn: async () => (await fetch("/api/employees")).json(),
        retry: false,
    });
    const daftar = (karyawan?.data || karyawan || []) as any[];
    const cocok = cari.length >= 2 ? daftar.filter(e => String(e.name || "").toLowerCase().includes(cari.toLowerCase())).slice(0, 6) : [];

    // Hari hilang dihitung dari selisih tanggal (bisa ditimpa manual — panduan Excel
    // menyebut "hari KERJA yang hilang", yang bisa beda dari hari kalender).
    const hitungHari = (mulai: string, kembali: string) => {
        if (!mulai || !kembali) return null;
        const a = new Date(mulai), b = new Date(kembali);
        const selisih = Math.round((b.getTime() - a.getTime()) / 86400000);
        return selisih >= 0 ? selisih : null;
    };

    const setTanggalTidakMasuk = (kunci: string, nilai: string) => {
        const baru = { ...f, [kunci]: nilai };
        const otomatis = hitungHari(baru.tglMulaiTidakMasuk, baru.tglMasukKembali);
        if (otomatis != null) baru.hariHilang = String(otomatis);
        setF(baru);
    };

    const kirim = async () => {
        if (!f.tanggal || !f.namaDriver.trim() || !f.jenisKejadian) {
            toast({ title: "Belum lengkap", description: "Tanggal, nama driver, dan jenis kejadian wajib diisi.", variant: "destructive" });
            return;
        }
        setSimpan(true);
        try {
            const res = await fetch(ubah ? `${API_REG}/${item.id}` : API_REG, {
                method: ubah ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...f, employeeId: f.employeeId || null, hariHilang: parseInt(f.hariHilang) || 0,
                    tglMulaiTidakMasuk: f.tglMulaiTidakMasuk || null, tglMasukKembali: f.tglMasukKembali || null,
                }),
            });
            const hasil = await res.json();
            if (!res.ok) throw new Error(hasil.error || "Gagal menyimpan");
            toast({ title: ubah ? "Perubahan tersimpan" : "Kejadian tercatat", description: f.namaDriver });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        } finally { setSimpan(false); }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{ubah ? "Ubah Kejadian" : "Catat Kejadian Sakit"}</DialogTitle>
                    <DialogDescription>Satu baris per kejadian — kolomnya mengikuti sheet Register Driver Sakit.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 md:grid-cols-2">
                    <Bidang label="Tanggal Kejadian *">
                        <Input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
                    </Bidang>
                    <Bidang label="Unit / Pool">
                        <Select value={f.unitPool} onValueChange={(v) => setF({ ...f, unitPool: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{UNIT_POOL.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                    </Bidang>

                    <div className="md:col-span-2">
                        <Bidang label="Nama Driver *">
                            <Input value={f.namaDriver} placeholder="ketik nama untuk mencari dari data HR..."
                                onChange={(e) => { setF({ ...f, namaDriver: e.target.value, employeeId: "" }); setCari(e.target.value); }} />
                        </Bidang>
                        {cocok.length > 0 && !f.employeeId && (
                            <div className="mt-1 overflow-hidden rounded-lg border bg-white shadow-sm">
                                {cocok.map(e => (
                                    <button key={e.id} type="button"
                                        onClick={() => { setF({ ...f, namaDriver: e.name, employeeId: e.id, nik: e.id, unitPool: f.unitPool }); setCari(""); }}
                                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] hover:bg-slate-50">
                                        <span className="font-medium text-slate-800">{e.name}</span>
                                        <span className="text-slate-400">{e.id} · {e.position}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {f.employeeId && <p className="mt-1 text-[11px] text-emerald-600">Tertaut ke {f.employeeId}</p>}
                    </div>

                    <Bidang label="NIK / ID"><Input value={f.nik} onChange={(e) => setF({ ...f, nik: e.target.value })} /></Bidang>
                    <Bidang label="Jenis Kejadian *">
                        <Select value={f.jenisKejadian} onValueChange={(v) => setF({ ...f, jenisKejadian: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{JENIS_KEJADIAN.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                        </Select>
                    </Bidang>

                    <Bidang label="Diagnosa / Keluhan">
                        <Select value={DAFTAR_DIAGNOSA.includes(f.diagnosa) ? f.diagnosa : "__lain"}
                            onValueChange={(v) => setF({ ...f, diagnosa: v === "__lain" ? "" : v })}>
                            <SelectTrigger><SelectValue placeholder="pilih" /></SelectTrigger>
                            <SelectContent>
                                {DAFTAR_DIAGNOSA.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                <SelectItem value="__lain">Lainnya (ketik sendiri)</SelectItem>
                            </SelectContent>
                        </Select>
                        {!DAFTAR_DIAGNOSA.includes(f.diagnosa) && (
                            <Input className="mt-1.5" value={f.diagnosa} placeholder="tulis diagnosa"
                                onChange={(e) => setF({ ...f, diagnosa: e.target.value })} />
                        )}
                    </Bidang>
                    <Bidang label="Status Perawatan">
                        <Select value={f.statusPerawatan} onValueChange={(v) => setF({ ...f, statusPerawatan: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_PERAWATAN.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </Bidang>

                    <Bidang label="Tgl Mulai Tidak Masuk">
                        <Input type="date" value={f.tglMulaiTidakMasuk} onChange={(e) => setTanggalTidakMasuk("tglMulaiTidakMasuk", e.target.value)} />
                    </Bidang>
                    <Bidang label="Tgl Masuk Kembali">
                        <Input type="date" value={f.tglMasukKembali} onChange={(e) => setTanggalTidakMasuk("tglMasukKembali", e.target.value)} />
                    </Bidang>

                    <Bidang label="Hari Hilang">
                        <Input type="number" min={0} value={f.hariHilang} onChange={(e) => setF({ ...f, hariHilang: e.target.value })} />
                        <p className="mt-1 text-[11px] text-slate-400">Terisi otomatis dari selisih tanggal; boleh diubah ke jumlah hari kerja.</p>
                    </Bidang>
                    <Bidang label="Tindak Lanjut / Ket.">
                        <Input value={f.tindakLanjut} onChange={(e) => setF({ ...f, tindakLanjut: e.target.value })} />
                    </Bidang>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={simpan}>Batal</Button>
                    <Button onClick={kirim} disabled={simpan} className="bg-slate-900 hover:bg-slate-800">
                        {simpan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{ubah ? "Simpan Perubahan" : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Bidang({ label, children }: any) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
            {children}
        </div>
    );
}

function DialogLihatKejadian({ item, onClose }: any) {
    const baris: Array<[string, any]> = [
        ["Tanggal Kejadian", item.tanggal ? new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—"],
        ["Nama Driver", item.namaDriver], ["NIK / ID", item.nik || "—"], ["Unit / Pool", item.unitPool || "—"],
        ["Jenis Kejadian", item.jenisKejadian], ["Diagnosa / Keluhan", item.diagnosa || "—"],
        ["Tgl Mulai Tidak Masuk", item.tglMulaiTidakMasuk ? new Date(item.tglMulaiTidakMasuk).toLocaleDateString("id-ID") : "—"],
        ["Tgl Masuk Kembali", item.tglMasukKembali ? new Date(item.tglMasukKembali).toLocaleDateString("id-ID") : "—"],
        ["Hari Hilang", `${item.hariHilang ?? 0} hari`],
        ["Status Perawatan", item.statusPerawatan || "—"],
        ["Tindak Lanjut", item.tindakLanjut || "—"],
    ];
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detail Kejadian</DialogTitle>
                    <DialogDescription>{item.namaDriver} — {item.jenisKejadian}</DialogDescription>
                </DialogHeader>
                <div className="space-y-1">
                    {baris.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 border-b border-dashed border-slate-100 py-1.5">
                            <span className="text-[12px] text-slate-400">{k}</span>
                            <span className="text-right text-[12px] font-medium text-slate-800">{v}</span>
                        </div>
                    ))}
                </div>
                <DialogFooter><Button variant="outline" onClick={onClose}>Tutup</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function KonfirmHapus({ item, onClose, onSelesai }: any) {
    const { toast } = useToast();
    const [proses, setProses] = useState(false);
    const jalan = async () => {
        setProses(true);
        try {
            const res = await fetch(`${API_REG}/${item.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Gagal menghapus");
            toast({ title: "Kejadian dihapus", description: item.namaDriver });
            onSelesai();
        } catch (e: any) {
            toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
            setProses(false);
        }
    };
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-500" /> Hapus kejadian ini?</DialogTitle>
                    <DialogDescription>
                        {item.namaDriver} — {item.jenisKejadian}
                        {item.tanggal ? ` (${new Date(item.tanggal).toLocaleDateString("id-ID")})` : ""}.
                        Indikator akan dihitung ulang setelah dihapus.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={proses}>Batal</Button>
                    <Button onClick={jalan} disabled={proses} className="bg-rose-600 hover:bg-rose-700">
                        {proses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Hapus
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DialogSetelan({ tahun, perBulan, setting, onClose, onSuccess }: any) {
    const { toast } = useToast();
    const [simpan, setSimpan] = useState(false);
    const [mh, setMh] = useState(() => perBulan.map((b: any) => ({
        bulan: b.bulan, totalJamKerja: String(b.jamKerja || ""), jumlahTenagaKerja: String(b.tenagaKerja || ""),
    })));
    const [s, setS] = useState({
        faktorPengali: String(setting?.faktorPengali ?? 1000000),
        thresholdMfr: String(setting?.thresholdMfr ?? 80), thresholdSsr: String(setting?.thresholdSsr ?? 80),
        thresholdAsr: String(setting?.thresholdAsr ?? 80), thresholdCmr: String(setting?.thresholdCmr ?? 0.8),
    });

    // Isi semua bulan sekaligus dari nilai bulan pertama yang terisi — di Excel
    // angkanya memang sama tiap bulan (88.114 / 304).
    const samakanSemua = () => {
        const acuan = mh.find((m: any) => m.totalJamKerja || m.jumlahTenagaKerja);
        if (!acuan) return;
        setMh(mh.map((m: any) => ({ ...m, totalJamKerja: acuan.totalJamKerja, jumlahTenagaKerja: acuan.jumlahTenagaKerja })));
    };

    const kirim = async () => {
        setSimpan(true);
        try {
            const r1 = await fetch("/api/health/manhours", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tahun: parseInt(tahun), data: mh }),
            });
            if (!r1.ok) throw new Error((await r1.json()).error || "Gagal menyimpan man-hours");
            const r2 = await fetch("/api/health/indicators/setting", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tahun: parseInt(tahun), ...s }),
            });
            if (!r2.ok) throw new Error((await r2.json()).error || "Gagal menyimpan setelan");
            toast({ title: "Tersimpan", description: "Man-hours & threshold diperbarui." });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        } finally { setSimpan(false); }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Man-Hours & Threshold — {tahun}</DialogTitle>
                    <DialogDescription>
                        Penyebut semua indikator. Di Excel diisi manual per bulan (mis. 88.114 jam, 304 orang).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Jam Kerja & Tenaga Kerja</h4>
                    <Button variant="ghost" size="sm" onClick={samakanSemua} className="h-7 text-[11px]">
                        Samakan semua bulan
                    </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {mh.map((m: any, i: number) => (
                        <div key={m.bulan} className="rounded-xl border border-slate-200/80 p-2.5">
                            <p className="mb-1.5 text-[11px] font-semibold text-slate-600">{BULAN_SINGKAT[m.bulan - 1]}</p>
                            <Input className="mb-1 h-8 text-[12px]" type="number" placeholder="jam kerja" value={m.totalJamKerja}
                                onChange={(e) => { const n = [...mh]; n[i] = { ...m, totalJamKerja: e.target.value }; setMh(n); }} />
                            <Input className="h-8 text-[12px]" type="number" placeholder="tenaga kerja" value={m.jumlahTenagaKerja}
                                onChange={(e) => { const n = [...mh]; n[i] = { ...m, jumlahTenagaKerja: e.target.value }; setMh(n); }} />
                        </div>
                    ))}
                </div>

                <h4 className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Faktor Pengali & Threshold</h4>
                <div className="grid gap-3 sm:grid-cols-5">
                    <Bidang label="Faktor Pengali">
                        <Input type="number" value={s.faktorPengali} onChange={(e) => setS({ ...s, faktorPengali: e.target.value })} />
                    </Bidang>
                    <Bidang label="MFR"><Input type="number" value={s.thresholdMfr} onChange={(e) => setS({ ...s, thresholdMfr: e.target.value })} /></Bidang>
                    <Bidang label="SSR"><Input type="number" value={s.thresholdSsr} onChange={(e) => setS({ ...s, thresholdSsr: e.target.value })} /></Bidang>
                    <Bidang label="ASR"><Input type="number" value={s.thresholdAsr} onChange={(e) => setS({ ...s, thresholdAsr: e.target.value })} /></Bidang>
                    <Bidang label="CMR"><Input type="number" step="0.01" value={s.thresholdCmr} onChange={(e) => setS({ ...s, thresholdCmr: e.target.value })} /></Bidang>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={simpan}>Batal</Button>
                    <Button onClick={kirim} disabled={simpan} className="bg-slate-900 hover:bg-slate-800">
                        {simpan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
