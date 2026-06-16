import { useState, useMemo } from "react";
import { Bell, Car, ClipboardCheck, ShieldCheck, X, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  createdAt?: string | null;
}

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "fms", label: "FMS" },
  { key: "sidak", label: "Sidak" },
  { key: "safety_patrol", label: "Safety Patrol" },
];

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => apiRequest("/api/notifications", "GET") as Promise<{ items: NotificationItem[]; unreadCount: number }>,
    enabled: isAuthenticated,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((n) => n.type === filter)),
    [items, filter],
  );

  if (!isAuthenticated) return null;

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && unread > 0) {
      try {
        await apiRequest("/api/notifications/seen", "POST");
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch { /* ignore */ }
    }
  };

  const relativeTime = (iso?: string | null) => {
    if (!iso) return "";
    try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId }); }
    catch { return ""; }
  };

  const goTo = (item: NotificationItem) => {
    setOpen(false);
    if (item.link) setLocation(item.link);
  };

  const dismissOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    queryClient.setQueryData(["notifications"], (old: any) =>
      old ? { ...old, items: old.items.filter((n: NotificationItem) => n.id !== id) } : old);
    try { await apiRequest(`/api/notifications/${id}/dismiss`, "POST"); } catch { /* ignore */ }
  };

  const clearAll = async () => {
    queryClient.setQueryData(["notifications"], (old: any) => (old ? { ...old, items: [], unreadCount: 0 } : old));
    try { await apiRequest("/api/notifications/clear", "POST"); } catch { /* ignore */ }
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const typeMeta = (type: string) => {
    switch (type) {
      case "sidak": return { Icon: ClipboardCheck, label: "Sidak", ring: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600 dark:text-amber-400", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
      case "safety_patrol": return { Icon: ShieldCheck, label: "Safety Patrol", ring: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600 dark:text-emerald-400", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
      case "fms": return { Icon: Car, label: "FMS", ring: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600 dark:text-blue-400", chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
      default: return { Icon: Bell, label: "Info", ring: "bg-slate-100 dark:bg-slate-700", icon: "text-slate-500", chip: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" };
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 sm:h-9 sm:w-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Notifikasi"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-slate-50 dark:bg-gray-900">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h2 className="text-lg font-bold">Notifikasi</h2>
            </div>
            {items.length > 0 && (
              <button onClick={clearAll} className="text-xs font-semibold inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
              </button>
            )}
          </div>
          <p className="text-[12px] opacity-90 mt-0.5">{unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p>
        </div>

        {/* Filter chips */}
        <div className="px-4 py-3 flex gap-2 flex-wrap border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? items.length : items.filter((n) => n.type === f.key).length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${active ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
              >
                {f.label}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {/* List (scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <Bell className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm text-gray-400">Tidak ada notifikasi</p>
            </div>
          ) : (
            filtered.map((n) => {
              const m = typeMeta(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => goTo(n)}
                  className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer p-3 pr-9"
                >
                  <button
                    onClick={(e) => dismissOne(e, n.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Hapus"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${m.ring}`}>
                      <m.Icon className={`w-5 h-5 ${m.icon}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${m.chip}`}>{m.label}</span>
                        <span className="text-[11px] text-gray-400 ml-auto whitespace-nowrap">{relativeTime(n.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-1 leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
