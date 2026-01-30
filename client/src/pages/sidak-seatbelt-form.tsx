import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardCheck, Check, X, ArrowLeft, ArrowRight, Save, Trash2, Plus, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { Checkbox } from "@/components/ui/checkbox";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import type { Employee } from "@shared/schema";

interface SeatbeltRecord {
    ordinal?: number; // Added for tracking
    nama: string;
    nik: string;
    nomorLambung: string;
    perusahaan: string;
    seatbeltDriverCondition: boolean;
    seatbeltPassengerCondition: boolean;
    seatbeltDriverUsage: boolean;
    seatbeltPassengerUsage: boolean;
    keterangan: string;
}

interface Observer {
    nama: string;
    nik: string;
    perusahaan: string;
    jabatan: string;
    signatureDataUrl: string;
}

interface SeatbeltDraftData {
    step: number;
    sessionId: string | null;
    headerData: {
        tanggal: string;
        waktu: string;
        shift: string;
        lokasi: string;
    };
    records: SeatbeltRecord[];
    observers: Observer[];
}

const initialDraftData: SeatbeltDraftData = {
    step: 1,
    sessionId: null,
    headerData: {
        tanggal: new Date().toISOString().split('T')[0],
        waktu: "",
        shift: "Shift 1",
        lokasi: ""
    },
    records: [],
    observers: []
};

function getCurrentShift(): string {
    const now = new Date();
    const hour = now.getHours();
    // SHIFT 1: 06:00 - 18:00
    // SHIFT 2: 18:00 - 06:00
    if (hour >= 6 && hour < 18) {
        return "Shift 1";
    } else {
        return "Shift 2";
    }
}

