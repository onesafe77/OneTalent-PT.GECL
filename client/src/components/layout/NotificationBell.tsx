import { useState } from "react";
import { Bell, Car, ClipboardCheck, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => apiRequest("/api/notifications", "GET") as Promise<{ items: NotificationItem[]; unreadCount: number }>,
    enabled: isAuthenticated,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

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

  const iconFor = (type: string) => {
    if (type === "sidak") return ClipboardCheck;
    if (type === "safety_patrol") return ShieldCheck;
    if (type === "fms") return Car;
    return Bell;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 sm:h-9 sm:w-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Notifikasi"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-white dark:bg-gray-800">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notifikasi</p>
          <p className="text-xs text-gray-400">Data terbaru yang masuk</p>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">Belum ada notifikasi</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((n) => {
                const Icon = iconFor(n.type);
                return (
                <li key={n.id}>
                  <button
                    onClick={() => goTo(n)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex gap-3 transition-colors"
                  >
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">{relativeTime(n.createdAt)}</p>
                    </div>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
