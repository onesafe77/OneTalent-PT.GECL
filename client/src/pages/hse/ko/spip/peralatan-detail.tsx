import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { differenceInMonths, differenceInDays } from "date-fns";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const statusUnitColors: Record<string, string> = {
    "ACTIVE": "bg-green-100 text-green-700",
    "SPARE": "bg-yellow-100 text-yellow-700",
    "DISMANTLED": "bg-gray-100 text-gray-700",
};

const statusCommColors: Record<string, string> = {
    "ACTIVE": "bg-green-100 text-green-700",
    "NEAR EXPIRED": "bg-yellow-100 text-yellow-700",
    "EXPIRED": "bg-red-100 text-red-700",
    "CLOSE": "bg-green-100 text-green-700",
    "OPEN": "bg-orange-100 text-orange-700",
};

function getExpiryText(dateString: string | null | undefined) {
    if (!dateString) return null;
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    if (diffTime < 0) return <span className="text-red-500 text-xs mt-1 block font-semibold">Sudah Expired</span>;
    if (diffTime === 0) return <span className="text-orange-500 text-xs mt-1 block font-semibold">Berakhir Hari Ini</span>;

    const months = differenceInMonths(target, today);
    const dateAfterMonths = new Date(today);
    dateAfterMonths.setMonth(dateAfterMonths.getMonth() + months);
    const days = differenceInDays(target, dateAfterMonths);

    let parts = [];
    if (months > 0) parts.push(`${months} Bulan`);
    if (days > 0) parts.push(`${days} Hari`);

    return <span className="text-blue-600 text-xs mt-1 block font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Sisa Waktu: {parts.join(" ")}</span>;
}

const formSchema = z.object({
    jenisSpip: z.string().default("PERALATAN"),
    jenisUnit: z.string().min(1, "Wajib diisi"),
    merk: z.string().min(1, "Wajib diisi"),
    type: z.string().min(1, "Wajib diisi"),
    noLambung: z.string().min(1, "Wajib diisi"),
    noPolisi: z.string().optional().nullable(),
    noRangka: z.string().optional().nullable(),
    noMesin: z.string().optional().nullable(),
    tahunPembuatan: z.coerce.number().optional().nullable(),
    gandar: z.coerce.number().default(4),
    volumeVessel: z.coerce.number().optional().nullable(),
    tare: z.coerce.number().optional().nullable(),
    aebs: z.string().optional().nullable(),
    tglPengajuanBib: z.string().optional().nullable(),
    expiredBib: z.string().optional().nullable(),
    statusBib: z.string().optional().nullable(),
    expiredTia: z.string().optional().nullable(),
    statusTia: z.string().optional().nullable(),
    noTma: z.string().optional().nullable(),
    statusTma: z.string().optional().nullable(),
    statusUnit: z.string().default("ACTIVE"),
    owner: z.string().optional().nullable(),
    namaPic: z.string().optional().nullable(),
    nikKtp: z.string().optional().nullable(),
    kepemilikan: z.string().optional().nullable(),
    noKontak: z.string().optional().nullable(),
    komisioner: z.string().optional().nullable(),
    keterangan: z.string().optional().nullable(),
});
type FormData = z.infer<typeof formSchema>;

