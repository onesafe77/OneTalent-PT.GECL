import React, { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Search, Upload, Download, Plus, Link2, Users, Loader2, ShieldAlert,
    ChevronRight, X, Trash2, CalendarDays, Activity, Eye, Pencil, AlertTriangle,
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API = "/api/mcu/health-mapping";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/* Warna per rumpun pemeriksaan — bukan pelangi acak: satu rumpun satu rona,
   supaya mata bisa mengelompokkan tanpa membaca label. */
const RUMPUN: Record<string, { grup: string; warna: string; bar: string }> = {
    "Hipertensi": { grup: "Kardiometabolik", warna: "text-rose-700", bar: "bg-rose-500" },
    "Diabetes Melitus": { grup: "Kardiometabolik", warna: "text-rose-700", bar: "bg-rose-500" },
    "Overweight/Obesitas": { grup: "Kardiometabolik", warna: "text-rose-700", bar: "bg-rose-400" },
    "Hiperkolesterolemia": { grup: "Kardiometabolik", warna: "text-rose-700", bar: "bg-rose-400" },
    "Hipertrigliseridemia": { grup: "Kardiometabolik", warna: "text-rose-700", bar: "bg-rose-400" },
    "Gout/Asam Urat": { grup: "Kardiometabolik", warna: "text-rose-700", bar: "bg-rose-300" },
    "Treadmill": { grup: "Jantung & Paru", warna: "text-violet-700", bar: "bg-violet-500" },
    "EKG": { grup: "Jantung & Paru", warna: "text-violet-700", bar: "bg-violet-400" },
    "Spirometri": { grup: "Jantung & Paru", warna: "text-violet-700", bar: "bg-violet-500" },
    "Rontgen": { grup: "Jantung & Paru", warna: "text-violet-700", bar: "bg-violet-400" },
    "Gangguan Faal Hepar": { grup: "Organ Dalam", warna: "text-amber-700", bar: "bg-amber-500" },
    "Gangguan Ginjal": { grup: "Organ Dalam", warna: "text-amber-700", bar: "bg-amber-500" },
    "HbsAg": { grup: "Organ Dalam", warna: "text-amber-700", bar: "bg-amber-400" },
    "Audiometri": { grup: "Indera", warna: "text-sky-700", bar: "bg-sky-500" },
};
const rumpunDari = (k: string) => RUMPUN[k] ?? { grup: "Lainnya", warna: "text-slate-700", bar: "bg-slate-400" };
const URUT_GRUP = ["Kardiometabolik", "Jantung & Paru", "Organ Dalam", "Indera", "Lainnya"];

const LABEL_TAUT: Record<string, string> = {
    OTOMATIS: "Tertaut", MANUAL: "Tertaut manual",
    PERLU_KONFIRMASI: "Perlu konfirmasi", BELUM: "Belum tertaut",
};

export default function ProfilKesehatan() {
    const [kategori, setKategori] = useState("all");
    const [tahun, setTahun] = useState("all");
    const [bulan, setBulan] = useState("all");
    const [statusTaut, setStatusTaut] = useState("all");
    const [search, setSearch] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    const [tambahOpen, setTambahOpen] = useState(false);
    const [panelTaut, setPanelTaut] = useState(false);
    const [detail, setDetail] = useState<{ employeeId?: string; nama?: string } | null>(null);
    const [lihat, setLihat] = useState<any>(null);     // detail satu catatan
    const [ubah, setUbah] = useState<any>(null);       // form ubah
    const [hapus, setHapus] = useState<any>(null);     // konfirmasi hapus

    const params = new URLSearchParams({
        ...(kategori !== "all" ? { kategori } : {}),
        ...(tahun !== "all" ? { tahun } : {}),
        ...(bulan !== "all" ? { bulan } : {}),
        ...(statusTaut !== "all" ? { status_taut: statusTaut } : {}),
        ...(search ? { search } : {}),
    });

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [API, params.toString()],
        queryFn: async () => {
            const res = await fetch(`${API}?${params.toString()}`);
            if (res.status === 403) throw new Error("FORBIDDEN");
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
        retry: false,
    });

    const { data: ringkas, refetch: refetchRingkas } = useQuery({
        queryKey: [`${API}/summary`, tahun],
        queryFn: async () => {
            const res = await fetch(`${API}/summary?tahun=${tahun}`);
            if (!res.ok) throw new Error("gagal");
            return res.json();
        },
        retry: false,
    });

    const segarkan = () => { refetch(); refetchRingkas(); };

    if (error?.message === "FORBIDDEN") return <AksesDitolak />;

    const rows = data?.data || [];
    const perKategori = ringkas?.perKategori || [];
    const taut = ringkas?.taut || {};
    const perluTindak = (taut.BELUM || 0) + (taut.PERLU_KONFIRMASI || 0);
    const totalTemuan = perKategori.reduce((a: number, k: any) => a + k.jumlah, 0);
    const puncak = Math.max(1, ...perKategori.map((k: any) => k.jumlah));

    // Kelompokkan kategori per rumpun agar ikhtisar tidak jadi 14 kotak seragam.
    const grup = useMemo(() => {
        const g: Record<string, any[]> = {};
        perKategori.forEach((k: any) => { (g[rumpunDari(k.kategori).grup] ||= []).push(k); });
        return URUT_GRUP.filter(n => g[n]?.length).map(n => ({
            nama: n, items: g[n], total: g[n].reduce((a: number, x: any) => a + x.jumlah, 0),
        }));
    }, [perKategori]);

    return (
        <div className="space-y-7 pb-10">
            {/* ——— Kepala halaman ——— */}
            <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">
                        HSE · Kesehatan
                    </p>
                    <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
                        Profil Kesehatan Karyawan
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5">
                        {totalTemuan.toLocaleString("id-ID")} temuan MCU
                        {ringkas?.tren?.length ? ` · ${ringkas.tren[0]?.label} – ${ringkas.tren[ringkas.tren.length - 1]?.label}` : ""}
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-400">data medis, akses terbatas</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"
                        onClick={() => window.open(`${API}/export${tahun !== "all" ? `?tahun=${tahun}` : ""}`)}
                        className="rounded-xl transition-transform duration-150 ease-out active:scale-[0.97]">
                        <Download className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                    <Button variant="outline" onClick={() => setImportOpen(true)}
                        className="rounded-xl transition-transform duration-150 ease-out active:scale-[0.97]">
                        <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                    <Button onClick={() => setTambahOpen(true)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 transition-transform duration-150 ease-out active:scale-[0.97]">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Catatan
                    </Button>
                </div>
            </header>

            {/* ——— Ikhtisar: peringkat berbobot, dikelompokkan per rumpun ——— */}
            <section className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
                <div className="space-y-4">
                    {grup.map(g => (
                        <div key={g.nama}>
                            <div className="flex items-baseline justify-between mb-2">
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{g.nama}</h2>
                                <span className="text-[11px] text-slate-400 tabular-nums">{g.total}</span>
                            </div>
                            <div className="space-y-1">
                                {g.items.sort((a: any, b: any) => b.jumlah - a.jumlah).map((k: any) => {
                                    const aktif = kategori === k.kategori;
                                    const r = rumpunDari(k.kategori);
                                    return (
                                        <button key={k.kategori}
                                            onClick={() => setKategori(aktif ? "all" : k.kategori)}
                                            className={`group w-full rounded-lg px-2.5 py-2 text-left transition-colors duration-150
                                                ${aktif ? "bg-slate-100 ring-1 ring-slate-300" : "hover:bg-slate-50"}`}>
                                            <div className="flex items-center gap-3">
                                                <span className={`w-[150px] shrink-0 truncate text-[13px] ${aktif ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                                                    {k.kategori}
                                                </span>
                                                <span className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-slate-100">
                                                    <span className={`absolute inset-y-0 left-0 rounded-full ${r.bar} transition-[width] duration-500 ease-out`}
                                                        style={{ width: `${Math.max(3, (k.jumlah / puncak) * 100)}%` }} />
                                                </span>
                                                <span className="w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums text-slate-900">{k.jumlah}</span>
                                                <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{k.orang} org</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ——— Tren ——— */}
                <Card className="rounded-2xl border-slate-200/80 shadow-none">
                    <CardContent className="p-5">
                        <div className="mb-4 flex items-baseline justify-between">
                            <div>
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tren Temuan</h2>
                                <p className="text-sm font-semibold text-slate-800 mt-0.5">Per bulan pemeriksaan</p>
                            </div>
                        </div>
                        <div className="h-[210px] -ml-3">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={ringkas?.tren || []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="gTemuan" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#e11d48" stopOpacity={0.22} />
                                            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.01} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 4" stroke="#eef2f7" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                                    <Tooltip
                                        cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,.08)" }}
                                        formatter={(v: any) => [`${v} temuan`, ""]} labelStyle={{ color: "#64748b", fontSize: 11 }} />
                                    <Area type="monotone" dataKey="jumlah" stroke="#e11d48" strokeWidth={2}
                                        fill="url(#gTemuan)" dot={{ r: 2.5, fill: "#e11d48", strokeWidth: 0 }}
                                        activeDot={{ r: 4.5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* ——— Ajakan menautkan ——— */}
            {perluTindak > 0 && (
                <button onClick={() => setPanelTaut(!panelTaut)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-left transition-colors hover:bg-amber-50">
                    <Link2 className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="flex-1 text-[13px] text-amber-900">
                        <b className="font-semibold tabular-nums">{perluTindak}</b> catatan belum tertaut pasti ke data karyawan —
                        <span className="text-amber-700"> cocokkan agar foto, NIK, dan departemen ikut benar.</span>
                    </p>
                    <ChevronRight className={`h-4 w-4 text-amber-500 transition-transform duration-150 ${panelTaut ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
                </button>
            )}
            {panelTaut && <PanelPenautan onSelesai={segarkan} />}

            {/* ——— Penyaring ——— */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px] flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input className="rounded-xl pl-9" placeholder="Cari nama, kesimpulan, posisi..."
                        value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Pilih nilai={kategori} ubah={setKategori} lebar="w-[190px]" kosong="Semua Kategori"
                    opsi={perKategori.map((k: any) => k.kategori)} />
                <Pilih nilai={tahun} ubah={setTahun} lebar="w-[110px]" kosong="Semua Tahun"
                    opsi={(ringkas?.tahunTersedia || []).map(String)} />
                <Pilih nilai={bulan} ubah={setBulan} lebar="w-[130px]" kosong="Semua Bulan" opsi={BULAN} />
                <Select value={statusTaut} onValueChange={setStatusTaut}>
                    <SelectTrigger className="w-[165px] rounded-xl"><SelectValue placeholder="Status taut" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        {Object.entries(LABEL_TAUT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* ——— Tabel ——— */}
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-none">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                {["Karyawan", "Kategori", "Periode", "Hasil", "Kesimpulan", "Tindak Lanjut", "Aksi"].map((h, i) => (
                                    <TableHead key={i} className={`h-9 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 ${h === "Aksi" ? "text-center w-[110px]" : ""}`}>{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="py-14 text-center text-sm text-slate-400">Memuat data kesehatan...</TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-14 text-center text-sm text-slate-400">Tidak ada data yang cocok.</TableCell></TableRow>
                            ) : rows.map((r: any) => {
                                const ru = rumpunDari(r.kategori);
                                return (
                                    <TableRow key={r.id}
                                        onClick={() => setDetail({ employeeId: r.employeeId || undefined, nama: r.nama })}
                                        className="cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/70">
                                        <TableCell className="py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                {r.empFoto
                                                    ? <img src={r.empFoto} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200" />
                                                    : <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-400">
                                                        {(r.empNama || r.nama).slice(0, 2).toUpperCase()}</div>}
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-semibold text-slate-900">{r.empNama || r.nama}</p>
                                                    <p className="truncate text-[11px] text-slate-400">
                                                        {r.empNik ? `${r.empNik} · ${r.empPosisi || "-"}` : (r.posisiSumber || "identitas dari Excel")}
                                                    </p>
                                                </div>
                                                {(r.statusTaut === "BELUM" || r.statusTaut === "PERLU_KONFIRMASI") && (
                                                    <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                                                        title={LABEL_TAUT[r.statusTaut]} />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${ru.warna}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${ru.bar}`} />{r.kategori}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-[12px] tabular-nums text-slate-500">
                                            {(r.bulan || "").slice(0, 3)} {r.tahun}
                                        </TableCell>
                                        <TableCell className="max-w-[230px] text-[12px] text-slate-600">
                                            {r.nilai ? Object.entries(r.nilai).slice(0, 2).map(([k, v]: any) => (
                                                <div key={k} className="truncate">
                                                    <span className="text-slate-400">{k.replace(/\(.*?\)/g, "").trim()}</span>{" "}
                                                    <b className="tabular-nums text-slate-800">{v}</b>
                                                </div>
                                            )) : <span className="text-slate-300">—</span>}
                                        </TableCell>
                                        <TableCell className="max-w-[170px] text-[12px] font-medium text-slate-700">
                                            <span className="line-clamp-2">{r.kesimpulan || <span className="text-slate-300">—</span>}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[190px] text-[12px] text-slate-500">
                                            <span className="line-clamp-2">{r.tindakLanjut || <span className="text-slate-300">—</span>}</span>
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-0.5">
                                                <TombolAksi judul="Lihat detail" warna="hover:text-slate-900"
                                                    onClick={() => setLihat(r)}><Eye className="h-4 w-4" /></TombolAksi>
                                                <TombolAksi judul="Ubah" warna="hover:text-amber-600"
                                                    onClick={() => setUbah(r)}><Pencil className="h-4 w-4" /></TombolAksi>
                                                <TombolAksi judul="Hapus" warna="hover:text-rose-600"
                                                    onClick={() => setHapus(r)}><Trash2 className="h-4 w-4" /></TombolAksi>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>
            {rows.length > 0 && (
                <p className="text-center text-[11px] text-slate-400">
                    {rows.length.toLocaleString("id-ID")} catatan · klik baris untuk melihat riwayat lengkap karyawan
                </p>
            )}

            {detail && <PanelDetail target={detail} onClose={() => setDetail(null)} onUbah={segarkan} />}
            {lihat && <DialogLihat item={lihat} onClose={() => setLihat(null)}
                onBukaRiwayat={() => { setDetail({ employeeId: lihat.employeeId || undefined, nama: lihat.nama }); setLihat(null); }} />}
            {ubah && <DialogForm item={ubah} kategoriAda={perKategori.map((k: any) => k.kategori)}
                onClose={() => setUbah(null)} onSuccess={() => { setUbah(null); segarkan(); }} />}
            {hapus && <KonfirmasiHapus item={hapus} onClose={() => setHapus(null)} onSelesai={() => { setHapus(null); segarkan(); }} />}
            {importOpen && <DialogImport onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); segarkan(); }} />}
            {tambahOpen && <DialogForm kategoriAda={perKategori.map((k: any) => k.kategori)}
                onClose={() => setTambahOpen(false)} onSuccess={() => { setTambahOpen(false); segarkan(); }} />}
        </div>
    );
}

function Pilih({ nilai, ubah, opsi, kosong, lebar }: any) {
    return (
        <Select value={nilai} onValueChange={ubah}>
            <SelectTrigger className={`${lebar} rounded-xl`}><SelectValue placeholder={kosong} /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{kosong}</SelectItem>
                {opsi.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

function AksesDitolak() {
    return (
        <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50">
                <ShieldAlert className="h-7 w-7 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Akses Ditolak</h2>
            <p className="max-w-md text-sm text-slate-500">
                Profil kesehatan berisi data medis karyawan. Hanya departemen HSE, HRGA,
                dan PJO yang dapat membukanya.
            </p>
        </div>
    );
}

/* ——— Panel detail: riwayat lengkap satu karyawan ——— */
function PanelDetail({ target, onClose, onUbah }: any) {
    const { toast } = useToast();
    const [hapus, setHapus] = useState<string | null>(null);
    const qs = target.employeeId ? `employeeId=${target.employeeId}` : `nama=${encodeURIComponent(target.nama)}`;
    const { data, isLoading, refetch } = useQuery({
        queryKey: [`${API}/riwayat`, qs],
        queryFn: async () => {
            const res = await fetch(`${API}/riwayat?${qs}`);
            if (!res.ok) throw new Error("Gagal memuat riwayat");
            return res.json();
        },
        retry: false,
    });

    const k = data?.karyawan;
    const rows = data?.data || [];
    const perPeriode = useMemo(() => {
        const g: Record<string, any[]> = {};
        rows.forEach((r: any) => { (g[`${r.bulan} ${r.tahun}`] ||= []).push(r); });
        return Object.entries(g);
    }, [rows]);

    const hapusCatatan = async (id: string) => {
        setHapus(id);
        try {
            const res = await fetch(`${API}/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Gagal menghapus");
            toast({ title: "Catatan dihapus" });
            refetch(); onUbah?.();
        } catch (e: any) {
            toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
        } finally { setHapus(null); }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[2px]" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}
                className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right duration-200">
                {/* kepala */}
                <div className="sticky top-0 z-10 border-b bg-white/95 px-6 py-4 backdrop-blur">
                    <div className="flex items-start gap-3">
                        {k?.foto
                            ? <img src={k.foto} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200" />
                            : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Users className="h-6 w-6" /></div>}
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                                {k?.nama || data?.namaSumber || target.nama}
                            </h2>
                            <p className="text-[12px] text-slate-500">
                                {k ? `${k.id} · ${k.posisi || "-"} · ${k.departemen || "-"}` : "Belum tertaut ke data karyawan"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(data?.kategori || []).map((c: string) => {
                                    const ru = rumpunDari(c);
                                    return (
                                        <span key={c} className={`inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium ${ru.warna}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${ru.bar}`} />{c}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="mt-3 flex gap-5 border-t pt-3 text-[12px]">
                        <Statistik label="Total temuan" nilai={data?.total ?? 0} />
                        <Statistik label="Jenis" nilai={(data?.kategori || []).length} />
                        <Statistik label="Periode" nilai={perPeriode.length} />
                    </div>
                </div>

                {/* linimasa */}
                <div className="px-6 py-5">
                    {isLoading ? (
                        <p className="py-10 text-center text-sm text-slate-400">Memuat riwayat...</p>
                    ) : perPeriode.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-400">Belum ada catatan.</p>
                    ) : perPeriode.map(([periode, isi]: any) => (
                        <div key={periode} className="relative pl-6 pb-6 last:pb-0">
                            <span className="absolute left-[5px] top-2 h-full w-px bg-slate-100" />
                            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                                <CalendarDays className="h-3 w-3" />{periode}
                            </p>
                            <div className="space-y-2">
                                {isi.map((r: any) => {
                                    const ru = rumpunDari(r.kategori);
                                    return (
                                        <div key={r.id} className="group rounded-xl border border-slate-200/80 p-3 transition-colors hover:border-slate-300">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${ru.warna}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${ru.bar}`} />{r.kategori}
                                                </span>
                                                <Button variant="ghost" size="icon" disabled={hapus === r.id}
                                                    onClick={() => hapusCatatan(r.id)}
                                                    className="h-6 w-6 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-600">
                                                    {hapus === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                            {r.nilai && (
                                                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                                                    {Object.entries(r.nilai).map(([kk, vv]: any) => (
                                                        <div key={kk} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400">{kk}</p>
                                                            <p className="text-[13px] font-semibold tabular-nums text-slate-800">{vv}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {r.kesimpulan && <p className="mt-2 text-[12px] font-medium text-slate-800">{r.kesimpulan}</p>}
                                            {r.tindakLanjut && (
                                                <p className="mt-1 flex gap-1.5 text-[12px] text-slate-500">
                                                    <Activity className="mt-[3px] h-3 w-3 shrink-0 text-slate-400" />{r.tindakLanjut}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Statistik({ label, nilai }: any) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-base font-bold tabular-nums text-slate-900">{nilai}</p>
        </div>
    );
}

/* ——— Tambah catatan manual ——— */
function TombolAksi({ children, judul, warna, onClick }: any) {
    return (
        <button type="button" title={judul} onClick={onClick}
            className={`grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-all duration-150 ease-out hover:bg-slate-100 active:scale-90 ${warna}`}>
            {children}
        </button>
    );
}

/* ——— Lihat: satu catatan MCU secara utuh (tanpa pemotongan teks) ——— */
function DialogLihat({ item, onClose, onBukaRiwayat }: any) {
    const ru = rumpunDari(item.kategori);
    const identitas: Array<[string, any]> = [
        ["NIK", item.empNik], ["Jabatan", item.empPosisi || item.posisiSumber],
        ["Departemen", item.empDept || item.departemenSumber],
        ["Jenis Kelamin", item.jenisKelamin === "M" ? "Laki-laki" : item.jenisKelamin === "F" ? "Perempuan" : item.jenisKelamin],
        ["Tanggal Lahir", item.tanggalLahir ? new Date(item.tanggalLahir).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : null],
        ["Status Taut", LABEL_TAUT[item.statusTaut]],
    ];
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${ru.bar}`} />
                        {item.kategori}
                    </DialogTitle>
                    <DialogDescription>
                        Hasil MCU {item.bulan} {item.tahun} — {item.empNama || item.nama}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3">
                    {item.empFoto
                        ? <img src={item.empFoto} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200" />
                        : <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-[12px] font-semibold text-slate-400">
                            {(item.empNama || item.nama).slice(0, 2).toUpperCase()}</div>}
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{item.empNama || item.nama}</p>
                        <p className="text-[12px] text-slate-500">{item.empNik ? `${item.empNik} · ${item.empPosisi || "-"}` : "belum tertaut ke data karyawan"}</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={onBukaRiwayat}>
                        Riwayat lengkap <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>

                <Bagian judul="Identitas">
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {identitas.filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-3 border-b border-dashed border-slate-100 py-1">
                                <span className="text-[12px] text-slate-400">{k}</span>
                                <span className="text-[12px] font-medium text-slate-800 text-right">{v}</span>
                            </div>
                        ))}
                    </div>
                </Bagian>

                <Bagian judul="Hasil Pemeriksaan">
                    {item.nilai && Object.keys(item.nilai).length ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(item.nilai).map(([k, v]: any) => (
                                <div key={k} className="rounded-xl bg-slate-50 p-3">
                                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">{k}</p>
                                    <p className="text-[13px] font-semibold leading-snug tabular-nums text-slate-900">{v}</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-[12px] text-slate-400">Tidak ada nilai pemeriksaan tercatat.</p>}
                </Bagian>

                <Bagian judul="Kesimpulan & Tindak Lanjut">
                    <div className="space-y-2">
                        <div className="rounded-xl border border-slate-200/80 p-3">
                            <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Kesimpulan</p>
                            <p className="text-[13px] font-medium text-slate-800">{item.kesimpulan || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 p-3">
                            <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Tindak Lanjut</p>
                            <p className="text-[13px] text-slate-700">{item.tindakLanjut || "—"}</p>
                        </div>
                    </div>
                </Bagian>

                <DialogFooter><Button variant="outline" onClick={onClose}>Tutup</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Bagian({ judul, children }: any) {
    return (
        <div className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{judul}</h4>
            {children}
        </div>
    );
}

function KonfirmasiHapus({ item, onClose, onSelesai }: any) {
    const { toast } = useToast();
    const [proses, setProses] = useState(false);
    const hapus = async () => {
        setProses(true);
        try {
            const res = await fetch(`${API}/${item.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Gagal menghapus");
            toast({ title: "Catatan dihapus", description: `${item.kategori} · ${item.empNama || item.nama}` });
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
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-rose-500" /> Hapus catatan ini?
                    </DialogTitle>
                    <DialogDescription>
                        <b>{item.kategori}</b> — {item.empNama || item.nama} ({item.bulan} {item.tahun}).
                        Data yang dihapus tidak bisa dikembalikan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={proses}>Batal</Button>
                    <Button onClick={hapus} disabled={proses} className="bg-rose-600 hover:bg-rose-700">
                        {proses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Hapus
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ——— Form tambah/ubah: mengikuti SEMUA kolom Excel ———
   Excel mapping: Bulan | Tahun | Nama | JK | TTL | Department | Posisi | <nilai> | Kesimpulan | Tindak Lanjut */
function DialogForm({ item, kategoriAda, onClose, onSuccess }: any) {
    const { toast } = useToast();
    const ubahMode = !!item;
    const [simpan, setSimpan] = useState(false);
    const kini = new Date();
    const [f, setF] = useState<any>({
        kategori: item?.kategori ?? (kategoriAda[0] || ""),
        nama: item?.nama ?? "",
        employeeId: item?.employeeId ?? "",
        jenisKelamin: item?.jenisKelamin ?? "",
        tanggalLahir: item?.tanggalLahir ? String(item.tanggalLahir).slice(0, 10) : "",
        departemenSumber: item?.departemenSumber ?? "",
        posisiSumber: item?.posisiSumber ?? "",
        bulan: item?.bulan ?? BULAN[kini.getMonth()],
        tahun: String(item?.tahun ?? kini.getFullYear()),
        kesimpulan: item?.kesimpulan ?? "",
        tindakLanjut: item?.tindakLanjut ?? "",
    });
    const [nilai, setNilai] = useState<Record<string, string>>(item?.nilai ?? {});
    const [fieldBaru, setFieldBaru] = useState("");
    const [cariKaryawan, setCariKaryawan] = useState("");

    const { data: fields } = useQuery({
        queryKey: [`${API}/fields`],
        queryFn: async () => (await fetch(`${API}/fields`)).json(),
        retry: false,
    });
    const { data: karyawan } = useQuery({
        queryKey: ["/api/employees", "pilih"],
        queryFn: async () => (await fetch("/api/employees")).json(),
        retry: false,
    });

    const daftarKaryawan = (karyawan?.data || karyawan || []) as any[];
    const cocok = cariKaryawan.length >= 2
        ? daftarKaryawan.filter((e: any) => String(e.name || "").toLowerCase().includes(cariKaryawan.toLowerCase())).slice(0, 6)
        : [];

    // Field bawaan kategori + field yang sudah terisi (kalau sedang mengubah)
    const fieldKategori: string[] = Array.from(new Set([
        ...(fields?.[f.kategori] || []),
        ...Object.keys(nilai),
    ]));

    const tambahKolom = () => {
        const k = fieldBaru.trim();
        if (!k) return;
        if (k in nilai || fieldKategori.includes(k)) {
            toast({ title: "Kolom sudah ada", description: `"${k}" sudah tersedia di daftar isian.` });
            setFieldBaru("");
            return;
        }
        setNilai((n) => ({ ...n, [k]: "" }));
        setFieldBaru("");
        toast({ title: "Kolom ditambahkan", description: k });
    };

    // Pilih karyawan → identitas ikut terisi dari HR (JK, TTL, dept, posisi)
    const pilihKaryawan = (e: any) => {
        setF({
            ...f, nama: e.name, employeeId: e.id,
            departemenSumber: e.department || f.departemenSumber,
            posisiSumber: e.position || f.posisiSumber,
            tanggalLahir: e.dob ? String(e.dob).slice(0, 10) : f.tanggalLahir,
        });
        setCariKaryawan("");
    };

    const kirim = async () => {
        if (!f.kategori || !f.nama.trim()) {
            toast({ title: "Belum lengkap", description: "Kategori dan nama karyawan wajib diisi.", variant: "destructive" });
            return;
        }
        setSimpan(true);
        try {
            const isi = Object.fromEntries(Object.entries(nilai).filter(([, v]) => String(v ?? "").trim()));
            const muatan = {
                ...f, tahun: parseInt(f.tahun) || null,
                employeeId: f.employeeId || null,
                tanggalLahir: f.tanggalLahir || null,
                statusTaut: f.employeeId ? (item?.statusTaut === "OTOMATIS" ? "OTOMATIS" : "MANUAL") : "BELUM",
                nilai: Object.keys(isi).length ? isi : null,
            };
            const res = await fetch(ubahMode ? `${API}/${item.id}` : API, {
                method: ubahMode ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(muatan),
            });
            const hasil = await res.json();
            if (!res.ok) throw new Error(hasil.error || "Gagal menyimpan");
            toast({ title: ubahMode ? "Perubahan tersimpan" : "Catatan tersimpan", description: `${f.kategori} · ${f.nama}` });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        } finally { setSimpan(false); }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{ubahMode ? "Ubah Catatan Kesehatan" : "Tambah Catatan Kesehatan"}</DialogTitle>
                    <DialogDescription>
                        Kolomnya mengikuti format Excel mapping: periode, identitas, hasil pemeriksaan,
                        kesimpulan, dan tindak lanjut.
                    </DialogDescription>
                </DialogHeader>

                <Bagian judul="Periode & Kategori">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Isi label="Kategori *">
                            <Select value={f.kategori} onValueChange={(v) => setF({ ...f, kategori: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{kategoriAda.map((k: string) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                            </Select>
                        </Isi>
                        <Isi label="Bulan">
                            <Select value={f.bulan} onValueChange={(v) => setF({ ...f, bulan: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{BULAN.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                        </Isi>
                        <Isi label="Tahun">
                            <Input type="number" value={f.tahun} onChange={(e) => setF({ ...f, tahun: e.target.value })} />
                        </Isi>
                    </div>
                </Bagian>

                <Bagian judul="Identitas Karyawan">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Isi label="Nama *">
                                <Input value={f.nama} placeholder="ketik nama untuk mencari dari data HR..."
                                    onChange={(e) => { setF({ ...f, nama: e.target.value, employeeId: "" }); setCariKaryawan(e.target.value); }} />
                            </Isi>
                            {cocok.length > 0 && !f.employeeId && (
                                <div className="mt-1 overflow-hidden rounded-lg border bg-white shadow-sm">
                                    {cocok.map((e: any) => (
                                        <button key={e.id} type="button" onClick={() => pilihKaryawan(e)}
                                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-slate-50">
                                            <span className="font-medium text-slate-800">{e.name}</span>
                                            <span className="text-slate-400">{e.id} · {e.position}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {f.employeeId && (
                                <p className="mt-1 text-[11px] text-emerald-600">
                                    Tertaut ke {f.employeeId} — identitas diisi otomatis dari data HR
                                </p>
                            )}
                        </div>
                        <Isi label="Jenis Kelamin">
                            <Select value={f.jenisKelamin || "-"} onValueChange={(v) => setF({ ...f, jenisKelamin: v === "-" ? "" : v })}>
                                <SelectTrigger><SelectValue placeholder="pilih" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-">Tidak diisi</SelectItem>
                                    <SelectItem value="M">M — Laki-laki</SelectItem>
                                    <SelectItem value="F">F — Perempuan</SelectItem>
                                </SelectContent>
                            </Select>
                        </Isi>
                        <Isi label="Tanggal Lahir (TTL)">
                            <Input type="date" value={f.tanggalLahir} onChange={(e) => setF({ ...f, tanggalLahir: e.target.value })} />
                        </Isi>
                        <Isi label="Department">
                            <Input value={f.departemenSumber} onChange={(e) => setF({ ...f, departemenSumber: e.target.value })} placeholder="mis. PLANT / OPR" />
                        </Isi>
                        <Isi label="Posisi">
                            <Input value={f.posisiSumber} onChange={(e) => setF({ ...f, posisiSumber: e.target.value })} placeholder="mis. Driver DT" />
                        </Isi>
                    </div>
                </Bagian>

                <Bagian judul="Hasil Pemeriksaan">
                    {fieldKategori.length === 0 && (
                        <p className="text-[12px] text-slate-400">
                            Belum ada kolom bawaan untuk kategori ini — tambahkan sendiri di bawah.
                        </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                        {fieldKategori.map((k) => (
                            <Isi key={k} label={k}>
                                <Input value={nilai[k] ?? ""} onChange={(e) => setNilai({ ...nilai, [k]: e.target.value })} />
                            </Isi>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Input value={fieldBaru} onChange={(e) => setFieldBaru(e.target.value)}
                            onKeyDown={(e) => {
                                // Enter di kotak ini menambah kolom, BUKAN mengirim form.
                                if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); tambahKolom(); }
                            }}
                            placeholder="tambah kolom pemeriksaan lain (mis. Ureum)" className="h-9 text-[12px]" />
                        <Button type="button" variant="outline" size="sm" disabled={!fieldBaru.trim()}
                            className="h-9 shrink-0 transition-transform duration-150 ease-out active:scale-95"
                            onClick={tambahKolom}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah kolom
                        </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Ketik nama kolom lalu tekan Enter atau klik tombolnya. Kolom yang ditambahkan
                        akan muncul di daftar isian di atas.
                    </p>
                </Bagian>

                <Bagian judul="Kesimpulan & Tindak Lanjut">
                    <div className="grid gap-3">
                        <Isi label="Kesimpulan">
                            <Input value={f.kesimpulan} onChange={(e) => setF({ ...f, kesimpulan: e.target.value })} placeholder="mis. Hipertensi Stadium I" />
                        </Isi>
                        <Isi label="Tindak Lanjut">
                            <Input value={f.tindakLanjut} onChange={(e) => setF({ ...f, tindakLanjut: e.target.value })} placeholder="mis. Diet rendah garam, kontrol TD" />
                        </Isi>
                    </div>
                </Bagian>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={simpan}>Batal</Button>
                    <Button onClick={kirim} disabled={simpan} className="bg-slate-900 hover:bg-slate-800">
                        {simpan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {ubahMode ? "Simpan Perubahan" : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Isi({ label, children }: any) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
            {children}
        </div>
    );
}

function PanelPenautan({ onSelesai }: any) {
    const { toast } = useToast();
    const [proses, setProses] = useState<string | null>(null);
    const { data, isLoading, refetch } = useQuery({
        queryKey: [`${API}/unlinked`],
        queryFn: async () => {
            const res = await fetch(`${API}/unlinked`);
            if (!res.ok) throw new Error("Gagal memuat");
            return res.json();
        },
        retry: false,
    });

    const tautkan = async (nama: string, employeeId: string, namaKaryawan: string) => {
        setProses(nama);
        try {
            const res = await fetch(`${API}/link`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nama, employeeId }),
            });
            const hasil = await res.json();
            if (!res.ok) throw new Error(hasil.error || "Gagal menautkan");
            toast({ title: "Tertaut", description: `${nama} → ${namaKaryawan} (${hasil.jumlah} catatan)` });
            refetch(); onSelesai?.();
        } catch (e: any) {
            toast({ title: "Gagal menautkan", description: e.message, variant: "destructive" });
        } finally { setProses(null); }
    };

    const daftar = data?.data || [];
    return (
        <Card className="rounded-2xl border-slate-200/80 shadow-none">
            <CardContent className="p-5">
                <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Cocokkan dengan Data Karyawan</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] tabular-nums text-slate-500">{daftar.length} nama</span>
                </div>
                <p className="mb-4 text-[12px] text-slate-500">
                    Sistem tidak menebak sendiri — ini data medis, salah tautan berarti riwayat penyakit menempel ke orang lain.
                </p>
                <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
                    {isLoading && <p className="py-6 text-center text-sm text-slate-400">Memuat...</p>}
                    {!isLoading && daftar.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Semua sudah tertaut.</p>}
                    {daftar.map((d: any) => (
                        <div key={d.nama} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2.5">
                            <div>
                                <p className="text-[13px] font-semibold text-slate-900">{d.nama}</p>
                                <p className="text-[11px] text-slate-400">
                                    {d.posisiSumber || "-"} · {d.tanggalLahir ? new Date(d.tanggalLahir).toLocaleDateString("id-ID") : "TTL tidak ada"} · {d.jumlah} catatan
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {d.saran.length === 0 && <span className="text-[11px] text-slate-400">tidak ada nama mirip</span>}
                                {d.saran.map((s: any) => (
                                    <button key={s.id} disabled={proses === d.nama}
                                        onClick={() => tautkan(d.nama, s.id, s.nama)}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 transition-all duration-150 ease-out hover:border-slate-900 hover:bg-slate-900 hover:text-white active:scale-[0.97] disabled:opacity-50">
                                        {s.nama} <span className="opacity-50">{s.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function DialogImport({ onClose, onSuccess }: any) {
    const { toast } = useToast();
    const [proses, setProses] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const kirim = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) { toast({ title: "Pilih file dulu", variant: "destructive" }); return; }
        setProses(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${API}/import`, { method: "POST", body: fd });
            const hasil = await res.json();
            if (!res.ok) throw new Error(hasil.error || "Gagal mengimpor");
            toast({ title: "Impor selesai", description: `${hasil.imported} catatan dari ${Object.keys(hasil.perKategori || {}).length} kategori.` });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Impor gagal", description: e.message, variant: "destructive" });
        } finally { setProses(false); }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Database & Mapping Kesehatan</DialogTitle>
                    <DialogDescription>
                        Membaca 14 sheet penyakit sekaligus. Dicocokkan per nama + periode — impor
                        ulang memperbarui, tidak menggandakan. Penautan manual Anda tidak tertimpa.
                    </DialogDescription>
                </DialogHeader>
                <Input ref={fileRef} type="file" accept=".xlsx,.xls" />
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={proses}>Batal</Button>
                    <Button onClick={kirim} disabled={proses} className="bg-slate-900 hover:bg-slate-800">
                        {proses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
