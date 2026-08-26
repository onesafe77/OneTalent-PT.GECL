// Rekap MCU — 3 sheet rekap hasil MCU lengkap (fisik, riwayat, lab).
//
// Tabelnya lebar (156/131/60 kolom) sehingga memakai <table> mentah, bukan <Table>
// shadcn: perlu colSpan/rowSpan untuk header dua tingkat dan kendali sticky yang presisi.
// Bawaan: semua grup TERTUTUP + kolom kosong disembunyikan + 50 baris/halaman, supaya
// yang dirender ~1.200 sel, bukan 50.000.

import { useState, useMemo, memo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, ChevronRight, ChevronDown, Loader2, TableProperties, Eye, ChevronLeft,
    Download, Upload, Plus } from "lucide-react";
import { REKAP_KATEGORI, REKAP_DEFS, grupRekap, type RekapKategori, type KolomRekap } from "@shared/mcu-rekap-columns";
import { cn } from "@/lib/utils";

const API = "/api/mcu/health-mapping";
const PER_HAL = 50;

type Baris = {
    id: string; nama: string; noReg: string | null; bulan: string | null; tahun: number | null;
    jenisKelamin: string | null; tanggalLahir: string | null;
    empNama: string | null; empNik: string | null; empDept: string | null; empPosisi: string | null;
    departemenSumber: string | null; posisiSumber: string | null;
    kesimpulan: string | null; tindakLanjut: string | null; statusTaut: string;
    nilai: Record<string, string> | null;
};

export default function RekapMcuPage() {
    const [tab, setTab] = useState<RekapKategori>(REKAP_KATEGORI[0]);
    const [cari, setCari] = useState("");
    const [tahun, setTahun] = useState("all");
    const [tambah, setTambah] = useState(false);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                        <TableProperties className="h-7 w-7 text-red-600" />
                        Rekap MCU
                    </h1>
                    <p className="text-muted-foreground">
                        Hasil Medical Check Up lengkap per karyawan — pemeriksaan fisik, riwayat kesehatan &amp; pajanan kerja, dan laboratorium.
                    </p>
                </div>
                <BarisAksi onTambah={() => setTambah(true)} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Cari nama personil..." value={cari} onChange={(e) => setCari(e.target.value)} />
                </div>
                <Select value={tahun} onValueChange={setTahun}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua tahun</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as RekapKategori)}>
                <TabsList className="grid w-full grid-cols-3">
                    {REKAP_KATEGORI.map((k) => (
                        <TabsTrigger key={k} value={k} className="text-xs sm:text-sm">
                            {k.replace("Rekap ", "")}
                            <span className="ml-1.5 hidden text-[10px] text-muted-foreground sm:inline">
                                {REKAP_DEFS[k].kolom.length} kolom
                            </span>
                        </TabsTrigger>
                    ))}
                </TabsList>
                {REKAP_KATEGORI.map((k) => (
                    <TabsContent key={k} value={k} className="mt-4">
                        {/* key= memaksa state grup/halaman ter-reset saat ganti tab */}
                        <TabelRekap key={k} kategori={k} cari={cari} tahun={tahun} />
                    </TabsContent>
                ))}
            </Tabs>

            {tambah && <DialogTambah kategori={tab} onClose={() => setTambah(false)} />}
        </div>
    );
}

