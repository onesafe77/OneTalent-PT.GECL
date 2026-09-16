import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, ArrowRight, Save, Plus, Wrench, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// ============================================
// EQUIPMENT TYPES AND INSPECTION ITEMS
// ============================================

const EQUIPMENT_TYPES = {
    APAR: {
        name: "APAR",
        items: [
            { id: "1.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "1.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "1.3", text: "Apakah Kondisi tabung bagus, Tidak retak, Bersih dan tidak corrosive?" },
            { id: "1.4", text: "Apakah selang ada, Kondisinya normal, tidak putus dan tidak tersumbat?" },
            { id: "1.5", text: "Apakah pin pengunci ada?" },
            { id: "1.6", text: "Apakah kondisi handle normal dan tidak corrosive?" },
            { id: "1.7", text: "Apakah jarum penunjuk tekanan pressure dalam kondisi normal?" },
            { id: "1.8", text: "Tekanan gas sesuai, Tidak low atau over pressure?" },
            { id: "1.9", text: "Apakah bracket penahan APAR dalam kondisi bagus?" },
            { id: "1.10", text: "Apakah ada tanda stiker APAR?" },
            { id: "1.11", text: "Apakah APAR tidak terhalang benda-benda lain?" }
        ]
    },
    COMPRESSOR: {
        name: "COMPRESSOR",
        items: [
            { id: "2.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "2.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "2.3", text: "Apakah kondisi Permukaan oli compressor aman?" },
            { id: "2.4", text: "Apakah tidak terdapat Kebocoran oli compressor?" },
            { id: "2.5", text: "Apakah Kondisi fan belt compressor ada tanda-tanda keausan (retak)?" },
            { id: "2.6", text: "Apakah Baut pengikat compressor aman dan tidak longgar?" },
            { id: "2.7", text: "Apakah Kondisi cable instalasi listrik ada yang terkelupas?" },
            { id: "2.8", text: "Apakah kelistrikan dari system kinerja air compressor berfungsi?" },
            { id: "2.9", text: "Apakah tidak terdapat Keretakan structural?" },
            { id: "2.10", text: "Apakah kondisi tekanan angin sesuai?" },
            { id: "2.11", text: "Apakah kondisi kran pengaman tabung aman?" },
            { id: "2.12", text: "Apakah terdapat kebocoran selang compressor?" },
            { id: "2.13", text: "Kondisi Switch ON/OF berfungsi normal?" },
            { id: "2.14", text: "Lakukan pembuangan air pada penampungan tabung udara Pada bagian bawah tabung?" },
            { id: "2.15", text: "Apakah guard pengaman pulley compressor terpasang dan tersedia?" }
        ]
    },
    IMPACT: {
        name: "IMPACT",
        items: [
            { id: "3.1.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "3.1.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "3.1.3", text: "Apakah tidak ada keretakan pada bagian Impact? (visual check)" },
            { id: "3.1.4", text: "Apakah tidak ada kerusakan pada bagian adaptor angin?" },
            { id: "3.1.5", text: "Apakah valve switch putaran kanan dan kiri berfungsi dengan baik?" },
            { id: "3.1.6", text: "Apakah selang supply untuk angin tidak ada kebocoran dan kerusakan?" },
            { id: "3.1.7", text: "Apakah setelan torsi berfungsi dengan baik?" }
        ]
    },
    HYDRAULIC_JACK: {
        name: "HYDRAULIC JACK",
        items: [
            { id: "4.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "4.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "4.3", text: "Apakah tidak terdapat rembesan oli hydraulic pada body jack?" },
            { id: "4.4", text: "Apakah kondisi pompa hydraulic jack berfungsi dengan baik?" },
            { id: "4.5", text: "Apakah valve pengunci hydraulic masih berfungsi dengan baik?" },
            { id: "4.6", text: "Apakah cylinder rod jack tidak ada yang tergores atau rusak?" },
            { id: "4.7", text: "Apakah label SWL masih terlihat dengan jelas?" },
            { id: "4.8", text: "Apakah stang jack tersedia dan tidak terdapat kebocoran?" }
        ]
    },
    GERINDA: {
        name: "GERINDA",
        items: [
            { id: "5.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "5.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "5.3", text: "Apakah Pengunci pada mata gerinder dalam kondisi baik (Tidak Patah, Longgar)?" },
            { id: "5.4", text: "Apakah Control Switch ON/OfF pada grinder Berfungsi Dengan Baik?" },
            { id: "5.5", text: "Apakah kabel dalam kondisi baik? (Tidak Sobek, Terkelupas)" },
            { id: "5.6", text: "Apakah Socket kabel Grinder Dalam kondisi baik?" },
            { id: "5.7", text: "Apakah tutup/pelindung mata grinder masih terpasang dengan baik?" },
            { id: "5.8", text: "Apakah mesin grinder berfungsi dengan benar?" },
            { id: "5.9", text: "Apakah kondisi kelayakan mata grinder masih baik?" }
        ]
    },
    HAMMER: {
        name: "HAMMER",
        items: [
            { id: "6.1", text: "Apakah kondisi kepala palu layak? (tidak ada keretakan atau pecah pada bagian permukaan untuk memukul)" },
            { id: "6.2", text: "Apakah kondisi permukaan kepala palu untuk bagian memukul rata?" },
            { id: "6.3", text: "Apakah kondisi palu layak dan tidak di modifikasi?" },
            { id: "6.4", text: "Apakah gagang palu dalam kondisi baik dan tidak patah?" },
            { id: "6.5", text: "Apakah gagang palu terbuat dari fiber dan tidak licin?" },
            { id: "6.6", text: "Apakah gagang palu tidak terbuat besi?" },
            { id: "6.7", text: "Apakah kondisi kepala palu layak? (tidak ada keretakan atau pecah)" }
        ]
    },
    ENGINE_WELDING: {
        name: "ENGINE WELDING",
        items: [
            { id: "7.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "7.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "7.3", text: "Apakah Kondisi instalasi kabel mesin las layak?" },
            { id: "7.4", text: "Apakah Kondisi kabel Las ada yang terkelupas?" },
            { id: "7.5", text: "Apakah Kondisi stick Las layak?" },
            { id: "7.6", text: "Apakah Kondisi Switch ON/OF berfungsi?" },
            { id: "7.7", text: "Apakah Kondisi Alat pemadam api berfungsi?" },
            { id: "7.8", text: "Apakah tersedia Apron, sarung tangan las, face shield (Topeng las), dan pelindung sepatu?" }
        ]
    },
    CUTTING_TORCH: {
        name: "CUTTING TORCH",
        items: [
            { id: "8.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "8.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "8.3", text: "Apakah kondisi tabung aman?" },
            { id: "8.4", text: "Apakah kondisi baut katub tabung aman?" },
            { id: "8.5", text: "Apakah kondisi regulator accetylin terpasang flash back arrestor dan tersedia putaran valve serta berfungsi dengan baik?" },
            { id: "8.6", text: "Apakah kondisi regulator oksigen terpasang flash back arrestor dan tersedia putaran valve serta berfungsi dengan baik?" },
            { id: "8.7", text: "Apakah ada keretakan kaca tekanan accetylin?" },
            { id: "8.8", text: "Apakah ada keretakan kaca tekanan oksigen?" },
            { id: "8.9", text: "Apakah kondisi katub pengaman aman?" },
            { id: "8.10", text: "Apakah kondisi selang dan sambungan aman?" },
            { id: "8.11", text: "Apakah kondisi alat pemotong sesuai?" },
            { id: "8.12", text: "Apakah kondisi Pengaman tabung aman?" }
        ]
    },
    KERANGKENG: {
        name: "KERANGKENG",
        items: [
            { id: "9.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "9.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "9.3", text: "Apakah tidak ada keretakan pada besi sangkar pengaman tyre?" },
            { id: "9.4", text: "Apakah tidak ada keretakan terjadi pada dinding sangkar pengaman tyre?" },
            { id: "9.5", text: "Apakah pengunci pintu sangkar pengaman tyre berfungsi dengan baik?" },
            { id: "9.6", text: "Apakah tidak terdapat kebengkokan pada tiang penyanggah sangkar pengaman tyre?" },
            { id: "9.7", text: "Apakah tiang penyangga sangkar pengaman tyre di kuatkan pada lantai bangunan?" },
            { id: "9.8", text: "Apakah engsel pintu sangkar pengaman tyre tidak terdapat korosive atau berfungsi dengan baik?" }
        ]
    },
    GREASE_GUN: {
        name: "GREASE GUN",
        items: [
            { id: "10.1", text: "Apakah sudah diinspeksi dan diberi tagging sehingga layak untuk digunakan?" },
            { id: "10.2", text: "Apakah tagging Masih Berlaku?" },
            { id: "10.3", text: "Apakah kondisi tabung grease aman dan tidak terdapat kebocoran dan penyok?" },
            { id: "10.4", text: "Apakah kondisi regulator sesuai?" },
            { id: "10.5", text: "Apakah kondisi hose aman dan tidak bocor?" },
            { id: "10.6", text: "Apakah kondisi stik grease aman?" },
            { id: "10.7", text: "Apakah kondisi pompa grease aman?" },
            { id: "10.8", text: "Apakah kondisi roda aman? Tidak pecah, macet?" },
            { id: "10.9", text: "Apakah kondisi rakor/penampung air aman? Tidak bocor?" }
        ]
    }
};

