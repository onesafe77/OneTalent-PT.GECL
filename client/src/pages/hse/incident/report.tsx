import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Search, Trash2, Edit, Loader2, FileUp } from "lucide-react";
import { useLocation } from "wouter";
import { angka, TAHUN_AKTIF } from "@/lib/hse-statistik";

/** §5.4 — Laporan Insiden: tabel dengan saringan + ekspor Excel empat lembar. */
export default function ReportIncident() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [, setLocation] = useLocation();
    const [tahun, setTahun] = useState(String(TAHUN_AKTIF));
    const [klasifikasi, setKlasifikasi] = useState("all");
    const [cari, setCari] = useState("");
    const [hapus, setHapus] = useState<{ id: string; judul: string } | null>(null);
    const [mengekspor, setMengekspor] = useState(false);
    const [mengimpor, setMengimpor] = useState(false);

    /** PDF dibaca di server, hasilnya DIISIKAN ke form — tidak langsung disimpan. */
    const imporPdf = async (berkas: File) => {
        setMengimpor(true);
        try {
            const fd = new FormData(); fd.append("file", berkas);
            const r = await fetch("/api/hse/insiden/impor-pdf", { method: "POST", body: fd });
            if (!r.ok) throw new Error((await r.json()).message);
            const draf = await r.json();
            sessionStorage.setItem("drafInsidenPdf", JSON.stringify(draf));
            toast({
                title: "PDF terbaca",
                description: `${draf.penyebab.length} penyebab · ${draf.rekomendasi.length} rekomendasi · ${draf.tercentang.length} kotak tercentang. Periksa sebelum menyimpan.`,
            });
            setLocation("/workspace/hse/incident-form/new");
        } catch (e: any) {
            toast({ title: "Gagal membaca PDF", description: e?.message, variant: "destructive" });
        } finally { setMengimpor(false); }
    };

    const { data: master } = useQuery<any>({ queryKey: ["/api/hse/master"] });
    const { data, isLoading } = useQuery<{ data: any[]; total: number }>({
        queryKey: [`/api/hse/insiden?tahun=${tahun}&klasifikasi=${klasifikasi}&cari=${encodeURIComponent(cari)}`],
    });
    const baris = data?.data ?? [];

    const hapusMutation = useMutation({
        mutationFn: async (id: string) => {
            const r = await fetch(`/api/hse/insiden/${id}`, { method: "DELETE" });
            if (!r.ok) throw new Error();
        },
        onSuccess: () => {
            qc.invalidateQueries({
                predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/hse/insiden"),
            });
            toast({ title: "Insiden dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
    });

    const totalLostCost = useMemo(
        () => baris.reduce((a, b) => a + (Number(b.lost_cost) || 0), 0), [baris]);

    // §8 — lencana klasifikasi: ringan ke berat.
    const warnaKlasifikasi = (k: string) => {
        const berat = ["LTI", "Fatal"], sedang = ["MTI", "FAI"];
        if (berat.includes(k)) return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950 dark:text-red-400";
        if (sedang.includes(k)) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-400";
        return "border-border bg-muted text-muted-foreground";
    };

    /** §5.4 — ekspor 4 lembar; pustaka Excel dimuat saat dibutuhkan saja. */
    const ekspor = async () => {
        if (!baris.length) { toast({ title: "Tidak ada data untuk diekspor" }); return; }
        setMengekspor(true);
        try {
            const ExcelJS = (await import("exceljs")).default as any;
            const wb = new ExcelJS.Workbook();
            const tgl = (v: any) => (v ? new Date(v).toLocaleDateString("id-ID") : "");

            // Lembar 1 — Ringkasan
            const s1 = wb.addWorksheet("Ringkasan");
            s1.columns = [{ width: 34 }, { width: 20 }];
            const tulis = (a: string, b: any = "") => s1.addRow([a, b]);
            tulis("LAPORAN INSIDEN — PT GECL");
            tulis("Diekspor", new Date().toLocaleString("id-ID"));
            tulis("Saringan", `Tahun ${tahun}${klasifikasi !== "all" ? ` · ${klasifikasi}` : ""}${cari ? ` · "${cari}"` : ""}`);
            tulis("");
            tulis("Jumlah insiden", baris.length);
            tulis("Total lost cost (Rp)", totalLostCost);
            tulis("Total rekomendasi", baris.reduce((a, b) => a + (b.jumlah_rekomendasi || 0), 0));
            tulis("Rekomendasi selesai", baris.reduce((a, b) => a + (b.rekomendasi_selesai || 0), 0));
            tulis("Total temuan penyebab", baris.reduce((a, b) => a + (b.jumlah_penyebab || 0), 0));
            for (const [judul, kolom] of [["PER KLASIFIKASI", "klasifikasi"], ["PER BULAN", "bulan"],
                ["PER MINGGU", "minggu"], ["PER AREA", "area"], ["PER MEKANISME", "mekanisme"]] as const) {
                tulis(""); tulis(judul);
                const h: Record<string, number> = {};
                baris.forEach((b) => { const k = String(b[kolom] ?? "(kosong)"); h[k] = (h[k] || 0) + 1; });
                Object.entries(h).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => tulis(k, n));
            }
            s1.getRow(1).font = { bold: true, size: 13 };

            // Lembar 2 — Insiden
            const s2 = wb.addWorksheet("Insiden");
            const kol2 = ["nomor", "tanggal", "hari", "minggu", "jam", "shift", "judul", "area", "lokasi",
                "sub_lokasi", "perusahaan", "mekanisme", "klasifikasi", "kategori_khusus", "lost_cost",
                "klasifikasi_lost_cost", "alat_terlibat", "nama_terlibat", "jabatan", "usia", "rentang_usia",
                "masa_kerja", "status_investigasi", "jumlah_penyebab", "jumlah_rekomendasi", "rekomendasi_selesai"];
            s2.columns = kol2.map((k) => ({
                header: k.replace(/_/g, " ").toUpperCase(), key: k,
                width: k === "judul" ? 46 : k.includes("lokasi") ? 24 : 16,
            }));
            baris.forEach((b) => s2.addRow({ ...b, tanggal: tgl(b.tanggal), lost_cost: Number(b.lost_cost) || 0 }));

            // Lembar 3 & 4 — perlu detail per insiden
            const s3 = wb.addWorksheet("Penyebab");
            s3.columns = [{ header: "TANGGAL", width: 14 }, { header: "JUDUL INSIDEN", width: 46 },
                { header: "KLASIFIKASI", width: 14 }, { header: "JENIS", width: 14 },
                { header: "KODE", width: 14 }, { header: "URAIAN", width: 52 }, { header: "DETAIL", width: 40 }];
            const s4 = wb.addWorksheet("Tindak Lanjut");
            s4.columns = [{ header: "TANGGAL INSIDEN", width: 16 }, { header: "JUDUL INSIDEN", width: 46 },
                { header: "URAIAN", width: 52 }, { header: "PIC", width: 20 },
                { header: "DUE DATE", width: 14 }, { header: "TANGGAL PEMENUHAN", width: 18 }, { header: "STATUS", width: 16 }];
            for (const b of baris) {
                const r = await fetch(`/api/hse/insiden/${b.id}`);
                if (!r.ok) continue;
                const d = await r.json();
                (d.penyebab || []).forEach((p: any) => s3.addRow([tgl(b.tanggal), b.judul, b.klasifikasi, p.jenis, p.kode, p.uraian, p.detail]));
                (d.rekomendasi || []).forEach((k: any) => s4.addRow([tgl(b.tanggal), b.judul, k.uraian, k.pic, tgl(k.due_date), tgl(k.tanggal_pemenuhan), k.status]));
            }

            [s2, s3, s4].forEach((ws) => {
                ws.getRow(1).font = { bold: true };
                ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F4" } };
                ws.views = [{ state: "frozen", ySplit: 1 }];
                ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
            });

            const buf = await wb.xlsx.writeBuffer();
            const nama = `Laporan_Insiden_${tahun}${klasifikasi !== "all" ? "_" + klasifikasi : ""}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            const url = URL.createObjectURL(new Blob([buf]));
            const a = document.createElement("a"); a.href = url; a.download = nama;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            toast({ title: "Ekspor selesai", description: `${baris.length} insiden × 4 lembar` });
        } catch (e) {
            toast({ title: "Ekspor gagal", variant: "destructive" });
        } finally { setMengekspor(false); }
    };

    const tahunPilihan = Array.from({ length: 6 }, (_, i) => TAHUN_AKTIF - i);

    return (
        <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Report Incident</h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        {isLoading ? "Memuat…" : `${angka(baris.length)} insiden · total lost cost Rp ${angka(totalLostCost)}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <label>
                        <input type="file" accept="application/pdf" className="hidden"
                            onChange={(e) => { const b = e.target.files?.[0]; if (b) imporPdf(b); e.currentTarget.value = ""; }} />
                        <Button variant="outline" asChild disabled={mengimpor}>
                            <span className="cursor-pointer">
                                {mengimpor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                Impor PDF
                            </span>
                        </Button>
                    </label>
                    <Button variant="outline" onClick={ekspor} disabled={mengekspor}>
                        {mengekspor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Ekspor Excel
                    </Button>
                    <Button onClick={() => setLocation("/workspace/hse/incident-form/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Insiden Baru
                    </Button>
                </div>
            </div>

            <Card className="rounded-xl border border-border bg-card">
                <CardContent className="p-0">
                    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                        <div className="relative min-w-[240px] flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="h-9 pl-9" placeholder="Cari judul, lokasi, atau nama…"
                                value={cari} onChange={(e) => setCari(e.target.value)} />
                        </div>
                        <Select value={tahun} onValueChange={setTahun}>
                            <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{tahunPilihan.map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={klasifikasi} onValueChange={setKlasifikasi}>
                            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua klasifikasi</SelectItem>
                                {(master?.klasifikasi ?? []).map((k: any) => <SelectItem key={k.nilai} value={k.nilai}>{k.nilai}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No. Registrasi</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Judul</TableHead>
                                    <TableHead>Area</TableHead>
                                    <TableHead>Lokasi</TableHead>
                                    <TableHead>Klasifikasi</TableHead>
                                    <TableHead>Mekanisme</TableHead>
                                    <TableHead className="text-right">Lost cost</TableHead>
                                    <TableHead>Investigasi</TableHead>
                                    <TableHead className="text-center">Tindak lanjut</TableHead>
                                    <TableHead className="text-right pr-4">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={11} className="py-10 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                                ) : baris.length === 0 ? (
                                    <TableRow><TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                                        Belum ada insiden tercatat untuk saringan ini.
                                    </TableCell></TableRow>
                                ) : baris.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                            {b.no_registrasi ?? "–"}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap tabular-nums">
                                            {new Date(b.tanggal).toLocaleDateString("id-ID")}
                                            <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-foreground">W{b.minggu}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[320px]">
                                            <span className="line-clamp-2 font-medium text-foreground">{b.judul}</span>
                                        </TableCell>
                                        <TableCell>{b.area}</TableCell>
                                        <TableCell>{b.lokasi}</TableCell>
                                        <TableCell>
                                            {b.klasifikasi && <Badge className={warnaKlasifikasi(b.klasifikasi)}>{b.klasifikasi}</Badge>}
                                        </TableCell>
                                        <TableCell>{b.mekanisme}</TableCell>
                                        <TableCell className="text-right tabular-nums">{b.lost_cost ? angka(Number(b.lost_cost)) : "–"}</TableCell>
                                        <TableCell>{b.status_investigasi}</TableCell>
                                        <TableCell className="text-center tabular-nums">
                                            {b.rekomendasi_selesai}/{b.jumlah_rekomendasi}
                                        </TableCell>
                                        <TableCell className="space-x-1 pr-4 text-right">
                                            <Button variant="ghost" size="icon" title="Ubah"
                                                onClick={() => setLocation(`/workspace/hse/incident-form/${b.id}`)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" title="Hapus"
                                                className="text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                                                onClick={() => setHapus({ id: b.id, judul: b.judul })}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!hapus} onOpenChange={(o) => !o && setHapus(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus insiden ini?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <div className="rounded-lg border border-border bg-muted p-3 text-[14px] text-foreground">{hapus?.judul}</div>
                                <p>Penyebab dan tindak lanjutnya ikut terhapus permanen.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => { if (hapus) hapusMutation.mutate(hapus.id); setHapus(null); }}>
                            Ya, hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
