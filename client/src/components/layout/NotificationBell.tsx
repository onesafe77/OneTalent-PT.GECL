import { useState, useMemo } from "react";
import { Bell, Car, ClipboardCheck, ShieldCheck, X, Ruler } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
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
  { key: "safe_distance", label: "Safe Distance" },
  { key: "sidak", label: "Sidak" },
  { key: "safety_patrol", label: "Safety Patrol" },
];

/** ringkas: varian 26px tanpa latar, dipakai di baris logo sidebar (gaya prototipe). */
export function NotificationBell({ ringkas = false }: { ringkas?: boolean } = {}) {
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

  const ikon = (type: string) =>
    ({ sidak: ClipboardCheck, safety_patrol: ShieldCheck, fms: Car, safe_distance: Ruler } as Record<string, typeof Bell>)[type] ?? Bell;

  const grup = (() => {
    const out: { judul: string; isi: NotificationItem[] }[] = [];
    for (const n of filtered) {
      const d = n.createdAt ? new Date(n.createdAt) : null;
      const judul = !d ? "Lainnya" : isToday(d) ? "Hari ini" : isYesterday(d) ? "Kemarin" : "Sebelumnya";
      const g = out[out.length - 1];
      if (g?.judul === judul) g.isi.push(n); else out.push({ judul, isi: [n] });
    }
    return out;
  })();

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={ringkas
            ? "relative h-[26px] w-[26px] rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            : "relative h-8 w-8 sm:h-9 sm:w-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"}
          title="Notifikasi"
          data-testid="button-notifications"
        >
          <Bell className={ringkas ? `h-4 w-4 ${unread > 0 ? "text-red-500" : ""}` : "w-4 h-4 sm:w-5 sm:h-5"} />
          {unread > 0 && (
            <span className={ringkas
              ? "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white tabular-nums ring-2 ring-[#f9f9f9] dark:ring-gray-950"
              : "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800"}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-gray-200 bg-white p-0 sm:max-w-[400px] dark:border-gray-800 dark:bg-gray-950 [&>button]:hidden">
        <div className="flex h-14 shrink-0 items-center justify-between px-5">
          <h2 className="text-[15px] font-semibold text-gray-950 dark:text-white">Notifikasi</h2>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button onClick={clearAll} className="rounded-md px-2 py-1 text-[13px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white">
                Bersihkan
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Tutup" className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white">
              <X className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto px-4 pb-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-[13px] transition-colors ${filter === f.key
                ? "bg-gray-100 font-medium text-gray-950 dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center pb-16 text-center">
              <Bell className="mb-3 h-6 w-6 text-gray-300 dark:text-gray-600" strokeWidth={1.6} />
              <p className="text-sm text-gray-500">Belum ada notifikasi</p>
            </div>
          ) : grup.map((g) => (
            <div key={g.judul} className="mt-2">
              <p className="px-3 pb-1 pt-2 text-xs font-medium text-gray-400">{g.judul}</p>
              {g.isi.map((n) => {
                const Ikon = ikon(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => goTo(n)}
                    className="group relative flex cursor-pointer gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/70"
                  >
                    <Ikon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-gray-500" strokeWidth={1.6} />
                    <div className="min-w-0 flex-1 pr-5">
                      <div className="flex items-baseline gap-2">
                        <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-gray-950 dark:text-gray-100">{n.title}</p>
                        <span className="shrink-0 text-xs text-gray-400 group-hover:invisible">{relativeTime(n.createdAt)}</span>
                      </div>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-gray-500 dark:text-gray-400">{n.body}</p>}
                    </div>
                    <button
                      onClick={(e) => dismissOne(e, n.id)}
                      aria-label="Hapus notifikasi"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-900 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
