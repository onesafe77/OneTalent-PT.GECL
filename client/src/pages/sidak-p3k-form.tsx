import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Save, Calendar, Clock, MapPin, User, FileText, Check, X, ShieldAlert, Camera, Trash2, ImageIcon, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface P3KItem {
    id: number;
    name: string;
    minQty: number;
}

const REFERENSI_ITEMS: P3KItem[] = [
    { id: 1, name: "Kasa Steril", minQty: 20 },
    { id: 2, name: "Perban Lebar 5cm", minQty: 2 },
    { id: 3, name: "Perban Lebar 10cm", minQty: 2 },
    { id: 4, name: "Plester Lebar 1.25cm", minQty: 2 },
    { id: 5, name: "Plester Cepat", minQty: 10 },
    { id: 6, name: "Kapas 25 Gram", minQty: 1 },
    { id: 7, name: "Kain Segitiga (Mitella)", minQty: 1 },
    { id: 8, name: "Gunting", minQty: 1 },
    { id: 9, name: "Peniti", minQty: 12 },
    { id: 10, name: "Sarung Tangan Sekali Pakai Satu Tangan", minQty: 2 },
    { id: 11, name: "Sarung Tangan Sekali Pakai Berpasangan", minQty: 2 },
    { id: 12, name: "Masker", minQty: 1 },
    { id: 13, name: "Pinset", minQty: 1 },
    { id: 14, name: "Lampu Senter", minQty: 1 },
    { id: 15, name: "Kantong Plastik Bersih", minQty: 1 },
    { id: 16, name: "Betadine", minQty: 1 },
    { id: 17, name: "Alkohol 70%", minQty: 1 },
];

interface FormState {
    // Header
    tanggal: string;
    waktu: string;
    lokasi: string;
    inspectorName: string;
    // Items
    items: {
        itemId: number;
        itemName: string;
        minQty: number;
        isAvailable: boolean;
        notes: string;
    }[];
    // Footer
    notes: string;
    areaResponsibleName: string;
    inspectorSignature: string;
    areaResponsibleSignature: string;
    activityPhotos: string[];
}

const initialFormState: FormState = {
    tanggal: new Date().toISOString().split('T')[0],
    waktu: new Date().toTimeString().slice(0, 5),
    lokasi: "",
    inspectorName: "",
    items: REFERENSI_ITEMS.map(item => ({
        itemId: item.id,
        itemName: item.name,
        minQty: item.minQty,
        isAvailable: false,
        notes: ""
    })),
    notes: "",
    areaResponsibleName: "",
    inspectorSignature: "",
    areaResponsibleSignature: "",
    activityPhotos: []
};

