import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { angka, TAHUN_AKTIF, BULAN } from "@/lib/hse-statistik";

/** §5.2 — setiap grafik membandingkan dua tahun. Potret satu tahun tidak
 *  memberi tahu apakah keadaan membaik. */

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const KLASIFIKASI = ["NM", "PD", "FAI", "MTI", "LTI", "Fatal"];      // ringan -> berat
const USIA = ["17-20", "21-25", "26-30", "31-35", "36-40", "41-45", "46-50", "51-55", "55 Up"];
const MASA = ["0-3 bulan", "3-6 bulan", "6-12 bulan", "1-2 Tahun", "2-5 Tahun", "5-7 Tahun", "7-10 Tahun", "10 Tahun Up"];
const JAM = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}.01 - ${String((h + 1) % 24).padStart(2, "0")}.00`);

/** Kategori BERJENJANG: urut jenjangnya, tampilkan seluruh label walau nol —
 *  supaya lubang distribusinya terlihat (§5.2). */
function Berjenjang({ judul, label, baris, t1, t2 }: any) {
    const ambil = (th: number, l: string) =>
        baris.filter((b: any) => Number(b.tahun) === th && String(b.nilai) === String(l))
            .reduce((a: number, b: any) => a + b.jumlah, 0);
    const data = label.map((l: string) => ({ l, a: ambil(t1, l), b: ambil(t2, l) }));
    const maks = Math.max(1, ...data.map((d: any) => Math.max(d.a, d.b)));
    return (
        <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{judul}</h3>
                <div className="mt-4 flex items-end gap-1 overflow-x-auto" style={{ height: 150 }}>
                    {data.map((d: any) => (
                        <div key={d.l} className="flex min-w-[26px] flex-1 flex-col items-center justify-end gap-1">
                            <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: 110 }}>
                                <div className="w-1/2 rounded-t-[3px] bg-primary transition-all"
                                    style={{ height: `${(d.a / maks) * 100}%` }} title={`${t1}: ${d.a}`} />
                                <div className="w-1/2 rounded-t-[3px] bg-border transition-all"
                                    style={{ height: `${(d.b / maks) * 100}%` }} title={`${t2}: ${d.b}`} />
                            </div>
                            <span className="whitespace-nowrap text-[9px] tabular-nums text-muted-foreground">{d.a || ""}</span>
                            <span className="max-w-[52px] truncate text-[9px] text-muted-foreground" title={d.l}>{d.l}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/** Kategori BEBAS: batang mendatar urut terbanyak, dibatasi 10 — namanya panjang.
 *  §8 melarang memotong diam-diam, jadi sisanya disebutkan. */
function Bebas({ judul, baris, t1, t2, batas = 10 }: any) {
    const kunci = Array.from(new Set(baris.map((b: any) => String(b.nilai))));
    const data = kunci.map((k) => ({
        l: k,
        a: baris.filter((b: any) => Number(b.tahun) === t1 && String(b.nilai) === k).reduce((s: number, b: any) => s + b.jumlah, 0),
        b: baris.filter((b: any) => Number(b.tahun) === t2 && String(b.nilai) === k).reduce((s: number, b: any) => s + b.jumlah, 0),
    })).sort((x, y) => (y.a + y.b) - (x.a + x.b));
    const tampil = data.slice(0, batas);
    const maks = Math.max(1, ...tampil.map((d) => Math.max(d.a, d.b)));
    return (
        <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{judul}</h3>
                {tampil.length === 0 ? (
                    <p className="mt-4 text-[13px] text-muted-foreground">Belum ada data.</p>
                ) : (
                    <div className="mt-4 space-y-2">
                        {tampil.map((d) => (
                            <div key={d.l} className="grid grid-cols-[1fr_auto] items-center gap-3">
                                <div>
                                    <p className="mb-1 truncate text-[12px] text-foreground" title={d.l}>{d.l}</p>
                                    <div className="space-y-[3px]">
                                        <div className="h-[6px] rounded-full bg-primary" style={{ width: `${(d.a / maks) * 100}%` }} />
                                        <div className="h-[6px] rounded-full bg-border" style={{ width: `${(d.b / maks) * 100}%` }} />
                                    </div>
                                </div>
                                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{d.a} / {d.b}</span>
                            </div>
                        ))}
                    </div>
                )}
                {data.length > batas && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        {data.length - batas} kategori lain tidak ditampilkan.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default function DetailIncident() {
    const [tahun, setTahun] = useState(TAHUN_AKTIF);
    const [pembanding, setPembanding] = useState(TAHUN_AKTIF - 1);
    const [area, setArea] = useState("all");

    const { data: master } = useQuery<any>({ queryKey: ["/api/hse/master"] });
    const { data, isLoading } = useQuery<any>({
        queryKey: [`/api/hse/insiden-analisis?tahun=${tahun}&pembanding=${pembanding}&area=${area}`],
    });

    const g = data?.grafik ?? {};
    const ringkas = (th: number) => (data?.ringkas ?? []).find((r: any) => Number(r.tahun) === th) ?? {};
    const r1 = ringkas(tahun), r2 = ringkas(pembanding);
    const pilihanTahun = Array.from({ length: 6 }, (_, i) => TAHUN_AKTIF - i);

    const penyebabJenis = (jenis: string) =>
        (data?.penyebab ?? []).filter((p: any) => p.jenis === jenis)
            .map((p: any) => ({ tahun: p.tahun, nilai: p.uraian, jumlah: p.jumlah }));

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Detail Incident</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        Setiap grafik membandingkan {tahun} (pekat) dengan {pembanding} (redup).
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
                        <SelectTrigger className="h-9 w-[104px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{pilihanTahun.map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(pembanding)} onValueChange={(v) => setPembanding(Number(v))}>
                        <SelectTrigger className="h-9 w-[104px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{pilihanTahun.map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={area} onValueChange={setArea}>
                        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua area</SelectItem>
                            {(master?.area ?? []).map((a: any) => <SelectItem key={a.nilai} value={a.nilai}>{a.nilai}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* §5.2 — tiga kartu angka */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                    { l: "Insiden", a: r1.insiden ?? 0, b: r2.insiden ?? 0 },
                    { l: "Lost cost (Rp)", a: Number(r1.lost_cost) || 0, b: Number(r2.lost_cost) || 0 },
                    { l: "Temuan penyebab", a: r1.penyebab ?? 0, b: r2.penyebab ?? 0 },
                    { l: "Rekomendasi", a: r1.rekomendasi ?? 0, b: r2.rekomendasi ?? 0 },
                ].map((k) => (
                    <Card key={k.l} className="rounded-xl border border-border bg-card">
                        <CardContent className="p-5">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k.l}</p>
                            <p className="mt-2.5 text-[28px] font-semibold leading-none tabular-nums text-foreground">{angka(k.a)}</p>
                            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                {pembanding}: {angka(k.b)}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isLoading && <p className="text-[14px] text-muted-foreground">Memuat analisis…</p>}

            {(["Waktu kejadian", "Sifat insiden", "Tempat", "Orang dan alat", "Akar masalah"] as const).map((tema) => (
                <section key={tema} className="space-y-3">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tema}</h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {tema === "Waktu kejadian" && <>
                            <Berjenjang judul="Insiden per bulan" label={BULAN.map((_, i) => String(i + 1))} baris={g.bulan ?? []} t1={tahun} t2={pembanding} />
                            <Berjenjang judul="Minggu kejadian (pekan dalam bulan)" label={["1", "2", "3", "4", "5"]} baris={g.minggu_bulan ?? []} t1={tahun} t2={pembanding} />
                            <Berjenjang judul="Hari kejadian" label={HARI} baris={g.hari ?? []} t1={tahun} t2={pembanding} />
                            <Berjenjang judul="Jam kejadian" label={JAM} baris={g.jam ?? []} t1={tahun} t2={pembanding} />
                        </>}
                        {tema === "Sifat insiden" && <>
                            <Berjenjang judul="Klasifikasi (ringan → berat)" label={KLASIFIKASI} baris={g.klasifikasi ?? []} t1={tahun} t2={pembanding} />
                            <Bebas judul="Mekanisme insiden" baris={g.mekanisme ?? []} t1={tahun} t2={pembanding} />
                            <Bebas judul="Kategori khusus" baris={g.kategori_khusus ?? []} t1={tahun} t2={pembanding} />
                        </>}
                        {tema === "Tempat" && <>
                            <Bebas judul="Lokasi kejadian" baris={g.lokasi ?? []} t1={tahun} t2={pembanding} />
                            <Bebas judul="Sub lokasi" baris={g.sub_lokasi ?? []} t1={tahun} t2={pembanding} />
                        </>}
                        {tema === "Orang dan alat" && <>
                            <Bebas judul="Alat terlibat" baris={g.alat_terlibat ?? []} t1={tahun} t2={pembanding} />
                            <Bebas judul="Jabatan korban" baris={g.jabatan ?? []} t1={tahun} t2={pembanding} />
                            <Berjenjang judul="Rentang usia" label={USIA} baris={g.rentang_usia ?? []} t1={tahun} t2={pembanding} />
                            <Berjenjang judul="Masa kerja" label={MASA} baris={g.masa_kerja ?? []} t1={tahun} t2={pembanding} />
                        </>}
                        {tema === "Akar masalah" && (["TTA", "KTA", "PRIBADI", "PEKERJAAN"] as const).map((j) => (
                            <Bebas key={j} judul={`F. ${j}`} baris={penyebabJenis(j)} t1={tahun} t2={pembanding} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
