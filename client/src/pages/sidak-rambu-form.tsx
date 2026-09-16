import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, X, ArrowLeft, ArrowRight, Save, Trash2, Plus, Ban, OctagonAlert, TrafficCone } from "lucide-react";
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

interface ObservationRecord {
    nama: string;
    noKendaraan: string;
    perusahaan: string;
    rambuStop: boolean;
    rambuGiveWay: boolean;
    rambuKecepatanMax: boolean;
    rambuLaranganMasuk: boolean;
    rambuLaranganParkir: boolean;
    rambuWajibHelm: boolean;
    rambuLaranganUTurn: boolean;
    keterangan: string;
}

interface Observer {
    nama: string;
    perusahaan: string;
    signatureDataUrl: string;
}

interface RambuDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        shift: string;
        waktuMulai: string;
        waktuSelesai: string;
        lokasi: string;
        totalSampel: string;
    };
    observations: ObservationRecord[];
    observers: Observer[];
}

const initialDraftData: RambuDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        shift: "Shift 1",
        waktuMulai: "",
        waktuSelesai: "",
        lokasi: "",
        totalSampel: ""
    },
    observations: [],
    observers: []
};

const initialObservation: ObservationRecord = {
    nama: "",
    noKendaraan: "",
    perusahaan: "",
    rambuStop: true,
    rambuGiveWay: true,
    rambuKecepatanMax: true,
    rambuLaranganMasuk: true,
    rambuLaranganParkir: true,
    rambuWajibHelm: true,
    rambuLaranganUTurn: true,
    keterangan: ""
};

