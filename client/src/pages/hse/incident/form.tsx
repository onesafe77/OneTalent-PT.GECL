import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

/** §6.5 — toISOString() memberi tanggal UTC; di WITA mundur sehari sebelum 08.00. */
const tanggalLokal = (d = new Date()) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** §1.1 & §6.4 — cerminan rumus basis data, harus IDENTIK. */
const tanggalKerja = (tgl: string, jam: string) => {
    const j = parseInt((jam || "").trim().slice(0, 2));
    const d = new Date(tgl + "T12:00:00");
    if (Number.isFinite(j) && j < 6) d.setDate(d.getDate() - 1);
    return d;
};
const mingguKerja = (tgl: string, jam: string) => {
    const d = tanggalKerja(tgl, jam);
    const awal = new Date(d.getFullYear(), 0, 1);
    const doy = Math.floor((d.getTime() - awal.getTime()) / 86400000) + 1;
    return Math.floor((doy + awal.getDay() - 1) / 7) + 1;
};
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function FormInsiden() {
    const [, params] = useRoute("/workspace/hse/incident-form/:id");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const qc = useQueryClient();
    const id = params?.id;
    const baru = id === "new";

    const { data: master } = useQuery<any>({ queryKey: ["/api/hse/master"] });
    const [f, setF] = useState<any>({ tanggal: tanggalLokal(), status_investigasi: "Open", penyebab: [], rekomendasi: [] });
    const [menyimpan, setMenyimpan] = useState(false);

    const [dariPdf, setDariPdf] = useState<any>(null);

    // Draf hasil baca PDF dititipkan lewat sessionStorage lalu dibuang, supaya
    // membuka form baru berikutnya tidak ikut terisi.
    useEffect(() => {
        if (!baru) return;
        const d = sessionStorage.getItem("drafInsidenPdf");
        if (!d) return;
        sessionStorage.removeItem("drafInsidenPdf");
        try {
            const j = JSON.parse(d);
            setDariPdf(j);
            setF((s: any) => ({ ...s, ...j, penyebab: j.penyebab ?? [], rekomendasi: j.rekomendasi ?? [] }));
        } catch { /* draf rusak — biarkan form kosong */ }
    }, [baru]);

    useEffect(() => {
        if (baru || !id) return;
        fetch(`/api/hse/insiden/${id}`).then((r) => r.json()).then((d) =>
            setF({ ...d, tanggal: String(d.tanggal).slice(0, 10), penyebab: d.penyebab ?? [], rekomendasi: d.rekomendasi ?? [] }));
    }, [id, baru]);

    const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

    const [statusNik, setStatusNik] = useState<"" | "mencari" | "ketemu" | "tidak">("");

    /** Nama diambil dari daftar manpower lewat NIK — tidak diketik ulang. */
    const cariKaryawan = async (nik: string) => {
        const n = (nik || "").trim();
        if (!n) { setStatusNik(""); return; }
        setStatusNik("mencari");
        try {
            const r = await fetch(`/api/employees/${encodeURIComponent(n)}`);
            if (!r.ok) throw new Error();
            const k = await r.json();
            setF((s: any) => ({
                ...s,
                nama_terlibat: k.name ?? s.nama_terlibat,
                jabatan: s.jabatan || k.position || "",
                // Usia dihitung pada TANGGAL KEJADIAN, bukan hari ini.
                usia: k.dob && s.tanggal
                    ? (() => {
                        const l = String(k.dob).slice(0, 10).split("-").map(Number);
                        const t = String(s.tanggal).slice(0, 10).split("-").map(Number);
                        return t[0] - l[0] - (t[1] < l[1] || (t[1] === l[1] && t[2] < l[2]) ? 1 : 0);
                    })()
                    : s.usia,
            }));
            setStatusNik("ketemu");
        } catch { setStatusNik("tidak"); }
    };

    const simpan = async () => {
        if (!f.judul || !f.tanggal) { toast({ title: "Judul dan tanggal wajib diisi", variant: "destructive" }); return; }
        setMenyimpan(true);
        try {
            const r = await fetch(baru ? "/api/hse/insiden" : `/api/hse/insiden/${id}`, {
                method: baru ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
            });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "");
            // queryClient memakai staleTime: Infinity, jadi daftar TIDAK akan
            // memuat ulang sendiri. Kunci berisi parameter saringan, maka
            // dibatalkan lewat awalan URL — bukan kunci persis.
            await qc.invalidateQueries({
                predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/hse/insiden"),
            });
            toast({ title: "Insiden tersimpan" });
            setLocation("/workspace/hse/incident-report");
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e?.message || undefined, variant: "destructive" });
        }
        finally { setMenyimpan(false); }
    };

    const Pilih = ({ label, k, opsi }: any) => (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Select value={f[k] ?? ""} onValueChange={(v) => set(k, v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{(opsi ?? []).map((o: any) => <SelectItem key={o.nilai} value={o.nilai}>{o.nilai}</SelectItem>)}</SelectContent>
            </Select>
        </div>
    );
    const Teks = ({ label, k, tipe = "text", saran }: any) => (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Input className="h-9" type={tipe} value={f[k] ?? ""} list={saran ? `l-${k}` : undefined}
                onChange={(e) => set(k, tipe === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />
            {saran && <datalist id={`l-${k}`}>{saran.map((o: any) => <option key={o.nilai} value={o.nilai} />)}</datalist>}
        </div>
    );

    // §5.3 — pratinjau turunan tanggal. Aturan 06.00 tidak terlihat di mana pun kecuali di sini.
    const malam = Number.isFinite(parseInt((f.jam || "").slice(0, 2))) && parseInt((f.jam || "").slice(0, 2)) < 6;
    const tk = f.tanggal ? tanggalKerja(f.tanggal, f.jam || "") : null;

    const statusRek = (r: any) => {
        if (!r.tanggal_pemenuhan && !r.due_date) return { s: "Open", c: "border-border bg-muted text-muted-foreground" };
        if (!r.tanggal_pemenuhan && r.due_date < tanggalLokal()) return { s: "Overdue", c: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-400" };
        if (!r.tanggal_pemenuhan) return { s: "Open", c: "border-border bg-muted text-muted-foreground" };
        if (!r.due_date || r.tanggal_pemenuhan <= r.due_date) return { s: "Close Ontime", c: "border-border bg-muted text-foreground" };
        return { s: "Close Overdue", c: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400" };
    };

    return (
        <div className="w-full space-y-6 p-6 pb-16 md:p-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/workspace/hse/incident-report")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">
                            {baru ? "Insiden Baru" : "Ubah Insiden"}
                        </h1>
                        <p className="mt-1 text-[15px] text-muted-foreground">Hanya judul dan tanggal yang wajib diisi.</p>
                    </div>
                </div>
                <Button onClick={simpan} disabled={menyimpan}><Save className="mr-2 h-4 w-4" /> Simpan</Button>
            </div>

            {dariPdf && (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950">
                    <p className="text-[14px] font-medium text-amber-900 dark:text-amber-200">
                        Terisi dari PDF {dariPdf.nomor ?? ""} — periksa sebelum menyimpan.
                    </p>
                    <p className="text-[13px] text-amber-800 dark:text-amber-300">
                        Kotak tercentang yang terbaca: {dariPdf.tercentang?.join(" · ") || "tidak ada"}
                    </p>
                    {(dariPdf.peringatan ?? []).map((w: string) => (
                        <p key={w} className="text-[13px] text-amber-800 dark:text-amber-300">! {w}</p>
                    ))}
                </div>
            )}

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="space-y-4 p-5">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">1 · Kejadian</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                        <div className="space-y-1.5">
                            <Label>No. registrasi</Label>
                            <Input className="h-9 font-mono text-[13px]" value={f.no_registrasi ?? ""}
                                placeholder="CHR-GEC-INC-2026-04-053"
                                onChange={(e) => set("no_registrasi", e.target.value)} />
                        </div>
                    <div className="space-y-1.5">
                        <Label>Judul insiden</Label>
                        <Input className="h-9" value={f.judul ?? ""} onChange={(e) => set("judul", e.target.value)}
                            placeholder="DT BBS 6009 Rebah di KM 28 Phase 7" />
                    </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        <Teks label="Tanggal kejadian" k="tanggal" tipe="date" />
                        <Pilih label="Jam kejadian" k="jam" opsi={master?.jam} />
                        <Pilih label="Shift" k="shift" opsi={master?.shift} />
                        <Pilih label="Area" k="area" opsi={master?.area} />
                        <Teks label="Lokasi" k="lokasi" saran={master?.lokasi} />
                        <Teks label="Sub lokasi" k="sub_lokasi" saran={master?.sub_lokasi} />
                        <Teks label="Detail lokasi" k="detail_lokasi" />
                        <Teks label="Perusahaan" k="perusahaan" saran={master?.perusahaan} />
                        <Teks label="Custodian" k="custodian" saran={master?.custodian} />
                    </div>
                    {tk && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                            <Badge variant="secondary" className="font-mono">W{mingguKerja(f.tanggal, f.jam || "")}</Badge>
                            <span className="text-[13px] text-foreground">
                                {HARI_ID[tk.getDay()]} · pekan ke-{Math.floor((tk.getDate() - 1) / 7) + 1} bulan ini
                            </span>
                            {malam && <span className="text-[12px] italic text-muted-foreground">
                                shift malam — ikut hari kerja sebelumnya ({tk.toLocaleDateString("id-ID")})
                            </span>}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="space-y-4 p-5">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">2 · Klasifikasi &amp; dampak</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        <div>
                            <Teks label="Mekanisme insiden" k="mekanisme" saran={master?.mekanisme} />
                            <p className="mt-1 text-[11px] text-muted-foreground">tabrak / senggol / rebah → ikut CIFR</p>
                        </div>
                        <Pilih label="Klasifikasi" k="klasifikasi" opsi={master?.klasifikasi} />
                        <div>
                            <Pilih label="Kategori khusus" k="kategori_khusus" opsi={master?.kategori_khusus} />
                            <p className="mt-1 text-[11px] text-muted-foreground">Kelelahan → ikut Fatigue FR</p>
                        </div>
                        <Teks label="Jenis tabrak" k="jenis_tabrak" />
                        <div>
                            <Teks label="Lost cost (Rp)" k="lost_cost" tipe="number" />
                            <p className="mt-1 text-[11px] text-muted-foreground">Klasifikasi kerugian dihitung otomatis</p>
                        </div>
                        <Teks label="Alat terlibat" k="alat_terlibat" saran={master?.alat_terlibat} />
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="space-y-4 p-5">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">3 · Orang terlibat</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        <div className="space-y-1.5">
                            <Label>NIK</Label>
                            <Input className="h-9" value={f.nik_terlibat ?? ""} placeholder="C-034743"
                                onChange={(e) => set("nik_terlibat", e.target.value)}
                                onBlur={(e) => cariKaryawan(e.target.value)} />
                            <p className="text-[11px] text-muted-foreground">
                                {statusNik === "mencari" ? "Mencari di daftar manpower…"
                                    : statusNik === "ketemu" ? "Nama diambil dari daftar manpower"
                                    : statusNik === "tidak" ? "NIK tidak ada di daftar manpower — isi nama manual"
                                    : "Nama terisi otomatis dari daftar manpower"}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Nama</Label>
                            <Input className="h-9" value={f.nama_terlibat ?? ""}
                                onChange={(e) => set("nama_terlibat", e.target.value)} />
                        </div>
                        <Teks label="Jabatan" k="jabatan" saran={master?.jabatan} />
                        <div>
                            <Teks label="Usia" k="usia" tipe="number" />
                            <p className="mt-1 text-[11px] text-muted-foreground">Rentang usia dikelompokkan otomatis</p>
                        </div>
                        <Pilih label="Masa kerja" k="masa_kerja" opsi={master?.masa_kerja} />
                        <Teks label="Hari kerja ke-" k="hari_kerja" />
                        <Teks label="Faktor kritis" k="faktor_kritis" saran={master?.faktor_kritis} />
                    </div>
                </CardContent>
            </Card>

            {/* §5.3 bagian 4 & 5 — tabel dinamis */}
            {([
                { judul: "4 · Analisis penyebab", kunci: "penyebab", kosong: { jenis: "TTA", kode: "", uraian: "", detail: "" } },
                { judul: "5 · Rekomendasi / tindak lanjut", kunci: "rekomendasi", kosong: { uraian: "", pic: "", due_date: "", tanggal_pemenuhan: "" } },
            ] as const).map(({ judul, kunci, kosong }) => (
                <Card key={kunci} className="rounded-xl border border-border bg-card">
                    <CardContent className="space-y-3 p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{judul}</h2>
                            <Button variant="outline" size="sm" onClick={() => set(kunci, [...(f[kunci] ?? []), { ...kosong }])}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah baris
                            </Button>
                        </div>
                        {(f[kunci] ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Belum ada baris.</p>}
                        {(f[kunci] ?? []).map((row: any, i: number) => {
                            const ubahRow = (k: string, v: any) => {
                                const arr = [...f[kunci]]; arr[i] = { ...arr[i], [k]: v }; set(kunci, arr);
                            };
                            const st = kunci === "rekomendasi" ? statusRek(row) : null;
                            return (
                                <div key={i} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[repeat(4,1fr)_auto]">
                                    {kunci === "penyebab" ? <>
                                        <div className="space-y-1.5">
                                            <Label>Jenis</Label>
                                            <Select value={row.jenis} onValueChange={(v) => ubahRow("jenis", v)}>
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {["TTA", "KTA", "PRIBADI", "PEKERJAAN"].map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5"><Label>Kode</Label>
                                            <Input className="h-9 font-mono" value={row.kode ?? ""} onChange={(e) => ubahRow("kode", e.target.value)} /></div>
                                        <div className="space-y-1.5"><Label>Uraian</Label>
                                            <Input className="h-9" value={row.uraian ?? ""} list="l-baraica" onChange={(e) => ubahRow("uraian", e.target.value)} /></div>
                                        <div className="space-y-1.5"><Label>Detail</Label>
                                            <Input className="h-9" value={row.detail ?? ""} onChange={(e) => ubahRow("detail", e.target.value)} /></div>
                                    </> : <>
                                        <div className="space-y-1.5 md:col-span-2"><Label>Uraian rekomendasi</Label>
                                            <Input className="h-9" value={row.uraian ?? ""} onChange={(e) => ubahRow("uraian", e.target.value)} /></div>
                                        <div className="space-y-1.5"><Label>PIC</Label>
                                            <Input className="h-9" value={row.pic ?? ""} onChange={(e) => ubahRow("pic", e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5"><Label>Due date</Label>
                                                <Input className="h-9" type="date" value={row.due_date?.slice(0, 10) ?? ""} onChange={(e) => ubahRow("due_date", e.target.value)} /></div>
                                            <div className="space-y-1.5"><Label>Pemenuhan</Label>
                                                <Input className="h-9" type="date" value={row.tanggal_pemenuhan?.slice(0, 10) ?? ""} onChange={(e) => ubahRow("tanggal_pemenuhan", e.target.value)} /></div>
                                        </div>
                                    </>}
                                    <div className="flex items-center gap-2">
                                        {st && <Badge className={st.c}>{st.s}</Badge>}
                                        <Button variant="ghost" size="icon"
                                            className="text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                                            onClick={() => set(kunci, f[kunci].filter((_: any, n: number) => n !== i))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            ))}
            <datalist id="l-baraica">{(master?.baraica ?? []).map((o: any) => <option key={o.nilai} value={o.nilai} />)}</datalist>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-5">
                    <div className="max-w-[260px] space-y-1.5">
                        <Label>6 · Status investigasi</Label>
                        <Select value={f.status_investigasi ?? "Open"} onValueChange={(v) => set("status_investigasi", v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>{["Open", "On Progress", "Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