export function PeralatanFormPage() {
    const [, navigate] = useLocation();
    const [matchTambah] = useRoute("/workspace/hse/ko/spip/peralatan/tambah");
    const [matchEdit, paramsEdit] = useRoute("/workspace/hse/ko/spip/peralatan/:id/edit");
    const id = paramsEdit?.id;
    const isEdit = !!matchEdit && !!id;

    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("identitas");

    const { data: unitData, isLoading } = useQuery<any>({
        queryKey: ["/api/spip/peralatan", id],
        queryFn: async () => {
            const res = await fetch(`/api/spip/peralatan/${id}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
        enabled: isEdit,
    });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            jenisSpip: "PERALATAN",
            jenisUnit: "DT - KONVENSIONAL",
            merk: "XCMG",
            type: "",
            noLambung: "",
            gandar: 4,
            statusUnit: "ACTIVE",
        }
    });

    useEffect(() => {
        if (unitData && !unitData.error && isEdit) {
            form.reset({
                ...unitData,
                tglPengajuanBib: unitData.tglPengajuanBib ? new Date(unitData.tglPengajuanBib).toISOString().split('T')[0] : "",
                expiredBib: unitData.expiredBib ? new Date(unitData.expiredBib).toISOString().split('T')[0] : "",
                expiredTia: unitData.expiredTia ? new Date(unitData.expiredTia).toISOString().split('T')[0] : "",
            });
        }
    }, [unitData, isEdit, form]);

    const watchExpiredBib = form.watch("expiredBib");
    const watchTglBib = form.watch("tglPengajuanBib");
    const watchExpiredTia = form.watch("expiredTia");

    useEffect(() => {
        if (watchExpiredBib) {
            const expDate = new Date(watchExpiredBib);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffTime = expDate.getTime() - today.getTime();
            if (diffTime < 0) {
                form.setValue("statusBib", "EXPIRED");
            } else {
                const months = differenceInMonths(expDate, today);
                form.setValue("statusBib", months < 2 ? "NEAR EXPIRED" : "ACTIVE");
            }
        } else if (watchTglBib) {
            form.setValue("statusBib", "OPEN");
        } else {
            form.setValue("statusBib", "");
        }
    }, [watchExpiredBib, watchTglBib]);

    useEffect(() => {
        if (watchExpiredTia) {
            const expDate = new Date(watchExpiredTia);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const diffTime = expDate.getTime() - today.getTime();
            if (diffTime < 0) {
                form.setValue("statusTia", "EXPIRED");
            } else {
                const months = differenceInMonths(expDate, today);
                form.setValue("statusTia", months < 2 ? "NEAR EXPIRED" : "ACTIVE");
            }
        } else {
            form.setValue("statusTia", "");
        }
    }, [watchExpiredTia]);

    const handleDelete = async () => {
        try {
            await apiRequest(`/api/spip/peralatan/${id}`, "DELETE");
            queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan"] });
            queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan/all"] });
            toast({ title: "Unit berhasil dihapus" });
            navigate("/workspace/hse/ko/spip/peralatan");
        } catch (e: any) {
            toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            const url = isEdit ? `/api/spip/peralatan/${id}` : "/api/spip/peralatan";
            const method = isEdit ? "PUT" : "POST";
            const payload = { ...data };
            if (!payload.tglPengajuanBib) delete payload.tglPengajuanBib;
            if (!payload.expiredBib) delete payload.expiredBib;
            if (!payload.expiredTia) delete payload.expiredTia;

            await apiRequest(url, method, payload);
            queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan"] });
            queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan/all"] });
            toast({ title: isEdit ? "Data diperbarui" : "Data ditambahkan" });
            navigate("/workspace/hse/ko/spip/peralatan");
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-red-600" /></div>;

    const unit = isEdit ? unitData : null;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center gap-4 border-b pb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/hse/ko/spip/peralatan")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{isEdit ? "Edit Unit Peralatan" : "Tambah Unit Peralatan Baru"}</h1>
                    <p className="text-gray-500">Lengkapi informasi spesifikasi dan komisioning unit di bawah ini.</p>
                </div>
            </div>

            <form id="peralatan-form" onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                        <TabsTrigger value="identitas">Identitas Unit</TabsTrigger>
                        <TabsTrigger value="spesifikasi">Spesifikasi Vessel</TabsTrigger>
                        <TabsTrigger value="komisioning">Komisioning</TabsTrigger>
                        <TabsTrigger value="kepemilikan">Kepemilikan</TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        <TabsContent value="identitas" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Jenis SPIP</Label>
                                    <Input disabled value="PERALATAN" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jenis Unit <span className="text-red-500">*</span></Label>
                                    <Select value={form.watch("jenisUnit")} onValueChange={(v) => form.setValue("jenisUnit", v)}>
                                        <SelectTrigger><SelectValue placeholder="Pilih Jenis Unit" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DT - ELECTRIC VEHICLE">DT - ELECTRIC VEHICLE</SelectItem>
                                            <SelectItem value="DT - KONVENSIONAL">DT - KONVENSIONAL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Merk <span className="text-red-500">*</span></Label>
                                    <Select value={form.watch("merk")} onValueChange={(v) => form.setValue("merk", v)}>
                                        <SelectTrigger><SelectValue placeholder="Pilih Merk" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="XCMG">XCMG</SelectItem>
                                            <SelectItem value="FAW">FAW</SelectItem>
                                            <SelectItem value="DONGFENG">DONGFENG</SelectItem>
                                            <SelectItem value="SHACMAN">SHACMAN</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Type Unit <span className="text-red-500">*</span></Label>
                                    <Input {...form.register("type")} placeholder="E.g. XG90..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>No Lambung <span className="text-red-500">*</span></Label>
                                    <Input {...form.register("noLambung")} placeholder="DT GECL XXXX" />
                                    {form.formState.errors.noLambung && <p className="text-xs text-red-500">{form.formState.errors.noLambung.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>No Polisi</Label>
                                    <Input {...form.register("noPolisi")} placeholder="B 1234 CD" />
                                </div>
                                <div className="space-y-2">
                                    <Label>No Rangka</Label>
                                    <Input {...form.register("noRangka")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>No Mesin</Label>
                                    <Input {...form.register("noMesin")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tahun Pembuatan</Label>
                                    <Input type="number" {...form.register("tahunPembuatan")} placeholder="2024" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gandar</Label>
                                    <Input type="number" {...form.register("gandar")} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>AEBS</Label>
                                    <Select value={form.watch("aebs") || ""} onValueChange={(v) => form.setValue("aebs", v)}>
                                        <SelectTrigger><SelectValue placeholder="Sistem AEBS" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Vixmo">Vixmo</SelectItem>
                                            <SelectItem value="Pabrikan">Pabrikan</SelectItem>
                                            <SelectItem value="Tidak Ada">Tidak Ada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="spesifikasi" className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm mb-4">
                                Catatan otomatis: DT-EV biasanya = 54.6 M³ | Konvensional = lihat dokumen STNK.
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Volume Vessel (M³)</Label>
                                    <Input type="number" step="0.01" {...form.register("volumeVessel")} placeholder="e.g. 54.6" />
                                </div>
                                <div className="space-y-2">
                                    <Label>TARE / Berat Kosongan (Kg)</Label>
                                    <Input type="number" step="0.01" {...form.register("tare")} placeholder="e.g. 15000" />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="komisioning" className="space-y-6">
                            <div className="border rounded-md p-4 space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">BIB - Binuang Mitra Bersama</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tgl Pengajuan BIB</Label>
                                        <Input type="date" {...form.register("tglPengajuanBib")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Expired STIKER BIB</Label>
                                        <Input type="date" {...form.register("expiredBib")} />
                                        {getExpiryText(form.watch("expiredBib"))}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status BIB</Label>
                                        <div className="h-10 border rounded-md px-3 py-2 bg-gray-50 flex items-center">
                                            <span className={`text-xs font-semibold ${statusCommColors[form.watch("statusBib") || ""] || "text-gray-500"}`}>
                                                {form.watch("statusBib") || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-md p-4 space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">TIA</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Expired STIKER TIA</Label>
                                        <Input type="date" {...form.register("expiredTia")} />
                                        {getExpiryText(form.watch("expiredTia"))}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status TIA</Label>
                                        <div className="h-10 border rounded-md px-3 py-2 bg-gray-50 flex items-center">
                                            <span className={`text-xs font-semibold ${statusCommColors[form.watch("statusTia") || ""] || "text-gray-500"}`}>
                                                {form.watch("statusTia") || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-md p-4 space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">TMA</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>No TMA</Label>
                                        <Input {...form.register("noTma")} placeholder="Nomor TMA..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status TMA</Label>
                                        <Select value={form.watch("statusTma") || ""} onValueChange={(v) => form.setValue("statusTma", v)}>
                                            <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CLOSE">CLOSE</SelectItem>
                                                <SelectItem value="OPEN">OPEN</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="kepemilikan" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Status Unit <span className="text-red-500">*</span></Label>
                                    <Select value={form.watch("statusUnit")} onValueChange={(v) => form.setValue("statusUnit", v)}>
                                        <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                            <SelectItem value="SPARE">SPARE</SelectItem>
                                            <SelectItem value="DISMANTLED">DISMANTLED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pemilik (Owner)</Label>
                                    <Input {...form.register("owner")} placeholder="Nama PT / Perorangan" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama PIC</Label>
                                    <Input {...form.register("namaPic")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>NIK KTP</Label>
                                    <Input {...form.register("nikKtp")} placeholder="16 digit..." maxLength={16} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kepemilikan</Label>
                                    <Select value={form.watch("kepemilikan") || ""} onValueChange={(v) => form.setValue("kepemilikan", v)}>
                                        <SelectTrigger><SelectValue placeholder="Jenis Kepemilikan" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STNK">STNK</SelectItem>
                                            <SelectItem value="FAKTUR">FAKTUR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>No Kontak</Label>
                                    <Input {...form.register("noKontak")} placeholder="0812345678" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Komisioner</Label>
                                    <Input {...form.register("komisioner")} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Keterangan Tambahan</Label>
                                    <Textarea {...form.register("keterangan")} />
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </form>

            <div className="flex justify-between items-center pt-6 border-t">
                {isEdit ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Unit
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Unit Peralatan</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus unit <strong>{form.watch("noLambung")}</strong> secara permanen? Data yang sudah dihapus tidak dapat dikembalikan.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus Permanen</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ) : <div />}

                <div className="flex gap-3">
                    <Button variant="outline" type="button" onClick={() => navigate("/workspace/hse/ko/spip/peralatan")}>Batal</Button>
                    <Button form="peralatan-form" type="submit" className="bg-red-600 hover:bg-red-700">Simpan Data</Button>
                </div>
            </div>
        </div>
    );
}

const computeDisplayStatus = (dateString: string | null | undefined, rawStatus: string | null | undefined) => {
    if (!dateString) return rawStatus || "-";
    const expDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    if (diffTime < 0) return "EXPIRED";

    const months = differenceInMonths(expDate, today);
    return months < 2 ? "NEAR EXPIRED" : "ACTIVE";
};

export function PeralatanViewPage() {
    const [, navigate] = useLocation();
    const [match, params] = useRoute("/workspace/hse/ko/spip/peralatan/:id");
    const id = params?.id;

    const { data: unit, isLoading } = useQuery<any>({
        queryKey: ["/api/spip/peralatan", id],
        queryFn: async () => {
            const res = await fetch(`/api/spip/peralatan/${id}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        },
        enabled: !!id,
    });

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-red-600" /></div>;
    if (!unit || unit.error) return <div className="p-8 text-center text-red-500">Data tidak ditemukan.</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/hse/ko/spip/peralatan")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {unit.noLambung}
                            <Badge variant="outline" className={`${statusUnitColors[unit.statusUnit] || "bg-gray-100"}`}>
                                {unit.statusUnit}
                            </Badge>
                        </h1>
                        <p className="mt-1 text-base text-gray-500">
                            {unit.jenisUnit} | {unit.merk} {unit.type}
                        </p>
                    </div>
                </div>
                <Button onClick={() => navigate(`/workspace/hse/ko/spip/peralatan/${unit.id}/edit`)} className="bg-red-600 hover:bg-red-700">
                    Edit Data
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-6">
                {/* Details sections... similar to ModalDetailPeralatan */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-1 uppercase tracking-wider">Spesifikasi Vessel</h3>
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                            <div><p className="text-xs text-gray-500">Volume (M³)</p><p className="font-semibold">{unit.volumeVessel || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">TARE (Kg)</p><p className="font-semibold">{unit.tare || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">Gandar</p><p className="font-semibold">{unit.gandar || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">Tahun Pembuatan</p><p className="font-semibold">{unit.tahunPembuatan || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">No Rangka</p><p className="font-semibold break-all">{unit.noRangka || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">No Mesin</p><p className="font-semibold break-all">{unit.noMesin || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">No Polisi</p><p className="font-semibold break-all">{unit.noPolisi || "-"}</p></div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-1 uppercase tracking-wider">Komisioning</h3>
                        <div className="space-y-4">
                            <div className="bg-blue-50/50 p-4 rounded-md space-y-3">
                                <h4 className="font-semibold text-blue-900 border-b border-blue-100 pb-1">BIB</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><p className="text-xs text-gray-500">Tgl Pengajuan</p><p className="font-semibold text-sm">{unit.tglPengajuanBib ? new Date(unit.tglPengajuanBib).toLocaleDateString('id-ID') : "-"}</p></div>
                                    <div>
                                        <p className="text-xs text-gray-500">Expired Stiker</p>
                                        <p className="font-semibold text-sm">{unit.expiredBib ? new Date(unit.expiredBib).toLocaleDateString('id-ID') : "-"}</p>
                                        <div className="mt-1">{getExpiryText(unit.expiredBib)}</div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        {computeDisplayStatus(unit.expiredBib, unit.statusBib) ? (
                                            <Badge variant="outline" className={`${statusCommColors[computeDisplayStatus(unit.expiredBib, unit.statusBib) as string] || "bg-gray-100 text-gray-700"} text-[10px]`}>{computeDisplayStatus(unit.expiredBib, unit.statusBib)}</Badge>
                                        ) : <p className="font-semibold text-sm">-</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50/50 p-4 rounded-md space-y-3">
                                <h4 className="font-semibold text-purple-900 border-b border-purple-100 pb-1">TIA</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Expired Stiker</p>
                                        <p className="font-semibold text-sm">{unit.expiredTia ? new Date(unit.expiredTia).toLocaleDateString('id-ID') : "-"}</p>
                                        <div className="mt-1">{getExpiryText(unit.expiredTia)}</div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        {computeDisplayStatus(unit.expiredTia, unit.statusTia) ? (
                                            <Badge variant="outline" className={`${statusCommColors[computeDisplayStatus(unit.expiredTia, unit.statusTia) as string] || "bg-gray-100 text-gray-700"} text-[10px]`}>{computeDisplayStatus(unit.expiredTia, unit.statusTia)}</Badge>
                                        ) : <p className="font-semibold text-sm">-</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-1 uppercase tracking-wider">Kepemilikan</h3>
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                            <div className="col-span-2"><p className="text-xs text-gray-500">Owner</p><p className="font-semibold">{unit.owner || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">Nama PIC</p><p className="font-semibold">{unit.namaPic || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">No Kontak</p><p className="font-semibold">{unit.noKontak || "-"}</p></div>
                            <div className="col-span-2"><p className="text-xs text-gray-500">NIK KTP</p><p className="font-semibold">{unit.nikKtp || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">Bentuk Kepemilikan</p><p className="font-semibold">{unit.kepemilikan || "-"}</p></div>
                            <div><p className="text-xs text-gray-500">Komisioner</p><p className="font-semibold">{unit.komisioner || "-"}</p></div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-1 uppercase tracking-wider">Informasi Lain</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <p className="text-xs text-gray-500 mb-1">AEBS</p>
                            <p className="font-semibold mb-3">{unit.aebs || "-"}</p>

                            <p className="text-xs text-gray-500 mb-1">Keterangan</p>
                            <p className="text-sm italic text-gray-700 bg-white border rounded p-2 min-h-20">{unit.keterangan || "Tidak ada keterangan."}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
