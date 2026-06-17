import { LucideIcon } from "lucide-react";
import { Permission } from "@shared/rbac";
import {
    Users,
    QrCode,
    Scan,
    Calendar,
    FileText,
    BarChart3,
    ClipboardList,
    Monitor,
    Video,
    Smartphone,
    Shield,
    ClipboardCheck,
    TrendingUp,
    AlertTriangle,
    Megaphone,
    Newspaper,
    FolderOpen,
    HardHat,
    Settings,
    Activity,
    Lock,
    Bot,
    MessageSquare,
    Database,
    Bell,
    Car,
    BookOpen,
    Zap,
    PenTool,
    Plus,
    UserCheck,
    LayoutGrid,
    Building2,
    LayoutDashboard,
    GitCompare,
    ListChecks,
    Inbox
} from "lucide-react";

export interface NavItem {
    name: string;
    href?: string;
    icon?: LucideIcon;
    requiredPermissions?: Permission[];
    requireAll?: boolean;
    children?: NavItem[];
    badgeCount?: number;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
    {
        title: "Utama",
        items: [
            { name: "Berita", href: "/workspace/news-feed", icon: Newspaper },
            { name: "Dashboard", href: "/workspace/dashboard", icon: BarChart3, requiredPermissions: [Permission.VIEW_DASHBOARD] },
            {
                name: "Mystic AI",
                icon: Bot,
                children: [
                    { name: "Chat Regulasi", href: "/workspace/si-asef", icon: MessageSquare },
                    { name: "Activity Calendar", href: "/workspace/activity-calendar", icon: Calendar },
                    { name: "Projects", href: "/workspace/si-asef/projects", icon: FolderOpen },
                    { name: "Artifacts", href: "/workspace/si-asef/artifacts", icon: FileText },
                    { name: "Knowledge Base", href: "/workspace/si-asef/admin", icon: Database, requiredPermissions: [Permission.MANAGE_EMPLOYEES] }
                ]
            },
            {
                name: "OneSign",
                icon: PenTool,
                children: [
                    { name: "Dashboard", href: "/workspace/usign", icon: BarChart3 },
                    { name: "Buat Permintaan", href: "/workspace/usign/request", icon: Plus },
                ]
            },
        ]
    },
    {
        title: "Divisi",
        items: [
            {
                name: "HR",
                icon: Users,
                children: [
                    { name: "Dashboard Karyawan", href: "/workspace/employees/dashboard", icon: BarChart3, requiredPermissions: [Permission.VIEW_EMPLOYEES] },
                    { name: "List Karyawan", href: "/workspace/employees/list", icon: Users, requiredPermissions: [Permission.VIEW_EMPLOYEES] },
                    { name: "Roster", href: "/workspace/roster", icon: Calendar, requiredPermissions: [Permission.VIEW_ROSTER] },
                    { name: "Management Cuti", href: "/workspace/leave-roster-monitoring", icon: Monitor, requiredPermissions: [Permission.VIEW_LEAVE, Permission.MANAGE_LEAVE] },
                    { name: "Generate QR", href: "/workspace/qr-generator", icon: QrCode, requiredPermissions: [Permission.VIEW_QR, Permission.GENERATE_QR] },
                    { name: "Scan QR", href: "/workspace/scanner", icon: Scan, requiredPermissions: [Permission.SCAN_QR] },
                    { name: "Meeting", href: "/workspace/meetings", icon: Video, requiredPermissions: [Permission.VIEW_MEETING] },
                    { name: "Scan Meeting", href: "/workspace/meeting-scanner", icon: Smartphone, requiredPermissions: [Permission.VIEW_MEETING, Permission.SCAN_QR] },
                    { name: "Cuti", href: "/workspace/leave", icon: ClipboardList, requiredPermissions: [Permission.VIEW_LEAVE] },
                    { name: "SIMPER", href: "/workspace/simper-monitoring", icon: Shield, requiredPermissions: [Permission.VIEW_EMPLOYEES, Permission.MANAGE_EMPLOYEES] },
                    { name: "Monitoring Simper EV", href: "/workspace/monitoring-simper-ev-admin", icon: Car, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    { name: "Perpanjangan SIMPER", href: "/workspace/monitoring-simper-perpanjangan", icon: Calendar, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    { name: "Laporan", href: "/workspace/reports", icon: FileText, requiredPermissions: [Permission.VIEW_REPORTS] },
                    { name: "Absensi Induksi", href: "/workspace/hr/induction-attendance", icon: UserCheck, requiredPermissions: [Permission.VIEW_REPORTS] },
                ]
            },
            {
                name: "HSE",
                icon: HardHat,
                children: [
                    {
                        name: "K3",
                        icon: Shield,
                        children: [
                            {
                                name: "Data Keselamatan",
                                icon: BarChart3,
                                children: [
                                    { name: "Statistik Keselamatan", href: "/workspace/hse/statistics", icon: BarChart3, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Dashboard Overspeed", href: "/workspace/hse/overspeed", icon: AlertTriangle, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Dashboard Jarak Aman", href: "/workspace/hse/jarak", icon: TrendingUp, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Monitoring Fatigue", href: "/workspace/hse/fatigue-monitoring", icon: Activity, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "FMS Violation", href: "/workspace/hse/fms-dashboard", icon: Car, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "KPI Validasi FMS", href: "/workspace/hse/fms-violation-validation", icon: TrendingUp, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Evaluasi Investor Group", href: "/workspace/hse/investor-evaluation", icon: Users, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Evaluasi Driver Fatigue", href: "/workspace/hse/evaluasi-driver-fatigue", icon: UserCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                ]
                            },
                            {
                                name: "Kegiatan",
                                icon: Activity,
                                children: [
                                    { name: "Sidak", href: "/workspace/sidak", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Rekap Sidak", href: "/workspace/sidak/rekap", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Evaluasi Driver", href: "/workspace/evaluasi-driver", icon: TrendingUp, requiredPermissions: [Permission.VIEW_EVALUASI] },
                                    { name: "Evaluasi SIDAK Roster", href: "/workspace/hse/evaluasi-roster", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Evaluasi Data PVT", href: "/workspace/hse/evaluasi-pvt", icon: Zap, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Safety Patrol", href: "/workspace/safety-patrol", icon: Shield, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                    { name: "Pengumuman", href: "/workspace/announcements", icon: Megaphone, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                    { name: "Kelola Berita", href: "/workspace/news", icon: Newspaper, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                    { name: "Induksi", href: "/workspace/hse/induction-admin", icon: BookOpen, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Rekaman Pengawas", href: "/workspace/hse/supervisor-recordings", icon: Video, requiredPermissions: [Permission.MANAGE_SIDAK] },
                                    { name: "Reminder Inspeksi", href: "/workspace/sidak/reminder-inspeksi", icon: Bell, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                ]
                            },
                            {
                                name: "TNA",
                                icon: ClipboardList,
                                children: [
                                    { name: "TNA Input", href: "/workspace/hse/tna/input", icon: ClipboardCheck, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                    { name: "TNA Dashboard", href: "/workspace/hse/tna/dashboard", icon: BarChart3, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Monitoring Kompetensi", href: "/workspace/hse/tna/monitoring", icon: Monitor, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Rekap TNA", href: "/workspace/hse/tna/rekap", icon: FileText, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Master Training", href: "/workspace/hse/tna/trainings", icon: FolderOpen, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                ]
                            },
                            {
                                name: "Kesehatan",
                                icon: Activity,
                                children: [
                                    {
                                        name: "MCU",
                                        icon: Activity,
                                        href: "/workspace/hse/mcu",
                                    },
                                    {
                                        name: "Ijin Sakit",
                                        icon: ClipboardList,
                                        href: "/workspace/hse/sick-leave",
                                    }
                                ]
                            },
                        ]
                    },
                    {
                        name: "KO",
                        icon: Settings,
                        children: [
                            {
                                name: "SPIP",
                                icon: FolderOpen,
                                children: [
                                    {
                                        name: "Peralatan",
                                        icon: LayoutGrid,
                                        children: [
                                            { name: "Peralatan Bergerak (HE)", href: "/workspace/hse/ko/spip/peralatan", icon: Car },
                                            { name: "Peralatan Bergerak", href: "/workspace/hse/ko/spip/peralatan/bergerak", icon: Settings },
                                            { name: "Peralatan Tidak Bergerak (Coming Soon)", icon: Lock },
                                        ]
                                    },
                                    { name: "Sarana & Prasarana", href: "/workspace/hse/ko/spip/prasarana", icon: Building2 },
                                    { name: "Instalasi", href: "/workspace/hse/ko/spip/instalasi", icon: Zap }
                                ]
                            }
                        ]
                    },
                    {
                        name: "PICA",
                        icon: AlertTriangle,
                        href: "/workspace/pica",
                        requiredPermissions: [Permission.VIEW_SIDAK]
                    }
                ]
            },
            {
                name: "Dokumen",
                icon: FolderOpen,
                children: [
                    { name: "Dashboard & Masterlist", href: "/workspace/hse/k3/documents", icon: LayoutDashboard, requiredPermissions: [Permission.VIEW_DOCUMENTS] },
                    { name: "Mapping SMKP", href: "/workspace/hse/k3/documents/smkp-mapping", icon: GitCompare, requiredPermissions: [Permission.VIEW_DOCUMENTS] },
                    { name: "Checklist Arsip", href: "/workspace/hse/k3/documents/checklist", icon: ListChecks, requiredPermissions: [Permission.VIEW_DOCUMENTS] },
                    { name: "Approval", href: "/workspace/approvals", icon: Inbox, requiredPermissions: [Permission.VIEW_DOCUMENTS] },
                    { name: "Register Eksternal", href: "/workspace/external-register", icon: BookOpen, requiredPermissions: [Permission.VIEW_DOCUMENTS] },
                ]
            }
        ]
    },
    {
        title: "SIMANTIK",
        items: [
            {
                name: "Zero Harm 2.0",
                icon: Shield,
                requiredPermissions: [Permission.VIEW_DASHBOARD],
                children: [
                    { name: "Dashboard Analitik", href: "/workspace/zero-harm", icon: BarChart3, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                    { name: "Program Monitoring", href: "/workspace/zero-harm/programs", icon: Shield, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                    { name: "Workbook (Excel)", href: "/workspace/zero-harm/workbook", icon: Database, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                    { name: "KPI Program Sidak", href: "/workspace/zero-harm/sidak-kpi", icon: BarChart3, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                    { name: "Plan Kehadiran", href: "/workspace/zero-harm/plan-kehadiran", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                    { name: "Plan Kehadiran Safety Patrol", href: "/workspace/safety-patrol/attendance-plan", icon: Calendar, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                    { name: "Import Data", href: "/workspace/zero-harm/import", icon: Database, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                ]
            }
        ]
    },
    {
        title: "Other",
        items: [
            {
                name: "Push Notifikasi",
                icon: Bell,
                children: [
                    { name: "SIMPER", href: "/workspace/push-notification/simper", icon: Car, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    { name: "Blast WhatsApp", href: "/workspace/blast-whatsapp", icon: MessageSquare, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    { name: "Pengingat Induksi", href: "/workspace/push-notification-induction", icon: Bell, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                ]
            }
        ]
    }
];
