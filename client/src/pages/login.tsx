import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CakraMark } from "@/components/brand/CakraMark";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowRight, UserRound, LockKeyhole, IdCard } from "lucide-react";

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
        setLocation(user?.accountType === "subcon" ? "/workspace/hse/mcu" : "/workspace/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, setLocation, user]);

  async function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(data.nik, data.password, loginType);
      // Layar masuk (tirai + cakra) diputar sekali tiap selesai login, bukan tiap buka menu.
      try { sessionStorage.removeItem("splashTampil"); } catch { /* abaikan */ }
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

  // Gaya input prototipe: tanpa kotak, hanya garis bawah yang "tergambar" dari kiri saat fokus.
  // Kolom isian lembut: latar abu tipis, saat fokus berubah putih dengan cincin merah transparan.
  const inputCls = "peer h-12 rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-[15px] text-gray-950 shadow-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:ring-offset-0";
  const ikonIsian = "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-primary";
  const labelCls = "font-sans normal-case tracking-normal text-[13px] font-medium text-gray-700";

  return (
    <div className="grid min-h-screen w-full bg-white md:grid-cols-[42%_58%] lg:grid-cols-2">
      <style>{`
        @keyframes lg-naik{to{transform:none}}
        @keyframes lg-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes lg-sapu{0%{transform:translateY(-100%)}17%{transform:translateY(760%)}100%{transform:translateY(760%)}}
        @keyframes lg-kursor{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes lg-huruf{from{opacity:0;transform:translateY(0.12em);filter:blur(2px)}to{opacity:1;transform:none;filter:none}}
        .lg-huruf{display:inline-block;animation:lg-huruf 180ms cubic-bezier(.23,1,.32,1) both}
        .lg-fade{animation:lg-fade 260ms cubic-bezier(.32,.72,0,1) 400ms both}
        .lg-form input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #fff inset;-webkit-text-fill-color:#0A0A0A;transition:background-color 9999s}
        @media (prefers-reduced-motion:reduce){.lg-fade,.lg-huruf{animation:none;transform:none;opacity:1;filter:none}.lg-sapu{display:none}}
      `}</style>

      {/* ===== Panel kiri: tinta gelap (prototipe) + foto lapangan sebagai tekstur ===== */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gray-800 px-12 py-14 text-[#EDEDED] md:flex lg:px-[72px]">
        {LOGIN_SLIDES.map((src, i) => (
          <div key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === slide ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundImage: `url('${src}')` }} />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        <div className="absolute bottom-0 right-0 top-0 w-px overflow-hidden bg-white/10">
          <span className="lg-sapu block h-[12%] w-px bg-gradient-to-b from-transparent via-primary to-transparent [animation:lg-sapu_7s_linear_300ms_infinite]" />
        </div>

        <div className="lg-fade relative flex items-center gap-2.5">
          <CakraMark size={30} />
          <span className="text-2xl font-medium tracking-[-0.02em]">OneTalent</span>
        </div>

        <div className="relative">
          <h2 className="m-0 text-[clamp(32px,3.4vw,46px)] font-medium leading-[1.14] tracking-[-0.032em] [text-shadow:0_2px_18px_rgba(0,0,0,.55)]">
            <JudulMengetik />
          </h2>
          <div className="lg-fade mt-8 flex items-center gap-1.5">
            {LOGIN_SLIDES.map((_, i) => (
              <button key={i} type="button" aria-label={`Foto ${i + 1}`} onClick={() => setSlide(i)}
                className={`h-[3px] rounded-full transition-all duration-300 ${i === slide ? "w-6 bg-primary" : "w-2 bg-white/25 hover:bg-white/50"}`} />
            ))}
          </div>
        </div>

        <div className="lg-fade relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <img src="/images/gecl-logo.png" alt="Logo PT Golden Energi Cemerlang Lestari"
              className="h-9 w-9 flex-none object-contain drop-shadow-[0_1px_6px_rgba(0,0,0,.45)]" />
            <span className="flex flex-col gap-1 font-mono uppercase tracking-[0.14em]">
              <span className="text-[9px] text-white/50">Powered by</span>
              <span className="whitespace-nowrap text-[11px] text-white/90">PT Golden Energi Cemerlang Lestari</span>
              <span className="whitespace-nowrap text-[9px] text-white/50">Site PT Borneo Indobara</span>
            </span>
          </div>
        </div>
      </div>

      {/* ===== Panel kanan: formulir ===== */}
      <div className="lg-form flex items-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[360px]">
          <h1 className="m-0 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-gray-950">
            {mode === 'login' ? 'Masuk ke OneTalent' : 'Reset kata sandi'}
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-gray-500">
            {mode === 'login'
              ? (loginType === 'subcon' ? 'Gunakan username akun subcon Anda.' : 'Gunakan NIK karyawan dan kata sandi Anda.')
              : 'Verifikasi identitas Anda untuk mengganti kata sandi.'}
          </p>

          {mode === 'login' ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="flex flex-col">
                {/* Jenis akun — gaya tab bergaris bawah, senada dengan input */}
                <div className="relative mt-8 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
                  <span aria-hidden
                    className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_1px_8px_-2px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)]"
                    style={{ transform: loginType === 'subcon' ? 'translateX(100%)' : 'none' }} />
                  {([['karyawan', 'Karyawan', IdCard], ['subcon', 'Subcon', UserRound]] as const).map(([val, lbl, Ikon]) => (
                    <button key={val} type="button" onClick={() => setLoginType(val)}
                      className={`relative flex h-9 items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors ${loginType === val ? 'text-gray-950' : 'text-gray-500 hover:text-gray-800'}`}>
                      <Ikon className={`h-4 w-4 ${loginType === val ? 'text-primary' : ''}`} />
                      {lbl}
                    </button>
                  ))}
                </div>

                <FormField control={loginForm.control} name="nik" render={({ field }) => (
                  <FormItem className="mt-6 space-y-2">
                    <FormLabel className={labelCls}>{loginType === 'subcon' ? 'Username' : 'NIK Karyawan'}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} autoComplete="username" placeholder={loginType === 'subcon' ? 'nama.subcon' : 'C-000000'} disabled={isLoading} className={inputCls} />
                        <UserRound className={ikonIsian} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={loginForm.control} name="password" render={({ field }) => (
                  <FormItem className="mt-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className={labelCls}>Kata sandi</FormLabel>
                      <button type="button" onClick={() => setMode('reset')}
                        className="text-[13px] font-medium text-primary hover:underline hover:underline-offset-4">
                        Lupa kata sandi?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" disabled={isLoading} className={`${inputCls} pr-12`} />
                        <LockKeyhole className={ikonIsian} />
                        <button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <Button type="submit" disabled={isLoading}
                  className="group mt-7 h-12 rounded-xl bg-primary text-[15px] font-medium tracking-[-0.006em] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_20px_-8px_hsl(var(--primary)/0.55)] transition-[background-color,transform,box-shadow] duration-150 hover:bg-primary/90 active:scale-[0.99]">
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <span className="flex items-center gap-2">
                      Masuk
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </span>
                  )}
                </Button>

                <div className="mt-8 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 text-[12.5px] text-gray-500">
                  <ShieldCheck className="h-4 w-4 flex-none text-gray-400" />
                  Akses khusus karyawan &amp; mitra PT GECL. Aktivitas masuk tercatat.
                </div>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="mt-8 flex flex-col gap-5">
                {([
                  ["nik", "NIK", "text", "C-000000"],
                  ["oldPassword", "Kata sandi lama", "password", "••••••••"],
                  ["newPassword", "Kata sandi baru (min. 8)", "password", "••••••••"],
                  ["confirmPassword", "Ulangi kata sandi baru", "password", "••••••••"],
                ] as const).map(([name, label, type, ph]) => (
                  <FormField key={name} control={resetForm.control} name={name} render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={labelCls}>{label}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={type} placeholder={ph} disabled={isLoading} className={inputCls} />
                          {name === "nik" ? <UserRound className={ikonIsian} /> : <LockKeyhole className={ikonIsian} />}
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                ))}
                <Button type="submit" disabled={isLoading}
                  className="mt-2 h-12 rounded-xl bg-primary text-[15px] font-medium text-white hover:bg-primary/90 active:scale-[0.99]">
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset kata sandi"}
                </Button>
                <button type="button" onClick={() => setMode('login')}
                  className="self-center text-[13px] font-medium text-gray-500 hover:text-gray-950">
                  Kembali ke halaman masuk
                </button>
              </form>
            </Form>
          )}

          <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-300 md:hidden">
            Powered by PT Golden Energi Cemerlang Lestari
            <span className="mt-1 block">Site PT Borneo Indobara</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Judul panel kiri: beberapa kalimat diketik, ditahan, dihapus, lalu kalimat berikutnya —
// berulang terus. Tiap huruf muncul dengan fade singkat supaya ketikan terasa halus,
// dan kursor diam (tidak berkedip) selama mengetik agar tidak terasa "tersendat".
const KALIMAT: string[][] = [
  ["Kerja Aman", "& Keselamatan", "Nomer One."],
  ["Keselamatan", "Nomer Satu,", "Produksi Mengikuti."],
];
const KETIK_MS = 48;     // per huruf saat mengetik
const HAPUS_MS = 22;     // per huruf saat menghapus (lebih cepat, seperti manusia)
const TAHAN_MS = 2600;   // lama kalimat utuh ditampilkan
const JEDA_MS = 450;     // jeda sebelum kalimat berikutnya mulai diketik

function JudulMengetik() {
  const hemat = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [k, setK] = useState(0);                       // kalimat ke-
  const [n, setN] = useState(0);                       // jumlah huruf tampil
  const [fase, setFase] = useState<"ketik" | "tahan" | "hapus">("ketik");

  const baris = KALIMAT[k];
  const total = baris.join("").length;

  useEffect(() => {
    if (hemat) return;
    let t: ReturnType<typeof setTimeout>;
    if (fase === "ketik") {
      t = n < total
        ? setTimeout(() => setN(n + 1), n === 0 ? JEDA_MS : KETIK_MS)
        : setTimeout(() => setFase("hapus"), TAHAN_MS);
    } else if (fase === "hapus") {
      t = n > 0
        ? setTimeout(() => setN(n - 1), HAPUS_MS)
        : setTimeout(() => { setK((k + 1) % KALIMAT.length); setFase("ketik"); }, 0);
    }
    return () => clearTimeout(t!);
  }, [n, fase, total, k, hemat]);

  const tampilN = hemat ? total : n;
  const selesai = tampilN >= total;
  // Baris tempat kursor berada = baris terakhir yang sudah mulai terisi.
  let sisa = tampilN;
  let barisKursor = 0;
  baris.forEach((b, i) => { if (sisa > 0) barisKursor = i; sisa -= b.length; });
  sisa = tampilN;

  return (
    <span aria-label={KALIMAT.map((b) => b.join(" ")).join(" — ")} className="block">
      {baris.map((teks, i) => {
        const jumlah = Math.max(0, Math.min(teks.length, sisa));
        sisa -= teks.length;
        return (
          <span key={`${k}-${i}`} aria-hidden className={`block min-h-[1.14em] whitespace-pre ${i === baris.length - 1 ? "text-white/80" : ""}`}>
            {Array.from(teks.slice(0, jumlah)).map((h, j) => (
              <span key={j} className={`lg-huruf ${h === "&" ? "text-primary" : ""}`}>{h}</span>
            ))}
            {i === barisKursor && (
              <span className={`ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] rounded-full bg-primary ${selesai ? "[animation:lg-kursor_1s_steps(1)_infinite]" : ""}`} />
            )}
          </span>
        );
      })}
    </span>
  );
}
