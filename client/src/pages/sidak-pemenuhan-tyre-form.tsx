import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Camera, Check, ArrowRight, Save, Plus, Shield } from "lucide-react";
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
import { PEMENUHAN_TYRE_ITEMS } from "@/lib/sidak-pemenuhan-tyre-pdf-utils";

// ============================================
// INTERFACES
// ============================================

interface Inspector {
    nama: string;
    perusahaan: string;
    tandaTangan: string;
}

interface ChecklistState {
    inspectionResults: Record<string, string>;
    tindakLanjut: Record<string, string>;
    dueDates: Record<string, string>;
}

interface PemenuhanTyreDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        waktu: string;
        shift: string;
        lokasi: string;
        namaPerusahaan: string;
        namaPengawas: string;
        sampelNomorLambung: string[];
    };
    checklist: ChecklistState;
    inspectors: Inspector[];
}

const initialDraftData: PemenuhanTyreDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        shift: "",
        lokasi: "",
        namaPerusahaan: "",
        namaPengawas: "",
        sampelNomorLambung: ["", "", "", "", ""]
    },
    checklist: {
        inspectionResults: {},
        tindakLanjut: {},
        dueDates: {}
    },
    inspectors: []
};

const MAX_INSPECTORS = 3;

export default function SidakPemenuhanTyreForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<PemenuhanTyreDraftData>({
        key: "pemenuhan-tyre",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<PemenuhanTyreDraftData>(initialDraftData);

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
        mutationFn: async (headerData: PemenuhanTyreDraftData["headerData"]) => {
            const res = await apiRequest("/api/sidak-pemenuhan-tyre", "POST", {
                tanggal: headerData.tanggal,
                waktu: headerData.waktu,
                shift: headerData.shift,
                lokasi: headerData.lokasi,
                namaPerusahaan: headerData.namaPerusahaan,
                namaPengawas: headerData.namaPengawas,
                sampelNomorLambung: headerData.sampelNomorLambung.filter(s => s.trim().length > 0)
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan isi checklist pemenuhan standar tyre." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleSaveRecord = useMutation({
        mutationFn: async (checklist: ChecklistState) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-pemenuhan-tyre/${draft.sessionId}/records`, "POST", {
                sessionId: draft.sessionId,
                inspectionResults: checklist.inspectionResults,
                tindakLanjutPerbaikan: checklist.tindakLanjut,
                dueDates: checklist.dueDates
            });
            return res;
        },
        onSuccess: () => {
            setDraft(prev => ({ ...prev, step: 3 }));
            toast({ title: "Checklist Disimpan", description: "Silakan tambahkan inspektor." });
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
            const res = await apiRequest(`/api/sidak-pemenuhan-tyre/${draft.sessionId}/observers`, "POST", {
                ...inspector,
                sessionId: draft.sessionId,
                ordinal: draft.inspectors.length + 1
            });
            return res;
        },
        onSuccess: (data) => {
            const result = Array.isArray(data) ? data[0] : data;
            setDraft(prev => ({ ...prev, inspectors: [...prev.inspectors, result] }));
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
                await apiRequest(`/api/sidak-pemenuhan-tyre/${draft.sessionId}/photos`, "POST", { photos: activityPhotos });
            } catch (err) {
                console.error("Failed to upload photos:", err);
                toast({ title: "Peringatan", description: "Gagal mengupload bukti kegiatan, namun data inspeksi tetap tersimpan.", variant: "destructive" });
            }
        }

        queryClient.invalidateQueries({ queryKey: ['/api/sidak-pemenuhan-tyre/sessions'] });
        ignoreDraft(); // Clear draft data

        navigate("/workspace/sidak/pemenuhan-tyre/history");
        toast({ title: "Selesai", description: "Laporan Sidak Pemenuhan Tyre telah disimpan." });
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const updateSampel = (index: number, value: string) => {
        setDraft(prev => {
            const next = [...prev.headerData.sampelNomorLambung];
            next[index] = value;
            return { ...prev, headerData: { ...prev.headerData, sampelNomorLambung: next } };
        });
    };

    const updateInspectionResult = (no: number, value: string) => {
        setDraft(prev => {
            const key = String(no);
            const nextResults = { ...prev.checklist.inspectionResults, [key]: value };
            const nextFollowUp = { ...prev.checklist.tindakLanjut };
            const nextDueDates = { ...prev.checklist.dueDates };
            if (value !== "TS") {
                delete nextFollowUp[key];
                delete nextDueDates[key];
            }
            return {
                ...prev,
                checklist: {
                    inspectionResults: nextResults,
                    tindakLanjut: nextFollowUp,
                    dueDates: nextDueDates
                }
            };
        });
    };

    const updateCorrectiveAction = (no: number, value: string) => {
        setDraft(prev => ({
            ...prev,
            checklist: {
                ...prev.checklist,
                tindakLanjut: { ...prev.checklist.tindakLanjut, [String(no)]: value }
            }
        }));
    };

    const updateDueDate = (no: number, value: string) => {
        setDraft(prev => ({
            ...prev,
            checklist: {
                ...prev.checklist,
                dueDates: { ...prev.checklist.dueDates, [String(no)]: value }
            }
        }));
    };

    const isHeaderValid = () => {
        const h = draft.headerData;
        const hasSampel = h.sampelNomorLambung.some(s => s.trim().length > 0);
        return !!(h.tanggal && h.lokasi.trim() && h.namaPerusahaan.trim() && h.namaPengawas.trim() && hasSampel);
    };

    const isChecklistValid = () => {
        return PEMENUHAN_TYRE_ITEMS.every(
            item => draft.checklist.inspectionResults[String(item.no)] === "S" || draft.checklist.inspectionResults[String(item.no)] === "TS"
        );
    };

    const answeredCount = Object.values(draft.checklist.inspectionResults).filter(v => v === "S" || v === "TS").length;

    // ============================================
    // RENDER FUNCTIONS
    // ============================================

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!isHeaderValid() || handleCreateSession.isPending}
                    onClick={() => handleCreateSession.mutate(draft.headerData)}
                >
                    {handleCreateSession.isPending ? "Membuat Sesi..." : "Lanjut ke Checklist"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (draft.step === 2) {
            return (
                <Button
                    onClick={() => handleSaveRecord.mutate(draft.checklist)}
                    disabled={!isChecklistValid() || handleSaveRecord.isPending}
                    className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {handleSaveRecord.isPending ? (
                        <>Menyimpan...</>
                    ) : (
                        <>
                            Simpan & Lanjut ke Inspektor ({answeredCount}/{PEMENUHAN_TYRE_ITEMS.length})
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
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
                formType="sidak-pemenuhan-tyre"
            />

            <MobileSidakLayout
                title="SIDAK PEMENUHAN TYRE"
                subtitle="Checklist Inspeksi Pemenuhan Standar Tyre Management Mitra Kerja Hauling"
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
                                Masukkan detail pelaksanaan inspeksi dan sampel 5 unit DT secara random.
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
                                        onChange={e => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, waktu: e.target.value } }))}
                                    />
                                </div>
                            </div>

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
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Jalur Hauling KM 25"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Nama Perusahaan <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nama perusahaan mitra"
                                    value={draft.headerData.namaPerusahaan}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaPerusahaan: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Nama Pengawas <span className="text-red-500">*</span></Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Masukkan nama pengawas"
                                    value={draft.headerData.namaPengawas}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, namaPengawas: e.target.value } }))}
                                />
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Sampel Nomor Lambung DT (minimal 1) <span className="text-red-500">*</span></Label>
                                {draft.headerData.sampelNomorLambung.map((sampel, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}.</span>
                                        <Input
                                            className="h-11 bg-gray-50 border-gray-200 flex-1"
                                            placeholder={`Nomor lambung DT ${idx + 1}`}
                                            value={sampel}
                                            onChange={(e) => updateSampel(idx, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Checklist */}
                {draft.step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold">Checklist Inspeksi ({PEMENUHAN_TYRE_ITEMS.length} Item)</Label>
                                <Badge className="bg-blue-100 text-blue-700">{Math.round((answeredCount / PEMENUHAN_TYRE_ITEMS.length) * 100)}%</Badge>
                            </div>

                            <div className="space-y-3">
                                {PEMENUHAN_TYRE_ITEMS.map((item) => (
                                    <div key={item.no} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 mt-0.5">{item.no}</span>
                                                <div className="text-xs text-gray-800 dark:text-gray-200">
                                                    {item.label.split("\n").map((line, i) => (
                                                        <p key={i} className={cn(i > 0 && "pl-3")}>{line}</p>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={draft.checklist.inspectionResults[String(item.no)] === "S" ? "default" : "outline"}
                                                    className={cn("h-8 flex-1 text-xs", draft.checklist.inspectionResults[String(item.no)] === "S" && "bg-green-600 hover:bg-green-700 text-white")}
                                                    onClick={() => updateInspectionResult(item.no, "S")}
                                                >
                                                    S (Sesuai)
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={draft.checklist.inspectionResults[String(item.no)] === "TS" ? "destructive" : "outline"}
                                                    className={cn("h-8 flex-1 text-xs")}
                                                    onClick={() => updateInspectionResult(item.no, "TS")}
                                                >
                                                    TS (Tidak Sesuai)
                                                </Button>
                                            </div>

                                            {draft.checklist.inspectionResults[String(item.no)] === "TS" && (
                                                <div className="mt-2 space-y-2">
                                                    <Label className="text-[10px] font-bold text-red-600">Tindak Lanjut Perbaikan</Label>
                                                    <Textarea
                                                        className="text-xs min-h-[60px]"
                                                        placeholder="Jelaskan rencana perbaikan..."
                                                        value={draft.checklist.tindakLanjut[String(item.no)] || ""}
                                                        onChange={(e) => updateCorrectiveAction(item.no, e.target.value)}
                                                    />
                                                    <Label className="text-[10px] font-bold text-red-600">Due Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="h-10 bg-white text-xs"
                                                        value={draft.checklist.dueDates[String(item.no)] || ""}
                                                        onChange={(e) => updateDueDate(item.no, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Inspectors */}
                {draft.step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div>
                                <h3 className="font-bold text-lg">Pengesahan (Inspektor)</h3>
                                <p className="text-xs text-gray-500">Tambahkan inspektor yang bertugas (Maksimal {MAX_INSPECTORS}).</p>
                            </div>

                            {draft.inspectors.length > 0 && (
                                <div className="space-y-2">
                                    {draft.inspectors.map((ins, idx) => (
                                        <div key={idx} className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{ins.nama}</p>
                                                <p className="text-[10px] text-gray-500">{ins.perusahaan}</p>
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
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-gray-400">Perusahaan</Label>
                                        <Input
                                            className="h-11 shadow-none"
                                            placeholder="Perusahaan"
                                            value={currentInspector.perusahaan}
                                            onChange={e => setCurrentInspector(prev => ({ ...prev, perusahaan: e.target.value }))}
                                        />
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
                                        Simpan Inspektor
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
            </MobileSidakLayout>
        </>
    );
}
