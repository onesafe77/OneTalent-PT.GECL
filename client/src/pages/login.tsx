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
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

// Foto slideshow panel kiri (auto-slide, crossfade tiap 5 detik).
const LOGIN_SLIDES = [
  "/images/login-slide-1.jpg",
  "/images/login-slide-2.jpg",
  "/images/login-slide-3.jpg",
  "/images/login-slide-4.jpg",
];
const SLIDE_INTERVAL_MS = 5000;

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
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [loginType, setLoginType] = useState<'karyawan' | 'subcon'>('karyawan');
  const [slide, setSlide] = useState(0);

  // Auto-slide panel kiri (crossfade). Hormati prefers-reduced-motion.
  useEffect(() => {
    if (LOGIN_SLIDES.length <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % LOGIN_SLIDES.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

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
      // Kembali ke URL tujuan sebelum login (deep-link, mis. "Download Form" dari Excel).
      // Subcon tetap dipaksa ke MCU (guard di ProtectedRoute juga menegakkan ini).
      let saved: string | null = null;
      try {
        saved = sessionStorage.getItem("postLoginRedirect");
        if (saved) sessionStorage.removeItem("postLoginRedirect");
      } catch { /* abaikan */ }
      if (saved && saved.startsWith("/") && user?.accountType !== "subcon") {
        setLocation(saved);
      } else {
        setLocation(user?.accountType === "subcon" ? "/workspace/hse/mcu" : "/workspace");
      }
    }
  }, [isAuthenticated, isLoading, setLocation, user]);

  async function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(data.nik, data.password, loginType);
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

  const inputCls = "h-12 rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors";
  const labelCls = "text-slate-600 text-[11px] font-bold uppercase tracking-[0.12em]";

  return (
    <div className="min-h-screen w-full flex bg-white font-sans">

      {/* ===== Panel Kiri: Gambar + Branding (desktop) ===== */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-[55%] overflow-hidden">
        {/* Slideshow crossfade */}
        {LOGIN_SLIDES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${i === slide ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
        {/* Overlay gradient merah korporat agar teks terbaca */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-700/80 via-red-800/75 to-red-950/85" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 text-white w-full">
          {/* Logo + nama */}
          <div className="flex items-center gap-3">
            <div className="bg-white/95 rounded-2xl p-2.5 shadow-lg">
              <img src="/images/brand-logo.png" alt="OneTalent" className="h-9 w-auto object-contain" />
            </div>
            <div className="leading-none drop-shadow-sm">
              <div className="text-2xl tracking-tight">
                <span className="font-light text-white/90">One</span><span className="font-extrabold text-white">Talent</span>
              </div>
              <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/65">
                HSE &amp; Talent System
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight drop-shadow-sm">
              Satu Platform<br />HSE &amp; Talenta GECL
            </h2>
            <p className="mt-4 text-white/85 text-base leading-relaxed">
              Kelola keselamatan, pengawasan, dan data karyawan dalam satu sistem terintegrasi.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-white/80 text-sm bg-white/10 backdrop-blur px-3.5 py-2 rounded-full border border-white/15">
              <ShieldCheck className="h-4 w-4" />
              Akses aman khusus karyawan GECL
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/60 tracking-wide">
                &copy; 2026 PT. Golden Energi Cemerlang Lestari
              </p>
              <p className="text-[10px] text-white/45 tracking-wide mt-0.5">
                Dirancang &amp; dikembangkan oleh <span className="font-semibold text-white/70">Bagus Andyka Firmansyah</span>
              </p>
            </div>
            {/* Titik indikator slideshow */}
            <div className="flex items-center gap-2">
              {LOGIN_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Panel Kanan: Form ===== */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 md:px-12 lg:px-16">
        <div className="w-full max-w-sm mx-auto">

          {/* Logo (mobile saja) */}
          <div className="flex md:hidden justify-center mb-8">
            <div className="bg-white p-4 rounded-3xl shadow-[0_10px_40px_-12px_rgba(220,38,38,0.35)] border border-slate-100">
              <img src="/images/brand-logo.png" alt="OneTalent" className="h-14 w-auto object-contain" />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {mode === 'login' ? 'Selamat datang' : 'Reset Password'}
            </h1>
            <p className="text-slate-500 mt-2 text-[15px]">
              {mode === 'login'
                ? 'Masuk dengan NIK dan password Anda untuk melanjutkan.'
                : 'Verifikasi identitas Anda untuk mengganti password.'}
            </p>
          </div>

          {mode === 'login' ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                {/* Toggle jenis akun */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
                  {([['karyawan', 'Karyawan'], ['subcon', 'Subcon']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLoginType(val)}
                      className={`h-9 rounded-lg text-sm font-semibold transition-colors ${loginType === val ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <FormField
                  control={loginForm.control}
                  name="nik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelCls}>{loginType === 'subcon' ? 'USERNAME' : 'NIK'}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={loginType === 'subcon' ? 'Masukkan username subcon' : 'Masukkan NIK Anda'} disabled={isLoading} className={inputCls} />
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
                      <FormLabel className={labelCls}>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="Masukkan password Anda" disabled={isLoading} className={`${inputCls} pr-11`} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end -mt-1">
                  <button type="button" onClick={() => setMode('reset')} className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                    Lupa Password?
                  </button>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[15px] shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Masuk"}
                </Button>
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
                      <FormLabel className={labelCls}>NIK</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan NIK" className={inputCls} />
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
                      <FormLabel className={labelCls}>Password Lama</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Password Lama" className={inputCls} />
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
                        <FormLabel className={labelCls}>Pass Baru</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Baru" className={inputCls} />
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
                        <FormLabel className={labelCls}>Konfirmasi</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Ulangi" className={inputCls} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="pt-2 gap-3 flex flex-col">
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Reset Sekarang"}
                  </Button>
                  <button type="button" onClick={() => setMode('login')} className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    Kembali ke Login
                  </button>
                </div>
              </form>
            </Form>
          )}

          <div className="md:hidden text-center mt-10">
            <p className="text-[10px] text-slate-400 tracking-wide">
              &copy; 2026 PT. Golden Energi Cemerlang Lestari
            </p>
            <p className="text-[10px] text-slate-400 tracking-wide mt-1">
              Dirancang &amp; dikembangkan oleh <span className="font-semibold text-slate-500">Bagus Andyka Firmansyah</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