/** Unduh template · Unggah Excel — keduanya memakai bentuk berkas yang sama. */
function BarisAksi({ onTambah }: { onTambah: () => void }) {
    const { toast } = useToast();
    const qc = useQueryClient();
    const fileRef = useRef<HTMLInputElement>(null);
    const [unggah, setUnggah] = useState(false);

    const kirim = async (file: File) => {
        setUnggah(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch(`${API}/import`, { method: "POST", body: fd, credentials: "include" });
            const ct = r.headers.get("content-type") || "";
            if (!ct.includes("application/json")) throw new Error(`Server membalas ${r.status}, bukan JSON`);
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Gagal mengunggah");

            const rinci = Object.entries(j.perKategori || {})
                .filter(([k]) => k.startsWith("Rekap"))
                .map(([k, v]) => `${k.replace("Rekap ", "")}: ${v}`).join(", ");
            toast({
                title: `${j.imported} baris diproses`,
                description: (rinci || "Tidak ada sheet Rekap di berkas ini.")
                    + (j.peringatan?.length ? ` — ${j.peringatan.length} catatan, lihat konsol.` : ""),
            });
            if (j.peringatan?.length) console.warn("[rekap-mcu] catatan impor:", j.peringatan);
            qc.invalidateQueries({ queryKey: [API] });
        } catch (e: any) {
            toast({ title: "Gagal mengunggah", description: e.message, variant: "destructive" });
        } finally {
            setUnggah(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) kirim(f); }} />
            {/* Template lengkap 17 sheet, bentuknya kembar dengan file MCU asli. */}
            <Button variant="outline" size="sm" asChild title="17 sheet, sama persis dengan file MCU asli">
                <a href={`${API}/template`}>
                    <Download className="mr-2 h-4 w-4" /> Template Excel
                </a>
            </Button>
            <Button variant="outline" size="sm" disabled={unggah} onClick={() => fileRef.current?.click()}>
                {unggah ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {unggah ? "Mengunggah..." : "Upload Excel"}
            </Button>
            <Button size="sm" onClick={onTambah}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Manual
            </Button>
        </div>
    );
}

function TabelRekap({ kategori, cari, tahun }: { kategori: RekapKategori; cari: string; tahun: string }) {
    const [hal, setHal] = useState(0);
    const [buka, setBuka] = useState<Set<string>>(new Set());
    const [tampilKosong, setTampilKosong] = useState(false);
    const [lihat, setLihat] = useState<Baris | null>(null);

    const params = new URLSearchParams({
        kategori, limit: String(PER_HAL), offset: String(hal * PER_HAL),
    });
    if (cari) params.set("search", cari);
    if (tahun !== "all") params.set("tahun", tahun);

    const { data, isLoading, isFetching } = useQuery<{ data: Baris[]; total: number; kolomTerisi?: string[] }>({
        queryKey: [API, kategori, cari, tahun, hal],
        queryFn: async () => {
            const r = await fetch(`${API}?${params}`, { credentials: "include" });
            if (!r.ok) throw new Error("Gagal memuat data rekap MCU");
            return r.json();
        },
    });

    const baris = data?.data ?? [];
    const total = data?.total ?? 0;
    const maxHal = Math.max(0, Math.ceil(total / PER_HAL) - 1);

    // Kolom kosong dihitung di SERVER atas seluruh kategori, bukan dari halaman yang
    // sedang tampil — kalau tidak, kolom akan muncul-hilang saat berpindah halaman.
    const terisi = useMemo(() => (data?.kolomTerisi ? new Set(data.kolomTerisi) : null), [data?.kolomTerisi]);
    const terlihat = (k: KolomRekap) => tampilKosong || !terisi || terisi.has(k.key);

    const grup = useMemo(() => grupRekap(kategori).map((g) => ({
        ...g, tampil: g.kolom.filter(terlihat),
    })).filter((g) => g.tampil.length > 0 || tampilKosong), [kategori, terisi, tampilKosong]);

    const jmlKosong = REKAP_DEFS[kategori].kolom.length - (terisi ? REKAP_DEFS[kategori].kolom.filter((k) => terisi.has(k.key)).length : REKAP_DEFS[kategori].kolom.length);

    const toggle = (g: string) => setBuka((s) => {
        const n = new Set(s);
        n.has(g) ? n.delete(g) : n.add(g);
        return n;
    });

    return (
        <Card>
            <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span><strong className="text-foreground">{total}</strong> hasil MCU</span>
                        <span className="text-slate-300">|</span>
                        <span>{grup.length} kelompok pemeriksaan</span>
                        <Button variant="link" className="h-auto p-0 text-xs"
                            onClick={() => setBuka(buka.size ? new Set() : new Set(grup.map((g) => g.grup)))}>
                            {buka.size ? "Tutup semua" : "Buka semua"}
                        </Button>
                    </div>
                    {jmlKosong > 0 && (
                        <div className="flex items-center gap-2">
                            <Switch id={`kosong-${kategori}`} checked={tampilKosong} onCheckedChange={setTampilKosong} />
                            <Label htmlFor={`kosong-${kategori}`} className="text-xs font-normal text-muted-foreground">
                                Tampilkan {jmlKosong} kolom kosong
                            </Label>
                        </div>
                    )}
                </div>

                <div className="relative overflow-x-auto rounded-md border">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100">
                                <th rowSpan={2} className="sticky left-0 z-30 min-w-[190px] border-b border-r bg-slate-100 px-3 py-2 text-left font-semibold">
                                    Nama
                                </th>
                                <th rowSpan={2} className="whitespace-nowrap border-b border-r px-2 py-2 text-left font-semibold">Dept</th>
                                <th rowSpan={2} className="whitespace-nowrap border-b border-r px-2 py-2 text-left font-semibold">Periode</th>
                                {grup.map((g) => {
                                    const kb = buka.has(g.grup);
                                    return (
                                        <th key={g.grup} colSpan={kb ? g.tampil.length : 1}
                                            className="whitespace-nowrap border-b border-r bg-slate-100 px-2 py-1.5 text-center font-semibold">
                                            <button onClick={() => toggle(g.grup)}
                                                className="inline-flex items-center gap-1 rounded px-1 hover:text-red-600">
                                                {kb ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                <span className={cn(!kb && "max-w-[120px] truncate")}>{g.grup}</span>
                                                <span className="text-[10px] font-normal text-muted-foreground">({g.tampil.length})</span>
                                            </button>
                                        </th>
                                    );
                                })}
                                <th rowSpan={2} className="border-b px-2 py-2 text-center font-semibold">Aksi</th>
                            </tr>
                            <tr className="bg-slate-50">
                                {grup.map((g) => buka.has(g.grup)
                                    ? g.tampil.map((k) => (
                                        <th key={k.key} title={k.key}
                                            className="min-w-[92px] border-b border-r px-2 py-1.5 text-left align-bottom text-[10px] font-medium leading-tight text-slate-600">
                                            {k.label}
                                        </th>
                                    ))
                                    : <th key={g.grup} className="border-b border-r bg-slate-50" />)}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={99} className="py-10 text-center text-muted-foreground">Memuat data rekap MCU...</td></tr>
                            ) : baris.length === 0 ? (
                                <tr><td colSpan={99} className="py-10 text-center text-muted-foreground">Tidak ada data ditemukan.</td></tr>
                            ) : baris.map((b) => (
                                <BarisRekap key={b.id} b={b} grup={grup} buka={buka} onLihat={() => setLihat(b)} />
                            ))}
                        </tbody>
                    </table>
                </div>

                {total > PER_HAL && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Menampilkan {hal * PER_HAL + 1}–{Math.min((hal + 1) * PER_HAL, total)} dari {total}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" disabled={hal === 0} onClick={() => setHal((h) => h - 1)}>
                                <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
                            </Button>
                            <span className="px-2">Hal {hal + 1} / {maxHal + 1}</span>
                            <Button variant="outline" size="sm" disabled={hal >= maxHal} onClick={() => setHal((h) => h + 1)}>
                                Berikutnya <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {lihat && <DialogDetail item={lihat} kategori={kategori} onClose={() => setLihat(null)} />}
        </Card>
    );
}

