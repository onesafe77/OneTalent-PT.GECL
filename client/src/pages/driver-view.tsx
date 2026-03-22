import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, User, Calendar, Clock, MapPin, Shield, AlertTriangle, Loader2, Bell, ChevronLeft, ChevronRight as ChevronRightIcon, Share2, RefreshCw, Edit, Megaphone, Eye, Image as ImageIcon } from "lucide-react";
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
  plannedNomorLambung?: string | null;
  actualNomorLambung?: string | null;
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

export default function DriverView() {
  const [nik, setNik] = useState("");
  const [debouncedNik, setDebouncedNik] = useState("");
  const [searchEmployee, setSearchEmployee] = useState<Employee | null>(null);
  const [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'leave' | 'pemberitahuan' | 'simper'>('roster');
  const [isSearching, setIsSearching] = useState(false);

  // Roster filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedShift, setSelectedShift] = useState<string>("all");

  // State untuk dialog pengumuman
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);

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

        if (diffDays < 0) return { days: diffDays, status: 'EXPIRED' };
        if (diffDays <= 60) return { days: diffDays, status: 'NEAR EXPIRED' };
        return { days: diffDays, status: 'ACTIVE' };
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

  // Query untuk pengumuman aktif dengan status baca
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<Announcement[]>({
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

  // Query untuk unread count
  const { data: unreadCountData } = useQuery<{ count: number }>({
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

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNik(nik);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [nik]);

  // Auto-populate NIK dari URL parameter (untuk QR scan redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const scannedNik = urlParams.get('nik');

    if (scannedNik && employees && Array.isArray(employees) && employees.length > 0) {
      setNik(scannedNik);
      // Jangan hapus URL parameter agar stabil untuk mobile scanning
      // Biarkan parameter NIK tetap di URL untuk stabilitas
    }
  }, [employees]);

  // Auto search when debounced value changes
  useEffect(() => {
    if (debouncedNik.trim() && employees) {
      handleSearch();
    } else {
      setSuggestions([]);
      setSearchEmployee(null);
    }
  }, [debouncedNik, employees]);

  const handleSearch = useCallback(() => {
    if (!debouncedNik.trim()) return;

    setIsSearching(true);
    const employeeList = employees as Employee[] || [];
    const searchTerm = debouncedNik.trim().toLowerCase();

    const employee = employeeList.find((emp: Employee) => {
      // Cari berdasarkan NIK (exact match)
      if (emp.id.toLowerCase() === searchTerm) return true;

      // Cari berdasarkan nama (partial match)
      if (emp.name.toLowerCase().includes(searchTerm)) return true;

      // Cari berdasarkan posisi jika ada
      if (emp.position && emp.position.toLowerCase().includes(searchTerm)) return true;

      return false;
    });

    // Generate suggestions for partial matches
    if (!employee && searchTerm.length > 2) {
      const matchedEmployees = employeeList.filter((emp: Employee) => {
        return emp.name.toLowerCase().includes(searchTerm) ||
          emp.id.toLowerCase().includes(searchTerm) ||
          (emp.position && emp.position.toLowerCase().includes(searchTerm));
      }).slice(0, 5);
      setSuggestions(matchedEmployees);
    } else {
      setSuggestions([]);
    }

    setSearchEmployee(employee || null);
    setIsSearching(false);
  }, [debouncedNik, employees]);

  const employeeRoster = (rosterData as RosterSchedule[]) || [];

  const leaveList = leaveData as LeaveRequest[] || [];
  const employeeLeaves = leaveList.filter((leave: LeaveRequest) =>
    leave.employeeId === searchEmployee?.id
  );

  const getShiftBadgeColor = (shift: string) => {
    return shift === "Shift 1" ? "bg-blue-500" : "bg-orange-500";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "present": return "bg-green-500";
      case "scheduled": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "approved": return "bg-green-500";
      case "rejected": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getSimperStatusColor = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'NEAR EXPIRED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Red Header Bar */}
      <div className="bg-gradient-to-r from-[#E53935] to-red-600 text-white py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Driver View</h1>
          </div>
          <p className="text-red-100 text-sm">Employee Data & Monitoring System</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Loading State untuk employees */}
        {employeesLoading && (
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#E53935]"></div>
                <p className="text-gray-600 dark:text-gray-300 font-semibold">Loading employee data...</p>
                <p className="text-gray-400 text-sm">Memuat data karyawan dari server...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Section - Simplified */}
        {!employeesLoading && (
          <Card className="shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">melihat data lengkap</p>
              <div className="relative">
                <Input
                  placeholder="C-041687"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  data-testid="input-nik-search"
                  className="text-base"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                )}

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 mt-1">
                    {suggestions.map((emp) => (
                      <div
                        key={emp.id}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        onClick={() => {
                          setNik(emp.name);
                          setSearchEmployee(emp);
                          setSuggestions([]);
                        }}
                      >
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          NIK: {emp.id} | {emp.position} | {emp.department}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {nik && !searchEmployee && (
                <div className="text-red-500 text-sm mt-2">
                  <p>Karyawan dengan kata kunci "{nik}" tidak ditemukan</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Employee Info Card - New Mobile Design */}
        {searchEmployee && (
          <>
            <Card className="shadow-md bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Blue Circular Avatar */}
                  <Avatar className="h-14 w-14 bg-blue-500">
                    <AvatarFallback className="bg-blue-500 text-white text-lg font-bold">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Employee Info */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {searchEmployee.name}
                    </h2>
                    <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm mb-4">
                      NIK: {searchEmployee.id}
                    </p>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">POSISI</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{searchEmployee.position}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">DEPARTMENT</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{searchEmployee.department}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">INVESTOR GROUP</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{searchEmployee.investorGroup}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Horizontal Scrollable Pill Tabs */}
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
              <Button
                variant={activeTab === 'roster' ? "default" : "outline"}
                onClick={() => setActiveTab('roster')}
                className={`flex-none rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'roster'
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                data-testid="tab-roster"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Roster
              </Button>
              <Button
                variant={activeTab === 'leave' ? "default" : "outline"}
                onClick={() => setActiveTab('leave')}
                className={`flex-none rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'leave'
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                data-testid="tab-leave"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Cuti
              </Button>
              <Button
                variant={activeTab === 'pemberitahuan' ? "default" : "outline"}
                onClick={() => setActiveTab('pemberitahuan')}
                className={`flex-none rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 relative ${activeTab === 'pemberitahuan'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                data-testid="tab-pemberitahuan"
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Pemberitahuan
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'simper' ? "default" : "outline"}
                onClick={() => setActiveTab('simper')}
                className={`flex-none rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'simper'
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                data-testid="tab-simper"
              >
                <Shield className="h-4 w-4 mr-2" />
                SIMPER
              </Button>
            </div>

            {/* Tab Content - Mobile Optimized */}
            <div className="mt-4">
              {/* Roster Tab */}
              {activeTab === 'roster' && (
                <div className="space-y-4">
                  {/* Section Header with Green Icon */}
                  <Card className="bg-white dark:bg-gray-800 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-500 rounded-lg p-2">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Jadwal Roster Kerja</h3>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Daftar jadwal kerja untuk {searchEmployee?.name}
                      </p>
                    </CardContent>
                  </Card>

                  {rosterLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#E53935] mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold">Memuat data roster...</p>
                    </div>
                  ) : employeeRoster.length > 0 ? (
                    <>
                      {/* Filter Controls */}
                      <Card className="bg-white dark:bg-gray-800 shadow-md">
                        <CardContent className="p-4 space-y-4">
                          {/* Month and Year Selectors */}
                          <div className="flex gap-3">
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Semua Bulan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Semua Bulan</SelectItem>
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
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="2025" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Shift Filter Pills */}
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <Button
                              variant={selectedShift === 'all' ? 'default' : 'outline'}
                              onClick={() => setSelectedShift('all')}
                              className={`flex-none rounded-full px-4 py-2 text-sm font-semibold ${selectedShift === 'all'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                              Semua Shift
                            </Button>
                            <Button
                              variant={selectedShift === 'Shift 1' ? 'default' : 'outline'}
                              onClick={() => setSelectedShift('Shift 1')}
                              className={`flex-none rounded-full px-4 py-2 text-sm font-semibold ${selectedShift === 'Shift 1'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                              Shift 1
                            </Button>
                            <Button
                              variant={selectedShift === 'Shift 2' ? 'default' : 'outline'}
                              onClick={() => setSelectedShift('Shift 2')}
                              className={`flex-none rounded-full px-4 py-2 text-sm font-semibold ${selectedShift === 'Shift 2'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                              Shift 2
                            </Button>
                            <Button
                              variant={selectedShift === 'Overshift' ? 'default' : 'outline'}
                              onClick={() => setSelectedShift('Overshift')}
                              className={`flex-none rounded-full px-4 py-2 text-sm font-semibold ${selectedShift === 'Overshift'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                              Overshift
                            </Button>
                            <Button
                              variant={selectedShift === 'Cuti' ? 'default' : 'outline'}
                              onClick={() => setSelectedShift('Cuti')}
                              className={`flex-none rounded-full px-4 py-2 text-sm font-semibold ${selectedShift === 'Cuti'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                              Cuti
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Vertical Roster List */}
                      {(() => {
                        // Filter roster data
                        const filteredRoster = employeeRoster
                          .filter((roster: RosterSchedule) => {
                            const rosterDate = new Date(roster.date);
                            const month = (rosterDate.getMonth() + 1).toString();
                            const year = rosterDate.getFullYear().toString();

                            const monthMatch = selectedMonth === 'all' || month === selectedMonth;
                            const yearMatch = year === selectedYear;

                            // Smart shift filtering: normalize and match shift values
                            let shiftMatch = false;
                            if (selectedShift === 'all') {
                              shiftMatch = true;
                            } else {
                              // Normalize both selected filter and roster shift for comparison
                              const normalizeShift = (shift: string) => shift.toUpperCase().replace(/\s+/g, ' ').trim();
                              const normalizedRosterShift = normalizeShift(roster.shift || '');
                              const normalizedSelectedShift = normalizeShift(selectedShift);

                              // Handle different shift formats:
                              // "Shift 1" matches "SHIFT 1"
                              // "Shift 2" matches "SHIFT 2"
                              // "Overshift" matches "OVER SHIFT"
                              // "Cuti" matches "CUTI"
                              if (normalizedSelectedShift === 'OVERSHIFT' || normalizedSelectedShift === 'OVER SHIFT') {
                                shiftMatch = normalizedRosterShift === 'OVER SHIFT' || normalizedRosterShift === 'OVERSHIFT';
                              } else {
                                shiftMatch = normalizedRosterShift === normalizedSelectedShift;
                              }
                            }

                            return monthMatch && yearMatch && shiftMatch;
                          })
                          .sort((a: RosterSchedule, b: RosterSchedule) =>
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                          );

                        if (filteredRoster.length === 0) {
                          return (
                            <div className="text-center py-16">
                              <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                              <p className="text-xl text-gray-500 font-semibold">Tidak ada jadwal ditemukan</p>
                              <p className="text-gray-400 mt-2">Tidak ada data roster untuk filter yang dipilih</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {filteredRoster.map((roster: RosterSchedule) => {
                              const isToday = roster.date === format(new Date(), 'yyyy-MM-dd');

                              return (
                                <Card
                                  key={roster.id}
                                  className={`${isToday
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 border-2'
                                    : 'bg-white dark:bg-gray-800'
                                    } shadow-md`}
                                  data-testid={`roster-card-${roster.id}`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                          {format(new Date(roster.date), "dd MMM yyyy")}
                                          {isToday && (
                                            <Badge className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5">
                                              Hari Ini
                                            </Badge>
                                          )}
                                        </h4>
                                        <div className="flex gap-2 flex-wrap">
                                          <Badge
                                            className={`${roster.shift.toUpperCase().includes('SHIFT 2')
                                              ? 'bg-orange-500'
                                              : roster.shift.toUpperCase().includes('OVER')
                                                ? 'bg-purple-500'
                                                : roster.shift.toUpperCase().includes('CUTI')
                                                  ? 'bg-yellow-500'
                                                  : 'bg-blue-500'
                                              } text-white px-2 py-1 text-xs font-bold uppercase rounded-full`}
                                          >
                                            {roster.shift}
                                          </Badge>
                                          <Badge className="bg-blue-500 text-white px-2 py-1 text-xs font-semibold rounded-full">
                                            {roster.status}
                                          </Badge>
                                          {/* Nomor Lambung Change Indicator */}
                                          {roster.actualNomorLambung && roster.plannedNomorLambung &&
                                            roster.actualNomorLambung !== roster.plannedNomorLambung && (
                                              <Badge
                                                className="bg-amber-600 text-white px-2 py-1 text-xs font-bold rounded-full"
                                                data-testid={`nomor-lambung-changed-badge-${roster.id}`}
                                              >
                                                📦 Nomor Lambung Berubah
                                              </Badge>
                                            )}
                                        </div>
                                      </div>
                                      <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                                          {roster.startTime} - {roster.endTime}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                        {roster.fitToWork}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl text-gray-500 font-semibold">Tidak ada data roster ditemukan</p>
                      <p className="text-gray-400 mt-2">Belum ada jadwal kerja yang terdaftar untuk karyawan ini</p>
                    </div>
                  )}
                </div>
              )}

              {/* Leave Tab */}
              {activeTab === 'leave' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                      <MapPin className="h-7 w-7 mr-3 text-[#E53935]" />
                      Riwayat Cuti
                    </h3>
                    <Badge className="bg-green-100 text-green-800 px-4 py-2">
                      {employeeLeaves.length} Pengajuan Cuti
                    </Badge>
                  </div>

                  {leaveLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#E53935] mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold">Memuat data cuti...</p>
                    </div>
                  ) : employeeLeaves.length > 0 ? (
                    <div className="grid gap-4">
                      {employeeLeaves
                        .sort((a: LeaveRequest, b: LeaveRequest) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .slice(0, 5)
                        .map((leave: LeaveRequest) => (
                          <div key={leave.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-200" data-testid={`leave-item-${leave.id}`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-8 bg-orange-500 rounded-full"></div>
                                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{leave.leaveType}</p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                                    {format(new Date(leave.startDate), "dd MMM yyyy")} - {format(new Date(leave.endDate), "dd MMM yyyy")}
                                  </p>
                                  {leave.reason && (
                                    <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                      <span className="font-semibold">Alasan:</span> {leave.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Badge className={getStatusBadgeColor(leave.status) + " px-4 py-2 text-sm font-bold"}>
                                {leave.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <MapPin className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl text-gray-500 font-semibold">Tidak ada data cuti ditemukan</p>
                      <p className="text-gray-400 mt-2">Belum ada pengajuan cuti yang terdaftar untuk karyawan ini</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pemberitahuan Tab */}
              {activeTab === 'pemberitahuan' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                      <Megaphone className="h-7 w-7 mr-3 text-purple-600" />
                      Pemberitahuan
                      {unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white ml-3">{unreadCount} baru</Badge>
                      )}
                    </h3>
                  </div>
                  <p className="text-purple-600 font-medium mb-4">Informasi dan pengumuman terbaru dari admin</p>

                  {announcementsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold">Memuat pemberitahuan...</p>
                    </div>
                  ) : announcements.length > 0 ? (
                    <div className="space-y-3">
                      {announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${!announcement.isRead
                            ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 shadow-md hover:shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${!announcement.isRead
                              ? 'bg-purple-500 shadow-lg'
                              : 'bg-gray-200 dark:bg-gray-700'
                              }`}>
                              <Megaphone className={`h-7 w-7 ${!announcement.isRead ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                            </div>
                            {!announcement.isRead && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h4 className={`font-bold text-lg truncate ${!announcement.isRead ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                {announcement.title}
                              </h4>
                              {!announcement.isRead && (
                                <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase shadow-sm">
                                  Baru
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {format(new Date(announcement.createdAt), "dd MMM yyyy HH:mm")}
                              </span>
                              {announcement.imageUrls && announcement.imageUrls.length > 0 && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="flex items-center gap-1 text-purple-600">
                                    <ImageIcon className="h-4 w-4" />
                                    {announcement.imageUrls.length} foto
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRightIcon className={`h-6 w-6 flex-shrink-0 ${!announcement.isRead ? 'text-purple-500' : 'text-gray-400'}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Megaphone className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl text-gray-500 font-semibold">Tidak ada pemberitahuan</p>
                      <p className="text-gray-400 mt-2">Belum ada pengumuman dari admin saat ini</p>
                    </div>
                  )}
                </div>
              )}

              {/* Dialog Detail Pengumuman */}
              <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
                  <DialogHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                      <Megaphone className="h-6 w-6" />
                      {selectedAnnouncement?.title}
                    </DialogTitle>
                    <p className="text-purple-100 text-sm flex items-center gap-3 mt-2">
                      <Clock className="h-4 w-4" />
                      {selectedAnnouncement && format(new Date(selectedAnnouncement.createdAt), "dd MMM yyyy HH:mm")}
                      <span className="text-purple-200">•</span>
                      <span>Oleh: {selectedAnnouncement?.createdByName}</span>
                    </p>
                  </DialogHeader>
                  <ScrollArea className="max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">
                      {/* Images */}
                      {selectedAnnouncement?.imageUrls && selectedAnnouncement.imageUrls.length > 0 && (
                        <div className="space-y-4">
                          {selectedAnnouncement.imageUrls.map((url, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-md">
                              <img
                                src={url}
                                alt={`${selectedAnnouncement.title} - ${idx + 1}`}
                                className="w-full object-contain max-h-96"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      <div className="prose prose-lg dark:prose-invert max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-base">
                          {selectedAnnouncement?.content}
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* SIMPER Tab */}
              {activeTab === 'simper' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                      <Shield className="h-7 w-7 mr-3 text-[#E53935]" />
                      Data SIMPER Monitoring
                    </h3>
                  </div>

                  {simperLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#E53935] mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold">Memuat data SIMPER...</p>
                    </div>
                  ) : simperData ? (
                    <div className="space-y-8">
                      {/* Employee Info */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                          <User className="h-6 w-6 mr-3 text-blue-600" />
                          Informasi Karyawan
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300 text-lg">Nama:</span>
                            <span className="ml-3 font-bold text-xl text-gray-800 dark:text-white">{simperData.employeeName}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300 text-lg">NIK:</span>
                            <span className="ml-3 font-bold text-xl text-gray-800 dark:text-white">{simperData.nik}</span>
                          </div>
                        </div>
                      </div>

                      {/* SIMPER Status Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* SIMPER BIB */}
                        <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-lg">
                          <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                            <div className="w-3 h-8 bg-blue-500 rounded-full mr-3"></div>
                            <Shield className="w-6 h-6 mr-3 text-blue-600" />
                            SIMPER BIB
                          </h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">Tanggal Expired:</span>
                              <span className="font-bold text-lg text-gray-800 dark:text-white">
                                {formatDateDD_MM_YYYY(simperData.simperBibExpiredDate)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">Monitoring Days:</span>
                              <span className="font-bold text-lg text-gray-800 dark:text-white">
                                {simperData.bibMonitoringDays !== null ? `${simperData.bibMonitoringDays} hari` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">Status:</span>
                              <Badge className={getSimperStatusColor(simperData.bibStatus || 'Tidak Ada Data') + ' px-4 py-2 text-sm font-bold'}>
                                {simperData.bibStatus || 'Tidak Ada Data'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* SIMPER TIA */}
                        <div className="bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700 rounded-xl p-6 shadow-lg">
                          <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                            <div className="w-3 h-8 bg-green-500 rounded-full mr-3"></div>
                            <Shield className="w-6 h-6 mr-3 text-green-600" />
                            SIMPER TIA
                          </h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">Tanggal Expired:</span>
                              <span className="font-bold text-lg text-gray-800 dark:text-white">
                                {formatDateDD_MM_YYYY(simperData.simperTiaExpiredDate)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">Monitoring Days:</span>
                              <span className="font-bold text-lg text-gray-800 dark:text-white">
                                {simperData.tiaMonitoringDays !== null ? `${simperData.tiaMonitoringDays} hari` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">Status:</span>
                              <Badge className={getSimperStatusColor(simperData.tiaStatus || 'Tidak Ada Data') + ' px-4 py-2 text-sm font-bold'}>
                                {simperData.tiaStatus || 'Tidak Ada Data'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alert untuk status kritis */}
                      {(simperData.bibStatus === 'EXPIRED' || simperData.tiaStatus === 'EXPIRED' ||
                        simperData.bibStatus === 'NEAR EXPIRED' || simperData.tiaStatus === 'NEAR EXPIRED') && (
                          <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-6">
                            <div className="flex items-center mb-3">
                              <AlertTriangle className="w-7 h-7 text-red-600 mr-3" />
                              <span className="text-xl font-bold text-red-800 dark:text-red-200">Peringatan SIMPER</span>
                            </div>
                            <p className="text-red-700 dark:text-red-300 text-lg leading-relaxed">
                              Ada SIMPER yang akan expired dalam waktu dekat. Segera lakukan perpanjangan untuk menghindari masalah operasional.
                            </p>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Shield className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-xl text-gray-500 font-semibold">Data SIMPER tidak ditemukan</p>
                      <p className="text-gray-400 mt-2">Karyawan ini belum terdaftar dalam sistem monitoring SIMPER</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}