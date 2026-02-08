import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    UserCheck, Phone, User, Briefcase, Calendar,
    Clock, CheckCircle2, Building2, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const inductionAttendanceSchema = z.object({
    nik: z.string().min(1, "NIK wajib diisi"),
    namaKaryawan: z.string().min(1, "Nama karyawan wajib diisi"),
    jabatan: z.string().min(1, "Jabatan wajib diisi"),
    nomorTelepon: z.string().optional(),
    pemateri: z.string().min(1, "Pemateri wajib diisi"),
    tanggalRefreshInduksi: z.string().min(1, "Tanggal wajib diisi"),
    tandaTangan: z.string().min(1, "Tanda tangan wajib diisi"),
    waktu: z.string().min(1, "Waktu wajib diisi"),
});

type InductionAttendanceValues = z.infer<typeof inductionAttendanceSchema>;

export default function AbsensiInduksiPublic() {
    const { toast } = useToast();
    const [isSuccess, setIsSuccess] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second for display
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const form = useForm<InductionAttendanceValues>({
        resolver: zodResolver(inductionAttendanceSchema),
        defaultValues: {
            nik: "",
            namaKaryawan: "",
            jabatan: "",
            nomorTelepon: "",
            pemateri: "",
            tanggalRefreshInduksi: format(new Date(), "yyyy-MM-dd"),
            waktu: format(new Date(), "HH:mm:ss"),
            tandaTangan: "",
        },
    });

    const nik = form.watch("nik");

    // Auto-fill employee data when NIK changes
    const { isFetching: isFetchingEmployee } = useQuery({
        queryKey: ["/api/employees", nik],
        queryFn: async () => {
            if (!nik || nik.length < 3) return null;
            try {
                const response = await fetch(`/api/employees/${nik}`);
                if (response.ok) {
                    const data = await response.json();
                    form.setValue("namaKaryawan", data.name);
                    form.setValue("jabatan", data.position);
                    toast({
                        description: "Data karyawan ditemukan!",
                        className: "bg-green-50 border-green-200 text-green-800",
                    });
                    return data;
                }
            } catch (error) {
                console.error("Failed to fetch employee:", error);
            }
            return null;
        },
        enabled: !!nik && nik.length >= 3,
        retry: false,
    });

    const mutation = useMutation({
        mutationFn: async (values: InductionAttendanceValues) => {
            return await apiRequest("/api/induction-attendance/submit", "POST", values);
        },
        onSuccess: () => {
            setIsSuccess(true);
            toast({
                title: "Berhasil!",
                description: "Absensi induksi Anda telah tercatat.",
                variant: "default",
                className: "bg-green-600 text-white border-none",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal Kirim",
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
                <Card className="w-full max-w-sm text-center shadow-xl border-none overflow-hidden">
                    <div className="bg-green-600 h-24 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                    <CardContent className="pt-8 pb-8 px-6 space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900">Absensi Berhasil!</h2>
                            <p className="text-gray-500 text-sm">
                                Data kehadiran induksi Anda telah berhasil disimpan ke dalam sistem.
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tanggal</span>
                                <span className="font-medium text-gray-900">
                                    {format(new Date(), "dd MMM yyyy", { locale: idLocale })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Waktu</span>
                                <span className="font-medium text-gray-900">
                                    {format(currentTime, "HH:mm")}
                                </span>
                            </div>
                        </div>
                        <Button
                            onClick={() => {
                                setIsSuccess(false);
                                form.reset();
                                form.setValue("tanggalRefreshInduksi", format(new Date(), "yyyy-MM-dd"));
                                form.setValue("waktu", format(new Date(), "HH:mm:ss"));
                            }}
                            className="w-full bg-gray-900 hover:bg-gray-800 h-10 rounded-full"
                        >
                            Isi Form Baru
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header Section */}
            <div className="bg-red-700 h-52 rounded-b-[2rem] px-6 pt-8 pb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Building2 className="w-48 h-48 text-white" />
                </div>

                <div className="relative z-10 max-w-lg mx-auto text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-medium text-red-50 tracking-wide text-xs uppercase">OneTalent</span>
                    </div>
                    <h1 className="text-2xl font-bold leading-tight">Absensi Induksi</h1>
                    <p className="text-red-100 text-sm mt-1 opacity-90">
                        {format(currentTime, "EEEE, dd MMMM yyyy", { locale: idLocale })}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 -mt-16 pb-8">
                <Card className="max-w-lg mx-auto shadow-xl border-none rounded-2xl overflow-hidden backdrop-blur-xl bg-white/95">
                    <CardHeader className="pb-4 border-b border-gray-50">
                        <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                            <span className="w-1 h-6 bg-red-600 rounded-full block"></span>
                            Formulir Peserta
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Mohon lengkapi data diri Anda dengan benar.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                                {/* Section: Waktu & Tanggal */}
                                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <FormField
                                        control={form.control}
                                        name="tanggalRefreshInduksi"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs text-gray-500 font-normal">Tanggal</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                        <Input type="date" className="h-9 pl-7 text-xs bg-white border-gray-200" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="waktu"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs text-gray-500 font-normal">Waktu</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Clock className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                        <Input type="time" step="1" className="h-9 pl-7 text-xs bg-white border-gray-200" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Section: Data Diri */}
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="nik"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium text-gray-700">NIK (Nomor Induk)</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                                        <Input
                                                            placeholder="Contoh: C-12345"
                                                            className="pl-9 h-11 border-gray-200 focus:border-red-500 focus:ring-red-100 bg-white transition-all rounded-lg"
                                                            {...field}
                                                        />
                                                        {isFetchingEmployee && (
                                                            <div className="absolute right-3 top-3.5">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="namaKaryawan"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium text-gray-700">Nama Lengkap</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <UserCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                                            <Input
                                                                placeholder="Otomatis terisi"
                                                                className="pl-9 h-11 border-gray-200 focus:border-red-500 focus:ring-red-100 bg-gray-50/50 focus:bg-white transition-all rounded-lg"
                                                                readOnly={!!nik && nik.length >= 3}
                                                                {...field}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="jabatan"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-medium text-gray-700">Jabatan</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                                            <Input
                                                                placeholder="Otomatis terisi"
                                                                className="pl-9 h-11 border-gray-200 focus:border-red-500 focus:ring-red-100 bg-gray-50/50 focus:bg-white transition-all rounded-lg"
                                                                readOnly={!!nik && nik.length >= 3}
                                                                {...field}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="nomorTelepon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium text-gray-700">
                                                    No. Telepon <span className="text-gray-400 font-normal text-xs">(Opsional)</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                                        <Input
                                                            type="tel"
                                                            placeholder="08xxxxxxxxxx"
                                                            className="pl-9 h-11 border-gray-200 focus:border-red-500 focus:ring-red-100 bg-white transition-all rounded-lg"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="pemateri"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium text-gray-700">Pemateri</FormLabel>
                                                <FormControl>
                                                    <div className="relative group">
                                                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                                        <Input
                                                            placeholder="Nama Pemateri Induksi"
                                                            className="pl-9 h-11 border-gray-200 focus:border-red-500 focus:ring-red-100 bg-white transition-all rounded-lg"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Section: Tanda Tangan */}
                                <div className="pt-2">
                                    <FormField
                                        control={form.control}
                                        name="tandaTangan"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-sm font-medium text-gray-700 flex items-center justify-between">
                                                    <span>Tanda Tangan</span>
                                                    <span className="text-xs text-gray-400 font-normal italic">Wajib diisi</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <div>
                                                        {field.value ? (
                                                            <div className="relative border rounded-xl p-2 bg-gray-50">
                                                                <img
                                                                    src={field.value}
                                                                    alt="Signature"
                                                                    className="w-full h-32 object-contain bg-white rounded-lg"
                                                                />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => field.onChange("")}
                                                                        className="h-8 text-xs"
                                                                    >
                                                                        Hapus & Ulangi
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <SignaturePad
                                                                onSave={(dataUrl) => field.onChange(dataUrl)}
                                                                title=""
                                                            />
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg shadow-red-200 rounded-xl transition-all transform active:scale-95 mt-4"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Mencatat Absensi...</span>
                                        </div>
                                    ) : "Kirim Absensi Induksi"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="mt-8 flex flex-col items-center justify-center gap-2 opacity-60">
                    <img
                        src="/logo-gecl.png"
                        alt="GECL Logo"
                        className="h-6 grayscale"
                        onError={(e) => {
                            (e.target as any).style.display = 'none';
                        }}
                    />
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        PT. GODEN ENERGI CEMERLANG LESTARI
                    </p>
                </div>
            </div>
        </div>
    );
}
