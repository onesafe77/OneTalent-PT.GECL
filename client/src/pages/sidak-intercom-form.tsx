import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, ArrowRight, Save, Plus, Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Employee } from "@shared/schema";

interface IntercomRecord {
    ordinal?: number;
    nama: string;
    nik: string;
    nomorLambung: string;
    waktuTemuan: string;
    waktuIntervensi: string;
    q1_slaRespons: boolean;
    q2_identifikasi: boolean;
    q3_kualitasKomunikasi: boolean;
    q4_instruksiK3: boolean;
    q5_verifikasiTindakan: boolean;
    waktuResponsMenit: string;
    keterangan: string;
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    tandaTangan: string;
}

interface IntercomDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        shift: string;
        waktu: string;
        lokasi: string;
        personilHse: string;
        pengawasFms: string;
        pemantau: string;
    };
    records: IntercomRecord[];
    observers: Observer[];
}

const initialDraftData: IntercomDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        shift: "Shift 1",
        waktu: "",
        lokasi: "",
        personilHse: "",
        pengawasFms: "",
        pemantau: ""
    },
    records: [],
    observers: []
};

export default function SidakIntercomForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    // Draft system
    const {
        saveDraft,
        ignoreDraft,
        restoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<IntercomDraftData>({
        key: "intercom",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<IntercomDraftData>(initialDraftData);

    const [currentRecord, setCurrentRecord] = useState<IntercomRecord>({
        nama: "",
        nik: "",
        nomorLambung: "",
        waktuTemuan: "",
        waktuIntervensi: "",
        q1_slaRespons: false,
        q2_identifikasi: false,
        q3_kualitasKomunikasi: false,
        q4_instruksiK3: false,
        q5_verifikasiTindakan: false,
        waktuResponsMenit: "",
        keterangan: ""
    });

    const [currentObserver, setCurrentObserver] = useState<Observer>({
        nama: "",
        nik: "",
        perusahaan: "",
        tandaTangan: ""
    });

    // Autocomplete state
    const [searchOpen, setSearchOpen] = useState(false);
    const [nameSearch, setNameSearch] = useState("");
    const [debouncedNameSearch, setDebouncedNameSearch] = useState("");

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedNameSearch(nameSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [nameSearch]);

    // Fetch employees with server-side search
    const { data: employeesResponse } = useQuery<any>({
        queryKey: ["/api/employees", debouncedNameSearch],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: '1',
                per_page: '20',
                ...(debouncedNameSearch && { search: debouncedNameSearch })
            });
            const res = await apiRequest(`/api/employees?${params}`);
            return res;
        },
        staleTime: 5000
    });

    const employees = Array.isArray(employeesResponse?.data) ? employeesResponse.data : [];

    const handleEmployeeSelect = (employee: Employee) => {
        setCurrentRecord(prev => ({
            ...prev,
            nama: employee.name,
            nik: employee.id, // ID acts as NIK
        }));
        setNameSearch(employee.name);
        setSearchOpen(false);
    };

    // Auto-save
    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

    // Auto-calculate Response Time
    useEffect(() => {
        if (currentRecord.waktuTemuan && currentRecord.waktuIntervensi) {
            const [tH, tM] = currentRecord.waktuTemuan.split(':').map(Number);
            const [iH, iM] = currentRecord.waktuIntervensi.split(':').map(Number);

            if (!isNaN(tH) && !isNaN(tM) && !isNaN(iH) && !isNaN(iM)) {
                let temuanDt = new Date();
                temuanDt.setHours(tH, tM, 0, 0);

                let intervensiDt = new Date();
                intervensiDt.setHours(iH, iM, 0, 0);

                // Handle cross-midnight
                if (intervensiDt < temuanDt) {
                    intervensiDt.setDate(intervensiDt.getDate() + 1);
                }

                const diffMs = intervensiDt.getTime() - temuanDt.getTime();
                const diffMins = Math.max(0, diffMs / (1000 * 60));

                setCurrentRecord(prev => ({
                    ...prev,
                    waktuResponsMenit: diffMins.toString()
                }));
            }
        }
    }, [currentRecord.waktuTemuan, currentRecord.waktuIntervensi]);

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

    const handleCreateSession = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                ...data,
                activityPhotos: []
            };
            const res = await apiRequest("/api/sidak-intercom/sessions", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({ title: "Sesi Dimulai", description: "Silakan input data Intercom." });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: IntercomRecord) => {
            if (!draft.sessionId) throw new Error("No active session");
            const payload = { ...record, sessionId: draft.sessionId, ordinal: draft.records.length + 1 };
            // Ensure waktuResponsMenit is null if empty string so postgres numeric column won't crash
            if (payload.waktuResponsMenit === "") {
                (payload as any).waktuResponsMenit = null;
            }
            const res = await apiRequest(`/api/sidak-intercom/sessions/${draft.sessionId}/records`, "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, records: [...prev.records, data] }));
            setCurrentRecord({
                nama: "",
                nik: "",
                nomorLambung: "",
                waktuTemuan: "",
                waktuIntervensi: "",
                q1_slaRespons: false,
                q2_identifikasi: false,
                q3_kualitasKomunikasi: false,
                q4_instruksiK3: false,
                q5_verifikasiTindakan: false,
                waktuResponsMenit: "",
                keterangan: ""
            });
            toast({ title: "Data Disimpan", description: "Log Intercom berhasil ditambahkan." });
        },
        onError: (error: Error) => {
            console.error("Failed to add Intercom record:", error);
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
            const res = await apiRequest(`/api/sidak-intercom/sessions/${draft.sessionId}/observers`, "POST", {
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
        navigate("/workspace/sidak/intercom/history");
        toast({ title: "Selesai", description: "Laporan SIDAK Intercom telah disimpan." });
    };

    const maxRecords = 5; // Updated to 5 per user request
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
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200 dark:shadow-none"
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
                formType="intercom"
            />

            <MobileSidakLayout
                title="Sidak Intercom Pengawas FMS"
                subtitle="Form Inspeksi Kepatuhan FMS"
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
                                Lengkapi data header inspeksi Intercom Pengawas FMS.
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

                            <div className="grid grid-cols-2 gap-4">
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
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Personil HSE</Label>
                                    <Input
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={draft.headerData.personilHse}
                                        onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, personilHse: e.target.value } }))}
                                        placeholder="Nama Personil HSE"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Pengawas FMS</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    value={draft.headerData.pengawasFms}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, pengawasFms: e.target.value } }))}
                                    placeholder="Nama Pengawas FMS yang dievaluasi"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Pemantau / Observer</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    value={draft.headerData.pemantau}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, pemantau: e.target.value } }))}
                                    placeholder="Nama Pemantau (Observer)"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: Hauling Road TIA – Pit North"
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
                                <p className="text-xs text-gray-500 uppercase font-semibold">Tercatat</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.records.length} <span className="text-sm text-gray-400 font-normal">/ {maxRecords}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-slate-50 dark:bg-slate-900/30 rounded-full flex items-center justify-center text-slate-600">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Input Form */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Evaluasi</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                                {/* Worker Information */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Nama Pengawas <span className="text-red-500">*</span></Label>
                                    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <Input
                                                    value={nameSearch || currentRecord.nama}
                                                    onChange={(e) => {
                                                        setNameSearch(e.target.value);
                                                        setCurrentRecord(prev => ({ ...prev, nama: e.target.value }));
                                                        setSearchOpen(true);
                                                    }}
                                                    placeholder="Cari Nama Pengawas..."
                                                    className="h-12 pl-9 bg-gray-50 border-gray-200"
                                                />
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                            <Command shouldFilter={false}>
                                                <CommandList>
                                                    <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                                                    <CommandGroup heading="Hasil Pencarian">
                                                        {employees.map((emp: Employee) => (
                                                            <CommandItem
                                                                key={emp.id}
                                                                value={emp.name}
                                                                onSelect={() => handleEmployeeSelect(emp)}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{emp.name}</span>
                                                                    <span className="text-xs text-gray-500">NIK: {emp.id}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Nomor Lambung</Label>
                                        <Input
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.nomorLambung}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, nomorLambung: e.target.value }))}
                                            placeholder="Contoh: DT 123"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Waktu Temuan</Label>
                                        <Input
                                            type="time"
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.waktuTemuan}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, waktuTemuan: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Waktu Intervensi</Label>
                                        <Input
                                            type="time"
                                            className="h-12 bg-gray-50 border-gray-200"
                                            value={currentRecord.waktuIntervensi}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, waktuIntervensi: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Checklist */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <Label className="text-sm font-bold text-gray-700 dark:text-gray-200">Kriteria Penilaian (Centang jika Sesuai)</Label>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                1. SLA Respons: Pengawas merespons alarm valid fatigue maks. 1-2 menit setelah notifikasi muncul?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q1_slaRespons}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q1_slaRespons: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                2. Identifikasi: Pengawas menyebutkan 'FMS Monitor' dan nomor lambung unit dengan benar saat intercom terhubung?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q2_identifikasi}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q2_identifikasi: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                3. Kualitas Komunikasi: Nada suara tegas namun tidak panik, menanyakan kondisi aktual operator dengan jelas?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q3_kualitasKomunikasi}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q3_kualitasKomunikasi: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                4. Instruksi K3: Pengawas menginstruksikan operator beristirahat di tempat aman (Rest Area / Workshop terdekat)?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q4_instruksiK3}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q4_instruksiK3: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>

                                    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                5. Verifikasi Tindakan: Pengawas memastikan operator mematuhi instruksi (berhenti, cuci muka, stretching, atau ganti operator)?
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={currentRecord.q5_verifikasiTindakan}
                                            onChange={(e) => setCurrentRecord(prev => ({ ...prev, q5_verifikasiTindakan: e.target.checked }))}
                                            className="h-5 w-5 rounded border-gray-300 mt-1 ml-3"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Waktu Respons (Menit)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="h-12 bg-gray-50 border-gray-200"
                                        value={currentRecord.waktuResponsMenit}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, waktuResponsMenit: e.target.value }))}
                                        placeholder="Contoh: 1.5"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Keterangan Tambahan</Label>
                                    <Textarea
                                        value={currentRecord.keterangan}
                                        onChange={(e) => setCurrentRecord(prev => ({ ...prev, keterangan: e.target.value }))}
                                        placeholder="Catatan observasi"
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
                                                <p className="text-xs text-gray-500">{rec.nik} • {rec.nomorLambung}</p>
                                                <div className="mt-2 text-xs flex gap-2 flex-wrap">
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 rounded">Temuan: {rec.waktuTemuan || '-'}</span>
                                                    <span className="bg-purple-50 text-purple-700 px-2 rounded">Intervensi: {rec.waktuIntervensi || '-'}</span>
                                                    <span className="bg-blue-50 text-blue-700 px-2 rounded">Resp: {rec.waktuResponsMenit}m</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {[1, 2, 3, 4, 5].map(num => {
                                                        const key = `q${num}` as any;
                                                        const isChecked = Object.entries(rec).find(([k]) => k.startsWith(key))?.[1];
                                                        return (
                                                            <span key={num} className={`text-xs px-2 py-0.5 rounded ${isChecked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                Q{num}: {isChecked ? '✓' : '✗'}
                                                            </span>
                                                        )
                                                    })}
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
                                        <div key={idx} className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{obs.nama}</p>
                                                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
                                            </div>
                                            <Check className="h-5 w-5 text-green-600" />
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
