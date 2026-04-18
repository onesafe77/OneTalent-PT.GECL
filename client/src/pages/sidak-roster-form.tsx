import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardList, Check, X, ArrowLeft, ArrowRight, Save, Camera, Users, UserPlus } from "lucide-react";
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
import { SidakEmployeeScanner } from "@/components/sidak/sidak-employee-scanner";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import type { Employee } from "@shared/schema";

interface EmployeeRecord {
  employeeId?: string;
  nama: string;
  nik: string;
  nomorLambung: string;
  rosterSesuai: boolean | null;
  keterangan: string;
}

interface Observer {
  nama: string;
  nik: string;
  perusahaan: string;
  jabatan: string;
  signatureDataUrl: string;
}

interface RosterDraftData {
  step: number;
  sessionId: string | null;
  headerData: {
    tanggal: string;
    waktu: string;
    shift: string;
    perusahaan: string;
    departemen: string;
    lokasi: string;
  };
  employees: EmployeeRecord[];
  currentEmployee: EmployeeRecord;
  observers: Observer[];
  isLoadedFromQr: boolean;
}

const initialRosterDraftData: RosterDraftData = {
  step: 1,
  sessionId: null,
  headerData: {
    tanggal: new Date().toISOString().split('T')[0],
    waktu: "",
    shift: "Shift 1",
    perusahaan: "",
    departemen: "",
    lokasi: ""
  },
  employees: [],
  currentEmployee: {
    nama: "",
    nik: "",
    nomorLambung: "",
    rosterSesuai: null,
    keterangan: ""
  },
  observers: [],
  isLoadedFromQr: false
};

// Helper function to detect current shift based on system time
function getCurrentShift(): string {
  const now = new Date();
  const hour = now.getHours();

  // SHIFT 1: 06:00 - 18:00
  // SHIFT 2: 18:00 - 06:00
  if (hour >= 6 && hour < 18) {
    return "SHIFT 1";
  } else {
    return "SHIFT 2";
  }
}

