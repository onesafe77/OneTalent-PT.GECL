import { useState, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Camera, User, Settings, Lock, Bell,
  Shield, LogOut, ChevronRight, Activity, Moon, Sun,
  Smartphone, CreditCard, HelpCircle, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import { type Employee } from "@shared/schema";

interface SidakStats {
  fatigue: number;
  roster: number;
  seatbelt: number;
  total: number;
  [key: string]: number;
}

export default function EmployeePersonalData() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch employee data
  const { data: employee, isLoading: isLoadingEmployee } = useQuery<Employee>({
    queryKey: [`/api/employees/${user?.nik}`],
    enabled: !!user?.nik,
  });

  // Fetch Sidak Stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<SidakStats>({
    queryKey: [`/api/sidak/stats/${user?.nik}`],
    enabled: !!user?.nik,
  });

  // Photo Upload Mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/employees/${user?.nik}/photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload photo');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${user?.nik}`] });
      toast({ title: "Foto diperbarui", description: "Foto profil berhasil diubah." });
    },
    onError: () => {
      toast({ title: "Gagal", description: "Gagal mengunggah foto.", variant: "destructive" });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadPhotoMutation.mutate(e.target.files[0]);
    }
  };

  const menuItems = [
    { icon: User, label: "Edit Profil", sub: "Update foto & data diri", href: "/workspace/employees/" + user?.nik },
    { icon: Lock, label: "Kata Sandi", sub: "Ubah password", href: "/reset-password" },
    { icon: Bell, label: "Notifikasi", sub: "On", href: "#", badge: "Active" },
    { icon: Smartphone, label: "Offline Sync", sub: "Last sync: 10m ago", href: "#" },
  ];

  if (isLoadingEmployee) {
    return <div className="p-8"><Skeleton className="h-48 w-full rounded-3xl" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header Profile Section - Red Curve Style */}
      <div className="bg-red-600 dark:bg-red-900 pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Profile</h1>
            <Link href="/workspace/settings">
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10 rounded-full">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/20 relative overflow-hidden">

            <div className="relative z-10 flex flex-col items-center">
              {/* Avatar Group */}
              <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/20 shadow-lg">
                  <img
                    src={employee?.photoUrl || `https://ui-avatars.com/api/?name=${employee?.name}&background=random&color=fff`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white text-red-600 p-1.5 rounded-xl border-4 border-red-600 shadow-sm">
                  <Camera className="w-4 h-4" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <h2 className="text-xl font-bold text-white mb-1 text-center">{employee?.name}</h2>
              <div className="flex flex-col items-center gap-0.5 mb-4">
                <p className="text-white/90 text-sm font-medium">{employee?.id}</p>
                <p className="text-white/70 text-xs">{employee?.position}</p>
              </div>

              <div className="flex gap-2 mb-6">
                <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-medium border border-white/10">
                  CERTIFIED
                </span>
                <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-medium border border-white/10">
                  LVL 4
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-8 w-full border-t border-white/10 pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {isLoadingStats ? "-" : stats?.total || 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/70 font-medium">Inspections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground mb-1">98%</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Compliance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground mb-1">12</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Reports</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="px-6 -mt-4 relative z-20 space-y-6">

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Akun & Keamanan</h3>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-2 shadow-sm border border-gray-100 dark:border-gray-700">
            {menuItems.slice(0, 2).map((item, idx) => (
              <Link href={item.href} key={idx}>
                <div className={`p-4 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all ${idx !== 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 group-hover:bg-muted group-hover:text-primary transition-colors">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.sub}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Preferensi</h3>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-2 shadow-sm border border-gray-100 dark:border-gray-700">
            {menuItems.slice(2).map((item, idx) => (
              <Link href={item.href} key={idx}>
                <div className={`p-4 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all ${idx !== menuItems.slice(2).length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 group-hover:bg-muted group-hover:text-primary transition-colors">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.sub}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="px-2 py-1 rounded-lg bg-muted text-foreground text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="pb-8">
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-gray-200 font-semibold shadow-sm"
            onClick={() => logout()}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Keluar Aplikasi
          </Button>
          <p className="text-center text-gray-400 text-xs mt-6">
            Version 2.4.0 (Build 2026.01.15)
          </p>
        </div>
      </div>
    </div>
  );
}