export default function SidakRambuForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<RambuDraftData>({
        key: "rambu",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<RambuDraftData>(initialDraftData);
    const [currentObservation, setCurrentObservation] = useState<ObservationRecord>(initialObservation);
    const [currentObserver, setCurrentObserver] = useState<Observer>({
        nama: "",
        perusahaan: "",
        signatureDataUrl: ""
    });

    // Auto-save
    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

    // Initial time set
    useEffect(() => {
        if (!draft.headerData.waktuMulai && draft.step === 1) {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setDraft(prev => ({
                ...prev,
                headerData: { ...prev.headerData, waktuMulai: timeString }
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
            const payload = { ...data };
            const res = await apiRequest("/api/sidak-rambu", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan input data observasi." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddObservation = useMutation({
        mutationFn: async (record: ObservationRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-rambu/${draft.sessionId}/observations`, "POST", {
                ...record,
                sessionId: draft.sessionId
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, observations: [...prev.observations, data] }));
            setCurrentObservation(initialObservation);
            toast({ title: "Data Disimpan", description: "Observasi berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddObserver = useMutation({
        mutationFn: async (observer: Observer) => {
            if (!draft.sessionId) throw new Error("No active session");
            const res = await apiRequest(`/api/sidak-rambu/${draft.sessionId}/observers`, "POST", {
                ...observer,
                sessionId: draft.sessionId
            });
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, observers: [...prev.observers, data] }));
            setCurrentObserver({ nama: "", perusahaan: "", signatureDataUrl: "" });
            toast({ title: "Observer Disimpan" });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleFinish = () => {
        navigate("/workspace/sidak/rambu/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Rambu telah disimpan." });
    };

    const maxObservations = 10;
    const canAddMore = draft.observations.length < maxObservations;

    const ComplianceButton = ({
        value,
        onChange,
        label,
        icon: Icon
    }: {
        value: boolean;
        onChange: (val: boolean) => void;
        label: string;
        icon?: any;
    }) => (
        <div className="space-y-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="flex items-start gap-2">
                {Icon && <Icon className="h-5 w-5 text-gray-500 mt-0.5" />}
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</Label>
            </div>
            <div className="flex gap-2 pt-1">
                <Button
                    type="button"
                    variant={value ? "default" : "outline"}
                    className={cn(
                        "flex-1 h-10 transition-all",
                        value
                            ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 dark:shadow-none border-transparent"
                            : "hover:bg-muted text-gray-500 border-gray-200"
                    )}
                    onClick={() => onChange(true)}
                >
                    <Check className={cn("mr-2 h-4 w-4", value ? "text-white" : "text-gray-400")} />
                    Ya
                </Button>
                <Button
                    type="button"
                    variant={!value ? "destructive" : "outline"}
                    className={cn(
                        "flex-1 h-10 transition-all",
                        !value
                            ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-100 dark:shadow-none border-transparent"
                            : "hover:bg-red-50 text-gray-500 border-gray-200"
                    )}
                    onClick={() => onChange(false)}
                >
                    <X className={cn("mr-2 h-4 w-4", !value ? "text-white" : "text-gray-400")} />
                    Tidak
                </Button>
            </div>
        </div>
    );

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-orange-200 dark:shadow-none bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={!draft.headerData.lokasi || !draft.headerData.totalSampel || handleCreateSession.isPending}
                    onClick={() => handleCreateSession.mutate(draft.headerData)}
                >
                    {handleCreateSession.isPending ? "Membuat Sesi..." : "Lanjut ke Observasi"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (draft.step === 2) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => handleAddObservation.mutate(currentObservation)}
                        disabled={!currentObservation.nama || !currentObservation.noKendaraan || !canAddMore || handleAddObservation.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-orange-200 dark:shadow-none bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {canAddMore ? "Simpan Observasi" : "Batas Maksimal"}
                    </Button>
                    {draft.observations.length > 0 && (
                        <Button
                            onClick={() => setDraft(prev => ({ ...prev, step: 3 }))}
                            variant="outline"
                            className="w-full h-12 border-2 border-gray-200"
                        >
                            Lanjut ke Observer ({draft.observations.length})
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
                formType="rambu"
            />

            <MobileSidakLayout
                title="Sidak Rambu"
                subtitle="Observasi Kepatuhan Rambu"
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
                                Lengkapi data waktu, lokasi dan estimasi total sampel.
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Mulai</Label>
                                    <Input
                                        type="time"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.waktuMulai}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, waktuMulai: e.target.value } }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Selesai</Label>
                                    <Input
                                        type="time"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.waktuSelesai}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, waktuSelesai: e.target.value } }))}
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
                                    placeholder="Contoh: Simpang 3 Workshop"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Total Sampel (Rencana)</Label>
                                <Input
                                    type="number"
                                    className="h-12 bg-gray-50 border-gray-200"
                                    value={draft.headerData.totalSampel}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, totalSampel: e.target.value } }))}
                                    placeholder="Jumlah target kendaraan"
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
                                <p className="text-xs text-gray-500 uppercase font-semibold">Observasi Tercatat</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.observations.length} <span className="text-sm text-gray-400 font-normal">/ {maxObservations}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
                                <TrafficCone className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Observasi Baru</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-5 shadow-sm">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Nama Pengemudi <span className="text-red-500">*</span></Label>
                                        <Input
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentObservation.nama}
                                            onChange={(e) => setCurrentObservation(prev => ({ ...prev, nama: e.target.value }))}
                                            placeholder="Nama Lengkap"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">No. Unit <span className="text-red-500">*</span></Label>
                                            <Input
                                                className="h-12 bg-gray-50 border-gray-200"
                                                value={currentObservation.noKendaraan}
                                                onChange={(e) => setCurrentObservation(prev => ({ ...prev, noKendaraan: e.target.value }))}
                                                placeholder="DT-XXX"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan <span className="text-red-500">*</span></Label>
                                            <Input
                                                className="h-12 bg-gray-50 border-gray-200"
                                                value={currentObservation.perusahaan}
                                                onChange={(e) => setCurrentObservation(prev => ({ ...prev, perusahaan: e.target.value }))}
                                                placeholder="PT..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Checklist Kepatuhan</h3>
                                    <div className="space-y-2">
                                        <ComplianceButton
                                            icon={OctagonAlert}
                                            value={currentObservation.rambuStop}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuStop: val }))}
                                            label="Berhenti di Rambu STOP?"
                                        />
                                        <ComplianceButton
                                            icon={Ban}
                                            value={currentObservation.rambuGiveWay}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuGiveWay: val }))}
                                            label="Prioritas Jalan (Give Way)?"
                                        />
                                        <ComplianceButton
                                            value={currentObservation.rambuKecepatanMax}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuKecepatanMax: val }))}
                                            label="Patuhi Batas Kecepatan?"
                                        />
                                        <ComplianceButton
                                            value={currentObservation.rambuLaranganMasuk}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuLaranganMasuk: val }))}
                                            label="Tidak Masuk Dilarang?"
                                        />
                                        <ComplianceButton
                                            value={currentObservation.rambuLaranganParkir}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuLaranganParkir: val }))}
                                            label="Tidak Parkir Sembarangan?"
                                        />
                                        <ComplianceButton
                                            value={currentObservation.rambuWajibHelm}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuWajibHelm: val }))}
                                            label="Pakai Helm/Seatbelt?"
                                        />
                                        <ComplianceButton
                                            value={currentObservation.rambuLaranganUTurn}
                                            onChange={(val) => setCurrentObservation(prev => ({ ...prev, rambuLaranganUTurn: val }))}
                                            label="Tidak U-Turn Ilegal?"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Keterangan</Label>
                                    <Textarea
                                        value={currentObservation.keterangan}
                                        onChange={(e) => setCurrentObservation(prev => ({ ...prev, keterangan: e.target.value }))}
                                        placeholder="Catatan tambahan"
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Recent List */}
                        {draft.observations.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-3">Tercatat ({draft.observations.length})</h3>
                                <div className="space-y-2">
                                    {draft.observations.map((obs, idx) => {
                                        // check if any violation exists (any false value)
                                        const hasViolation = !obs.rambuStop || !obs.rambuGiveWay || !obs.rambuKecepatanMax || !obs.rambuLaranganMasuk || !obs.rambuLaranganParkir || !obs.rambuWajibHelm || !obs.rambuLaranganUTurn;

                                        return (
                                            <div key={idx} className={cn("p-3 rounded-lg border shadow-sm flex justify-between items-center", hasViolation ? "bg-red-50 border-red-100" : "bg-white border-gray-100")}>
                                                <div>
                                                    <p className="font-medium text-sm">{obs.nama} <span className="text-xs text-gray-400">({obs.perusahaan})</span></p>
                                                    <p className="text-xs text-gray-500">Unit: {obs.noKendaraan}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasViolation ?
                                                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">PELANGGARAN</span>
                                                        :
                                                        <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-md">PATUH</span>
                                                    }
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
                                            onSave={(dataUrl) => setCurrentObserver(prev => ({ ...prev, signatureDataUrl: dataUrl }))}
                                        />
                                    </div>
                                    <Button
                                        onClick={() => handleAddObserver.mutate(currentObserver)}
                                        disabled={!currentObserver.nama || !currentObserver.signatureDataUrl || handleAddObserver.isPending}
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