export default function SidakRosterForm() {
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
  } = useSidakDraft<RosterDraftData>({
    key: "roster",
    initialData: initialRosterDraftData,
    debounceMs: 1500
  });

  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [headerData, setHeaderData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    waktu: "",
    shift: "Shift 1",
    perusahaan: "",
    departemen: "",
    lokasi: ""
  });

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeRecord>({
    nama: "",
    nik: "",
    nomorLambung: "",
    rosterSesuai: null,
    keterangan: ""
  });

  const [observers, setObservers] = useState<Observer[]>([]);
  const [showEmployeeScanner, setShowEmployeeScanner] = useState(false);
  const [isLoadedFromQr, setIsLoadedFromQr] = useState(false); // Track if data loaded from QR
  const [isLookingUpRoster, setIsLookingUpRoster] = useState(false); // Loading state for roster lookup
  const [rosterInfo, setRosterInfo] = useState<{ scheduledShift?: string; nomorLambung?: string; isScheduled: boolean } | null>(null);

  // Manual observer input state (replacing dropdown and QR scanner)
  const [manualObserver, setManualObserver] = useState({
    nama: "",
    nik: "",
    perusahaan: "",
    jabatan: "",
    signatureDataUrl: ""
  });

  // Auto-save effect - save current form state to draft
  useEffect(() => {
    saveDraft({
      step,
      sessionId,
      headerData,
      employees,
      currentEmployee,
      observers,
      isLoadedFromQr
    });
  }, [step, sessionId, headerData, employees, currentEmployee, observers, isLoadedFromQr, saveDraft]);

  // Initial time set
  useEffect(() => {
    if (!headerData.waktu && step === 1) {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setHeaderData(prev => ({
        ...prev,
        waktu: timeString
      }));
    }
  }, []);

  // Handle draft restoration
  const handleRestoreDraft = async () => {
    const restoredData = restoreDraft();
    if (restoredData) {
      setHeaderData(restoredData.headerData);
      setEmployees(restoredData.employees);
      setCurrentEmployee(restoredData.currentEmployee);
      setObservers(restoredData.observers);
      setIsLoadedFromQr(restoredData.isLoadedFromQr);

      // If the draft was from before sessionId was saved, create a new session
      if (!restoredData.sessionId && restoredData.step > 1) {
        try {
          const response = await apiRequest("/api/sidak-roster", "POST", restoredData.headerData);
          setSessionId(response.id);
          setStep(restoredData.step);
          toast({
            title: "Draft Dipulihkan",
            description: "Data SIDAK Roster sebelumnya berhasil dipulihkan dan sesi baru dibuat",
          });
        } catch (error: any) {
          toast({
            title: "Error",
            description: "Gagal membuat sesi baru. Silakan mulai dari awal.",
            variant: "destructive",
          });
          // Reset to step 1 if session creation fails
          setStep(1);
          return;
        }
      } else {
        setSessionId(restoredData.sessionId);
        setStep(restoredData.step);
        toast({
          title: "Draft Dipulihkan",
          description: "Data SIDAK Roster sebelumnya berhasil dipulihkan",
        });
      }
    }
  };

  const handleEmployeeScanned = async (employee: Employee) => {
    try {
      // Check for duplicate employee
      if (employees.some(emp => emp.employeeId === employee.id)) {
        toast({
          title: "Karyawan Duplikat",
          description: `${employee.name} sudah ditambahkan sebelumnya`,
          variant: "destructive",
        });
        return;
      }

      setIsLookingUpRoster(true);

      // Use the shift selected by supervisor in Step 1 (not system clock)
      const currentShift = headerData.shift;

      // Call roster lookup API — validates against Roster page data
      const rosterLookupUrl = `/api/roster-lookup/${employee.id}/${headerData.tanggal}?currentShift=${encodeURIComponent(currentShift)}`;
      const rosterResponse = await fetch(rosterLookupUrl);

      if (!rosterResponse.ok) {
        const errorData = await rosterResponse.json();
        throw new Error(errorData.message || 'Gagal mengambil data roster');
      }

      const rosterData = await rosterResponse.json();

      // Save roster reference info for display
      setRosterInfo({
        scheduledShift: rosterData.shift || rosterData.scheduledShift,
        nomorLambung: rosterData.nomorLambung,
        isScheduled: rosterData.isScheduled ?? false,
      });

      // Determine keterangan based on roster result
      let keterangan = rosterData.keterangan || "";
      if (rosterData.shiftMismatch) {
        keterangan = `Terjadwal di ${rosterData.scheduledShift} (sidak: ${currentShift})`;
      } else if (!rosterData.isScheduled) {
        keterangan = "Tidak Terjadwal di Roster";
      }

      // Auto-fill all fields — shift mismatch / not scheduled = TIDAK SESUAI, still recorded
      setCurrentEmployee({
        employeeId: employee.id,
        nama: employee.name,
        nik: employee.id,
        nomorLambung: rosterData.nomorLambung || (employee as any).nomorLambung || "",
        rosterSesuai: rosterData.rosterSesuai,
        keterangan,
      });

      setIsLoadedFromQr(true);
      setShowEmployeeScanner(false);

      if (rosterData.shiftMismatch) {
        toast({
          title: "Shift Tidak Sesuai",
          description: keterangan,
          variant: "destructive",
        });
      } else if (!rosterData.isScheduled) {
        toast({
          title: "Tidak Terjadwal",
          description: `${employee.name} tidak ada di roster tanggal ini`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Data Dimuat",
          description: `${employee.name} — Roster sesuai`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data karyawan",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpRoster(false);
    }
  };

  const createSessionMutation = useMutation({
    mutationFn: async (data: typeof headerData) => {
      const response = await apiRequest("/api/sidak-roster", "POST", data);
      return response;
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      toast({
        title: "Sesi dibuat",
        description: "Sesi Sidak Roster berhasil dibuat",
      });
      setStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat sesi",
        variant: "destructive",
      });
    }
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: EmployeeRecord) => {
      if (!sessionId) throw new Error("Session ID not found");
      const response = await apiRequest(`/api/sidak-roster/${sessionId}/records`, "POST", {
        ...employee,
        rosterSesuai: employee.rosterSesuai ?? false
      });
      return response;
    },
    onSuccess: (data) => {
      // Use API response (backend-normalized data) instead of request payload
      setEmployees(prev => [...prev, data]);
      setCurrentEmployee({
        nama: "",
        nik: "",
        nomorLambung: "",
        rosterSesuai: null,
        keterangan: ""
      });
      setIsLoadedFromQr(false);
      setRosterInfo(null);
      setShowEmployeeScanner(false);
      toast({
        title: "Karyawan ditambahkan",
        description: `Karyawan berhasil disimpan`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('Maksimal 15')) {
        toast({
          title: "Batas maksimal tercapai",
          description: "Maksimal 15 karyawan untuk Sidak Roster",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Gagal menambahkan karyawan",
          variant: "destructive",
        });
      }
    }
  });


  const addObserverMutation = useMutation({
    mutationFn: async (observer: Observer) => {
      if (!sessionId) throw new Error("Session ID not found");
      const response = await apiRequest(`/api/sidak-roster/${sessionId}/observers`, "POST", observer);
      return response;
    },
    onSuccess: (data) => {
      // Use API response (backend-normalized data) instead of request payload
      setObservers(prev => [...prev, data]);

      // Reset manual form after successful save
      setManualObserver({
        nama: "",
        nik: "",
        perusahaan: "",
        jabatan: "",
        signatureDataUrl: ""
      });

      toast({
        title: "Observer ditambahkan",
        description: `Observer berhasil disimpan`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal menyimpan observer",
        description: error.message || "Silakan coba lagi",
        variant: "destructive",
      });
    }
  });

  const handleAddManualObserver = () => {
    // Validate manual input fields
    if (!manualObserver.nama || !manualObserver.nik || !manualObserver.perusahaan || !manualObserver.jabatan) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field observer (Nama, NIK, Perusahaan, Jabatan)",
        variant: "destructive",
      });
      return;
    }

    // Validate signature
    if (!manualObserver.signatureDataUrl) {
      toast({
        title: "Tanda tangan diperlukan",
        description: "Mohon tambahkan tanda tangan observer",
        variant: "destructive",
      });
      return;
    }

    // Check duplicate observer by NIK
    if (observers.some(obs => obs.nik === manualObserver.nik)) {
      toast({
        title: "Observer sudah ditambahkan",
        description: `Observer dengan NIK ${manualObserver.nik} sudah ada dalam daftar`,
        variant: "destructive",
      });
      return;
    }

    // Create complete observer object
    const completeObserver: Observer = {
      nama: manualObserver.nama,
      nik: manualObserver.nik,
      perusahaan: manualObserver.perusahaan,
      jabatan: manualObserver.jabatan,
      signatureDataUrl: manualObserver.signatureDataUrl
    };

    // Save to backend (state updated in onSuccess, form reset in onSuccess)
    addObserverMutation.mutate(completeObserver);
  };


  const maxEmployees = 15;
  const canAddMore = employees.length < maxEmployees;

  const renderBottomAction = () => {
    if (step === 1) {
      return (
        <Button
          className="w-full h-12 text-lg font-medium shadow-md shadow-purple-200 dark:shadow-none bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!headerData.lokasi || !headerData.perusahaan || createSessionMutation.isPending}
          onClick={() => createSessionMutation.mutate(headerData)}
        >
          {createSessionMutation.isPending ? "Membuat Sesi..." : "Lanjut ke Pemeriksaan"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      );
    }
    if (step === 2) {
      return (
        <div className="flex flex-col gap-3">
          {!isLoadedFromQr ? (
            <Button
              onClick={() => setShowEmployeeScanner(true)}
              disabled={isLookingUpRoster}
              variant="outline"
              className="w-full h-12 text-lg font-medium border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <Camera className="mr-2 h-5 w-5" />
              {isLookingUpRoster ? "Memuat..." : "Scan QR Karyawan"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (!currentEmployee.nama || !currentEmployee.nik) {
                  toast({
                    title: "Data tidak lengkap",
                    description: "Data karyawan tidak valid",
                    variant: "destructive",
                  });
                  return;
                }
                addEmployeeMutation.mutate(currentEmployee);
              }}
              disabled={!canAddMore || addEmployeeMutation.isPending}
              className="w-full h-12 text-lg font-medium shadow-md shadow-purple-200 dark:shadow-none bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Save className="w-5 h-5 mr-2" />
              {addEmployeeMutation.isPending ? "Menyimpan..." : "Simpan & Lanjut"}
            </Button>
          )}

          {employees.length > 0 && (
            <Button
              onClick={() => {
                if (employees.length === 0) {
                  toast({
                    title: "Belum ada karyawan",
                    description: "Tambahkan minimal 1 karyawan",
                    variant: "destructive",
                  });
                  return;
                }
                setStep(3);
              }}
              variant="outline"
              className="w-full h-12 border-2 border-gray-200"
            >
              Lanjut ke Observer ({employees.length})
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      );
    }
    if (step === 3) {
      return (
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200 dark:shadow-none"
          onClick={() => {
            clearDraft();
            navigate("/workspace/sidak/roster/history");
          }}
          disabled={observers.length === 0}
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
        formType="roster"
      />

      <MobileSidakLayout
        title="Sidak Roster"
        subtitle="Pemeriksaan Kesesuaian Roster"
        step={step}
        totalSteps={3}
        onBack={() => navigate("/workspace/sidak")}
        bottomAction={renderBottomAction()}
      >
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Info Pelaksanaan</h3>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-300">
                Lengkapi data waktu dan lokasi pemeriksaan roster.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-gray-500">Tanggal</Label>
                  <Input
                    type="date"
                    className="h-12 bg-gray-50 border-gray-200"
                    value={headerData.tanggal}
                    onChange={(e) => setHeaderData(prev => ({ ...prev, tanggal: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-gray-500">Jam</Label>
                  <Input
                    type="time"
                    className="h-12 bg-gray-50 border-gray-200"
                    value={headerData.waktu}
                    onChange={(e) => setHeaderData(prev => ({ ...prev, waktu: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-gray-500">Shift</Label>
                <Select
                  value={headerData.shift}
                  onValueChange={(val) => setHeaderData(prev => ({ ...prev, shift: val }))}
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
                <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan</Label>
                <Input
                  className="h-12 bg-gray-50 border-gray-200"
                  value={headerData.perusahaan}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, perusahaan: e.target.value }))}
                  placeholder="PT..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-gray-500">Departemen</Label>
                <Input
                  className="h-12 bg-gray-50 border-gray-200"
                  value={headerData.departemen}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, departemen: e.target.value }))}
                  placeholder="Contoh: Produksi, Plant"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-gray-500">Lokasi</Label>
                <Input
                  className="h-12 bg-gray-50 border-gray-200"
                  placeholder="Contoh: Area Pit A"
                  value={headerData.lokasi}
                  onChange={(e) => setHeaderData(prev => ({ ...prev, lokasi: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Karyawan Diperiksa</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length} <span className="text-sm text-gray-400 font-normal">/ {maxEmployees}</span></p>
              </div>
              <div className="h-10 w-10 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
                <Users className="h-5 w-5" />
              </div>
            </div>

            {isLoadedFromQr ? (
              <div className="space-y-6">
                <div className="bg-green-50 text-green-800 p-4 rounded-xl text-center text-sm font-medium border border-green-100">
                  Data dimuat dari QR Code <br /> Hanya Nomor Lambung yang dapat diedit
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Nama</Label>
                    <div className="h-12 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md font-medium text-gray-700">
                      {currentEmployee.nama}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-gray-500">NIK</Label>
                    <div className="h-12 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md font-medium text-gray-700">
                      {currentEmployee.nik}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Nomor Lambung</Label>
                    <Input
                      className="h-12 bg-white border-purple-300 focus:border-purple-500"
                      value={currentEmployee.nomorLambung}
                      onChange={(e) => setCurrentEmployee(prev => ({ ...prev, nomorLambung: e.target.value }))}
                      placeholder="Input No. Lambung"
                    />
                  </div>

                  <Separator />

                  {/* Roster reference info from Roster page */}
                  {rosterInfo && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                      <p className="text-xs font-semibold uppercase text-blue-500 mb-1">Data dari Roster</p>
                      <div className="flex justify-between text-blue-700">
                        <span>Jadwal Shift</span>
                        <span className="font-semibold">{rosterInfo.scheduledShift || (rosterInfo.isScheduled ? headerData.shift : "Tidak Ada")}</span>
                      </div>
                      {rosterInfo.nomorLambung && (
                        <div className="flex justify-between text-blue-700">
                          <span>Unit (Roster)</span>
                          <span className="font-semibold">{rosterInfo.nomorLambung}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-blue-700">
                        <span>Status</span>
                        <span className="font-semibold">{rosterInfo.isScheduled ? "Terjadwal" : "Tidak Terjadwal"}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Status Roster</Label>
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-xl border-2",
                      currentEmployee.rosterSesuai
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    )}>
                      <span className="font-bold text-lg">{currentEmployee.rosterSesuai ? "SESUAI" : "TIDAK SESUAI"}</span>
                      {currentEmployee.rosterSesuai ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Keterangan</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 min-h-[60px]">
                      {currentEmployee.keterangan || "-"}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setIsLoadedFromQr(false);
                      setRosterInfo(null);
                      setCurrentEmployee({
                        nama: "",
                        nik: "",
                        nomorLambung: "",
                        rosterSesuai: null,
                        keterangan: ""
                      });
                    }}
                  >
                    Batal / Scan Ulang
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-center space-y-4 opacity-50">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                  <Users className="h-8 w-8" />
                </div>
                <p className="text-gray-500">Belum ada data.<br />Tekan tombol Scan diatas untuk memulai.</p>
              </div>
            )}

            {/* Recent List */}
            {employees.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Tercatat ({employees.length})</h3>
                <div className="space-y-2">
                  {employees.map((emp, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{emp.nama}</p>
                        <p className="text-xs text-gray-500">Unit: {emp.nomorLambung || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {emp.rosterSesuai ?
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">SESUAI</span>
                          :
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">TIDAK</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Data Pengawas</h3>
                <p className="text-sm text-gray-500">Minimal 1 observer wajib diisi</p>
              </div>

              {/* Observer List */}
              {observers.length > 0 && (
                <div className="grid gap-3">
                  {observers.map((obs, idx) => (
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
                      value={manualObserver.nama}
                      onChange={(e) => setManualObserver(prev => ({ ...prev, nama: e.target.value }))}
                      className="bg-gray-50 border-gray-200"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-gray-500">NIK</Label>
                    <Input
                      value={manualObserver.nik}
                      onChange={(e) => setManualObserver(prev => ({ ...prev, nik: e.target.value }))}
                      className="bg-gray-50 border-gray-200"
                      placeholder="NIK"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan</Label>
                      <Input
                        value={manualObserver.perusahaan}
                        onChange={(e) => setManualObserver(prev => ({ ...prev, perusahaan: e.target.value }))}
                        className="bg-gray-50 border-gray-200"
                        placeholder="PT..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold uppercase text-gray-500">Jabatan</Label>
                      <Input
                        value={manualObserver.jabatan}
                        onChange={(e) => setManualObserver(prev => ({ ...prev, jabatan: e.target.value }))}
                        className="bg-gray-50 border-gray-200"
                        placeholder="Jabatan"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Tanda Tangan</Label>
                    <SignaturePad
                      onSave={(dataUrl) => setManualObserver(prev => ({ ...prev, signatureDataUrl: dataUrl }))}
                    />
                  </div>
                  <Button
                    onClick={handleAddManualObserver}
                    disabled={!manualObserver.nama || !manualObserver.signatureDataUrl || addObserverMutation.isPending}
                    className="w-full mt-2"
                  >
                    <UserPlus className="w-4 h-4 mr-2" /> Tambahkan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Scanner for Step 2 - Karyawan data input */}
        {showEmployeeScanner && (
          <SidakEmployeeScanner
            isOpen={showEmployeeScanner}
            onClose={() => setShowEmployeeScanner(false)}
            onEmployeeScanned={handleEmployeeScanned}
          />
        )}
      </MobileSidakLayout>
    </>
  );
}
