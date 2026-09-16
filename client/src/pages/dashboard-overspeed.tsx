import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, BellRing, Loader2, Search, ShieldAlert, Clock, CheckCircle2, AlertOctagon, Stamp, Users, Repeat, Gauge, X } from "lucide-react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { angka, BULAN } from "@/lib/hse-statistik";
import { Bab, Kartu, Tegak, Mendatar, DuaDeret, BatangGaris, PetaPanas, Pareto, Bertumpuk, Kosong } from "@/components/fms/grafik";

/**
 * Dashboard Pelanggaran FMS — GEC & GECL.
 * Data dibaca & dibakukan di server (server/lib/fms-sheet.ts).
 */

const HARI_URUT = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const RENTANG_DEV = ["0-5 km/jam", "6-10 km/jam", "11-20 km/jam", "21-30 km/jam", "> 30 km/jam"];
const EMBER_DURASI = ["0-1 hari", "2-3 hari", "4-7 hari", "8-14 hari", "> 14 hari"];

export default function DashboardFms() {
    const { toast } = useToast();
    const [tahun, setTahun] = useState("all");
    const [bulan, setBulan] = useState("all");
    const [jenis, setJenis] = useState("all");
    const [status, setStatus] = useState("all");
    const [cari, setCari] = useState("");
    const [memeriksa, setMemeriksa] = useState(false);

    const kunci = `/api/hse/fms-violations?tahun=${tahun}&bulan=${bulan}&jenis=${jenis}&status=${status}&cari=${encodeURIComponent(cari)}`;
    const { data, isLoading, refetch, isFetching } = useQuery<any>({ queryKey: [kunci] });

    const r = data?.ringkas ?? {};
    const p = data?.pilihan ?? {};

    const periksaBaru = async () => {
        setMemeriksa(true);
        try {
            const res = await fetch("/api/hse/fms-violations/periksa", { method: "POST" });
            const j = await res.json();
            if (!res.ok) throw new Error(j.message);
            toast({
                title: j.disemai ? `${angka(j.disemai)} pelanggaran dicatat sebagai awal`
                    : j.baru ? `${angka(j.baru)} pelanggaran baru diberitahukan` : "Tidak ada pelanggaran baru",
                description: j.disemai ? "Pemeriksaan pertama tidak mengirim notifikasi agar lonceng tidak dibanjiri data lama." : undefined,
            });
            refetch();
        } catch (e: any) {
            toast({ title: "Gagal memeriksa", description: e?.message, variant: "destructive" });
        } finally { setMemeriksa(false); }
    };

    const k = r.kpi ?? {};
    const naik = (k.pelanggaranIni ?? 0) > (k.pelanggaranLalu ?? 0);
    const adaPembanding = (k.pelanggaranLalu ?? 0) > 0;

    // §3 — enam KPI, masing-masing dengan SATU baris konteks. §1.4: warna hanya
    // untuk yang bermakna, jadi hanya dua kartu yang boleh berwarna.
    const KPI = [
        { l: "Pelanggaran", v: angka(k.pelanggaranIni ?? 0),
          ket: adaPembanding ? `${k.tahunIni}: ${angka(k.pelanggaranIni)} vs ${k.tahunLalu}: ${angka(k.pelanggaranLalu)}` : "belum ada pembanding",
          Ikon: ShieldAlert,
          warna: !adaPembanding ? "" : naik ? "text-red-600 dark:text-red-500" : "text-foreground" },
        { l: "Pelanggar", v: angka(k.pelanggar ?? 0),
          ket: `${angka(k.berNik ?? 0)} dari ${angka(data?.total ?? 0)} baris ber-NIK (${angka(k.persenBerNik ?? 0, 1)}%)`,
          Ikon: Users, warna: "" },
        { l: "Pengulang", v: angka(k.pengulang ?? 0),
          ket: `menyumbang ${angka(k.persenDariPengulang ?? 0, 1)}% pelanggaran`,
          Ikon: Repeat, warna: (k.pengulang ?? 0) > 0 ? "text-amber-600 dark:text-amber-500" : "" },
        { l: "Rerata deviasi", v: k.rerataDeviasi !== null && k.rerataDeviasi !== undefined ? angka(k.rerataDeviasi, 1) : "—",
          ket: `km/jam di atas batas${k.batasUmum ? ` (batas umum ${k.batasUmum})` : ""}`, Ikon: Gauge, warna: "" },
        { l: "Tingkat penutupan", v: k.tingkatPenutupan !== null && k.tingkatPenutupan !== undefined ? `${angka(k.tingkatPenutupan, 1)}%` : "—",
          ket: `${angka(k.belumDitutup ?? 0)} belum ditutup`, Ikon: CheckCircle2,
          warna: (k.belumDitutup ?? 0) === 0 ? "text-foreground" : "" },
        { l: "Rerata penutupan", v: k.rerataPenutupan !== null && k.rerataPenutupan !== undefined ? angka(k.rerataPenutupan, 1) : "—",
          ket: `hari, dari ${angka(k.durasiTercatat ?? 0)} yang tercatat`, Ikon: Clock, warna: "" },
    ];

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Pelanggaran FMS</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        {isLoading ? "Memuat…" : `${angka(data?.total ?? 0)} pelanggaran GEC & GECL · ${angka(r.jumlahPengemudi ?? 0)} pengemudi`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Muat ulang
                    </Button>
                    <Button onClick={periksaBaru} disabled={memeriksa}>
                        {memeriksa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                        Periksa pelanggaran baru
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {KPI.map((k) => (
                    <Card key={k.l} className="rounded-xl border border-border bg-card">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <k.Ikon className="h-4 w-4" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{k.l}</span>
                            </div>
                            <p className={`mt-2.5 text-[28px] font-semibold leading-none tabular-nums ${k.warna || "text-foreground"}`}>{k.v}</p>
                            <p className="mt-2 text-[12px] text-muted-foreground">{k.ket}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Saringan + pencarian NIK / nama / unit */}
            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="relative min-w-[260px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="h-9 pl-9" placeholder="Cari NIK, nama, unit, sanksi, kategori, jalur, status…"
                            value={cari} onChange={(e) => setCari(e.target.value)} />
                    </div>
                    {[
                        { v: tahun, set: setTahun, opsi: p.tahun ?? [], label: "Semua tahun" },
                        { v: bulan, set: setBulan, opsi: BULAN.map((_, i) => String(i + 1).padStart(2, "0")), label: "Semua bulan", nama: (x: string) => BULAN[Number(x) - 1] },
                        { v: jenis, set: setJenis, opsi: p.jenis ?? [], label: "Semua jenis" },
                    ].map((s, i) => (
                        <Select key={i} value={s.v} onValueChange={s.set}>
                            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{s.label}</SelectItem>
                                {s.opsi.map((o: string) => <SelectItem key={o} value={o}>{s.nama ? s.nama(o) : o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ))}
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-9 w-[176px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua status</SelectItem>
                            <SelectItem value="belum">Belum selesai</SelectItem>
                            {(p.status ?? []).map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* ── §4 ENAM BAB ───────────────────────────────────────────── */}

            <Bab nomor={1} judul="Tren" pengantar="Arah pergerakan dari waktu ke waktu.">
                <Kartu judul="Apakah tahun ini lebih baik dari tahun lalu?"
                    catatan={`${r.kpi?.tahunIni} pekat · ${r.kpi?.tahunLalu} redup · tidak terpengaruh saringan tahun`}>
                    <DuaDeret label={BULAN} a={r.tren?.bulanIni ?? []} b={r.tren?.bulanLalu ?? []}
                        namaA={String(r.kpi?.tahunIni ?? "")} namaB={String(r.kpi?.tahunLalu ?? "")}
                        sampai={r.tren?.bulanBerjalan} />
                </Kartu>
                <Kartu judul="Apakah kita di jalur lebih baik?" catatan="akumulasi berjalan sejak Januari">
                    <DuaDeret label={BULAN} a={r.tren?.kumIni ?? []} b={r.tren?.kumLalu ?? []}
                        namaA={String(r.kpi?.tahunIni ?? "")} namaB={String(r.kpi?.tahunLalu ?? "")}
                        sampai={r.tren?.bulanBerjalan} />
                </Kartu>
                <Kartu judul="Turun jumlahnya, tapi apakah turun keparahannya?"
                    catatan="batang: jumlah · garis: rerata deviasi km/jam" lebar>
                    <BatangGaris label={BULAN} batang={(r.bulanJumlahDev ?? []).map((x: any) => x.jumlah)}
                        garis={(r.bulanJumlahDev ?? []).map((x: any) => x.rerataDeviasi)}
                        namaBatang="Jumlah pelanggaran" namaGaris="Rerata deviasi (km/jam)" />
                </Kartu>
                <Kartu judul="Minggu keberapa yang paling rawan?" catatan="urut minggu, bukan urut jumlah" lebar>
                    {Object.keys(r.perMinggu ?? {}).length ? (
                        <Tegak label={Object.keys(r.perMinggu).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))}
                            nilai={Object.keys(r.perMinggu).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).map((x) => r.perMinggu[x])} />
                    ) : <Kosong />}
                </Kartu>
            </Bab>

            <Bab nomor={2} judul="Pola Kelelahan" pengantar="Kapan pengemudi paling rawan melanggar. Hari kerja dihitung mulai pukul 06.00.">
                <Kartu judul="Kapan gugusan pelanggaran terbentuk?" catatan="hari × jam · makin pekat makin sering" lebar>
                    <PetaPanas data={r.petaPanas ?? []} />
                </Kartu>
                <Kartu judul="Jam berapa pengemudi paling rawan melanggar?" catatan="urut 00–23, bukan urut jumlah">
                    <Tegak label={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))}
                        nilai={Array.from({ length: 24 }, (_, i) => r.perJam?.[String(i).padStart(2, "0")] ?? 0)} />
                </Kartu>
                <Kartu judul="Hari apa yang paling rawan?" catatan="urut Senin–Minggu"
                    >
                    <Tegak label={HARI_URUT} nilai={HARI_URUT.map((h) => r.perHari?.[h] ?? 0)}
                        onKlik={(h) => setCari(h === cari ? "" : h)} aktif={cari} />
                </Kartu>
                <Kartu judul="Shift mana yang menyumbang pelanggaran apa?" catatan="bertumpuk per jenis" lebar>
                    <Bertumpuk data={r.shiftJenis ?? {}} />
                </Kartu>
            </Bab>

            <Bab nomor={3} judul="Jenis & Keparahan" pengantar="Apa yang dilanggar dan seberapa jauh melewati batas.">
                <Kartu judul="Apa yang paling sering dilanggar?" catatan="seluruh jenis ditampilkan">
                    <Mendatar data={r.perJenisPel ?? {}} batas={8} onKlik={(x) => setJenis(x === jenis ? "all" : x)} aktif={jenis} />
                </Kartu>
                <Kartu judul="Seberapa jauh melewati batas kecepatan?" catatan="urut jenjang, bukan urut jumlah">
                    <Tegak label={RENTANG_DEV} nilai={RENTANG_DEV.map((x) => r.perRentangDeviasi?.[x] ?? 0)} />
                </Kartu>
                <Kartu judul="Kategori apa menurut matriks pemilik tambang?" catatan="kalimat lengkap sesuai matriks">
                    <Mendatar data={r.perKategori ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Berapa kecepatan yang tercatat?" catatan="histogram per 5 km/jam">
                    {Object.keys(r.sebaranKecepatan ?? {}).length ? (
                        <Tegak label={Object.keys(r.sebaranKecepatan).sort((a, b) => parseInt(a) - parseInt(b))}
                            nilai={Object.keys(r.sebaranKecepatan).sort((a, b) => parseInt(a) - parseInt(b)).map((x) => r.sebaranKecepatan[x])} />
                    ) : <Kosong />}
                </Kartu>
                <Kartu judul="Kode pelanggaran mana yang dipakai?" catatan="rujukan matriks sanksi">
                    <Mendatar data={r.perKode ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Bermuatan atau kosongan yang lebih rawan?" catatan="bertumpuk per jenis">
                    <Bertumpuk data={r.jalurJenis ?? {}} />
                </Kartu>
            </Bab>

            <Bab nomor={4} judul="Pelanggar" pengantar="Siapa yang paling sering dan berulang.">
                <Kartu judul="Berapa persen pengemudi menyumbang 80% pelanggaran?"
                    catatan={`${angka(k.pengemudi80 ?? 0)} dari ${angka(k.pelanggar ?? 0)} pengemudi (${angka(k.persenPengemudi80 ?? 0, 1)}%) · 20 teratas`} lebar>
                    <Pareto data={r.pareto ?? []} />
                </Kartu>
                <Kartu judul="Peran apa yang paling sering melanggar?" catatan="jabatan saat melanggar">
                    <Mendatar data={r.perJabatan ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Unit mana yang paling sering melanggar?" catatan="10 teratas">
                    <Mendatar data={r.perUnit ?? {}} batas={10} onKlik={(u) => setCari(u === cari ? "" : u)} aktif={cari} />
                </Kartu>
                <Kartu judul="Perangkat mana yang mendeteksi?" catatan="sumber pengawasan" lebar>
                    <Mendatar data={r.perSumber ?? {}} batas={5} />
                </Kartu>
            </Bab>

            <Bab nomor={5} judul="Lokasi" pengantar="Titik rawan di jalan hauling.">
                <Kartu judul="Ruas KM mana yang paling rawan?"
                    catatan="dikelompokkan per pita 5 km · batang: jumlah · garis: rerata deviasi" lebar>
                    {(r.km5 ?? []).length ? (
                        <BatangGaris label={(r.km5 ?? []).map((x: any) => x.pita.replace(" km", ""))}
                            batang={(r.km5 ?? []).map((x: any) => x.jumlah)}
                            garis={(r.km5 ?? []).map((x: any) => x.rerataDeviasi)}
                            namaBatang="Jumlah pelanggaran" namaGaris="Rerata deviasi (km/jam)" />
                    ) : <Kosong />}
                </Kartu>
                <Kartu judul="Zona atau phase mana yang menonjol?" catatan="8 teratas · dari kolom lokasi" lebar>
                    <Mendatar data={r.perZona ?? {}} batas={8} />
                </Kartu>
            </Bab>

            <Bab nomor={6} judul="Penegakan" pengantar="Seberapa cepat dan tuntas ditindaklanjuti. Bab ini mengukur respons organisasi, bukan perilaku pengemudi.">
                <Kartu judul="Berapa yang sudah ditutup dan berapa yang menggantung?" catatan="status tindak lanjut">
                    <Mendatar data={r.perStatus ?? {}} batas={6} onKlik={(x) => setStatus(x === status ? "all" : x)} aktif={status} />
                </Kartu>
                <Kartu judul="Sanksi apa yang dijatuhkan?" catatan="sesuai matriks pelanggaran">
                    <Mendatar data={r.perSanksi ?? {}} batas={8} />
                </Kartu>
                <Kartu judul="Berapa lama sampai ditutup?" catatan="urut jenjang hari">
                    <Tegak label={EMBER_DURASI} nilai={EMBER_DURASI.map((x) => r.sebaranDurasi?.[x] ?? 0)} />
                </Kartu>
                <Kartu judul="Apakah penutupan mengejar pelanggaran baru?" catatan="batang: total · garis: % ditutup">
                    {(r.tutupPerBulan ?? []).length ? (
                        <BatangGaris label={(r.tutupPerBulan ?? []).map((x: any) => x.bulan.slice(2))}
                            batang={(r.tutupPerBulan ?? []).map((x: any) => x.total)}
                            garis={(r.tutupPerBulan ?? []).map((x: any) => x.persen)}
                            namaBatang="Total pelanggaran" namaGaris="% ditutup" />
                    ) : <Kosong />}
                </Kartu>
            </Bab>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
                <span>Halaman ini untuk evaluasi dan analisis. Daftar baris per kejadian ada di Database Violation FMS.</span>
                <Link href="/workspace/hse/fms-database">
                    <span className="ml-auto inline-flex cursor-pointer items-center gap-1 font-medium text-foreground hover:underline">
                        Buka Database Violation <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </Link>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
                Sumber: Google Sheet FMS, disaring perusahaan GEC dan GECL. Diperiksa otomatis tiap 30 menit;
                pelanggaran baru muncul di lonceng notifikasi.
            </div>
        </div>
    );
}
