import { useQuery } from "@tanstack/react-query";
import { fotoKecil } from "@/lib/utils";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { angka } from "@/lib/hse-statistik";
import { Bab, Kartu, Mendatar, Tegak, Kosong } from "@/components/fms/grafik";

/**
 * Rincian rekam jejak satu karyawan — halaman penuh, bukan popup.
 * Halaman penuh dipilih supaya bisa ditautkan, dibuka di tab baru, dan
 * dicetak; rincian yang panjang tidak nyaman di dalam dialog.
 */

const KOSONG = <span className="text-muted-foreground">—</span>;
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

const inisial = (n: string) =>
    (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function RekamJejakDetail() {
    const [, params] = useRoute("/workspace/hse/rekam-jejak/:nik");
    const nik = params?.nik ?? "";
    const { data, isLoading, error } = useQuery<any>({ queryKey: [`/api/hse/rekam-jejak/${nik}`], retry: false });

    const k = data?.karyawan;
    const r = data?.ringkas ?? {};
    const baris = data?.baris ?? [];

    const kembali = (
        <Link href="/workspace/hse/rekam-jejak">
            <Button variant="ghost" size="sm" className="-ml-2 h-8">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Rekam Jejak Karyawan
            </Button>
        </Link>
    );

    if (isLoading) {
        return (
            <div className="space-y-6 p-6 md:p-8">
                {kembali}
                <div className="flex items-center gap-2 py-16 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat rincian…
                </div>
            </div>
        );
    }

    if (error || !k) {
        return (
            <div className="space-y-6 p-6 md:p-8">
                {kembali}
                <Card className="rounded-xl border border-border bg-card">
                    <CardContent className="p-10 text-center">
                        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-3 text-[15px] font-medium text-foreground">Karyawan tidak ditemukan</p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                            NIK <span className="font-mono">{nik}</span> tidak ada di daftar karyawan.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const tahun = Object.keys(r.perTahun ?? {}).sort();

    return (
        <div className="space-y-6 p-6 md:p-8">
            {kembali}

            {/* Kepala: foto + identitas */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 flex-none rounded-2xl border border-border">
                    <AvatarImage src={fotoKecil(k.foto, 192)} alt={k.nama} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-muted text-[20px] font-medium text-muted-foreground">
                        {inisial(k.nama)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                        {k.nama || "—"}
                    </h1>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
                        <span className="font-mono">{k.nik}</span>
                        <span>·</span><span>{k.jabatan || "—"}</span>
                        <span>·</span><span>{k.departemen || "—"}</span>
                        {k.nomorLambung && <><span>·</span><span>Lambung {k.nomorLambung}</span></>}
                        <Badge variant="outline" className="border-border">{k.statusKaryawan || "—"}</Badge>
                    </p>
                </div>
            </div>

            {(r.namaSheetBerbeda ?? []).length > 0 && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <span>
                        Di sheet pelanggaran, NIK ini tertulis sebagai <strong>{r.namaSheetBerbeda.join(", ")}</strong> —
                        berbeda dari manpower (<strong>{k.nama}</strong>). Pencocokan memakai NIK, jadi datanya tetap benar,
                        tapi penulisan nama di sheet layak dirapikan.
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { l: "Total pelanggaran", v: angka(r.total ?? 0), ket: "FMS + Safe Distance, GEC/GECL" },
                    { l: "FMS / Jarak aman", v: `${angka(r.perSumber?.FMS ?? 0)} / ${angka(r.perSumber?.["Safe Distance"] ?? 0)}`, ket: "pembagian per sumber" },
                    { l: "Sanksi masih berlaku", v: angka(r.sanksiAktif ?? 0), ket: "belum lewat masa pemutihan" },
                    { l: "Belum selesai", v: angka(r.belumSelesai ?? 0), ket: "status bukan Closed" },
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

            {baris.length === 0 ? (
                <Card className="rounded-xl border border-border bg-card">
                    <CardContent className="p-10 text-center text-[14px] text-muted-foreground">
                        Tidak ada pelanggaran FMS maupun Safe Distance atas nama karyawan ini.
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Bab nomor={1} judul="Ringkasan" pengantar="Sebaran pelanggaran karyawan ini menurut waktu, jenis, dan sanksi.">
                        <Kartu judul="Bagaimana per tahun?" catatan="urut tahun, bukan urut jumlah">
                            {tahun.length ? <Tegak label={tahun} nilai={tahun.map((t) => r.perTahun[t])} /> : <Kosong />}
                        </Kartu>
                        <Kartu judul="Jenis apa yang dilanggar?" catatan="seluruh jenis ditampilkan">
                            <Mendatar data={r.perJenis ?? {}} batas={8} />
                        </Kartu>
                        <Kartu judul="Sanksi apa yang pernah dijatuhkan?" catatan="sesuai matriks pelanggaran" lebar>
                            <Mendatar data={r.perSanksi ?? {}} batas={8} />
                        </Kartu>
                    </Bab>

                    <Card className="rounded-xl border border-border bg-card">
                        <CardContent className="p-0">
                            <div className="border-b border-border px-5 py-4">
                                <h2 className="text-[15px] font-medium text-foreground">Seluruh pelanggaran</h2>
                                <p className="mt-0.5 text-[13px] text-muted-foreground">
                                    {angka(baris.length)} kejadian, terbaru di atas
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead><TableHead>Sumber</TableHead>
                                            <TableHead>Pelanggaran</TableHead>
                                            <TableHead className="text-right">Ukuran</TableHead>
                                            <TableHead>Lokasi</TableHead><TableHead>Jalur</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead>Sanksi</TableHead><TableHead>Berlaku s.d.</TableHead>
                                            <TableHead className="pr-4">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {baris.map((x: any) => (
                                            <TableRow key={x.kunci}>
                                                <TableCell className="whitespace-nowrap tabular-nums">
                                                    {tgl(x.tanggal) ?? KOSONG}
                                                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{x.jam?.slice(0, 5)}</span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">{x.sumber}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {x.pelanggaran || KOSONG}
                                                    {x.kodePelanggaran && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{x.kodePelanggaran}</span>}
                                                </TableCell>
                                                {/* Dua sumber, dua satuan: FMS km/jam, Safe Distance detik. */}
                                                <TableCell className="whitespace-nowrap text-right tabular-nums">
                                                    {x.detik !== null ? `${x.detik.toFixed(2)} dtk`
                                                        : x.kecepatan !== null ? <>{angka(x.kecepatan)}<span className="text-muted-foreground"> / {angka(x.batas)}</span></>
                                                            : KOSONG}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">{x.lokasiKm ? `KM ${x.lokasiKm}` : KOSONG}</TableCell>
                                                <TableCell className="whitespace-nowrap">{x.jalur || KOSONG}</TableCell>
                                                <TableCell className="whitespace-nowrap">{x.unit || KOSONG}</TableCell>
                                                <TableCell className="whitespace-nowrap"><BadgeSanksi s={x.sanksi} /></TableCell>
                                                <TableCell className="whitespace-nowrap tabular-nums">{tgl(x.masaBerlakuSanksi) ?? KOSONG}</TableCell>
                                                <TableCell className="whitespace-nowrap pr-4">
                                                    {x.status === "Closed" ? (
                                                        <Badge className="border-border bg-muted text-foreground">Closed</Badge>
                                                    ) : x.status ? (
                                                        <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400">{x.status}</Badge>
                                                    ) : KOSONG}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                Cakupan halaman ini hanya baris berperusahaan GEC/GECL. Riwayat orang ini di kontraktor lain,
                bila ada, terlihat di halaman Riwayat Pelanggaran (Semua Kontraktor).
            </div>
        </div>
    );
}
