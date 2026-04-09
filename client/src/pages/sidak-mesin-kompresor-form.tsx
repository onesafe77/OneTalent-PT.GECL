import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, ArrowRight, Save, Plus, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import { MESIN_KOMPRESOR_INSPECTION_ITEMS } from "@/lib/sidak-mesin-kompresor-pdf-utils";

// ============================================
// INTERFACES
// ============================================

interface MesinKompresorRecord {
    ordinal?: number;
    namaObjek: string;
    inspectionResults: Record<string, string>;
    tindakLanjutPerbaikan: Record<string, string>;
    dueDate: string;
}

interface Inspector {
    nama: string;
    jabatan: string;
    departemen: string;
    perusahaan: string;
    tandaTangan: string;
}

interface MesinKompresorDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        namaObjekInspeksi: string;
        lokasi: string;
        shift: string;
        waktu: string;
        penanggungJawab: string;
    };
    records: MesinKompresorRecord[];
    inspectors: Inspector[];
}

const initialDraftData: MesinKompresorDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        namaObjekInspeksi: "",
        lokasi: "",
        shift: "",
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        penanggungJawab: ""
    },
    records: [],
    inspectors: []
};

const MAX_RECORDS = 10;
const MAX_INSPECTORS = 2; // Matches the 2 signature slots in the requirements image

