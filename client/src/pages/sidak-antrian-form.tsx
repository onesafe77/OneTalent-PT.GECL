import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, X, ArrowLeft, ArrowRight, Save, Trash2, Plus, Users, Car } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";

interface AntrianRecord {
    ordinal?: number;
    namaNik: string;
    noLambung: string;
    handbrakeAktif: boolean;
    jarakUnitAman: boolean;
    keterangan: string;
}

interface Observer {
    nama: string;
    jabatan: string;
    tandaTangan: string;
}

interface AntrianDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        waktu: string;
        shift: string;
        perusahaan: string;
        departemen: string;
        lokasi: string;
    };
    records: AntrianRecord[];
    observers: Observer[];
}

const initialDraftData: AntrianDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        waktu: "",
        shift: "Shift 1",
        perusahaan: "PT. Goden Energi Cemerlang Lesrari",
        departemen: "HSE",
        lokasi: ""
    },
    records: [],
    observers: []
};

export default function SidakAntrianForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<AntrianDraftData>({
        key: "antrian",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<AntrianDraftData>(initialDraftData);

    const [currentRecord, setCurrentRecord] = useState<AntrianRecord>({
        namaNik: "",
        noLambung: "",
        handbrakeAktif: true,
        jarakUnitAman: true,
        keterangan: ""
    });

    const [currentObserver, setCurrentObserver] = useState<Observer>({
        nama: "",
        jabatan: "",
        tandaTangan: ""
    });

    // Auto-save
    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

    // Initial time set
    useEffect(() => {
        if (!draft.headerData.waktu && draft.step === 1) {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setDraft(prev => ({
                ...prev,
                headerData: { ...prev.headerData, waktu: timeString }
            }));
        }
    }, []);

    const handleRestoreDraft = async () => {
        const restored = restoreDraft();
        if (restored) {
            setDraft(restored);
            toast({ title: "Draft Dipulihkan", description: "Melanjutkan pengisian form sebelumnya." });
        }
    };

    const handleCreateSession = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                ...data,
                activityPhotos: []
            };
            const res = await apiRequest("/api/sidak-antrian", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan input data pemeriksaan." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: AntrianRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-antrian/${draft.sessionId}/records`, "POST", {
                ...record,
                ordinal: draft.records.length + 1,
                sessionId: draft.sessionId
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, records: [...prev.records, data] }));
            setCurrentRecord({
                namaNik: "",
                noLambung: "",
                handbrakeAktif: true,
                jarakUnitAman: true,
                keterangan: ""
            });
            toast({ title: "Data Disimpan", description: "Unit berhasil ditambahkan ke daftar." });
        }
    });

    const handleAddObserver = useMutation({
        mutationFn: async (observer: Observer) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-antrian/${draft.sessionId}/observers`, "POST", {
                ...observer,
                ordinal: draft.observers.length + 1,
                sessionId: draft.sessionId
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, observers: [...prev.observers, data] }));
            setCurrentObserver({ nama: "", jabatan: "", tandaTangan: "" });
            toast({ title: "Observer Disimpan" });
        }
    });

    const handleFinish = () => {
        navigate("/workspace/sidak/antrian/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Antrian telah disimpan." });
    };

    const maxRecords = 10;
    const canAddMore = draft.records.length < maxRecords;

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-orange-200 dark:shadow-none"
                    disabled={!draft.headerData.lokasi || handleCreateSession.isPending}
                    onClick={() => handleCreateSession.mutate(draft.headerData)}
                >
                    {handleCreateSession.isPending ? "Membuat Sesi..." : "Lanjut ke Pemeriksaan"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (draft.step === 2) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => handleAddRecord.mutate(currentRecord)}
                        disabled={!currentRecord.namaNik || !canAddMore || handleAddRecord.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-orange-200 dark:shadow-none bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {canAddMore ? "Simpan Unit" : "Batas Maksimal"}
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
                    <Save className="w-5 h-5 mr-3" /> SELESAI & SIMPAN
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
                formType="antrian"
            />

            <MobileSidakLayout
                title="Sidak Antrian"
                subtitle="Form Observasi Antrian Unit"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {draft.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                    <ClipboardCheck className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Info Pelaksanaan</h3>
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-300">
                                Pastikan detail waktu dan lokasi sudah sesuai.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Tanggal</Label>
                                    <Input
                                        type="date"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.tanggal}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, tanggal: e.target.value } }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Jam</Label>
                                    <Input
                                        type="time"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.waktu}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, waktu: e.target.value } }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Shift</Label>
                                <Select
                                    value={draft.headerData.shift}
                                    onValueChange={(val) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, shift: val } }))}
                                >
                                    <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Shift 1">Shift 1</SelectItem>
                                        <SelectItem value="Shift 2">Shift 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Loading Point PIT XYZ"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    value={draft.headerData.perusahaan}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, perusahaan: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Departemen</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    value={draft.headerData.departemen}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, departemen: e.target.value } }))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {draft.step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats */}
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Total Unit</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.records.length} <span className="text-sm text-gray-400 font-normal">/ {maxRecords}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
                                <Car className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Data Pemeriksaan</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Nama & NIK <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.namaNik}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, namaNik: e.target.value }))}
                                        placeholder="Ketik Nama & NIK"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Nomor Lambung</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.noLambung}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, noLambung: e.target.value }))}
                                        placeholder="Nomor Unit"
                                    />
                                </div>
                            </div>

                            {/* Checklist */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 px-1">Checklist Keselamatan</h3>

                                <div className="space-y-3">
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="font-medium text-sm mb-3">1. Apakah Handbrake Aktif?</p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={currentRecord.handbrakeAktif ? "default" : "outline"}
                                                onClick={() => setCurrentRecord(prev => ({ ...prev, handbrakeAktif: true }))}
                                                className={cn(
                                                    "flex-1 h-12 transition-all",
                                                    currentRecord.handbrakeAktif ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 dark:shadow-none" : "hover:bg-muted text-gray-600"
                                                )}
                                            >
                                                <Check className="mr-2 h-4 w-4" /> Ya
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={!currentRecord.handbrakeAktif ? "destructive" : "outline"}
                                                onClick={() => setCurrentRecord(prev => ({ ...prev, handbrakeAktif: false }))}
                                                className={cn(
                                                    "flex-1 h-12 transition-all",
                                                    !currentRecord.handbrakeAktif ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none" : "hover:bg-red-50 text-gray-600"
                                                )}
                                            >
                                                <X className="mr-2 h-4 w-4" /> Tidak
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="font-medium text-sm mb-3">2. Apakah Jarak Unit Aman?</p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={currentRecord.jarakUnitAman ? "default" : "outline"}
                                                onClick={() => setCurrentRecord(prev => ({ ...prev, jarakUnitAman: true }))}
                                                className={cn(
                                                    "flex-1 h-12 transition-all",
                                                    currentRecord.jarakUnitAman ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 dark:shadow-none" : "hover:bg-muted text-gray-600"
                                                )}
                                            >
                                                <Check className="mr-2 h-4 w-4" /> Ya
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={!currentRecord.jarakUnitAman ? "destructive" : "outline"}
                                                onClick={() => setCurrentRecord(prev => ({ ...prev, jarakUnitAman: false }))}
                                                className={cn(
                                                    "flex-1 h-12 transition-all",
                                                    !currentRecord.jarakUnitAman ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none" : "hover:bg-red-50 text-gray-600"
                                                )}
                                            >
                                                <X className="mr-2 h-4 w-4" /> Tidak
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Keterangan</Label>
                                    <Textarea
                                        value={currentRecord.keterangan}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, keterangan: e.target.value }))}
                                        placeholder="Catatan tambahan (opsional)"
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Recent List */}
                        {draft.records.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-3">Unit Tercatat ({draft.records.length})</h3>
                                <div className="space-y-2">
                                    {draft.records.map((rec, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-sm">{rec.namaNik}</p>
                                                <p className="text-xs text-gray-500">{rec.noLambung || '-'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className={cn("text-[10px] font-bold px-2 py-1 rounded", rec.handbrakeAktif ? "bg-muted text-foreground" : "bg-red-100 text-red-700")}>
                                                    HB
                                                </div>
                                                <div className={cn("text-[10px] font-bold px-2 py-1 rounded", rec.jarakUnitAman ? "bg-muted text-foreground" : "bg-red-100 text-red-700")}>
                                                    Dist
                                                </div>
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
                                                <p className="text-xs text-gray-500">{obs.jabatan}</p>
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
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Jabatan</Label>
                                        <Input
                                            value={currentObserver.jabatan}
                                            onChange={(e) => setCurrentObserver(prev => ({ ...prev, jabatan: e.target.value }))}
                                            className="bg-gray-50 border-gray-200"
                                            placeholder="Jabatan"
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
                                        disabled={!currentObserver.nama || !currentObserver.tandaTangan || handleAddObserver.isPending}
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
