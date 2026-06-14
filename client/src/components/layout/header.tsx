import { Menu, Sun, Moon, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth-context";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      toast({
        title: "Logout Berhasil",
        description: "Sampai jumpa lagi!",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Logout Gagal",
        description: "Terjadi kesalahan saat logout",
        variant: "destructive",
      });
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="hidden lg:block bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        {/* Left side - Menu + Title */}
        <div className="flex items-center min-w-0 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex flex-shrink-0 h-9 w-9 mr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full"
            onClick={onMenuClick}
            data-testid="menu-button"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex flex-col ml-2 lg:ml-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white truncate" data-testid="page-title">
              OneTalent
            </h1>
            {isAuthenticated && user && (
              <div className="hidden lg:block" data-testid="user-greeting">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Hey, <span className="font-semibold text-gray-900 dark:text-white">{user.name}</span>
                  {user.position && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      ({user.position})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Date/Time + Actions */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Date/Time - Responsive */}
          <div className="text-right hidden sm:block" data-testid="datetime-display">
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              <span className="hidden md:inline">{formatDate(currentTime)}</span>
              <span className="md:hidden">{formatDateShort(currentTime)}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(currentTime)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Home"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>

            <NotificationBell />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 sm:h-9 sm:w-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>

            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 sm:h-9 sm:w-9 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400"
                title="Logout"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