export default function SidakMesinKompresorForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<MesinKompresorDraftData>({
        key: "mesin-kompresor-sidak",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<MesinKompresorDraftData>(initialDraftData);

    const [currentRecord, setCurrentRecord] = useState<MesinKompresorRecord>({
        namaObjek: "",
        inspectionResults: {},
        tindakLanjutPerbaikan: {},
        dueDate: ""
    });

    const [currentInspector, setCurrentInspector] = useState<Inspector>({
        nama: "",
        jabatan: "",
        departemen: "",
        perusahaan: "",
        tandaTangan: ""
    });

    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

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
            if ((restored.step === 2 || restored.step === 3) && !restored.sessionId) {
                toast({
                    title: "Draft Tidak Lengkap",
                    description: "Draft sebelumnya tidak memiliki sesi aktif. Dimulai dari awal.",
                    variant: "destructive"
                });
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

    // ============================================
    // API MUTATIONS
    // ============================================

    const handleCreateSession = useMutation({
        mutationFn: async (data: MesinKompresorDraftData["headerData"]) => {
            const res = await apiRequest("/api/sidak-mesin-kompresor", "POST", data);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan mulai inspeksi Mesin Kompresor." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: MesinKompresorRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-mesin-kompresor/${draft.sessionId}/records`, "POST", {
                ...record,
                sessionId: draft.sessionId,
                ordinal: draft.records.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            const result = Array.isArray(data) ? data[0] : data;
            setDraft(prev => ({ ...prev, records: [...prev.records, result] }));
            setCurrentRecord({
                namaObjek: "",
                inspectionResults: {},
                tindakLanjutPerbaikan: {},
                dueDate: ""
            });
            toast({ title: "Data Disimpan", description: "Inspeksi berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal Menyimpan",
                description: error.message || "Terjadi kesalahan saat menyimpan data.",
                variant: "destructive"
            });
        }
    });

    const handleAddInspector = useMutation({
        mutationFn: async (inspector: Inspector) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-mesin-kompresor/${draft.sessionId}/observers`, "POST", {
                ...inspector,
                sessionId: draft.sessionId,
                ordinal: draft.inspectors.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            const result = Array.isArray(data) ? data[0] : data;
            setDraft(prev => ({ ...prev, inspectors: [...prev.inspectors, result] }));
            setCurrentInspector({ nama: "", jabatan: "", departemen: "", perusahaan: "", tandaTangan: "" });
            toast({ title: "Inspektor Disimpan" });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal Menyimpan Inspektor",
                description: error.message || "Terjadi kesalahan.",
                variant: "destructive"
            });
        }
    });

    const handleFinish = () => {
        if (draft.inspectors.length === 0) {
            toast({
                title: "Inspektor Diperlukan",
                description: "Minimal 1 inspektor harus ditambahkan.",
                variant: "destructive"
            });
            return;
        }
        navigate("/workspace/sidak/mesin-kompresor/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Mesin Kompresor telah disimpan." });
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const updateInspectionResult = (itemId: string, value: string) => {
        setCurrentRecord(prev => {
            const nextResults = { ...prev.inspectionResults, [itemId]: value };
            const nextFollowUp = { ...prev.tindakLanjutPerbaikan };
            if (value !== "TS") delete nextFollowUp[itemId];
            return {
                ...prev,
                inspectionResults: nextResults,
                tindakLanjutPerbaikan: nextFollowUp
            };
        });
    };

    const updateCorrectiveAction = (itemId: string, value: string) => {
        setCurrentRecord(prev => ({
            ...prev,
            tindakLanjutPerbaikan: {
                ...prev.tindakLanjutPerbaikan,
                [itemId]: value
            }
        }));
    };

    const isRecordValid = () => {
        if (!currentRecord.namaObjek.trim()) return false;
        const allAnswered = MESIN_KOMPRESOR_INSPECTION_ITEMS.every(
            item => currentRecord.inspectionResults[item.id] === "S" || currentRecord.inspectionResults[item.id] === "TS"
        );
        if (!allAnswered) return false;

        const tsItems = MESIN_KOMPRESOR_INSPECTION_ITEMS.filter(i => currentRecord.inspectionResults[i.id] === "TS");
        const allFollowedUp = tsItems.every(i => (currentRecord.tindakLanjutPerbaikan[i.id] || "").trim().length > 0);

        return allFollowedUp;
    };

    const countTSItems = () => {
        return Object.values(currentRecord.inspectionResults).filter(v => v === "TS").length;
    };

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!draft.headerData.namaObjekInspeksi || !draft.headerData.lokasi || handleCreateSession.isPending}
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
                        disabled={!isRecordValid() || draft.records.length >= MAX_RECORDS || handleAddRecord.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {handleAddRecord.isPending ? (
                            <>Menyimpan...</>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 mr-2" />
                                {draft.records.length < MAX_RECORDS ? "Simpan Hasil Inspeksi" : "Batas Maksimal"}
                            </>
                        )}
                    </Button>
                    {draft.records.length > 0 && (
                        <Button
                            onClick={() => setDraft(prev => ({ ...prev, step: 3 }))}
                            variant="outline"
                            className="w-full h-12 border-2 border-gray-200"
                        >
                            Lanjut ke Inspektor ({draft.records.length})
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            );
        }
        if (draft.step === 3) {
            return (
                <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200 dark:shadow-none"
                    onClick={handleFinish}
                    disabled={draft.inspectors.length === 0}
                >
                    <Save className="w-5 h-5 mr-3" />
                    SELESAI & SIMPAN {draft.inspectors.length > 0 && `(${draft.inspectors.length})`}
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
                formType="sidak-mesin-kompresor"
            />

            <MobileSidakLayout
                title="INSPEKSI MESIN KOMPRESOR"
                subtitle="Checklist Inspeksi Fasilitas Mesin Kompresor"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {/* STEP 1: Header */}
                {draft.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Info Pelaksanaan</h3>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-300">
                                Masukkan detail lokasi dan objek inspeksi mesin kompresor.
                            </p>
                        </div>

                        <div className="space-y-4">
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
                                <Label className="text-xs font-semibold uppercase text-gray-500">Nama Objek Inspeksi <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nama objek"
                                    value={draft.headerData.namaObjekInspeksi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaObjekInspeksi: e.target.value } }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        placeholder="Contoh: Workshop Port"
                                        value={draft.headerData.lokasi}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Shift</Label>
                                    <Select
                                        value={draft.headerData.shift}
                                        onValueChange={val => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, shift: val } }))}
                                    >
                                        <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Pilih Shift" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Shift 1">Shift 1</SelectItem>
                                            <SelectItem value="Shift 2">Shift 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Waktu</Label>
                                    <Input
                                        type="time"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.waktu}
                                        onChange={e => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, waktu: e.target.value } }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Penanggung Jawab</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nama PJ"
                                    value={draft.headerData.penanggungJawab}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, penanggungJawab: e.target.value } }))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Record */}
                {draft.step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">ID Kompresor / Nomor Register <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: COMP-001"
                                    value={currentRecord.namaObjek}
                                    onChange={(e) => setCurrentRecord(prev => ({ ...prev, namaObjek: e.target.value }))}
                                />
                            </div>
                        </div>

                        {currentRecord.namaObjek.trim() && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold">Checklist Inspeksi ({MESIN_KOMPRESOR_INSPECTION_ITEMS.length} Item)</Label>
                                        <Badge className="bg-blue-100 text-blue-700">{Math.round((Object.keys(currentRecord.inspectionResults).length / MESIN_KOMPRESOR_INSPECTION_ITEMS.length) * 100)}%</Badge>
                                    </div>

                                    <div className="space-y-3">
                                        {MESIN_KOMPRESOR_INSPECTION_ITEMS.map((item) => (
                                            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-800">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 mt-0.5">{item.id}</span>
                                                        <p className="text-xs text-gray-800 dark:text-gray-200">{item.label}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant={currentRecord.inspectionResults[item.id] === "S" ? "default" : "outline"}
                                                            className={cn("h-8 flex-1 text-xs", currentRecord.inspectionResults[item.id] === "S" && "bg-green-600 hover:bg-green-700 text-white")}
                                                            onClick={() => updateInspectionResult(item.id, "S")}
                                                        >
                                                            Sesuai (S)
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={currentRecord.inspectionResults[item.id] === "TS" ? "destructive" : "outline"}
                                                            className={cn("h-8 flex-1 text-xs")}
                                                            onClick={() => updateInspectionResult(item.id, "TS")}
                                                        >
                                                            Tidak Sesuai (TS)
                                                        </Button>
                                                    </div>

                                                    {currentRecord.inspectionResults[item.id] === "TS" && (
                                                        <div className="mt-2 space-y-2">
                                                            <Label className="text-[10px] font-bold text-red-600">Tindak Lanjut Perbaikan</Label>
                                                            <Textarea
                                                                className="text-xs min-h-[60px]"
                                                                placeholder="Jelaskan rencana perbaikan..."
                                                                value={currentRecord.tindakLanjutPerbaikan[item.id] || ""}
                                                                onChange={(e) => updateCorrectiveAction(item.id, e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {countTSItems() > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-800 space-y-4">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Due Date Perbaikan</Label>
                                        <Input
                                            type="date"
                                            className="h-12 bg-white"
                                            value={currentRecord.dueDate}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, dueDate: e.target.value }))}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: Inspectors */}
                {draft.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-lg">Pengesahan (Inspektur)</h3>
                                <p className="text-xs text-gray-500">Tambahkan inspektur yang bertugas (Maksimal {MAX_INSPECTORS}).</p>
                            </div>

                            {draft.inspectors.length > 0 && (
                                <div className="space-y-2">
                                    {draft.inspectors.map((ins, idx) => (
                                        <div key={idx} className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{ins.nama}</p>
                                                <p className="text-[10px] text-gray-500">{ins.jabatan} - {ins.perusahaan}</p>
                                            </div>
                                            <Check className="h-5 w-5 text-green-600" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {draft.inspectors.length < MAX_INSPECTORS && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-gray-400">Nama</Label>
                                        <Input
                                            className="h-11 shadow-none"
                                            placeholder="Nama Lengkap"
                                            value={currentInspector.nama}
                                            onChange={e => setCurrentInspector(prev => ({ ...prev, nama: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold text-gray-400">Jabatan</Label>
                                            <Input
                                                className="h-11 shadow-none"
                                                placeholder="Jabatan"
                                                value={currentInspector.jabatan}
                                                onChange={e => setCurrentInspector(prev => ({ ...prev, jabatan: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold text-gray-400">Perusahaan</Label>
                                            <Input
                                                className="h-11 shadow-none"
                                                placeholder="Perusahaan"
                                                value={currentInspector.perusahaan}
                                                onChange={e => setCurrentInspector(prev => ({ ...prev, perusahaan: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-gray-400">Tanda Tangan</Label>
                                        <SignaturePad
                                            onSave={(dataUrl) => setCurrentInspector(prev => ({ ...prev, tandaTangan: dataUrl }))}
                                        />
                                    </div>
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 h-11"
                                        disabled={!currentInspector.nama || !currentInspector.tandaTangan || handleAddInspector.isPending}
                                        onClick={() => handleAddInspector.mutate(currentInspector)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Simpan Inspektur
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </MobileSidakLayout>
        </>
    );
}
