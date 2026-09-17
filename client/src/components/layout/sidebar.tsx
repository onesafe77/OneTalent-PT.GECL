import { Link, useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { X, ChevronDown, ChevronRight, Search, LogOut, PanelLeftClose, Sun, Moon } from "lucide-react";
import { useState, useEffect, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  LucideIcon,
  FolderOpen,
  Briefcase,
  HardHat,
  Settings,
  Activity,
  Clock,
  User,
  UserCheck,
  Bot,
  MessageSquare,
  Database,
  Bell,
  Car,
  BookOpen,
  Zap,
  PenTool,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CakraMark } from "@/components/brand/CakraMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/hooks/use-theme";
import { Permission } from "@shared/rbac";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// "BAGUS ANDYKA" -> "Bagus Andyka"; singkatan pendek (HSE, PJO, GL) tetap kapital.
const judulKata = (s: string) => (s || "").toLowerCase().replace(/\S+/g, (w) =>
  /^(hse|hrga|pjo|gl|spv|it|ob|qc|ga|hr)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));
import { queryClient } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { navigationGroups, NavGroup, NavItem } from "@/lib/navigation";


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  // Pencarian menu: 87 entri tersebar di 3 tingkat, jadi menelusuri manual itu lambat.
  // Mengetik di sini menyaring seluruh pohon menu sekaligus.
  const [cariMenu, setCariMenu] = useState("");
  // Prototipe membelah sidebar jadi dua: Beranda (AI/chat & tanda tangan) dan
  // Workspace (modul per divisi). Pembagiannya mengikuti judul grup yang sudah
  // ada di navigation.ts, jadi tidak ada menu yang hilang atau ganda.
  const [tab, setTab] = useState<"beranda" | "workspace">(() =>
    (localStorage.getItem("sidebarTab") as any) || "beranda");
  useEffect(() => { localStorage.setItem("sidebarTab", tab); }, [tab]);
  const [cariBuka, setCariBuka] = useState(false);
  const [menuAkun, setMenuAkun] = useState(false);
  const [dilipat, setDilipat] = useState(() => localStorage.getItem("sidebarLipat") === "1");
  // Konten utama perlu tahu lebar sidebar untuk menggeser marginnya. Dikabarkan
  // lewat event agar tidak perlu mengangkat state ke seluruh pohon workspace.
  useEffect(() => {
    localStorage.setItem("sidebarLipat", dilipat ? "1" : "0");
    window.dispatchEvent(new CustomEvent("sidebar-lipat", { detail: dilipat }));
  }, [dilipat]);

  /** Saring pohon menu: sebuah grup ikut tampil bila namanya cocok ATAU ada anak
   *  yang cocok — sehingga jalur menuju hasil tetap terlihat, tidak terputus. */
  const saringMenu = (item: any, q: string): any | null => {
    if (!q) return item;
    const cocok = item.name.toLowerCase().includes(q);
    if (!item.children) return cocok ? item : null;
    const anak = item.children.map((c: any) => saringMenu(c, q)).filter(Boolean);
    if (cocok || anak.length) return { ...item, children: anak.length ? anak : item.children };
    return null;
  };
  const [location] = useLocation();
  const [search, setSearch] = useState(window.location.search);
  const { hasAnyPermission, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // Grup yang terbuka disimpan, jadi pilihan pengguna bertahan antar kunjungan.
  // Bawaan: semua grup tingkat-0 TERBUKA — sidebar berisi 4 label mono sendirian
  // terbaca kosong, dan menu jadi tidak bisa dipindai tanpa mengeklik dulu.
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    try {
      const simpan = localStorage.getItem("sidebarBuka");
      if (simpan) return JSON.parse(simpan);
    } catch { /* localStorage bisa ditolak di mode privat */ }
    return navigationGroups.flatMap((g) => g.items.filter((i) => i.children).map((i) => i.name));
  });
  useEffect(() => {
    try { localStorage.setItem("sidebarBuka", JSON.stringify(expandedMenus)); } catch { }
  }, [expandedMenus]);

  // Fetch USign stats for badges
  const { data: usignStats } = useQuery<{ pendingCount: number }>({
    queryKey: [`/api/usign/stats?userId=${user?.nik}`],
    enabled: !!user?.nik,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch K3 document approval pending count for sidebar badge
  const { data: approvalInboxCount } = useQuery<{ count: number }>({
    queryKey: [`/api/approval-inbox/count?userId=${user?.nik}`],
    enabled: !!user?.nik,
    refetchInterval: 60000,
  });

  // Sync search state on navigation
  useEffect(() => {
    const handlePopState = () => setSearch(window.location.search);
    window.addEventListener("popstate", handlePopState);

    // Monkey-patch pushState to catch wouter's navigation
    const originalPushState = history.pushState;
    history.pushState = function () {
      originalPushState.apply(this, arguments as any);
      setSearch(window.location.search);
    };

    return () => {
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
    };
  }, []);

  // Sync expansion with location and initial load
  useEffect(() => {
    const findActiveItems = (items: NavItem[]) => {
      items.forEach(item => {
        if (item.children) {
          const isActive = item.children.some(child =>
            child.href && (location === child.href || location.startsWith(child.href + '/'))
            || (child.children && findRecursive(child))
          );

          if (isActive) {
            setExpandedMenus(prev => {
              if (prev.includes(item.name)) return prev;
              return [...prev, item.name];
            });
          }
          findActiveItems(item.children);
        }
      });
    }

    const findRecursive = (item: NavItem): boolean => {
      if (item.href && (location === item.href || location.startsWith(item.href + '/'))) return true;
      if (item.children) return item.children.some(c => findRecursive(c));
      return false;
    }

    navigationGroups.forEach(group => findActiveItems(group.items));
  }, [location]);

  const toggleMenu = (menuName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const hasPermission = (item: NavItem) => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    if (item.requireAll) {
      return item.requiredPermissions.every(p => hasAnyPermission([p]));
    }
    return hasAnyPermission(item.requiredPermissions);
  };

  // Recursive Sidebar Item Component
  // Dipanggil sebagai FUNGSI, bukan <Komponen/>. Karena didefinisikan di dalam Sidebar,
  // memakainya sebagai komponen membuat React melihat "tipe baru" di tiap render lalu
  // membongkar & memasang ulang seluruh pohon menu (2x tiap pindah halaman) — pill aktif
  // dihancurkan lalu dibuat ulang alih-alih meluncur. Tidak ada hook di dalamnya.
  const SidebarItemRenderer = ({ item, depth = 0 }: { item: NavItem, depth?: number }): React.ReactNode => {
    // Permission check immediately
    if (!hasPermission(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.name);

    // Support for dynamic badges
    let badgeValue = item.badgeCount;
    if (item.name === "USign" && usignStats?.pendingCount) {
      badgeValue = usignStats.pendingCount;
    }
    if (item.name === "Dashboard" && item.href?.includes("/workspace/usign") && usignStats?.pendingCount) {
      badgeValue = usignStats.pendingCount;
    }
    if (item.name === "Approval" && approvalInboxCount?.count) {
      badgeValue = approvalInboxCount.count;
    }

    // Active check logic
    const currentFullHref = location + search;
    const isActiveLink = item.href && (() => {
      if (currentFullHref === item.href) return true;
      if (item.href.includes('?')) return currentFullHref === item.href;
      if (!item.href.includes('?') && location === item.href) {
        if (search && search !== '?tab=masterlist') return false;
        return true;
      }
      return false;
    })();

    const IconComponent = item.icon;

    // Filter children for permission
    if (hasChildren) {
      const visibleChildren = item.children!.filter(hasPermission);
      if (visibleChildren.length === 0) return null;
    }

    // Gaya ChatGPT: satu baris setinggi 32px, ikon kecil tanpa kotak, tanpa animasi.
    // Kedalaman ditandai indentasi + garis pandu tipis di bawah ikon induk.
    const indent = { paddingLeft: `${0.5 + depth * 1.125}rem` };
    // Posisi garis pandu grup pada kedalaman d = tengah ikon induknya.
    const garisX = (d: number) => `${0.5 + d * 1.125}rem + 8.5px`;

    if (hasChildren) {
      return (
        <div className="select-none">
          <button
            onClick={(e) => toggleMenu(item.name, e)}
            style={indent}
            className={cn(
              "group flex h-8 w-full items-center gap-2 rounded-lg pr-2 text-left text-[13.5px] transition-colors duration-150",
              depth === 0
                ? "font-medium text-gray-900 hover:bg-gray-200/70 dark:text-gray-100 dark:hover:bg-gray-800"
                : "text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            {IconComponent && <IconComponent strokeWidth={1.6} className="h-[18px] w-[18px] flex-none text-gray-500 transition-colors duration-150 group-hover:text-primary dark:text-gray-400" />}
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            {badgeValue && badgeValue > 0 && (
              <span className="flex-none rounded-full bg-primary px-1.5 text-[10px] font-medium leading-4 text-primary-foreground">{badgeValue}</span>
            )}
            <ChevronRight className={cn("h-3.5 w-3.5 flex-none text-gray-400 transition-transform duration-200 ease-out", isExpanded && "rotate-90")} />
          </button>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="relative flex flex-col gap-px pb-1">
                  {/* Garis pandu: turun dari tengah ikon induk, menandai anggota grup. */}
                  <span aria-hidden className="pointer-events-none absolute bottom-3 top-1 w-px rounded-full bg-gray-200/80 dark:bg-gray-800"
                    style={{ left: `calc(${garisX(depth)})` }} />
                  {item.children!.map((child) => (
                    <Fragment key={child.name}>{SidebarItemRenderer({ item: child, depth: depth + 1 })}</Fragment>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link href={item.href || "#"}
        onClick={() => {
          if (item.href === "/workspace/dashboard") window.dispatchEvent(new Event("chat-baru"));
          if (window.innerWidth < 1024) onClose();
        }}
      >
        <div
          style={indent}
          className={cn(
            "group relative flex h-8 w-full items-center gap-2 rounded-lg pr-2 text-[13.5px] transition-colors duration-150",
            isActiveLink
              ? "font-medium text-gray-950 dark:text-white"
              : "text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"
          )}
        >
          {isActiveLink && (
            <motion.span
              layoutId="sidebar-aktif"
              // Durasi tetap & singkat: selesai sebelum halaman baru selesai dipasang.
              transition={{ type: "tween", duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              style={depth > 0 ? { left: `calc(${garisX(depth - 1)} + 7px)` } : undefined}
              className="absolute inset-y-0 left-0 right-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-gray-800"
            >
              {depth === 0 && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />}
            </motion.span>
          )}
          {/* Anak aktif: ruas garis pandu menyala merah, menyambung ke grupnya. */}
          {isActiveLink && depth > 0 && (
            <span aria-hidden className="absolute inset-y-1 w-[2px] -translate-x-[0.5px] rounded-full bg-primary"
              style={{ left: `calc(${garisX(depth - 1)})` }} />
          )}
          {IconComponent && (
            <IconComponent strokeWidth={1.6} className={cn("relative h-[18px] w-[18px] flex-none transition-colors duration-150",
              isActiveLink ? "text-primary" : "text-gray-500 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200")} />
          )}
          <span className="relative min-w-0 flex-1 truncate" title={item.name}>{item.name}</span>
          {badgeValue && badgeValue > 0 && (
            <span className="flex-none rounded-full bg-primary px-1.5 text-[10px] font-medium leading-4 text-primary-foreground">{badgeValue}</span>
          )}
        </div>
      </Link>
    );
  };

  // Safe User Data Access with Fallbacks
  const safeUser = user || { name: 'User', role: 'Guest', position: '', department: '', permissions: [] };
  const userRole = safeUser.role || 'Welcome';
  const userName = safeUser.name || 'Tamu';
  const userPosition = safeUser.position || 'Pengguna Aplikasi';

  // Pembagian dua tab mengikuti judul grup yang sudah ada, bukan daftar baru —
  // jadi menu tidak mungkin tercecer saat navigation.ts bertambah.
  const GRUP_BERANDA = ["Utama", "Other"];
  const grupTampil = navigationGroups.filter((g) =>
    tab === "beranda" ? GRUP_BERANDA.includes(g.title) : !GRUP_BERANDA.includes(g.title));

  const inisial = (userName || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  // Foto profil dari Manpower List (employees.id = NIK). Gagal/ kosong -> inisial.
  const { data: karyawanSaya } = useQuery<{ photoUrl?: string | null }>({
    queryKey: ["/api/employees", user?.nik],
    queryFn: () => apiRequest(`/api/employees/${encodeURIComponent(user!.nik)}`, "GET"),
    enabled: !!user?.nik,
    staleTime: 30 * 60_000,
    retry: false,
  });
  const [fotoGagal, setFotoGagal] = useState(false);
  const foto = !fotoGagal && karyawanSaya?.photoUrl ? karyawanSaya.photoUrl : null;
  const avatar = (kelas: string) => foto
    ? <img src={foto} alt={userName} onError={() => setFotoGagal(true)} className={`${kelas} flex-none rounded-full object-cover`} />
    : null;

  /** Tombol ikon 26px di baris logo — ukuran & gaya persis prototipe. */
  const TombolIkon = ({ label, onClick, children }: any) => (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="grid h-[26px] w-[26px] place-items-center rounded-md text-gray-500 hover:bg-gray-200/70 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
      {children}
    </button>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[100] hidden bg-black/80 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div className={cn(
        "flex flex-col overflow-hidden border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
        "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:h-full",
        !isOpen ? "lg:w-0 lg:-translate-x-full" : dilipat ? "lg:w-16" : "lg:w-[244px]"
      )}>
        {dilipat ? (
          /* ---------- Rail 64px ---------- */
          <div className="flex h-full flex-col items-center py-3">
            <button type="button" aria-label="Buka panel" title="Buka panel"
              onClick={() => setDilipat(false)}
              className="grid h-[26px] w-[26px] place-items-center text-gray-950 dark:text-white">
              <CakraMark size={26} />
            </button>
            <div className="my-3.5 h-px w-7 bg-gray-200 dark:bg-gray-800" />
            <div className="flex flex-col items-center gap-1">
              {[
                { label: "Beranda", to: "/workspace/dashboard", Icon: BarChart3 },
                { label: "Chat", to: "/workspace/dashboard", Icon: MessageSquare },
                { label: "Projects", to: "/workspace/si-asef/projects", Icon: FolderOpen },
                { label: "OneSign", to: "/workspace/usign", Icon: PenTool },
              ].map(({ label, to, Icon }) => (
                <Link key={label} href={to}>
                  <div title={label} aria-label={label}
                    className={cn("grid h-9 w-9 place-items-center rounded-lg transition-colors",
                      location === to
                        ? "bg-gray-100 text-gray-950 dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white")}>
                    <Icon className="h-5 w-5" />
                  </div>
                </Link>
              ))}
            </div>
            <button type="button" onClick={() => setDilipat(false)} title={userName}
              className="mt-auto grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full bg-gray-200 font-mono text-[10px] text-gray-900 dark:bg-gray-800 dark:text-white">
              {avatar("h-[30px] w-[30px]") ?? inisial}
            </button>
          </div>
        ) : (
          <>
            {/* ---------- Kepala ---------- */}
            <div className="flex items-center justify-between px-2 pb-3 pt-3">
              <span className="flex items-center gap-2 pl-1.5 text-gray-950 dark:text-white">
                <CakraMark size={22} />
                <span className="text-[18px] font-medium tracking-[-0.02em]">OneTalent</span>
              </span>
              <div className="flex items-center gap-0.5">
                <TombolIkon label="Cari menu" onClick={() => setCariBuka((v) => !v)}>
                  <Search className="h-4 w-4" />
                </TombolIkon>
                <NotificationBell ringkas />
                <TombolIkon label="Lipat panel" onClick={() => setDilipat(true)}>
                  <PanelLeftClose className="h-4 w-4" />
                </TombolIkon>
                <Button variant="ghost" size="icon" className="lg:hidden h-[26px] w-[26px]" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ---------- Pencarian (muncul saat ikon ditekan) ---------- */}
            {cariBuka && (
              <div className="px-2 pb-2">
                <input
                  autoFocus
                  value={cariMenu}
                  onChange={(e) => setCariMenu(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setCariMenu(""); setCariBuka(false); } }}
                  placeholder="Cari menu..."
                  aria-label="Cari menu"
                  className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[13px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-950 focus:bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
                />
              </div>
            )}

            {/* ---------- Segmen Beranda | Workspace ---------- */}
            <div className="mx-2 mb-2 grid grid-cols-2 gap-0.5 rounded-lg bg-gray-200/60 p-0.5 dark:bg-gray-800">
              {([["beranda", "Beranda", Activity], ["workspace", "Workspace", Briefcase]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" onClick={() => setTab(k as any)}
                  className={cn("relative flex h-7 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-medium transition-colors duration-150",
                    tab === k ? "text-gray-950 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white")}>
                  {tab === k && (
                    <motion.span layoutId="sidebar-tab" transition={{ type: "tween", duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-gray-700" />
                  )}
                  <Icon className={cn("relative h-3.5 w-3.5", tab === k && "text-primary")} />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            {/* ---------- Isi ---------- */}
            <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {user?.accountType === "subcon" ? (
                SidebarItemRenderer({ item: { name: "MCU", href: "/workspace/hse/mcu", icon: Activity } })
              ) : (() => {
                const q = cariMenu.trim().toLowerCase();
                const blok = grupTampil.map((group) => {
                  const visibleItems = group.items
                    .filter((item) => hasPermission(item))
                    .map((item) => saringMenu(item, q))
                    .filter(Boolean) as typeof group.items;
                  return { group, visibleItems };
                }).filter((b) => b.visibleItems.length > 0);

                if (blok.length === 0) {
                  return (
                    <p className="px-2 py-6 text-center text-[13px] text-gray-400">
                      {q ? `Tidak ada menu "${cariMenu}"` : "Tidak ada menu"}
                    </p>
                  );
                }
                return blok.map(({ group, visibleItems }, gi) => (
                  <div key={group.title} className={cn(gi > 0 && "mt-1")}>
                    <div className="flex flex-col gap-0.5">
                      {visibleItems.map((item) => (
                        <Fragment key={item.name}>{SidebarItemRenderer({ item })}</Fragment>
                      ))}
                    </div>
                  </div>
                ));
              })()}
              {tab === "beranda" && user?.accountType !== "subcon" && !cariMenu.trim() && (
                <RiwayatChat onPilih={() => { if (window.innerWidth < 1024) onClose(); }} />
              )}
            </nav>

            {/* ---------- Kaki: profil + menu akun ---------- */}
            <div className="relative flex-none border-t border-gray-200 p-1.5 dark:border-gray-800">
              {menuAkun && (
                <div className="absolute bottom-[calc(100%+6px)] left-1.5 right-1.5 z-30 flex flex-col rounded-[10px] border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  >
                    <button type="button" onClick={() => { setMenuAkun(false); toggleTheme(); }}
                      className="flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === "dark" ? "Mode terang" : "Mode gelap"}
                    </button>
                    <Link href="/workspace/profile">
                      <div onClick={() => setMenuAkun(false)}
                        className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                        <Settings className="h-4 w-4" /> Pengaturan
                      </div>
                    </Link>
                    <button type="button" onClick={() => { setMenuAkun(false); logout(); }}
                      className="flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                </div>
              )}
              <button type="button" onClick={() => setMenuAkun((v) => !v)}
                className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                {avatar("h-7 w-7") ?? (
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-gray-200 font-mono text-[11px] text-gray-900 dark:bg-gray-800 dark:text-white">
                    {inisial}
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-medium leading-tight text-gray-950 dark:text-white">{judulKata(userName)}</span>
                  <span className="truncate text-[12px] leading-tight text-gray-500 dark:text-gray-400">
                    {judulKata(userPosition)}
                  </span>
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Riwayat chat Mystic
// Didefinisikan di tingkat modul (bukan di dalam Sidebar) supaya tidak dipasang ulang tiap render.
type SesiChat = { id: string; title: string; updatedAt: string | null; createdAt: string | null };

function kelompokWaktu(iso: string | null): string {
  if (!iso) return "Lebih lama";
  const d = new Date(iso), kini = new Date();
  const awalHari = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const selisih = Math.round((awalHari(kini) - awalHari(d)) / 86400000);
  if (selisih <= 0) return "Hari ini";
  if (selisih === 1) return "Kemarin";
  if (selisih <= 7) return "7 hari terakhir";
  if (selisih <= 30) return "30 hari terakhir";
  return "Lebih lama";
}

function RiwayatChat({ onPilih }: { onPilih: () => void }) {
  const [location, setLocation] = useLocation();
  const { data: sesi = [], isLoading } = useQuery<SesiChat[]>({ queryKey: ["/api/si-asef/sessions"], staleTime: 30_000 });
  const search = useSearch();
  const aktif = location === "/workspace/dashboard" ? new URLSearchParams(search).get("sesi") : null;

  const hapus = async (s: SesiChat) => {
    if (!confirm(`Hapus percakapan "${s.title}"?`)) return;
    const r = await fetch(`/api/si-asef/sessions/${s.id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) { alert("Gagal menghapus percakapan."); return; }
    queryClient.setQueryData<SesiChat[]>(["/api/si-asef/sessions"], (lama) => (lama || []).filter((x) => x.id !== s.id));
    if (aktif === s.id) setLocation("/workspace/dashboard");
  };

  if (isLoading) return <div className="mt-4 px-2 text-[12px] text-gray-400">Memuat riwayat…</div>;
  if (!sesi.length) return null;

  const urutan = ["Hari ini", "Kemarin", "7 hari terakhir", "30 hari terakhir", "Lebih lama"];
  const kelompok = new Map<string, SesiChat[]>();
  for (const x of sesi) { const k = kelompokWaktu(x.updatedAt || x.createdAt); kelompok.set(k, [...(kelompok.get(k) || []), x]); }

  return (
    <div className="mt-5">
      {urutan.filter((k) => kelompok.has(k)).map((k) => (
        <div key={k} className="mb-3">
          <div className="px-2 pb-1 text-[11.5px] font-medium text-gray-400 dark:text-gray-500">{k}</div>
          <div className="flex flex-col gap-px">
            {kelompok.get(k)!.map((x) => (
              <div key={x.id} className={cn(
                "group/sesi relative flex h-8 items-center rounded-lg pl-2 pr-1 text-[13.5px] transition-colors duration-150",
                aktif === x.id ? "bg-gray-200/80 text-gray-950 dark:bg-gray-800 dark:text-white" : "text-gray-700 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-gray-800"
              )}>
                <Link href={`/workspace/dashboard?sesi=${x.id}`} onClick={onPilih} className="min-w-0 flex-1 truncate" title={x.title}>
                  {x.title}
                </Link>
                <button type="button" aria-label={`Hapus percakapan ${x.title}`} onClick={() => hapus(x)}
                  className="grid h-6 w-6 flex-none place-items-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-gray-300/60 hover:text-gray-900 focus:opacity-100 group-hover/sesi:opacity-100 dark:hover:bg-gray-700 dark:hover:text-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
