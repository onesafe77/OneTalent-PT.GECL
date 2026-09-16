import { useState, useEffect, useRef } from "react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, Title, Tooltip, Legend, LineController, BarController,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Settings, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import html2canvas from "html2canvas";
import { BULAN, TAHUN_AKTIF, angka, muatStatistik, StatistikBulan } from "@/lib/hse-statistik";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement,
    Title, Tooltip, Legend, ChartDataLabels, LineController, BarController);

/**
 * Statistik Keselamatan (PROMPT-HSE-OneTalent.md §5.1).
 *
 * Halaman ini HANYA MENAMPILKAN. Jumlah insiden datang dari Report Incident dan
 * jam kerja dari Pengaturan Man Hour — dua tempat itu yang boleh mengubah angka.
 * Sebelumnya halaman ini punya form man-hours dan kolom insiden sendiri, sehingga
 * ada dua sumber untuk angka yang sama dan keduanya saling menimpa.
 */

const METRIK = [
    { kunci: "tifr" as const, nomor: 1, judul: "TIFR", panjang: "Total Incident Frequency Rate",
      jelas: "Seluruh insiden dibagi jam kerja, kumulatif berjalan.", insiden: "insiden" as const, target: "tifr" as const },
    { kunci: "fatigue_fr" as const, nomor: 2, judul: "Fatigue FR", panjang: "Fatigue Frequency Rate",
      jelas: "Insiden berkategori khusus Kelelahan.", insiden: "insiden_fatigue" as const, target: "fatigue_fr" as const },
    { kunci: "cifr" as const, nomor: 3, judul: "CIFR", panjang: "Collision Incident Frequency Rate",
      jelas: "Insiden bermekanisme tabrak, senggol, atau rebah.", insiden: "insiden_kendaraan" as const, target: "cifr" as const },
];

const token = (nama: string, cadangan: string) => {
    if (typeof window === "undefined") return cadangan;
    return getComputedStyle(document.documentElement).getPropertyValue(nama).trim() || cadangan;
};

