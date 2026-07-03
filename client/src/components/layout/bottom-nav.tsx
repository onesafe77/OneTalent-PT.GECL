import { Link, useLocation } from "wouter";
import { Home, FileText, Bot, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const [location] = useLocation();

    const navItems = [
        { name: "Home", href: "/workspace", icon: Home },
        { name: "Sidak", href: "/workspace/sidak", icon: FileText },
        { name: "Mystic", href: "/workspace/si-asef", icon: Bot, isFloating: true },
        { name: "History", href: "/workspace/history", icon: Clock },
        { name: "Profile", href: "/workspace/employee-personal", icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-800/50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] pb-safe lg:hidden">
            <div className="flex items-end justify-between px-4 sm:px-6 pt-2 pb-2 max-w-md mx-auto relative">
                {navItems.map((item) => {
                    const isActive = location === item.href;
                    const Icon = item.icon;

                    if (item.isFloating) {
                        return (
                            <Link key={item.name} href={item.href}>
                                <div className="relative -top-5 flex flex-col items-center transition-transform duration-150 ease-out active:scale-95">
                                    <div className={cn(
                                        "flex items-center justify-center w-14 h-14 rounded-full shadow-lg",
                                        "bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-red-500/30 border-4 border-white/50 dark:border-gray-900/50",
                                        isActive && "ring-2 ring-red-300 dark:ring-red-500/40"
                                    )}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <span className="mt-1 text-[10px] font-bold tracking-tight text-red-600 dark:text-red-500">
                                        {item.name}
                                    </span>
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link key={item.name} href={item.href}>
                            <div className={cn(
                                "flex flex-col items-center justify-center w-14 min-h-12 pt-1 transition-transform duration-150 ease-out active:scale-95",
                                isActive
                                    ? "text-red-600 dark:text-red-500"
                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            )}>
                                <span className={cn(
                                    "flex items-center justify-center px-4 py-1 rounded-full transition-colors duration-150",
                                    isActive ? "bg-red-50 dark:bg-red-500/10" : "bg-transparent"
                                )}>
                                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                <span className={cn(
                                    "mt-0.5 text-[10px] tracking-tight",
                                    isActive ? "font-semibold" : "font-medium opacity-80"
                                )}>
                                    {item.name}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
