import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import {
    CalendarIcon,
    AlertTriangle,
    CheckCircle,
    Info,
    Settings,
    FileText,
    Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const formSchema = z.object({
    id: z.string().optional(),
    jenisUnit: z.string().min(1, "Jenis Unit wajib diisi"),
    noLambung: z.string().min(1, "No Lambung wajib diisi"),
    merk: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    nilaiKapasitas: z.coerce.number().optional().nullable(),
    satuanKapasitas: z.string().optional().nullable(),
    areaLokasi: z.string().min(1, "Area/Lokasi wajib diisi"),
    tahunPembuatan: z.coerce.number().optional().nullable(),
    komisioner: z.string().optional().nullable(),
    noSertifikat: z.string().optional().nullable(),
    tglSertifikat: z.string().optional().nullable(),
    expSertifikat: z.string().optional().nullable(),
    keterangan: z.string().optional().nullable(),
    statusUnit: z.string().default("AKTIF"),
});

type FormData = z.infer<typeof formSchema>;

export function ModalFormPeralatanWorkshop({ isOpen, onClose, unit, onSuccess }: any) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("identitas");

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: unit ? {
            ...unit,
            tglSertifikat: unit.tglSertifikat ? new Date(unit.tglSertifikat).toISOString().split('T')[0] : "",
            expSertifikat: unit.expSertifikat ? new Date(unit.expSertifikat).toISOString().split('T')[0] : "",
        } : {
            jenisUnit: "AIR COMPRESSORE",
            noLambung: "",
            areaLokasi: "Workshop Jam'ani",
            statusUnit: "AKTIF",
            satuanKapasitas: "psi"
        }
    });

    const watchJenis = form.watch("jenisUnit");
    const watchExp = form.watch("expSertifikat");

    // Auto-suggest prefix and unit
    useEffect(() => {
        if (!unit) {
            const suggestions: Record<string, { prefix: string, unit: string }> = {
                "AIR COMPRESSORE": { prefix: "AC-LV-", unit: "psi" },
                "STAND JACK": { prefix: "ST-", unit: "T" },
                "BOTTLE JACK": { prefix: "BJ-", unit: "T" },
                "GERINDA": { prefix: "GR-", unit: "Inc" },
                "LAS LISTRIK": { prefix: "LS-", unit: "Wat" },
                "AIR IMPACT": { prefix: "IW-", unit: "NM" },
                "AIR GREASE": { prefix: "AG-", unit: "Kg" },
                "WHEEL CHOCK": { prefix: "WC-", unit: "Kg" },
                "PALU": { prefix: "PL-", unit: "oz" },
                "MITTER SAW": { prefix: "MS-", unit: "Inc" },
                "TYER CAGE": { prefix: "TC-", unit: "-" },
            };
            const sug = suggestions[watchJenis];
            if (sug) {
                if (!form.getValues("noLambung")) form.setValue("noLambung", sug.prefix);
                form.setValue("satuanKapasitas", sug.unit);
            }
        }
    }, [watchJenis]);

    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            const method = unit ? "PUT" : "POST";
            const url = unit ? `/api/spip/peralatan/workshop/${unit.id}` : "/api/spip/peralatan/workshop";

            await apiRequest(method, url, {
                ...data,
                kapasitas: data.nilaiKapasitas ? `${data.nilaiKapasitas} ${data.satuanKapasitas}` : data.kapasitas
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan/workshop"] });
            toast({ title: unit ? "Berhasil diperbarui" : "Berhasil disimpan" });
            onSuccess();
            onClose();
        },
        onError: (err: any) => {
            toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
        }
    });

    const calculateStatus = () => {
        if (!watchExp) return { text: "EXPIRED (Tidak Ada Data)", color: "bg-red-600" };
        const exp = new Date(watchExp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (exp <= today) return { text: "EXPIRED", color: "bg-red-600" };

        const days = differenceInDays(exp, today);
        const months = Math.floor(days / 30);
        const years = Math.floor(months / 12);

        return {
            text: `${years} Thn, ${months % 12} Bln, ${days % 30} Hari`,
            color: "bg-emerald-600"
        };
    };

    const statusBadge = calculateStatus();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[95vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-red-600" />
                        {unit ? "Edit Peralatan Workshop" : "Tambah Peralatan Workshop"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full mb-6">
                        <TabsTrigger value="identitas">Identitas Alat</TabsTrigger>
                        <TabsTrigger value="sertifikasi">Sertifikasi</TabsTrigger>
                        <TabsTrigger value="keterangan">Keterangan</TabsTrigger>
                    </TabsList>

                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
                        <TabsContent value="identitas" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Jenis Unit <span className="text-red-500">*</span></Label>
                                    <Select value={form.watch("jenisUnit")} onValueChange={(v) => form.setValue("jenisUnit", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["AIR COMPRESSORE", "STAND JACK", "BOTTLE JACK", "MITTER SAW", "GERINDA", "PALU", "WHEEL CHOCK", "AIR IMPACT", "AIR GREASE", "LAS LISTRIK", "TYER CAGE", "LAINNYA"].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>No Lambung <span className="text-red-500">*</span></Label>
                                    <Input {...form.register("noLambung")} placeholder="Contoh: AC-LV-..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Merk</Label>
                                    <Input {...form.register("merk")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Input {...form.register("type")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kapasitas (Nilai)</Label>
                                    <Input type="number" step="any" {...form.register("nilaiKapasitas")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Satuan</Label>
                                    <Select value={form.watch("satuanKapasitas") || ""} onValueChange={(v) => form.setValue("satuanKapasitas", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["psi", "T", "Inc", "oz", "Kg", "NM", "Wat", "-"].map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Area/Lokasi <span className="text-red-500">*</span></Label>
                                    <Select value={form.watch("areaLokasi")} onValueChange={(v) => form.setValue("areaLokasi", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["Storing BMD", "Storing AK", "Storing Suwarno", "Workshop Jam'ani", "Workshop BSM", "LAINNYA"].map(l => (
                                                <SelectItem key={l} value={l}>{l}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tahun Buat/Beli</Label>
                                    <Input type="number" {...form.register("tahunPembuatan")} placeholder="YYYY" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Komisioner</Label>
                                    <Input {...form.register("komisioner")} placeholder="PT. ..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status Unit</Label>
                                    <Select value={form.watch("statusUnit")} onValueChange={(v) => form.setValue("statusUnit", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AKTIF">AKTIF</SelectItem>
                                            <SelectItem value="TIDAK AKTIF">TIDAK AKTIF</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="sertifikasi" className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-slate-500" /> Pengujian Berkala
                                </h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <Label>No Sertifikat</Label>
                                        <Input {...form.register("noSertifikat")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanggal Sertifikat</Label>
                                        <Input type="date" {...form.register("tglSertifikat")} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Expired Sertifikat</Label>
                                        <Input type="date" {...form.register("expSertifikat")} />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-white">
                                    <Label className="mb-2 text-slate-500">Preview Status Sertifikat</Label>
                                    <div className={`px-10 py-4 rounded font-bold text-white text-lg shadow-md ${statusBadge.color}`}>
                                        {statusBadge.text}
                                    </div>
                                    <p className="mt-3 text-[10px] text-slate-400 uppercase tracking-widest font-bold">PT GECL - KOMISIONING TOOLS</p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="keterangan" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Catatan / Keterangan Tambahan</Label>
                                <Textarea {...form.register("keterangan")} rows={6} placeholder="Tuliskan catatan khusus terkait kondisi alat di sini..." />
                            </div>
                        </TabsContent>

                        <DialogFooter className="mt-8 flex justify-between w-full">
                            <div>
                                {activeTab !== "identitas" && (
                                    <Button type="button" variant="outline" onClick={() => {
                                        if (activeTab === "sertifikasi") setActiveTab("identitas");
                                        else if (activeTab === "keterangan") setActiveTab("sertifikasi");
                                    }} disabled={mutation.isPending}>
                                        ← Kembali
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Batal</Button>
                                {activeTab !== "keterangan" ? (
                                    <Button type="button" onClick={async () => {
                                        if (activeTab === "identitas") {
                                            const valid = await form.trigger(["jenisUnit", "noLambung", "areaLokasi"]);
                                            if (valid) setActiveTab("sertifikasi");
                                        } else if (activeTab === "sertifikasi") {
                                            setActiveTab("keterangan");
                                        }
                                    }} className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]">
                                        Lanjut →
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={mutation.isPending} className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]">
                                        {mutation.isPending ? "Menyimpan..." : "Simpan Data"}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

export function ModalDetailPeralatanWorkshop({ isOpen, onClose, id }: any) {
    // Detail view can be added later if needed, current modal handles it via edit or view mode
    return null;
}
