import React, { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
    ArrowLeft,
    Clock,
    Trash2,
    MapPin,
    CheckCircle2,
    AlertCircle,
    Database,
    Bell,
    Car,
    FileImage,
    LayoutGrid,
    Building2,
    CalendarDays,
    Settings,
    ExternalLink,
    Loader2,
    Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

// Helper for GPS Parsing
const parseCoord = (coord: string) => {
    if (!coord) return { lat: null, lng: null };
    try {
        const parts = coord.split(',').map(p => p.trim());
        let lat = null, lng = null;
        for (const part of parts) {
            const cleanPart = part.replace(/[^0-9,.]/g, '').replace(/,/g, '.').trim();
            if (!cleanPart) continue;

            let val = parseFloat(cleanPart);
            if (isNaN(val)) continue;

            if (part.includes('S') || part.includes('N')) {
                if (part.includes('S')) val = -val;
                lat = val;
            } else if (part.includes('E') || part.includes('W')) {
                if (part.includes('W')) val = -val;
                lng = val;
            }
        }
        return { lat, lng };
    } catch (e) {
        return { lat: null, lng: null };
    }
};

const formSchema = z.object({
    jenisSpip: z.string().default("PRASARANA"),
    jenisUnit: z.string().min(1, "Wajib diisi"),
    noLambung: z.string().min(1, "Wajib diisi"),
    koordinat: z.string().optional().nullable(),
    koordinatLat: z.coerce.number().optional().nullable(),
    koordinatLng: z.coerce.number().optional().nullable(),
    merk: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    kapasitas: z.string().optional().nullable(),
    areaLokasi: z.string().min(1, "Wajib diisi"),
    tahunPembuatan: z.coerce.number().optional().nullable(),
    komisioner: z.string().optional().nullable(),
    noSertifikat: z.string().optional().nullable(),
    tglSertifikat: z.string().optional().nullable(),
    expSertifikat: z.string().optional().nullable(),
    jadwalPerawatanS1: z.string().optional().nullable(),
    statusPerawatanS1: z.string().default("PENDING"),
    jadwalPerawatanS2: z.string().optional().nullable(),
    statusPerawatanS2: z.string().default("PENDING"),
    keterangan: z.string().optional().nullable(),
    statusUnit: z.string().default("AKTIF"),
});

type FormData = z.infer<typeof formSchema>;

export function PrasaranaFormPage({ id }: { id?: string }) {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const isEdit = !!id;

    const { data: unitData, isLoading } = useQuery<any>({
        queryKey: ["/api/spip/prasarana", id],
        queryFn: async () => {
            const res = await fetch(`/api/spip/prasarana/${id}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
        enabled: isEdit,
    });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            jenisSpip: "PRASARANA",
            statusPerawatanS1: "PENDING",
            statusPerawatanS2: "PENDING",
            statusUnit: "AKTIF",
        }
    });

    // Isi form sekali per unit saja; refetch setelah Simpan tidak boleh
    // menimpa ketikan user yang belum tersimpan.
    const sudahIsiUntukId = useRef<string | null>(null);
    useEffect(() => {
        if (unitData && isEdit && sudahIsiUntukId.current !== unitData.id) {
            sudahIsiUntukId.current = unitData.id;
            form.reset({
                ...unitData,
                tglSertifikat: unitData.tglSertifikat ? new Date(unitData.tglSertifikat).toISOString().split('T')[0] : "",
                expSertifikat: unitData.expSertifikat ? new Date(unitData.expSertifikat).toISOString().split('T')[0] : "",
                jadwalPerawatanS1: unitData.jadwalPerawatanS1 ? new Date(unitData.jadwalPerawatanS1).toISOString().split('T')[0] : "",
                jadwalPerawatanS2: unitData.jadwalPerawatanS2 ? new Date(unitData.jadwalPerawatanS2).toISOString().split('T')[0] : "",
            });
        }
    }, [unitData, isEdit, form]);

    const watchCoord = form.watch("koordinat");
    useEffect(() => {
        if (watchCoord) {
            const { lat, lng } = parseCoord(watchCoord);
            form.setValue("koordinatLat", lat);
            form.setValue("koordinatLng", lng);
        }
    }, [watchCoord, form]);

    const onSubmit = async (data: FormData) => {
        try {
            const url = isEdit ? `/api/spip/prasarana/${id}` : "/api/spip/prasarana";
            const method = isEdit ? "PUT" : "POST";

            // Clean dates and convert empty strings to null
            const payload = { ...data };
            const dateFields = ['tglSertifikat', 'expSertifikat', 'jadwalPerawatanS1', 'jadwalPerawatanS2'];
            dateFields.forEach(field => {
                if (!(payload as any)[field]) {
                    (payload as any)[field] = null;
                }
            });

            await apiRequest(url, method, payload);
            queryClient.invalidateQueries({ queryKey: ["/api/spip/prasarana"] });
            if (isEdit) {
                // Tetap di halaman edit setelah update (tidak balik ke daftar)
                toast({ title: "Data diperbarui" });
            } else {
                toast({ title: "Data ditambahkan" });
                navigate("/workspace/hse/ko/spip/prasarana");
            }
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-red-600" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center gap-4 border-b pb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/hse/ko/spip/prasarana")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{isEdit ? "Edit Unit Prasarana" : "Tambah Prasarana Baru"}</h1>
                    <p className="text-muted-foreground">Lengkapi data prasarana dan sertifikat kelayakan.</p>
                </div>
            </div>

            <form id="prasarana-form" onSubmit={form.handleSubmit(onSubmit, (e: any) => { const k = Object.keys(e)[0]; toast({ title: "Data belum lengkap", description: `Periksa kolom "${k}": ${e[k]?.message || "wajib diisi"}.`, variant: "destructive" }); })} className="space-y-8">
                <Tabs defaultValue="identitas" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                        <TabsTrigger value="identitas">Identitas Fasilitas</TabsTrigger>
                        <TabsTrigger value="sertifikasi">Sertifikasi & Pengujian</TabsTrigger>
                        <TabsTrigger value="perawatan">Jadwal Perawatan</TabsTrigger>
                    </TabsList>

                    <TabsContent value="identitas" className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jenis Unit <span className="text-red-500">*</span></Label>
                                <Input placeholder="E.g. Office GECL, Fuel Station" {...form.register("jenisUnit")} />
                            </div>
                            <div className="space-y-2">
                                <Label>No Lambung <span className="text-red-500">*</span></Label>
                                <Input placeholder="E.g. MP-001" {...form.register("noLambung")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Koordinat GPS</Label>
                                <Input placeholder="Format: 3,72°S,115,64°E" {...form.register("koordinat")} />
                                {form.watch("koordinatLat") && (
                                    <p className="text-[10px] text-blue-600 font-medium">Auto-parsed: {form.watch("koordinatLat")}, {form.watch("koordinatLng")}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Kapasitas</Label>
                                <Input placeholder="E.g. 8 RUANGAN, 1 Unit" {...form.register("kapasitas")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Area/Lokasi <span className="text-red-500">*</span></Label>
                                <Select value={form.watch("areaLokasi") || ""} onValueChange={(v) => form.setValue("areaLokasi", v)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Area" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Karang Indah">Karang Indah</SelectItem>
                                        <SelectItem value="Mekar Jaya">Mekar Jaya</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tahun Pembuatan</Label>
                                <Input type="number" {...form.register("tahunPembuatan")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Komisioner</Label>
                                <Input {...form.register("komisioner")} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="sertifikasi" className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>No. Sertifikat</Label>
                                    <Input {...form.register("noSertifikat")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Terbit Sertifikat</Label>
                                    <Input type="date" {...form.register("tglSertifikat")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal Expired (EXP)</Label>
                                    <Input type="date" {...form.register("expSertifikat")} />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-xl border flex flex-col justify-center items-center text-center">
                                <Clock className="w-12 h-12 text-gray-400 mb-2" />
                                <h4 className="font-semibold text-gray-700">Status Sertifikat</h4>
                                <div className="mt-2 font-bold text-xl uppercase tracking-wider">
                                    {!form.watch("noSertifikat") ? (
                                        <Badge variant="outline" className="text-gray-500 bg-gray-100 px-4 py-1">BELUM ADA</Badge>
                                    ) : (form.watch("expSertifikat") && new Date(form.watch("expSertifikat") as string) <= new Date()) ? (
                                        <Badge variant="outline" className="text-red-700 bg-red-100 px-4 py-1">EXPIRED</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-green-700 bg-green-100 px-4 py-1">AKTIF</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="perawatan" className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader className="bg-gray-50 pt-4 pb-4 border-b">
                                    <CardTitle className="text-sm font-bold uppercase">Semester 1</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal Perawatan S1</Label>
                                        <Input type="date" {...form.register("jadwalPerawatanS1")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status Perawatan</Label>
                                        <Select value={form.watch("statusPerawatanS1")} onValueChange={(v) => form.setValue("statusPerawatanS1", v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DONE">DONE</SelectItem>
                                                <SelectItem value="PENDING">PENDING</SelectItem>
                                                <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="bg-gray-50 pt-4 pb-4 border-b">
                                    <CardTitle className="text-sm font-bold uppercase">Semester 2</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal Perawatan S2</Label>
                                        <Input type="date" {...form.register("jadwalPerawatanS2")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status Perawatan</Label>
                                        <Select value={form.watch("statusPerawatanS2")} onValueChange={(v) => form.setValue("statusPerawatanS2", v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DONE">DONE</SelectItem>
                                                <SelectItem value="PENDING">PENDING</SelectItem>
                                                <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-2">
                            <Label>Keterangan Tambahan</Label>
                            <Textarea placeholder="Catatan khusus..." {...form.register("keterangan")} className="min-h-24" />
                        </div>
                    </TabsContent>
                </Tabs>
            </form>

            <div className="flex justify-between items-center pt-6 border-t font-semibold">
                <Button variant="outline" onClick={() => navigate("/workspace/hse/ko/spip/prasarana")}>Batal</Button>
                <Button form="prasarana-form" type="submit" className="bg-red-600 hover:bg-red-700 px-8">Simpan Data</Button>
            </div>
        </div>
    );
}

export function PrasaranaViewPage({ id }: { id: string }) {
    const [, navigate] = useLocation();

    const { data: unit, isLoading } = useQuery<any>({
        queryKey: ["/api/spip/prasarana", id],
        queryFn: async () => {
            const res = await fetch(`/api/spip/prasarana/${id}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
        enabled: !!id,
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-red-600" /></div>;
    if (!unit) return <div className="p-8 text-center text-red-500 font-bold">Data prasarana tidak ditemukan.</div>;

    const isExpired = unit.expSertifikat && new Date(unit.expSertifikat) <= new Date();

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12 font-medium">
            <div className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-5">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/hse/ko/spip/prasarana")} className="h-10 w-10">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-extrabold text-gray-900">{unit.noLambung}</h1>
                            <Badge className={`${isExpired ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'} px-3 py-1 font-bold`}>
                                {isExpired ? "EXPIRED" : "AKTIF"}
                            </Badge>
                        </div>
                        <p className="mt-1 text-lg text-gray-500 font-semibold uppercase tracking-wide">{unit.jenisUnit}</p>
                    </div>
                </div>
                <Button onClick={() => navigate(`/workspace/hse/ko/spip/prasarana/${unit.id}/edit`)} className="bg-red-600 hover:bg-red-700 font-bold">
                    Edit Data
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Identitas Card */}
                    <Card className="shadow-sm overflow-hidden border-gray-100">
                        <CardHeader className="bg-gray-50 pb-4 pt-4 border-b">
                            <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-gray-500">Identitas Fasilitas</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Lambung</p><p className="font-bold text-gray-900">{unit.noLambung}</p></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Kapasitas</p><p className="font-bold text-gray-900">{unit.kapasitas || "-"}</p></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Area / Lokasi</p><p className="font-bold text-gray-900">{unit.areaLokasi || "-"}</p></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tahun</p><p className="font-bold text-gray-900">{unit.tahunPembuatan || "-"}</p></div>
                                <div className="sm:col-span-2">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Koordinat GPS</p>
                                    {unit.koordinat ? (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${unit.koordinatLat},${unit.koordinatLng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:underline font-bold"
                                        >
                                            <MapPin className="w-4 h-4" />
                                            {unit.koordinat}
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    ) : "-"}
                                </div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Komisioner</p><p className="font-bold text-gray-900">{unit.komisioner || "-"}</p></div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sertifikasi Card */}
                    <Card className="shadow-sm overflow-hidden border-orange-100">
                        <CardHeader className="bg-orange-50 pb-4 pt-4 border-b border-orange-100">
                            <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-orange-600 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Sertifikasi & Pengujian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex flex-col gap-1 pb-4 border-b border-gray-100">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Nomor Sertifikat</p>
                                <p className="text-xl font-black text-gray-900">{unit.noSertifikat || "BELUM ADA DATA"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tgl Terbit</p><p className="font-bold">{unit.tglSertifikat ? format(new Date(unit.tglSertifikat as string), "dd MMMM yyyy", { locale: localeId }) : "-"}</p></div>
                                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Expired</p><p className={`font-bold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>{unit.expSertifikat ? format(new Date(unit.expSertifikat as string), "dd MMMM yyyy", { locale: localeId }) : "-"}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    {/* Maintenance Card */}
                    <Card className="shadow-sm overflow-hidden border-blue-100">
                        <CardHeader className="bg-blue-50 pb-4 pt-4 border-b border-blue-100">
                            <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-blue-600">Jadwal Perawatan Semesteran</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="bg-gray-50 rounded-xl p-4 border border-dashed flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Semester 1</p>
                                    <p className="font-bold text-gray-900">{unit.jadwalPerawatanS1 ? format(new Date(unit.jadwalPerawatanS1), "dd/MM/yyyy") : "Belum Dijadwalkan"}</p>
                                </div>
                                <Badge className={`${unit.statusPerawatanS1 === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} font-bold px-3 py-1`}>
                                    {unit.statusPerawatanS1 || "PENDING"}
                                </Badge>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-dashed flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Semester 2</p>
                                    <p className="font-bold text-gray-900">{unit.jadwalPerawatanS2 ? format(new Date(unit.jadwalPerawatanS2), "dd/MM/yyyy") : "Belum Dijadwalkan"}</p>
                                </div>
                                <Badge className={`${unit.statusPerawatanS2 === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} font-bold px-3 py-1`}>
                                    {unit.statusPerawatanS2 || "PENDING"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Keterangan Card */}
                    <Card className="shadow-sm overflow-hidden border-gray-100">
                        <CardHeader className="bg-gray-50 pb-4 pt-4 border-b">
                            <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-gray-500">Informasi Tambahan</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <p className="text-sm italic text-gray-700 bg-white border border-gray-100 rounded-lg p-5 min-h-32 text-justify leading-relaxed">
                                {unit.keterangan || "Tidak ada keterangan tambahan."}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// No internal shield icon needed now
