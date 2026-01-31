import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permission } from "@shared/rbac";

import Dashboard from "@/pages/dashboard";
import QRGenerator from "@/pages/qr-generator";
import Scanner from "@/pages/scanner";
import EmployeesDashboard from "@/pages/employees-dashboard";
import EmployeesList from "@/pages/employees-list";
import EmployeeDetail from "@/pages/employee-detail";
import Roster from "@/pages/roster";
import Leave from "@/pages/leave";
import LeaveRosterMonitoring from "@/pages/leave-roster-monitoring";
import SimperMonitoring from "@/pages/simper-monitoring";
import MonitoringSimperEvAdmin from "@/pages/monitoring-simper-ev-admin";
import Reports from "@/pages/reports";
import Meetings from "@/pages/meetings";
import MeetingScanner from "@/pages/meeting-scanner";
import DriverView from "@/pages/driver-view";
import MobileDriverView from "@/pages/mobile-driver-view";
import EmployeePersonalData from "@/pages/employee-personal-data";
import HistoryPage from "@/pages/history";
import SidakDashboard from "@/pages/sidak";
import SidakFatigueForm from "@/pages/sidak-fatigue-form";
import SidakRosterForm from "@/pages/sidak-roster-form";
import SidakFatigueHistory from "@/pages/sidak-fatigue-history";
import SidakRosterHistory from "@/pages/sidak-roster-history";
import SidakRecap from "@/pages/sidak-recap";
import SidakHistoryMenu from "@/pages/sidak-history-menu";
import SidakSeatbeltForm from "@/pages/sidak-seatbelt-form";
import SidakSeatbeltHistory from "@/pages/sidak-seatbelt-history";
import SidakRambuForm from "@/pages/sidak-rambu-form";
import SidakRambuHistory from "@/pages/sidak-rambu-history";
import SidakAntrianForm from "@/pages/sidak-antrian-form";
import SidakAntrianHistory from "@/pages/sidak-antrian-history";
import SidakJarakForm from "@/pages/sidak-jarak-form";
import SidakJarakHistory from "@/pages/sidak-jarak-history";
import SidakKecepatanForm from "@/pages/sidak-kecepatan-form";
import SidakKecepatanHistory from "@/pages/sidak-kecepatan-history";
import SidakPencahayaanForm from "@/pages/sidak-pencahayaan-form";
import SidakPencahayaanHistory from "@/pages/sidak-pencahayaan-history";
import SidakLotoForm from "@/pages/sidak-loto-form";
import SidakLotoHistory from "@/pages/sidak-loto-history";
import SidakDigitalForm from "@/pages/sidak-digital-form";
import SidakDigitalHistory from "@/pages/sidak-digital-history";
import SidakWorkshopForm from "@/pages/sidak-workshop-form";
import SidakWorkshopHistory from "@/pages/sidak-workshop-history";
import EvaluasiDriver from "@/pages/evaluasi-driver";
import DashboardOverspeed from "@/pages/dashboard-overspeed";
import DashboardJarak from "@/pages/dashboard-jarak";
import DashboardStatistics from "@/pages/dashboard-statistics";
import GoogleSheetsConfig from "@/pages/google-sheets-config";

import FmsFatigueValidationDashboard from "@/pages/hse/fatigue/dashboard-validation";

import SafetyPatrol from "@/pages/safety-patrol";
import TrainingMaster from "@/pages/hse/tna/training-master";
import TnaInput from "@/pages/hse/tna/tna-input";
import TnaDashboard from "@/pages/hse/tna/tna-dashboard";
import TnaRekap from "@/pages/hse/tna/tna-rekap";
import CompetencyDashboard from "@/pages/hse/tna/competency-dashboard";
import MonitoringKompetensi from "@/pages/hse/tna/monitoring-kompetensi";
import DocumentControl from "@/pages/hse/k3/document-control";
import DocumentDetail from "@/pages/hse/k3/document-detail";
import SiAsefChatPage from "@/pages/si-asef-chat";
import SiAsefAdminPage from "@/pages/si-asef-admin";
import SiAsefProjectsPage from "@/pages/si-asef-projects";
import SiAsefArtifactsPage from "@/pages/si-asef-artifacts";
import Announcements from "@/pages/announcements";
import News from "@/pages/news";
import NewsFeed from "@/pages/news-feed";
import Documents from "@/pages/documents";
import NotFound from "@/pages/not-found";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { WorkspaceHome } from "@/components/WorkspaceHome";
import PushNotificationSimper from "@/pages/push-notification-simper";
import PushNotificationInduction from "@/pages/push-notification-induction";
import BlastWhatsApp from "@/pages/blast-whatsapp";
import ActivityCalendar from "@/pages/activity-calendar";
import FmsDashboard from "@/pages/fms-dashboard";
import McuPage from "@/pages/hse/mcu-page";
import InductionAdmin from "@/pages/hse/induction-admin";
import InductionQuiz from "@/pages/hse/induction-quiz";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MysticWidget } from "@/components/mystic/MysticWidget";


