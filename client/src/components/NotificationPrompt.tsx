import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { usePushNotification } from "@/hooks/use-push-notification";

const NOTIFICATION_PROMPT_KEY = "notification_prompt_shown";

export function NotificationPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe 
  } = usePushNotification();

  useEffect(() => {
    if (!isSupported) return;
    
    const hasShownPrompt = localStorage.getItem(NOTIFICATION_PROMPT_KEY);
    
    if (!hasShownPrompt && permission === "default" && !isSubscribed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 8000); // beri waktu pengguna melihat workspace dulu sebelum diminta izin
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isSubscribed]);

  const handleEnableNotifications = async () => {
    localStorage.setItem(NOTIFICATION_PROMPT_KEY, "true");
    await subscribe();
    setIsOpen(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(NOTIFICATION_PROMPT_KEY, "true");
    setIsOpen(false);
  };

  if (!isSupported || permission === "denied") {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#DF2A33] to-[#96161C] rounded-full flex items-center justify-center">
              <Bell className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Aktifkan Notifikasi
          </DialogTitle>
          <DialogDescription className="text-center">
            Dapatkan pemberitahuan langsung untuk berita penting, pengingat shift, dan update status cuti Anda.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Berita Penting</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Informasi penting dari perusahaan</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Bell className="h-5 w-5 text-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Pengingat Shift</p>
                <p className="text-xs text-foreground">Notifikasi jadwal kerja Anda</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Bell className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-purple-800 dark:text-purple-200">Status Cuti</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Update persetujuan cuti Anda</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={handleEnableNotifications} 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#DF2A33] to-[#96161C] hover:from-[#DF2A33] hover:to-[#96161C]"
              data-testid="button-enable-notifications"
            >
              {isLoading ? (
                "Mengaktifkan..."
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Aktifkan Notifikasi
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              className="w-full text-gray-500"
              data-testid="button-dismiss-notifications"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Nanti Saja
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