// memo: 50 baris x banyak sel — tanpa ini, membuka satu grup me-render ulang semuanya.
const BarisRekap = memo(function BarisRekap({ b, grup, buka, onLihat }: {
    b: Baris; grup: { grup: string; tampil: KolomRekap[] }[]; buka: Set<string>; onLihat: () => void;
}) {
    return (
        <tr className="group hover:bg-slate-50">
            {/* Latar buram WAJIB diulang di sel sticky, termasuk keadaan hover —
                kalau transparan, sel di baliknya akan menembus saat digeser. */}
            <td className="sticky left-0 z-10 border-b border-r bg-white px-3 py-1.5 font-medium group-hover:bg-slate-50">
                <div className="truncate">{b.empNama || b.nama}</div>
                <div className="truncate text-[10px] text-muted-foreground">{b.empNik || b.noReg || "-"}</div>
            </td>
            <td className="whitespace-nowrap border-b border-r px-2 py-1.5 text-[11px]">{b.empDept || b.departemenSumber || "-"}</td>
            <td className="whitespace-nowrap border-b border-r px-2 py-1.5 text-[11px]">{b.bulan} {b.tahun}</td>
            {grup.map((g) => buka.has(g.grup)
                ? g.tampil.map((k) => {
                    const v = b.nilai?.[k.key];
                    return (
                        <td key={k.key} className={cn("border-b border-r px-2 py-1.5", !v && "text-slate-300")}>
                            {v || "-"}
                        </td>
                    );
                })
                : <td key={g.grup} className="border-b border-r bg-slate-50/40" />)}
            <td className="border-b px-2 py-1.5 text-center">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Lihat semua hasil" onClick={onLihat}>
                    <Eye className="h-3.5 w-3.5" />
                </Button>
            </td>
        </tr>
    );
});

