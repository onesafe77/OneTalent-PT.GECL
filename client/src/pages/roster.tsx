import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRosterSchema } from "@shared/schema";
import type { Employee, RosterSchedule, AttendanceRecord, InsertRosterSchedule } from "@shared/schema";

// Row hasil parse Excel upload — mengizinkan field extra `nomorLambung` yang
// dipakai backend (/api/roster/bulk) untuk meng-update employees.nomorLambung.
type RosterUploadRow = InsertRosterSchedule & { nomorLambung?: string; department?: string };

import { Plus, Upload, Download, Filter, Calendar, CheckCircle, Clock, Users, Edit, Trash2, AlertCircle, Save, X, CalendarDays, List, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveAs } from 'file-saver';
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { RosterMatrixView } from "@/components/RosterMatrixView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, FileSpreadsheet, ChevronDown, CalendarCheck, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const formSchema = insertRosterSchema;

export default function Roster() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState<RosterSchedule | null>(null);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  // Departemen: filter tampilan (all/Driver/HSE) + mode upload (null=Driver, "HSE"=Dept HSE)
  const [deptFilter, setDeptFilter] = useState("all");
  const [uploadDept, setUploadDept] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchNIK, setSearchNIK] = useState("");
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  // Update Schedule Dialog States
  const [isUpdateScheduleDialogOpen, setIsUpdateScheduleDialogOpen] = useState(false);
  const [nikForUpdate, setNikForUpdate] = useState<string>("");
  const [selectedMonthForUpdate, setSelectedMonthForUpdate] = useState<string>("");
  const [updateScheduleFile, setUpdateScheduleFile] = useState<File | null>(null);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);

  // Fetch employee by NIK
  const { data: employeeForUpdate, isLoading: isLoadingEmployee, error: employeeError } = useQuery<Employee>({
    queryKey: [`/api/employees/${nikForUpdate}`],
    enabled: nikForUpdate.length > 0,
  });
  // Nomor lambung editing states
  const [editingNomorLambung, setEditingNomorLambung] = useState<{ [key: string]: boolean }>({});
  const [tempNomorLambung, setTempNomorLambung] = useState<{ [key: string]: string }>({});
  // Monthly calendar states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<'matrix' | 'calendar' | 'list'>('matrix');
  const { toast } = useToast();

  const { data: employeesResponse } = useQuery<any>({
    queryKey: ["/api/employees"],
  });
  const employees = Array.isArray(employeesResponse) ? employeesResponse : (Array.isArray(employeesResponse?.data) ? employeesResponse.data : []);

  const { data: rosterSchedules = [], isLoading: isLoadingRoster } = useQuery<any[]>({
    queryKey: ["/api/roster", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/roster?date=${selectedDate}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch roster');
      const data = await response.json();
      console.log(`🔄 Fetched ${data.length} roster entries for ${selectedDate}`);
      if (data.length > 0) {
        console.log('📋 Sample roster data:', data.slice(0, 3).map((r: any) => ({
          name: r.employee?.name || 'N/A',
          hariKerja: r.hariKerja,
          shift: r.shift
        })));
      }
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refresh when window focused
  });

  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/attendance?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
  });

  // Fetch induction schedules for enrichment
  const { data: inductionSchedules = [] } = useQuery<any[]>({
    queryKey: ["/api/induction/schedules", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/induction/schedules?date=${selectedDate}`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Create a map for quick induction status lookup
  const inductionStatusMap = new Map<string, string>();
  inductionSchedules.forEach((schedule: any) => {
    inductionStatusMap.set(schedule.employeeId, schedule.status);
  });

  // Monthly roster query untuk kalender bulanan
  const { data: monthlyRoster = [], isLoading: isLoadingMonthly } = useQuery<any[]>({
    queryKey: ["/api/roster/monthly", selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/roster/monthly?year=${selectedYear}&month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch monthly roster');
      const data = await response.json();
      console.log(`📅 Fetched ${data.length} roster entries for ${selectedYear}-${selectedMonth}`);
      return data;
    },
    enabled: viewMode === 'calendar' || viewMode === 'matrix', // Only fetch when calendar or matrix view is active
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      date: selectedDate,
      shift: "",
      startTime: "",
      endTime: "",
      jamTidur: "",
      fitToWork: "Fit To Work",
      status: "scheduled",
    },
  });

  // Auto save hook for roster form
  const { saveStatus, clearDraft, hasDraft } = useAutoSave({
    key: 'roster_new',
    form,
    exclude: [], // Save all fields for roster
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      date: selectedDate,
      shift: "",
      startTime: "",
      endTime: "",
      jamTidur: "",
      fitToWork: "Fit To Work",
      status: "scheduled",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertRosterSchedule) => apiRequest("/api/roster", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      // Invalidate QR validation cache untuk memastikan scan result menggunakan data roster terbaru
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });
      // Invalidate attendance cache karena roster berubah bisa mempengaruhi validasi shift
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });

      setIsDialogOpen(false);
      form.reset();
      clearDraft(); // Clear auto saved draft after successful save
      toast({
        title: "Berhasil",
        description: "Roster berhasil ditambahkan - QR scan akan menggunakan data terbaru",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal menambahkan roster",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertRosterSchedule> }) =>
      apiRequest(`/api/roster/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      // Invalidate QR validation cache untuk memastikan scan result menggunakan data roster terbaru
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });
      // Invalidate attendance cache karena roster berubah bisa mempengaruhi validasi shift
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });

      setIsEditDialogOpen(false);
      setEditingRoster(null);
      toast({
        title: "Berhasil",
        description: "Roster berhasil diupdate - QR scan akan menggunakan data terbaru",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal mengupdate roster",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/roster/${id}`, "DELETE", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      // Invalidate QR validation cache untuk memastikan scan result menggunakan data roster terbaru
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });
      // Invalidate attendance cache karena roster berubah bisa mempengaruhi validasi shift
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });

      toast({
        title: "Berhasil",
        description: "Roster berhasil dihapus - QR scan akan menggunakan data terbaru",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal menghapus roster",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => apiRequest("/api/roster/delete-all", "DELETE", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsDeleteAllDialogOpen(false);
      toast({
        title: "Berhasil",
        description: "Semua data roster berhasil dihapus",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal menghapus semua data roster",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (data: RosterUploadRow[]) => apiRequest("/api/roster/bulk", "POST", { rosters: data }),
    onSuccess: () => {
      // Force invalidate all roster related queries
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      queryClient.refetchQueries({ queryKey: ["/api/roster"] }); // Force refetch
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

      // Clear any cached roster data
      queryClient.removeQueries({ queryKey: ["/api/roster"] });

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setIsProcessing(false);
      setProcessedCount(0);
      setTotalCount(0);
      toast({
        title: "Berhasil",
        description: `${totalCount} roster berhasil diupload dari Excel dengan nomor lambung terbaru`,
      });
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Gagal upload roster';
      const errorDetails = error.response?.data?.errors || [];

      setIsProcessing(false);
      setUploadProgress(0);
      toast({
        title: "Error",
        description: errorDetails.length > 0 ? errorDetails.join(', ') : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation untuk update schedule karyawan per bulan
  const updateScheduleMutation = useMutation({
    mutationFn: (data: { employeeId: string; month: string; rosters: InsertRosterSchedule[] }) =>
      apiRequest("/api/roster/update-employee-schedule", "POST", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      queryClient.refetchQueries({ queryKey: ["/api/roster"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

      setIsUpdateScheduleDialogOpen(false);
      setNikForUpdate("");
      setSelectedMonthForUpdate("");
      setUpdateScheduleFile(null);
      setIsProcessingUpdate(false);

      toast({
        title: "Berhasil",
        description: response.message || `Jadwal karyawan berhasil diupdate`,
      });
    },
    onError: (error: any) => {
      console.error('Update schedule error:', error);
      const errorMessage = error.message || 'Gagal update jadwal karyawan';
      setIsProcessingUpdate(false);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation untuk update nomor lambung employee
  const updateNomorLambungMutation = useMutation({
    mutationFn: ({ employeeId, nomorLambung }: { employeeId: string; nomorLambung: string }) =>
      apiRequest(`/api/employees/${employeeId}`, "PUT", { nomorLambung }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qr/validate"] });

      // Reset editing state
      setEditingNomorLambung(prev => ({ ...prev, [variables.employeeId]: false }));
      setTempNomorLambung(prev => ({ ...prev, [variables.employeeId]: "" }));

      toast({
        title: "Berhasil",
        description: `Nomor lambung berhasil diupdate ke: ${variables.nomorLambung}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal mengupdate nomor lambung",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({
      ...values,
      date: selectedDate, // Always use the selected date from date picker
    });
  };

  const onEditSubmit = (values: z.infer<typeof formSchema>) => {
    if (!editingRoster) return;
    updateMutation.mutate({
      id: editingRoster.id,
      data: { ...values, date: selectedDate } // Always use the selected date from date picker
    });
  };

  const handleEdit = (roster: RosterSchedule) => {
    setEditingRoster(roster);
    editForm.reset({
      employeeId: roster.employeeId,
      date: roster.date,
      shift: roster.shift,
      startTime: roster.startTime,
      endTime: roster.endTime,
      jamTidur: roster.jamTidur || "",
      fitToWork: roster.fitToWork || "Fit To Work",
      hariKerja: roster.hariKerja || "",
      status: roster.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (rosterId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus roster ini?")) {
      deleteMutation.mutate(rosterId);
    }
  };

  // Handler functions untuk nomor lambung editing
  const handleEditNomorLambung = (employeeId: string, currentValue: string) => {
    setEditingNomorLambung(prev => ({ ...prev, [employeeId]: true }));
    setTempNomorLambung(prev => ({ ...prev, [employeeId]: currentValue }));
  };

  const handleSaveNomorLambung = (employeeId: string) => {
    const newValue = tempNomorLambung[employeeId];
    if (!newValue || newValue.trim() === '') {
      toast({
        title: "Error",
        description: "Nomor lambung tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    updateNomorLambungMutation.mutate({ employeeId, nomorLambung: newValue.trim() });
  };

  const handleCancelEditNomorLambung = (employeeId: string) => {
    setEditingNomorLambung(prev => ({ ...prev, [employeeId]: false }));
    setTempNomorLambung(prev => ({ ...prev, [employeeId]: "" }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processExcelFile = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Pilih file Excel terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setProcessedCount(0);

    try {
      setUploadProgress(10);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);

      const sheetName = workbook.SheetNames.includes('Template Roster')
        ? 'Template Roster'
        : workbook.SheetNames[0];

      console.log('📋 Reading from sheet (Matrix format):', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      console.log(`Excel file loaded with ${jsonData.length} rows`);
      setUploadProgress(20);
      setTotalCount(jsonData.length);

      const rosterData: RosterUploadRow[] = [];
      const chunkSize = 100; // Smaller chunk for matrix since each row has 31 entries

      // Use selected month/year as the target if no month is provided in the upload
      const monthStr = String(selectedMonth).padStart(2, '0');
      const yearStr = String(selectedYear);

      for (let i = 0; i < jsonData.length; i += chunkSize) {
        const chunk = jsonData.slice(i, i + chunkSize);

        const processedChunk: RosterUploadRow[] = [];

        chunk.forEach((row: any) => {
          // Identify if this is a header or instruction row by checking if NIK exists
          const nik = row.NIK || row.nik || row['Employee ID'] || row.employeeId || '';
          if (!nik || typeof nik !== 'string' || nik.includes('INSTRUKSI') || nik.includes('Format')) {
            return;
          }

          const employeeName = row['NAMA DRIVER'] || row['NAMA STAFF'] || row['NAMA'] || row.Nama || row.nama || row.Name || row.name || '';
          const nomorLambung = row.DRIVER || row['Nomor Lambung'] || row.nomorLambung || row.nomor_lambung || '';

          // Iterate through keys 1 to 31 (could be "01", "1", "02", "2", etc.)
          Object.keys(row).forEach((key) => {
            const dayNum = parseInt(key, 10);
            if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
              const cellValue = String(row[key] || '').trim().replace(/\s+/g, '').toUpperCase();

              if (cellValue && cellValue !== '-') {
                // Parse Matrix format: e.g. "DS21" -> Shift "DS", Hari Kerja "21"
                // Regex: letters followed by numbers
                const match = cellValue.match(/^([A-Z]+)(\d*)$/);

                if (match) {
                  const shiftCode = match[1];
                  const hariKerjaNum = match[2];

                  let normalizedShift = '';
                  let defaultStartTime = '06:00';
                  let defaultEndTime = '16:00';

                  if (['DS', 'D', 'S1'].includes(shiftCode)) {
                    normalizedShift = 'SHIFT 1';
                  } else if (['NS', 'N', 'S2'].includes(shiftCode)) {
                    normalizedShift = 'SHIFT 2';
                    defaultStartTime = '18:00';
                    defaultEndTime = '06:00';
                  } else if (['OFF', 'OS', 'OVER'].includes(shiftCode)) {
                    normalizedShift = 'OVER SHIFT';
                    defaultStartTime = '06:00';
                    defaultEndTime = '18:00';
                  } else if (['CTO', 'CT', 'CUTI'].includes(shiftCode)) {
                    normalizedShift = 'CUTI';
                    defaultStartTime = '00:00';
                    defaultEndTime = '00:00';
                  } else {
                    // Fallback to shift code as is if not standard
                    normalizedShift = shiftCode;
                  }

                  const rosterDate = `${yearStr}-${monthStr}-${String(dayNum).padStart(2, '0')}`;

                  processedChunk.push({
                    employeeId: nik,
                    date: rosterDate,
                    shift: normalizedShift,
                    startTime: defaultStartTime,
                    endTime: defaultEndTime,
                    jamTidur: '',
                    fitToWork: 'Fit To Work',
                    hariKerja: hariKerjaNum,
                    // Kirim nomor lambung (kolom "DRIVER" di Excel) — backend
                    // /api/roster/bulk akan meng-update employees.nomorLambung
                    // & bulkCreateRosterSchedules auto-isi plannedNomorLambung.
                    nomorLambung: nomorLambung || undefined,
                    plannedNomorLambung: nomorLambung || null,
                    // Tandai departemen (mis. "HSE") bila upload via "Upload Roster HSE".
                    department: uploadDept || undefined,
                    status: 'scheduled'
                  });
                }
              }
            }
          });
        });

        rosterData.push(...processedChunk);

        const processProgress = 20 + (60 * (i + chunkSize)) / jsonData.length;
        setUploadProgress(Math.min(processProgress, 80));
        setProcessedCount(i + chunkSize);

        if ((i + chunkSize) % 500 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      console.log(`Processed ${rosterData.length} valid entries out of ${jsonData.length} matrix rows`);
      setUploadProgress(80);

      if (rosterData.length === 0) {
        setIsProcessing(false);
        toast({
          title: "Error",
          description: "Tidak ada jadwal (shift) ditemukan dalam file. Pastikan format matriks terisi dengan kode shift yang benar.",
          variant: "destructive",
        });
        return;
      }

      // Phase 3: Upload to server
      setUploadProgress(90);
      uploadMutation.mutate(rosterData);
      setUploadProgress(100);

    } catch (error) {
      console.error('Excel processing error:', error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Format file Excel tidak valid saat memproses matriks.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    // Generate dates from 1 to 31
    const dayKeys: { [key: string]: string } = {};
    for (let i = 1; i <= 31; i++) {
      dayKeys[String(i).padStart(2, '0')] = (i === 1 || i === 2) ? "DS" + i : (i === 3) ? "NS" + i : (i === 4) ? "OFF" + i : (i === 5) ? "CTO" : "";
    }

    const templateData = [
      {
        "NO": 1,
        "NAMA DRIVER": "SUDIRO",
        "NIK": "C-028937",
        "DRIVER": "GECL 9005",
        "MITRA": "MELFIDA",
        ...dayKeys
      }
    ];

    // Empty template rows map
    const emptyKeys: { [key: string]: string } = {};
    for (let i = 1; i <= 31; i++) emptyKeys[String(i).padStart(2, '0')] = "";

    const instructionData = [
      {},
      { "NO": "INSTRUKSI PENGISIAN FORMAT MATRIKS:", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
      { "NO": "1. Isi kode shift dan hari kerja digabung pada sel tanggal.", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
      { "NO": "2. DS = Shift 1 (contoh: DS1, DS21)", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
      { "NO": "3. NS = Shift 2 (contoh: NS3, NS24)", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
      { "NO": "4. OFF = Over Shift (contoh: OFF1)", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
      { "NO": "5. CTO = Cuti (contoh: CTO)", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
      { "NO": "6. Kosongkan sel jika tidak ada jadwal pada tanggal tersebut.", "NAMA DRIVER": "", "NIK": "", "DRIVER": "", "MITRA": "", ...emptyKeys },
    ];

    const allData = [...templateData, ...instructionData];

    // Explicitly define headers to prevent JS object keys reordering
    const headers = ["NO", "NAMA DRIVER", "NIK", "DRIVER", "MITRA"];
    for (let i = 1; i <= 31; i++) {
      headers.push(String(i).padStart(2, '0'));
    }

    const worksheet = XLSX.utils.json_to_sheet(allData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Roster');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `template-roster-matrix-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`);
  };

  // Template khusus Dept HSE: tanpa Nomor Lambung & Mitra (staf, bukan driver).
  const downloadTemplateHSE = () => {
    const dayKeys: { [key: string]: string } = {};
    for (let i = 1; i <= 31; i++) {
      dayKeys[String(i).padStart(2, '0')] = (i === 1 || i === 2) ? "DS" + i : (i === 3) ? "NS" + i : (i === 4) ? "OFF" + i : (i === 5) ? "CTO" : "";
    }
    const emptyKeys: { [key: string]: string } = {};
    for (let i = 1; i <= 31; i++) emptyKeys[String(i).padStart(2, '0')] = "";

    const allData = [
      { "NO": 1, "NAMA STAFF": "BAGUS ANDYKA F", "NIK": "C-075768", ...dayKeys },
      {},
      { "NO": "INSTRUKSI PENGISIAN ROSTER DEPT HSE:", "NAMA STAFF": "", "NIK": "", ...emptyKeys },
      { "NO": "1. Isi kode shift + hari kerja pada sel tanggal (mis. DS1, NS3).", "NAMA STAFF": "", "NIK": "", ...emptyKeys },
      { "NO": "2. DS = Shift 1 · NS = Shift 2 · OFF = Over Shift · CTO = Cuti.", "NAMA STAFF": "", "NIK": "", ...emptyKeys },
      { "NO": "3. Kosongkan sel bila tidak ada jadwal.", "NAMA STAFF": "", "NIK": "", ...emptyKeys },
    ];
    const headers = ["NO", "NAMA STAFF", "NIK"];
    for (let i = 1; i <= 31; i++) headers.push(String(i).padStart(2, '0'));

    const worksheet = XLSX.utils.json_to_sheet(allData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Roster');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `template-roster-HSE-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`);
  };

  const getEmployeeName = (employeeId: string) => {
    return (Array.isArray(employees) ? employees : []).find(emp => emp.id === employeeId)?.name || 'Unknown';
  };

  const filteredRosterSchedules = rosterSchedules.filter(roster => {
    // Filter by shift
    const shiftMatch = shiftFilter === "all" || roster.shift === shiftFilter;

    // Filter by NIK (employee ID)
    const nikMatch = !searchNIK || roster.employeeId.toLowerCase().includes(searchNIK.toLowerCase());

    // Filter by employee name
    const employee = roster.employee || (Array.isArray(employees) ? employees : []).find(emp => emp.id === roster.employeeId);
    const nameMatch = !searchName || (employee?.name || '').toLowerCase().includes(searchName.toLowerCase());

    // Filter Departemen (HSE vs Driver)
    const isHSE = ((employee as any)?.department || '').toUpperCase() === 'HSE';
    const deptMatch = deptFilter === 'all' || (deptFilter === 'HSE' ? isHSE : !isHSE);

    // Filter by attendance status
    const hasAttended = attendance.some(att => att.employeeId === roster.employeeId);
    let attendanceMatch = true;
    if (attendanceFilter === "hadir") {
      attendanceMatch = hasAttended;
    } else if (attendanceFilter === "belum_hadir") {
      attendanceMatch = !hasAttended;
    }
    // If attendanceFilter === "all", attendanceMatch remains true

    return shiftMatch && nikMatch && nameMatch && attendanceMatch && deptMatch;
  });

  const rosterWithAttendance = filteredRosterSchedules.map(roster => ({
    ...roster,
    employee: roster.employee || (Array.isArray(employees) ? employees : []).find(emp => emp.id === roster.employeeId), // Use API employee data first
    attendance: {
      status: roster.hasAttended ? 'present' : 'absent',
      time: roster.attendanceTime
    },
    inductionStatus: inductionStatusMap.get(roster.employeeId) || null // Add induction status
  }));

  // Calculate statistics based on filtered data (by date and shift)
  const filteredAttendance = attendance.filter(att => {
    // Match with filtered roster schedules
    const matchingRoster = filteredRosterSchedules.find(roster => roster.employeeId === att.employeeId);
    return !!matchingRoster;
  });

  const cutiCount = filteredRosterSchedules.filter(roster => roster.shift === 'CUTI').length;

  const stats = {
    scheduled: filteredRosterSchedules.length,
    present: filteredAttendance.length,
    absent: filteredRosterSchedules.length - filteredAttendance.length - cutiCount,
    onLeave: cutiCount
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <Link href="/workspace/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Roster Kerja</CardTitle>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'calendar' | 'matrix')} className="w-full sm:w-auto">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
              <TabsTrigger value="matrix" data-testid="tab-matrix-view" className="text-xs sm:text-sm">
                <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Matrix Excel
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar-view" className="text-xs sm:text-sm">
                <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Kalender
              </TabsTrigger>
              <TabsTrigger value="list" data-testid="tab-list-view" className="text-xs sm:text-sm">
                <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters - berbeda untuk List dan Calendar */}
        {viewMode === 'list' ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-40"
              data-testid="roster-date-input"
            />

            {/* Search by NIK */}
            <Input
              type="text"
              placeholder="Cari NIK..."
              value={searchNIK}
              onChange={(e) => setSearchNIK(e.target.value)}
              className="w-full sm:w-32"
              data-testid="search-nik-input"
            />

            {/* Search by Name */}
            <Input
              type="text"
              placeholder="Cari Nama..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full sm:w-40"
              data-testid="search-name-input"
            />

            {/* Shift Filter */}
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="shift-filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Shift</SelectItem>
                <SelectItem value="SHIFT 1">SHIFT 1</SelectItem>
                <SelectItem value="SHIFT 2">SHIFT 2</SelectItem>
                <SelectItem value="OVER SHIFT">OVER SHIFT</SelectItem>
                <SelectItem value="CUTI">CUTI</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Departemen */}
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-36" data-testid="dept-filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dept</SelectItem>
                <SelectItem value="Driver">Driver</SelectItem>
                <SelectItem value="HSE">Dept HSE</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Status Kehadiran */}
            <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="attendance-filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="hadir">Hadir</SelectItem>
                <SelectItem value="belum_hadir">Belum Hadir</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                  <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Aksi Lainnya</span>
                  <span className="sm:hidden">Aksi</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadTemplate} data-testid="download-template-button">
                  <Download className="w-4 h-4 mr-2" />
                  Template Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setUploadDept(null); setIsUploadDialogOpen(true); }} data-testid="upload-excel-button">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Excel Roster
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-emerald-700">Dept HSE</DropdownMenuLabel>
                <DropdownMenuItem onClick={downloadTemplateHSE} data-testid="download-template-hse-button">
                  <Download className="w-4 h-4 mr-2" />
                  Template Roster HSE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setUploadDept('HSE'); setIsUploadDialogOpen(true); }} data-testid="upload-hse-button">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Roster HSE
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsUpdateScheduleDialogOpen(true)} data-testid="update-schedule-button">
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Update Jadwal Karyawan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteAllDialogOpen(true)} className="text-red-600" data-testid="delete-all-roster-button">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Semua Roster
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white ml-2 shadow-sm" data-testid="add-roster-button">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tambah Roster</span>
              <span className="sm:hidden">Tambah</span>
            </Button>


          </div>
        ) : (
          // Calendar view filters
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Month Selector */}
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-36" data-testid="month-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Januari</SelectItem>
                <SelectItem value="2">Februari</SelectItem>
                <SelectItem value="3">Maret</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">Mei</SelectItem>
                <SelectItem value="6">Juni</SelectItem>
                <SelectItem value="7">Juli</SelectItem>
                <SelectItem value="8">Agustus</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">Oktober</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">Desember</SelectItem>
              </SelectContent>
            </Select>

            {/* Year Selector */}
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-28" data-testid="year-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            {/* Search by NIK */}
            <Input
              type="text"
              placeholder="Cari NIK..."
              value={searchNIK}
              onChange={(e) => setSearchNIK(e.target.value)}
              className="w-full sm:w-32"
              data-testid="matrix-search-nik-input"
            />

            {/* Search by Name */}
            <Input
              type="text"
              placeholder="Cari Nama/Mitra..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full sm:w-40"
              data-testid="matrix-search-name-input"
            />

            {/* Shift Filter for Calendar */}
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="w-full sm:w-36" data-testid="calendar-shift-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Shift</SelectItem>
                <SelectItem value="SHIFT 1">SHIFT 1</SelectItem>
                <SelectItem value="SHIFT 2">SHIFT 2</SelectItem>
                <SelectItem value="OVER SHIFT">OVER SHIFT</SelectItem>
                <SelectItem value="CUTI">CUTI</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Departemen (Calendar & Matrix) */}
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-36" data-testid="calendar-dept-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dept</SelectItem>
                <SelectItem value="Driver">Driver</SelectItem>
                <SelectItem value="HSE">Dept HSE</SelectItem>
              </SelectContent>
            </Select>

            {/* Aksi Lainnya Dropdown for Calendar & Matrix */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                  <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Aksi Lainnya</span>
                  <span className="sm:hidden">Aksi</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadTemplate} data-testid="download-template-button-matrix">
                  <Download className="w-4 h-4 mr-2" />
                  Template Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setUploadDept(null); setIsUploadDialogOpen(true); }} data-testid="upload-excel-button-matrix">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Excel Roster
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-emerald-700">Dept HSE</DropdownMenuLabel>
                <DropdownMenuItem onClick={downloadTemplateHSE} data-testid="download-template-hse-button-matrix">
                  <Download className="w-4 h-4 mr-2" />
                  Template Roster HSE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setUploadDept('HSE'); setIsUploadDialogOpen(true); }} data-testid="upload-hse-button-matrix">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Roster HSE
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsUpdateScheduleDialogOpen(true)} data-testid="update-schedule-button-matrix">
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Update Jadwal Karyawan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteAllDialogOpen(true)} className="text-red-600" data-testid="delete-all-roster-button-matrix">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Semua Roster
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {viewMode === 'list' ? (
          // List View
          <>
            {/* Roster Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-2 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg" data-testid="stats-scheduled">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-gray-600 dark:text-gray-400" />
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">{stats.scheduled}</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Dijadwalkan</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-green-50 dark:bg-green-900 rounded-lg" data-testid="stats-present">
                <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-green-600 dark:text-green-400" />
                <p className="text-lg sm:text-2xl font-semibold text-green-600 dark:text-green-300">{stats.present}</p>
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">Hadir</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-red-50 dark:bg-red-900 rounded-lg" data-testid="stats-absent">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-red-600 dark:text-red-400" />
                <p className="text-lg sm:text-2xl font-semibold text-red-600 dark:text-red-300">{stats.absent}</p>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">Belum Hadir</p>
              </div>
              <div className="text-center p-2 sm:p-4 bg-purple-50 dark:bg-purple-900 rounded-lg" data-testid="stats-leave">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 text-purple-600 dark:text-purple-400" />
                <p className="text-lg sm:text-2xl font-semibold text-purple-600 dark:text-purple-300">{stats.onLeave}</p>
                <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">Cuti</p>
              </div>
            </div>

            {/* Roster Table */}
            <div className="table-responsive overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full table-auto min-w-[1200px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">NIK</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Nama</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Position</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Nomor Lambung</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Tanggal</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Shift</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Hari Kerja</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Jam Tidur</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Fit To Work</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Jam Absensi</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Induksi</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-900 dark:text-white">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoadingRoster ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : rosterWithAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Tidak ada roster untuk tanggal ini
                      </td>
                    </tr>
                  ) : (
                    rosterWithAttendance.map((roster) => (
                      <tr key={roster.id} data-testid={`roster-row-${roster.employeeId}`}>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.employeeId}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.employee?.name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.employee?.position || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {(() => {
                            // Use fallback chain: actualNomorLambung → plannedNomorLambung → employee master data
                            // This matches PDF generator logic for consistency
                            // Handle empty strings properly (not just null/undefined)
                            const isValidValue = (val: string | null | undefined) => val && val !== '-' && val !== 'null' && val.trim() !== '';
                            const effectiveNomorLambung = isValidValue(roster.actualNomorLambung)
                              ? roster.actualNomorLambung
                              : isValidValue(roster.plannedNomorLambung)
                                ? roster.plannedNomorLambung
                                : roster.employee?.nomorLambung || '-';

                            // SPARE edit UI based on employee data only
                            if (roster.employee?.nomorLambung === "SPARE" || roster.employee?.isSpareOrigin) {
                              if (editingNomorLambung[roster.employeeId]) {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-orange-600">SPARE</span>
                                    <Input
                                      value={tempNomorLambung[roster.employeeId] || ""}
                                      onChange={(e) => setTempNomorLambung(prev => ({ ...prev, [roster.employeeId]: e.target.value }))}
                                      placeholder="Masukkan nomor lambung"
                                      className="w-32 h-8 text-xs"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveNomorLambung(roster.employeeId);
                                        } else if (e.key === 'Escape') {
                                          handleCancelEditNomorLambung(roster.employeeId);
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveNomorLambung(roster.employeeId)}
                                      disabled={updateNomorLambungMutation.isPending}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCancelEditNomorLambung(roster.employeeId)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      variant="secondary"
                                      className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800"
                                      onClick={() => handleEditNomorLambung(roster.employeeId, "SPARE")}
                                    >
                                      SPARE
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditNomorLambung(roster.employeeId, "SPARE")}
                                      className="h-6 w-6 p-0"
                                      title="Edit nomor lambung"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </div>
                                );
                              }
                            }

                            // Display effective nomor lambung for non-SPARE
                            if (effectiveNomorLambung !== '-') {
                              // Check if nomor lambung has been updated (actualNomorLambung different from employee master)
                              const hasNomorLambungChanged = isValidValue(roster.actualNomorLambung) &&
                                roster.actualNomorLambung !== roster.employee?.nomorLambung;

                              // Show SPARE origin badge for updated SPARE employees
                              if (roster.employee?.isSpareOrigin && effectiveNomorLambung !== "SPARE") {
                                return (
                                  <div className="flex items-center space-x-1">
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs">
                                      SPARE
                                    </Badge>
                                    <span className="text-sm font-medium">{effectiveNomorLambung}</span>
                                  </div>
                                );
                              }

                              // Show badge if nomor lambung was updated today
                              if (hasNomorLambungChanged) {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{effectiveNomorLambung}</span>
                                    <Badge
                                      variant="secondary"
                                      className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs"
                                      title={`Diupdate dari ${roster.employee?.nomorLambung || 'N/A'}`}
                                    >
                                      📦 Berubah
                                    </Badge>
                                  </div>
                                );
                              }

                              return effectiveNomorLambung;
                            }

                            return '-';
                          })()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {new Date(roster.date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.shift}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.hariKerja || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.actualJamTidur || roster.jamTidur || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={(roster.actualFitToWork || roster.fitToWork) === "Fit To Work" ? "default" : "destructive"}
                            data-testid={`roster-fit-to-work-${roster.employeeId}`}
                          >
                            {roster.actualFitToWork || roster.fitToWork || "Fit To Work"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={roster.hasAttended ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}
                          >
                            {roster.hasAttended ? 'Hadir' : 'Belum Hadir'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {roster.attendanceTime || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {/* Induction Status Badge */}
                          {roster.shift === 'CUTI' ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                              Cuti
                            </Badge>
                          ) : roster.inductionStatus === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                              ✓ Sudah
                            </Badge>
                          ) : roster.inductionStatus === 'pending' ? (
                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs">
                              ⏳ Perlu
                            </Badge>
                          ) : roster.inductionStatus === 'failed' ? (
                            <Badge variant="destructive" className="text-xs">
                              ✗ Gagal
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(roster)}
                              data-testid={`edit-roster-${roster.employeeId}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(roster.id)}
                              data-testid={`delete-roster-${roster.employeeId}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (() => {
          // Apply filtering logic to monthlyRoster before passing it to MonthlyCalendar and RosterMatrixView
          const employeeIdsWithShift = new Set(
            shiftFilter === 'all'
              ? []
              : monthlyRoster?.filter(r => r.shift?.toUpperCase() === shiftFilter.toUpperCase()).map(r => r.employeeId)
          );

          const filteredMonthlyRoster = monthlyRoster?.filter(roster => {
            const matchNIK = searchNIK === '' || (roster.employee?.nik || '').toLowerCase().includes(searchNIK.toLowerCase());
            const matchName = searchName === '' ||
              (roster.employee?.name || '').toLowerCase().includes(searchName.toLowerCase()) ||
              (roster.employee?.investorGroup || '').toLowerCase().includes(searchName.toLowerCase());

            const matchShift = shiftFilter === 'all' || employeeIdsWithShift.has(roster.employeeId);

            const isHSE = ((roster.employee as any)?.department || '').toUpperCase() === 'HSE';
            const matchDept = deptFilter === 'all' || (deptFilter === 'HSE' ? isHSE : !isHSE);

            return matchNIK && matchName && matchShift && matchDept;
          }) || [];

          return viewMode === 'calendar' ? (
            // Calendar View
            <div className="p-2">
              {isLoadingMonthly ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading kalender...
                </div>
              ) : (
                <MonthlyCalendar
                  year={selectedYear}
                  month={selectedMonth}
                  rosterData={filteredMonthlyRoster}
                  shiftFilter={shiftFilter}
                  onDateClick={(date) => {
                    setSelectedDate(date);
                    setViewMode('list');
                  }}
                />
              )}
            </div>
          ) : (
            // Matrix View
            <div className="p-2">
              {isLoadingMonthly ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading matrix...
                </div>
              ) : (
                <RosterMatrixView
                  year={selectedYear}
                  month={selectedMonth}
                  rosterData={filteredMonthlyRoster}
                  employees={employees}
                  onOpenUploadForPerson={(empId) => {
                    setNikForUpdate(empId);
                    setIsUpdateScheduleDialogOpen(true);
                  }}
                />
              )}
            </div>
          );
        })()}
      </CardContent>

      {/* Upload Excel Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(o) => { setIsUploadDialogOpen(o); if (!o) setUploadDept(null); }}>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uploadDept === 'HSE' ? 'Upload Roster Dept HSE' : 'Upload Excel Roster'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
                data-testid="excel-file-input"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                File dipilih: {selectedFile.name}
              </p>
            )}

            {/* Progress Bar Section */}
            {isProcessing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Memproses Excel...
                  </span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {uploadProgress.toFixed(0)}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {processedCount > 0 && totalCount > 0 && (
                    <span>Diproses: {processedCount.toLocaleString()} dari {totalCount.toLocaleString()} baris</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={processExcelFile}
                disabled={!selectedFile || isProcessing || uploadMutation.isPending}
                data-testid="process-excel-button"
                className="flex-1"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </div>
                ) : uploadMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Mengupload...</span>
                  </div>
                ) : (
                  "Upload"
                )}
              </Button>
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFile(null);
                  setUploadProgress(0);
                  setIsProcessing(false);
                  setProcessedCount(0);
                  setTotalCount(0);
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Employee Schedule Dialog */}
      <Dialog open={isUpdateScheduleDialogOpen} onOpenChange={setIsUpdateScheduleDialogOpen}>

        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Jadwal Karyawan (1 Bulan)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">NIK Karyawan</label>
              <Input
                type="text"
                placeholder="Masukkan NIK karyawan (contoh: C-006441)"
                value={nikForUpdate}
                onChange={(e) => setNikForUpdate(e.target.value.toUpperCase())}
                data-testid="update-schedule-nik-input"
                className="w-full"
              />
              {isLoadingEmployee && nikForUpdate && (
                <p className="text-sm text-gray-500 flex items-center">
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Mencari karyawan...
                </p>
              )}
              {employeeForUpdate && nikForUpdate && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {employeeForUpdate.name}
                </p>
              )}
              {employeeError && nikForUpdate && !isLoadingEmployee && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  NIK tidak ditemukan
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Bulan</label>
              <Input
                type="month"
                value={selectedMonthForUpdate}
                onChange={(e) => setSelectedMonthForUpdate(e.target.value)}
                data-testid="update-schedule-month-input"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Excel Jadwal Baru</label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUpdateScheduleFile(e.target.files?.[0] || null)}
                disabled={isProcessingUpdate}
                data-testid="update-schedule-file-input"
              />
              {updateScheduleFile && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  File dipilih: {updateScheduleFile.name}
                </p>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Excel harus berisi jadwal untuk <strong>{employeeForUpdate ? employeeForUpdate.name : "karyawan yang dipilih"}</strong> saja dalam 1 bulan penuh. Semua jadwal lama di bulan tersebut akan diganti.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button
                onClick={async () => {
                  if (!nikForUpdate || !employeeForUpdate) {
                    toast({
                      title: "Error",
                      description: nikForUpdate ? "NIK tidak ditemukan" : "Masukkan NIK karyawan terlebih dahulu",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!selectedMonthForUpdate) {
                    toast({
                      title: "Error",
                      description: "Pilih bulan terlebih dahulu",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!updateScheduleFile) {
                    toast({
                      title: "Error",
                      description: "Pilih file Excel terlebih dahulu",
                      variant: "destructive",
                    });
                    return;
                  }

                  setIsProcessingUpdate(true);

                  try {
                    // Read Excel file
                    const data = await updateScheduleFile.arrayBuffer();
                    const workbook = XLSX.read(data);
                    const sheetName = workbook.SheetNames.includes('Template Roster')
                      ? 'Template Roster'
                      : workbook.SheetNames[0];

                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    // Process data (reuse same logic from processExcelFile)
                    const rosterData: InsertRosterSchedule[] = jsonData.map((row: any) => {
                      const rawShift = String(row.Shift || row.shift || '').trim().toUpperCase();
                      let normalizedShift = 'SHIFT 1';

                      if (['SHIFT 1', 'SHIFT1', 'S1', '1'].includes(rawShift)) normalizedShift = 'SHIFT 1';
                      else if (['SHIFT 2', 'SHIFT2', 'S2', '2'].includes(rawShift)) normalizedShift = 'SHIFT 2';
                      else if (['OVER SHIFT', 'OVER', 'OS'].includes(rawShift)) normalizedShift = 'OVER SHIFT';
                      else if (['CUTI', 'OFF', 'LEAVE'].includes(rawShift)) normalizedShift = 'CUTI';

                      let defaultStartTime = '06:00', defaultEndTime = '16:00';
                      if (normalizedShift === 'SHIFT 2') { defaultStartTime = '18:00'; defaultEndTime = '06:00'; }
                      else if (normalizedShift === 'CUTI') { defaultStartTime = '00:00'; defaultEndTime = '00:00'; }
                      else if (normalizedShift === 'OVER SHIFT') { defaultStartTime = '06:00'; defaultEndTime = '18:00'; }

                      let rosterDate = row.Tanggal || row.tanggal || row.Date || row.date || '';
                      if (typeof rosterDate === 'number') {
                        const utcDate = new Date(Date.UTC(1899, 11, 30) + (rosterDate * 24 * 60 * 60 * 1000));
                        rosterDate = `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
                      }

                      return {
                        employeeId: row.NIK || row.nik || row['Employee ID'] || row.employeeId || '',
                        date: rosterDate,
                        shift: normalizedShift,
                        startTime: row['Jam Kel'] || row.jamKel || defaultStartTime,
                        endTime: row['Jam Tld'] || row.jamTld || defaultEndTime,
                        jamTidur: String(row['Jam Tidur'] || row.jamTidur || ''),
                        fitToWork: row['Fit To W'] || row['Fit To Work'] || row.fitToWork || 'Fit To Work',
                        hariKerja: String(row['Hari Kerja'] || row.hariKerja || ''),
                        status: row.Status || row.status || 'scheduled'
                      };
                    }).filter(row => row.employeeId && row.shift);

                    if (rosterData.length === 0) {
                      setIsProcessingUpdate(false);
                      toast({
                        title: "Error",
                        description: "Tidak ada data valid ditemukan di Excel",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Submit to API
                    updateScheduleMutation.mutate({
                      employeeId: nikForUpdate,
                      month: selectedMonthForUpdate,
                      rosters: rosterData
                    });
                  } catch (error) {
                    console.error('Update schedule error:', error);
                    setIsProcessingUpdate(false);
                    toast({
                      title: "Error",
                      description: "Format file Excel tidak valid",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={!nikForUpdate || !employeeForUpdate || !selectedMonthForUpdate || !updateScheduleFile || isProcessingUpdate || updateScheduleMutation.isPending}
                data-testid="process-update-schedule-button"
                className="flex-1"
              >
                {isProcessingUpdate || updateScheduleMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </div>
                ) : (
                  "Update Jadwal"
                )}
              </Button>
              <Button
                variant="outline"
                disabled={isProcessingUpdate}
                onClick={() => {
                  setIsUpdateScheduleDialogOpen(false);
                  setNikForUpdate("");
                  setSelectedMonthForUpdate("");
                  setUpdateScheduleFile(null);
                  setIsProcessingUpdate(false);
                }}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Roster Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Tambah Roster</span>
              <AutoSaveIndicator status={saveStatus} />
            </DialogTitle>
          </DialogHeader>

          {hasDraft() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Draft tersimpan otomatis akan dipulihkan. Data yang belum disimpan akan tetap aman.
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Karyawan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="roster-employee-select">
                          <SelectValue placeholder="Pilih karyawan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Array.isArray(employees) ? employees : []).map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.id} - {employee.name} ({employee.position || 'No ID'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="roster-shift-select">
                          <SelectValue placeholder="Pilih shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Shift 1">Shift 1 (06:00 - 18:00)</SelectItem>
                        <SelectItem value="Shift 2">Shift 2 (18:00 - 06:00)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jam Mulai</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="roster-start-time-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jam Selesai</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="roster-end-time-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="jamTidur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jam Tidur (contoh: 6 atau 5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="6"
                        {...field}
                        value={field.value || ""}
                        data-testid="roster-jam-tidur-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fitToWork"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Fit To Work</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="roster-fit-to-work-select">
                          <SelectValue placeholder="Pilih status fit to work" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fit To Work">Fit To Work</SelectItem>
                        <SelectItem value="Not Fit To Work">Not Fit To Work</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
                data-testid="submit-roster-button"
              >
                {createMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Roster Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Roster</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Karyawan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="edit-roster-employee-select">
                          <SelectValue placeholder="Pilih karyawan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Array.isArray(employees) ? employees : []).map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.id} - {employee.name} ({employee.position || 'No ID'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="edit-roster-shift-select">
                          <SelectValue placeholder="Pilih shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Shift 1">Shift 1 (06:00 - 18:00)</SelectItem>
                        <SelectItem value="Shift 2">Shift 2 (18:00 - 06:00)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jam Mulai</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="edit-roster-start-time-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jam Selesai</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          data-testid="edit-roster-end-time-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="jamTidur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jam Tidur (contoh: 6 atau 5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="6"
                        {...field}
                        value={field.value || ""}
                        data-testid="edit-roster-jam-tidur-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fitToWork"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Fit To Work</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="edit-roster-fit-to-work-select">
                          <SelectValue placeholder="Pilih status fit to work" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fit To Work">Fit To Work</SelectItem>
                        <SelectItem value="Not Fit To Work">Not Fit To Work</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="hariKerja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hari Kerja</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Senin, Selasa"
                        {...field}
                        value={field.value || ""}
                        data-testid="edit-roster-hari-kerja-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateMutation.isPending}
                  data-testid="update-roster-button"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingRoster(null);
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Semua Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus <strong>SEMUA</strong> data roster?
              Tindakan ini tidak dapat dibatalkan dan akan menghapus semua jadwal kerja yang ada.
            </p>
            <div className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDeleteAllDialogOpen(false)}
                disabled={deleteAllMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
                data-testid="confirm-delete-all-button"
              >
                {deleteAllMutation.isPending ? "Menghapus..." : "Ya, Hapus Semua"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}