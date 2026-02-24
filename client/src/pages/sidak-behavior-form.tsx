import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import { Activity, Check, X, ArrowLeft, ArrowRight, Save, Users, Pen, UserPlus, Car, AlertCircle, ClipboardCheck, Camera, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import type { Employee } from "@shared/schema";

interface BehaviorRecord {
    namaDriver: string;
    nomorLambung: string;
    // Parameters
    mataTertutup: boolean;
    seringMengedip: boolean;
    menguapBerulang: boolean;
    kepalaMengangguk: boolean;
    posturMembungkuk: boolean;
    keluarJalur: boolean;
    reaksiRadioLambat: boolean;
    tidakMeresponRadio: boolean;
    alarmFatigueFmsAktif: boolean;
    mengemudiTidakStabil: boolean;
    // Actions
    edukasiTwoWay: boolean;
    monitoringUlang: boolean;
    instruksiBerhenti: boolean;
    stretchingMinum: boolean;
    parkirAman: boolean;
    gantiDriver: boolean;
    mandatoryRest: boolean;
    koordinasiPengawas: boolean;
    driverSignature?: string;
    evidenceUrl?: string;
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    jabatan: string;
    signatureDataUrl: string;
}

interface BehaviorDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        waktu: string;
        shift: string;
        lokasi: string;
        metodeSidak: string;
    };
    records: BehaviorRecord[];
    currentRecord: BehaviorRecord;
    observers: Observer[];
}

const initialRecord: BehaviorRecord = {
    namaDriver: "",
    nomorLambung: "",
    mataTertutup: false,
    seringMengedip: false,
    menguapBerulang: false,
    kepalaMengangguk: false,
    posturMembungkuk: false,
    keluarJalur: false,
    reaksiRadioLambat: false,
    tidakMeresponRadio: false,
    alarmFatigueFmsAktif: false,
    mengemudiTidakStabil: false,
    edukasiTwoWay: false,
    monitoringUlang: false,
    instruksiBerhenti: false,
    stretchingMinum: false,
    parkirAman: false,
    gantiDriver: false,
    mandatoryRest: false,
    koordinasiPengawas: false,
    evidenceUrl: "",
};

const initialDraftData: BehaviorDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        waktu: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        shift: "Shift 1",
        lokasi: "",
        metodeSidak: "Acak"
    },
    records: [],
    currentRecord: initialRecord,
    observers: []
};

