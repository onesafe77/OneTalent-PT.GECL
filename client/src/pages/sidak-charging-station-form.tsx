import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import { Check, X, ArrowRight, Users, UserPlus, Car, AlertCircle, Camera, Search, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";

// Compliance checklist items (true = "Ya" / patuh)
const COMPLIANCE_ITEMS: { id: string; label: string }[] = [
    { id: "posisiAman", label: "Posisi DT aman, tidak mengganggu akses & membahayakan yang lain?" },
    { id: "kabelSesuai", label: "Charging sesuai peruntukan tipe/warna kabel yang ditetapkan?" },
    { id: "apdLengkap", label: "Menggunakan APD lengkap (sarung tangan standar, Helm, Sepatu Safety)?" },
    { id: "tetapDiKabin", label: "Driver tetap berada di dalam kabin selama proses charging?" },
    { id: "tidakMerokok", label: "Driver tidak merokok selama berada di area charging station?" },
    { id: "merapikanKabel", label: "Merapikan kembali kabel/konektor ke dudukannya setelah selesai?" },
];

interface ChargingRecord {
    namaDriver: string;
    nomorLambung: string;
    nik: string;
    posisiAman: boolean;
    kabelSesuai: boolean;
    apdLengkap: boolean;
    tetapDiKabin: boolean;
    tidakMerokok: boolean;
    merapikanKabel: boolean;
    keterangan: string;
    evidenceUrl?: string;
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    jabatan: string;
    signatureDataUrl: string;
}

interface ChargingDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        shift: string;
        lokasi: string;
        waktuMulai: string;
        waktuSelesai: string;
    };
    records: ChargingRecord[];
    currentRecord: ChargingRecord;
    observers: Observer[];
}

const initialRecord: ChargingRecord = {
    namaDriver: "",
    nomorLambung: "",
    nik: "",
    posisiAman: true,
    kabelSesuai: true,
    apdLengkap: true,
    tetapDiKabin: true,
    tidakMerokok: true,
    merapikanKabel: true,
    keterangan: "",
    evidenceUrl: "",
};

const initialDraftData: ChargingDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        shift: "Shift 1",
        lokasi: "",
        waktuMulai: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        waktuSelesai: ""
    },
    records: [],
    currentRecord: initialRecord,
    observers: []
};

