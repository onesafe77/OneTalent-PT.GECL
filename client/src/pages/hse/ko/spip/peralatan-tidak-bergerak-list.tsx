import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import {
    Search, Plus, Upload, Download, AlertTriangle, Edit, Trash2,
    LayoutGrid, List, ChevronDown, ChevronRight, Wrench, Loader2,
    Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const API = "/api/spip/peralatan/tidak-bergerak";

const kosongkan = (v: any) => (v == null ? "" : String(v));
const tglInput = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export default function SPIPPeralatanTidakBergerakList() {
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [jenisAlat, setJenisAlat] = useState("all");
    const [areaLokasi, setAreaLokasi] = useState("all");
    const [status, setStatus] = useState("all");
    const [isGrouped, setIsGrouped] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [hapusTarget, setHapusTarget] = useState<any>(null);
    const [importOpen, setImportOpen] = useState(false);

    const params = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(jenisAlat !== "all" ? { jenis_alat: jenisAlat } : {}),
        ...(areaLokasi !== "all" ? { area_lokasi: areaLokasi } : {}),
        ...(status !== "all" ? { status } : {}),
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: [API, params.toString()],
        queryFn: async () => {
            const res = await fetch(`${API}?${params.toString()}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
    });

    const items = data?.data || [];
    // Opsi filter datang dari server (seluruh tabel), bukan hardcode — jenis/area baru
    // dari hasil impor otomatis muncul tanpa ubah kode.
    const opsiJenis: string[] = data?.filters?.jenisAlat || [];
    const opsiArea: string[] = data?.filters?.areaLokasi || [];

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expired = items.filter((i: any) => !i.expSertifikat || new Date(i.expSertifikat) <= today).length;
        const soonExp = items.filter((i: any) => {
            if (!i.expSertifikat) return false;
            const d = differenceInDays(new Date(i.expSertifikat), today);
            return d > 0 && d <= 30;
        }).length;
        return {
            total: items.length,
            aktif: items.length - expired,
            expired,
            jenis: new Set(items.map((i: any) => i.jenisAlat)).size,
            lokasi: new Set(items.map((i: any) => i.areaLokasi)).size,
            soonExp,
        };
    }, [items]);

    const grouped = useMemo(() => {
        if (!isGrouped) return null;
        const g: Record<string, any[]> = {};
        items.forEach((it: any) => { (g[it.jenisAlat] ||= []).push(it); });
        return g;
    }, [items, isGrouped]);

    const statusText = (item: any) => {
        if (!item.expSertifikat) return "BELUM ADA";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(item.expSertifikat);
        if (exp <= today) return "EXPIRED";
        const days = differenceInDays(exp, today);
        const bulan = Math.floor(days / 30);
        return `${Math.floor(bulan / 12)} Thn, ${bulan % 12} Bln, ${days % 30} Hari`;
    };

    const hapus = async () => {
        const t = hapusTarget;
        setHapusTarget(null);
        try {
            const res = await fetch(`${API}/${t.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Gagal menghapus");
            toast({ title: "Terhapus", description: `${t.noRegistrasi} telah dihapus.` });
            refetch();
        } catch (e: any) {
            toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>HSE</span> / <span>KO</span> / <span>SPIP</span> / <span>Peralatan</span> /{" "}
                    <span className="font-semibold text-gray-900">Tidak Bergerak</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">SPIP Peralatan Tidak Bergerak</h1>
                <p className="text-gray-500 text-sm">Jack, compressor, impact, gerinda & peralatan workshop PT GECL</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <KartuStat label="Total Alat" nilai={stats.total} warna="text-slate-800" />
                <KartuStat label="Sertifikat Aktif" nilai={stats.aktif} warna="text-emerald-600" />
                <KartuStat label="EXPIRED" nilai={stats.expired} warna="text-red-600" tekanan={stats.expired > 0} />
                <KartuStat label="Jenis Alat" nilai={stats.jenis} warna="text-blue-600" />
                <KartuStat label="Jumlah Area" nilai={stats.lokasi} warna="text-orange-600" />
                <KartuStat label="Exp ≤ 30 Hari" nilai={stats.soonExp} warna="text-amber-600" tekanan={stats.soonExp > 0} />
            </div>

            {stats.expired > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full border border-red-200 shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-red-800">{stats.expired} alat sertifikatnya EXPIRED atau belum ada</h4>
                        <p className="text-sm text-red-600">Segera perbarui sertifikasi sebelum alat digunakan.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-2 flex-1 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input placeholder="Cari no registrasi, jenis, area, PIC..." className="pl-9"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={jenisAlat} onValueChange={setJenisAlat}>
                        <SelectTrigger className="w-[190px]"><SelectValue placeholder="Jenis Alat" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Jenis</SelectItem>
                            {opsiJenis.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={areaLokasi} onValueChange={setAreaLokasi}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Area" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Area</SelectItem>
                            {opsiArea.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="AKTIF">Aktif</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <Button variant="outline" onClick={() => setIsGrouped(!isGrouped)} className="flex-1 lg:flex-none">
                        {isGrouped ? <List className="w-4 h-4 mr-2" /> : <LayoutGrid className="w-4 h-4 mr-2" />}
                        {isGrouped ? "Tampilan Datar" : "Kelompokkan"}
                    </Button>
                    <Button variant="secondary" onClick={() => setImportOpen(true)} className="flex-1 lg:flex-none">
                        <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`${API}/export`)} className="flex-1 lg:flex-none">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button onClick={() => { setEditing(null); setFormOpen(true); }}
                        className="bg-red-600 hover:bg-red-700 text-white flex-1 lg:flex-none">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Alat
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                {!isGrouped && <TableHead className="w-12 text-center">No</TableHead>}
                                <TableHead>No. Registrasi</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>SWL</TableHead>
                                <TableHead>Area</TableHead>
                                <TableHead>PIC</TableHead>
                                <TableHead>Exp Sertifikat</TableHead>
                                <TableHead className="text-center">Sisa Masa Berlaku</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-500">Memuat data peralatan...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-500">Tidak ada data ditemukan.</TableCell></TableRow>
                            ) : isGrouped ? (
                                Object.entries(grouped!).map(([nama, isi]) => (
                                    <BarisGrup key={nama} nama={nama} items={isi} statusText={statusText}
                                        onEdit={(u: any) => { setEditing(u); setFormOpen(true); }} onHapus={setHapusTarget} />
                                ))
                            ) : (
                                items.map((item: any, i: number) => (
                                    <BarisAlat key={item.id} item={item} idx={i + 1} statusText={statusText}
                                        onEdit={(u: any) => { setEditing(u); setFormOpen(true); }} onHapus={setHapusTarget} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {formOpen && (
                <DialogForm
                    item={editing}
                    onClose={() => setFormOpen(false)}
                    onSuccess={() => { setFormOpen(false); refetch(); }}
                    onRefresh={refetch}
                />
            )}
            {importOpen && (
                <DialogImport onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); refetch(); }} />
            )}

            <AlertDialog open={!!hapusTarget} onOpenChange={(o) => !o && setHapusTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus alat ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {hapusTarget?.noRegistrasi} — {hapusTarget?.jenisAlat}. Data yang dihapus tidak bisa dikembalikan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={hapus} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function KartuStat({ label, nilai, warna, tekanan }: any) {
    return (
        <Card className={tekanan ? "border-red-200" : ""}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${warna}`}>{nilai}</p>
            </CardContent>
        </Card>
    );
}

function BarisAlat({ item, idx, statusText, onEdit, onHapus }: any) {
    const teks = statusText(item);
    const merah = teks === "EXPIRED" || teks === "BELUM ADA";
    return (
        <TableRow className="hover:bg-gray-50/80 transition-colors">
            {idx && <TableCell className="text-center text-gray-500">{idx}</TableCell>}
            <TableCell className="font-bold text-slate-800">{item.noRegistrasi}</TableCell>
            <TableCell className="text-slate-600 text-xs font-medium">{item.jenisAlat}</TableCell>
            <TableCell className="text-slate-600">{item.swl || "-"}</TableCell>
            <TableCell className="text-slate-600 font-medium">{item.areaLokasi || "-"}</TableCell>
            <TableCell className="text-slate-600 text-xs">{item.pic || "-"}</TableCell>
            <TableCell className="text-slate-600 text-xs">
                {item.expSertifikat ? format(new Date(item.expSertifikat), "dd MMM yyyy") : "-"}
            </TableCell>
            <TableCell className="p-0">
                <div className={`flex items-center justify-center p-2 min-h-[40px] text-xs font-bold ${merah ? "bg-red-600 text-white" : "text-emerald-600"}`}>
                    {teks}
                </div>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-amber-600"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onHapus(item)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function BarisGrup({ nama, items, statusText, onEdit, onHapus }: any) {
    const [buka, setBuka] = useState(true);
    return (
        <>
            <TableRow className="bg-slate-100 hover:bg-slate-200 cursor-pointer" onClick={() => setBuka(!buka)}>
                <TableCell colSpan={9} className="py-2 px-4">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                        {buka ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Wrench className="w-4 h-4 text-slate-500" />
                        {nama}
                        <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-700">{items.length} Alat</Badge>
                    </div>
                </TableCell>
            </TableRow>
            {buka && items.map((item: any) => (
                <BarisAlat key={item.id} item={item} statusText={statusText} onEdit={onEdit} onHapus={onHapus} />
            ))}
        </>
    );
}

function DialogForm({ item, onClose, onSuccess, onRefresh }: any) {
    const { toast } = useToast();
    const [simpan, setSimpan] = useState(false);
    // Alat baru belum punya id → filenya ditahan di sini, diunggah setelah tersimpan.
    const [fileTertunda, setFileTertunda] = useState<File | null>(null);
    const [f, setF] = useState({
        jenisAlat: kosongkan(item?.jenisAlat),
        noRegistrasi: kosongkan(item?.noRegistrasi),
        pic: kosongkan(item?.pic),
        areaLokasi: kosongkan(item?.areaLokasi),
        swl: kosongkan(item?.swl),
        tglSertifikat: tglInput(item?.tglSertifikat),
        expSertifikat: tglInput(item?.expSertifikat),
        evidenceUrl: kosongkan(item?.evidenceUrl),
        keterangan: kosongkan(item?.keterangan),
    });
    const ubah = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

    const kirim = async () => {
        if (!f.jenisAlat.trim() || !f.noRegistrasi.trim()) {
            toast({ title: "Belum lengkap", description: "Jenis alat dan No. Registrasi wajib diisi.", variant: "destructive" });
            return;
        }
        setSimpan(true);
        try {
            // URL pratinjau lokal (blob:) tidak boleh ikut tersimpan ke database.
            const muatan = { ...f, evidenceUrl: f.evidenceUrl.startsWith("blob:") ? "" : f.evidenceUrl };
            const res = await fetch(item ? `${API}/${item.id}` : API, {
                method: item ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(muatan),
            });
            const tersimpan = await res.json();
            if (!res.ok) throw new Error(tersimpan.error || "Gagal menyimpan");

            if (fileTertunda && tersimpan?.id) {
                const fd = new FormData();
                fd.append("file", fileTertunda);
                const up = await fetch(`${API}/${tersimpan.id}/evidence`, { method: "POST", body: fd });
                if (!up.ok) {
                    toast({ title: "Data tersimpan, foto gagal", description: "Alat sudah masuk. Coba unggah fotonya lagi lewat tombol ubah.", variant: "destructive" });
                }
            }
            toast({ title: "Tersimpan", description: `${f.noRegistrasi} berhasil disimpan.` });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        } finally {
            setSimpan(false);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{item ? "Ubah Peralatan" : "Tambah Peralatan"}</DialogTitle>
                    <DialogDescription>Peralatan tidak bergerak — jack, compressor, impact, dan sejenisnya.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                    <Isian label="Jenis Alat *" nilai={f.jenisAlat} onUbah={(v) => ubah("jenisAlat", v)} contoh="HIDRAULIC JACK" />
                    <Isian label="No. Registrasi *" nilai={f.noRegistrasi} onUbah={(v) => ubah("noRegistrasi", v)} contoh="HJ-01" />
                    <Isian label="PIC" nilai={f.pic} onUbah={(v) => ubah("pic", v)} contoh="Nama / perusahaan" />
                    <Isian label="Area" nilai={f.areaLokasi} onUbah={(v) => ubah("areaLokasi", v)} contoh="Workshop GECL" />
                    <Isian label="SWL" nilai={f.swl} onUbah={(v) => ubah("swl", v)} contoh="10 Ton / 200 Psi" />
                    <Isian label="Tanggal Sertifikasi" tipe="date" nilai={f.tglSertifikat} onUbah={(v) => ubah("tglSertifikat", v)} />
                    <Isian label="Expired Sertifikasi" tipe="date" nilai={f.expSertifikat} onUbah={(v) => ubah("expSertifikat", v)} />
                    <div className="md:col-span-2">
                        <Isian label="Keterangan" nilai={f.keterangan} onUbah={(v) => ubah("keterangan", v)} />
                    </div>
                    <div className="md:col-span-2">
                        <IsianEvidence
                            itemId={item?.id}
                            evidenceUrl={f.evidenceUrl}
                            onUbah={(v: string) => ubah("evidenceUrl", v)}
                            onFileTertunda={setFileTertunda}
                            onRefresh={onRefresh}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={simpan}>Batal</Button>
                    <Button onClick={kirim} disabled={simpan} className="bg-red-600 hover:bg-red-700">
                        {simpan && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Unggah foto evidence. Alat BARU belum punya id, jadi fotonya ditahan dulu di sini
// dan diunggah setelah data tersimpan (lihat kirim() di DialogForm).
function IsianEvidence({ itemId, evidenceUrl, onUbah, onFileTertunda, onRefresh }: any) {
    const { toast } = useToast();
    const [naik, setNaik] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const pilihFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!itemId) {
            // Alat baru: tampilkan pratinjau lokal, unggah menyusul setelah Simpan.
            onFileTertunda?.(file);
            onUbah(URL.createObjectURL(file));
            return;
        }
        setNaik(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${API}/${itemId}/evidence`, { method: "POST", body: fd });
            const hasil = await res.json();
            if (!res.ok) throw new Error(hasil.error || "Gagal mengunggah");
            onUbah(hasil.evidenceUrl);
            onRefresh?.();   // segarkan daftar induk agar tak memuat data basi
            toast({ title: "Foto terunggah", description: "Evidence tersimpan di database." });
        } catch (err: any) {
            toast({ title: "Gagal mengunggah", description: err.message, variant: "destructive" });
        } finally {
            setNaik(false);
        }
    };

    const hapusFoto = async () => {
        if (itemId && evidenceUrl?.startsWith("/api/uploads/")) {
            try { await fetch(`${API}/${itemId}/evidence`, { method: "DELETE" }); } catch { /* diabaikan */ }
        }
        onUbah("");
        onFileTertunda?.(null);
        onRefresh?.();
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Foto Evidence (sertifikat / alat)</Label>
            {evidenceUrl ? (
                <div className="flex items-center gap-3 rounded-lg border p-2">
                    <img src={evidenceUrl} alt="Evidence" className="h-20 w-28 rounded object-cover border" />
                    <div className="flex-1 text-xs text-slate-500">
                        {evidenceUrl.startsWith("blob:") ? "Foto akan diunggah saat disimpan." : "Tersimpan di database."}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={hapusFoto} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-1" /> Hapus
                    </Button>
                </div>
            ) : (
                <div className="rounded-lg border border-dashed p-3 text-center">
                    <ImageIcon className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="text-xs text-slate-500 mb-2">Belum ada foto — maksimal 10 MB, format gambar.</p>
                    <Button type="button" variant="outline" size="sm" disabled={naik} onClick={() => fileRef.current?.click()}>
                        {naik ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Pilih Foto
                    </Button>
                </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pilihFile} />
        </div>
    );
}

function Isian({ label, nilai, onUbah, contoh, tipe = "text" }: any) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">{label}</Label>
            <Input type={tipe} value={nilai} placeholder={contoh} onChange={(e) => onUbah(e.target.value)} />
        </div>
    );
}

function DialogImport({ onClose, onSuccess }: any) {
    const { toast } = useToast();
    const [proses, setProses] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const kirim = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) {
            toast({ title: "Pilih file dulu", description: "Format .xlsx dari Database Peralatan.", variant: "destructive" });
            return;
        }
        setProses(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${API}/import`, { method: "POST", body: fd });
            const hasil = await res.json();
            if (!res.ok) throw new Error(hasil.error || "Gagal mengimpor");
            toast({ title: "Impor selesai", description: `${hasil.imported} alat masuk/diperbarui, ${hasil.skipped} baris dilewati.` });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Impor gagal", description: e.message, variant: "destructive" });
        } finally {
            setProses(false);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Excel</DialogTitle>
                    <DialogDescription>
                        Butuh kolom <b>JENIS</b> dan <b>No. Reg</b>. Data dicocokkan per No. Registrasi —
                        yang sudah ada diperbarui, tidak digandakan. Foto evidence yang sudah diunggah tidak tertimpa.
                    </DialogDescription>
                </DialogHeader>
                <Input ref={fileRef} type="file" accept=".xlsx,.xls" />
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={proses}>Batal</Button>
                    <Button onClick={kirim} disabled={proses} className="bg-red-600 hover:bg-red-700">
                        {proses && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