export default function SidakSeatbeltForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Draft recovery system
    const {
        saveDraft,
        clearDraft,
        restoreDraft,
        ignoreDraft,
        showRecoveryDialog,
        draftTimestamp
    } = useSidakDraft<SeatbeltDraftData>({
        key: "seatbelt",
        initialData: initialDraftData,
        debounceMs: 1500
    });

    const [draft, setDraft] = useState<SeatbeltDraftData>(initialDraftData);
    const [currentRecord, setCurrentRecord] = useState<SeatbeltRecord>({
        nama: "",
        nik: "",
        nomorLambung: "",
        perusahaan: "",
        seatbeltDriverCondition: true,
        seatbeltPassengerCondition: true,
        seatbeltDriverUsage: true,
        seatbeltPassengerUsage: true,
        keterangan: ""
    });

    const [currentObserver, setCurrentObserver] = useState<Observer>({
        nama: "",
        nik: "",
        perusahaan: "",
        jabatan: "",
        signatureDataUrl: ""
    });

    // Calculate progress
    const maxRecords = 10;
    const canAddMore = draft.records.length < maxRecords;

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

    useEffect(() => {
        // Set default draft if new
        if (!draft.headerData.waktu && draft.step === 1) {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setDraft(prev => ({
                ...prev,
                headerData: {
                    ...prev.headerData,
                    waktu: timeString,
                    shift: getCurrentShift()
                }
            }));
        }
    }, []);

    // Auto-save effect - save current form state to draft
    useEffect(() => {
        saveDraft(draft);
    }, [draft, saveDraft]);

    // Handle draft restoration
    const handleRestoreDraft = async () => {
        const restoredData = restoreDraft();
        if (restoredData) {
            // If the draft was from before sessionId was saved, create a new session
            if (!restoredData.sessionId && restoredData.step > 1) {
                try {
                    const response = await apiRequest("/api/sidak-seatbelt", "POST", restoredData.headerData);
                    setDraft({ ...restoredData, sessionId: response.id });
                    toast({
                        title: "Draft Dipulihkan",
                        description: "Data SIDAK Seatbelt sebelumnya berhasil dipulihkan dan sesi baru dibuat",
                    });
                } catch (error: any) {
                    toast({
                        title: "Error",
                        description: "Gagal membuat sesi baru. Silakan mulai dari awal.",
                        variant: "destructive",
                    });
                    setDraft({ ...restoredData, step: 1 });
                    return;
                }
            } else {
                setDraft(restoredData);
                toast({
                    title: "Draft Dipulihkan",
                    description: "Data SIDAK Seatbelt sebelumnya berhasil dipulihkan",
                });
            }
        }
    };

    // Fetch employees with server-side search for robust results
    const { data: employeesResponse, isLoading: isLoadingEmployees } = useQuery<any>({
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
        // Keep results fresh for short time during typing
        staleTime: 5000
    });

    // Handle paginated response structure { data: [], total: ... }
    // The server search endpoint always returns { data: [...] } format
    const employees = Array.isArray(employeesResponse?.data) ? employeesResponse.data : [];

    const handleCreateSession = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                ...data,
                shiftType: data.shift || "Shift 1",
                activityPhotos: [], // Ensure this is sent as empty array if required
            };
            const res = await apiRequest("/api/sidak-seatbelt", "POST", payload);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({ ...prev, sessionId: data.id, step: 2 }));
            toast({
                title: "Sesi Sidak Dimulai",
                description: "Silakan input data pemeriksaan seatbelt.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal membuat sesi",
                description: error.message || "Terjadi kesalahan saat menyimpan data sesi.",
                variant: "destructive",
            });
        }
    });

    const handleAddRecord = useMutation({
        mutationFn: async (record: SeatbeltRecord) => {
            const res = await apiRequest(`/api/sidak-seatbelt/${draft.sessionId}/records`, "POST", record);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({
                ...prev,
                records: [...prev.records, data]
            }));
            // Reset form
            setCurrentRecord({
                nama: "",
                nik: "",
                nomorLambung: "",
                perusahaan: "",
                seatbeltDriverCondition: true,
                seatbeltPassengerCondition: true,
                seatbeltDriverUsage: true,
                seatbeltPassengerUsage: true,
                keterangan: ""
            });
            setNameSearch("");
            toast({
                title: "Data Tersimpan",
                description: "Data pemeriksaan berhasil ditambahkan.",
            });
        }
    });

    const handleAddObserver = useMutation({
        mutationFn: async (observer: Observer) => {
            const res = await apiRequest(`/api/sidak-seatbelt/${draft.sessionId}/observers`, "POST", observer);
            return res;
        },
        onSuccess: (data) => {
            setDraft(prev => ({
                ...prev,
                observers: [...prev.observers, data]
            }));
            // Reset observer form
            setCurrentObserver({
                nama: "",
                nik: "",
                perusahaan: "",
                jabatan: "",
                signatureDataUrl: ""
            });
            toast({
                title: "Observer Ditambahkan",
                description: "Data pengawas berhasil disimpan.",
            });
        }
    });

    const handleFinish = () => {
        navigate("/workspace/sidak/seatbelt/history");
        toast({
            title: "Sidak Selesai",
            description: "Seluruh data sidak seatbelt telah disimpan.",
        });
    };

    // Use server-side search results directly
    // Ensure we handle potential null/undefined values safely
    const filteredEmployees = (Array.isArray(employees) ? employees : []);

    const handleEmployeeSelect = (employee: Employee) => {
        setCurrentRecord(prev => ({
            ...prev,
            nama: employee.name,
            nik: employee.id,
            nomorLambung: employee.nomorLambung || "",
            perusahaan: employee.investorGroup || "PT. Goden Energi Cemerlang Lesrari"
        }));
        setNameSearch(employee.name);
        setSearchOpen(false);
    };

    const renderBottomAction = () => {
        if (draft.step === 1) {
            return (
                <Button
                    className="w-full h-12 text-lg font-medium shadow-md shadow-green-200 dark:shadow-none bg-green-600 hover:bg-green-700 text-white"
                    disabled={!draft.headerData.lokasi || !draft.headerData.waktu || handleCreateSession.isPending}
                    onClick={() => handleCreateSession.mutate(draft.headerData)}
                >
                    {handleCreateSession.isPending ? "Membuat Sesi..." : "Lanjut ke Pemeriksaan"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            );
        }
        if (draft.step === 2) {
            return (
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => handleAddRecord.mutate(currentRecord)}
                        disabled={!currentRecord.nama || !currentRecord.perusahaan || !canAddMore || handleAddRecord.isPending}
                        className="w-full h-12 text-lg font-medium shadow-md shadow-green-200 dark:shadow-none bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {canAddMore ? "Simpan Pemeriksaan" : "Batas Maksimal"}
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
                formType="seatbelt"
            />

            <MobileSidakLayout
                title="Sidak Seatbelt"
                subtitle="Pemeriksaan Seatbelt"
                step={draft.step}
                totalSteps={3}
                onBack={() => navigate("/workspace/sidak")}
                bottomAction={renderBottomAction()}
            >
                {/* STEP 1 */}
                {draft.step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                    <ClipboardCheck className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-green-900 dark:text-green-100">Info Pelaksanaan</h3>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-300">
                                Lengkapi data waktu dan lokasi pemeriksaan seatbelt.
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
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Jam</Label>
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
                                        <SelectItem value="Shift 1">Shift 1 (06:00 - 18:00)</SelectItem>
                                        <SelectItem value="Shift 2">Shift 2 (18:00 - 06:00)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi</Label>
                                <Input
                                    className="h-12 bg-gray-50 border-gray-200"
                                    placeholder="Contoh: KM 6, Simpang 4"
                                    value={draft.headerData.lokasi}
                                    onChange={(e) => setDraft(prev => ({ ...prev, headerData: { ...prev.headerData, lokasi: e.target.value } }))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2 */}
                {draft.step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats */}
                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Unit Diperiksa</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{draft.records.length} <span className="text-sm text-gray-400 font-normal">/ {maxRecords}</span></p>
                            </div>
                            <div className="h-10 w-10 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Pemeriksaan</h2>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-5 shadow-sm">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase text-gray-500">Nama Driver / Karyawan <span className="text-red-500">*</span></Label>
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
                                                        placeholder="Cari Nama / NIK..."
                                                        className="h-12 pl-9 bg-gray-50 border-gray-200"
                                                    />
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                                <Command shouldFilter={false}>
                                                    <CommandList>
                                                        <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                                                        <CommandGroup heading="Hasil Pencarian">
                                                            {filteredEmployees.map((emp) => (
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
                                            <Label className="text-xs font-semibold uppercase text-gray-500">No. Lambung</Label>
                                            <Input
                                                className="h-12 bg-gray-50 border-gray-200"
                                                value={currentRecord.nomorLambung}
                                                onChange={(e) => setCurrentRecord(prev => ({ ...prev, nomorLambung: e.target.value }))}
                                                placeholder="CN-XXX"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan <span className="text-red-500">*</span></Label>
                                            <Input
                                                className="h-12 bg-gray-50 border-gray-200"
                                                value={currentRecord.perusahaan}
                                                onChange={(e) => setCurrentRecord(prev => ({ ...prev, perusahaan: e.target.value }))}
                                                placeholder="PT..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Kondisi Seatbelt (Baik?)</h3>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-xs text-gray-500">Pengemudi</Label>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant={currentRecord.seatbeltDriverCondition ? "default" : "outline"}
                                                    className={cn("flex-1", currentRecord.seatbeltDriverCondition && "bg-green-600 hover:bg-green-700")}
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltDriverCondition: true }))}
                                                >
                                                    Ya
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={!currentRecord.seatbeltDriverCondition ? "destructive" : "outline"}
                                                    className="flex-1"
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltDriverCondition: false }))}
                                                >
                                                    Tidak
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-xs text-gray-500">Penumpang</Label>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant={currentRecord.seatbeltPassengerCondition ? "default" : "outline"}
                                                    className={cn("flex-1", currentRecord.seatbeltPassengerCondition && "bg-green-600 hover:bg-green-700")}
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltPassengerCondition: true }))}
                                                >
                                                    Ya
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={!currentRecord.seatbeltPassengerCondition ? "destructive" : "outline"}
                                                    className="flex-1"
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltPassengerCondition: false }))}
                                                >
                                                    Tidak
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Pemakaian Seatbelt (Benar?)</h3>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-xs text-gray-500">Pengemudi</Label>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant={currentRecord.seatbeltDriverUsage ? "default" : "outline"}
                                                    className={cn("flex-1", currentRecord.seatbeltDriverUsage && "bg-green-600 hover:bg-green-700")}
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltDriverUsage: true }))}
                                                >
                                                    Ya
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={!currentRecord.seatbeltDriverUsage ? "destructive" : "outline"}
                                                    className="flex-1"
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltDriverUsage: false }))}
                                                >
                                                    Tidak
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-xs text-gray-500">Penumpang</Label>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant={currentRecord.seatbeltPassengerUsage ? "default" : "outline"}
                                                    className={cn("flex-1", currentRecord.seatbeltPassengerUsage && "bg-green-600 hover:bg-green-700")}
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltPassengerUsage: true }))}
                                                >
                                                    Ya
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={!currentRecord.seatbeltPassengerUsage ? "destructive" : "outline"}
                                                    className="flex-1"
                                                    onClick={() => setCurrentRecord(prev => ({ ...prev, seatbeltPassengerUsage: false }))}
                                                >
                                                    Tidak
                                                </Button>
                                            </div>
                                        </div>
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
                                    {draft.records.map((rec, idx) => {
                                        const hasIssue = !rec.seatbeltDriverCondition || !rec.seatbeltPassengerCondition || !rec.seatbeltDriverUsage || !rec.seatbeltPassengerUsage;
                                        return (
                                            <div key={idx} className={cn("p-3 rounded-lg border shadow-sm flex justify-between items-center", hasIssue ? "bg-red-50 border-red-100" : "bg-white border-gray-100")}>
                                                <div>
                                                    <p className="font-medium text-sm">{rec.nama} <span className="text-xs text-gray-400">({rec.perusahaan})</span></p>
                                                    <p className="text-xs text-gray-500">Unit: {rec.nomorLambung || "-"}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {hasIssue ?
                                                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">TEMUAN</span>
                                                        :
                                                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">OK</span>
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

                {/* STEP 3 */}
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
                                                <p className="text-xs text-gray-500">{obs.perusahaan} • {obs.jabatan}</p>
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
                                    <div className="grid grid-cols-2 gap-3">
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
                                            <Label className="text-xs font-semibold uppercase text-gray-500">Jabatan</Label>
                                            <Input
                                                value={currentObserver.jabatan}
                                                onChange={(e) => setCurrentObserver(prev => ({ ...prev, jabatan: e.target.value }))}
                                                className="bg-gray-50 border-gray-200"
                                                placeholder="Jabatan"
                                            />
                                        </div>
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
