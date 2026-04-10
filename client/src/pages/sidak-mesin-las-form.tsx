import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Camera, ClipboardCheck, Check, ArrowRight, Save, Plus, Shield, ChevronDown } from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import { MESIN_LAS_CHECKLIST } from "@/lib/sidak-mesin-las-pdf-utils";

// ============================================
// INSPECTION ITEMS — Mesin Las
// ============================================

const ALL_ITEMS = MESIN_LAS_CHECKLIST.flatMap(cat => cat.items);

// ============================================
// INTERFACES
// ============================================

interface EquipmentRecord {
    ordinal?: number;
    noRegisterMesinLas: string;
    inspectionResults: Record<string, string>;
    tindakLanjutPerbaikan: Record<string, string>;
    dueDate: string;
}

interface Inspector {
    nama: string;
    perusahaan: string;
    tandaTangan: string;
}

interface MesinLasDraftData {
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
    equipment: EquipmentRecord[];
    inspectors: Inspector[];
}

const initialDraftData: MesinLasDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        namaObjekInspeksi: "",
        lokasi: "",
        shift: "",
        waktu: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        penanggungJawab: ""
    },
    equipment: [],
    inspectors: []
};

const MAX_EQUIPMENT = 20;
const MAX_INSPECTORS = 2;

export default function SidakMesinLasForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<MesinLasDraftData>({
        key: "mesin-las-sidak",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<MesinLasDraftData>(initialDraftData);

    const [currentEquipment, setCurrentEquipment] = useState<EquipmentRecord>({
        noRegisterMesinLas: "",
        inspectionResults: {},
        tindakLanjutPerbaikan: {},
        dueDate: ""
    });

    const [currentInspector, setCurrentInspector] = useState<Inspector>({
        nama: "",
        perusahaan: "",
        tandaTangan: ""
    });

    const [activityPhotos, setActivityPhotos] = useState<string[]>([]);

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

    useEffect(() => {
        // Auto-fix for old drafts with dot in time format (id-ID locale)
        if (draft.headerData.waktu && draft.headerData.waktu.includes('.')) {
            setDraft(prev => ({
                ...prev,
                headerData: {
                    ...prev.headerData,
                    waktu: prev.headerData.waktu.replace('.', ':')
                }
            }));
        }
    }, [draft.headerData.waktu]);

    // ============================================
    // API MUTATIONS
    // ============================================

    const handleCreateSession = useMutation({
        mutationFn: async (data: MesinLasDraftData["headerData"]) => {
            const payload = {
                ...data,
                totalMesinLas: 0,
                activityPhotos: []
            };
            const res = await apiRequest("/api/sidak-mesin-las", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan inspeksi Mesin Las." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddEquipment = useMutation({
        mutationFn: async (equipment: EquipmentRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-mesin-las/${draft.sessionId}/records`, "POST", [{
                ...equipment,
                sessionId: draft.sessionId,
                ordinal: draft.equipment.length + 1
            }]);
            return res[0];
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, equipment: [...prev.equipment, data] }));
            setCurrentEquipment({
                noRegisterMesinLas: "",
                inspectionResults: {},
                tindakLanjutPerbaikan: {},
                dueDate: ""
            });
            toast({ title: "Data Disimpan", description: "Mesin Las berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            console.error("Failed to add equipment:", error);
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
            const res = await apiRequest(`/api/sidak-mesin-las/${draft.sessionId}/observers`, "POST", [{
                ...inspector,
                sessionId: draft.sessionId,
                ordinal: draft.inspectors.length + 1
            }]);
            return res[0];
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, inspectors: [...prev.inspectors, data] }));
            setCurrentInspector({ nama: "", perusahaan: "", tandaTangan: "" });
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

    const handleFinish = async () => {
        if (draft.inspectors.length === 0) {
            toast({
                title: "Inspektor Diperlukan",
                description: "Minimal 1 inspektor harus ditambahkan.",
                variant: "destructive"
            });
            return;
        }

        if (activityPhotos.length > 0 && draft.sessionId) {
            try {
                await apiRequest(`/api/sidak-mesin-las/${draft.sessionId}/photos`, "POST", { photos: activityPhotos });
            } catch (err) {
                console.error("Failed to upload photos:", err);
                toast({ title: "Peringatan", description: "Gagal mengupload bukti kegiatan, namun data inspeksi tetap tersimpan.", variant: "destructive" });
            }
        }

        queryClient.invalidateQueries({ queryKey: ['/api/sidak-mesin-las/sessions'] });
        ignoreDraft(); // Clear draft data

        navigate("/workspace/sidak/mesin-las/history");
        toast({ title: "Selesai", description: "Laporan SIDAK telah disimpan." });
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const updateInspectionResult = (itemId: string, value: string) => {
        setCurrentEquipment(prev => {
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
        setCurrentEquipment(prev => ({
            ...prev,
            tindakLanjutPerbaikan: {
                ...prev.tindakLanjutPerbaikan,
                [itemId]: value
            }
        }));
    };

    const canAddMoreEquipment = draft.equipment.length < MAX_EQUIPMENT;
    const canAddMoreInspectors = draft.inspectors.length < MAX_INSPECTORS;

    const isEquipmentValid = () => {
        if (!currentEquipment.noRegisterMesinLas.trim()) return false;
        const allAnswered = ALL_ITEMS.every(
            item => currentEquipment.inspectionResults[item.id] === "S" || currentEquipment.inspectionResults[item.id] === "TS"
        );
        if (!allAnswered) return false;

        // Verify all TS have follow up
        const tsItems = ALL_ITEMS.filter(i => currentEquipment.inspectionResults[i.id] === "TS");
        const allFollowedUp = tsItems.every(i => (currentEquipment.tindakLanjutPerbaikan[i.id] || "").trim().length > 0);

        return allFollowedUp;
    };

    const countTSItems = () => {
        return Object.values(currentEquipment.inspectionResults).filter(v => v === "TS").length;
    };

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!draft.headerData.namaObjekInspeksi || !draft.headerData.lokasi || !draft.headerData.shift || handleCreateSession.isPending}
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
                        onClick={() => handleAddEquipment.mutate(currentEquipment)}
                        disabled={!isEquipmentValid() || !canAddMoreEquipment || handleAddEquipment.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {handleAddEquipment.isPending ? (
                            <>Menyimpan...</>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 mr-2" />
                                {canAddMoreEquipment ? "Simpan Alat" : "Batas Maksimal"}
                            </>
                        )}
                    </Button>
                    {draft.equipment.length > 0 && (
                        <Button
                            onClick={() => setDraft(prev => ({ ...prev, step: 3 }))}
                            variant="outline"
                            className="w-full h-12 border-2 border-gray-200"
                        >
                            Lanjut ke Inspektor ({draft.equipment.length})
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
                    SELESAI & SIMPAN {draft.inspectors.length > 0 && `(${draft.inspectors.length} Inspektor)`}
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
                formType="sidak-mesin-las"
            />

            <MobileSidakLayout
                title="CHECKLIST INSPEKSI MESIN LAS"
                subtitle="Inspeksi Mesin Las & APD Khusus"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {/* STEP 1: Header Info */}
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
                                Lengkapi data objek inspeksi dan lokasi untuk memulai sesi.
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
                                    placeholder="Contoh: Mesin Las Millermatic, dll"
                                    value={draft.headerData.namaObjekInspeksi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaObjekInspeksi: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Area Workshop A, Bay 3"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Shift <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={draft.headerData.shift}
                                        onValueChange={val => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, shift: val } }))}
                                    >
                                        <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Shift" />
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
                                    placeholder="Nama penanggung jawab"
                                    value={draft.headerData.penanggungJawab}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, penanggungJawab: e.target.value } }))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Equipment Inspection */}
                {draft.step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Alat Diinspeksi</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.equipment.length} <span className="text-sm text-gray-400 font-normal">/ {MAX_EQUIPMENT}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                                <Shield className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Register Number Input */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">MESIN LAS</Badge>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">No Register Mesin Las <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nomor register alat"
                                    value={currentEquipment.noRegisterMesinLas}
                                    onChange={(e) => setCurrentEquipment(prev => ({ ...prev, noRegisterMesinLas: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Inspection Checklist */}
                        {currentEquipment.noRegisterMesinLas.trim() && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold text-gray-700 dark:text-gray-200">Checklist Inspeksi</Label>
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-green-600 font-bold">S</span>
                                            <span className="text-red-600 font-bold">TS</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {MESIN_LAS_CHECKLIST.map((category) => (
                                            <div key={category.category} className="space-y-3">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg">{category.category}</h4>
                                                <div className="space-y-2">
                                                    {category.items.map((item) => (
                                                        <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-800">
                                                            <div className="flex items-start gap-3">
                                                                <span className="text-[10px] font-bold text-gray-400 mt-1 min-w-[24px]">{item.id}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-3 leading-relaxed">{item.label}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant={currentEquipment.inspectionResults[item.id] === 'S' ? 'default' : 'outline'}
                                                                            className={cn(
                                                                                "flex-1 h-9 font-bold",
                                                                                currentEquipment.inspectionResults[item.id] === 'S' && "bg-green-600 hover:bg-green-700"
                                                                            )}
                                                                            onClick={() => updateInspectionResult(item.id, 'S')}
                                                                        >
                                                                            {currentEquipment.inspectionResults[item.id] === 'S' && <Check className="w-4 h-4 mr-1" />}
                                                                            SESUAI (S)
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={currentEquipment.inspectionResults[item.id] === 'TS' ? 'default' : 'outline'}
                                                                            className={cn(
                                                                                "flex-1 h-9 font-bold",
                                                                                currentEquipment.inspectionResults[item.id] === 'TS' && "bg-red-600 hover:bg-red-700"
                                                                            )}
                                                                            onClick={() => updateInspectionResult(item.id, 'TS')}
                                                                        >
                                                                            TIDAK SESUAI (TS)
                                                                        </Button>
                                                                    </div>

                                                                    {currentEquipment.inspectionResults[item.id] === "TS" && (
                                                                        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-red-50 p-3 rounded-xl border border-red-100">
                                                                            <Label className="text-[10px] font-bold text-red-600 uppercase">Tindak Lanjut Perbaikan</Label>
                                                                            <Textarea
                                                                                placeholder={`Rencana perbaikan untuk item ${item.id}...`}
                                                                                className="text-xs bg-white border-red-200 focus:border-red-400 focus:ring-red-400 min-h-[80px]"
                                                                                value={currentEquipment.tindakLanjutPerbaikan[item.id] || ""}
                                                                                onChange={(e) => updateCorrectiveAction(item.id, e.target.value)}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Global Due Date for TS */}
                                {countTSItems() > 0 && (
                                    <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-800 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-orange-600 text-white border-none">{countTSItems()} Temuan Masuk Daftar Perbaikan</Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-gray-500">Target Penyelesaian (Due Date)</Label>
                                            <Input
                                                type="date"
                                                className="h-12 bg-white border-orange-200 focus:border-orange-400"
                                                value={currentEquipment.dueDate}
                                                onChange={(e) => setCurrentEquipment(prev => ({ ...prev, dueDate: e.target.value }))}
                                            />
                                            <p className="text-[10px] text-orange-600 font-medium italic">* Batas waktu untuk menindaklanjuti semua temuan di atas.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Saved Records List */}
                        {draft.equipment.length > 0 && (
                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                    Data Inspeksi ({draft.equipment.length})
                                </h3>
                                <div className="space-y-3">
                                    {draft.equipment.map((eq, idx) => {
                                        const tsCount = Object.values(eq.inspectionResults || {}).filter(v => v === "TS").length;
                                        return (
                                            <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center font-bold text-blue-600">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">Reg: {eq.noRegisterMesinLas}</p>
                                                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            Status: {tsCount > 0 ? <span className="text-red-500 font-bold">{tsCount} Temuan</span> : <span className="text-green-500 font-bold text-[8px]">AMAN</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                {tsCount > 0 ? (
                                                    <Badge variant="destructive" className="rounded-full h-6 w-6 p-0 flex items-center justify-center text-[10px] font-bold">!</Badge>
                                                ) : (
                                                    <Check className="h-5 w-5 text-green-500" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: OBSERVERS */}
                {draft.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Pengesahan Lapangan</h3>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold font-mono">Lengkapi Tanda Tangan Inspektur</p>
                                </div>
                            </div>

                            {draft.inspectors.length > 0 && (
                                <div className="space-y-3">
                                    {draft.inspectors.map((ins, idx) => (
                                        <div key={idx} className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800 flex items-center justify-between animate-in zoom-in-95 duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center font-bold text-green-700">
                                                    {ins.nama.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-green-900 dark:text-green-100">{ins.nama}</p>
                                                    <p className="text-[10px] text-green-600 dark:text-green-400 uppercase">{ins.perusahaan}</p>
                                                </div>
                                            </div>
                                            <Check className="h-6 w-6 text-green-600" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {canAddMoreInspectors && (
                                <div className="space-y-5 pt-6 border-t border-gray-100 dark:border-gray-700">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Nama Lengkap Inspektur <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl"
                                            placeholder="Masukkan nama"
                                            value={currentInspector.nama}
                                            onChange={e => setCurrentInspector(prev => ({ ...prev, nama: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Perusahaan / Departemen <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl"
                                            placeholder="Contoh: PT. BIB, HSE, dll"
                                            value={currentInspector.perusahaan}
                                            onChange={e => setCurrentInspector(prev => ({ ...prev, perusahaan: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Tanda Tangan Digital <span className="text-red-500">*</span></Label>
                                        <div className="rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-700">
                                            <SignaturePad
                                                onSave={(dataUrl) => setCurrentInspector(prev => ({ ...prev, tandaTangan: dataUrl }))}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => {
                                            if (!currentInspector.nama.trim()) {
                                                toast({ title: "Nama wajib diisi", variant: "destructive" });
                                                return;
                                            }
                                            if (!currentInspector.tandaTangan) {
                                                toast({ title: "Tanda tangan wajib diisi", variant: "destructive" });
                                                return;
                                            }
                                            handleAddInspector.mutate(currentInspector);
                                        }}
                                        disabled={!currentInspector.nama.trim() || !currentInspector.tandaTangan || handleAddInspector.isPending}
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none font-bold"
                                    >
                                        {handleAddInspector.isPending ? "Sedang Menyimpan..." : (
                                            <>
                                                <Plus className="w-5 h-5 mr-2" />
                                                Tambah Inspektur Digital
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Section Upload Foto Kegiatan - BEGIN */}
                            <div className="space-y-4 pt-6 border-t mt-6">
                                <div className="flex items-center justify-between">
                                    <Label className="font-bold text-gray-700">Bukti Kegiatan (Opsional)</Label>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 align-middle">
                                        {activityPhotos.length}/6 Foto
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {activityPhotos.map((photo, i) => (
                                        <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group border border-gray-200">
                                            <img src={photo} alt="Bukti" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setActivityPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1.5 right-1.5 h-6 w-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transform scale-90 opacity-80 hover:scale-100 hover:opacity-100 transition-all"
                                            >✕</button>
                                        </div>
                                    ))}
                                    {activityPhotos.length < 6 && (
                                        <Label className="flex flex-col items-center justify-center aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                            <Camera className="w-6 h-6 text-gray-400 mb-2" />
                                            <span className="text-[10px] font-bold text-gray-500">TAMBAH FOTO</span>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={e => {
                                                    const files = Array.from(e.target.files || []);
                                                    files.forEach(file => {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setActivityPhotos(prev => {
                                                                if (prev.length >= 6) return prev;
                                                                return [...prev, reader.result as string];
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    });
                                                }}
                                            />
                                        </Label>
                                    )}
                                </div>
                            </div>
                            {/* Section Upload Foto Kegiatan - END */}
                        </div>
                    </div>
                )}
            </MobileSidakLayout >
        </>
    );
}