type EquipmentTypeKey = keyof typeof EQUIPMENT_TYPES;

// ============================================
// INTERFACES
// ============================================

interface EquipmentRecord {
    ordinal?: number;
    equipmentType: string;
    noRegisterPeralatan: string;
    inspectionResults: Record<string, string>; // { "1.1": "S", "1.2": "TS", ... }
    tindakLanjutPerbaikan: string;
    dueDate: string;
}

interface Inspector {
    nama: string;
    perusahaan: string;
    tandaTangan: string;
}

interface WorkshopDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        namaWorkshop: string;
        lokasi: string;
        penanggungJawabArea: string;
    };
    equipment: EquipmentRecord[];
    inspectors: Inspector[];
}

const initialDraftData: WorkshopDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        namaWorkshop: "",
        lokasi: "",
        penanggungJawabArea: ""
    },
    equipment: [],
    inspectors: []
};

const MAX_EQUIPMENT = 20;
const MAX_INSPECTORS = 2;

export default function SidakWorkshopForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<WorkshopDraftData>({
        key: "workshop",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<WorkshopDraftData>(initialDraftData);

    // Current equipment being edited
    const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentTypeKey | "">("");
    const [currentEquipment, setCurrentEquipment] = useState<EquipmentRecord>({
        equipmentType: "",
        noRegisterPeralatan: "",
        inspectionResults: {},
        tindakLanjutPerbaikan: "",
        dueDate: ""
    });

    // Current inspector being edited
    const [currentInspector, setCurrentInspector] = useState<Inspector>({
        nama: "",
        perusahaan: "",
        tandaTangan: ""
    });

    // Auto-save
    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

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

    // Reset current equipment when equipment type changes
    useEffect(() => {
        if (selectedEquipmentType) {
            setCurrentEquipment({
                equipmentType: selectedEquipmentType,
                noRegisterPeralatan: "",
                inspectionResults: {},
                tindakLanjutPerbaikan: "",
                dueDate: ""
            });
        }
    }, [selectedEquipmentType]);

    // ============================================
    // API MUTATIONS
    // ============================================

    const handleCreateSession = useMutation({
        mutationFn: async (data: WorkshopDraftData["headerData"]) => {
            const payload = {
                ...data,
                activityPhotos: []
            };
            const res = await apiRequest("/api/sidak-workshop", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan inspeksi peralatan workshop." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddEquipment = useMutation({
        mutationFn: async (equipment: EquipmentRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-workshop/${draft.sessionId}/equipment`, "POST", {
                ...equipment,
                sessionId: draft.sessionId,
                ordinal: draft.equipment.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, equipment: [...prev.equipment, data] }));
            setSelectedEquipmentType("");
            setCurrentEquipment({
                equipmentType: "",
                noRegisterPeralatan: "",
                inspectionResults: {},
                tindakLanjutPerbaikan: "",
                dueDate: ""
            });
            toast({ title: "Data Disimpan", description: "Peralatan berhasil ditambahkan." });
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
            const res = await apiRequest(`/api/sidak-workshop/${draft.sessionId}/inspectors`, "POST", {
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
            console.error("Failed to add inspector:", error);
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
        navigate("/workspace/sidak/workshop/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Workshop telah disimpan." });
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const updateInspectionResult = (itemId: string, value: string) => {
        setCurrentEquipment(prev => ({
            ...prev,
            inspectionResults: {
                ...prev.inspectionResults,
                [itemId]: value
            }
        }));
    };

    const canAddMoreEquipment = draft.equipment.length < MAX_EQUIPMENT;
    const canAddMoreInspectors = draft.inspectors.length < MAX_INSPECTORS;

    const isEquipmentValid = () => {
        if (!selectedEquipmentType) return false;
        if (!currentEquipment.noRegisterPeralatan.trim()) return false;
        // Check if all inspection items have been answered
        const equipmentConfig = EQUIPMENT_TYPES[selectedEquipmentType];
        const allAnswered = equipmentConfig.items.every(
            item => currentEquipment.inspectionResults[item.id] === "S" || currentEquipment.inspectionResults[item.id] === "TS"
        );
        return allAnswered;
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
                    className="w-full h-12 text-lg font-medium shadow-md shadow-orange-200 dark:shadow-none bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={!draft.headerData.namaWorkshop || !draft.headerData.lokasi || handleCreateSession.isPending}
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
                        className="w-full h-12 text-lg font-medium shadow-md shadow-orange-200 dark:shadow-none bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {handleAddEquipment.isPending ? (
                            <>Menyimpan...</>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 mr-2" />
                                {canAddMoreEquipment ? "Simpan Peralatan" : "Batas Maksimal"}
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
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 dark:shadow-none"
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
                formType="workshop"
            />

            <MobileSidakLayout
                title="CHECKLIST INSPEKSI PERALATAN WORKSHOP"
                subtitle="Inspeksi Peralatan Workshop"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {/* STEP 1: Header Info */}
                {draft.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Info Pelaksanaan</h3>
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-300">
                                Lengkapi data workshop dan lokasi inspeksi peralatan.
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
                                    placeholder="Contoh: Workshop Tyre, Workshop Plant"
                                    value={draft.headerData.namaWorkshop}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaWorkshop: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Area Maintenance, Area Produksi"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
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
                        {/* Stats */}
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Peralatan Diinspeksi</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.equipment.length} <span className="text-sm text-gray-400 font-normal">/ {MAX_EQUIPMENT}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
                                <Wrench className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Equipment Selection */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pilih Jenis Peralatan</h2>

                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Jenis Peralatan <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={selectedEquipmentType}
                                        onValueChange={(val) => setSelectedEquipmentType(val as EquipmentTypeKey)}
                                    >
                                        <SelectTrigger className="h-12 bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Pilih jenis peralatan..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(EQUIPMENT_TYPES).map(([key, value]) => (
                                                <SelectItem key={key} value={key}>{value.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Equipment Form - Only show if equipment type selected */}
                        {selectedEquipmentType && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                            {EQUIPMENT_TYPES[selectedEquipmentType].name}
                                        </Badge>
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
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold text-gray-700 dark:text-gray-200">Checklist Inspeksi</Label>
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-foreground">S = Sesuai</span>
                                            <span className="text-red-600">TS = Tidak Sesuai</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {EQUIPMENT_TYPES[selectedEquipmentType].items.map((item) => (
                                            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xs font-bold text-gray-500 mt-1 min-w-[30px]">{item.id}</span>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">{item.text}</p>
                                                        <Select
                                                            value={currentEquipment.inspectionResults[item.id] || ""}
                                                            onValueChange={(val) => updateInspectionResult(item.id, val)}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white border-gray-200 w-full max-w-[150px]">
                                                                <SelectValue placeholder="Pilih..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="S">S (Sesuai)</SelectItem>
                                                                <SelectItem value="TS">TS (Tidak Sesuai)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Corrective Action (only if there are TS items) */}
                                {countTSItems() > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-800 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="destructive">{countTSItems()} Item Tidak Sesuai</Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Tindak Lanjut Perbaikan</Label>
                                            <Textarea
                                                value={currentEquipment.tindakLanjutPerbaikan}
                                                onChange={(e) => setCurrentEquipment(prev => ({ ...prev, tindakLanjutPerbaikan: e.target.value }))}
                                                placeholder="Jelaskan tindakan perbaikan yang diperlukan..."
                                                className="bg-white border-gray-200"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Due Date</Label>
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
                                <h3 className="font-semibold mb-3">Peralatan Tercatat ({draft.equipment.length})</h3>
                                <div className="space-y-2">
                                    {draft.equipment.map((eq, idx) => {
                                        const tsCount = Object.values(eq.inspectionResults).filter(v => v === "TS").length;
                                        const hasIssue = tsCount > 0;
                                        return (
                                            <div key={idx} className={cn(
                                                "p-3 rounded-lg border shadow-sm flex justify-between items-center",
                                                hasIssue ? "bg-red-50 border-red-100" : "bg-white border-gray-100"
                                            )}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">{eq.equipmentType}</Badge>
                                                        <p className="font-medium text-sm">{eq.noRegisterPeralatan}</p>
                                                    </div>
                                                    {hasIssue && (
                                                        <p className="text-xs text-red-600 mt-1">{tsCount} item tidak sesuai</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasIssue ? (
                                                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">TEMUAN</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-md">OK</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: Inspectors */}
                {draft.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Data Inspektor</h3>
                                <p className="text-sm text-gray-500">Maksimal {MAX_INSPECTORS} inspektor, minimal 1 wajib diisi</p>
                            </div>

                            {/* Inspector List */}
                            {draft.inspectors.length > 0 && (
                                <div className="grid gap-3">
                                    {draft.inspectors.map((insp, idx) => (
                                        <div key={idx} className="bg-muted p-4 rounded-xl border border-border flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{insp.nama}</p>
                                                <p className="text-xs text-gray-500">{insp.perusahaan}</p>
                                            </div>
                                            <Check className="h-5 w-5 text-foreground" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Inspector Form */}
                            {canAddMoreInspectors && (
                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {draft.inspectors.length === 0 ? "Tambah Inspektor" : "Tambah Inspektor Lain"}
                                    </p>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Nama Inspektor <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={currentInspector.nama}
                                                onChange={(e) => setCurrentInspector(prev => ({ ...prev, nama: e.target.value }))}
                                                className="bg-gray-50 border-gray-200"
                                                placeholder="Nama Lengkap"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={currentInspector.perusahaan}
                                                onChange={(e) => setCurrentInspector(prev => ({ ...prev, perusahaan: e.target.value }))}
                                                className="bg-gray-50 border-gray-200"
                                                placeholder="PT..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Tanda Tangan <span className="text-red-500">*</span></Label>
                                            <SignaturePad
                                                onSave={(dataUrl) => setCurrentInspector(prev => ({ ...prev, tandaTangan: dataUrl }))}
                                            />
                                        </div>
                                        <Button
                                            onClick={() => handleAddInspector.mutate(currentInspector)}
                                            disabled={!currentInspector.nama || !currentInspector.perusahaan || !currentInspector.tandaTangan || handleAddInspector.isPending}
                                            className="w-full mt-2"
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> Tambahkan
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!canAddMoreInspectors && (
                                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 text-center">Maksimal {MAX_INSPECTORS} inspektor telah ditambahkan</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </MobileSidakLayout>
        </>
    );
}