const workspaceRoutes = [
  { path: "/workspace", component: WorkspaceHome, title: "Beranda" },
  { path: "/workspace/dashboard", component: Dashboard, title: "Dashboard Karyawan PT.GECL" },
  { path: "/workspace/qr-generator", component: QRGenerator, title: "Generate QR Code" },
  { path: "/workspace/scanner", component: Scanner, title: "Scan QR Code" },
  { path: "/workspace/employees/dashboard", component: EmployeesDashboard, title: "Dashboard Karyawan" },
  { path: "/workspace/employees/list", component: EmployeesList, title: "List Karyawan" },
  { path: "/workspace/roster", component: Roster, title: "Roster Kerja" },
  { path: "/workspace/leave", component: Leave, title: "Manajemen Cuti" },
  { path: "/workspace/leave-roster-monitoring", component: LeaveRosterMonitoring, title: "Monitoring Roster Cuti" },
  { path: "/workspace/simper-monitoring", component: SimperMonitoring, title: "Monitoring SIMPER Karyawan" },
  { path: "/workspace/monitoring-simper-ev-admin", component: MonitoringSimperEvAdmin, title: "Admin Monitoring Simper EV" },
  { path: "/workspace/reports", component: Reports, title: "Laporan" },
  { path: "/workspace/meetings", component: Meetings, title: "Meeting Management" },
  { path: "/workspace/meeting-scanner", component: MeetingScanner, title: "Scan QR Meeting" },
  { path: "/workspace/sidak", component: SidakDashboard, title: "SIDAK - Inspeksi Data Karyawan" },
  { path: "/workspace/sidak/fatigue/new", component: SidakFatigueForm, title: "Form Sidak Fatigue" },
  { path: "/workspace/sidak/roster/new", component: SidakRosterForm, title: "Form Sidak Roster" },
  { path: "/workspace/sidak/fatigue/history", component: SidakFatigueHistory, title: "Riwayat Sidak Fatigue" },
  { path: "/workspace/sidak/roster/history", component: SidakRosterHistory, title: "Riwayat Sidak Roster" },
  { path: "/workspace/sidak/seatbelt/new", component: SidakSeatbeltForm, title: "Form Sidak Seatbelt" },
  { path: "/workspace/sidak/seatbelt/history", component: SidakSeatbeltHistory, title: "Riwayat Sidak Seatbelt" },
  { path: "/workspace/sidak/rambu/new", component: SidakRambuForm, title: "Form Sidak Rambu" },
  { path: "/workspace/sidak/rambu/history", component: SidakRambuHistory, title: "Riwayat Sidak Rambu" },
  { path: "/workspace/sidak/antrian/new", component: SidakAntrianForm, title: "Form Sidak Antrian" },
  { path: "/workspace/sidak/antrian/history", component: SidakAntrianHistory, title: "Riwayat Sidak Antrian" },
  { path: "/workspace/sidak/jarak/new", component: SidakJarakForm, title: "Form Sidak Jarak Aman" },
  { path: "/workspace/sidak/jarak/history", component: SidakJarakHistory, title: "Riwayat Sidak Jarak Aman" },
  { path: "/workspace/sidak/kecepatan/new", component: SidakKecepatanForm, title: "Form Sidak Kecepatan" },
  { path: "/workspace/sidak/kecepatan/history", component: SidakKecepatanHistory, title: "Riwayat Sidak Kecepatan" },
  { path: "/workspace/sidak/pencahayaan/new", component: SidakPencahayaanForm, title: "Form Sidak Pencahayaan" },
  { path: "/workspace/sidak/pencahayaan/history", component: SidakPencahayaanHistory, title: "Riwayat Sidak Pencahayaan" },
  { path: "/workspace/sidak/loto/new", component: SidakLotoForm, title: "Form Sidak LOTO" },
  { path: "/workspace/sidak/loto/history", component: SidakLotoHistory, title: "Riwayat Sidak LOTO" },
  { path: "/workspace/sidak/digital/new", component: SidakDigitalForm, title: "Form Sidak Digital" },
  { path: "/workspace/sidak/digital/history", component: SidakDigitalHistory, title: "Riwayat Sidak Digital" },
  { path: "/workspace/sidak/workshop/new", component: SidakWorkshopForm, title: "Form Sidak Workshop" },
  { path: "/workspace/sidak/workshop/history", component: SidakWorkshopHistory, title: "Riwayat Sidak Workshop" },
  { path: "/workspace/sidak/rekap", component: SidakRecap, title: "Rekap Kegiatan SIDAK" },
  { path: "/workspace/safety-patrol", component: SafetyPatrol, title: "Safety Patrol Dashboard" },
  { path: "/workspace/evaluasi-driver", component: EvaluasiDriver, title: "Evaluasi Driver SIDAK Fatigue" },
  { path: "/workspace/announcements", component: Announcements, title: "Kelola Pengumuman" },
  { path: "/workspace/news", component: News, title: "Kelola Berita" },
  { path: "/workspace/news-feed", component: NewsFeed, title: "Berita Perusahaan" },
  { path: "/workspace/documents", component: Documents, title: "Dokumen Perusahaan" },
  { path: "/workspace/documents/kebijakan-kplh", component: Documents, title: "Dokumen - Kebijakan KPLH" },
  { path: "/workspace/documents/dept-hse", component: Documents, title: "Dokumen - Dept HSE" },
  { path: "/workspace/documents/dept-opr", component: Documents, title: "Dokumen - Dept Opr" },
  { path: "/workspace/documents/dept-plant", component: Documents, title: "Dokumen - Dept Plant" },
  { path: "/workspace/documents/spdk", component: Documents, title: "Dokumen - SPDK" },
  { path: "/workspace/documents/zero-harm", component: Documents, title: "Dokumen - Zero Harm" },
  { path: "/workspace/documents/critical-control-card", component: Documents, title: "Dokumen - Critical Control Card" },
  { path: "/workspace/documents/golden-rule", component: Documents, title: "Dokumen - Golden Rule" },
  { path: "/workspace/driver-view", component: DriverView, title: "Driver View - Data Karyawan" },
  { path: "/workspace/mobile-driver", component: MobileDriverView, title: "Driver Mobile View" },
  { path: "/workspace/employee-personal", component: EmployeePersonalData, title: "Data Pribadi Karyawan" },
  { path: "/workspace/push-notification/simper", component: PushNotificationSimper, title: "Push Notifikasi SIMPER" },
  { path: "/workspace/push-notification-induction", component: PushNotificationInduction, title: "Push Notifikasi Induksi" },
  { path: "/workspace/activity-calendar", component: ActivityCalendar, title: "Activity Calendar (Mystic AI)" },

  // Mystic Routes
  { path: "/workspace/si-asef", component: SiAsefChatPage, title: "Mystic Chat" },
  { path: "/workspace/si-asef/admin", component: SiAsefAdminPage, title: "Mystic Knowledge Base" },
  { path: "/workspace/si-asef/projects", component: SiAsefProjectsPage, title: "Mystic Projects" },
  { path: "/workspace/si-asef/artifacts", component: SiAsefArtifactsPage, title: "Mystic Artifacts" },
  { path: "/workspace/hse/fms-dashboard", component: FmsDashboard, title: "FMS Violation Command Center" },
  { path: "/workspace/hse/induction-admin", component: InductionAdmin, title: "Admin Induksi K3" },
  { path: "/workspace/hse/induction-quiz", component: InductionQuiz, title: "Quiz Induksi K3" },
];

