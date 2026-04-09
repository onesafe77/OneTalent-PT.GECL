import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { navigationGroups, NavItem } from "@/lib/navigation";
import { ChevronRight, Search, Bell, User as UserIcon, CheckCircle, AlertOctagon, ArrowRight, Bot, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Dashboard from "@/pages/dashboard";
import { useState, useEffect, useCallback } from "react";

interface SafetyInsight {
  title: string;
  message: string;
  condition: string;
  lastUpdated: Date;
}

export function WorkspaceHome() {
  const { hasAnyPermission, user } = useAuth();
  const [safetyInsight, setSafetyInsight] = useState<SafetyInsight | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);

  // Fetch Safety Insight from Mystic AI
  const fetchSafetyInsight = useCallback(async () => {
    setIsLoadingInsight(true);

    // Create a timeout controller (10 seconds max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const prompt = "Berikan satu safety insight hari ini untuk karyawan tambang. Fokus pada kondisi cuaca, kondisi jalan, atau tips keselamatan harian. Format: berikan judul singkat (maksimal 5 kata), pesan utama (1-2 kalimat), dan kondisi saat ini (contoh: 'Kondisi Jalan: Kering'). Respon harus singkat dan to the point.";

      const res = await fetch('/api/si-asef/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error('API returned non-OK status:', res.status);
        throw new Error(`Failed to fetch insight: ${res.status}`);
      }

      const data = await res.json();
      const aiMessage = data.message || "";

      if (!aiMessage) {
        throw new Error('Empty response from API');
      }

      // Parse the AI response - look for patterns
      const lines = aiMessage.split('\n').filter((line: string) => line.trim());
      let title = "Safety Insight Hari Ini";
      let message = aiMessage;
      let condition = "Kondisi: Normal";

      // Try to extract structured data from AI response
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('judul:') || lowerLine.includes('title:')) {
          title = line.split(':').slice(1).join(':').trim().replace(/[*#]/g, '');
        } else if (lowerLine.includes('kondisi:') || lowerLine.includes('condition:') || lowerLine.includes('status:')) {
          condition = line.replace(/[*#]/g, '').trim();
        } else if (lowerLine.includes('pesan:') || lowerLine.includes('message:') || lowerLine.includes('tips:')) {
          message = line.split(':').slice(1).join(':').trim().replace(/[*#]/g, '');
        }
      }

      // If no structured format found, use the first meaningful lines
      if (message === aiMessage && lines.length > 0) {
        // First line as potential title if short, rest as message
        if (lines[0].length < 50) {
          title = lines[0].replace(/[*#]/g, '').trim();
          message = lines.slice(1, 3).join(' ').replace(/[*#]/g, '').trim() || lines[0];
        } else {
          message = lines.slice(0, 2).join(' ').replace(/[*#]/g, '').trim();
        }
        // Look for condition keywords at the end
        const conditionLine = lines.find((l: string) => l.toLowerCase().includes('kondisi') || l.toLowerCase().includes('jalan') || l.toLowerCase().includes('cuaca'));
        if (conditionLine) {
          condition = conditionLine.replace(/[*#]/g, '').trim();
        }
      }

      setSafetyInsight({
        title: title.substring(0, 50),
        message: message.substring(0, 200),
        condition: condition.substring(0, 50),
        lastUpdated: new Date()
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Failed to fetch safety insight:", error);
      // Fallback to default - always set a value
      setSafetyInsight({
        title: "Safety Insight Hari Ini",
        message: "Selalu utamakan keselamatan. Periksa kondisi unit dan APD sebelum bekerja.",
        condition: "Kondisi: Periksa area kerja",
        lastUpdated: new Date()
      });
    } finally {
      setIsLoadingInsight(false);
    }
  }, []);

  // Fetch on mount and every 30 minutes
  useEffect(() => {
    fetchSafetyInsight();
    const interval = setInterval(fetchSafetyInsight, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(interval);
  }, [fetchSafetyInsight]);

  const hasPermission = (item: NavItem) => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    if (item.requireAll) {
      return item.requiredPermissions.every(p => hasAnyPermission([p]));
    }
    return hasAnyPermission(item.requiredPermissions);
  };

  const flattenItems = (items: NavItem[]): NavItem[] => {
    let result: NavItem[] = [];
    items.forEach(item => {
      if (item.href) result.push(item);
      if (item.children) result = [...result, ...flattenItems(item.children)];
    });
    return result;
  };

  // --- Mobile View Component ---
  const MobileHome = () => (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Mobile Header */}
      <div className="bg-red-600 dark:bg-red-900 pt-8 pb-16 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <p className="text-red-100 text-sm font-medium mb-1">Selamat Pagi,</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">{user?.name || 'Karyawan'}</h1>
            <div className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-white tracking-wider">
                {user?.position || 'Personnel'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
              <Bell className="w-5 h-5" />
            </Button>
            <Link href="/workspace/employee-personal">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center overflow-hidden cursor-pointer">
                {user?.photo ? (
                  <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-white" />
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            <Input
              placeholder="Cari menu, laporan, atau rekan..."
              className="pl-11 h-12 rounded-2xl bg-white text-gray-900 border-0 focus-visible:ring-2 focus-visible:ring-white/50 shadow-lg shadow-red-900/20"
            />
          </div>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-20 space-y-6">
        {/* Spotlight Card - Mystic AI Update */}
        <div className="rounded-3xl bg-gray-900 dark:bg-black p-6 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl -mr-10 -mt-10" />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1">
                <Bot className="w-3 h-3" /> Mystic AI
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {safetyInsight?.lastUpdated
                    ? `Updated ${new Date(safetyInsight.lastUpdated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Loading...'}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={fetchSafetyInsight}
                  disabled={isLoadingInsight}
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingInsight ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {isLoadingInsight && !safetyInsight ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                <span className="text-xs text-gray-400">Generating safety insight...</span>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2 leading-tight">
                  {safetyInsight?.title || 'Safety Insight Hari Ini'}
                </h3>
                <p className="text-gray-400 text-xs mb-4 max-w-[90%]">
                  "{safetyInsight?.message || 'Selalu utamakan keselamatan kerja.'}"
                </p>

                {/* Dynamic Insight Visual */}
                <div className="w-full bg-gray-800/50 p-3 rounded-xl mb-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-gray-300">
                      {safetyInsight?.condition || 'Kondisi: Normal'}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Link href="/workspace/si-asef">
                <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-5 font-semibold text-xs h-10 border-0">
                  Tanya Mystic
                </Button>
              </Link>
              <Button size="sm" variant="outline" className="border-gray-700 text-white hover:bg-gray-800 hover:text-white rounded-xl px-4 text-xs h-10 bg-transparent">
                Detail
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Overview Hari Ini</h3>
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md">Updated 5m ago</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">My Tasks</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">8<span className="text-sm text-gray-400 font-normal">/10</span></span>
                <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Pending</p>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">2</span>
                <AlertOctagon className="w-5 h-5 text-orange-500 mb-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link href="/workspace/sidak/fatigue/new">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg flex items-center justify-between group cursor-pointer border border-gray-100 dark:border-gray-700">
            <div>
              <h4 className="text-gray-900 dark:text-white font-bold text-lg">Mulai Inspeksi</h4>
              <p className="text-gray-500 text-xs">Buat form inspeksi baru</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </Link>

        {/* Mobile App Grid Navigation - Organized in Cards */}
        <div className="space-y-6 pb-8">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter(hasPermission);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-2">
                <h3 className="px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  {group.title}
                </h3>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mx-1">
                  {/* Increased vertical gap for better breathing room */}
                  <div className="grid grid-cols-4 gap-y-8 gap-x-2">
                    {visibleItems.map((item) => {
                      // Flatten children for mobile grid to make everything accessible
                      if (item.children) {
                        const visibleChildren = item.children.filter(hasPermission);
                        const flatChildren = flattenItems(visibleChildren);

                        // If standard menu item has children but no direct link (like "HSE"), 
                        // we might want to show its children directly in the grid
                        return flatChildren.map(child => (
                          <MobileAppIcon key={child.name} item={child} />
                        ));
                      }

                      return <MobileAppIcon key={item.name} item={item} />;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile View - Visible only on small screens */}
      <div className="block lg:hidden w-full">
        <MobileHome />
      </div>

      {/* Desktop View - Dashboard Layout */}
      <div className="hidden lg:block min-h-screen">
        <Dashboard />
      </div>
    </>
  );
}

function MobileAppIcon({ item }: { item: NavItem }) {
  const Icon = item.icon;
  if (!item.href) return null;

  return (
    <Link href={item.href}>
      <div className="flex flex-col items-center justify-start gap-2 p-1 group cursor-pointer">
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 transition-all duration-200 group-active:scale-95">
          {Icon ? <Icon className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-center text-gray-600 dark:text-gray-300 leading-tight line-clamp-2 w-full px-1">
          {item.name}
        </span>
      </div>
    </Link>
  );
}

function MenuCard({ item, category }: { item: NavItem, category: string }) {
  const Icon = item.icon;

  if (!item.href) return null;

  return (
    <Link href={item.href}>
      <div className="group relative flex flex-col justify-between h-full p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-red-100 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          {Icon && <Icon className="w-16 h-16 text-red-600 dark:text-red-400 transform rotate-12 group-hover:scale-110 transition-transform" />}
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
              {Icon && <Icon className="w-6 h-6 text-red-600 dark:text-red-400" />}
            </div>
            {category && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md">
                {category}
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
            {item.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            Akses menu {item.name}
          </p>
        </div>

        <div className="relative z-10 mt-6 flex items-center text-sm font-medium text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform">
          Buka
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </Link>
  );
}
