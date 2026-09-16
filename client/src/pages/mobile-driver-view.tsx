import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, Calendar, Clock, MapPin, ChevronDown, ChevronUp, Bell, AlertTriangle, TrendingUp, Activity, CheckCircle, XCircle, Shield, Loader2, Megaphone, Eye, Image as ImageIcon, ChevronRight, X, BellRing, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePushNotification } from "@/hooks/use-push-notification";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  investorGroup: string;
  phone: string;
}

interface RosterSchedule {
  id: string;
  employeeId: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  jamTidur: string;
  fitToWork: string;
  status: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface LeaveRosterMonitoring {
  id: string;
  nik: string;
  name: string;
  nomorLambung: string;
  month: string;
  investorGroup: string;
  lastLeaveDate: string;
  leaveOption: string;
  monitoringDays: number;
  onSite: string;
  status: string;
  nextLeaveDate: string;
}

interface SimperMonitoring {
  id: string;
  employeeName: string;
  nik: string;
  simperBibExpiredDate: string | null;
  simperTiaExpiredDate: string | null;
  bibMonitoringDays?: number | null;
  tiaMonitoringDays?: number | null;
  bibStatus?: string;
  tiaStatus?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrls?: string[] | null;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isRead?: boolean;
}

export default function MobileDriverView() {
  // Get NIK from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const nikFromUrl = urlParams.get('nik') || "";
  
  const [nik, setNik] = useState(nikFromUrl);
  const [debouncedNik, setDebouncedNik] = useState(nikFromUrl);
  const [searchEmployee, setSearchEmployee] = useState<Employee | null>(null);
  const [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'leave' | 'pemberitahuan' | 'simper'>('roster');
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter states untuk tab Roster
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = Semua
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedShift, setSelectedShift] = useState<string>('all'); // 'all', 'Shift 1', 'Shift 2'
  const [showOvershiftOnly, setShowOvershiftOnly] = useState(false);
  const [showCutiOnly, setShowCutiOnly] = useState(false);
  
  // State untuk dialog pengumuman
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Push notification hook
  const pushNotification = usePushNotification(searchEmployee?.id);

  // Query untuk mencari employee berdasarkan NIK - OPTIMIZED
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes cache - employees data doesn't change often
  });

  // Query untuk roster berdasarkan employee yang dipilih - LAZY LOADING
  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ["/api/roster", { employeeId: searchEmployee?.id }],
    queryFn: async () => {
      if (!searchEmployee?.id) return [];
      const response = await fetch(`/api/roster?employeeId=${searchEmployee.id}`);
      if (!response.ok) throw new Error('Failed to fetch roster');
      return response.json();
    },
    enabled: !!searchEmployee && activeTab === 'roster', // Only load when roster tab active
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Query untuk leave requests berdasarkan employee yang dipilih - LAZY LOADING
  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ["/api/leave"],
    enabled: !!searchEmployee && activeTab === 'leave', // Only load when leave tab active
    staleTime: 3 * 60 * 1000, // 3 minutes cache
  });

  // Query untuk pengumuman aktif dengan status baca
  const { data: announcements = [], isLoading: announcementsLoading, refetch: refetchAnnouncements } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/active-with-status", searchEmployee?.id],
    queryFn: async () => {
      if (!searchEmployee?.id) return [];
      const response = await fetch(`/api/announcements/active-with-status/${searchEmployee.id}`);
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
    enabled: !!searchEmployee && activeTab === 'pemberitahuan',
    staleTime: 1 * 60 * 1000,
  });

  // Query untuk unread count (always active)
  const { data: unreadCountData } = useQuery<{count: number}>({
    queryKey: ["/api/announcements/unread-count", searchEmployee?.id],
    queryFn: async () => {
      if (!searchEmployee?.id) return { count: 0 };
      const response = await fetch(`/api/announcements/unread-count/${searchEmployee.id}`);
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    enabled: !!searchEmployee,
    staleTime: 30 * 1000,
  });

  const unreadCount = unreadCountData?.count || 0;

  // Mutation untuk mark announcement as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ announcementId }: { announcementId: string }) => {
      if (!searchEmployee?.id || !searchEmployee?.name) {
        throw new Error("Employee data not found");
      }
      return apiRequest(`/api/announcements/${announcementId}/read`, 'POST', {
        employeeId: searchEmployee.id,
        employeeName: searchEmployee.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count", searchEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active-with-status", searchEmployee?.id] });
    }
  });

  // Query untuk SIMPER monitoring berdasarkan employee yang dipilih - LAZY LOADING
  const { data: simperData, isLoading: simperLoading } = useQuery({
    queryKey: ["/api/simper-monitoring/nik", searchEmployee?.id],
    queryFn: async () => {
      if (!searchEmployee?.id) return null;
      const response = await fetch(`/api/simper-monitoring/nik/${searchEmployee.id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch SIMPER data');
      }
      const data = await response.json();
      
      // Calculate monitoring days and status
      const today = new Date();
      const processSIMPER = (expiredDate: string | null) => {
        if (!expiredDate) return { days: null, status: 'Tidak Ada Data' };
        
        const expired = new Date(expiredDate);
        const diffTime = expired.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { days: diffDays, status: 'Segera Perpanjang' };
        if (diffDays < 7) return { days: diffDays, status: 'Mendekati Perpanjangan' };
        if (diffDays < 30) return { days: diffDays, status: 'Menuju Perpanjangan' };
        return { days: diffDays, status: 'Aktif' };
      };

      const bibStatus = processSIMPER(data.simperBibExpiredDate);
      const tiaStatus = processSIMPER(data.simperTiaExpiredDate);

      return {
        ...data,
        bibMonitoringDays: bibStatus.days,
        bibStatus: bibStatus.status,
        tiaMonitoringDays: tiaStatus.days,
        tiaStatus: tiaStatus.status
      };
    },
    enabled: !!searchEmployee && activeTab === 'simper', // Only load when SIMPER tab active
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNik(nik);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [nik]);

  // Auto search when debounced value changes
  useEffect(() => {
    if (debouncedNik.trim() && employees) {
      handleSearchWithNik(debouncedNik);
    } else {
      setSuggestions([]);
      setSearchEmployee(null);
    }
  }, [debouncedNik, employees]);

  const handleSearchWithNik = useCallback((nikValue: string) => {
    if (!nikValue.trim()) return;
    
    setIsSearching(true);
    console.log('🔍 Mobile Driver View: Searching for NIK:', nikValue);
    const employeeList = employees as Employee[] || [];
    console.log('👥 Available employees:', employeeList.length);
    const searchTerm = nikValue.trim().toLowerCase();
    
    const employee = employeeList.find((emp: Employee) => {
      if (emp.id.toLowerCase() === searchTerm) return true;
      if (emp.name.toLowerCase().includes(searchTerm)) return true;
      if (emp.position && emp.position.toLowerCase().includes(searchTerm)) return true;
      return false;
    });
    
    // Generate suggestions for partial matches
    if (!employee && searchTerm.length > 2) {
      const matchedEmployees = employeeList.filter((emp: Employee) => {
        return emp.name.toLowerCase().includes(searchTerm) ||
               emp.id.toLowerCase().includes(searchTerm) ||
               (emp.position && emp.position.toLowerCase().includes(searchTerm));
      }).slice(0, 3); // Limit untuk mobile
      setSuggestions(matchedEmployees);
    } else {
      setSuggestions([]);
    }
    
    if (employee) {
      console.log('✅ Employee found:', employee.name, employee.id);
    } else {
      console.log('❌ No employee found for:', nikValue);
    }
    
    setSearchEmployee(employee || null);
    setIsSearching(false);
  }, [employees]);

  // Auto-search when NIK from URL is present and employees are loaded
  useEffect(() => {
    console.log('🚀 Mobile Driver View loaded with nikFromUrl:', nikFromUrl);
    
    if (nikFromUrl && employees && Array.isArray(employees) && employees.length > 0) {
      console.log('📱 Auto-searching for employee from URL:', nikFromUrl);
      // Immediate search - no delay needed
      handleSearchWithNik(nikFromUrl);
      // Auto set to roster tab for quick access
      setActiveTab('roster');
    }
  }, [employees, nikFromUrl, handleSearchWithNik]); // Depend on employees so it runs when data is loaded

  const handleSearch = () => {
    handleSearchWithNik(nik);
  };

  const employeeRoster = (rosterData as RosterSchedule[]) || [];
  const leaveList = leaveData as LeaveRequest[] || [];
  const employeeLeaves = leaveList.filter((leave: LeaveRequest) => 
    leave.employeeId === searchEmployee?.id
  );

  // Filtered roster berdasarkan filter yang dipilih
  const filteredRoster = (employeeRoster || []).filter((roster: RosterSchedule) => {
    if (!roster) return false;
    
    // Filter by Year (always apply)
    if (roster.date) {
      try {
        const rosterDate = new Date(roster.date);
        if (rosterDate.getFullYear() !== selectedYear) {
          return false;
        }
        // Filter by Month (only if selected)
        if (selectedMonth !== null && (rosterDate.getMonth() + 1) !== selectedMonth) {
          return false;
        }
      } catch (e) {
        return false;
      }
    }
    
    // Normalize shift for comparison
    const normalizedShift = roster.shift?.toLowerCase().trim() || '';
    
    // KETIKA "SEMUA SHIFT" DIPILIH: Tampilkan SEMUA data (SHIFT 1, SHIFT 2, CUTI, OVER SHIFT)
    // Abaikan semua filter shift dan toggle
    if (selectedShift === 'all') {
      // Ketika "Semua Shift" dan ada toggle aktif, filter berdasarkan toggle
      if (showOvershiftOnly || showCutiOnly) {
        if (showOvershiftOnly && showCutiOnly) {
          // Both active: show either OVER SHIFT OR CUTI
          if (normalizedShift !== 'over shift' && normalizedShift !== 'cuti') {
            return false;
          }
        } else if (showOvershiftOnly) {
          // Only overshift
          if (normalizedShift !== 'over shift') {
            return false;
          }
        } else if (showCutiOnly) {
          // Only cuti
          if (normalizedShift !== 'cuti') {
            return false;
          }
        }
      }
      // Jika tidak ada toggle, tampilkan semua (sudah pass filter date di atas)
      return true;
    }
    
    // Filter by Shift spesifik (SHIFT 1 atau SHIFT 2)
    const filterShift = selectedShift.toLowerCase().trim();
    if (normalizedShift !== filterShift) {
      return false;
    }
    
    return true;
  });

  const getShiftBadgeColor = (shift: string) => {
    return shift === "Shift 1" ? "bg-blue-500 text-white" : "bg-orange-500 text-white";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "present": return "bg-primary text-white";
      case "scheduled": return "bg-blue-500 text-white";
      case "pending": return "bg-yellow-500 text-black";
      case "approved": return "bg-primary text-white";
      case "rejected": return "bg-red-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getSimperStatusColor = (status: string) => {
    switch (status) {
      case 'Segera Perpanjang':
        return 'bg-red-100 text-red-800';
      case 'Mendekati Perpanjangan':
        return 'bg-yellow-100 text-yellow-800';
      case 'Menuju Perpanjangan':
        return 'bg-orange-100 text-orange-800';
      case 'Aktif':
        return 'bg-muted text-foreground';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateDD_MM_YYYY = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Modern Mobile Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white p-6 sticky top-0 z-50 shadow-xl">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className="h-6 w-6 mr-2" />
            <h1 className="text-2xl font-bold">Driver View</h1>
          </div>
          <p className="text-red-100 text-sm font-medium">Employee Data & Monitoring System</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Loading State untuk employees */}
        {employeesLoading && (
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-500"></div>
                <p className="text-gray-600 dark:text-gray-300 font-semibold">Loading employee data...</p>
                <p className="text-gray-400 text-sm">Memuat data karyawan dari server...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modern Search Section */}
        {!employeesLoading && (
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg">
          <CardHeader className="pb-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
              <div className="p-2 bg-red-500 rounded-full">
                <Search className="h-5 w-5 text-white" />
              </div>
              Cari Karyawan
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 font-medium">
              Scan QR code atau masukkan NIK untuk melihat data lengkap
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  placeholder="Ketik NIK atau nama karyawan..."
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="text-base border-2 focus:border-red-500 rounded-xl py-3 px-4 flex-1"
                  data-testid="input-mobile-nik-search"
                />
                {isSearching && (
                  <div className="flex items-center px-3">
                    <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                  </div>
                )}
              </div>
              
              {/* Mobile Suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-10 mt-2">
                  {suggestions.map((emp) => (
                    <div
                      key={emp.id}
                      className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                      onClick={() => {
                        setNik(emp.name);
                        setSearchEmployee(emp);
                        setSuggestions([]);
                      }}
                    >
                      <div className="font-semibold text-sm">{emp.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {emp.id} | {emp.position}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {nik && !searchEmployee && (
              <div className="text-red-500 text-sm text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="font-semibold">Karyawan "{nik}" tidak ditemukan</p>
                <p className="text-xs text-gray-500 mt-1">Coba cari dengan NIK atau nama lengkap</p>
              </div>
            )}
          </CardContent>
          </Card>
        )}

        {/* Employee Info - Modern Card */}
        {searchEmployee && !employeesLoading && (
          <>
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg overflow-hidden">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#DF2A33]/20 dark:to-[#96161C]/20">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                  <div className="p-3 bg-blue-500 rounded-full shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  {searchEmployee.name}
                </CardTitle>
                <CardDescription className="text-blue-600 dark:text-blue-300 font-semibold text-base">
                  NIK: {searchEmployee.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Posisi</p>
                    <p className="font-bold text-gray-800 dark:text-white">{searchEmployee.position}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Department</p>
                    <p className="font-bold text-gray-800 dark:text-white">{searchEmployee.department}</p>
                  </div>
                  <div className="col-span-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Investor Group</p>
                    <p className="font-bold text-gray-800 dark:text-white">{searchEmployee.investorGroup}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modern Tab Navigation - Mobile Friendly with Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={activeTab === 'roster' ? "default" : "outline"}
                onClick={() => setActiveTab('roster')}
                className={`p-3 rounded-xl font-semibold flex-shrink-0 ${activeTab === 'roster' 
                  ? 'bg-gradient-to-r from-primary to-primary text-white shadow-lg' 
                  : 'bg-white dark:bg-gray-800 border-2'}`}
                data-testid="tab-roster"
              >
                <Calendar className="h-4 w-4 mb-1" />
                <span className="text-xs">Roster</span>
              </Button>
              <Button
                variant={activeTab === 'leave' ? "default" : "outline"}
                onClick={() => setActiveTab('leave')}
                className={`p-3 rounded-xl font-semibold flex-shrink-0 ${activeTab === 'leave' 
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg' 
                  : 'bg-white dark:bg-gray-800 border-2'}`}
                data-testid="tab-leave"
              >
                <MapPin className="h-4 w-4 mb-1" />
                <span className="text-xs">Cuti</span>
              </Button>
              <Button
                variant={activeTab === 'pemberitahuan' ? "default" : "outline"}
                onClick={() => setActiveTab('pemberitahuan')}
                className={`p-3 rounded-xl font-semibold flex-shrink-0 relative overflow-visible ${activeTab === 'pemberitahuan' 
                  ? 'bg-gradient-to-r from-[#DF2A33] to-[#96161C] text-white shadow-lg' 
                  : 'bg-white dark:bg-gray-800 border-2'}`}
                data-testid="tab-pemberitahuan"
              >
                <Megaphone className="h-4 w-4 mb-1" />
                <span className="text-xs">Pemberitahuan</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-md border-2 border-white z-10">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button
                variant={activeTab === 'simper' ? "default" : "outline"}
                onClick={() => setActiveTab('simper')}
                className={`p-3 rounded-xl font-semibold flex-shrink-0 ${activeTab === 'simper' 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' 
                  : 'bg-white dark:bg-gray-800 border-2'}`}
                data-testid="tab-simper"
              >
                <Shield className="h-4 w-4 mb-1" />
                <span className="text-xs">SIMPER</span>
              </Button>
            </div>

            {/* Tab Content */}
            {activeTab === 'roster' && (
              <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg">
                <CardHeader className="bg-gradient-to-r from-primary to-primary dark:from-primary dark:to-primary rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                    <div className="p-2 bg-primary rounded-full">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    Jadwal Roster Kerja
                  </CardTitle>
                  <CardDescription className="text-foreground font-medium">
                    Daftar jadwal kerja untuk {searchEmployee.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Filter Section */}
                  <div className="mb-6 space-y-3">
                    {/* Month/Year Filter */}
                    <div className="flex gap-2">
                      <select
                        value={selectedMonth === null ? '' : selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
                        className="flex-1 p-2 border-2 rounded-lg text-sm font-semibold bg-white dark:bg-gray-800 dark:border-gray-600"
                        data-testid="filter-month"
                      >
                        <option value="">Semua Bulan</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <option key={month} value={month}>
                            {new Date(2025, month - 1).toLocaleString('id-ID', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-24 p-2 border-2 rounded-lg text-sm font-semibold bg-white dark:bg-gray-800 dark:border-gray-600"
                        data-testid="filter-year"
                      >
                        {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Shift Filter */}
                    <div className="flex gap-2">
                      <Button
                        variant={selectedShift === 'all' ? "default" : "outline"}
                        onClick={() => setSelectedShift('all')}
                        className={`flex-1 text-xs font-semibold ${selectedShift === 'all' ? 'bg-primary' : ''}`}
                        data-testid="filter-shift-all"
                      >
                        Semua Shift
                      </Button>
                      <Button
                        variant={selectedShift === 'Shift 1' ? "default" : "outline"}
                        onClick={() => setSelectedShift('Shift 1')}
                        className={`flex-1 text-xs font-semibold ${selectedShift === 'Shift 1' ? 'bg-blue-600' : ''}`}
                        data-testid="filter-shift-1"
                      >
                        Shift 1
                      </Button>
                      <Button
                        variant={selectedShift === 'Shift 2' ? "default" : "outline"}
                        onClick={() => setSelectedShift('Shift 2')}
                        className={`flex-1 text-xs font-semibold ${selectedShift === 'Shift 2' ? 'bg-purple-600' : ''}`}
                        data-testid="filter-shift-2"
                      >
                        Shift 2
                      </Button>
                    </div>

                    {/* Overshift & Cuti Filters */}
                    <div className="flex gap-2">
                      <Button
                        variant={showOvershiftOnly ? "default" : "outline"}
                        onClick={() => setShowOvershiftOnly(!showOvershiftOnly)}
                        className={`flex-1 text-xs font-semibold ${showOvershiftOnly ? 'bg-amber-600' : ''}`}
                        data-testid="filter-overshift"
                      >
                        {showOvershiftOnly ? '✓' : ''} Overshift
                      </Button>
                      <Button
                        variant={showCutiOnly ? "default" : "outline"}
                        onClick={() => setShowCutiOnly(!showCutiOnly)}
                        className={`flex-1 text-xs font-semibold ${showCutiOnly ? 'bg-red-600' : ''}`}
                        data-testid="filter-cuti"
                      >
                        {showCutiOnly ? '✓' : ''} Cuti
                      </Button>
                    </div>
                  </div>

                  {rosterLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-border mx-auto"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold mt-4">Loading roster data...</p>
                      <p className="text-gray-400 text-sm mt-2">Mengambil jadwal kerja terbaru...</p>
                    </div>
                  ) : filteredRoster.length > 0 ? (
                    <div className="space-y-4">
                      {filteredRoster
                        .sort((a: RosterSchedule, b: RosterSchedule) => 
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                        )
                        .slice(0, 20)
                        .map((roster: RosterSchedule) => (
                          <div key={roster.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-bold text-lg text-gray-800 dark:text-white">
                                  {format(new Date(roster.date), "dd MMM yyyy")}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <Badge className={getShiftBadgeColor(roster.shift) + " px-3 py-1 rounded-full font-semibold"}>
                                    {roster.shift}
                                  </Badge>
                                  <Badge className={getStatusBadgeColor(roster.status) + " px-3 py-1 rounded-full font-semibold"}>
                                    {roster.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-semibold">{roster.startTime} - {roster.endTime}</span>
                                </div>
                                {roster.jamTidur && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Jam Tidur: {roster.jamTidur}
                                  </p>
                                )}
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {roster.fitToWork}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Tidak ada data roster ditemukan</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'leave' && (
              <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                    <div className="p-2 bg-orange-500 rounded-full">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    Riwayat Cuti
                  </CardTitle>
                  <CardDescription className="text-orange-600 dark:text-orange-300 font-medium">
                    Daftar pengajuan cuti untuk {searchEmployee.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {leaveLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-orange-500 mx-auto"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold mt-4">Loading leave data...</p>
                      <p className="text-gray-400 text-sm mt-2">Mengambil data cuti terbaru...</p>
                    </div>
                  ) : employeeLeaves.length > 0 ? (
                    <div className="space-y-4">
                      {employeeLeaves
                        .sort((a: LeaveRequest, b: LeaveRequest) => 
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .slice(0, 5)
                        .map((leave: LeaveRequest) => (
                          <div key={leave.id} className="border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-bold text-lg text-gray-800 dark:text-white mb-1">{leave.leaveType}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {format(new Date(leave.startDate), "dd MMM yyyy")} - {format(new Date(leave.endDate), "dd MMM yyyy")}
                                </p>
                                {leave.reason && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Alasan:</span> {leave.reason}
                                  </p>
                                )}
                              </div>
                              <Badge className={getStatusBadgeColor(leave.status) + " px-3 py-1 rounded-full font-semibold"}>
                                {leave.status === 'approved' ? 'Disetujui' : 
                                 leave.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Tidak ada data cuti ditemukan</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'pemberitahuan' && (
              <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-[#DF2A33]/20 dark:to-[#96161C]/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                    <div className="p-2 bg-purple-500 rounded-full">
                      <Megaphone className="h-5 w-5 text-white" />
                    </div>
                    Pemberitahuan
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white ml-2">{unreadCount} baru</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-purple-600 dark:text-purple-300 font-medium">
                    Informasi dan pengumuman terbaru dari admin
                  </CardDescription>
                  
                  {/* Push Notification Toggle */}
                  {pushNotification.isSupported && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {pushNotification.isSubscribed ? (
                            <BellRing className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <BellOff className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium text-sm text-gray-800 dark:text-white">
                              Push Notification
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pushNotification.isSubscribed 
                                ? "Aktif - Anda akan menerima notifikasi" 
                                : "Nonaktif - Aktifkan untuk menerima notifikasi"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={pushNotification.isSubscribed}
                          disabled={pushNotification.isLoading}
                          onCheckedChange={async (checked) => {
                            if (checked) {
                              await pushNotification.subscribe();
                            } else {
                              await pushNotification.unsubscribe();
                            }
                          }}
                          data-testid="switch-push-notification"
                        />
                      </div>
                      {pushNotification.error && (
                        <p className="text-xs text-red-500 mt-2">{pushNotification.error}</p>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-3">
                  {announcementsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-purple-500 mx-auto"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold mt-4">Memuat pemberitahuan...</p>
                    </div>
                  ) : announcements.length > 0 ? (
                    <div className="space-y-2">
                      {announcements.map((announcement) => (
                        <div 
                          key={announcement.id}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                            !announcement.isRead 
                              ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 shadow-sm' 
                              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                          }`}
                          onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setAnnouncementDialogOpen(true);
                            if (!announcement.isRead) {
                              markAsReadMutation.mutate({ announcementId: announcement.id });
                            }
                          }}
                          data-testid={`announcement-${announcement.id}`}
                        >
                          <div className="flex-shrink-0 relative">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                              !announcement.isRead 
                                ? 'bg-purple-500 shadow-md' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}>
                              <Megaphone className={`h-5 w-5 ${!announcement.isRead ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                            </div>
                            {!announcement.isRead && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold truncate ${!announcement.isRead ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                {announcement.title}
                              </h3>
                              {!announcement.isRead && (
                                <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                                  Baru
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(announcement.createdAt), "dd MMM yyyy HH:mm")}</span>
                              {announcement.imageUrls && announcement.imageUrls.length > 0 && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <ImageIcon className="h-3 w-3" />
                                  <span>{announcement.imageUrls.length} foto</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`h-5 w-5 flex-shrink-0 ${!announcement.isRead ? 'text-purple-500' : 'text-gray-400'}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300 font-semibold text-lg mb-2">
                        Tidak Ada Pemberitahuan
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Belum ada pengumuman dari admin saat ini
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dialog Detail Pengumuman - Fullscreen Mobile Optimized */}
            <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
              <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg h-[90vh] max-h-[90vh] p-0 overflow-hidden rounded-xl">
                <DialogHeader className="bg-gradient-to-r from-[#DF2A33] to-[#96161C] text-white p-3 sm:p-4 sticky top-0 z-10">
                  <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 pr-8">
                    <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="line-clamp-2">{selectedAnnouncement?.title}</span>
                  </DialogTitle>
                  <div className="text-purple-100 text-xs sm:text-sm flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{selectedAnnouncement && format(new Date(selectedAnnouncement.createdAt), "dd MMM yyyy HH:mm")}</span>
                    </div>
                    <span className="text-purple-200 hidden sm:inline">•</span>
                    <span className="text-purple-200 w-full sm:w-auto">Oleh: {selectedAnnouncement?.createdByName}</span>
                  </div>
                </DialogHeader>
                <ScrollArea className="h-[calc(90vh-100px)] sm:h-[calc(90vh-120px)]">
                  <div className="p-3 sm:p-4 space-y-4">
                    {/* Images - Full Width with Tap to Zoom */}
                    {selectedAnnouncement?.imageUrls && selectedAnnouncement.imageUrls.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Ketuk gambar untuk memperbesar
                        </p>
                        {selectedAnnouncement.imageUrls.map((url, idx) => (
                          <div 
                            key={idx} 
                            className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer active:opacity-80 transition-opacity shadow-md"
                            onClick={() => setFullscreenImage(url)}
                          >
                            <img 
                              src={url} 
                              alt={`${selectedAnnouncement.title} - ${idx + 1}`}
                              className="w-full h-auto object-contain"
                              style={{ maxHeight: '50vh' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Content - Better Typography for Mobile */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                        {selectedAnnouncement?.content}
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Fullscreen Image Viewer */}
            {fullscreenImage && (
              <div 
                className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-2"
                onClick={() => setFullscreenImage(null)}
              >
                <button 
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                  onClick={() => setFullscreenImage(null)}
                >
                  <X className="h-6 w-6" />
                </button>
                <img 
                  src={fullscreenImage} 
                  alt="Fullscreen view"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{ 
                    maxWidth: '100vw', 
                    maxHeight: '95vh',
                    width: 'auto',
                    height: 'auto'
                  }}
                />
                <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm">
                  Ketuk di mana saja untuk menutup
                </p>
              </div>
            )}

            {activeTab === 'simper' && (
              <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg">
                <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-white">
                    <div className="p-2 bg-red-500 rounded-full">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    Data SIMPER Monitoring
                  </CardTitle>
                  <CardDescription className="text-red-600 dark:text-red-300 font-medium">
                    Status SIMPER BIB dan TIA untuk {searchEmployee.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {simperLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-red-500 mx-auto"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold mt-4">Loading SIMPER data...</p>
                      <p className="text-gray-400 text-sm mt-2">Mengambil data SIMPER terbaru...</p>
                    </div>
                  ) : simperData ? (
                    <div className="space-y-6">
                      {/* Employee Info */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3">Informasi Karyawan</h3>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Nama:</span>
                            <span className="font-semibold text-gray-800 dark:text-white">{simperData.employeeName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">NIK:</span>
                            <span className="font-semibold text-gray-800 dark:text-white">{simperData.nik}</span>
                          </div>
                        </div>
                      </div>

                      {/* SIMPER Status Cards */}
                      <div className="space-y-4">
                        {/* SIMPER BIB */}
                        <div className="border-2 border-blue-100 dark:border-blue-800 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#DF2A33]/20 dark:to-[#96161C]/20">
                          <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-600" />
                            SIMPER BIB
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Tanggal Expired:</span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                {formatDateDD_MM_YYYY(simperData.simperBibExpiredDate)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Monitoring Days:</span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                {simperData.bibMonitoringDays !== null ? `${simperData.bibMonitoringDays} hari` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Status:</span>
                              <Badge className={getSimperStatusColor(simperData.bibStatus || 'Tidak Ada Data') + ' px-3 py-1 rounded-full font-semibold'}>
                                {simperData.bibStatus || 'Tidak Ada Data'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* SIMPER TIA */}
                        <div className="border-2 border-border rounded-xl p-4 bg-gradient-to-r from-primary to-primary dark:from-primary dark:to-primary">
                          <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-foreground" />
                            SIMPER TIA
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Tanggal Expired:</span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                {formatDateDD_MM_YYYY(simperData.simperTiaExpiredDate)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Monitoring Days:</span>
                              <span className="font-semibold text-gray-800 dark:text-white">
                                {simperData.tiaMonitoringDays !== null ? `${simperData.tiaMonitoringDays} hari` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 text-sm">Status:</span>
                              <Badge className={getSimperStatusColor(simperData.tiaStatus || 'Tidak Ada Data') + ' px-3 py-1 rounded-full font-semibold'}>
                                {simperData.tiaStatus || 'Tidak Ada Data'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alert untuk status kritis */}
                      {(simperData.bibStatus === 'Segera Perpanjang' || simperData.tiaStatus === 'Segera Perpanjang' ||
                        simperData.bibStatus === 'Mendekati Perpanjangan' || simperData.tiaStatus === 'Mendekati Perpanjangan') && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-4">
                          <div className="flex items-center mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                            <span className="font-bold text-red-800 dark:text-red-200">Peringatan SIMPER</span>
                          </div>
                          <p className="text-red-700 dark:text-red-300 text-sm">
                            Ada SIMPER yang akan expired dalam waktu dekat. Segera lakukan perpanjangan.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300 font-semibold text-lg mb-2">
                        Data SIMPER Tidak Ditemukan
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Karyawan {searchEmployee.name} belum terdaftar dalam sistem monitoring SIMPER
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </>
        )}
      </div>
    </div>
  );
}