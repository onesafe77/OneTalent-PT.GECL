import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Camera,  ClipboardCheck, Check, ArrowRight, Save, Plus, Shield, ChevronDown  } from "lucide-react";
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

// ============================================
// INSPECTION ITEMS — Impact
// Matches official GECL template (22. Inspeksi IMPACT)
// ============================================

const INSPECTION_ITEMS = [
    { id: "1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
    { id: "2", text: "Apakah tagging Masih Berlaku?" },
    { id: "3", text: "Apakah tidak ada keretakan pada bagian Impact? (visual check)" },
    { id: "4", text: "Apakah tidak ada kerusakan pada bagian adaptor angin?" },
    { id: "5", text: "Apakah valve switch putaran kanan dan kiri berfungsi dengan baik?" },
    { id: "6", text: "Apakah selang supply untuk angin tidak ada kebocoran dan kerusakan?" },
    { id: "7", text: "Apakah setelan torsi berfungsi dengan baik?" }
];

// ============================================
// INTERFACES
// ============================================

interface EquipmentRecord {
    ordinal?: number;
    equipmentType: string;
    noRegisterPeralatan: string;
    inspectionResults: Record<string, string>;
    tindakLanjutPerbaikan: Record<string, string>;
    dueDate: string;
}

interface Inspector {
    nama: string;
    perusahaan: string;
    tandaTangan: string;
}

interface ImpactDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        namaWorkshop: string;
        lokasi: string;
        shift: string;
        waktu: string;
        penanggungJawabArea: string;
    };
    equipment: EquipmentRecord[];
    inspectors: Inspector[];
}

const initialDraftData: ImpactDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        namaWorkshop: "",
        lokasi: "",
        shift: "",
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        penanggungJawabArea: ""
    },
    equipment: [],
    inspectors: []
};

const MAX_EQUIPMENT = 20;
const MAX_INSPECTORS = 2;

