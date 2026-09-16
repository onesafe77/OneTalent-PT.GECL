import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Database, AlertTriangle, Search, X, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

const tok = (nama: string, cadangan: string) =>
    (typeof window !== "undefined"
        ? getComputedStyle(document.documentElement).getPropertyValue(nama).trim()
        : "") || cadangan;

type Unit = {
    id?: string; noLambung?: string; noPolisi?: string; noRangka?: string;
    jenisUnit?: string; merk?: string; type?: string; owner?: string; komisioner?: string;
    namaPic?: string; noKontak?: string; tahunPembuatan?: number | string; aebs?: string;
    statusUnit?: string; statusBib?: string; statusTia?: string; statusTma?: string;
    expiredBib?: string; expiredTia?: string;
};

const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tgl = (v?: string) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : `${String(d.getDate()).padStart(2, "0")} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
};
const kunciBulan = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/* ── Kendali penyaring ─────────────────────────────────────────────────── */
function Pilih({ label, nilai, opsi, onUbah }: {
    label: string; nilai: string; opsi: string[]; onUbah: (v: string) => void;
}) {
    const aktif = nilai !== "semua";
    return (
        <label className="block">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
            <div className="relative">
                <select
                    value={nilai}
                    onChange={(e) => onUbah(e.target.value)}
                    className={cn(
                        "h-9 w-full appearance-none rounded-lg border pl-3 pr-8 text-[13px] outline-none transition-colors",
                        aktif ? "border-primary/40 bg-primary/10 font-medium text-primary"
                              : "border-border bg-background text-foreground hover:bg-muted"
                    )}>
                    <option value="semua">Semua</option>
                    {opsi.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
            </div>
        </label>
    );
}

function Angka({ label, nilai, ket, nada, bagian }: {
    label: string; nilai: React.ReactNode; ket?: string;
    nada?: "aksen" | "kuning"; bagian?: number;   // 0..1, ditampilkan sbg bilah tipis
}) {
    const warna = nada === "aksen" ? "bg-primary" : nada === "kuning" ? "bg-amber-500" : "bg-foreground/70";
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-[24px] font-semibold leading-none tabular-nums",
                nada === "aksen" ? "text-primary" : nada === "kuning" ? "text-amber-600" : "text-foreground")}>{nilai}</p>
            {bagian !== undefined && (
                <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-muted">
                    <span className={cn("block h-full rounded-full", warna)}
                        style={{ width: `${Math.min(100, Math.max(0, bagian * 100))}%` }} />
                </span>
            )}
            {ket && <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{ket}</p>}
        </div>
    );
}

/* Bilah bertumpuk sederhana untuk komposisi dua nilai. */
function Komposisi({ kiri, kanan, labelKiri, labelKanan }: {
    kiri: number; kanan: number; labelKiri: string; labelKanan: string;
}) {
    const total = kiri + kanan || 1;
    return (
        <div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <span className="bg-primary" style={{ width: `${(kiri / total) * 100}%` }} />
                <span className="bg-primary/35" style={{ width: `${(kanan / total) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px]">
                <span className="text-foreground"><b className="tabular-nums">{kiri}</b> {labelKiri}</span>
                <span className="text-muted-foreground"><b className="tabular-nums">{kanan}</b> {labelKanan}</span>
            </div>
        </div>
    );
}

