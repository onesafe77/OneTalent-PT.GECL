import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import { Activity, Check, X, ArrowLeft, ArrowRight, Save, Camera, Users, Pen, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SidakObserverScanner } from "@/components/sidak/sidak-observer-scanner";
import { SidakEmployeeScanner } from "@/components/sidak/sidak-employee-scanner";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { PVTTestDialog } from "@/components/sidak/pvt-test-dialog";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { FatigueInterventionDialog } from "@/components/sidak/fatigue-intervention-dialog";
import type { Employee } from "@shared/schema";

interface EmployeeRecord {
  employeeId?: string;
  backendRecordId?: string; // ID from DB after save, used for PATCH updates
  nama: string;
  nik: string;
  jabatan: string;
  nomorLambung: string;
  jamTidur: number;
  konsumiObat: boolean | null;
  masalahPribadi: boolean | null;
  pemeriksaanRespon: boolean | null;
  pemeriksaanKonsentrasi: boolean | null;
  pemeriksaanKesehatan: boolean | null;
  karyawanSiapBekerja: boolean | null;
  fitUntukBekerja: boolean | null;
  istirahatDanMonitor: boolean | null;
  istirahatLebihdariSatuJam: boolean | null;
  tidakBolehBekerja: boolean | null;
  employeeSignature?: string; // Base64 encoded signature image
  buktiIntervensi?: string;
  catatanIntervensi?: string;
  pvtMeanRT?: number;
}

interface Observer {
  nama: string;
  nik: string;
  perusahaan: string;
  jabatan: string;
  signatureDataUrl: string;
}

interface FatigueDraftData {
  step: number;
  sessionId: string | null;
  headerData: {
    tanggal: string;
    shift: string;
    waktuMulai: string;
    waktuSelesai: string;
    lokasi: string;
    area: string;
    departemen: string;
  };
  employees: EmployeeRecord[];
  currentEmployee: EmployeeRecord;
  observers: Observer[];
  isLoadedFromQr: boolean;
}

const initialDraftData: FatigueDraftData = {
  step: 1,
  sessionId: null,
  headerData: {
    tanggal: new Date().toISOString().split('T')[0],
    shift: "Shift 1",
    waktuMulai: "",
    waktuSelesai: "",
    lokasi: "",
    area: "",
    departemen: ""
  },
  employees: [],
  currentEmployee: {
    nama: "",
    nik: "",
    jabatan: "",
    nomorLambung: "",
    jamTidur: 0,
    konsumiObat: null,
    masalahPribadi: null,
    pemeriksaanRespon: null,
    pemeriksaanKonsentrasi: null,
    pemeriksaanKesehatan: null,
    karyawanSiapBekerja: null,
    fitUntukBekerja: null,
    istirahatDanMonitor: null,
    istirahatLebihdariSatuJam: null,
    tidakBolehBekerja: null
  },
  observers: [],
  isLoadedFromQr: false
};

