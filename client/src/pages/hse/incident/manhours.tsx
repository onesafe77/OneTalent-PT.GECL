import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Info, Wand2, Save, Loader2, Check } from "lucide-react";
import {
    BULAN, DATA_BAWAAN, DataStatistik, simpanData,
    hariBawaan, manHours, seriKumulatif, angka,
    JAM_PER_HARI_BAKU, FAKTOR_BAKU, muatDariServer, simpanKeServer,
    muatStatistik, StatistikBulan,
} from "@/lib/hse-statistik";

/** §5.5 — Pengaturan Statistik (Man-hours). Tempat seluruh angka modul ini bermula. */
export default function PengaturanManHour() {
    const { toast } = useToast();
    const [d, setD] = useState<DataStatistik>(DATA_BAWAAN);
    const tahun = new Date().getFullYear();

    const [status, setStatus] = useState<"diam" | "menyimpan" | "tersimpan">("diam");
    const [kotor, setKotor] = useState(false);

    const [stat, setStat] = useState<StatistikBulan[]>([]);
    const muatUlang = () => {
        muatDariServer(tahun).then(setD);
        muatStatistik(tahun).then(setStat);
    };
    useEffect(muatUlang, [tahun]);
    const statBulan = (i: number) => stat.find((x) => Number(x.bulan) === i + 1);

    const ubah = (patch: Partial<DataStatistik>) => {
        const baru = { ...d, ...patch };
        setD(baru);
        simpanData(baru);      // cadangan lokal bila belum sempat disimpan
        setKotor(true);
        setStatus("diam");
    };

    const simpan = async () => {
        setStatus("menyimpan");
        try {
            const j = await simpanKeServer(d, tahun);
            await muatStatistik(tahun).then(setStat);   // rate ikut berubah bila jam kerja diubah
            setStatus("tersimpan"); setKotor(false);
            toast({
                title: "Tersimpan",
                description: `${j.tersimpan} bulan tersimpan untuk tahun ${tahun}. Bulan kosong tidak disimpan sebagai nol.`,
            });
        } catch {
            setStatus("diam");
            toast({ title: "Gagal menyimpan", description: "Perubahan masih tersimpan di peramban ini.", variant: "destructive" });
        }
    };

    const isiMassal = () => {
        const manpower = [...d.manpower];
        const days_in_month = [...d.days_in_month];
        let terisi = 0;
        for (let i = 0; i < 12; i++) {
            // Hanya mengisi yang MASIH KOSONG — tidak menimpa (§5.5).
            if (!manpower[i]) { manpower[i] = manpower.find((v) => v > 0) || 0; if (manpower[i]) terisi++; }
            if (!days_in_month[i]) days_in_month[i] = hariBawaan(tahun, i + 1);
        }
        ubah({ manpower, days_in_month });
        toast({ title: "Pengisian massal", description: `${terisi} bulan kosong diisi. Bulan yang sudah berisi tidak diubah.` });
    };

    const tifr = seriKumulatif(d, d.ti_incidents);
    const totalMH = Array.from({ length: 12 }, (_, i) => manHours(d, i)).reduce((a, b) => a + b, 0);

    const Sel = ({ children, kanan = false }: any) => (
        <td className={`border-b border-border px-3 py-1.5 ${kanan ? "text-right tabular-nums" : ""}`}>{children}</td>
    );

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Pengaturan Man Hour</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        Man Hours = manpower × hari kerja × jam per hari × faktor. Tahun {tahun}.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {status === "tersimpan" && !kotor && (
                        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
                            <Check className="h-3.5 w-3.5" /> Tersimpan
                        </span>
                    )}
                    {kotor && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                            Belum disimpan
                        </span>
                    )}
                    <Button onClick={simpan} disabled={status === "menyimpan"}>
                        {status === "menyimpan"
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <Save className="mr-2 h-4 w-4" />}
                        Simpan
                    </Button>
                </div>
            </div>

            {/* §5.5 — keterangan wajib, karena tiga hal ini tidak terlihat dari tabelnya */}
            <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-[13px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 flex-none" />
                <p>
                    Kolom <strong className="text-foreground">MH</strong> terkunci dan terhitung sendiri begitu manpower,
                    hari kerja, dan jam/hari terisi. Bulan yang dikosongkan dianggap
                    <strong className="text-foreground"> belum berjalan</strong>, bukan nol jam — nol jam membuat rate menjadi tak hingga.
                    Bulan berjalan diisi jumlah hari yang <strong className="text-foreground">sudah lewat</strong>, bukan sebulan penuh.
                </p>
            </div>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-0">
                    <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
                        <label className="flex flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Jam / hari</span>
                            <Input type="number" step="0.5" className="h-9 w-28" value={d.hours_per_day}
                                onChange={(e) => ubah({ hours_per_day: parseFloat(e.target.value) || 0 })} />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Faktor</span>
                            <Input type="number" step="0.01" className="h-9 w-28" value={d.factor_mh}
                                onChange={(e) => ubah({ factor_mh: parseFloat(e.target.value) || 0 })} />
                        </label>
                        <Button variant="outline" className="h-9" onClick={isiMassal}>
                            <Wand2 className="mr-2 h-4 w-4" /> Isi bulan yang kosong
                        </Button>
                        {d.hours_per_day !== JAM_PER_HARI_BAKU && (
                            <p className="ml-auto max-w-[420px] text-[12px] text-amber-700 dark:text-amber-400">
                                Acuan lapangan {JAM_PER_HARI_BAKU} jam/hari. Nilai {angka(d.hours_per_day, 1)} membuat pembagi
                                berbeda {angka(((d.hours_per_day / JAM_PER_HARI_BAKU) - 1) * 100, 1)}% — rate ikut bergeser.
                            </p>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead className="bg-muted">
                                <tr className="[&>th]:border-b [&>th]:border-border [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left
                                    [&>th]:font-mono [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-[0.14em] [&>th]:text-muted-foreground">
                                    <th>Bulan</th><th>Manpower</th><th>Hari kerja</th>
                                    <th className="!text-right">MH bulan ini</th>
                                    <th className="!text-right">Insiden</th>
                                    <th className="!text-right">TIFR YTD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {BULAN.map((b, i) => {
                                    const mh = manHours(d, i);
                                    const berjalan = mh > 0;
                                    return (
                                        <tr key={b} className={berjalan ? "" : "text-muted-foreground"}>
                                            <Sel><span className="font-medium text-foreground">{b}</span></Sel>
                                            <Sel>
                                                <Input type="number" className="h-8 w-24" value={d.manpower[i] || ""}
                                                    onChange={(e) => ubahManpower(i, parseInt(e.target.value) || 0)} />
                                            </Sel>
                                            <Sel>
                                                <Input type="number" className="h-8 w-24" value={d.days_in_month[i] || ""}
                                                    onChange={(e) => {
                                                        const days = [...d.days_in_month];
                                                        days[i] = parseInt(e.target.value) || 0;
                                                        ubah({ days_in_month: days });
                                                    }} />
                                            </Sel>
                                            <Sel kanan>
                                                {berjalan
                                                    ? <span className="font-medium text-foreground">{angka(mh)}</span>
                                                    : <span title="Belum berjalan — bukan nol jam">belum berjalan</span>}
                                            </Sel>
                                            {/* §3 — insiden DIHITUNG dari Report Incident, tidak diketik.
                                                Dua sumber angka membuat halaman ini dan Statistik saling
                                                menimpa; itu penyebab angka terlihat tidak nyambung. */}
                                            <Sel kanan>
                                                <span className="font-medium text-foreground">
                                                    {angka(statBulan(i)?.insiden ?? 0)}
                                                </span>
                                                {(statBulan(i)?.insiden_manual ?? 0) > 0 &&
                                                    (statBulan(i)?.insiden_manual ?? 0) !== (statBulan(i)?.insiden ?? 0) && (
                                                    <span className="ml-1.5 font-mono text-[10px] text-amber-700 dark:text-amber-400"
                                                        title="Angka lama yang diketik manual, belum ada catatan insidennya">
                                                        (manual {statBulan(i)?.insiden_manual})
                                                    </span>
                                                )}
                                            </Sel>
                                            <Sel kanan>{statBulan(i)?.tifr ? angka(Number(statBulan(i)!.tifr), 2) : "–"}</Sel>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-muted/60">
                                    <Sel><span className="font-mono text-[10px] uppercase tracking-[0.14em]">Total</span></Sel>
                                    <Sel /><Sel />
                                    <Sel kanan><span className="font-semibold text-foreground">{angka(totalMH)}</span></Sel>
                                    <Sel kanan><span className="font-semibold text-foreground">{angka(stat.reduce((a, b) => a + (b.insiden || 0), 0))}</span></Sel>
                                    <Sel />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* §5.5 — baris target tahunan */}
            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex flex-wrap items-end gap-4 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Target tahunan</span>
                    {([["TIFR", "tr_value"], ["Fatigue FR", "tr_fatigue"], ["CIFR", "tr_cifr"]] as const).map(([label, kunci]) => (
                        <label key={kunci} className="flex flex-col gap-1">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                            <Input type="number" step="0.01" className="h-9 w-28"
                                value={(d as any)[kunci] ?? 0}
                                onChange={(e) => ubah({ [kunci]: parseFloat(e.target.value) || 0 } as any)} />
                        </label>
                    ))}
                    <p className="ml-auto text-[12px] text-muted-foreground">Target adalah batas atas — makin rendah makin baik.</p>
                </CardContent>
            </Card>
        </div>
    );
}