export default function SidakImpactForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<ImpactDraftData>({
        key: "impact-sidak",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<ImpactDraftData>(initialDraftData);

    const [currentEquipment, setCurrentEquipment] = useState<EquipmentRecord>({
        equipmentType: "IMPACT",
        noRegisterPeralatan: "",
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

    // ============================================
    // API MUTATIONS
    // ============================================

    const handleCreateSession = useMutation({
        mutationFn: async (data: ImpactDraftData["headerData"]) => {
            const payload = {
                ...data,
                totalImpact: 0,
                activityPhotos: []
            };
            const res = await apiRequest("/api/sidak-impact", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan inspeksi peralatan Impact." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddEquipment = useMutation({
        mutationFn: async (equipment: EquipmentRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-impact/${draft.sessionId}/records`, "POST", {
                ...equipment,
                sessionId: draft.sessionId,
                ordinal: draft.equipment.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, equipment: [...prev.equipment, data] }));
            setCurrentEquipment({
                equipmentType: "IMPACT",
                noRegisterPeralatan: "",
                inspectionResults: {},
                tindakLanjutPerbaikan: {},
                dueDate: ""
            });
            toast({ title: "Data Disimpan", description: "Peralatan Impact berhasil ditambahkan." });
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
            const res = await apiRequest(`/api/sidak-impact/${draft.sessionId}/observers`, "POST", {
                ...inspector,
                sessionId: draft.sessionId,
                ordinal: draft.inspectors.length + 1
            });
            return res;
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
                await apiRequest(`/api/sidak-impact/${draft.sessionId}/photos`, "POST", { photos: activityPhotos });
            } catch (err) {
                console.error("Failed to upload photos:", err);
                toast({ title: "Peringatan", description: "Gagal mengupload bukti kegiatan, namun data inspeksi tetap tersimpan.", variant: "destructive" });
            }
        }

        queryClient.invalidateQueries({ queryKey: ['/api/sidak-impact/sessions'] });
        ignoreDraft(); // Clear draft data

        navigate("/workspace/sidak/impact/history");
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
        if (!currentEquipment.noRegisterPeralatan.trim()) return false;
        const allAnswered = INSPECTION_ITEMS.every(
            item => currentEquipment.inspectionResults[item.id] === "S" || currentEquipment.inspectionResults[item.id] === "TS"
        );
        if (!allAnswered) return false;

        // Verify all TS have follow up
        const tsItems = INSPECTION_ITEMS.filter(i => currentEquipment.inspectionResults[i.id] === "TS");
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
                    disabled={!draft.headerData.namaWorkshop || !draft.headerData.lokasi || !draft.headerData.shift || handleCreateSession.isPending}
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
                                {canAddMoreEquipment ? "Simpan Impact" : "Batas Maksimal"}
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
                formType="sidak-impact"
            />

            <MobileSidakLayout
                title="CHECKLIST INSPEKSI IMPACT"
                subtitle="Inspeksi Peralatan Impact System"
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
                                Lengkapi data workshop dan lokasi inspeksi peralatan impact.
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
                                <Label className="text-xs font-semibold uppercase text-gray-500">Nama Workshop <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nama workshop"
                                    value={draft.headerData.namaWorkshop}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaWorkshop: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Area A, Bay 2, dll"
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
                                <Label className="text-xs font-semibold uppercase text-gray-500">Penanggung Jawab Area</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Nama penanggung jawab area"
                                    value={draft.headerData.penanggungJawabArea}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, penanggungJawabArea: e.target.value } }))}
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
                                <p className="text-xs text-gray-500 uppercase font-semibold">Unit Diinspeksi</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.equipment.length} <span className="text-sm text-gray-400 font-normal">/ {MAX_EQUIPMENT}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                                <Shield className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Register Number Input */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">IMPACT</Badge>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">No Register Peralatan <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nomor register peralatan"
                                    value={currentEquipment.noRegisterPeralatan}
                                    onChange={(e) => setCurrentEquipment(prev => ({ ...prev, noRegisterPeralatan: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Inspection Checklist */}
                        {currentEquipment.noRegisterPeralatan.trim() && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold text-gray-700 dark:text-gray-200">Checklist Inspeksi</Label>
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-green-600">S = Sesuai</span>
                                            <span className="text-red-600">TS = Tidak Sesuai</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {INSPECTION_ITEMS.map((item) => (
                                            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xs font-bold text-gray-500 mt-1 min-w-[30px]">{item.id}.</span>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">{item.text}</p>
                                                        <Select
                                                            value={currentEquipment.inspectionResults[item.id] || ""}
                                                            onValueChange={(val: string) => updateInspectionResult(item.id, val)}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white border-gray-200 w-full max-w-[150px]">
                                                                <SelectValue placeholder="Pilih..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="S">S (Sesuai)</SelectItem>
                                                                <SelectItem value="TS">TS (Tidak Sesuai)</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        {currentEquipment.inspectionResults[item.id] === "TS" && (
                                                            <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                <Label className="text-[10px] font-bold text-red-600 uppercase">Tindak Lanjut Perbaikan</Label>
                                                                <Textarea
                                                                    placeholder={`Jelaskan perbaikan untuk: ${item.text}`}
                                                                    className="text-xs bg-white border-red-200 focus:border-red-400 focus:ring-red-400"
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

                                {/* Corrective Action */}
                                {countTSItems() > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-800 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="destructive">{countTSItems()} Item Tidak Sesuai</Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Global Due Date (Semua TS)</Label>
                                            <Input
                                                type="date"
                                                className="h-12 bg-white border-gray-200"
                                                value={currentEquipment.dueDate}
                                                onChange={(e) => setCurrentEquipment(prev => ({ ...prev, dueDate: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Saved Equipment List */}
                        {draft.equipment.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-3">Impact Tercatat ({draft.equipment.length})</h3>
                                <div className="space-y-2">
                                    {draft.equipment.map((eq, idx) => {
                                        const tsCount = Object.values(eq.inspectionResults || {}).filter(v => v === "TS").length;
                                        return (
                                            <div key={idx} className="p-3 bg-gray-50 rounded-xl border flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm">Impact {idx + 1}</p>
                                                    <p className="text-xs text-gray-500">No. Reg: {eq.noRegisterPeralatan || '-'}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {tsCount > 0 && (
                                                        <Badge variant="destructive" className="text-xs">{tsCount} TS</Badge>
                                                    )}
                                                    <Check className="h-5 w-5 text-green-600" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: OBSERVERS/PENGESAHAN */}
                {draft.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-lg">Pengesahan</h3>
                                <p className="text-xs text-gray-500">Minimal 1 inspektor diperlukan</p>
                            </div>

                            {draft.inspectors.length > 0 && (
                                <div className="space-y-3">
                                    {draft.inspectors.map((ins, idx) => (
                                        <div key={idx} className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm text-green-900">{ins.nama}</p>
                                                <p className="text-[10px] text-green-700">{ins.perusahaan}</p>
                                            </div>
                                            <Check className="h-5 w-5 text-green-600" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {canAddMoreInspectors && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-gray-500">Nama Inspektor</Label>
                                        <Input
                                            placeholder="Masukkan nama lengkap"
                                            value={currentInspector.nama}
                                            onChange={e => setCurrentInspector(prev => ({ ...prev, nama: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-gray-500">Perusahaan</Label>
                                        <Input
                                            placeholder="Nama perusahaan"
                                            value={currentInspector.perusahaan}
                                            onChange={e => setCurrentInspector(prev => ({ ...prev, perusahaan: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-gray-500">Tanda Tangan</Label>
                                        <SignaturePad
                                            onSave={(dataUrl) => setCurrentInspector(prev => ({ ...prev, tandaTangan: dataUrl }))}
                                        />
                                    </div>

                                    <Button
                                        onClick={() => {
                                            if (!currentInspector.nama.trim()) {
                                                toast({ title: "Nama wajib diisi", variant: "destructive" });
                                                return;
                                            }
                                            handleAddInspector.mutate(currentInspector);
                                        }}
                                        disabled={!currentInspector.nama.trim() || handleAddInspector.isPending}
                                        className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {handleAddInspector.isPending ? "Menyimpan..." : "Tambah Inspektor"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </MobileSidakLayout >
        </>
    );
}
