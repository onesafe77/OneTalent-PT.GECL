import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Loader2, Search, ShieldAlert, CheckCircle2, Users, Repeat, Ruler, ArrowRight, Stamp } from "lucide-react";
import { Link } from "wouter";
import { angka, BULAN } from "@/lib/hse-statistik";
import { Bab, Kartu, Tegak, Mendatar, DuaDeret, PetaPanas, Pareto, Bertumpuk, Kosong } from "@/components/fms/grafik";

/**
 * Dashboard Pelanggaran Safe Distance — GEC & GECL.
 * Data dibaca & dibakukan di server (server/lib/sd-sheet.ts).
 *
 * Sumbu yang SENGAJA tidak dibuatkan grafik: status, area, jenis kendaraan,
 * dan departemen. Di data kita nilainya tunggal (semua Closed / Hauling /
 * Truck / kosong), jadi grafiknya cuma satu batang — tidak memberi informasi.
 * Kalau suatu saat sumbernya beragam, angkanya tetap ada di ekspor Excel.
 */

const HARI_URUT = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const RENTANG_DETIK = ["< 1 detik", "1-2 detik", "2-3 detik", "3-5 detik", "≥ 5 detik"];
const EMBER_DURASI = ["0-1 hari", "2-3 hari", "4-7 hari", "8-14 hari", "> 14 hari"];

