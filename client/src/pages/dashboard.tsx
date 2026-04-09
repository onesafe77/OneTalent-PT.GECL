import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, CheckCircle, Clock, FileText, Calendar, RefreshCw, Search, Bell, Shield, Star, Activity, ChevronRight, Home, ScanLine, MessageSquare, User, LayoutGrid, ArrowUpRight, ClipboardCheck, History as HistoryIcon } from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { navigationGroups } from "@/lib/navigation";
import { SafetyPatrolWidget } from "@/components/dashboard/safety-patrol-widget";
import { InductionWidget } from "@/components/dashboard/induction-widget";
import { FmsWidget } from "@/components/dashboard/fms-widget";
import { SidakWidget } from "@/components/dashboard/sidak-widget";
import { SimperWidget } from "@/components/dashboard/simper-widget";
import { IotSafetyWidget } from "@/components/dashboard/iot-safety-widget";
import { ProjectWidget } from "@/components/dashboard/project-widget";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface DashboardStats {
  totalEmployees: number;
  scheduledToday: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
}

interface RecentActivity {
  id: string;
  employeeId: string;
  employeeName: string;
  time: string;
  jamTidur: string;
  fitToWork: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const { user, hasAnyPermission } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", selectedDate],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: recentActivities, refetch: refetchActivities } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activities", selectedDate],
    staleTime: 30000,
    refetchInterval: 120000,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = ["Safety Talk: Musim Hujan", "Info: Jadwal MCU", "Berita: Zero Harm"];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchActivities();
  }, [refetchStats, refetchActivities]);

  // Chart Data Logic for Desktop
  const chartData = useMemo(() => {
    return {
      labels: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      datasets: [{
        label: 'Kehadiran',
        data: [95, 92, 98, 94, 96],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 8,
      }]
    }
  }, []);

  return (
    <>
      {/* =======================
          MOBILE LAYOUT  (lg:hidden)
          ======================= */}
      <div className="lg:hidden min-h-screen bg-white dark:bg-gray-900 pb-32 space-y-8 relative">
        {/* 1. Header Section */}
        <div className="flex items-center justify-between pt-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/workspace/employee-personal">
              <div className="cursor-pointer">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-gray-100 transition-transform active:scale-95">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} />
                  <AvatarFallback>{(user?.name || 'US').substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </Link>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-0.5">Welcome back,</p>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{user?.name || 'Karyawan'}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 relative text-gray-600 dark:text-gray-300">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></span>
            </Button>
          </div>
        </div>

        {/* 2. Hero Banner - Safety Talk */}
        <div className="px-4 sm:px-6">
          <div className="relative overflow-hidden bg-[#1D2032] dark:bg-[#0f111a] rounded-[2.5rem] p-6 shadow-xl text-white">
            <div className="relative z-10 w-3/4">
              <h3 className="text-2xl font-bold mb-2 leading-tight tracking-tight">Safety Talk: Musim Hujan</h3>
              <p className="text-gray-400 text-xs mb-6 opacity-80 leading-relaxed max-w-[200px]">
                Waspada jalan licin di area tambang Front A. Pastikan unit 4WD aktif saat melintas.
              </p>
              <Button className="bg-[#3b3f54] hover:bg-[#4b5069] text-white rounded-xl text-xs h-10 px-6 backdrop-blur-sm border border-white/10 transition-all font-semibold shadow-lg">
                Baca Briefing
              </Button>
            </div>

            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
              <Shield className="w-48 h-48 text-white" fill="currentColor" />
            </div>
            <div className="absolute top-1/2 right-8 w-2 h-2 bg-blue-500 rounded-full blur-[1px]"></div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
              {slides.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "bg-white w-6" : "bg-white/20"}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* 2.5 Mobile Navigation Grid (Moved from Sidebar) */}
        <div className="px-4 space-y-6">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter(item => {
              if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
              return hasAnyPermission ? hasAnyPermission(item.requiredPermissions) : true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-3 px-1 uppercase tracking-wider">{group.title}</h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.name} href={item.href || '#'} className="flex flex-col items-center gap-2 group">
                        <div className="w-14 h-14 rounded-[1.2rem] bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-white hover:shadow-md hover:scale-105 transition-all duration-200">
                          {Icon && <Icon className="w-6 h-6" />}
                        </div>
                        <span className="text-[11px] font-medium text-center text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 max-w-[64px]">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Circular Categorized Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-6">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Daily Statistics</h3>
            <Button variant="link" className="text-xs text-red-500 font-semibold p-0 h-auto hover:text-red-600">
              See all
            </Button>
          </div>

          <div className="flex justify-between gap-4 overflow-x-auto pb-4 no-scrollbar px-6">
            <div className="flex flex-col items-center gap-3 min-w-[72px] group cursor-pointer snap-center">
              <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shadow-sm group-hover:bg-red-100 transition-colors border border-red-100 dark:border-red-900/30">
                <Users className="w-7 h-7" />
              </div>
              <div className="text-center"><p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Total</p><p className="text-sm font-bold text-gray-900 dark:text-white">{stats?.totalEmployees || 0}</p></div>
            </div>
            <div className="flex flex-col items-center gap-3 min-w-[72px] group cursor-pointer snap-center">
              <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shadow-sm group-hover:bg-blue-100 transition-colors border border-blue-100 dark:border-blue-900/30">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div className="text-center"><p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Hadir</p><p className="text-sm font-bold text-gray-900 dark:text-white">{stats?.presentToday || 0}</p></div>
            </div>
            <div className="flex flex-col items-center gap-3 min-w-[72px] group cursor-pointer snap-center">
              <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 shadow-sm group-hover:bg-green-100 transition-colors border border-green-100 dark:border-green-900/30">
                <Clock className="w-7 h-7" />
              </div>
              <div className="text-center"><p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Belum</p><p className="text-sm font-bold text-gray-900 dark:text-white">{stats?.absentToday || 0}</p></div>
            </div>
            <div className="flex flex-col items-center gap-3 min-w-[72px] group cursor-pointer snap-center">
              <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 shadow-sm group-hover:bg-purple-100 transition-colors border border-purple-100 dark:border-purple-900/30">
                <FileText className="w-7 h-7" />
              </div>
              <div className="text-center"><p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Cuti</p><p className="text-sm font-bold text-gray-900 dark:text-white">{stats?.onLeaveToday || 0}</p></div>
            </div>
          </div>
        </div>

        {/* 4. Recent Activity List */}
        <div className="space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Recent Activity</h3>
            <Button variant="link" className="text-xs text-red-500 font-semibold p-0 h-auto hover:text-red-600">See all</Button>
          </div>
          <div className="space-y-3">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="group flex items-center p-3.5 rounded-[1.25rem] bg-white dark:bg-gray-800 shadow-sm border border-gray-50 dark:border-gray-700/50 hover:border-gray-100 transition-all">
                  <Avatar className="h-12 w-12 mr-3.5 border-2 border-white dark:border-gray-800 shadow-sm">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${activity.employeeName}&background=random`} />
                    <AvatarFallback>{activity.employeeName.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[13px] text-gray-900 dark:text-white truncate pr-2">{activity.employeeName}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{activity.employeeId} • {activity.status}</p>
                    <div className="flex items-center mt-1">
                      <Star className="w-3 h-3 text-orange-400 fill-orange-400 mr-1" />
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Fit: {activity.fitToWork} • {activity.jamTidur} Jam</span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl px-4 h-9 text-[11px] font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">Details</Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">No activity yet</div>
            )}
          </div>
        </div>

        {/* 5. Floating Bottom Navigation */}
        <div className="fixed bottom-6 left-6 right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 flex justify-between items-center z-40 border border-gray-100 dark:border-gray-700">
          <Link href="/workspace/dashboard">
            <Button variant="ghost" size="icon" className="flex flex-col gap-1 h-auto text-red-500 hover:text-red-600 hover:bg-transparent p-0">
              <Home className="w-6 h-6 fill-current" />
              <span className="text-[10px] font-bold">Home</span>
            </Button>
          </Link>
          <Link href="/workspace/sidak">
            <Button variant="ghost" size="icon" className="flex flex-col gap-1 h-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-transparent p-0">
              <ClipboardCheck className="w-6 h-6" />
              <span className="text-[10px] font-medium">Sidak</span>
            </Button>
          </Link>
          <Link href="/workspace/sidak/riwayat">
            <Button variant="ghost" size="icon" className="flex flex-col gap-1 h-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-transparent p-0">
              <HistoryIcon className="w-6 h-6" />
              <span className="text-[10px] font-medium text-nowrap scale-90">Riwayat</span>
            </Button>
          </Link>
          <Link href="/workspace/employee-personal">
            <Button variant="ghost" size="icon" className="flex flex-col gap-1 h-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-transparent p-0">
              <User className="w-6 h-6" />
              <span className="text-[10px] font-medium">Profile</span>
            </Button>
          </Link>
        </div>
      </div>


      {/* =======================
          DESKTOP LAYOUT (hidden lg:block)
          ======================= */}
      <div className="hidden lg:block p-8 space-y-8 bg-gray-50 dark:bg-gray-900/50 min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Command Center</h1>
            <p className="text-muted-foreground mt-1">Integrated Operational Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px] bg-white" />
            <Button onClick={handleRefresh} variant="outline" size="icon" className="bg-white"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* TOP ROW: HR Stats (Existing) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-all duration-200 border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Active
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-all duration-200 border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.presentToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-blue-600">Checked In</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-all duration-200 border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Belum Hadir</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.absentToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-amber-600">Pending</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-all duration-200 border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuti / Izin</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.onLeaveToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-purple-600">On Leave</p>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE SECTION: Operational & Compliance Widgets */}

        {/* Row 1: Operations (Safety Patrol, Sidak, IoT) */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3 h-[320px]">
          <SafetyPatrolWidget />
          <SidakWidget />
          <IotSafetyWidget />
        </div>

        {/* Row 2: Compliance & Management (Induction, Simper, FMS, Project) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 h-[300px]">
          <InductionWidget />
          <SimperWidget />
          <FmsWidget />
          <ProjectWidget />
        </div>

        {/* BOTTOM ROW: Detailed Charts & Logs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Overview Kehadiran</CardTitle>
              <CardDescription>Tren kehadiran karyawan minggu ini.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } }
                  }}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3 border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>Log aktivitas karyawan real-time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivities && recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${activity.employeeName}&background=random`} />
                      <AvatarFallback>OM</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{activity.status} • {activity.id}</p>
                    </div>
                    <div className="ml-auto font-medium text-xs text-right">
                      {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