export function Workspace() {
  // Initialize based on window width - Default OPEN for desktop, CLOSED for mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isLoading, setIsLoading] = useState(true);

  // Handle resize events to auto-adjust if needed (optional UX polisher)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false); // Auto-close on small screens
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentTitle = () => {
    const currentPath = window.location.pathname;
    const route = workspaceRoutes.find(r => r.path === currentPath);
    if (route) return route.title;

    // Dynamic matching for detail pages
    if (currentPath.includes('/hse/k3/document/')) return "Detail Dokumen";
    if (currentPath.includes('/employees/')) return "Detail Karyawan";

    return "AttendanceQR Workspace";
  };

  // Loading state is now controlled by LoadingScreen's onComplete callback
  // No external timer needed - LoadingScreen handles its own timing

  return (
    <div className="relative">
      {/* Loading Screen dengan conditional rendering yang lebih aman */}
      {isLoading && (
        <LoadingScreen
          isLoading={isLoading}
          onComplete={() => setIsLoading(false)}
        />
      )}

      {/* Notification Prompt - muncul setelah loading selesai */}
      {!isLoading && <NotificationPrompt />}

      {/* Workspace Content - selalu render tapi invisible saat loading */}
      <div
        className={`h-screen flex bg-gray-50 dark:bg-gray-900 transition-opacity duration-300 ${isLoading ? 'opacity-100 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
      >
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
          <Header
            title={getCurrentTitle()}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-0 sm:p-4 lg:p-6 pb-20 sm:pb-4 lg:pb-6">
            <Switch>
              <Route path="/workspace" component={WorkspaceHome} />
              <Route path="/workspace/dashboard" component={Dashboard} />
              <Route path="/workspace/qr-generator">
                <PermissionGuard requiredPermissions={[Permission.VIEW_QR, Permission.GENERATE_QR]} requireAll={true}>
                  <QRGenerator />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/scanner">
                <PermissionGuard requiredPermissions={[Permission.SCAN_QR]}>
                  <Scanner />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/employees/dashboard" component={EmployeesDashboard} />
              <Route path="/workspace/employees/list" component={EmployeesList} />
              <Route path="/workspace/employees/:id" component={EmployeeDetail} />
              <Route path="/workspace/roster" component={Roster} />
              <Route path="/workspace/leave" component={Leave} />
              <Route path="/workspace/leave-roster-monitoring" component={LeaveRosterMonitoring} />
              <Route path="/workspace/simper-monitoring" component={SimperMonitoring} />
              <Route path="/workspace/monitoring-simper-ev-admin" component={MonitoringSimperEvAdmin} />
              <Route path="/workspace/reports" component={Reports} />
              <Route path="/workspace/meetings">
                <PermissionGuard requiredPermissions={[Permission.VIEW_MEETING]}>
                  <Meetings />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/meeting-scanner">
                <PermissionGuard requiredPermissions={[Permission.VIEW_MEETING, Permission.SCAN_QR]} requireAll={true}>
                  <MeetingScanner />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/sidak" component={SidakDashboard} />
              <Route path="/workspace/history" component={HistoryPage} />
              <Route path="/workspace/sidak/fatigue/new" component={SidakFatigueForm} />
              <Route path="/workspace/sidak/roster/new" component={SidakRosterForm} />
              <Route path="/workspace/sidak/seatbelt/new" component={SidakSeatbeltForm} />
              <Route path="/workspace/sidak/fatigue/history" component={SidakFatigueHistory} />
              <Route path="/workspace/sidak/roster/history" component={SidakRosterHistory} />
              <Route path="/workspace/sidak/seatbelt/history" component={SidakSeatbeltHistory} />
              <Route path="/workspace/sidak/rambu/new" component={SidakRambuForm} />
              <Route path="/workspace/sidak/rambu/history" component={SidakRambuHistory} />
              <Route path="/workspace/sidak/antrian/new" component={SidakAntrianForm} />
              <Route path="/workspace/sidak/antrian/history" component={SidakAntrianHistory} />
              <Route path="/workspace/sidak/jarak/new" component={SidakJarakForm} />
              <Route path="/workspace/sidak/jarak/history" component={SidakJarakHistory} />
              <Route path="/workspace/sidak/kecepatan/new" component={SidakKecepatanForm} />
              <Route path="/workspace/sidak/kecepatan/history" component={SidakKecepatanHistory} />
              <Route path="/workspace/sidak/pencahayaan/new" component={SidakPencahayaanForm} />
              <Route path="/workspace/sidak/pencahayaan/history" component={SidakPencahayaanHistory} />
              <Route path="/workspace/sidak/loto/new" component={SidakLotoForm} />
              <Route path="/workspace/sidak/loto/history" component={SidakLotoHistory} />
              <Route path="/workspace/sidak/digital/new" component={SidakDigitalForm} />
              <Route path="/workspace/sidak/digital/history" component={SidakDigitalHistory} />
              <Route path="/workspace/sidak/workshop/new" component={SidakWorkshopForm} />
              <Route path="/workspace/sidak/workshop/history" component={SidakWorkshopHistory} />
              <Route path="/workspace/sidak/riwayat">
                <PermissionGuard requiredPermissions={[Permission.VIEW_SIDAK]}>
                  <SidakHistoryMenu />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/sidak/rekap">
                <PermissionGuard requiredPermissions={[Permission.VIEW_SIDAK]}>
                  <SidakRecap />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/safety-patrol">
                <PermissionGuard requiredPermissions={[Permission.MANAGE_EMPLOYEES]}>
                  <SafetyPatrol />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/evaluasi-driver" component={EvaluasiDriver} />
              <Route path="/workspace/announcements">
                <PermissionGuard requiredPermissions={[Permission.MANAGE_EMPLOYEES]}>
                  <Announcements />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/news">
                <PermissionGuard requiredPermissions={[Permission.MANAGE_EMPLOYEES]}>
                  <News />
                </PermissionGuard>
              </Route>
              <Route path="/workspace/news-feed" component={NewsFeed} />
              <Route path="/workspace/documents" component={Documents} />
              <Route path="/workspace/documents/:category" component={Documents} />
              <Route path="/workspace/driver-view" component={DriverView} />
              <Route path="/workspace/mobile-driver" component={MobileDriverView} />
              <Route path="/workspace/employee-personal" component={EmployeePersonalData} />
              <Route path="/workspace/hse/overspeed" component={DashboardOverspeed} />
              <Route path="/workspace/hse/jarak" component={DashboardJarak} />
              <Route path="/workspace/hse/fatigue-validation" component={FmsFatigueValidationDashboard} />
              <Route path="/workspace/hse/statistics" component={DashboardStatistics} />
              <Route path="/workspace/settings/google-sheets" component={GoogleSheetsConfig} />

              {/* TNA Routes */}
              <Route path="/workspace/hse/tna/trainings" component={TrainingMaster} />
              <Route path="/workspace/hse/tna/input" component={TnaInput} />
              <Route path="/workspace/hse/tna/dashboard" component={TnaDashboard} />
              <Route path="/workspace/hse/tna/rekap" component={TnaRekap} />
              <Route path="/workspace/hse/tna/monitoring" component={MonitoringKompetensi} />

              {/* Mystic AI Chatbot Routes */}
              <Route path="/workspace/si-asef" component={SiAsefChatPage} />
              <Route path="/workspace/si-asef/admin" component={SiAsefAdminPage} />

              {/* Document Control Routes */}
              <Route path="/workspace/hse/k3/document-control" component={DocumentControl} />
              <Route path="/workspace/hse/k3/document/:id" component={DocumentDetail} />

              {/* Push Notification Routes */}
              <Route path="/workspace/push-notification/simper" component={PushNotificationSimper} />
              <Route path="/workspace/push-notification-induction" component={PushNotificationInduction} />
              <Route path="/workspace/blast-whatsapp" component={BlastWhatsApp} />

              <Route path="/workspace/activity-calendar" component={ActivityCalendar} />

              <Route path="/workspace/hse/fms-dashboard" component={FmsDashboard} />
              <Route path="/workspace/hse/induction-admin" component={InductionAdmin} />
              <Route path="/workspace/hse/induction-quiz" component={InductionQuiz} />
              <Route path="/workspace/hse/mcu" component={McuPage} />

              <Route component={Dashboard} />
            </Switch>
          </main>

          <BottomNav />
        </div>
      </div>

      {/* Floating Mystic Assistant Widget (Desktop Only by default logic, but can be responsive) */}
      <div className="hidden lg:block">
        <MysticWidget />
      </div>
    </div>
  );
}