function DialogDetail({ item, kategori, onClose }: { item: Baris; kategori: RekapKategori; onClose: () => void }) {
    const grup = grupRekap(kategori);
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{item.empNama || item.nama}</DialogTitle>
                    <DialogDescription>
                        {kategori} — {item.bulan} {item.tahun}
                        {item.noReg && <> · No. Reg {item.noReg}</>}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-2 text-xs">
                    {[["NIK", item.empNik], ["Jabatan", item.empPosisi || item.posisiSumber],
                    ["Departemen", item.empDept || item.departemenSumber],
                    ["Jenis Kelamin", item.jenisKelamin === "M" ? "Laki-laki" : item.jenisKelamin === "F" ? "Perempuan" : item.jenisKelamin],
                    ["Tgl Lahir", item.tanggalLahir ? new Date(item.tanggalLahir).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : null],
                    ].filter(([, v]) => v).map(([l, v]) => (
                        <Badge key={l as string} variant="secondary" className="font-normal">
                            <span className="text-muted-foreground">{l}:</span>&nbsp;{v as string}
                        </Badge>
                    ))}
                </div>

                <div className="space-y-4">
                    {grup.map((g) => {
                        const isi = g.kolom.filter((k) => item.nilai?.[k.key]);
                        if (!isi.length) return null;
                        return (
                            <div key={g.grup}>
                                <h4 className="mb-1.5 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {g.grup}
                                </h4>
                                <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                                    {isi.map((k) => (
                                        <div key={k.key} className="flex justify-between gap-3 border-b border-dashed py-1 text-xs">
                                            <dt className="text-muted-foreground">{k.label}</dt>
                                            <dd className="text-right font-medium">{item.nilai![k.key]}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        );
                    })}
                    {(item.kesimpulan || item.tindakLanjut) && (
                        <div className="rounded-md bg-slate-50 p-3 text-xs">
                            {item.kesimpulan && <p><strong>Kesimpulan:</strong> {item.kesimpulan}</p>}
                            {item.tindakLanjut && <p className="mt-1"><strong>Rekomendasi:</strong> {item.tindakLanjut}</p>}
                        </div>
                    )}
                    {!item.nilai && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada hasil pemeriksaan tercatat.</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}


const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Tambah satu hasil MCU secara manual. Identitas wajib, kolom pemeriksaan opsional
 *  dan dikelompokkan supaya 156 kolom tidak menghantam pengguna sekaligus. */
function DialogTambah({ kategori, onClose }: { kategori: RekapKategori; onClose: () => void }) {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [f, setF] = useState<any>({
        nama: "", noReg: "", jenisKelamin: "M", tanggalLahir: "",
        departemenSumber: "", posisiSumber: "",
        bulan: BULAN[new Date().getMonth()], tahun: String(new Date().getFullYear()),
        kesimpulan: "", tindakLanjut: "",
    });
    const [nilai, setNilai] = useState<Record<string, string>>({});
    const [buka, setBuka] = useState<Set<string>>(new Set());
    const [galat, setGalat] = useState("");
    const [simpan, setSimpan] = useState(false);

    const grup = useMemo(() => grupRekap(kategori), [kategori]);
    const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));
    const terisi = Object.keys(nilai).filter((k) => nilai[k]).length;

    const kirim = async () => {
        if (!f.nama.trim()) { setGalat("Nama wajib diisi."); return; }
        if (!f.tahun || isNaN(parseInt(f.tahun))) { setGalat("Tahun wajib diisi."); return; }
        if (!f.noReg.trim() && !f.tanggalLahir) {
            setGalat("Isi No Reg/No Lab, atau tanggal lahir. Salah satunya diperlukan untuk "
                + "membedakan dua orang bernama sama pada periode yang sama.");
            return;
        }
        setGalat(""); setSimpan(true);
        try {
            const bersih: Record<string, string> = {};
            for (const [k, v] of Object.entries(nilai)) if (v && v.trim()) bersih[k] = v.trim();
            await apiRequest(API, "POST", {
                kategori,
                nama: f.nama.trim(),
                noReg: f.noReg.trim() || null,
                jenisKelamin: f.jenisKelamin || null,
                tanggalLahir: f.tanggalLahir || null,
                departemenSumber: f.departemenSumber.trim() || null,
                posisiSumber: f.posisiSumber.trim() || null,
                bulan: f.bulan, tahun: parseInt(f.tahun),
                kesimpulan: f.kesimpulan.trim() || null,
                tindakLanjut: f.tindakLanjut.trim() || null,
                nilai: Object.keys(bersih).length ? bersih : null,
                statusTaut: "BELUM",
            });
            toast({ title: "Hasil MCU ditambahkan", description: `${f.nama} — ${kategori}, ${f.bulan} ${f.tahun}` });
            qc.invalidateQueries({ queryKey: [API] });
            onClose();
        } catch (e: any) {
            setGalat(e.message || "Gagal menyimpan");
        } finally { setSimpan(false); }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tambah Hasil MCU — {kategori}</DialogTitle>
                    <DialogDescription>
                        Untuk memasukkan banyak data sekaligus, pakai Template Excel lalu Upload.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                        <Label>Nama <span className="text-destructive">*</span></Label>
                        <Input value={f.nama} onChange={set("nama")} placeholder="Nama sesuai data karyawan" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>No Reg / No Lab</Label>
                        <Input value={f.noReg} onChange={set("noReg")} placeholder="mis. 001/MCU-MHC/GECL/I/2026" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Tanggal Lahir</Label>
                        <Input type="date" value={f.tanggalLahir} onChange={set("tanggalLahir")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Jenis Kelamin</Label>
                        <Select value={f.jenisKelamin} onValueChange={(v) => setF((p: any) => ({ ...p, jenisKelamin: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="M">Laki-laki</SelectItem>
                                <SelectItem value="F">Perempuan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Departemen</Label>
                        <Input value={f.departemenSumber} onChange={set("departemenSumber")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Jabatan</Label>
                        <Input value={f.posisiSumber} onChange={set("posisiSumber")} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Bulan <span className="text-destructive">*</span></Label>
                            <Select value={f.bulan} onValueChange={(v) => setF((p: any) => ({ ...p, bulan: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{BULAN.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tahun <span className="text-destructive">*</span></Label>
                            <Input value={f.tahun} onChange={set("tahun")} inputMode="numeric" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Hasil Pemeriksaan</h4>
                        <span className="text-xs text-muted-foreground">
                            {terisi > 0 ? `${terisi} kolom terisi` : "opsional — buka kelompok yang perlu diisi"}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {grup.map((g) => {
                            const kb = buka.has(g.grup);
                            const n = g.kolom.filter((k) => nilai[k.key]).length;
                            return (
                                <div key={g.grup} className="rounded-md border">
                                    <button type="button"
                                        onClick={() => setBuka((s) => { const x = new Set(s); x.has(g.grup) ? x.delete(g.grup) : x.add(g.grup); return x; })}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-slate-50">
                                        {kb ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        <span className="flex-1">{g.grup}</span>
                                        <span className="text-muted-foreground">{n > 0 ? `${n}/${g.kolom.length} terisi` : `${g.kolom.length} kolom`}</span>
                                    </button>
                                    {kb && (
                                        <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                                            {g.kolom.map((k) => (
                                                <div key={k.key} className="space-y-1">
                                                    <Label className="text-[11px] font-normal text-muted-foreground">{k.label}</Label>
                                                    <Input className="h-8 text-xs" value={nilai[k.key] || ""}
                                                        onChange={(e) => setNilai((p) => ({ ...p, [k.key]: e.target.value }))} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Kesimpulan</Label>
                        <Input value={f.kesimpulan} onChange={set("kesimpulan")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Rekomendasi</Label>
                        <Input value={f.tindakLanjut} onChange={set("tindakLanjut")} />
                    </div>
                </div>

                {galat && <p className="text-sm text-destructive">{galat}</p>}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={simpan}>Batal</Button>
                    <Button onClick={kirim} disabled={simpan}>
                        {simpan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {simpan ? "Menyimpan..." : "Simpan"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