export default function SidakChargingStationForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    const {
        saveDraft,
        clearDraft,
        restoreDraft,
        ignoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<ChargingDraftData>({
        key: "charging-station",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [step, setStep] = useState(1);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [headerData, setHeaderData] = useState(initialDraftData.headerData);
    const [records, setRecords] = useState<ChargingRecord[]>([]);
    const [currentRecord, setCurrentRecord] = useState<ChargingRecord>(initialRecord);
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

    // Driver directory bersumber dari ROSTER pada tanggal sesi (sesuai halaman HR Roster).
    // Nomor lambung memakai fallback 3-tier: actual -> planned -> master employee.
    const { data: rosterData } = useQuery<any[]>({
        queryKey: [`/api/roster?date=${headerData.tanggal}`],
        enabled: !!headerData.tanggal,
    });

    const normLambung = (s?: string | null) => (s || "").trim().toUpperCase();
    const shiftMatches = (rShift?: string | null) => {
        // headerData.shift "Shift 1" -> roster "SHIFT 1"
        const want = (headerData.shift || "").trim().toUpperCase();
        const got = (rShift || "").trim().toUpperCase();
        return !want || !got ? false : got === want;
    };

    interface DriverEntry { nik: string; nama: string; nomorLambung: string; shift: string }
    const driverDirectory: DriverEntry[] = (Array.isArray(rosterData) ? rosterData : [])
        .map((r: any) => ({
            nik: r.employee?.id || r.employeeId || "",
            nama: r.employee?.name || "",
            nomorLambung: r.actualNomorLambung || r.plannedNomorLambung || r.employee?.nomorLambung || "",
            shift: r.shift || "",
        }))
        .filter((d) => d.nik && d.nomorLambung);

    const filteredDrivers: DriverEntry[] = (() => {
        if (!driverSearch.trim()) return [];
        const q = driverSearch.toLowerCase();
        const matches = driverDirectory.filter((d) =>
            d.nama.toLowerCase().includes(q) ||
            d.nomorLambung.toLowerCase().includes(q) ||
            d.nik.toLowerCase().includes(q)
        );
        // Prioritaskan yang shift-nya sama dengan sesi
        matches.sort((a, b) => Number(shiftMatches(b.shift)) - Number(shiftMatches(a.shift)));
        return matches.slice(0, 10);
    })();

    // Lookup driver berdasarkan nomor lambung (untuk auto-isi saat mengetik lambung).
    const [lambungMatches, setLambungMatches] = useState<DriverEntry[]>([]);
    const [showLambungPicker, setShowLambungPicker] = useState(false);

    const applyDriver = (d: DriverEntry) => {
        setCurrentRecord((prev) => ({ ...prev, namaDriver: d.nama, nik: d.nik, nomorLambung: d.nomorLambung }));
        setShowLambungPicker(false);
        setLambungMatches([]);
    };

    const lookupByLambung = (value: string) => {
        const key = normLambung(value);
        if (!key) { setLambungMatches([]); setShowLambungPicker(false); return; }
        let matches = driverDirectory.filter((d) => normLambung(d.nomorLambung) === key);
        // Utamakan match shift sesi bila ada
        const sameShift = matches.filter((d) => shiftMatches(d.shift));
        if (sameShift.length > 0) matches = sameShift;
        if (matches.length === 1) {
            applyDriver(matches[0]);
        } else if (matches.length > 1) {
            setLambungMatches(matches);
            setShowLambungPicker(true);
        } else {
            setLambungMatches([]);
            setShowLambungPicker(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (driverSearchRef.current && !driverSearchRef.current.contains(e.target as Node)) {
                setShowDriverDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            return await apiRequest("/api/sidak-charging-station", "POST", data);
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
            return await apiRequest(`/api/sidak-charging-station/${sessionId}/records`, "POST", data);
        },
        onSuccess: () => {
            setRecords([...records, currentRecord]);
            setCurrentRecord(initialRecord);
            toast({ title: "Berhasil", description: "Data driver disimpan." });
        }
    });

    const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("photo", file);

        try {
            const res = await fetch("/api/sidak-charging-station/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setCurrentRecord(prev => ({ ...prev, evidenceUrl: data.url }));

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
                toast({ title: "Peringatan", description: "Minimal 1 pemantau harus tanda tangan.", variant: "destructive" });
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

    const countTidak = (r: ChargingRecord) =>
        COMPLIANCE_ITEMS.filter(item => !(r as any)[item.id]).length;

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
                            Selesai & Lanjut ke Pemantau
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
            title="Observasi Kepatuhan Driver di Area Charging Station"
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
                            {[
                                { n: 1, label: "Header" },
                                { n: 2, label: "Driver" },
                                { n: 3, label: "Pemantau" },
                                { n: 4, label: "Selesai" },
                            ].map((s) => (
                                <div key={s.n} className={cn("flex flex-col items-center", step >= s.n ? "opacity-100" : "opacity-40")}>
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1", step > s.n ? "bg-green-500 text-white" : "bg-blue-600 text-white")}>
                                        {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                                    </div>
                                    <span className="text-[10px] font-medium">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Step 1: Header */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    Informasi Observasi
                                </CardTitle>
                                <CardDescription>Detail waktu dan lokasi pelaksanaan di area charging station</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={headerData.tanggal}
                                        onChange={(e) => setHeaderData({ ...headerData, tanggal: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Waktu Mulai</Label>
                                        <Input
                                            type="time"
                                            value={headerData.waktuMulai}
                                            onChange={(e) => setHeaderData({ ...headerData, waktuMulai: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Waktu Selesai</Label>
                                        <Input
                                            type="time"
                                            value={headerData.waktuSelesai}
                                            onChange={(e) => setHeaderData({ ...headerData, waktuSelesai: e.target.value })}
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
                                    <Label>Lokasi Charging Station</Label>
                                    <Input
                                        placeholder="Contoh: Charging Station Workshop, KM 12"
                                        value={headerData.lokasi}
                                        onChange={(e) => setHeaderData({ ...headerData, lokasi: e.target.value })}
                                    />
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
                                <div className="mt-2">
                                    <Progress value={records.length * 10} className="h-1.5" />
                                </div>
                                <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    Maksimum <strong>10 sampel</strong> per sesi observasi
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2" ref={driverSearchRef}>
                                    <Label className="flex items-center gap-1">
                                        <Search className="w-3 h-3" />
                                        Cari Driver (Roster {headerData.tanggal})
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Ketik nomor lambung / nama / NIK..."
                                            value={driverSearch}
                                            onChange={(e) => {
                                                setDriverSearch(e.target.value);
                                                setShowDriverDropdown(true);
                                            }}
                                            onFocus={() => driverSearch.trim() && setShowDriverDropdown(true)}
                                            className="pr-8"
                                        />
                                        <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />

                                        {showDriverDropdown && filteredDrivers.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredDrivers.map((d, i) => (
                                                    <button
                                                        key={`${d.nik}-${d.nomorLambung}-${i}`}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                        onClick={() => {
                                                            applyDriver(d);
                                                            setDriverSearch('');
                                                            setShowDriverDropdown(false);
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium text-sm text-gray-900">{d.nama}</span>
                                                            {d.nomorLambung && (
                                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                                                                    {d.nomorLambung}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            NIK: {d.nik} {d.shift ? `• ${d.shift}` : ''}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {showDriverDropdown && driverSearch.trim().length >= 2 && filteredDrivers.length === 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-xs text-gray-500">
                                                Tidak ada di roster tanggal ini — isi manual di bawah.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <Label>No. Lambung</Label>
                                    <Input
                                        placeholder="Ketik nomor lambung lalu Enter / keluar field"
                                        value={currentRecord.nomorLambung}
                                        onChange={(e) => setCurrentRecord({ ...currentRecord, nomorLambung: e.target.value })}
                                        onBlur={(e) => lookupByLambung(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupByLambung((e.target as HTMLInputElement).value); } }}
                                        className={currentRecord.nomorLambung ? "bg-green-50 border-green-200" : ""}
                                    />
                                    {showLambungPicker && lambungMatches.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            <div className="px-3 py-1.5 text-[10px] text-gray-500 bg-gray-50 border-b">
                                                {lambungMatches.length} driver pakai lambung ini — pilih satu:
                                            </div>
                                            {lambungMatches.map((d, i) => (
                                                <button
                                                    key={`${d.nik}-${i}`}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                    onClick={() => applyDriver(d)}
                                                >
                                                    <div className="font-medium text-sm text-gray-900">{d.nama}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">NIK: {d.nik} {d.shift ? `• ${d.shift}` : ''}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nama Driver</Label>
                                        <Input
                                            placeholder="Auto dari nomor lambung"
                                            value={currentRecord.namaDriver}
                                            onChange={(e) => setCurrentRecord({ ...currentRecord, namaDriver: e.target.value })}
                                            className={currentRecord.namaDriver ? "bg-green-50 border-green-200" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>NIK</Label>
                                        <Input
                                            placeholder="Auto dari nomor lambung"
                                            value={currentRecord.nik}
                                            onChange={(e) => setCurrentRecord({ ...currentRecord, nik: e.target.value })}
                                            className={currentRecord.nik ? "bg-green-50 border-green-200" : ""}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <Label className="text-blue-700 font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        CHECKLIST KEPATUHAN
                                    </Label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {COMPLIANCE_ITEMS.map((item, idx) => {
                                            const value = (currentRecord as any)[item.id] as boolean;
                                            return (
                                                <div key={item.id} className="p-3 border rounded-lg bg-gray-50/50 space-y-2">
                                                    <Label className="text-sm flex gap-1.5">
                                                        <span className="text-gray-400 font-bold">{idx + 1}.</span>
                                                        <span>{item.label}</span>
                                                    </Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentRecord({ ...currentRecord, [item.id]: true })}
                                                            className={cn(
                                                                "h-9 rounded-lg text-sm font-bold border-2 transition-colors",
                                                                value
                                                                    ? "bg-green-500 border-green-500 text-white"
                                                                    : "bg-white border-gray-200 text-gray-500"
                                                            )}
                                                        >
                                                            Ya
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentRecord({ ...currentRecord, [item.id]: false })}
                                                            className={cn(
                                                                "h-9 rounded-lg text-sm font-bold border-2 transition-colors",
                                                                !value
                                                                    ? "bg-red-500 border-red-500 text-white"
                                                                    : "bg-white border-gray-200 text-gray-500"
                                                            )}
                                                        >
                                                            Tidak
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-bold flex items-center gap-2">
                                        Keterangan
                                    </Label>
                                    <Textarea
                                        placeholder="Catatan temuan / tindakan jika ada ketidakpatuhan..."
                                        value={currentRecord.keterangan}
                                        onChange={(e) => setCurrentRecord({ ...currentRecord, keterangan: e.target.value })}
                                        rows={3}
                                    />
                                    {countTidak(currentRecord) > 0 && (
                                        <p className="text-[11px] text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 shrink-0" />
                                            {countTidak(currentRecord)} item tidak patuh — sebaiknya isi keterangan.
                                        </p>
                                    )}
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
                                                <span className="text-xs text-gray-400 text-center mt-1">Bukti temuan (jika ada)</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleEvidenceUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 3: Pemantau / Observers */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="text-white bg-blue-600 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Data Pemantau
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {observers.map((obs, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                                        <div>
                                            <p className="font-bold text-sm">{obs.nama}</p>
                                            <p className="text-xs text-gray-500">{obs.perusahaan}</p>
                                        </div>
                                        <Check className="text-green-600 w-5 h-5" />
                                    </div>
                                ))}

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nama Pemantau</Label>
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
                                        <Label>Tanda Tangan Pemantau</Label>
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
                                                jabatan: "Pemantau"
                                            };

                                            await apiRequest(`/api/sidak-charging-station/${sessionId}/observers`, "POST", observerData);
                                            setObservers([...observers, observerData]);
                                            setManualObserver({ nama: "", perusahaan: "", signatureDataUrl: "" });
                                            toast({ title: "Ditambahkan", description: "Pemantau berhasil dicatat." });
                                        }}
                                    >
                                        Tambah Pemantau
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
                                <CardTitle>Ringkasan Observasi</CardTitle>
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
                                        <span className="text-gray-500">Waktu:</span>
                                        <span className="font-bold">{headerData.waktuMulai}{headerData.waktuSelesai ? ` - ${headerData.waktuSelesai}` : ''}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Car className="w-4 h-4 text-blue-600" />
                                        Daftar Driver ({records.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {records.map((r, i) => {
                                            const tidak = countTidak(r);
                                            return (
                                                <div key={i} className="p-3 border rounded text-xs">
                                                    <div className="flex justify-between font-bold mb-1">
                                                        <span>{r.namaDriver}{r.nik ? ` (${r.nik})` : ''}</span>
                                                        <span>{r.nomorLambung}</span>
                                                    </div>
                                                    <div className={cn("italic", tidak > 0 ? "text-red-600" : "text-green-600")}>
                                                        {tidak > 0 ? `${tidak} item tidak patuh` : "Patuh sepenuhnya"}
                                                    </div>
                                                    {r.keterangan && (
                                                        <div className="text-gray-500 mt-1">Ket: {r.keterangan}</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600">
                                    Pemantau: <span className="font-bold">{observers.map(o => o.nama).join(', ') || '-'}</span>
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
                formType="charging-station"
            />
        </MobileSidakLayout>
    );
}