export default function DashboardSafeDistance() {
    const [tahun, setTahun] = useState("all");
    const [bulan, setBulan] = useState("all");
    const [jalur, setJalur] = useState("all");
    const [rentang, setRentang] = useState("all");
    const [cari, setCari] = useState("");

    const kunci = `/api/hse/sd-violations?tahun=${tahun}&bulan=${bulan}&jalur=${jalur}&rentang=${encodeURIComponent(rentang)}&cari=${encodeURIComponent(cari)}`;
    const { data, isLoading, refetch, isFetching } = useQuery<any>({ queryKey: [kunci] });

    const r = data?.ringkas ?? {};
    const p = data?.pilihan ?? {};
    const k = r.kpi ?? {};

    const naik = (k.pelanggaranIni ?? 0) > (k.pelanggaranLalu ?? 0);
    const adaPembanding = (k.pelanggaranLalu ?? 0) > 0;
    const angkaAtau = (v: any, d = 1) => (v === null || v === undefined ? "—" : angka(v, d));

    // Enam KPI, tiap kartu satu baris konteks. Warna hanya untuk yang bermakna.
    const KPI = [
        {
            l: "Pelanggaran", v: angka(k.pelanggaranIni ?? 0), Ikon: ShieldAlert,
            ket: adaPembanding ? `${k.tahunIni}: ${angka(k.pelanggaranIni)} vs ${k.tahunLalu}: ${angka(k.pelanggaranLalu)}` : "belum ada pembanding",
            warna: !adaPembanding ? "" : naik ? "text-red-600 dark:text-red-500" : "text-foreground",
        },
        {
            l: "Pengemudi", v: angka(k.pengemudi ?? 0), Ikon: Users,
            ket: `dari ${angka(data?.total ?? 0)} pelanggaran`, warna: "",
        },
        {
            l: "Pengulang", v: angka(k.pengulang ?? 0), Ikon: Repeat,
            ket: `menyumbang ${angkaAtau(k.persenDariPengulang)}% pelanggaran`,
            warna: (k.pengulang ?? 0) > 0 ? "text-amber-600 dark:text-amber-500" : "",
        },
        {
            l: "Rerata jarak aman", v: k.rerataDetik !== null && k.rerataDetik !== undefined ? `${angka(k.rerataDetik, 1)} dtk` : "—",
            Ikon: Ruler,
            ket: `terdekat ${k.detikTerdekat !== null && k.detikTerdekat !== undefined ? `${angka(k.detikTerdekat, 2)} dtk` : "—"} · ${angka(k.detikTercatat ?? 0)} baris terukur`,
            warna: "",
        },
        {
            l: "Tingkat penutupan", v: k.tingkatPenutupan !== null && k.tingkatPenutupan !== undefined ? `${angka(k.tingkatPenutupan, 1)}%` : "—",
            Ikon: CheckCircle2, ket: `${angka(k.belumDitutup ?? 0)} belum ditutup`,
            warna: (k.belumDitutup ?? 0) === 0 ? "text-foreground" : "",
        },
        {
            l: "Sanksi berlaku", v: angka(k.sanksiAktif ?? 0), Ikon: Stamp,
            ket: `${angka(k.sanksiSegeraHangus ?? 0)} hangus ≤ 30 hari lagi`,
            warna: (k.sanksiSegeraHangus ?? 0) > 0 ? "text-amber-600 dark:text-amber-500" : "",
        },
    ];

    const urutKunci = (o: Record<string, number>, f: (s: string) => number) =>
        Object.keys(o ?? {}).filter((x) => x && x !== "(kosong)").sort((a, b) => f(a) - f(b));

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Pelanggaran Safe Distance</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        {isLoading ? "Memuat…" : `${angka(data?.total ?? 0)} pelanggaran GEC & GECL · ${angka(r.jumlahPengemudi ?? 0)} pengemudi`}
                    </p>
                </div>
                <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Muat ulang
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {KPI.map((x) => (
                    <Card key={x.l} className="rounded-xl border border-border bg-card">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <x.Ikon className="h-4 w-4" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{x.l}</span>
                            </div>
                            <p className={`mt-2.5 text-[28px] font-semibold leading-none tabular-nums ${x.warna || "text-foreground"}`}>{x.v}</p>
                            <p className="mt-2 text-[12px] text-muted-foreground">{x.ket}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="relative min-w-[260px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Cari NIK, nama, unit, jabatan, sanksi, kategori, lokasi…"
                            value={cari} onChange={(e) => setCari(e.target.value)} />
                    </div>
                    {[
                        { v: tahun, set: setTahun, opsi: p.tahun ?? [], label: "Semua tahun" },
                        { v: bulan, set: setBulan, opsi: BULAN.map((_, i) => String(i + 1).padStart(2, "0")), label: "Semua bulan", nama: (x: string) => BULAN[Number(x) - 1] },
                        { v: jalur, set: setJalur, opsi: p.jalur ?? [], label: "Semua jalur" },
                        { v: rentang, set: setRentang, opsi: p.rentang ?? [], label: "Semua jarak" },
                    ].map((s, i) => (
                        <Select key={i} value={s.v} onValueChange={s.set}>
                            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{s.label}</SelectItem>
                                {s.opsi.map((o: string) => <SelectItem key={o} value={o}>{s.nama ? s.nama(o) : o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ))}
                </CardContent>
            </Card>

            <Bab nomor={1} judul="Tren" pengantar="Arah pergerakan pelanggaran jarak aman dari waktu ke waktu.">
                <Kartu judul="Apakah tahun ini lebih baik dari tahun lalu?"
                    catatan={`${k.tahunIni ?? "—"} pekat · ${k.tahunLalu ?? "—"} redup`}>
                    <DuaDeret label={BULAN} a={r.tren?.bulanIni ?? []} b={r.tren?.bulanLalu ?? []}
                        namaA={String(k.tahunIni ?? "")} namaB={String(k.tahunLalu ?? "")} />
                </Kartu>
                <Kartu judul="Apakah kita di jalur lebih baik?" catatan="akumulasi berjalan sejak Januari">
                    <DuaDeret label={BULAN} a={r.tren?.kumIni ?? []} b={r.tren?.kumLalu ?? []}
                        namaA={String(k.tahunIni ?? "")} namaB={String(k.tahunLalu ?? "")} />
                </Kartu>
                <Kartu judul="Bulan mana yang paling banyak?" catatan="seluruh periode, urut waktu" lebar>
                    {Object.keys(r.perBulan ?? {}).length ? (
                        <Tegak label={urutKunci(r.perBulan, (s) => Date.parse(s + "-01"))}
                            nilai={urutKunci(r.perBulan, (s) => Date.parse(s + "-01")).map((x) => r.perBulan[x])} />
                    ) : <Kosong />}
                </Kartu>
                <Kartu judul="Minggu keberapa yang paling rawan?" catatan="urut minggu, bukan urut jumlah" lebar>
                    {Object.keys(r.perMinggu ?? {}).length ? (
                        <Tegak label={urutKunci(r.perMinggu, (s) => parseInt(s.slice(1)))}
                            nilai={urutKunci(r.perMinggu, (s) => parseInt(s.slice(1))).map((x) => r.perMinggu[x])} />
                    ) : <Kosong />}
                </Kartu>
            </Bab>

            <Bab nomor={2} judul="Pola Kelelahan" pengantar="Kapan pengemudi paling rawan membuntuti terlalu dekat. Hari kerja dihitung mulai pukul 06.00.">
                <Kartu judul="Kapan gugusan pelanggaran terbentuk?" catatan="hari × jam · makin pekat makin sering" lebar>
                    <PetaPanas data={r.petaPanas ?? []} />
                </Kartu>
                <Kartu judul="Jam berapa paling rawan?" catatan="urut 00–23, bukan urut jumlah">
                    <Tegak label={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))}
                        nilai={Array.from({ length: 24 }, (_, i) => r.perJam?.[String(i).padStart(2, "0")] ?? 0)} />
                </Kartu>
                <Kartu judul="Hari apa yang paling rawan?" catatan="urut Senin–Minggu">
                    <Tegak label={HARI_URUT} nilai={HARI_URUT.map((h) => r.perHari?.[h] ?? 0)}
                        onKlik={(h) => setCari(h === cari ? "" : h)} aktif={cari} />
                </Kartu>
                <Kartu judul="Shift mana yang lebih rawan, dan di jalur apa?" catatan="bertumpuk per shift" lebar>
                    <Bertumpuk data={r.jalurShift ?? {}} />
                </Kartu>
            </Bab>

            <Bab nomor={3} judul="Keparahan Jarak"
                pengantar="Angka jarak aman dalam detik: makin kecil, makin sedikit waktu untuk mengerem. Di bawah 2 detik hampir tidak menyisakan jarak reaksi.">
                <Kartu judul="Seberapa dekat pengemudi membuntuti?" catatan="urut jenjang, bukan urut jumlah">
                    <Tegak label={RENTANG_DETIK} nilai={RENTANG_DETIK.map((x) => r.perRentangDetik?.[x] ?? 0)}
                        onKlik={(x) => setRentang(x === rentang ? "all" : x)} aktif={rentang} />
                </Kartu>
                <Kartu judul="Bagaimana sebaran angka detiknya?" catatan="histogram per 0,5 detik">
                    {Object.keys(r.sebaranDetik ?? {}).length ? (
                        <Tegak label={urutKunci(r.sebaranDetik, (s) => parseFloat(s))}
                            nilai={urutKunci(r.sebaranDetik, (s) => parseFloat(s)).map((x) => r.sebaranDetik[x])} />
                    ) : <Kosong />}
                </Kartu>
                <Kartu judul="Kategori apa menurut matriks pemilik tambang?" catatan="kalimat lengkap sesuai matriks">
                    <Mendatar data={r.perKategori ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Kode pelanggaran mana yang dipakai?" catatan="rujukan matriks sanksi">
                    <Mendatar data={r.perKode ?? {}} batas={8} />
                </Kartu>
            </Bab>

            <Bab nomor={4} judul="Pelanggar" pengantar="Siapa yang paling sering dan berulang — bahan pembinaan.">
                <Kartu judul="Berapa persen pengemudi menyumbang 80% pelanggaran?"
                    catatan={`${angka(k.pengemudi80 ?? 0)} dari ${angka(k.pengemudi ?? 0)} pengemudi (${angkaAtau(k.persenPengemudi80)}%) · 20 teratas`} lebar>
                    <Pareto data={r.pareto ?? []} />
                </Kartu>
                <Kartu judul="Peran apa yang paling sering melanggar?" catatan="jabatan saat melanggar">
                    <Mendatar data={r.perJabatan ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Unit mana yang paling sering melanggar?" catatan="10 teratas">
                    <Mendatar data={r.perUnit ?? {}} batas={10} onKlik={(u) => setCari(u === cari ? "" : u)} aktif={cari} />
                </Kartu>
            </Bab>

            <Bab nomor={5} judul="Lokasi & Jalur" pengantar="Titik rawan di jalan hauling.">
                <Kartu judul="Ruas KM mana yang paling rawan?" catatan="dikelompokkan per pita 5 km" lebar>
                    {Object.keys(r.perPitaKm ?? {}).length ? (
                        <Tegak label={urutKunci(r.perPitaKm, (s) => parseInt(s))}
                            nilai={urutKunci(r.perPitaKm, (s) => parseInt(s)).map((x) => r.perPitaKm[x])} />
                    ) : <Kosong />}
                </Kartu>
                <Kartu judul="KM berapa persisnya?" catatan="10 titik teratas">
                    <Mendatar data={r.perKm ?? {}} batas={10} />
                </Kartu>
                <Kartu judul="Bermuatan atau kosongan yang lebih rawan?" catatan="arah perjalanan saat melanggar">
                    <Mendatar data={r.perJalur ?? {}} batas={5} onKlik={(x) => setJalur(x === jalur ? "all" : x)} aktif={jalur} />
                </Kartu>
            </Bab>

            <Bab nomor={6} judul="Penegakan & Sanksi"
                pengantar="Seberapa cepat ditindaklanjuti, dan siapa yang sanksinya masih berlaku. Bab ini mengukur respons organisasi, bukan perilaku pengemudi.">
                <Kartu judul="Sanksi apa yang dijatuhkan?" catatan="sesuai matriks pelanggaran">
                    <Mendatar data={r.perSanksi ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Berapa lama sampai ditutup?"
                    catatan={k.durasiJanggal ? `urut jenjang hari · ${angka(k.durasiJanggal)} baris berdurasi janggal dikeluarkan` : "urut jenjang hari"}>
                    <Tegak label={EMBER_DURASI} nilai={EMBER_DURASI.map((x) => r.sebaranDurasi?.[x] ?? 0)} />
                </Kartu>
                <Kartu judul="Sanksi siapa yang masih berlaku?"
                    catatan={`${angka(r.jumlahSanksiAktif ?? 0)} sanksi aktif · urut dari yang paling dekat hangus`} lebar>
                    {(r.sanksiAktif ?? []).length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                        <th className="py-2 pr-3 font-normal">NIK</th>
                                        <th className="py-2 pr-3 font-normal">Nama</th>
                                        <th className="py-2 pr-3 font-normal">Unit</th>
                                        <th className="py-2 pr-3 font-normal">Sanksi</th>
                                        <th className="py-2 pr-3 font-normal">Berlaku s.d.</th>
                                        <th className="py-2 pr-3 text-right font-normal">Sisa hari</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(r.sanksiAktif ?? []).map((x: any) => (
                                        <tr key={x.kunci} className="border-b border-border/60 last:border-0">
                                            <td className="py-2 pr-3 font-mono text-[12px]">{x.nik || "—"}</td>
                                            <td className="py-2 pr-3">{x.nama || "—"}</td>
                                            <td className="py-2 pr-3">{x.unit || "—"}</td>
                                            <td className="py-2 pr-3">{x.sanksi}</td>
                                            <td className="py-2 pr-3 tabular-nums">
                                                {x.masaBerlaku ? new Date(x.masaBerlaku + "T12:00:00").toLocaleDateString("id-ID") : "—"}
                                            </td>
                                            <td className={`py-2 pr-3 text-right tabular-nums ${x.sisaHari <= 30 ? "font-semibold text-amber-600 dark:text-amber-500" : ""}`}>
                                                {angka(x.sisaHari)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <Kosong />}
                </Kartu>
                <Kartu judul="Berapa yang sanksinya sudah hangus?" catatan="status pemutihan dari sumber">
                    <Mendatar data={r.perStatusSanksi ?? {}} batas={5} />
                </Kartu>
            </Bab>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
                <span>Halaman ini untuk evaluasi dan analisis. Daftar baris per kejadian ada di Database Violation Safe Distance.</span>
                <Link href="/workspace/hse/sd-database">
                    <span className="ml-auto inline-flex cursor-pointer items-center gap-1 font-medium text-foreground hover:underline">
                        Buka Database Violation <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </Link>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
                Sumber: Google Sheet pelanggaran SiCantik (tab jarak aman), disaring perusahaan GEC dan GECL.
                Nilai jarak aman hanya tersedia pada sebagian baris; yang kosong tidak diikutkan dalam rerata.
            </div>
        </div>
    );
}
