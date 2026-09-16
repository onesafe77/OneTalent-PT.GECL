import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, X, ArrowLeft, ArrowRight, Save, Trash2, Plus, Gauge, Truck } from "lucide-react";
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

interface KecepatanRecord {
    ordinal?: number;
    noKendaraan: string;
    tipeUnit: string;
    arahMuatan: boolean; // Muatan = true
    arahKosongan: boolean; // Kosongan = true
    kecepatanMph: string;
    kecepatanKph: string;
    keterangan: string;
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    tandaTangan: string;
}

interface KecepatanDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        waktu: string;
        shift: string;
        lokasi: string;
        subLokasi: string;
        batasKecepatanKph: number;
    };
    records: KecepatanRecord[];
    observers: Observer[];
}

const initialDraftData: KecepatanDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        waktu: "",
        shift: "Shift 1",
        lokasi: "",
        subLokasi: "",
        batasKecepatanKph: 40
    },
    records: [],
    observers: []
};

export default function SidakKecepatanForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<KecepatanDraftData>({
        key: "kecepatan",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<KecepatanDraftData>(initialDraftData);

    const [currentRecord, setCurrentRecord] = useState<KecepatanRecord>({
        noKendaraan: "",
        tipeUnit: "",
        arahMuatan: false,
        arahKosongan: true, // Default kosongan
        kecepatanMph: "",
        kecepatanKph: "",
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
        if (!draft.headerData.waktu && draft.step === 1) {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setDraft(prev => ({
                ...prev,
                headerData: { ...prev.headerData, waktu: timeString }
            }));
        }
    }, []);

    // Auto convert MPH to KPH (approx) if user inputs MPH
    useEffect(() => {
        if (currentRecord.kecepatanMph && !currentRecord.kecepatanKph) {
            const mph = parseFloat(currentRecord.kecepatanMph);
            if (!isNaN(mph)) {
                setCurrentRecord(prev => ({ ...prev, kecepatanKph: (mph * 1.60934).toFixed(0) }));
            }
        }
    }, [currentRecord.kecepatanMph]);

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
            const res = await apiRequest("/api/sidak-kecepatan", "POST", payload); // Verify endpoint
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan input data kecepatan unit." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: KecepatanRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-kecepatan/${draft.sessionId}/records`, "POST", {
                ...record,
                sessionId: draft.sessionId,
                ordinal: draft.records.length + 1,
                kecepatanKph: record.kecepatanKph.toString(),
                kecepatanMph: record.kecepatanMph ? record.kecepatanMph.toString() : null,
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, records: [...prev.records, data] }));
            setCurrentRecord({
                noKendaraan: "",
                tipeUnit: "",
                arahMuatan: false,
                arahKosongan: true,
                kecepatanMph: "",
                kecepatanKph: "",
                keterangan: ""
            });
            toast({ title: "Data Disimpan", description: "Unit berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddObserver = useMutation({
        mutationFn: async (observer: Observer) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-kecepatan/${draft.sessionId}/observers`, "POST", {
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
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleFinish = () => {
        navigate("/workspace/sidak/kecepatan/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Kecepatan telah disimpan." });
    };

    const maxRecords = 20;
    const canAddMore = draft.records.length < maxRecords;


    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-red-200 dark:shadow-none bg-red-600 hover:bg-red-700"
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
                        disabled={!currentRecord.noKendaraan || !currentRecord.tipeUnit || !currentRecord.kecepatanKph || !canAddMore || handleAddRecord.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-red-200 dark:shadow-none bg-red-600 hover:bg-red-700"
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
                formType="kecepatan"
            />

            <MobileSidakLayout
                title="Sidak Kecepatan"
                subtitle="Form Observasi Kecepatan Unit"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {draft.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                    <ClipboardCheck className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-red-900 dark:text-red-100">Info Pelaksanaan</h3>
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-300">
                                Pastikan detail waktu, lokasi dan batas kecepatan sudah benar.
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
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Waktu</Label>
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
                                <Label className="text-xs font-semibold uppercase text-gray-500">Batas Kecepatan (KM/H)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        className="h-12 bg-gray-50 border-gray-200 pl-10 font-bold"
                                        value={draft.headerData.batasKecepatanKph}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, batasKecepatanKph: parseInt(e.target.value) || 0 } }))}
                                    />
                                    <Gauge className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Hauling Road KM 10"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Sub Lokasi (Opsional)</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Detail lokasi..."
                                    value={draft.headerData.subLokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, subLokasi: e.target.value } }))}
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
                                <p className="text-xs text-gray-500 uppercase font-semibold">Unit Diperiksa</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.records.length} <span className="text-sm text-gray-400 font-normal">/ {maxRecords}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600">
                                <Truck className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Speed Gun</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">No. Unit <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.noKendaraan}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, noKendaraan: e.target.value }))}
                                            placeholder="DT-XXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Tipe <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.tipeUnit}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, tipeUnit: e.target.value }))}
                                            placeholder="Tipe"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Kondisi Muatan</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => setCurrentRecord(prev => ({ ...prev, arahMuatan: true, arahKosongan: false }))}
                                            variant={currentRecord.arahMuatan ? "default" : "outline"}
                                            className={cn("flex-1 h-12", currentRecord.arahMuatan ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none" : "hover:bg-red-50 text-gray-600")}
                                        >
                                            Muatan
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => setCurrentRecord(prev => ({ ...prev, arahMuatan: false, arahKosongan: true }))}
                                            variant={currentRecord.arahKosongan ? "default" : "outline"}
                                            className={cn("flex-1 h-12", currentRecord.arahKosongan ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 dark:shadow-none" : "hover:bg-muted text-gray-600")}
                                        >
                                            Kosongan
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">MPH (Opsional)</Label>
                                            <Input
                                                type="number"
                                                className="h-12 bg-white border-gray-200"
                                                value={currentRecord.kecepatanMph}
                                                onChange={(e) => setCurrentRecord(prev => ({ ...prev, kecepatanMph: e.target.value }))}
                                                placeholder="MPH"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">KM/H (Aktual) <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    className="h-12 bg-white border-gray-200 font-bold text-lg text-blue-600"
                                                    value={currentRecord.kecepatanKph}
                                                    onChange={(e) => setCurrentRecord(prev => ({ ...prev, kecepatanKph: e.target.value }))}
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-3.5 text-xs font-medium text-gray-400">KM/H</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Keterangan</Label>
                                    <Textarea
                                        value={currentRecord.keterangan}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, keterangan: e.target.value }))}
                                        placeholder="Catatan tambahan"
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
                                    {draft.records.map((rec, idx) => {
                                        const isOverspeed = (parseInt(rec.kecepatanKph) || 0) > draft.headerData.batasKecepatanKph;
                                        return (
                                            <div key={idx} className={cn("p-3 rounded-lg border shadow-sm flex justify-between items-center", isOverspeed ? "bg-red-50 border-red-100" : "bg-white border-gray-100")}>
                                                <div>
                                                    <p className="font-medium text-sm">{rec.noKendaraan} <span className="text-xs text-gray-400">({rec.tipeUnit})</span></p>
                                                    <p className="text-xs text-gray-500">{rec.arahMuatan ? "Muatan" : "Kosongan"}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-sm font-bold px-2 py-1 rounded-md border", isOverspeed ? "text-red-600 bg-red-100 border-red-200" : "text-foreground bg-muted border-border")}>
                                                        {rec.kecepatanKph} KM/H
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
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
