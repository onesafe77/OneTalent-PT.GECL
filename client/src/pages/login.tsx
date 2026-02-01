import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, QrCode } from "lucide-react";

// Schema Definitions
const loginFormSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const resetPasswordSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  oldPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi tidak cocok",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { nik: "", password: "" },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { nik: "", oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/workspace");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  async function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(data.nik, data.password);
      toast({ title: "Login Berhasil", description: "Selamat datang kembali!" });
    } catch (error) {
      toast({ title: "Login Gagal", description: error instanceof Error ? error.message : "NIK atau password salah", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error(await response.text() || "Reset password gagal");

      toast({ title: "Password Berhasil Direset", description: "Silakan login dengan password baru Anda" });
      resetForm.reset();
      setMode('login');
    } catch (error) {
      toast({ title: "Reset Password Gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#FFF5F5] font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* Left Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 pb-24 md:p-12 flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">

            {/* Logo Placeholder - Flower Icon */}
            {/* Brand Logo - Modern & Prominent */}
            {/* Brand Logo - App Icon Style */}
            <div className="flex justify-center mb-10 relative group">
              {/* White Squircle Container */}
              <div className="bg-white p-6 rounded-[40px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                <img
                  src="/images/brand-logo.png"
                  alt="OneTalent Logo"
                  className="h-16 md:h-20 w-auto object-contain filter hover:brightness-110"
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{mode === 'login' ? 'Masuk' : 'Reset Password'}</h1>
              <p className="text-slate-500 text-sm">
                {mode === 'login' ? 'Masukkan NIK dan password untuk melanjutkan' : 'Verifikasi identitas anda'}
              </p>
            </div>

            {mode === 'login' ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="nik"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 text-xs font-bold uppercase tracking-wider">NIK</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan NIK Anda" disabled={isLoading} className="h-11 rounded-lg border-slate-200 focus:border-red-500 focus:ring-red-500/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 text-xs font-bold uppercase tracking-wider">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type={showPassword ? "text" : "password"} placeholder="Masukkan password Anda" disabled={isLoading} className="h-11 rounded-lg border-slate-200 focus:border-red-500 focus:ring-red-500/20 pr-10" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button type="submit" disabled={isLoading} className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Masuk"}
                    </Button>
                  </div>

                  <div className="text-center">
                    <button type="button" onClick={() => setMode('reset')} className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                      Lupa Password?
                    </button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="nik"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 text-xs font-bold uppercase tracking-wider">NIK</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan NIK" className="h-11 rounded-lg border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="oldPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 text-xs font-bold uppercase tracking-wider">Password Lama</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Password Lama" className="h-11 rounded-lg border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={resetForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 text-xs font-bold uppercase tracking-wider">Pass Baru</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Baru" className="h-11 rounded-lg border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resetForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 text-xs font-bold uppercase tracking-wider">Konfirmasi</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Ulangi" className="h-11 rounded-lg border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pt-2 gap-3 flex flex-col">
                    <Button type="submit" disabled={isLoading} className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Reset Sekarang"}
                    </Button>
                    <button type="button" onClick={() => setMode('login')} className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                      Kembali ke Login
                    </button>
                  </div>
                </form>
              </Form>
            )}
            {/* Copyright Footer */}
            <div className="absolute bottom-1 left-0 w-full text-center p-4">
              <p className="text-[10px] text-slate-400 font-medium tracking-wide opacity-80">
                &copy; 2026 PT. Goden Energi Cemerlang Lestari. All rights reserved.
              </p>
            </div>

          </div>
        </div>

        {/* Right Side - Hero Image */}
        <div className="w-full md:w-1/2 relative bg-red-900 hidden md:block">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat mix-blend-overlay opacity-80"
            style={{ backgroundImage: `url('/images/login-hero.jpg')` }}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-900 opacity-70" />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-white p-12 text-center">
            {/* Content Removed as requested */}
          </div>
        </div>

      </div>
    </div>
  );
}
