import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { angka } from "@/lib/hse-statistik";

/** §1.2 — bab bernarasi, bukan grid tak berujung. */
export function Bab({ nomor, judul, pengantar, children }: {
    nomor: number; judul: string; pengantar: string; children: ReactNode;
}) {
    return (
        <section className="space-y-3">
            <div>
                <h2 className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em] text-foreground">
                    <span className="grid h-6 w-6 place-items-center rounded-md border border-border bg-muted font-mono text-[11px] text-muted-foreground">
                        {nomor}
                    </span>
                    {judul}
                </h2>
                <p className="mt-1 pl-[34px] text-[13px] text-muted-foreground">{pengantar}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
        </section>
    );
}

/** Judul berupa pertanyaan (§1.1) + catatan cara membaca. */
export function Kartu({ judul, catatan, lebar, children }: {
    judul: string; catatan?: string; lebar?: boolean; children: ReactNode;
}) {
    return (
        <Card className={`rounded-xl border border-border bg-card ${lebar ? "lg:col-span-2" : ""}`}>
            <CardContent className="p-5">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-[14px] font-medium text-foreground">{judul}</h3>
                    {catatan && <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{catatan}</p>}
                </div>
                {children}
            </CardContent>
        </Card>
    );
}

export function Kosong({ pesan = "Belum ada data untuk saringan ini." }) {
    return <p className="py-6 text-center text-[13px] text-muted-foreground">{pesan}</p>;
}

/** §1.5 — BERJENJANG: urut jenjangnya, seluruh label walau nol. */
export function Tegak({ label, nilai, onKlik, aktif }: {
    label: string[]; nilai: number[]; onKlik?: (l: string) => void; aktif?: string;
}) {
    const maks = Math.max(1, ...nilai);
    return (
        <div className="flex items-end gap-[3px] overflow-x-auto" style={{ height: 168 }}>
            {label.map((l, i) => (
                <button key={l} type="button" onClick={() => onKlik?.(l)} disabled={!onKlik}
                    className={`flex min-w-[22px] flex-1 flex-col items-center justify-end gap-1 rounded-sm ${onKlik ? "cursor-pointer hover:bg-muted" : ""}`}>
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{nilai[i] || ""}</span>
                    <div className={`w-full rounded-t-[3px] transition-colors ${aktif === l ? "bg-primary" : "bg-primary/75"}`}
                        style={{ height: `${(nilai[i] / maks) * 120}px`, minHeight: nilai[i] > 0 ? 2 : 0 }} />
                    <span className="max-w-[46px] truncate text-[9px] text-muted-foreground" title={l}>{l}</span>
                </button>
            ))}
        </div>
    );
}

