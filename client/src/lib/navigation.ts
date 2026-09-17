import { LucideIcon , TableProperties, SquarePen} from "lucide-react";
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
    FolderOpen,
    HardHat,
    Settings,
    Activity,
    HeartPulse,
    Wrench,
    Bot,
    MessageSquare,
    Database,
    History,
    GitBranch,
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
    Scale,
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
            // Beranda kini LANGSUNG halaman chat (lihat pages/beranda.tsx), jadi
            // label induk "Mystic AI" dibuang dan anak-anaknya naik jadi baris datar.
            // Halaman /workspace/si-asef/* tetap hidup dan bisa diakses lewat tautan.
            { name: "Chat baru", href: "/workspace/dashboard", icon: SquarePen },
            // 17 Sep 2026: tab Beranda disisakan chat saja (persiapan agentic RAG).
            // Menu di bawah HANYA disembunyikan — rute & halaman tetap hidup di workspace.tsx.
            // Buka komentar untuk memunculkannya lagi.
            // { name: "Projects", href: "/workspace/si-asef/projects", icon: FolderOpen },
            // { name: "Artifacts", href: "/workspace/si-asef/artifacts", icon: FileText },
            // { name: "Activity Calendar", href: "/workspace/activity-calendar", icon: Calendar },
            // { name: "Knowledge Base", href: "/workspace/si-asef/admin", icon: Database, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
            // { name: "OneSign", icon: PenTool, children: [
            //     { name: "Dashboard", href: "/workspace/usign", icon: BarChart3 },
            //     { name: "Buat Permintaan", href: "/workspace/usign/request", icon: Plus },
            // ] },
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
                    { name: "Kelola Subcon", href: "/workspace/kelola-subcon", icon: HardHat, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    { name: "Roster", href: "/workspace/roster", icon: Calendar, requiredPermissions: [Permission.VIEW_ROSTER] },
                    // "Management Cuti" (/workspace/leave-roster-monitoring) disembunyikan dari menu
                    // 2026-09-01 atas permintaan. Rute & halaman TETAP hidup.
                    // "Generate QR" disembunyikan dari menu 2026-09-01: QR karyawan
                    // hanya dikonsumsi /api/attendance, dan tabel attendance_records
                    // masih 0 baris sejak awal. Halaman & rute /workspace/qr-generator
                    // SENGAJA dibiarkan hidup — cukup buka alamatnya bila diperlukan.
                    // "Scan QR" disembunyikan bersama Generate QR. Rute /workspace/scanner
                    // TETAP hidup — ia juga dipakai memperbarui nomor lambung roster.
                    { name: "Meeting", href: "/workspace/meetings", icon: Video, requiredPermissions: [Permission.VIEW_MEETING] },
                    { name: "Scan Meeting", href: "/workspace/meeting-scanner", icon: Smartphone, requiredPermissions: [Permission.VIEW_MEETING, Permission.SCAN_QR] },
                    // "Cuti" (/workspace/leave) disembunyikan dari menu 2026-09-01.
                    // Rute & halaman TETAP hidup.
                    // "SIMPER" (/workspace/simper-monitoring) disembunyikan dari menu 2026-09-01.
                    // Disembunyikan dari menu 11 Sep 2026 atas permintaan HSE.
                    // Rutenya sengaja dibiarkan hidup di workspace.tsx supaya tautan
                    // lama tetap terbuka; hapus blok ini untuk memunculkannya lagi.
                    // { name: "Monitoring Simper EV", href: "/workspace/monitoring-simper-ev-admin", icon: Car, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    // { name: "Perpanjangan SIMPER", href: "/workspace/monitoring-simper-perpanjangan", icon: Calendar, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                    { name: "Laporan", href: "/workspace/reports", icon: FileText, requiredPermissions: [Permission.VIEW_REPORTS] },
                    { name: "Absensi Induksi", href: "/workspace/hr/induction-attendance", icon: UserCheck, requiredPermissions: [Permission.VIEW_REPORTS] },
                ]
            },
            {
                // K3 & KO dulu membungkus semuanya tanpa punya halaman sendiri, sehingga
                // menu tenggelam 4 tingkat (HSE > K3 > Kesehatan > Rekap MCU). Diratakan
                // langsung di bawah HSE — hanya struktur menu yang berubah, href tetap sama.
                name: "HSE",
                icon: HardHat,
                children: [
                    {
                        name: "Data Keselamatan",
                        icon: BarChart3,
                        children: [
                            {
                                // Modul Incident (acuan PROMPT-HSE-OneTalent.md §5).
                                name: "Incident",
                                icon: AlertTriangle,
                                children: [
                                    { name: "Statistik Keselamatan", href: "/workspace/hse/statistics", icon: BarChart3, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Pengaturan Man Hour", href: "/workspace/hse/manhours", icon: Settings, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Detail Incident", href: "/workspace/hse/incident-detail", icon: TrendingUp, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                    { name: "Report Incident", href: "/workspace/hse/incident-report", icon: FileText, requiredPermissions: [Permission.VIEW_DASHBOARD] },
                                ]
                            },
                            {
                                name: "Violation",
                                icon: AlertTriangle,
                                children: [
                                    {
                                        name: "FMS",
                                        icon: Car,
                                        children: [
                                            { name: "Dashboard FMS", href: "/workspace/hse/overspeed", icon: AlertTriangle, requiredPermissions: [Permission.VIEW_SIDAK] },
                                            { name: "Database Violation FMS", href: "/workspace/hse/fms-database", icon: Database, requiredPermissions: [Permission.VIEW_SIDAK] },
                                        ]
                                    },
                                    {
                                        name: "Safe Distance",
                                        icon: TrendingUp,
                                        children: [
                                            { name: "Dashboard Safe Distance", href: "/workspace/hse/jarak", icon: TrendingUp, requiredPermissions: [Permission.VIEW_SIDAK] },
                                            { name: "Database Violation Safe Distance", href: "/workspace/hse/sd-database", icon: Database, requiredPermissions: [Permission.VIEW_SIDAK] },
                                        ]
                                    },
                                    {
                                        name: "Historical Violation",
                                        icon: History,
                                        children: [
                                            // Karyawan kita saja, dicocokkan ke manpower via NIK.
                                            { name: "Rekam Jejak Karyawan", href: "/workspace/hse/rekam-jejak", icon: UserCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                            // Lintas kontraktor: server menggerbangi ke HSE/HRGA. Izin menu ini
                                            // sengaja lebih ketat dari saudaranya karena isinya data orang luar.
                                            { name: "Semua Kontraktor", href: "/workspace/hse/riwayat-pelanggaran", icon: Building2, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                                        ]
                                    },
                                ]
                            },
                            {
                                name: "Management Fatigue",
                                icon: Activity,
                                children: [
                                    { name: "FMS Validation", href: "/workspace/hse/fms-dashboard", icon: Car, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Monitoring Fatigue", href: "/workspace/hse/fatigue-monitoring", icon: Activity, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Evaluasi Driver Fatigue", href: "/workspace/hse/evaluasi-driver-fatigue", icon: UserCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    // Dipindah dari grup Kegiatan 2026-09-03. Rute & izin tidak diubah.
                                    { name: "Evaluasi Driver", href: "/workspace/evaluasi-driver", icon: TrendingUp, requiredPermissions: [Permission.VIEW_EVALUASI] },
                                    { name: "Evaluasi SIDAK Roster", href: "/workspace/hse/evaluasi-roster", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                                    { name: "Evaluasi Data PVT", href: "/workspace/hse/evaluasi-pvt", icon: Zap, requiredPermissions: [Permission.VIEW_SIDAK] },
                                ]
                            },
                            // Disembunyikan dari sidebar 2026-09-03 atas permintaan. Rutenya SENGAJA
                            // dibiarkan hidup (/workspace/hse/fms-violation-validation dan
                            // /workspace/hse/investor-evaluation) agar tautan lama tidak putus
                            // dan halamannya mudah dimunculkan lagi.
                            // { name: "KPI Validasi FMS", href: "/workspace/hse/fms-violation-validation", icon: TrendingUp, requiredPermissions: [Permission.VIEW_SIDAK] },
                            // { name: "Evaluasi Investor Group", href: "/workspace/hse/investor-evaluation", icon: Users, requiredPermissions: [Permission.VIEW_SIDAK] },
                        ]
                    },
                    {
                        name: "Kegiatan",
                        icon: Activity,
                        children: [
                            { name: "Sidak", href: "/workspace/sidak", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                            { name: "Rekap Sidak", href: "/workspace/sidak/rekap", icon: ClipboardCheck, requiredPermissions: [Permission.VIEW_SIDAK] },
                            { name: "Safety Patrol", href: "/workspace/safety-patrol", icon: Shield, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
                            // Disembunyikan dari sidebar 2026-09-03 atas permintaan. Rute
                            // /workspace/announcements SENGAJA dibiarkan hidup: pengumuman
                            // masih tampil di aplikasi driver (driver-view & mobile-driver-view),
                            // jadi halaman kelolanya tetap perlu dapat dibuka lewat URL.
                            // { name: "Pengumuman", href: "/workspace/announcements", icon: Megaphone, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
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
                                requiredPermissions: [Permission.VIEW_HEALTH_PROFILE],
                            },
                            {
                                name: "Rekap MCU",
                                icon: TableProperties,
                                href: "/workspace/hse/rekap-mcu",
                                requiredPermissions: [Permission.VIEW_HEALTH_PROFILE],
                            },
                            {
                                name: "Profil Kesehatan",
                                icon: HeartPulse,
                                href: "/workspace/hse/profil-kesehatan",
                                requiredPermissions: [Permission.VIEW_HEALTH_PROFILE],
                            },
                            {
                                name: "Indikator Kesehatan",
                                icon: TrendingUp,
                                href: "/workspace/hse/indikator-kesehatan",
                                requiredPermissions: [Permission.VIEW_HEALTH_PROFILE],
                            },
                            {
                                name: "Ijin Sakit",
                                icon: ClipboardList,
                                href: "/workspace/hse/sick-leave",
                            }
                        ]
                    },
                    {
                        name: "SPIP",
                        icon: FolderOpen,
                        children: [
                            {
                                name: "Peralatan Bergerak (HE)",
                                icon: Car,
                                children: [
                                    { name: "Dashboard Peralatan", href: "/workspace/hse/ko/spip/peralatan/dashboard", icon: BarChart3 },
                                    { name: "Database Peralatan", href: "/workspace/hse/ko/spip/peralatan", icon: Database },
                                ]
                            },
                            { name: "Peralatan Tidak Bergerak", href: "/workspace/hse/ko/spip/peralatan/tidak-bergerak", icon: Wrench },
                            { name: "Sarana & Prasarana", href: "/workspace/hse/ko/spip/prasarana", icon: Building2 },
                            { name: "Instalasi", href: "/workspace/hse/ko/spip/instalasi", icon: Zap }
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
                    { name: "Peraturan Pemerintah", href: "/workspace/hse/k3/documents/peraturan", icon: Scale, requiredPermissions: [Permission.VIEW_DOCUMENTS] },
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
        // 17 Sep 2026: "Push Notifikasi" (SIMPER, Blast WhatsApp, Pengingat Induksi)
        // disembunyikan dari tab Beranda. Rute tetap hidup.
        items: [
            // { name: "Push Notifikasi", icon: Bell, children: [
            //     { name: "SIMPER", href: "/workspace/push-notification/simper", icon: Car, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
            //     { name: "Blast WhatsApp", href: "/workspace/blast-whatsapp", icon: MessageSquare, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
            //     { name: "Pengingat Induksi", href: "/workspace/push-notification-induction", icon: Bell, requiredPermissions: [Permission.MANAGE_EMPLOYEES] },
            // ] },
        ]
    }
];