export default function SidakFatigueForm() {
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
  } = useSidakDraft<FatigueDraftData>({
    key: "fatigue",
    initialData: initialDraftData,
    debounceMs: 1500
  });

  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [headerData, setHeaderData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    shift: "Shift 1",
    waktuMulai: "",
    waktuSelesai: "",
    lokasi: "",
    area: "",
    departemen: ""
  });

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeRecord>({
    nama: "",
    nik: "",
    jabatan: "",
    nomorLambung: "",
    jamTidur: 0,
    konsumiObat: null,
    masalahPribadi: null,
    pemeriksaanRespon: null,
    pemeriksaanKonsentrasi: null,
    pemeriksaanKesehatan: null,
    karyawanSiapBekerja: null,
    fitUntukBekerja: null,
    istirahatDanMonitor: null,
    istirahatLebihdariSatuJam: null,
    tidakBolehBekerja: null
  });

  const [observers, setObservers] = useState<Observer[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showEmployeeScanner, setShowEmployeeScanner] = useState(false);
  const [showPVT, setShowPVT] = useState(false);
  const [isLoadedFromQr, setIsLoadedFromQr] = useState(false);

  // Manual observer input state
  const [manualObserver, setManualObserver] = useState({
    nama: "",
    perusahaan: "",
    signatureDataUrl: ""
  });

  // Intervention State
  const [showInterventionDialog, setShowInterventionDialog] = useState(false);
  const [interventionEmployeeId, setInterventionEmployeeId] = useState<string | null>(null);

  const handleOpenIntervention = (nik: string) => {
    setInterventionEmployeeId(nik);
    setShowInterventionDialog(true);
  };

  const handleInterventionComplete = (evidence: string, note: string) => {
    // 1. Temporarily save evidence/note
    // 2. Open PVT for re-test
    setShowInterventionDialog(false);

    // Set current employee context to the one being intervened
    const employeeToFix = employees.find(e => e.nik === interventionEmployeeId);
    if (employeeToFix) {
      setCurrentEmployee({
        ...employeeToFix,
        buktiIntervensi: evidence,
        catatanIntervensi: note
      });
      setShowPVT(true);
    }
  };

  // Override handlePVTComplete to handle re-test context
  const handlePVTComplete = async (result: { passed: boolean; meanRT: number; status: 'green' | 'yellow' | 'red' }) => {
    const isRetest = !!interventionEmployeeId;

    if (result.status === 'green' || result.status === 'yellow') {
      const updatedData = {
        pemeriksaanRespon: true,
        pemeriksaanKonsentrasi: true,
        karyawanSiapBekerja: true, // Now fit
        tidakBolehBekerja: false,
        fitUntukBekerja: true,
      };

      if (isRetest) {
        // Find the employee being retested and their backend record ID
        const employeeToUpdate = employees.find(e => e.nik === interventionEmployeeId);
        const backendId = employeeToUpdate?.backendRecordId;

        // Auto-PATCH the existing DB record with intervention data + updated fit status
        if (backendId) {
          try {
            const patchData = {
              ...updatedData,
              buktiIntervensi: currentEmployee.buktiIntervensi,
              catatanIntervensi: currentEmployee.catatanIntervensi,
              pvtMeanRT: result.meanRT,
            };
            console.log('[RETEST] Auto-patching record:', backendId, patchData);
            await apiRequest(`/api/sidak-fatigue/records/${backendId}`, "PATCH", patchData);

            // Update local employees state in-place (no remove + re-add)
            setEmployees(prev => prev.map(e =>
              e.nik === interventionEmployeeId
                ? { ...e, ...updatedData, buktiIntervensi: currentEmployee.buktiIntervensi, catatanIntervensi: currentEmployee.catatanIntervensi, pvtMeanRT: result.meanRT }
                : e
            ));

            toast({
              title: "Tes Ulang Lulus ✅",
              description: "Karyawan dinyatakan FIT. Data intervensi tersimpan otomatis.",
              className: "bg-green-50 border-green-200 text-green-800"
            });
          } catch (error) {
            console.error('[RETEST] Failed to auto-patch record:', error);
            toast({
              title: "Gagal Menyimpan",
              description: "Gagal menyimpan data intervensi. Silakan coba lagi.",
              variant: "destructive"
            });
          }
        } else {
          // Fallback: no backend ID, just update local state
          console.warn('[RETEST] No backendRecordId found, updating local state only');
          setEmployees(prev => prev.map(e =>
            e.nik === interventionEmployeeId
              ? { ...e, ...updatedData, buktiIntervensi: currentEmployee.buktiIntervensi, catatanIntervensi: currentEmployee.catatanIntervensi, pvtMeanRT: result.meanRT }
              : e
          ));

          toast({
            title: "Tes Ulang Lulus",
            description: "Karyawan dinyatakan FIT. Data disimpan secara lokal.",
            className: "bg-green-50 border-green-200 text-green-800"
          });
        }

        // Reset intervention state and currentEmployee form for next employee
        setInterventionEmployeeId(null);
        setCurrentEmployee({
          nama: "",
          nik: "",
          jabatan: "",
          nomorLambung: "",
          jamTidur: 0,
          konsumiObat: null,
          masalahPribadi: null,
          pemeriksaanRespon: null,
          pemeriksaanKonsentrasi: null,
          pemeriksaanKesehatan: null,
          karyawanSiapBekerja: null,
          fitUntukBekerja: null,
          istirahatDanMonitor: null,
          istirahatLebihdariSatuJam: null,
          tidakBolehBekerja: null,
        });
        setIsLoadedFromQr(false);
      } else {
        // Normal flow (first-time PVT, not a retest)
        setCurrentEmployee(prev => ({
          ...prev,
          ...updatedData,
          pvtMeanRT: result.meanRT
        }));

        if (result.status === 'yellow') {
          toast({
            title: "Fatigue Ringan Terdeteksi",
            description: "Respons agak lambat. Mohon review supervisor.",
            className: "bg-yellow-50 border-yellow-200 text-yellow-800"
          });
        } else {
          toast({
            title: "Tes Lulus",
            description: `Respons sangat baik (${result.meanRT} ms). Data otomatis diisi.`,
            className: "bg-green-50 border-green-200 text-green-800"
          });
        }
      }
    } else {
      // Red status
      const updatedData = {
        pemeriksaanRespon: false,
        pemeriksaanKonsentrasi: false,
        karyawanSiapBekerja: false,
        fitUntukBekerja: false,
        tidakBolehBekerja: true
      };

      setCurrentEmployee(prev => ({
        ...prev,
        ...updatedData,
        pvtMeanRT: result.meanRT
      }));

      toast({
        title: "Fatigue Berat Terdeteksi",
        description: isRetest ? "Tes Ulang Gagal. Karyawan tetap tidak boleh bekerja." : "Respons sangat lambat. Karyawan tidak disarankan bekerja.",
        variant: "destructive"
      });
    }
  };

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

  // Handle draft restoration
  const handleRestoreDraft = async () => {
    const restoredData = restoreDraft();
    if (restoredData) {
      const today = new Date().toISOString().split('T')[0];
      const isToday = restoredData.headerData.tanggal === today;

      if (!isToday && restoredData.sessionId) {
        toast({
          title: "Draft Kedaluwarsa",
          description: "Draft sesi dari hari sebelumnya ditemukan. Silakan mulai sesi baru untuk hari ini.",
          variant: "destructive",
        });
        ignoreDraft(); // Clear old draft
        return;
      }

      setHeaderData(restoredData.headerData);
      setEmployees(restoredData.employees);
      setCurrentEmployee(restoredData.currentEmployee);
      setObservers(restoredData.observers);
      setIsLoadedFromQr(restoredData.isLoadedFromQr);

      // If the draft was from before sessionId was saved, create a new session
      if (!restoredData.sessionId && restoredData.step > 1) {
        try {
          const response = await apiRequest("/api/sidak-fatigue", "POST", restoredData.headerData);
          setSessionId(response.id);
          setStep(restoredData.step);
          toast({
            title: "Draft Dipulihkan",
            description: "Data SIDAK sebelumnya berhasil dipulihkan dan sesi baru dibuat",
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
          description: "Data SIDAK sebelumnya berhasil dipulihkan",
        });
      }
    }
  };

  const handleEmployeeScanned = (employee: Employee) => {
    setCurrentEmployee({
      ...currentEmployee,
      employeeId: employee.id,
      nama: employee.name,
      nik: employee.id, // Employee ID is used as NIK
      jabatan: employee.position || "",
      nomorLambung: employee.nomorLambung || ""
    });

    setIsLoadedFromQr(true); // Lock fields after QR scan

    toast({
      title: "Data Dimuat",
      description: `Data karyawan ${employee.name} berhasil dimuat dari QR Code`,
    });
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(0);

  const startSupervisorRecording = async (sid: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });

      // Pick a supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const formData = new FormData();
        formData.append("file", blob, `supervisor-${sid}-${Date.now()}.webm`);
        try {
          await fetch(`/api/sidak-fatigue/${sid}/supervisor-recording`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });
        } catch (_) { /* silent fail — don't block main flow */ }
      };

      recorder.start();
      setIsRecording(true);
      let count = 5;
      setRecordingCountdown(count);
      const interval = setInterval(() => {
        count--;
        setRecordingCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          if (recorder.state !== "inactive") recorder.stop();
        }
      }, 1000);
    } catch (_) { /* Camera not available — silent fail */ }
  };

  // Record per-driver scan (silent, no countdown UI — runs in background)
  const startScanRecording = async (recordId: string, driverName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const formData = new FormData();
        formData.append("file", blob, `scan-${recordId}-${Date.now()}.webm`);
        try {
          await fetch(`/api/sidak-fatigue/records/${recordId}/scan-recording`, {
            method: "POST", body: formData, credentials: "include",
          });
        } catch (_) {}
      };
      recorder.start();
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, 5000);
    } catch (_) {}
  };

  const createSessionMutation = useMutation({
    mutationFn: async (data: typeof headerData) => {
      const response = await apiRequest("/api/sidak-fatigue", "POST", { ...data, waktu: data.waktuMulai });
      return response;
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      startSupervisorRecording(data.id);
      toast({
        title: "Sesi dibuat",
        description: "Sesi Sidak Fatigue berhasil dibuat",
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
      // Convert null to boolean before sending to API
      const employeeData = {
        ...employee,
        konsumiObat: employee.konsumiObat ?? false,
        masalahPribadi: employee.masalahPribadi ?? false,
        pemeriksaanRespon: employee.pemeriksaanRespon ?? false,
        pemeriksaanKonsentrasi: employee.pemeriksaanKonsentrasi ?? false,
        pemeriksaanKesehatan: employee.pemeriksaanKesehatan ?? false,
        karyawanSiapBekerja: employee.karyawanSiapBekerja ?? false,
        fitUntukBekerja: employee.fitUntukBekerja ?? false,
        istirahatDanMonitor: employee.istirahatDanMonitor ?? false,
        istirahatLebihdariSatuJam: employee.istirahatLebihdariSatuJam ?? false,
        tidakBolehBekerja: employee.tidakBolehBekerja ?? false,

        employeeSignature: employee.employeeSignature,
        buktiIntervensi: employee.buktiIntervensi,
        catatanIntervensi: employee.catatanIntervensi,
        pvtMeanRT: employee.pvtMeanRT
      };

      console.log('Sending employee data:', JSON.stringify(employeeData, null, 2));

      const response = await apiRequest(`/api/sidak-fatigue/${sessionId}/records`, "POST", employeeData);
      return response;
    },
    onSuccess: (data: any) => {
      // Store backend record ID so we can PATCH it later during retest
      const savedEmployee = { ...currentEmployee, backendRecordId: data?.id };
      // Record a short video for this specific driver scan
      if (data?.id) startScanRecording(data.id, savedEmployee.nama);
      setEmployees(prev => {
        const updatedEmployees = [...prev, savedEmployee];
        toast({
          title: "Karyawan ditambahkan",
          description: `Karyawan ${updatedEmployees.length}/10 berhasil disimpan`,
        });
        return updatedEmployees;
      });
      setCurrentEmployee({
        nama: "",
        nik: "",
        jabatan: "",
        nomorLambung: "",
        jamTidur: 0,
        konsumiObat: null,
        masalahPribadi: null,
        pemeriksaanRespon: null,
        pemeriksaanKonsentrasi: null,
        pemeriksaanKesehatan: null,
        karyawanSiapBekerja: null,
        fitUntukBekerja: null,
        istirahatDanMonitor: null,
        istirahatLebihdariSatuJam: null,
        tidakBolehBekerja: null,
        employeeSignature: undefined
      });
      setIsLoadedFromQr(false); // Reset lock for next employee
    },
    onError: (error: any) => {
      if (error.message?.includes('Maksimal 20')) {
        toast({
          title: "Batas maksimal tercapai",
          description: "Maksimal 20 karyawan untuk Sidak Fatigue",
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

  const handleStep1Submit = () => {
    if (!headerData.waktuMulai || !headerData.waktuSelesai || !headerData.lokasi) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi semua field yang wajib",
        variant: "destructive",
      });
      return;
    }
    createSessionMutation.mutate(headerData);
  };

  const handleSaveEmployee = () => {
    // Validate QR scan is required
    if (!isLoadedFromQr) {
      toast({
        title: "Scan QR Code Wajib",
        description: "Mohon scan QR karyawan terlebih dahulu untuk mengisi data Nama, NIK, dan Jabatan",
        variant: "destructive",
      });
      return;
    }

    if (!currentEmployee.nama || !currentEmployee.nik || !currentEmployee.jabatan) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi nama, NIK, dan jabatan karyawan",
        variant: "destructive",
      });
      return;
    }

    // Validate all boolean fields are explicitly set
    const booleanFields = [
      { key: 'konsumiObat', label: 'Ada konsumsi obat' },
      { key: 'masalahPribadi', label: 'Ada masalah pribadi' },
      { key: 'pemeriksaanRespon', label: 'Pemeriksaan respon' },
      { key: 'pemeriksaanKonsentrasi', label: 'Pemeriksaan konsentrasi' },
      { key: 'pemeriksaanKesehatan', label: 'Pemeriksaan kesehatan' },
      { key: 'karyawanSiapBekerja', label: 'Karyawan siap bekerja' },
      { key: 'fitUntukBekerja', label: 'Fit untuk bekerja' },
      { key: 'istirahatDanMonitor', label: 'Istirahat sebentar dan monitor' },
      { key: 'istirahatLebihdariSatuJam', label: 'Pekerja diistirahatkan >1jam' },
      { key: 'tidakBolehBekerja', label: 'Tidak diijinkan bekerja' }
    ];

    const unsetFields = booleanFields.filter(field => currentEmployee[field.key as keyof EmployeeRecord] === null);

    // Validasi khusus untuk field yang memerlukan Tes Reaksi
    const requiredPVTFields = ['pemeriksaanRespon', 'pemeriksaanKonsentrasi'];
    const missingPVT = unsetFields.filter(f => requiredPVTFields.includes(f.key));

    if (missingPVT.length > 0) {
      toast({
        title: "Wajib Tes Reaksi",
        description: "Mohon lakukan Tes Reaksi terlebih dahulu untuk mengisi data Respon dan Konsentrasi",
        variant: "destructive",
      });
      return;
    }

    if (unsetFields.length > 0) {
      toast({
        title: "Pemeriksaan belum lengkap",
        description: `Mohon pilih Ya/Tidak untuk: ${unsetFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    addEmployeeMutation.mutate(currentEmployee);
  };

  const handleFinishEmployees = () => {
    if (employees.length === 0) {
      toast({
        title: "Belum ada karyawan",
        description: "Tambahkan minimal 1 karyawan",
        variant: "destructive",
      });
      return;
    }

    const unfitEmployees = employees.filter(e => !e.karyawanSiapBekerja);
    if (unfitEmployees.length > 0) {
      toast({
        title: "Tindak Lanjut Diperlukan",
        description: `Ada ${unfitEmployees.length} karyawan dengan status Fatigue (Unfit). Harap lakukan intervensi dan tes ulang.`,
        variant: "destructive",
      });
      return;
    }

    setStep(3);
  };

  const addObserverMutation = useMutation({
    mutationFn: async (observer: Observer) => {
      if (!sessionId) throw new Error("Session ID not found");
      const response = await apiRequest(`/api/sidak-fatigue/${sessionId}/observers`, "POST", observer);
      return response;
    },
    onSuccess: (_data, variables) => {
      // Only update state after successful backend save
      setObservers(prev => [...prev, variables]);
      toast({
        title: "Observer ditambahkan",
        description: `Observer ${variables.nama} berhasil disimpan`,
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
    // Validate manual input
    if (!manualObserver.nama || !manualObserver.perusahaan) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi nama dan perusahaan observer",
        variant: "destructive",
      });
      return;
    }

    if (!manualObserver.signatureDataUrl) {
      toast({
        title: "Tanda tangan diperlukan",
        description: "Mohon tanda tangani terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // Create observer with manual input
    const newObserver: Observer = {
      nama: manualObserver.nama,
      nik: `OBS-${Date.now()}`, // Generate unique NIK for manual observer
      jabatan: "Observer",
      perusahaan: manualObserver.perusahaan,
      signatureDataUrl: manualObserver.signatureDataUrl
    };

    // Save to backend (state updated in onSuccess)
    addObserverMutation.mutate(newObserver);

    // Reset manual observer form
    setManualObserver({
      nama: "",
      perusahaan: "",
      signatureDataUrl: ""
    });
  };



  const maxEmployees = 20;
  const canAddMore = employees.length < maxEmployees;

  // Helper for bottom actions based on step
  const renderBottomAction = () => {
    if (step === 1) {
      return (
        <Button
          onClick={handleStep1Submit}
          className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
          disabled={createSessionMutation.isPending}
        >
          {createSessionMutation.isPending ? "Membuat Sesi..." : "Lanjut ke Karyawan"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      );
    }
    if (step === 2) {
      return (
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSaveEmployee}
            disabled={!canAddMore || addEmployeeMutation.isPending || !currentEmployee.employeeSignature}
            className="w-full h-12 text-lg font-medium shadow-md shadow-blue-200 dark:shadow-none"
          >
            <Save className="mr-2 h-5 w-5" />
            {addEmployeeMutation.isPending ? "Menyimpan..." : "Simpan & Input Lagi"}
          </Button>

          {employees.length > 0 && (
            <Button
              onClick={handleFinishEmployees}
              variant="outline"
              className="w-full h-12 border-2 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300"
            >
              Selesai Input Karyawan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      );
    }
    if (step === 3) {
      return (
        <Button
          onClick={() => setStep(4)}
          className="w-full h-12"
          disabled={observers.length === 0}
        >
          Lanjut ke Preview ({observers.length})
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      );
    }
    if (step === 4) {
      return (
        <Button
          onClick={() => {
            clearDraft();
            navigate("/workspace/sidak");
          }}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
        >
          Selesai & Kembali
          <Check className="ml-2 h-5 w-5" />
        </Button>
      )
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
        formType="fatigue"
      />

      <PVTTestDialog
        open={showPVT}
        onOpenChange={setShowPVT}
        onComplete={handlePVTComplete}
      />

      {interventionEmployeeId && (
        <FatigueInterventionDialog
          open={showInterventionDialog}
          onOpenChange={setShowInterventionDialog}
          employeeName={employees.find(e => e.nik === interventionEmployeeId)?.nama || "Karyawan"}
          onProcceedToRetest={handleInterventionComplete}
        />
      )}

      {/* Recording indicator — shown for 5s after session creation */}
      {isRecording && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg animate-in fade-in duration-300">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Merekam {recordingCountdown}s
        </div>
      )}

      <MobileSidakLayout
        title="Sidak Fatigue"
        subtitle="Form BIB-HSE-ES-F-3.02-16"
        step={step}
        totalSteps={4}
        onBack={() => navigate("/workspace/sidak")}
        bottomAction={renderBottomAction()}
      >
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">Informasi Header</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Pastikan data lokasi dan waktu sesuai dengan kondisi lapangan.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tanggal</Label>
                  <Input
                    type="date"
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    value={headerData.tanggal}
                    onChange={(e) => setHeaderData({ ...headerData, tanggal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Shift</Label>
                  <Select
                    value={headerData.shift}
                    onValueChange={(value) => setHeaderData({ ...headerData, shift: value })}
                  >
                    <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Shift 1">Shift 1</SelectItem>
                      <SelectItem value="Shift 2">Shift 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Mulai</Label>
                  <Input
                    type="time"
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    value={headerData.waktuMulai}
                    onChange={(e) => setHeaderData({ ...headerData, waktuMulai: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selesai</Label>
                  <Input
                    type="time"
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    value={headerData.waktuSelesai}
                    onChange={(e) => setHeaderData({ ...headerData, waktuSelesai: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Lokasi Sidak</Label>
                <Input
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  placeholder="Contoh: Workshop A"
                  value={headerData.lokasi}
                  onChange={(e) => setHeaderData({ ...headerData, lokasi: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Area (Opsional)</Label>
                <Input
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  placeholder="Area Produksi"
                  value={headerData.area}
                  onChange={(e) => setHeaderData({ ...headerData, area: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Departemen (Opsional)</Label>
                <Input
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  placeholder="Operasional"
                  value={headerData.departemen}
                  onChange={(e) => setHeaderData({ ...headerData, departemen: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Stats */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Karyawan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length} <span className="text-sm text-gray-400 font-normal">/ {maxEmployees}</span></p>
              </div>
              <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>

            {/* Main Input Card */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Data Karyawan</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowScanner(true)} className="text-blue-600">
                  Manual Input
                </Button>
              </div>

              <Button
                onClick={() => setShowEmployeeScanner(true)}
                className="w-full h-16 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 dark:shadow-none rounded-2xl flex items-center justify-between px-6"
              >
                <span className="flex flex-col items-start">
                  <span className="font-bold">Scan QR Code</span>
                  <span className="text-xs opacity-80 font-normal">Isi data otomatis</span>
                </span>
                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
              </Button>

              {/* Identity Section */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Identitas</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-gray-400 font-bold">Nama</Label>
                    <Input
                      value={currentEmployee.nama}
                      readOnly
                      className="bg-gray-50 border-0 font-medium"
                      placeholder="-"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-gray-400 font-bold">NIK</Label>
                    <Input
                      value={currentEmployee.nik}
                      readOnly
                      className="bg-gray-50 border-0 font-medium"
                      placeholder="-"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-400 font-bold">Jabatan</Label>
                  <Input
                    value={currentEmployee.jabatan}
                    readOnly
                    className="bg-gray-50 border-0 font-medium"
                    placeholder="-"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-400 font-bold">Nomor Lambung</Label>
                  <Input
                    value={currentEmployee.nomorLambung}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, nomorLambung: e.target.value })}
                    className="bg-white border-gray-200"
                    placeholder="Masukkan nomor lambung"
                  />
                </div>
              </div>

              {/* Employee List with Intervention Action */}
              {employees.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Daftar Karyawan ({employees.length})</h3>
                  {employees.map((emp, idx) => (
                    <div key={idx} className={cn(
                      "p-4 rounded-xl border flex items-center justify-between",
                      emp.karyawanSiapBekerja
                        ? "bg-white border-gray-100"
                        : "bg-red-50 border-red-200"
                    )}>
                      <div>
                        <p className="font-medium">{emp.nama}</p>
                        <p className="text-xs text-gray-500">{emp.nik} - {emp.jabatan}</p>
                        {!emp.karyawanSiapBekerja && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                            Unfit / Fatigue
                          </span>
                        )}
                      </div>

                      {!emp.karyawanSiapBekerja ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOpenIntervention(emp.nik)}
                          className="shadow-sm"
                        >
                          Tindak Lanjut
                        </Button>
                      ) : (
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sleep Hours - Big Input */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Jam Tidur</h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Dalam 24 jam</span>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full border-2"
                    onClick={() => setCurrentEmployee(prev => ({ ...prev, jamTidur: Math.max(0, (prev.jamTidur || 0) - 1) }))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    className="h-12 text-center text-3xl font-bold border-0 bg-transparent flex-1"
                    value={currentEmployee.jamTidur}
                    onChange={(e) => setCurrentEmployee({ ...currentEmployee, jamTidur: parseInt(e.target.value) || 0 })}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full border-2"
                    onClick={() => setCurrentEmployee(prev => ({ ...prev, jamTidur: (prev.jamTidur || 0) + 1 }))}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Checklist Questions */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white px-1">Pemeriksaan Kondisi</h3>

                {[
                  { key: 'konsumiObat', label: 'Mengkonsumsi Obat?', desc: 'Sedang dalam pengaruh obat' },
                  { key: 'masalahPribadi', label: 'Masalah Pribadi?', desc: 'Sedang ada beban pikiran' },
                  { key: 'pemeriksaanRespon', label: 'Respon Baik?', desc: 'Reaksi cepat dan tanggap' },
                  { key: 'pemeriksaanKonsentrasi', label: 'Konsentrasi Baik?', desc: 'Fokus saat diajak bicara' },
                  { key: 'pemeriksaanKesehatan', label: 'Kesehatan Baik?', desc: 'Tidak ada keluhan fisik' },
                  { key: 'karyawanSiapBekerja', label: 'Siap Bekerja?', desc: 'Mental dan fisik siap' },
                  { key: 'fitUntukBekerja', label: 'Fit to Work?', desc: 'Status kelayakan kerja' },
                  { key: 'istirahatDanMonitor', label: 'Istirahat & Monitor?', desc: 'Perlu istirahat sebentar dan dimonitor' },
                  { key: 'istirahatLebihdariSatuJam', label: 'Istirahat >1 Jam?', desc: 'Perlu diistirahatkan lebih dari 1 jam' },
                  { key: 'tidakBolehBekerja', label: 'Tidak Boleh Bekerja?', desc: 'Tidak diijinkan untuk bekerja' },
                ].map((field) => {
                  const value = currentEmployee[field.key as keyof EmployeeRecord] as boolean | null;
                  const isPVTField = field.key === 'pemeriksaanRespon' || field.key === 'pemeriksaanKonsentrasi';

                  return (
                    <div key={field.key} className={cn(
                      "bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all",
                      isPVTField && "bg-gray-50 dark:bg-gray-900/50"
                    )}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {field.label}
                            {isPVTField && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Auto</span>}
                          </p>
                          <p className="text-xs text-gray-500">{field.desc}</p>
                        </div>
                        {field.key === 'pemeriksaanRespon' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 ml-auto mr-2"
                            onClick={() => setShowPVT(true)}
                          >
                            <Activity className="w-3 h-3 mr-1" />
                            Tes Reaksi
                          </Button>
                        )}
                        {value !== null && (
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center",
                            value ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          )}>
                            {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 relative">
                        {isPVTField && (
                          <div className="absolute inset-0 z-10 bg-white/10 cursor-not-allowed" title="Wajib menggunakan Tes Reaksi" onClick={() => {
                            toast({
                              description: "Silakan gunakan tombol 'Tes Reaksi' di atas",
                              variant: "default"
                            });
                          }} />
                        )}
                        <button
                          disabled={isPVTField}
                          onClick={() => setCurrentEmployee({ ...currentEmployee, [field.key]: true })}
                          className={cn(
                            "py-3 rounded-lg font-medium text-sm transition-all border",
                            value === true
                              ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-200 dark:shadow-none"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                            isPVTField && "opacity-60"
                          )}
                        >
                          Ya
                        </button>
                        <button
                          disabled={isPVTField}
                          onClick={() => setCurrentEmployee({ ...currentEmployee, [field.key]: false })}
                          className={cn(
                            "py-3 rounded-lg font-medium text-sm transition-all border",
                            value === false
                              ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-200 dark:shadow-none"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                            isPVTField && "opacity-60"
                          )}
                        >
                          Tidak
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Signature */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">Tanda Tangan</h3>
                  {currentEmployee.employeeSignature ? (
                    <span className="text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 px-2 py-1 rounded">
                      <Check className="h-3 w-3" /> Tersimpan
                    </span>
                  ) : (
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Wajib</span>
                  )}
                </div>
                <SignaturePad
                  onSave={(signatureDataUrl) => {
                    setCurrentEmployee({
                      ...currentEmployee,
                      employeeSignature: signatureDataUrl
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Daftar Observer</h3>
                <p className="text-sm text-gray-500">Minimal 1 observer wajib diisi</p>
              </div>

              {/* Observer List */}
              {observers.length > 0 ? (
                <div className="grid gap-3">
                  {observers.map((obs, idx) => (
                    <div key={idx} className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{obs.nama}</p>
                        <p className="text-xs text-gray-500">{obs.perusahaan}</p>
                      </div>
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Belum ada observer</p>
                </div>
              )}

              {/* Add Observer Form */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <p className="font-semibold text-gray-900 dark:text-white">Tambah Observer Baru</p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Nama</Label>
                    <Input
                      value={manualObserver.nama}
                      onChange={(e) => setManualObserver({ ...manualObserver, nama: e.target.value })}
                      placeholder="Nama Observer"
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Perusahaan</Label>
                    <Input
                      value={manualObserver.perusahaan}
                      onChange={(e) => setManualObserver({ ...manualObserver, perusahaan: e.target.value })}
                      placeholder="Asal Perusahaan"
                      className="bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-gray-500">Tanda Tangan</Label>
                    <SignaturePad
                      onSave={(signatureDataUrl) => setManualObserver({ ...manualObserver, signatureDataUrl })}
                    />
                  </div>

                  <Button
                    onClick={handleAddManualObserver}
                    className="w-full h-12 mt-2"
                    disabled={!manualObserver.nama || !manualObserver.perusahaan || !manualObserver.signatureDataUrl || addObserverMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Tambah ke Daftar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-900 text-center space-y-2">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-300">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-green-800 dark:text-green-200">Data Siap Disimpan</h2>
              <p className="text-sm text-green-700 dark:text-green-300">
                {employees.length} karyawan dan {observers.length} observer berhasil didata.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Ringkasan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Lokasi</span>
                  <span className="font-medium text-gray-900 dark:text-white">{headerData.lokasi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Waktu</span>
                  <span className="font-medium text-gray-900 dark:text-white">{headerData.waktuMulai} - {headerData.waktuSelesai}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Observer</span>
                  <span className="font-medium text-gray-900 dark:text-white">{observers.length} orang</span>
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