function Deret({ data, maks, satuan = "" }: { data: [string, number][]; maks: number; satuan?: string }) {
    if (!data.length) return <p className="py-4 text-center text-[12px] text-muted-foreground">Tidak ada data.</p>;
    return (
        <div className="space-y-2">
            {data.map(([nama, n]) => (
                <div key={nama} className="flex items-center gap-3">
                    <span className="w-[44%] truncate text-[12px] text-foreground" title={nama}>{nama}</span>
                    <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${maks ? (n / maks) * 100 : 0}%` }} />
                    </span>
                    <span className="w-10 text-right font-mono text-[12px] tabular-nums text-foreground">{n}{satuan}</span>
                </div>
            ))}
        </div>
    );
}

export default function SpipPeralatanDashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ["/api/spip/peralatan", "dashboard"],
        queryFn: async () => {
            const r = await fetch("/api/spip/peralatan?limit=10000");
            if (!r.ok) throw new Error("Gagal memuat data peralatan");
            return r.json();
        },
    });
    const semua: Unit[] = useMemo(() => data?.data || [], [data]);

    const [cari, setCari] = useState("");
    const [fOwner, setFOwner] = useState("semua");
    const [fMerk, setFMerk] = useState("semua");
    const [fJenis, setFJenis] = useState("semua");
    const [fStatusUnit, setFStatusUnit] = useState("semua");
    const [fStatusBib, setFStatusBib] = useState("semua");
    const [fUmurBib, setFUmurBib] = useState("semua");
    const [fStatusTia, setFStatusTia] = useState("semua");
    const [fTahun, setFTahun] = useState("semua");
    const [fJatuhTempo, setFJatuhTempo] = useState("semua");

    const unik = (ambil: (u: Unit) => string) =>
        Array.from(new Set(semua.map(ambil).filter(Boolean))).sort();

    /* ── Penyaringan ──────────────────────────────────────────────────── */
    const unit = useMemo(() => {
        const kini = new Date();
        const q = cari.trim().toLowerCase();
        return semua.filter((u) => {
            if (q) {
                const gabung = [u.noLambung, u.noPolisi, u.noRangka, u.owner, u.komisioner, u.namaPic, u.merk, u.type]
                    .filter(Boolean).join(" ").toLowerCase();
                if (!gabung.includes(q)) return false;
            }
            if (fOwner !== "semua" && u.owner !== fOwner) return false;
            if (fMerk !== "semua" && u.merk !== fMerk) return false;
            if (fJenis !== "semua" && u.jenisUnit !== fJenis) return false;
            if (fStatusUnit !== "semua" && (u.statusUnit || "").toUpperCase() !== fStatusUnit) return false;
            if (fStatusBib !== "semua" && (u.statusBib || "").toUpperCase() !== fStatusBib) return false;
            if (fStatusTia !== "semua" && (u.statusTia || "").toUpperCase() !== fStatusTia) return false;
            if (fUmurBib !== "semua") {
                const d = u.expiredBib ? new Date(u.expiredBib) : null;
                if (!d || isNaN(d.getTime())) return false;
                const lewat = (kini.getTime() - d.getTime()) / 86400000;   // hari sejak BIB berakhir
                if (fUmurBib === "belum lewat" && !(lewat < 0)) return false;
                if (fUmurBib === "≤ 30 hari" && !(lewat >= 0 && lewat <= 30)) return false;
                if (fUmurBib === "31–90 hari" && !(lewat > 30 && lewat <= 90)) return false;
                if (fUmurBib === "> 90 hari" && !(lewat > 90)) return false;
            }
            if (fTahun !== "semua" && String(u.tahunPembuatan || "") !== fTahun) return false;
            if (fJatuhTempo !== "semua") {
                const d = u.expiredTia ? new Date(u.expiredTia) : null;
                if (!d || isNaN(d.getTime())) return false;
                const selisihHari = (d.getTime() - kini.getTime()) / 86400000;
                if (fJatuhTempo === "≤ 90 hari" && !(selisihHari >= 0 && selisihHari <= 90)) return false;
                if (fJatuhTempo === "91–180 hari" && !(selisihHari > 90 && selisihHari <= 180)) return false;
                if (fJatuhTempo === "> 180 hari" && !(selisihHari > 180)) return false;
                if (fJatuhTempo === "sudah lewat" && !(selisihHari < 0)) return false;
            }
            return true;
        });
    }, [semua, cari, fOwner, fMerk, fJenis, fStatusUnit, fStatusBib, fUmurBib, fStatusTia, fTahun, fJatuhTempo]);

    const adaSaringan = cari.trim() !== "" || [fOwner, fMerk, fJenis, fStatusUnit, fStatusBib, fUmurBib, fStatusTia, fTahun, fJatuhTempo]
        .some((v) => v !== "semua");
    const bersihkan = () => {
        setCari(""); setFOwner("semua"); setFMerk("semua"); setFJenis("semua");
        setFStatusUnit("semua"); setFStatusBib("semua"); setFUmurBib("semua");
        setFStatusTia("semua"); setFTahun("semua"); setFJatuhTempo("semua");
    };

    /* ── Turunan ──────────────────────────────────────────────────────── */
    const kini = new Date();
    const cacah = (ambil: (u: Unit) => string) => {
        const p: Record<string, number> = {};
        unit.forEach((u) => { const v = ambil(u) || "(kosong)"; p[v] = (p[v] || 0) + 1; });
        return p;
    };
    const urut = (p: Record<string, number>, batas = 8): [string, number][] =>
        Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, batas);

    const sBib = cacah((u) => (u.statusBib || "").toUpperCase());
    const perluTindakan = (sBib["EXPIRED"] || 0) + (sBib["NEAR EXPIRED"] || 0);
    const aktif = unit.filter((u) => (u.statusUnit || "").toUpperCase() === "ACTIVE").length;
    const ev = unit.filter((u) => (u.jenisUnit || "").toUpperCase().includes("ELECTRIC")).length;
    const tanpaKontak = unit.filter((u) => !u.noKontak || !String(u.noKontak).trim()).length;

    /* Jadwal 18 bulan — cukup panjang untuk menangkap gelombang berikutnya. */
    const jadwal = useMemo(() => {
        const ember: { kunci: string; label: string; n: number; ev: number; konv: number }[] = [];
        for (let i = 0; i < 18; i++) {
            const d = new Date(kini.getFullYear(), kini.getMonth() + i, 1);
            ember.push({ kunci: kunciBulan(d), label: `${BLN[d.getMonth()]}${d.getMonth() === 0 || i === 0 ? " " + String(d.getFullYear()).slice(2) : ""}`, n: 0, ev: 0, konv: 0 });
        }
        unit.forEach((u) => {
            if (!u.expiredTia) return;
            const d = new Date(u.expiredTia);
            if (isNaN(d.getTime()) || d < kini) return;
            const e = ember.find((x) => x.kunci === kunciBulan(d));
            if (!e) return;
            e.n += 1;
            if ((u.jenisUnit || "").toUpperCase().includes("ELECTRIC")) e.ev += 1; else e.konv += 1;
        });
        return ember;
    }, [unit]);
    const puncak = Math.max(0, ...jadwal.map((j) => j.n));

    /* Penumpukan pada TANGGAL yang sama — inti temuannya. */
    const perTanggal = useMemo(() => {
        const p: Record<string, number> = {};
        unit.forEach((u) => {
            if (!u.expiredTia) return;
            const d = new Date(u.expiredTia);
            if (isNaN(d.getTime()) || d < kini) return;
            const k = d.toISOString().slice(0, 10);
            p[k] = (p[k] || 0) + 1;
        });
        return Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [unit]);

    /* BIB seluruhnya sudah lewat, jadi yang berarti bukan "kapan jatuh tempo"
       melainkan "sudah berapa lama lewat" — itu yang menunjukkan antrean kerja. */
    const umurBib = useMemo(() => {
        const ember = [
            { label: "Belum lewat", n: 0 }, { label: "≤ 30 hari", n: 0 },
            { label: "31–90 hari", n: 0 }, { label: "91–150 hari", n: 0 }, { label: "> 150 hari", n: 0 },
        ];
        unit.forEach((u) => {
            if (!u.expiredBib) return;
            const d = new Date(u.expiredBib);
            if (isNaN(d.getTime())) return;
            const lewat = (kini.getTime() - d.getTime()) / 86400000;
            const i = lewat < 0 ? 0 : lewat <= 30 ? 1 : lewat <= 90 ? 2 : lewat <= 150 ? 3 : 4;
            ember[i].n += 1;
        });
        return ember;
    }, [unit]);
    const sTia = cacah((u) => (u.statusTia || "").toUpperCase());
    const sTma = cacah((u) => (u.statusTma || "").toUpperCase());
    const bibLewat = unit.filter((u) => u.expiredBib && new Date(u.expiredBib) < kini).length;
    const tiaAktif = unit.filter((u) => u.expiredTia && new Date(u.expiredTia) >= kini).length;

    /* Beberapa temuan mutu data yang hanya terlihat kalau diperiksa satu kolom
       demi satu kolom — bukan hiasan, ini pekerjaan yang menunggu. */
    const angkaNol = (v: any) => v === null || v === undefined || String(v).trim() === "";
    const mutu = useMemo(() => {
        const vol = unit.map((u) => Number((u as any).volumeVessel)).filter((n) => !isNaN(n) && n > 0);
        return [
            { label: "Tanpa nomor kontak", n: unit.filter((u) => angkaNol(u.noKontak)).length, catatan: "penghambat saat menghubungi pemilik" },
            { label: "Tanpa nama PIC", n: unit.filter((u) => angkaNol(u.namaPic)).length, catatan: "tidak jelas siapa penanggung jawabnya" },
            { label: "Volume vessel satuan campur", n: vol.filter((v) => v >= 1000).length, catatan: `${vol.filter((v) => v < 100).length} unit ditulis m³, sisanya liter` },
            { label: "Tanpa data AEBS", n: unit.filter((u) => angkaNol(u.aebs)).length, catatan: "fitur keselamatan tidak tercatat" },
            { label: "Tanpa tanggal pengajuan BIB", n: unit.filter((u) => angkaNol((u as any).tglPengajuanBib)).length, catatan: "durasi komisioning tak bisa dihitung" },
        ].filter((x) => x.n > 0);
    }, [unit]);

    const perKomisioner = urut(cacah((u) => u.komisioner || ""), 6);
    const perAebs = urut(cacah((u) => String((u as any).aebs || "")), 5);
    const perTipe = urut(cacah((u) => (u as any).type || ""), 6);
    const perMerk = urut(cacah((u) => u.merk || ""), 6);
    const perOwner = urut(cacah((u) => u.owner || ""), 8);
    const perTahun = Object.entries(cacah((u) => String(u.tahunPembuatan || ""))).sort();
    const perluDaftar = unit.filter((u) => ["EXPIRED", "NEAR EXPIRED"].includes((u.statusBib || "").toUpperCase()))
        .sort((a, b) => String(a.expiredBib).localeCompare(String(b.expiredBib)));

    const AKSEN = tok("--grafik-4", "#DF2A33");
    const AKSEN_TUA = tok("--grafik-2", "#96161C");

    if (isLoading) {
        return <div className="flex h-[60vh] items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data peralatan…
        </div>;
    }

    return (
        <div className="mx-auto max-w-[1500px] space-y-5 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">HSE · KO · SPIP</p>
                    <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-foreground">Dashboard Peralatan Bergerak</h1>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                        {adaSaringan
                            ? <>Menampilkan <b className="text-primary">{unit.length}</b> dari {semua.length} unit.</>
                            : <>Seluruh {semua.length} unit dump truck dan jadwal perpanjangan stikernya.</>}
                    </p>
                </div>
                <Link href="/workspace/hse/ko/spip/peralatan"
                    className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[13px] text-foreground transition-colors hover:bg-muted">
                    <Database className="h-3.5 w-3.5" /> Buka database
                </Link>
            </div>

            {/* ── Penyaring ── */}
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block xl:col-span-2">
                        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Cari</span>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input value={cari} onChange={(e) => setCari(e.target.value)}
                                placeholder="No lambung, polisi, rangka, pemilik, komisioner…"
                                className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40" />
                        </div>
                    </label>
                    <Pilih label="Pemilik unit" nilai={fOwner} opsi={unik((u) => u.owner || "")} onUbah={setFOwner} />
                    <Pilih label="Merek" nilai={fMerk} opsi={unik((u) => u.merk || "")} onUbah={setFMerk} />
                    <Pilih label="Jenis unit" nilai={fJenis} opsi={unik((u) => u.jenisUnit || "")} onUbah={setFJenis} />
                    <Pilih label="Status unit" nilai={fStatusUnit} opsi={unik((u) => (u.statusUnit || "").toUpperCase())} onUbah={setFStatusUnit} />
                    <Pilih label="Tahun pembuatan" nilai={fTahun} opsi={unik((u) => String(u.tahunPembuatan || ""))} onUbah={setFTahun} />
                </div>

                {/* Stiker disaring terpisah: BIB dan TIA punya daur hidup sendiri —
                    BIB seluruhnya sudah lewat, TIA justru menatap ke depan. */}
                <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="md:col-span-2 xl:col-span-2">
                        <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Stiker BIB</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Pilih label="Status BIB" nilai={fStatusBib} opsi={unik((u) => (u.statusBib || "").toUpperCase())} onUbah={setFStatusBib} />
                            <Pilih label="Sudah lewat" nilai={fUmurBib}
                                opsi={["belum lewat", "≤ 30 hari", "31–90 hari", "> 90 hari"]} onUbah={setFUmurBib} />
                        </div>
                    </div>
                    <div className="md:col-span-2 xl:col-span-2">
                        <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Stiker TIA</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Pilih label="Status TIA" nilai={fStatusTia} opsi={unik((u) => (u.statusTia || "").toUpperCase())} onUbah={setFStatusTia} />
                            <Pilih label="Jatuh tempo" nilai={fJatuhTempo}
                                opsi={["≤ 90 hari", "91–180 hari", "> 180 hari", "sudah lewat"]} onUbah={setFJatuhTempo} />
                        </div>
                    </div>
                </div>
                {adaSaringan && (
                    <button onClick={bersihkan}
                        className="mt-3 flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                        <X className="h-3.5 w-3.5" /> Bersihkan penyaring
                    </button>
                )}
            </div>

            {/* ── Angka pokok ── */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Angka label="Unit tersaring" nilai={unit.length} ket={`dari ${semua.length} unit`} />
                <Angka label="Aktif / spare" nilai={`${aktif} / ${unit.length - aktif}`} ket="status operasional"
                    bagian={unit.length ? aktif / unit.length : 0} />
                <Angka label="Electric vehicle" nilai={ev} ket={`${unit.length - ev} konvensional`}
                    bagian={unit.length ? ev / unit.length : 0} />
                <Angka label="BIB perlu tindakan" nilai={perluTindakan}
                    ket={`${sBib["EXPIRED"] || 0} expired · ${sBib["NEAR EXPIRED"] || 0} near`}
                    nada={perluTindakan ? "aksen" : undefined} />
                <Angka label="TIA puncak sebulan" nilai={puncak || "—"} ket="jatuh tempo terbanyak" nada={puncak >= 20 ? "kuning" : undefined} />
                <Angka label="Tanpa no kontak" nilai={tanpaKontak} ket="penghambat saat perpanjangan"
                    nada={tanpaKontak ? "kuning" : undefined} bagian={unit.length ? tanpaKontak / unit.length : 0} />
            </div>

            {/* ── Dua stiker, dua cerita ──────────────────────────────────
                BIB: izin komisioning awal, seluruhnya sudah lewat — yang penting
                seberapa lama tertunda. TIA: masa berlaku berjalan — yang penting
                kapan jatuh tempo. Digabung jadi satu angka justru menyesatkan. */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Stiker BIB</p>
                        <CardTitle className="text-[15px] font-semibold">Izin Komisioning Awal</CardTitle>
                        <p className="text-[12px] text-muted-foreground">
                            {bibLewat} dari {unit.length} unit tanggalnya sudah lewat — wajar setelah komisioning
                            selesai. Yang menandakan masalah adalah kolom status, bukan tanggalnya.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(sBib).sort((a, b) => b[1] - a[1]).map(([st, n]) => (
                                    <span key={st} className={cn("rounded-md px-2 py-1 text-[11px]",
                                        st === "EXPIRED" ? "bg-primary/10 font-medium text-primary"
                                        : st === "NEAR EXPIRED" ? "bg-amber-50 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                        : "bg-muted text-muted-foreground")}>
                                        {st} <b className="tabular-nums">{n}</b>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Sudah lewat berapa lama</p>
                            <Deret data={umurBib.filter((e) => e.n > 0).map((e) => [e.label, e.n] as [string, number])}
                                maks={Math.max(0, ...umurBib.map((e) => e.n))} satuan=" unit" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Stiker TIA</p>
                        <CardTitle className="text-[15px] font-semibold">Masa Berlaku Berjalan</CardTitle>
                        <p className="text-[12px] text-muted-foreground">
                            {tiaAktif} dari {unit.length} unit masih berlaku. Grafik bulanan di bawah menyembunyikan
                            penumpukan pada tanggal yang sama — lihat daftar di sampingnya.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(sTia).sort((a, b) => b[1] - a[1]).map(([st, n]) => (
                                    <span key={st} className={cn("rounded-md px-2 py-1 text-[11px]",
                                        st === "EXPIRED" ? "bg-primary/10 font-medium text-primary" : "bg-muted text-muted-foreground")}>
                                        {st} <b className="tabular-nums">{n}</b>
                                    </span>
                                ))}
                                {Object.entries(sTma).map(([st, n]) => (
                                    <span key={"tma" + st} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                                        TMA {st} <b className="tabular-nums">{n}</b>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Komposisi armada tersaring</p>
                            <Komposisi kiri={ev} kanan={unit.length - ev} labelKiri="electric" labelKanan="konvensional" />
                        </div>
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Penumpukan tanggal jatuh tempo</p>
                            <Deret data={perTanggal.map(([d, n]) => [tgl(d), n])} maks={perTanggal[0]?.[1] || 0} satuan=" unit" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Jadwal ── */}
            <Card className="border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[15px] font-semibold">Jadwal Perpanjangan TIA — 18 Bulan</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
                        <span>Jumlah stiker TIA jatuh tempo per bulan, dipecah jenis unit.</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: AKSEN_TUA }} /> Electric</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: AKSEN }} /> Konvensional</span>
                    </div>
                </CardHeader>
                <CardContent className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={jadwal} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tok("--grafik-garis", "#E0E0E0")} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0}
                                tick={{ fontSize: 10, fill: tok("--grafik-label", "#757575") }} />
                            <YAxis tickLine={false} axisLine={false} allowDecimals={false}
                                tick={{ fontSize: 11, fill: tok("--grafik-label", "#757575") }} />
                            <Tooltip cursor={{ fill: tok("--grafik-garis", "#E0E0E0"), opacity: 0.35 }}
                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                formatter={(v: any, nama: any) => [`${v} unit`, nama === "ev" ? "Electric" : "Konvensional"]} />
                            <Bar dataKey="ev" stackId="a" fill={AKSEN_TUA} radius={[0, 0, 0, 0]} name="Electric" />
                            <Bar dataKey="konv" stackId="a" fill={AKSEN} radius={[4, 4, 0, 0]} name="Konvensional" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border">
                    <CardHeader className="pb-3"><CardTitle className="text-[15px] font-semibold">Pemilik Unit</CardTitle></CardHeader>
                    <CardContent><Deret data={perOwner} maks={perOwner[0]?.[1] || 0} /></CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="pb-3"><CardTitle className="text-[15px] font-semibold">Merek &amp; Usia Armada</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Deret data={perMerk} maks={perMerk[0]?.[1] || 0} />
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Tahun pembuatan</p>
                            <Deret data={perTahun} maks={Math.max(0, ...perTahun.map((x) => x[1]))} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-[15px] font-semibold">Beban Komisioner</CardTitle>
                        <p className="text-[12px] text-muted-foreground">Siapa yang menandatangani komisioning unit-unit ini.</p>
                    </CardHeader>
                    <CardContent><Deret data={perKomisioner} maks={perKomisioner[0]?.[1] || 0} /></CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-[15px] font-semibold">AEBS &amp; Tipe Unit</CardTitle>
                        <p className="text-[12px] text-muted-foreground">Pemasok rem darurat otomatis dan varian bodi.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Deret data={perAebs} maks={perAebs[0]?.[1] || 0} />
                        <div>
                            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Tipe</p>
                            <Deret data={perTipe} maks={perTipe[0]?.[1] || 0} />
                        </div>
                    </CardContent>
                </Card>

                {/* Mutu data: pekerjaan yang menunggu, bukan sekadar catatan. */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-[15px] font-semibold">Mutu Data</CardTitle>
                        <p className="text-[12px] text-muted-foreground">Lubang isian yang akan menghambat saat perpanjangan massal.</p>
                    </CardHeader>
                    <CardContent>
                        {mutu.length === 0 ? (
                            <p className="py-6 text-center text-[13px] text-muted-foreground">Tidak ada lubang isian pada penyaring ini.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {mutu.map((m) => (
                                    <div key={m.label} className="flex items-start gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
                                        <span className="mt-0.5 w-9 flex-none text-right font-mono text-[15px] font-semibold tabular-nums text-primary">{m.n}</span>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-medium leading-tight text-foreground">{m.label}</p>
                                            <p className="text-[11px] leading-tight text-muted-foreground">{m.catatan}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Daftar unit perlu tindakan ── */}
            <Card className="border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                        {perluDaftar.length > 0 && <AlertTriangle className="h-4 w-4 text-primary" />}
                        Unit Perlu Tindakan Komisioning
                    </CardTitle>
                    <p className="text-[12px] text-muted-foreground">
                        Diambil dari kolom status yang diisi petugas, bukan dari selisih tanggal — tanggal BIB yang lewat
                        adalah hal wajar setelah komisioning selesai.
                    </p>
                </CardHeader>
                <CardContent>
                    {perluDaftar.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-muted-foreground">
                            Tidak ada unit berstatus expired atau near expired pada penyaring ini.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["No Lambung", "Merek", "Pemilik", "Expired BIB", "Status", "Expired TIA", "Kontak"].map((h) => (
                                            <th key={h} className="px-2 py-2 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {perluDaftar.map((u, i) => (
                                        <tr key={u.id || i} className="border-b border-border/60 last:border-0">
                                            <td className="px-2 py-2 font-medium text-foreground">{u.noLambung || "—"}</td>
                                            <td className="px-2 py-2 text-muted-foreground">{u.merk || "—"}</td>
                                            <td className="px-2 py-2 text-muted-foreground">{u.owner || "—"}</td>
                                            <td className="px-2 py-2 tabular-nums text-foreground">{tgl(u.expiredBib)}</td>
                                            <td className="px-2 py-2">
                                                <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                                    (u.statusBib || "").toUpperCase() === "EXPIRED"
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400")}>
                                                    {u.statusBib}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 tabular-nums text-muted-foreground">{tgl(u.expiredTia)}</td>
                                            <td className={cn("px-2 py-2", u.noKontak ? "text-muted-foreground" : "text-primary")}>
                                                {u.noKontak || "belum ada"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
