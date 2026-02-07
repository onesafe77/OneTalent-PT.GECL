import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserCheck, Phone, User, Briefcase, Calendar, Info, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const inductionAttendanceSchema = z.object({
    nik: z.string().min(1, "NIK wajib diisi"),
    namaKaryawan: z.string().min(1, "Nama karyawan wajib diisi"),
    jabatan: z.string().min(1, "Jabatan wajib diisi"),
    nomorTelepon: z.string().optional(),
    pemateri: z.string().min(1, "Pemateri wajib diisi"),
    tanggalRefreshInduksi: z.string().min(1, "Tanggal wajib diisi"),
    tandaTangan: z.string().min(1, "Tanda tangan wajib diisi"),
});

type InductionAttendanceValues = z.infer<typeof inductionAttendanceSchema>;

export default function AbsensiInduksiPublic() {
    const { toast } = useToast();
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<InductionAttendanceValues>({
        resolver: zodResolver(inductionAttendanceSchema),
        defaultValues: {
            nik: "",
            namaKaryawan: "",
            jabatan: "",
            nomorTelepon: "",
            pemateri: "",
            tanggalRefreshInduksi: format(new Date(), "yyyy-MM-dd"),
            tandaTangan: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: InductionAttendanceValues) => {
            return await apiRequest("/api/induction-attendance/submit", "POST", values);
        },
        onSuccess: () => {
            setIsSuccess(true);
            toast({
                title: "Berhasil",
                description: "Absensi induksi Anda telah berhasil dicatat.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal",
                description: error.message || "Terjadi kesalahan saat menyimpan absensi.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: InductionAttendanceValues) => {
        mutation.mutate(values);
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center py-8">
                    <CardContent className="space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-green-100 p-4 rounded-full">
                                <CheckCircle2 className="w-16 h-16 text-green-600" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900">Terima Kasih!</h2>
                            <p className="text-gray-600">
                                Absensi induksi Anda telah berhasil dicatat ke dalam sistem.
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                setIsSuccess(false);
                                form.reset();
                            }}
                            className="w-full bg-red-600 hover:bg-red-700"
                        >
                            Kembali ke Form
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <img
                        src="/logo-gecl.png"
                        alt="GECL Logo"
                        className="h-16 mx-auto mb-4"
                        onError={(e) => {
                            (e.target as any).style.display = 'none';
                        }}
                    />
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
                        <UserCheck className="w-8 h-8 text-red-600" />
                        Absensi Induksi
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Silakan lengkapi formulir di bawah ini untuk mencatat kehadiran induksi Anda.
                    </p>
                </div>

                <Card className="shadow-lg border-red-100">
                    <CardHeader className="bg-red-50/50 border-b border-red-100">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Info className="w-5 h-5 text-red-600" />
                            Data Peserta Induksi
                        </CardTitle>
                        <CardDescription>
                            Isi data diri dengan lengkap dan benar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Tanggal Refresh Induksi */}
                                    <FormField
                                        control={form.control}
                                        name="tanggalRefreshInduksi"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" /> Tanggal Refresh Induksi
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* NIK */}
                                    <FormField
                                        control={form.control}
                                        name="nik"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <User className="w-4 h-4" /> NIK
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Masukkan NIK" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Nama Karyawan */}
                                    <FormField
                                        control={form.control}
                                        name="namaKaryawan"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <UserCheck className="w-4 h-4" /> Nama Karyawan
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nama Lengkap" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Jabatan */}
                                    <FormField
                                        control={form.control}
                                        name="jabatan"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Briefcase className="w-4 h-4" /> Jabatan
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Contoh: Operator, Admin, Driver" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Pemateri */}
                                    <FormField
                                        control={form.control}
                                        name="pemateri"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <User className="w-4 h-4" /> Pemateri
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nama Pemateri" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Nomor Telepon */}
                                    <FormField
                                        control={form.control}
                                        name="nomorTelepon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4" /> Nomor Telepon (Opsional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="tel" placeholder="08xxxxxxxxxx" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <FormField
                                        control={form.control}
                                        name="tandaTangan"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" /> Konfirmasi & Tanda Tangan
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="bg-gray-50 p-2 rounded-lg">
                                                        {field.value ? (
                                                            <div className="relative">
                                                                <img
                                                                    src={field.value}
                                                                    alt="Signature"
                                                                    className="mx-auto border bg-white max-h-[150px] rounded"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="absolute top-1 right-1 text-red-600"
                                                                    onClick={() => field.onChange("")}
                                                                >
                                                                    Ubah TTD
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <SignaturePad
                                                                onSave={(dataUrl) => field.onChange(dataUrl)}
                                                                title="Silakan tanda tangan di bawah"
                                                            />
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-lg bg-red-600 hover:bg-red-700 transition-colors shadow-md"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? "Sedang Mengirim..." : "Kirim Absensi"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="mt-8 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} PT. GECL - HR Induction Portal
                </div>
            </div>
        </div>
    );
}