/** §1.5 — BEBAS: mendatar, urut terbanyak, dibatasi & disebutkan (§1.7). */
export function Mendatar({ data, batas = 10, onKlik, aktif }: {
    data: Record<string, number>; batas?: number; onKlik?: (k: string) => void; aktif?: string;
}) {
    const isi = Object.entries(data).filter(([k]) => k && k !== "(kosong)").sort((a, b) => b[1] - a[1]);
    if (!isi.length) return <Kosong />;
    const tampil = isi.slice(0, batas);
    const maks = Math.max(1, ...tampil.map(([, v]) => v));
    const total = isi.reduce((a, [, v]) => a + v, 0);
    return (
        <div className="space-y-2.5">
            {tampil.map(([k, v]) => (
                <button key={k} type="button" onClick={() => onKlik?.(k)} disabled={!onKlik}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-md text-left ${onKlik ? "cursor-pointer hover:bg-muted" : ""}`}>
                    <div className="min-w-0">
                        <p className="mb-1 truncate text-[12px] text-foreground" title={k}>{k}</p>
                        <div className={`h-[6px] rounded-full ${aktif === k ? "bg-primary" : "bg-primary/75"}`}
                            style={{ width: `${(v / maks) * 100}%` }} />
                    </div>
                    <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground">
                        {angka(v)} <span className="opacity-70">({Math.round((v / total) * 100)}%)</span>
                    </span>
                </button>
            ))}
            {isi.length > batas && (
                <p className="pt-1 text-[11px] text-muted-foreground">
                    {batas} teratas dari {angka(isi.length)} kategori · {angka(isi.length - batas)} lainnya tidak ditampilkan.
                </p>
            )}
        </div>
    );
}

export function Legenda({ isi }: { isi: { n: string; c: string }[] }) {
    return (
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            {isi.map((x) => <span key={x.n} className="flex items-center gap-1.5"><i className={`h-[6px] w-4 rounded-full ${x.c}`} />{x.n}</span>)}
        </div>
    );
}

/** Dua deret berdampingan (§1.3). */
export function DuaDeret({ label, a, b, namaA, namaB, sampai }: {
    label: string[]; a: number[]; b: number[]; namaA: string; namaB: string; sampai?: number;
}) {
    const maks = Math.max(1, ...a, ...b);
    return (
        <>
            <div className="flex items-end gap-1.5" style={{ height: 168 }}>
                {label.map((l, i) => {
                    // §1.6 — bulan belum berjalan tidak digambar sebagai nol.
                    const belum = sampai !== undefined && i > sampai;
                    return (
                        <div key={l} className="flex flex-1 flex-col items-center justify-end gap-1">
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{belum ? "" : a[i] || ""}</span>
                            <div className="flex w-full items-end justify-center gap-[2px]" style={{ height: 122 }}>
                                {!belum && <div className="w-1/2 rounded-t-[3px] bg-primary" style={{ height: `${(a[i] / maks) * 100}%` }} title={`${namaA}: ${a[i]}`} />}
                                <div className="w-1/2 rounded-t-[3px] bg-primary/30" style={{ height: `${(b[i] / maks) * 100}%` }} title={`${namaB}: ${b[i]}`} />
                            </div>
                            <span className="text-[9px] text-muted-foreground">{l}</span>
                        </div>
                    );
                })}
            </div>
            <Legenda isi={[{ n: namaA, c: "bg-primary" }, { n: namaB, c: "bg-primary/30" }]} />
        </>
    );
}

/** Batang + garis dua sumbu — jumlah vs keparahan (§4 Bab 1). */
export function BatangGaris({ label, batang, garis, namaBatang, namaGaris }: {
    label: string[]; batang: number[]; garis: (number | null)[]; namaBatang: string; namaGaris: string;
}) {
    const maksB = Math.max(1, ...batang);
    const maksG = Math.max(1, ...garis.map((g) => g ?? 0));
    const jalur = garis.map((g, i) => g === null ? null : `${((i + 0.5) / label.length) * 100},${100 - (g / maksG) * 90}`)
        .filter(Boolean).map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
    return (
        <>
            <div className="relative" style={{ height: 176 }}>
                <div className="absolute inset-0 flex items-end gap-1.5">
                    {label.map((l, i) => (
                        <div key={l} className="flex flex-1 flex-col items-center justify-end gap-1">
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{batang[i] || ""}</span>
                            <div className="w-full rounded-t-[3px] bg-primary/30" style={{ height: `${(batang[i] / maksB) * 112}px` }}
                                title={`${namaBatang}: ${batang[i]}`} />
                            <span className="text-[9px] text-muted-foreground">{l}</span>
                        </div>
                    ))}
                </div>
                <svg className="pointer-events-none absolute inset-x-0 top-2" style={{ height: 118 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d={jalur} fill="none" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="text-primary" />
                </svg>
            </div>
            <Legenda isi={[{ n: namaBatang, c: "bg-primary/30" }, { n: namaGaris, c: "bg-primary" }]} />
        </>
    );
}

/** §4 Bab 2 — peta panas hari × jam. Gugusan kelelahan hanya terlihat di sini. */
export function PetaPanas({ data }: { data: { hari: string; jam: number[] }[] }) {
    const maks = Math.max(1, ...data.flatMap((d) => d.jam));
    return (
        <div className="overflow-x-auto">
            <div className="min-w-[560px]">
                <div className="mb-1 grid" style={{ gridTemplateColumns: "48px repeat(24, 1fr)" }}>
                    <span />
                    {Array.from({ length: 24 }, (_, j) => (
                        <span key={j} className="text-center font-mono text-[9px] text-muted-foreground">{j % 3 === 0 ? j : ""}</span>
                    ))}
                </div>
                {data.map((d) => (
                    <div key={d.hari} className="mb-[2px] grid items-center" style={{ gridTemplateColumns: "48px repeat(24, 1fr)" }}>
                        <span className="pr-2 text-right text-[11px] text-muted-foreground">{d.hari.slice(0, 3)}</span>
                        {d.jam.map((v, j) => (
                            <div key={j} className="mx-[1px] h-[18px] rounded-[2px] border border-border/60"
                                style={{ backgroundColor: v ? `hsl(var(--primary) / ${(0.15 + (v / maks) * 0.85).toFixed(3)})` : "transparent" }}
                                title={`${d.hari} pukul ${String(j).padStart(2, "0")}.00 — ${v} pelanggaran`} />
                        ))}
                    </div>
                ))}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>0</span>
                    <div className="h-[6px] w-24 rounded-full bg-primary" style={{ opacity: 0.5 }} />
                    <span>{angka(maks)} pelanggaran</span>
                </div>
            </div>
        </div>
    );
}

/** §4 Bab 4 — Pareto: batang jumlah + garis kumulatif persen + garis 80%. */
export function Pareto({ data }: { data: any[] }) {
    if (!data.length) return <Kosong />;
    const maks = Math.max(1, ...data.map((d) => d.total));
    return (
        <>
            <div className="relative" style={{ height: 190 }}>
                <div className="absolute inset-0 flex items-end gap-1">
                    {data.map((d) => (
                        <div key={d.nik || d.nama} className="flex flex-1 flex-col items-center justify-end gap-1">
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{d.total}</span>
                            <div className="w-full rounded-t-[3px] bg-primary/30" style={{ height: `${(d.total / maks) * 108}px` }}
                                title={`${d.nama || d.nik}: ${d.total} · kumulatif ${d.kumulatifPersen}%`} />
                            <span className="w-full truncate text-center text-[8px] text-muted-foreground" title={`${d.nik} ${d.nama}`}>
                                {(d.nama || d.nik || "–").split(" ")[0]}
                            </span>
                        </div>
                    ))}
                </div>
                <svg className="pointer-events-none absolute inset-x-0 top-2" style={{ height: 120 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 2"
                        vectorEffect="non-scaling-stroke" className="text-red-500" />
                    <path d={data.map((d, i) => `${i === 0 ? "M" : "L"}${((i + 0.5) / data.length) * 100},${100 - d.kumulatifPersen}`).join(" ")}
                        fill="none" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke" className="text-primary" />
                </svg>
            </div>
            <Legenda isi={[{ n: "Jumlah", c: "bg-primary/30" }, { n: "Kumulatif %", c: "bg-primary" }, { n: "Ambang 80%", c: "bg-red-500" }]} />
        </>
    );
}

/** Batang bertumpuk untuk persilangan dua kategori. */
export function Bertumpuk({ data, batas = 5 }: { data: Record<string, Record<string, number>>; batas?: number }) {
    const baris = Object.entries(data);
    if (!baris.length) return <Kosong />;
    const jenis = [...new Set(baris.flatMap(([, v]) => Object.keys(v)))].slice(0, batas);
    const nada = ["bg-primary", "bg-primary/60", "bg-primary/35", "bg-primary/20", "bg-primary/10"];
    const maks = Math.max(1, ...baris.map(([, v]) => Object.values(v).reduce((a, b) => a + b, 0)));
    return (
        <>
            <div className="space-y-3">
                {baris.map(([k, v]) => {
                    const total = Object.values(v).reduce((a, b) => a + b, 0);
                    return (
                        <div key={k}>
                            <div className="mb-1 flex justify-between text-[12px]">
                                <span className="text-foreground">{k}</span>
                                <span className="font-mono tabular-nums text-muted-foreground">{angka(total)}</span>
                            </div>
                            <div className="flex h-[8px] overflow-hidden rounded-full" style={{ width: `${(total / maks) * 100}%` }}>
                                {jenis.map((j, i) => v[j] ? <div key={j} className={nada[i % nada.length]}
                                    style={{ width: `${(v[j] / total) * 100}%` }} title={`${j}: ${v[j]}`} /> : null)}
                            </div>
                        </div>
                    );
                })}
            </div>
            <Legenda isi={jenis.map((j, i) => ({ n: j, c: nada[i % nada.length] }))} />
        </>
    );
}