export default function SidakBehaviorForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        saveDraft,
        clearDraft,
        restoreDraft,
        ignoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<BehaviorDraftData>({
        key: "behavior-driver",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [step, setStep] = useState(1);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [headerData, setHeaderData] = useState(initialDraftData.headerData);
    const [records, setRecords] = useState<BehaviorRecord[]>([]);
    const [currentRecord, setCurrentRecord] = useState<BehaviorRecord>(initialRecord);
    const [observers, setObservers] = useState<Observer[]>([]);

    const [manualObserver, setManualObserver] = useState({
        nama: "",
        perusahaan: "",
        signatureDataUrl: ""
    });

    // Driver search autocomplete
    const [driverSearch, setDriverSearch] = useState("");
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);
    const driverSearchRef = useRef<HTMLDivElement>(null);

    // Fetch all employees for autocomplete
    const { data: employeesData } = useQuery<Employee[] | { data: Employee[], total: number }>({
        queryKey: ["/api/employees?per_page=1000"],
    });

    const allEmployees: Employee[] = Array.isArray(employeesData)
        ? employeesData
        : (employeesData as any)?.data || [];

    // Filter employees by search text
    const filteredEmployees = allEmployees.filter((emp) => {
        if (!driverSearch.trim()) return false;
        const q = driverSearch.toLowerCase();
        return (
            emp.name?.toLowerCase().includes(q) ||
            emp.nomorLambung?.toLowerCase().includes(q) ||
            emp.id?.toLowerCase().includes(q)
        );
    }).slice(0, 10); // max 10 results

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (driverSearchRef.current && !driverSearchRef.current.contains(e.target as Node)) {
                setShowDriverDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync state with draft on save
    useEffect(() => {
        saveDraft({
            step,
            sessionId,
            headerData,
            records,
            currentRecord,
            observers
        });
    }, [step, sessionId, headerData, records, currentRecord, observers, saveDraft]);

    const handleRestoreDraft = async () => {
        const restoredData = restoreDraft();
        if (restoredData) {
            // Validate date if needed (like fatigue fix)
            const today = new Date().toISOString().split('T')[0];
            if (restoredData.headerData.tanggal !== today && restoredData.sessionId) {
                toast({
                    title: "Draft Kedaluwarsa",
                    description: "Draft dari hari sebelumnya dibersihkan.",
                    variant: "destructive"
                });
                ignoreDraft();
                return;
            }
            setStep(restoredData.step);
            setSessionId(restoredData.sessionId);
            setHeaderData(restoredData.headerData);
            setRecords(restoredData.records);
            setCurrentRecord(restoredData.currentRecord);
            setObservers(restoredData.observers);
        }
    };

    const createSessionMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest("/api/sidak-behavior", "POST", data);
        },
        onSuccess: (data) => {
            setSessionId(data.id);
            setStep(2);
            toast({ title: "Sesi Dimulai", description: "Header berhasil disimpan." });
        },
        onError: () => {
            toast({ title: "Gagal", description: "Gagal membuat sesi.", variant: "destructive" });
        }
    });

    const addRecordMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest(`/api/sidak-behavior/${sessionId}/records`, "POST", data);
        },
        onSuccess: () => {
            setRecords([...records, currentRecord]);
            setCurrentRecord(initialRecord);
            toast({ title: "Berhasil", description: "Data driver disimpan." });
        }
    });

    const addObserverMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest(`/api/sidak-behavior/${sessionId}/observers`, "POST", data);
        },
        onSuccess: (res) => {
            // res is response object from apiRequest
        }
    });

    const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("photo", file);

        try {
            const res = await fetch("/api/sidak-behavior/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setCurrentRecord(prev => ({
                ...prev,
                evidenceUrl: data.url
            }));

            toast({ title: "Foto Evidance Diunggah", description: "Foto berhasil ditambahkan ke record driver ini." });
        } catch (error) {
            console.error(error);
            toast({ title: "Gagal Mengunggah", description: "Terjadi kesalahan saat mengunggah foto.", variant: "destructive" });
        }
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (!headerData.lokasi) {
                toast({ title: "Peringatan", description: "Lokasi harus diisi.", variant: "destructive" });
                return;
            }
            createSessionMutation.mutate(headerData);
        } else if (step === 2) {
            if (records.length === 0) {
                toast({ title: "Peringatan", description: "Tambahkan minimal 1 data driver.", variant: "destructive" });
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (observers.length === 0) {
                toast({ title: "Peringatan", description: "Minimal 1 observer harus tanda tangan.", variant: "destructive" });
                return;
            }
            setStep(4);
        }
    };

    const handleFinish = async () => {
        clearDraft();
        navigate("/workspace/sidak");
    };

    const handleAddDriver = () => {
        if (records.length >= 10) {
            toast({ title: "Batas Maksimum", description: "Maksimum 10 driver per sesi.", variant: "destructive" });
            return;
        }
        if (!currentRecord.namaDriver || !currentRecord.nomorLambung) {
            toast({ title: "Peringatan", description: "Nama dan Lambung wajib diisi.", variant: "destructive" });
            return;
        }
        addRecordMutation.mutate(currentRecord);
    };

    const renderBottomAction = () => {
        if (step === 1) {
            return (
                <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={handleNextStep}
                    disabled={createSessionMutation.isPending}
                >
                    {createSessionMutation.isPending ? "Membuat Sesi..." : "Lanjutkan"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (step === 2) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        onClick={handleAddDriver}
                        disabled={addRecordMutation.isPending || records.length >= 10}
                    >
                        <UserPlus className="mr-2 h-5 w-5" />
                        {records.length >= 10 ? "Maksimum 10 Driver Tercapai" : addRecordMutation.isPending ? "Menyimpan..." : "Simpan & Tambah Driver Lagi"}
                    </Button>

                    {records.length > 0 && (
                        <Button
                            variant="outline"
                            className="w-full h-12 border-2 border-gray-200 text-gray-700 font-bold"
                            onClick={() => setStep(3)}
                        >
                            Selesai & Lanjut ke Observer
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            );
        }
        if (step === 3) {
            return (
                <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={handleNextStep}
                >
                    Lanjutkan ke Ringkasan
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (step === 4) {
            return (
                <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={handleFinish}
                >
                    Selesai & Kirim Data
                    <Check className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        return null;
    };

    return (
        <MobileSidakLayout
            title="Sidak Tingkah Laku Driver"
            step={step}
            totalSteps={4}
            onBack={() => step > 1 ? setStep(step - 1) : navigate("/workspace/sidak")}
            bottomAction={renderBottomAction()}
        >
            <div className="pb-24">
                {/* Progress Header */}
                <Card className="mb-4 border-none shadow-none bg-blue-50/50">
                    <CardContent className="pt-6 pb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-blue-700">Langkah {step} dari 4</span>
                            <span className="text-sm font-bold text-blue-700">{Math.round((step / 4) * 100)}%</span>
                        </div>
                        <Progress value={(step / 4) * 100} className="h-2 bg-blue-100" />
                        <div className="flex justify-between mt-4">
                            <div className={cn("flex flex-col items-center", step >= 1 ? "opacity-100" : "opacity-40")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1", step > 1 ? "bg-green-500 text-white" : "bg-blue-600 text-white")}>
                                    {step > 1 ? <Check className="w-4 h-4" /> : "1"}
                                </div>
                                <span className="text-[10px] font-medium">Header</span>
                            </div>
                            <div className={cn("flex flex-col items-center", step >= 2 ? "opacity-100" : "opacity-40")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1", step > 2 ? "bg-green-500 text-white" : "bg-blue-600 text-white")}>
                                    {step > 2 ? <Check className="w-4 h-4" /> : "2"}
                                </div>
                                <span className="text-[10px] font-medium">Driver</span>
                            </div>
                            <div className={cn("flex flex-col items-center", step >= 3 ? "opacity-100" : "opacity-40")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1", step > 3 ? "bg-green-500 text-white" : "bg-blue-600 text-white")}>
                                    {step > 3 ? <Check className="w-4 h-4" /> : "3"}
                                </div>
                                <span className="text-[10px] font-medium">Observer</span>
                            </div>
                            <div className={cn("flex flex-col items-center", step === 4 ? "opacity-100" : "opacity-40")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1", "bg-blue-600 text-white")}>
                                    4
                                </div>
                                <span className="text-[10px] font-medium">Selesai</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 1: Header */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Informasi Sidak</CardTitle>
                                <CardDescription>Detail waktu dan lokasi pelaksanaan</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal</Label>
                                        <Input
                                            type="date"
                                            value={headerData.tanggal}
                                            onChange={(e) => setHeaderData({ ...headerData, tanggal: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Jam</Label>
                                        <Input
                                            type="time"
                                            value={headerData.waktu}
                                            onChange={(e) => setHeaderData({ ...headerData, waktu: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Shift</Label>
                                    <Select
                                        value={headerData.shift}
                                        onValueChange={(val) => setHeaderData({ ...headerData, shift: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Shift" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Shift 1">Shift 1 (Day)</SelectItem>
                                            <SelectItem value="Shift 2">Shift 2 (Night)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Lokasi Sidak</Label>
                                    <Input
                                        placeholder="Contoh: KM 12, Workshop, Front"
                                        value={headerData.lokasi}
                                        onChange={(e) => setHeaderData({ ...headerData, lokasi: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Metode Sidak</Label>
                                    <Select
                                        value={headerData.metodeSidak}
                                        onValueChange={(val) => setHeaderData({ ...headerData, metodeSidak: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Metode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Acak">Acak / Penunjukan Langsung</SelectItem>
                                            <SelectItem value="Alarm FMS">Alarm FMS Fatigue Controller</SelectItem>
                                            <SelectItem value=">4 Jam Kerja">&gt;4 Jam Jam Kerja Berjalan</SelectItem>
                                            <SelectItem value="Permintaan Pengawas">Instruksi / Permintaan Pengawas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 2: Driver Records */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`rounded-full p-1.5 ${records.length >= 10 ? 'bg-green-500' : 'bg-blue-500'}`}>
                                            <Car className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Data Driver</CardTitle>
                                            <CardDescription className="text-xs">
                                                {records.length}/10 sampel driver
                                                {records.length >= 10 && <span className="ml-1 text-green-600 font-bold">✓ Lengkap</span>}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {records.length >= 10 && (
                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">MAX</span>
                                    )}
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2">
                                    <Progress value={records.length * 10} className="h-1.5" />
                                </div>
                                {records.length < 10 && (
                                    <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                        Minimal <strong>10 sampel</strong> per sesi sidak
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2" ref={driverSearchRef}>
                                    <Label className="flex items-center gap-1">
                                        <Search className="w-3 h-3" />
                                        Cari Driver (dari Roster)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Ketik nama atau nomor lambung..."
                                            value={driverSearch}
                                            onChange={(e) => {
                                                setDriverSearch(e.target.value);
                                                setShowDriverDropdown(true);
                                            }}
                                            onFocus={() => driverSearch.trim() && setShowDriverDropdown(true)}
                                            className="pr-8"
                                        />
                                        <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />

                                        {showDriverDropdown && filteredEmployees.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredEmployees.map((emp) => (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                        onClick={() => {
                                                            setCurrentRecord({
                                                                ...currentRecord,
                                                                namaDriver: emp.name || '',
                                                                nomorLambung: emp.nomorLambung || ''
                                                            });
                                                            setDriverSearch('');
                                                            setShowDriverDropdown(false);
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium text-sm text-gray-900">{emp.name}</span>
                                                            {emp.nomorLambung && (
                                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                                                                    {emp.nomorLambung}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            NIK: {emp.id} {emp.position ? `• ${emp.position}` : ''}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {showDriverDropdown && driverSearch.trim().length >= 2 && filteredEmployees.length === 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-xs text-gray-500">
                                                Tidak ditemukan driver "{driverSearch}"
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nama Driver</Label>
                                        <Input
                                            placeholder="Auto dari pencarian"
                                            value={currentRecord.namaDriver}
                                            onChange={(e) => setCurrentRecord({ ...currentRecord, namaDriver: e.target.value })}
                                            className={currentRecord.namaDriver ? "bg-green-50 border-green-200" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No. Lambung</Label>
                                        <Input
                                            placeholder="Auto dari pencarian"
                                            value={currentRecord.nomorLambung}
                                            onChange={(e) => setCurrentRecord({ ...currentRecord, nomorLambung: e.target.value })}
                                            className={currentRecord.nomorLambung ? "bg-green-50 border-green-200" : ""}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <Label className="text-blue-700 font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        PARAMETER PENGECEKAN TINGKAH LAKU
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: "mataTertutup", label: "Mata tertutup > 2 detik" },
                                            { id: "seringMengedip", label: "Sering mengedip berat" },
                                            { id: "menguapBerulang", label: "Menguap berulang" },
                                            { id: "kepalaMengangguk", label: "Kepala mengangguk (Micro sleep)" },
                                            { id: "posturMembungkuk", label: "Postur membungkuk/lemas" },
                                            { id: "keluarJalur", label: "Keluar jalur / zig-zag" },
                                            { id: "reaksiRadioLambat", label: "Reaksi radio lambat (>5 detik)" },
                                            { id: "tidakMeresponRadio", label: "Tidak merespon radio" },
                                            { id: "alarmFatigueFmsAktif", label: "Alarm Fatigue FMS aktif" },
                                            { id: "mengemudiTidakStabil", label: "Mengemudi tidak stabil" },
                                        ].map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                                <Label htmlFor={item.id} className="flex-1 text-sm">{item.label}</Label>
                                                <Checkbox
                                                    id={item.id}
                                                    checked={(currentRecord as any)[item.id]}
                                                    onCheckedChange={(checked) => setCurrentRecord({ ...currentRecord, [item.id]: !!checked })}
                                                    className="w-6 h-6"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <Label className="text-green-700 font-bold flex items-center gap-2">
                                        <ClipboardCheck className="w-4 h-4" />
                                        TINDAK LANJUT / REKOMENDASI
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: "edukasiTwoWay", label: "Edukasi via two-way communication" },
                                            { id: "monitoringUlang", label: "Monitoring ulang 5 menit" },
                                            { id: "instruksiBerhenti", label: "Instruksi berhenti sementara" },
                                            { id: "stretchingMinum", label: "Stretching / minum" },
                                            { id: "parkirAman", label: "Parkir aman wajib" },
                                            { id: "gantiDriver", label: "Ganti driver" },
                                            { id: "mandatoryRest", label: "Mandatory rest >= 30 menit" },
                                            { id: "koordinasiPengawas", label: "Koordinasi pengawas lapangan" },
                                        ].map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/30">
                                                <Label htmlFor={item.id} className="flex-1 text-sm">{item.label}</Label>
                                                <Checkbox
                                                    id={item.id}
                                                    checked={(currentRecord as any)[item.id]}
                                                    onCheckedChange={(checked) => setCurrentRecord({ ...currentRecord, [item.id]: !!checked })}
                                                    className="w-6 h-6"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <Label className="text-gray-700 font-bold flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-blue-600" />
                                        LAMPIRAN EVIDANCE (OPSIONAL)
                                    </Label>
                                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 flex flex-col gap-3">
                                        {currentRecord.evidenceUrl ? (
                                            <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group">
                                                <img src={currentRecord.evidenceUrl} alt="Evidance" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, evidenceUrl: "" }))}
                                                    className="absolute top-2 right-2 bg-red-500/80 text-white p-1.5 rounded-full opacity-100 hover:bg-red-600 transition-colors shadow-sm"
                                                    title="Hapus Foto"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group">
                                                <Camera className="h-8 w-8 text-gray-400 group-hover:text-amber-500 mb-2 transition-colors" />
                                                <span className="text-sm text-gray-600 font-medium">Klik untuk Unggah / Ambil Foto</span>
                                                <span className="text-xs text-gray-400 text-center mt-1">Bukti temuan pelanggaran (jika ada)</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleEvidenceUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 3: Observers */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="text-white bg-blue-600 rounded-t-lg">
                                <CardTitle className="text-lg">Data Saksi / Observer</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {observers.map((obs, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                                        <div>
                                            <p className="font-bold text-sm">{obs.nama}</p>
                                            <p className="text-xs text-gray-500">{obs.jabatan} - {obs.perusahaan}</p>
                                        </div>
                                        <Check className="text-green-600 w-5 h-5" />
                                    </div>
                                ))}

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nama Saksi</Label>
                                            <Input
                                                placeholder="Nama Lengkap"
                                                value={manualObserver.nama}
                                                onChange={(e) => setManualObserver({ ...manualObserver, nama: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Perusahaan</Label>
                                            <Input
                                                placeholder="PT. XXX"
                                                value={manualObserver.perusahaan}
                                                onChange={(e) => setManualObserver({ ...manualObserver, perusahaan: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanda Tangan Saksi</Label>
                                        <SignaturePad
                                            onSave={(url) => setManualObserver({ ...manualObserver, signatureDataUrl: url })}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                        onClick={async () => {
                                            if (!manualObserver.nama || !manualObserver.signatureDataUrl) {
                                                toast({ title: "Gagal", description: "Nama dan Tanda tangan wajib ada.", variant: "destructive" });
                                                return;
                                            }
                                            const observerData: Observer = {
                                                ...manualObserver,
                                                nik: "MANUAL",
                                                jabatan: "Saksi Lapangan"
                                            };

                                            await apiRequest(`/api/sidak-behavior/${sessionId}/observers`, "POST", observerData);
                                            setObservers([...observers, observerData]);
                                            setManualObserver({ nama: "", perusahaan: "", signatureDataUrl: "" });
                                            toast({ title: "Ditambahkan", description: "Observer berhasil dicatat." });
                                        }}
                                    >
                                        Tambah Observer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 4: Summary */}
                {step === 4 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="bg-green-600 text-white rounded-t-lg">
                                <CardTitle>Ringkasan Sidak</CardTitle>
                                <CardDescription className="text-green-100">Review data sebelum diselesaikan</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Lokasi:</span>
                                        <span className="font-bold">{headerData.lokasi}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Shift:</span>
                                        <span className="font-bold">{headerData.shift}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Metode:</span>
                                        <span className="font-bold">{headerData.metodeSidak}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Car className="w-4 h-4 text-blue-600" />
                                        Daftar Driver ({records.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {records.map((r, i) => (
                                            <div key={i} className="p-3 border rounded text-xs">
                                                <div className="flex justify-between font-bold mb-1">
                                                    <span>{r.namaDriver}</span>
                                                    <span>{r.nomorLambung}</span>
                                                </div>
                                                <div className="text-gray-500 italic">
                                                    {r.mataTertutup && "Mata Tertutup, "}
                                                    {r.seringMengedip && "Sering Mengedip, "}
                                                    {r.menguapBerulang && "Menguap, "}
                                                    {r.kepalaMengangguk && "Micro-sleep, "}
                                                    {r.alarmFatigueFmsAktif && "Alarm FMS, "}
                                                    {!r.mataTertutup && !r.kepalaMengangguk && !r.alarmFatigueFmsAktif && "Normal Activity"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <DraftRecoveryDialog
                open={showRecoveryDialog}
                onRestore={handleRestoreDraft}
                onDiscard={ignoreDraft}
                timestamp={draftTimestamp}
                formType="behavior-driver"
            />
        </MobileSidakLayout>
    );
}
