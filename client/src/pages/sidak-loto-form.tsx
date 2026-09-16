import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, ArrowRight, Save, Plus, Lock } from "lucide-react";
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

interface LotoRecord {
    ordinal?: number;
    // Worker identification (from official PDF)
    nama: string;
    nik: string;
    perusahaan: string;
    // 5 compliance questions from PDF
    q1_gembokTagTerpasang: boolean;
    q2_dangerTagSesuai: boolean;
    q3_gembokSesuai: boolean;
    q4_kunciUnik: boolean;
    q5_haspBenar: boolean;
    keterangan: string;
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    tandaTangan: string;
}

interface LotoDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        shift: string;
        waktu: string;
        lokasi: string;
        departemen: string;
    };
    records: LotoRecord[];
    observers: Observer[];
}

const initialDraftData: LotoDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        shift: "Shift 1",
        waktu: "",
        lokasi: "",
        departemen: ""
    },
    records: [],
    observers: []
};

export default function SidakLotoForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<LotoDraftData>({
        key: "loto",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<LotoDraftData>(initialDraftData);

    const [currentRecord, setCurrentRecord] = useState<LotoRecord>({
        nama: "",
        nik: "",
        perusahaan: "",
        q1_gembokTagTerpasang: false,
        q2_dangerTagSesuai: false,
        q3_gembokSesuai: false,
        q4_kunciUnik: false,
        q5_haspBenar: false,
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
            const res = await apiRequest("/api/sidak-loto", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan input data LOTO." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: LotoRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-loto/${draft.sessionId}/records`, "POST", {
                ...record,
                sessionId: draft.sessionId,
                ordinal: draft.records.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, records: [...prev.records, data] }));
            setCurrentRecord({
                nama: "",
                nik: "",
                perusahaan: "",
                q1_gembokTagTerpasang: false,
                q2_dangerTagSesuai: false,
                q3_gembokSesuai: false,
                q4_kunciUnik: false,
                q5_haspBenar: false,
                keterangan: ""
            });
            toast({ title: "Data Disimpan", description: "Log LOTO berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            console.error("Failed to add LOTO record:", error);
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
            const res = await apiRequest(`/api/sidak-loto/${draft.sessionId}/observers`, "POST", {
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
        navigate("/workspace/sidak/loto/history");
        toast({ title: "Selesai", description: "Laporan SIDAK LOTO telah disimpan." });
    };

    const maxRecords = 10;
    const canAddMore = draft.records.length < maxRecords;


    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-slate-200 dark:shadow-none bg-slate-700 hover:bg-slate-800 text-white"
                    disabled={!draft.headerData.lokasi || handleCreateSession.isPending}
                    onClick={() => handleCreateSession.mutate(draft.headerData)}
                >
                    {handleCreateSession.isPending ? "Membuat Sesi..." : "Lanjut ke Inspeksi"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (draft.step === 2) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => handleAddRecord.mutate(currentRecord)}
                        disabled={!currentRecord.nama || !canAddMore || handleAddRecord.isPending}
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
                formType="loto"
            />

            <MobileSidakLayout
                title="Sidak LOTO"
                subtitle="Form Inspeksi Lock Out Tag Out"
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
                                Pastikan detail waktu dan lokasi inspeksi LOTO sudah benar.
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
                                <Label className="text-xs font-semibold uppercase text-gray-500">Departemen</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    value={draft.headerData.departemen}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, departemen: e.target.value } }))}
                                    placeholder="Contoh: Plant, Mining"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Workshop A, Area Crusher"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
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
                                <p className="text-xs text-gray-500 uppercase font-semibold">Log LOTO Tercatat</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.records.length} <span className="text-sm text-gray-400 font-normal">/ {maxRecords}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-slate-50 dark:bg-slate-900/30 rounded-full flex items-center justify-center text-slate-600">
                                <Lock className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Data Pekerja</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                                {/* Worker Information */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Nama <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.nama}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, nama: e.target.value }))}
                                        placeholder="Nama Lengkap Pekerja"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">NIK</Label>
                                        <Input
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.nik}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, nik: e.target.value }))}
                                            placeholder="Nomor Identitas"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan</Label>
                                        <Input
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.perusahaan}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, perusahaan: e.target.value }))}
                                            placeholder="PT..."
                                        />
                                    </div>
                                </div>

                                {/* 5 Compliance Questions */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <Label className="text-sm font-bold text-gray-700 dark:text-gray-200">Checklist Kepatuhan LOTO</Label>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                1. Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q1_gembokTagTerpasang}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q1_gembokTagTerpasang: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                2. Apakah danger tag sesuai dan memadai?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q2_dangerTagSesuai}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q2_dangerTagSesuai: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                3. Apakah gembok sesuai dan memadai?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q3_gembokSesuai}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q3_gembokSesuai: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                4. Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q4_kunciUnik}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q4_kunciUnik: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                5. Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q5_haspBenar}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q5_haspBenar: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
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
                                <h3 className="font-semibold mb-3">Tercatat ({draft.records.length})</h3>
                                <div className="space-y-2">
                                    {draft.records.map((rec, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                            <div>
                                                <p className="font-medium text-sm">{rec.nama}</p>
                                                <p className="text-xs text-gray-500">{rec.nik} • {rec.perusahaan}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded ${rec.q1_gembokTagTerpasang ? 'bg-muted text-foreground' : 'bg-red-100 text-red-700'}`}>
                                                        Q1: {rec.q1_gembokTagTerpasang ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${rec.q2_dangerTagSesuai ? 'bg-muted text-foreground' : 'bg-red-100 text-red-700'}`}>
                                                        Q2: {rec.q2_dangerTagSesuai ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${rec.q3_gembokSesuai ? 'bg-muted text-foreground' : 'bg-red-100 text-red-700'}`}>
                                                        Q3: {rec.q3_gembokSesuai ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${rec.q4_kunciUnik ? 'bg-muted text-foreground' : 'bg-red-100 text-red-700'}`}>
                                                        Q4: {rec.q4_kunciUnik ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${rec.q5_haspBenar ? 'bg-muted text-foreground' : 'bg-red-100 text-red-700'}`}>
                                                        Q5: {rec.q5_haspBenar ? '✓' : '✗'}
                                                    </span>
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