export default function StatistikKeselamatan() {
    const [tahun, setTahun] = useState(TAHUN_AKTIF);
    const [stat, setStat] = useState<StatistikBulan[]>([]);
    const [target, setTarget] = useState<any>(null);
    const [memuat, setMemuat] = useState(true);
    const [mengekspor, setMengekspor] = useState(false);
    const wadah = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMemuat(true);
        (async () => {
            const s = await muatStatistik(tahun);
            setStat(s);
            try {
                const r = await fetch(`/api/hse/manhours/${tahun}`);
                if (r.ok) setTarget((await r.json()).target);
            } catch { /* biarkan target kosong */ }
            setMemuat(false);
        })();
    }, [tahun]);

    const ekspor = async () => {
        if (!wadah.current) return;
        setMengekspor(true);
        try {
            const kanvas = await html2canvas(wadah.current, {
                scale: 2, useCORS: true,
                backgroundColor: token("--background", "#FFFFFF"),
            });
            const a = document.createElement("a");
            a.href = kanvas.toDataURL("image/jpeg", 0.95);
            a.download = `Statistik_Keselamatan_${tahun}.jpg`;
            a.click();
        } finally { setMengekspor(false); }
    };

    /** Bulan terakhir yang punya jam kerja. Bulan sesudahnya belum berjalan. */
    const bulanTerakhir = (() => {
        let t = -1;
        stat.forEach((b, i) => { if (Number(b.jam_bulan) > 0) t = i; });
        return t;
    })();

    const pilihanTahun = Array.from({ length: 6 }, (_, i) => TAHUN_AKTIF - i);

    return (
        <div ref={wadah} className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Statistik Keselamatan</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        Frequency rate dihitung kumulatif berjalan: insiden ÷ jam kerja × 1.000.000.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
                        <SelectTrigger className="h-9 w-[104px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{pilihanTahun.map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="outline" onClick={ekspor} disabled={mengekspor}>
                        {mengekspor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Unduh JPG
                    </Button>
                </div>
            </div>

            {/* Angka diubah di tempat asalnya, bukan di sini. */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
                <Settings className="h-4 w-4 flex-none" />
                <span>Jam kerja diatur di Pengaturan Man Hour; jumlah insiden dihitung dari Report Incident.</span>
                <Link href="/workspace/hse/manhours">
                    <span className="ml-auto inline-flex cursor-pointer items-center gap-1 font-medium text-foreground hover:underline">
                        Pengaturan Man Hour <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </Link>
            </div>

            {memuat && <p className="text-[14px] text-muted-foreground">Memuat…</p>}

            {!memuat && stat.length === 0 && (
                <Card className="rounded-xl border border-border bg-card">
                    <CardContent className="p-8 text-center text-[14px] text-muted-foreground">
                        Belum ada data untuk {tahun}. Isi jam kerja di Pengaturan Man Hour lebih dulu.
                    </CardContent>
                </Card>
            )}

            {!memuat && stat.length > 0 && METRIK.map((m) => {
                const nilaiTarget = Number(target?.[m.target]) || 0;
                const seri = stat.map((b) => (b[m.kunci] === null ? null : Number(b[m.kunci])));
                // §5.1 — bulan belum berjalan MENDATAR melanjutkan nilai terakhir,
                // bukan turun ke nol. Nol berarti "tidak ada insiden".
                let akhir: number | null = null;
                const seriGambar = seri.map((v, i) => {
                    if (i <= bulanTerakhir && v !== null) { akhir = v; return v; }
                    return akhir;
                });
                const insidenBulan = stat.map((b) => Number(b[m.insiden]) || 0);

                const cGaris = token("--grafik-garis", "#E0E0E0");
                const cLabel = token("--grafik-label", "#757575");
                const cTinta = token("--grafik-tinta", "#2A2A2A");
                const cMerah = token("--grafik-4", "#DF2A33");     // seri utama
                const cMerahMuda = token("--grafik-7", "#F1B0B4"); // batang pendukung
                const cMerahTua = token("--grafik-2", "#96161C");  // tepi batang

                return (
                    <Card key={m.kunci} className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-border p-5 xl:flex-row xl:items-center">
                            <div className="flex items-center gap-3">
                                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-border bg-muted font-mono text-[13px] text-muted-foreground">
                                    {m.nomor}
                                </span>
                                <div>
                                    <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">{m.judul}</h2>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{m.panjang}</p>
                                    <p className="mt-1 text-[13px] text-muted-foreground">{m.jelas}</p>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-5">
                            <div className="h-[320px]">
                                <Chart
                                    type="bar"
                                    data={{
                                        labels: BULAN,
                                        datasets: [
                                            { type: "bar" as const, label: "Insiden", data: insidenBulan,
                                              backgroundColor: cMerahMuda, borderColor: cMerahTua, borderWidth: 1,
                                              borderRadius: 4, yAxisID: "y", order: 3 },
                                            { type: "line" as const, label: m.judul, data: seriGambar as any,
                                              borderColor: cMerah, backgroundColor: cMerah, borderWidth: 2,
                                              pointRadius: 4, tension: 0.25, yAxisID: "y1", order: 1, spanGaps: true },
                                            ...(nilaiTarget > 0 ? [{
                                                type: "line" as const, label: "Target",
                                                data: Array(12).fill(nilaiTarget),
                                                borderColor: cMerahTua, borderDash: [6, 4], borderWidth: 2,
                                                pointRadius: 0, yAxisID: "y1", order: 2,
                                            }] : []),
                                        ],
                                    }}
                                    options={{
                                        responsive: true, maintainAspectRatio: false,
                                        interaction: { mode: "index", intersect: false },
                                        plugins: {
                                            legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "line", color: cLabel, boxWidth: 24, font: { size: 12 } } },
                                            tooltip: {
                                                backgroundColor: token("--card", "#FFFFFF"),
                                                titleColor: cTinta, bodyColor: cLabel, borderColor: cGaris, borderWidth: 1,
                                                padding: 12, cornerRadius: 8, displayColors: false,
                                                callbacks: {
                                                    // §5.1 — angka harus bisa ditelusuri: insiden bulan itu,
                                                    // kumulatif, jam bulan, jam kumulatif, dan rate-nya.
                                                    afterBody: (item: any[]) => {
                                                        const i = item[0]?.dataIndex ?? 0;
                                                        const b = stat[i]; if (!b) return "";
                                                        const jamKum = stat.slice(0, i + 1).reduce((a, x) => a + Number(x.jam_bulan), 0);
                                                        const insKum = insidenBulan.slice(0, i + 1).reduce((a, x) => a + x, 0);
                                                        return [
                                                            `Insiden bulan ini   : ${angka(insidenBulan[i])}`,
                                                            `Insiden kumulatif   : ${angka(insKum)}`,
                                                            `Jam kerja bulan ini : ${angka(Number(b.jam_bulan))}`,
                                                            `Jam kerja kumulatif : ${angka(jamKum)}`,
                                                        ];
                                                    },
                                                },
                                            },
                                            datalabels: {
                                                display: (ctx: any) => ctx.dataset.label !== "Target",
                                                anchor: (ctx: any) => (ctx.dataset.type === "line" ? "end" : "end"),
                                                align: "top", offset: 4,
                                                color: (ctx: any) => (ctx.dataset.type === "line" ? cMerah : cLabel),
                                                font: { size: 11, weight: 600 },
                                                formatter: (v: number, ctx: any) => {
                                                    if (v === null || v === undefined) return "";
                                                    if (ctx.dataset.type === "line")
                                                        return v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                    return v > 0 ? v.toLocaleString("id-ID") : "";
                                                },
                                            },
                                        },
                                        scales: {
                                            y: { beginAtZero: true, grace: "40%", position: "left",
                                                 grid: { color: cGaris }, ticks: { color: cLabel, precision: 0, font: { size: 12 } },
                                                 title: { display: true, text: "Jumlah insiden", color: cLabel, font: { size: 10 } } },
                                            y1: { beginAtZero: true, grace: "30%", position: "right",
                                                  grid: { display: false }, ticks: { color: cLabel, font: { size: 12 } },
                                                  title: { display: true, text: "Frequency rate", color: cLabel, font: { size: 10 } } },
                                            x: { grid: { display: false }, ticks: { color: cLabel, font: { size: 12 } } },
                                        },
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