export default function SidakP3kForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormState>(initialFormState);

    const submitMutation = useMutation({
        mutationFn: async (data: FormState) => {
            const payload = {
                session: {
                    tanggal: data.tanggal,
                    waktu: data.waktu,
                    lokasi: data.lokasi,
                    inspectorName: data.inspectorName,
                    inspectorSignature: data.inspectorSignature,
                    areaResponsibleName: data.areaResponsibleName,
                    areaResponsibleSignature: data.areaResponsibleSignature,
                    notes: data.notes,
                    activityPhotos: data.activityPhotos
                },
                items: data.items.map(item => ({
                    itemName: item.itemName,
                    minQty: item.minQty,
                    isAvailable: item.isAvailable,
                    notes: item.notes,
                    ordinal: item.itemId
                }))
            };

            const res = await apiRequest("/api/sidak-p3k", "POST", payload);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sidak-p3k"] });
            toast({ title: "Berhasil", description: "Laporan Inspeksi P3K berhasil disimpan." });
            navigate("/workspace/sidak/p3k/history");
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal Menyimpan",
                description: error.message || "Terjadi kesalahan saat menyimpan data.",
                variant: "destructive"
            });
        }
    });

    const handleNext = () => {
        if (step === 1) {
            if (!form.tanggal || !form.waktu || !form.lokasi || !form.inspectorName) {
                toast({ title: "Mohon Lengkapi Data", description: "Semua field wajib diisi.", variant: "destructive" });
                return;
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            navigate("/workspace/sidak");
        }
    };

    const handleItemChange = (itemId: number, field: 'isAvailable' | 'notes', value: any) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.itemId === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleSubmit = () => {
        if (!form.inspectorSignature || !form.areaResponsibleSignature || !form.areaResponsibleName) {
            toast({
                title: "Data Kurang Lengkap",
                description: "Tanda tangan Inspektor, Nama & Tanda tangan Penanggung Jawab Area wajib diisi.",
                variant: "destructive"
            });
            return;
        }
        submitMutation.mutate(form);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("photo", file);

        try {
            const res = await fetch("/api/sidak-p3k/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setForm(prev => ({
                ...prev,
                activityPhotos: [...prev.activityPhotos, data.url]
            }));

            toast({ title: "Foto Terupload", description: "Foto kegiatan berhasil ditambahkan." });
        } catch (error) {
            console.error(error);
            toast({ title: "Gagal Upload", description: "Gagal mengupload foto.", variant: "destructive" });
        }
    };

    const removePhoto = (index: number) => {
        setForm(prev => ({
            ...prev,
            activityPhotos: prev.activityPhotos.filter((_, i) => i !== index)
        }));
    };

    const renderBottomAction = () => {
        if (step === 1) {
            return (
                <Button
                    onClick={handleNext}
                    className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
                >
                    Lanjut ke Checklist
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (step === 2) {
            return (
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        className="flex-1 h-12 border-2"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Kembali
                    </Button>
                    <Button
                        onClick={handleNext}
                        className="flex-1 h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none"
                    >
                        Lanjut ke TTD
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            );
        }
        if (step === 3) {
            return (
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        className="flex-1 h-12 border-2"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Kembali
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending}
                        className="flex-1 h-12 text-lg font-medium bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200 dark:shadow-none"
                    >
                        {submitMutation.isPending ? "Menyimpan..." : "Simpan Laporan"}
                        <Save className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            );
        }
        return null;
    };

    return (
        <MobileSidakLayout
            title="Inspeksi Kotak P3K"
            subtitle="Form Checklist Kelengkapan P3K"
            step={step}
            totalSteps={3}
            onBack={handleBack}
            bottomAction={renderBottomAction()}
            headerRight={
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/workspace/sidak/p3k/history")}
                    className="h-8 w-8 text-gray-600 dark:text-gray-300"
                >
                    <History className="h-5 w-5" />
                </Button>
            }
        >
            <div className="max-w-2xl mx-auto w-full pb-20">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">Informasi Inspeksi</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Pastikan data lokasi dan waktu sesuai dengan kondisi lapangan.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tanggal Inspeksi</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="date"
                                        className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        value={form.tanggal}
                                        onChange={e => setForm({ ...form, tanggal: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Waktu</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="time"
                                        className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        value={form.waktu}
                                        onChange={e => setForm({ ...form, waktu: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Lokasi</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Contoh: Site Office, Workshop, dll"
                                        className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        value={form.lokasi}
                                        onChange={e => setForm({ ...form, lokasi: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Inspektor</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Nama Lengkap Inspektor"
                                        className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        value={form.inspectorName}
                                        onChange={e => setForm({ ...form, inspectorName: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    Daftar Kelengkapan P3K
                                </h3>
                            </div>
                            <div className="grid gap-4">
                                {form.items.map((item) => (
                                    <div key={item.itemId} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 mt-0.5">
                                                    {item.itemId}
                                                </span>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900 dark:text-white text-base">
                                                        Apakah {item.itemName} tersedia?
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Standard Minimum: <span className="font-medium">{item.minQty}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pl-9">
                                                <button
                                                    onClick={() => handleItemChange(item.itemId, 'isAvailable', true)}
                                                    className={cn(
                                                        "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 border",
                                                        item.isAvailable
                                                            ? "bg-green-600 border-green-600 text-white shadow-md shadow-green-200 dark:shadow-none"
                                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                                                    )}
                                                >
                                                    <Check className={cn("w-4 h-4 inline-block mr-2", item.isAvailable ? "text-white" : "opacity-0")} />
                                                    YA
                                                </button>
                                                <button
                                                    onClick={() => handleItemChange(item.itemId, 'isAvailable', false)}
                                                    className={cn(
                                                        "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 border",
                                                        !item.isAvailable
                                                            ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-200 dark:shadow-none"
                                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                                                    )}
                                                >
                                                    <X className={cn("w-4 h-4 inline-block mr-2", !item.isAvailable ? "text-white" : "opacity-0")} />
                                                    TIDAK
                                                </button>
                                            </div>

                                            <div className="pl-9">
                                                <Input
                                                    className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-sm"
                                                    placeholder="Catatan kondisi item (opsional)..."
                                                    value={item.notes}
                                                    onChange={(e) => handleItemChange(item.itemId, 'notes', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-3">
                                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                                    Catatan Tambahan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Textarea
                                    placeholder="Tulis catatan atau temuan tambahan di sini..."
                                    className="min-h-[100px] resize-none bg-gray-50 dark:bg-gray-800 border-0 focus-visible:ring-1"
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-3">
                                <CardTitle className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Dokumentasi Kegiatan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {form.activityPhotos.map((photo, index) => (
                                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={photo} alt={`Dokumentasi ${index + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                        <Camera className="h-6 w-6 text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500 font-medium">Tambah Foto</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6">
                            <Card className="border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 py-3">
                                    <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center justify-between">
                                        <span>Tanda Tangan Inspektor</span>
                                        {form.inspectorSignature && <Check className="h-4 w-4 text-green-600" />}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Inspektor</Label>
                                        <Input
                                            value={form.inspectorName}
                                            readOnly
                                            className="bg-gray-100 dark:bg-gray-800 border-0 font-medium text-gray-900"
                                        />
                                    </div>
                                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                                        <SignaturePad
                                            onSave={(data) => setForm(prev => ({ ...prev, inspectorSignature: data }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <CardHeader className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 py-3">
                                    <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100 flex items-center justify-between">
                                        <span>Penanggung Jawab Area</span>
                                        {form.areaResponsibleSignature && <Check className="h-4 w-4 text-green-600" />}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Penanggung Jawab</Label>
                                        <Input
                                            placeholder="Nama Lengkap"
                                            className="bg-white dark:bg-gray-800"
                                            value={form.areaResponsibleName}
                                            onChange={e => setForm({ ...form, areaResponsibleName: e.target.value })}
                                        />
                                    </div>
                                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                                        <SignaturePad
                                            onSave={(data) => setForm(prev => ({ ...prev, areaResponsibleSignature: data }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </MobileSidakLayout>
    );
}
