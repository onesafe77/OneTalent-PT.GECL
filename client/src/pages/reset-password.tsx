import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

const resetPasswordFormSchema = z.object({
  oldPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi tidak cocok",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { resetPassword, user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);
    try {
      await resetPassword(data.oldPassword, data.newPassword);
      toast({
        title: "Password Berhasil Diubah",
        description: "Password Anda telah diperbarui. Silakan gunakan password baru untuk login berikutnya.",
      });
      form.reset();
      setTimeout(() => {
        setLocation("/workspace");
      }, 1500);
    } catch (error) {
      toast({
        title: "Gagal Mengubah Password",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Reset Password Card */}
      <Card className="w-full max-w-md relative shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center pb-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/workspace")}
            className="absolute top-4 left-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#DF2A33] to-[#96161C] rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <KeyRound className="w-12 h-12 text-white" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[#DF2A33] to-[#96161C] bg-clip-text text-transparent">
              Ubah Password
            </CardTitle>
            <CardDescription className="text-base">
              {user ? `Halo, ${user.name}` : "Perbarui password Anda"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Password Lama</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Masukkan password lama"
                          disabled={isLoading}
                          className="h-12 text-base border-2 focus:border-purple-500 transition-colors pr-12"
                          data-testid="input-old-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                          disabled={isLoading}
                          data-testid="button-toggle-old-password"
                        >
                          {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Password Baru</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Minimal 8 karakter"
                          disabled={isLoading}
                          className="h-12 text-base border-2 focus:border-purple-500 transition-colors pr-12"
                          data-testid="input-new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                          disabled={isLoading}
                          data-testid="button-toggle-new-password"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Konfirmasi Password Baru</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Ketik ulang password baru"
                          disabled={isLoading}
                          className="h-12 text-base border-2 focus:border-purple-500 transition-colors pr-12"
                          data-testid="input-confirm-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                          disabled={isLoading}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#DF2A33] to-[#96161C] hover:from-[#DF2A33] hover:to-[#96161C] shadow-lg hover:shadow-xl transition-all"
                data-testid="button-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Ubah Password"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
              💡 Tips Keamanan Password:
            </p>
            <ul className="mt-2 text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Gunakan minimal 8 karakter</li>
              <li>Kombinasikan huruf besar, kecil, angka, dan simbol</li>
              <li>Jangan gunakan informasi pribadi yang mudah ditebak</li>
              <li>Ganti password secara berkala untuk keamanan optimal</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
