import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, ArrowRight, Save, Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";

interface PencahayaanRecord {
    ordinal?: number;
    titikPengambilan: string; // Measurement point (required)
    sumberPenerangan: string; // Light source
    jenisPengukuran: string; // Measurement type
    intensitasPencahayaan: string; // Lux value (numeric, use string in state then parse)
    jarakSumberCahaya: string; // Distance from light source
    secaraVisual: string; // Visual assessment (dropdown)
    keterangan: string; // Remarks
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    tandaTangan: string;
}

interface PencahayaanDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        namaPerusahaan: string;
        jenisAlatMerk: string;
        departemen: string;
        noSeriAlat: string;
        lokasiPengukuran: string;
        tanggalPemeriksaan: string; // Date
        penanggungjawabArea: string;
        waktuPemeriksaan: string; // Time
    };
    records: PencahayaanRecord[];
    observers: Observer[];
}

const initialDraftData: PencahayaanDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        namaPerusahaan: "",
        jenisAlatMerk: "",
        departemen: "",
        noSeriAlat: "",
        lokasiPengukuran: "",
        tanggalPemeriksaan: new Date().toISOString().split('T')[0],
        penanggungjawabArea: "",
        waktuPemeriksaan: ""
    },
    records: [],
    observers: []
};

export default function SidakPencahayaanForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<PencahayaanDraftData>({
        key: "pencahayaan",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<PencahayaanDraftData>(initialDraftData);

    const [currentRecord, setCurrentRecord] = useState<PencahayaanRecord>({
        titikPengambilan: "",
        sumberPenerangan: "",
        jenisPengukuran: "",
        intensitasPencahayaan: "",
        jarakSumberCahaya: "",
        secaraVisual: "",
        keterangan: ""
    });

    const [currentObserver, setCurrentObserver] = useState<Observer>({
        nama: "",
        nik: "",
        perusahaan: "",
        tandaTangan: ""
    });

    // Auto-save
    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

    // Initial time set
    useEffect(() => {
        if (!draft.headerData.waktuPemeriksaan && draft.step === 1) {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setDraft(prev => ({
                ...prev,
                headerData: { ...prev.headerData, waktuPemeriksaan: timeString }
            }));
        }
    }, []);

    // Validate session ID when on step 2 or 3
    useEffect(() => {
        if ((draft.step === 2 || draft.step === 3) && !draft.sessionId) {
            toast({
                title: "Sesi Tidak Valid",
                description: "Silakan mulai dari awal untuk membuat sesi baru.",
                variant: "destructive"
            });
            setDraft(prev => ({ ...prev, step: 1 }));
        }
    }, [draft.step, draft.sessionId, toast]);

    const handleRestoreDraft = async () => {
        const restored = restoreDraft();
        if (restored) {
            // Validate that if step is 2 or 3, sessionId must exist
            if ((restored.step === 2 || restored.step === 3) && !restored.sessionId) {
                toast({
                    title: "Draft Tidak Lengkap",
                    description: "Draft sebelumnya tidak memiliki sesi aktif. Dimulai dari awal.",
                    variant: "destructive"
                });
                // Reset to step 1 but keep header data
                setDraft({
                    ...initialDraftData,
                    headerData: restored.headerData
                });
            } else {
                setDraft(restored);
                toast({ title: "Draft Dipulihkan", description: "Melanjutkan pengisian form sebelumnya." });
            }
        }
    };

    const handleCreateSession = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                ...data,
                activityPhotos: []
            };
            const res = await apiRequest("/api/sidak-pencahayaan", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan input data pengukuran pencahayaan." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: PencahayaanRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-pencahayaan/${draft.sessionId}/records`, "POST", {
                ...record,
                sessionId: draft.sessionId,
                ordinal: draft.records.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, records: [...prev.records, data] }));
            setCurrentRecord({
                titikPengambilan: "",
                sumberPenerangan: "",
                jenisPengukuran: "",
                intensitasPencahayaan: "",
                jarakSumberCahaya: "",
                secaraVisual: "",
                keterangan: ""
            });
            toast({ title: "Data Disimpan", description: "Data pengukuran berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            console.error("Failed to add Pencahayaan record:", error);
            toast({
                title: "Gagal Menyimpan",
                description: error.message || "Terjadi kesalahan saat menyimpan data. Silakan coba lagi.",
                variant: "destructive"
            });
        }
    });

    const handleAddObserver = useMutation({
        mutationFn: async (observer: Observer) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-pencahayaan/${draft.sessionId}/observers`, "POST", {
                ...observer,
                sessionId: draft.sessionId,
                ordinal: draft.observers.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, observers: [...prev.observers, data] }));
            setCurrentObserver({ nama: "", nik: "", perusahaan: "", tandaTangan: "" });
            toast({ title: "Observer Disimpan" });
        },
        onError: (error: Error) => {
            console.error("Failed to add observer:", error);
            toast({
                title: "Gagal Menyimpan Observer",
                description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
                variant: "destructive"
            });
        }
    });

    const handleFinish = () => {
        if (draft.observers.length === 0) {
            toast({
                title: "Observer Diperlukan",
                description: "Minimal 1 pengawas harus ditambahkan.",
                variant: "destructive"
            });
            return;
        }
        navigate("/workspace/sidak/pencahayaan/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Pencahayaan telah disimpan." });
    };

    const maxRecords = 10;
    const canAddMore = draft.records.length < maxRecords;

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-slate-200 dark:shadow-none bg-slate-700 hover:bg-slate-800 text-white"
                    disabled={!draft.headerData.lokasiPengukuran || !draft.headerData.tanggalPemeriksaan || handleCreateSession.isPending}
                    onClick={() => handleCreateSession.mutate(draft.headerData)}
                >
                    {handleCreateSession.isPending ? "Membuat Sesi..." : "Lanjut ke Pengukuran"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (draft.step === 2) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => handleAddRecord.mutate(currentRecord)}
                        disabled={!currentRecord.titikPengambilan || !canAddMore || handleAddRecord.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-slate-200 dark:shadow-none bg-slate-700 hover:bg-slate-800 text-white"
                    >
                        {handleAddRecord.isPending ? (
                            <>Menyimpan...</>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 mr-2" />
                                {canAddMore ? "Simpan Log" : "Batas Maksimal"}
                            </>
                        )}
                    </Button>
                    {draft.records.length > 0 && (
                        <Button
                            onClick={() => setDraft(prev => ({ ...prev, step: 3 }))}
                            variant="outline"
                            className="w-full h-12 border-2 border-gray-200"
                        >
                            Lanjut ke Observer ({draft.records.length})
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            );
        }
        if (draft.step === 3) {
            return (
                <Button
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 dark:shadow-none"
                    onClick={handleFinish}
                    disabled={draft.observers.length === 0}
                >
                    <Save className="w-5 h-5 mr-3" />
                    SELESAI & SIMPAN {draft.observers.length > 0 && `(${draft.observers.length} Pengawas)`}
                </Button>
            );
        }
        return null;
    };


    return (
        <>
            <DraftRecoveryDialog
                open={showRecoveryDialog}
                onRestore={handleRestoreDraft}
                onDiscard={ignoreDraft}
                timestamp={draftTimestamp}
                formType="pencahayaan"
            />

            <MobileSidakLayout
                title="PEMERIKSAAN DAN PENGUJIAN PENCAHAYAAN"
                subtitle="Form Pengukuran Pencahayaan"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {draft.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-50 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                                    <ClipboardCheck className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Info Pelaksanaan</h3>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                Pastikan detail alat ukur dan lokasi pengukuran pencahayaan sudah benar.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Nama Perusahaan</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.namaPerusahaan}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaPerusahaan: e.target.value } }))}
                                        placeholder="PT..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Jenis Alat & Merk</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.jenisAlatMerk}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, jenisAlatMerk: e.target.value } }))}
                                        placeholder="Contoh: Lux Meter - Extech"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Departemen</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.departemen}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, departemen: e.target.value } }))}
                                        placeholder="Contoh: Plant, Mining"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">No Seri Alat</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.noSeriAlat}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, noSeriAlat: e.target.value } }))}
                                        placeholder="Serial Number"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi Pengukuran <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        placeholder="Contoh: Workshop A, Ruang Kontrol"
                                        value={draft.headerData.lokasiPengukuran}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasiPengukuran: e.target.value } }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Tanggal Pemeriksaan/Pengujian <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.tanggalPemeriksaan}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, tanggalPemeriksaan: e.target.value } }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Penganggungjawab Area</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.penanggungjawabArea}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, penanggungjawabArea: e.target.value } }))}
                                        placeholder="Nama Penanggung Jawab"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Waktu Pemeriksaan/Pengujian</Label>
                                    <Input
                                        type="time"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.waktuPemeriksaan}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, waktuPemeriksaan: e.target.value } }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {draft.step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats */}
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Pengukuran Tercatat</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.records.length} <span className="text-sm text-gray-400 font-normal">/ {maxRecords}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-yellow-50 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-yellow-600">
                                <Lightbulb className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Data Pengukuran Pencahayaan</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                                {/* Measurement Information */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Titik Pengambilan <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.titikPengambilan}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, titikPengambilan: e.target.value }))}
                                        placeholder="Contoh: Meja Kerja A1, Area Loading"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Sumber Penerangan</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.sumberPenerangan}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, sumberPenerangan: e.target.value }))}
                                        placeholder="Contoh: Lampu LED, Cahaya Alami"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Jenis Pengukuran</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.jenisPengukuran}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, jenisPengukuran: e.target.value }))}
                                        placeholder="Contoh: Horizontal, Vertikal"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Intensitas Pencahayaan (lux)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            className="h-12 bg-gray-50 border-gray-200 pr-12"
                                            value={currentRecord.intensitasPencahayaan}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, intensitasPencahayaan: e.target.value }))}
                                            placeholder="350"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                                            lux
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Jarak dari sumber cahaya</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.jarakSumberCahaya}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, jarakSumberCahaya: e.target.value }))}
                                        placeholder="Contoh: 2 meter, 1.5m"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Secara Visual <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={currentRecord.secaraVisual}
                                        onValueChange={(val) => setCurrentRecord(prev => ({ ...prev, secaraVisual: val }))}
                                    >
                                        <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Pilih penilaian visual" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sangat gelap">Sangat Gelap</SelectItem>
                                            <SelectItem value="gelap">Gelap</SelectItem>
                                            <SelectItem value="cukup">Cukup</SelectItem>
                                            <SelectItem value="terang">Terang</SelectItem>
                                            <SelectItem value="sangat terang">Sangat Terang</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Keterangan</Label>
                                    <Textarea
                                        value={currentRecord.keterangan}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, keterangan: e.target.value }))}
                                        placeholder="Penjelasan hasil penilaian visual dan catatan tambahan"
                                        className="bg-gray-50 border-gray-200 min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Recent List */}
                        {draft.records.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-3">Tercatat ({draft.records.length})</h3>
                                <div className="space-y-2">
                                    {draft.records.map((rec, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                            <div>
                                                <p className="font-medium text-sm">Titik: {rec.titikPengambilan}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Intensitas: {rec.intensitasPencahayaan ? `${rec.intensitasPencahayaan} lux` : '-'} •
                                                    Visual: {rec.secaraVisual || '-'}
                                                </p>
                                                {rec.sumberPenerangan && (
                                                    <p className="text-xs text-gray-500">Sumber: {rec.sumberPenerangan}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {draft.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Data Pengawas</h3>
                                <p className="text-sm text-gray-500">Minimal 1 observer wajib diisi</p>
                            </div>

                            {/* Observer List */}
                            {draft.observers.length > 0 && (
                                <div className="grid gap-3">
                                    {draft.observers.map((obs, idx) => (
                                        <div key={idx} className="bg-muted p-4 rounded-xl border border-border flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{obs.nama}</p>
                                                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
                                            </div>
                                            <Check className="h-5 w-5 text-foreground" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Observer Form */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <p className="font-semibold text-gray-900 dark:text-white">Tambah Pengawas Baru</p>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Nama Pengawas</Label>
                                        <Input
                                            value={currentObserver.nama}
                                            onChange={(e) => setCurrentObserver(prev => ({ ...prev, nama: e.target.value }))}
                                            className="bg-gray-50 border-gray-200"
                                            placeholder="Nama Lengkap"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">NIK</Label>
                                        <Input
                                            value={currentObserver.nik}
                                            onChange={(e) => setCurrentObserver(prev => ({ ...prev, nik: e.target.value }))}
                                            className="bg-gray-50 border-gray-200"
                                            placeholder="NIK"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan</Label>
                                        <Input
                                            value={currentObserver.perusahaan}
                                            onChange={(e) => setCurrentObserver(prev => ({ ...prev, perusahaan: e.target.value }))}
                                            className="bg-gray-50 border-gray-200"
                                            placeholder="PT..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Tanda Tangan</Label>
                                        <SignaturePad
                                            onSave={(dataUrl) => setCurrentObserver(prev => ({ ...prev, tandaTangan: dataUrl }))}
                                        />
                                    </div>
                                    <Button
                                        onClick={() => handleAddObserver.mutate(currentObserver)}
                                        disabled={!currentObserver.nama || !currentObserver.perusahaan || !currentObserver.tandaTangan || handleAddObserver.isPending}
                                        className="w-full mt-2"
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Tambahkan
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </MobileSidakLayout>
        </>
    );
}
