
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Employee, InsertEmployee } from "@shared/schema";
import { ArrowLeft, Save, Trash2, User, Building2, Briefcase, MapPin, Car, GraduationCap, Heart, Upload, Calendar } from "lucide-react";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { getExpiryStatus } from "@/lib/expiry-utils";

const formSchema = z.object({
    id: z.string().min(1, "ID Karyawan harus diisi"),
    name: z.string().min(1, "Nama harus diisi"),
    phone: z.string().min(1, "Telepon harus diisi"),
    position: z.string().optional(),
    department: z.string().optional(),
    investorGroup: z.string().optional(),
    status: z.string().default("active"),
    // New fields
    isafeNumber: z.string().optional(),
    idItws: z.string().optional(),
    tempatLahir: z.string().optional(),
    dob: z.string().optional(),
    ktpNo: z.string().optional(),
    doh: z.string().optional(),
    statusKaryawan: z.string().optional(),
    tanggalResign: z.string().optional(),
    catatanResign: z.string().optional(),
    typeSim: z.string().optional(),
    simNo: z.string().optional(),
    expiredSimpol: z.string().optional(),
    expiredSimperBib: z.string().optional(),
    statusSimperBib: z.string().optional(),
    expiredSimperTia: z.string().optional(),
    statusSimperTia: z.string().optional(),
    address: z.string().optional(),
    provinsi: z.string().optional(),
    addressGroup: z.string().optional(),
    domisiliKaryawan: z.string().optional(),
    tglIkutPelatihanOs: z.string().optional(),
    merekUnitDigunakanOs: z.string().optional(),
    tglRefreshmentOs: z.string().optional(),
    refreshmentOs: z.string().optional(),
    keteranganOs: z.string().optional(),
    bpjsKesehatan: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EmployeeDetail() {
    const [match, params] = useRoute("/workspace/employees/:id");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const employeeId = params?.id;
    const isNew = employeeId === 'new';

    const { data: employee, isLoading } = useQuery<Employee>({
        queryKey: [`/api/employees/${employeeId}`],
        enabled: !!employeeId && !isNew,
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "", name: "", phone: "", position: "", department: "", investorGroup: "", status: "active",
            isafeNumber: "", idItws: "", tempatLahir: "", dob: "", ktpNo: "", doh: "", statusKaryawan: "",
            tanggalResign: "", catatanResign: "", typeSim: "", simNo: "", expiredSimpol: "",
            expiredSimperBib: "", statusSimperBib: "", expiredSimperTia: "", statusSimperTia: "",
            address: "", provinsi: "", addressGroup: "", domisiliKaryawan: "",
            tglIkutPelatihanOs: "", merekUnitDigunakanOs: "", tglRefreshmentOs: "", refreshmentOs: "", keteranganOs: "",
            bpjsKesehatan: "",
        },
    });

    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [photoLoadError, setPhotoLoadError] = useState<boolean>(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const draftKey = `employee_draft_${employeeId || 'new'}`;

    // Load draft from localStorage on mount (only for existing employees)
    useEffect(() => {
        if (!isNew && employeeId) {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    // Only restore if it's newer than 24 hours
                    if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        form.reset(parsed.data);
                        setAutoSaveStatus('saved');
                    } else {
                        localStorage.removeItem(draftKey); // Clear old draft
                    }
                } catch (e) { /* ignore parse errors */ }
            }
        }
    }, [employeeId, isNew, draftKey]);

    // Auto-save to localStorage on every form change (instant backup)
    const formValues = form.watch();
    useEffect(() => {
        if (!isNew && employeeId && formValues.id) {
            // Save to localStorage immediately
            localStorage.setItem(draftKey, JSON.stringify({ data: formValues, timestamp: Date.now() }));

            // Debounce server save (30 seconds)
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(async () => {
                try {
                    setAutoSaveStatus('saving');
                    const cleanData = Object.fromEntries(
                        Object.entries(formValues).map(([k, v]) => [k, v === "" ? null : v])
                    ) as any;
                    await fetch(`/api/employees/${employeeId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cleanData)
                    });
                    setAutoSaveStatus('saved');
                } catch (e) {
                    setAutoSaveStatus('error');
                }
            }, 30000); // 30 seconds debounce
        }
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [JSON.stringify(formValues), employeeId, isNew, draftKey]);

    // Calculate age and service years
    const watchDob = form.watch("dob");
    const watchDoh = form.watch("doh");

    const age = useMemo(() => {
        if (!watchDob) return null;
        const today = new Date();
        const birthDate = new Date(watchDob);
        let years = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) years--;
        return years;
    }, [watchDob]);

    const serviceYears = useMemo(() => {
        if (!watchDoh) return null;
        const today = new Date();
        const hireDate = new Date(watchDoh);
        let years = today.getFullYear() - hireDate.getFullYear();
        const m = today.getMonth() - hireDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < hireDate.getDate())) years--;
        return years;
    }, [watchDoh]);

    // Reset form when data loads
    useEffect(() => {
        if (employee) {
            form.reset({
                id: employee.id,
                name: employee.name,
                phone: employee.phone,
                position: employee.position || "",
                department: employee.department || "",
                investorGroup: employee.investorGroup || "",
                status: employee.status,
                isafeNumber: employee.isafeNumber || "",
                idItws: employee.idItws || "",
                tempatLahir: employee.tempatLahir || "",
                dob: employee.dob || "",
                ktpNo: employee.ktpNo || "",
                doh: employee.doh || "",
                statusKaryawan: employee.statusKaryawan || "",
                tanggalResign: employee.tanggalResign || "",
                catatanResign: employee.catatanResign || "",
                typeSim: employee.typeSim || "",
                simNo: employee.simNo || "",
                expiredSimpol: employee.expiredSimpol || "",
                expiredSimperBib: employee.expiredSimperBib || "",
                statusSimperBib: employee.statusSimperBib || "",
                expiredSimperTia: employee.expiredSimperTia || "",
                statusSimperTia: employee.statusSimperTia || "",
                address: employee.address || "",
                provinsi: employee.provinsi || "",
                addressGroup: employee.addressGroup || "",
                domisiliKaryawan: employee.domisiliKaryawan || "",
                tglIkutPelatihanOs: employee.tglIkutPelatihanOs || "",
                merekUnitDigunakanOs: employee.merekUnitDigunakanOs || "",
                tglRefreshmentOs: employee.tglRefreshmentOs || "",
                refreshmentOs: employee.refreshmentOs || "",
                keteranganOs: employee.keteranganOs || "",
                bpjsKesehatan: employee.bpjsKesehatan || "",
            });
            if (employee.photoUrl) {
                setPhotoPreview(employee.photoUrl);
                setPhotoLoadError(false);
            }
        }
    }, [employee, form]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            setPhotoLoadError(false); // Reset error state when new photo is selected
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const uploadPhoto = async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('photo', file);
        const res = await fetch(`/api/employees/${id}/photo`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        return res.json();
    };

    const createMutation = useMutation<Employee, Error, InsertEmployee>({
        mutationFn: async (data: InsertEmployee) => {
            const newEmployee = await apiRequest("/api/employees", "POST", data);
            if (photo) await uploadPhoto(newEmployee.id, photo);
            return newEmployee;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            toast({ title: "Berhasil", description: `Karyawan ${result.name} berhasil ditambahkan` });
            setLocation("/workspace/employees/list");
        },
        onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message }),
    });

    const updateMutation = useMutation<Employee, Error, { id: string; data: Partial<InsertEmployee> }>({
        mutationFn: async ({ id, data }) => {
            const updatedEmployee = await apiRequest(`/api/employees/${id}`, "PUT", data);
            if (photo) await uploadPhoto(id, photo);
            return updatedEmployee;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            queryClient.invalidateQueries({ queryKey: [`/api/employees/${result.id}`] });
            toast({ title: "Berhasil", description: "Data karyawan berhasil diperbarui" });
        },
        onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message }),
    });

    const deleteMutation = useMutation<void, Error, string>({
        mutationFn: (id: string) => apiRequest(`/api/employees/${id}`, "DELETE"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            toast({ title: "Berhasil", description: "Karyawan berhasil dihapus" });
            setLocation("/workspace/employees/list");
        },
        onError: (error: Error) => toast({ title: "Error", variant: "destructive", description: error.message }),
    });

    const onSubmit = (values: FormValues) => {
        // Clean empty strings to undefined for proper DB handling
        const cleanData = Object.fromEntries(
            Object.entries(values).map(([k, v]) => [k, v === "" ? null : v])
        ) as any;

        if (isNew) {
            createMutation.mutate(cleanData);
        } else if (employeeId) {
            updateMutation.mutate({ id: employeeId, data: cleanData });
            // Clear localStorage draft after successful manual save
            localStorage.removeItem(draftKey);
            setAutoSaveStatus('idle');
        }
    };

    const handleDelete = () => {
        if (confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) {
            if (employeeId) deleteMutation.mutate(employeeId);
        }
    };

    if (isLoading) return <LoadingScreen isLoading={true} />;

    const watchStatusKaryawan = form.watch("statusKaryawan");

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/workspace/employees/list")} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{isNew ? "Tambah Karyawan" : "Detail Karyawan"}</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            {isNew ? "Tambah karyawan baru" : `Kelola informasi karyawan ${employee?.name || ""}`}
                            {!isNew && autoSaveStatus === 'saving' && <span className="text-amber-500 animate-pulse">● Menyimpan...</span>}
                            {!isNew && autoSaveStatus === 'saved' && <span className="text-emerald-500">✓ Tersimpan otomatis</span>}
                            {!isNew && autoSaveStatus === 'error' && <span className="text-red-500">✗ Gagal menyimpan</span>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" />Hapus</Button>}
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={createMutation.isPending || updateMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />{isNew ? "Simpan" : "Simpan Perubahan"}
                    </Button>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Photo + Basic Info */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Identitas Karyawan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Photo */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed">
                                        {photoPreview && !photoLoadError ? (
                                            <img
                                                src={photoPreview}
                                                className="w-full h-full object-cover"
                                                onError={() => setPhotoLoadError(true)}
                                                alt="Foto Karyawan"
                                            />
                                        ) : (
                                            <User className="w-12 h-12 text-muted-foreground" />
                                        )}
                                    </div>
                                    <label className="cursor-pointer text-sm text-primary hover:underline flex items-center gap-1">
                                        <Upload className="w-4 h-4" /> Upload Foto
                                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                    </label>
                                </div>

                                {/* Basic fields */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="id" render={({ field }) => (
                                        <FormItem><FormLabel>NIK</FormLabel><FormControl><Input {...field} disabled={!isNew} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>No. WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="isafeNumber" render={({ field }) => (
                                        <FormItem><FormLabel>ISAFE Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="idItws" render={({ field }) => (
                                        <FormItem><FormLabel>ID ITWS</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="tempatLahir" render={({ field }) => (
                                        <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="dob" render={({ field }) => (
                                        <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormItem>
                                        <FormLabel>Usia</FormLabel>
                                        <Input value={age !== null ? `${age} tahun` : "-"} disabled className="bg-muted" />
                                    </FormItem>
                                    <FormField control={form.control} name="ktpNo" render={({ field }) => (
                                        <FormItem><FormLabel>No. KTP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Kepegawaian */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Kepegawaian</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField control={form.control} name="department" render={({ field }) => (
                                <FormItem><FormLabel>Departemen</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="position" render={({ field }) => (
                                <FormItem><FormLabel>Jabatan / Posisi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="investorGroup" render={({ field }) => (
                                <FormItem><FormLabel>Investor Group</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="doh" render={({ field }) => (
                                <FormItem><FormLabel>Tanggal Masuk Kerja (DOH)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormItem>
                                <FormLabel>Masa Kerja</FormLabel>
                                <Input value={serviceYears !== null ? `${serviceYears} tahun` : "-"} disabled className="bg-muted" />
                            </FormItem>
                            <FormField control={form.control} name="statusKaryawan" render={({ field }) => (
                                <FormItem><FormLabel>Status Karyawan</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Aktif">Aktif</SelectItem>
                                            <SelectItem value="Resign">Resign</SelectItem>
                                            <SelectItem value="Cuti">Cuti</SelectItem>
                                            <SelectItem value="PHK">PHK</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Status Kepegawaian</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">Aktif</SelectItem>
                                            <SelectItem value="inactive">Non-Aktif</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    {/* Resign Section - Conditional */}
                    {watchStatusKaryawan === "Resign" && (
                        <Card className="border-red-200 bg-red-50/50">
                            <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><Calendar className="w-5 h-5" /> Informasi Resign</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="tanggalResign" render={({ field }) => (
                                    <FormItem><FormLabel>Tanggal Resign *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="catatanResign" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Catatan Resign</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </CardContent>
                        </Card>
                    )}

                    {/* SIM & SIMPER with Auto Status */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> SIM & SIMPER</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic SIM Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="typeSim" render={({ field }) => (
                                    <FormItem><FormLabel>Jenis SIM</FormLabel><FormControl><Input {...field} placeholder="A, B1, B2, C" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="simNo" render={({ field }) => (
                                    <FormItem><FormLabel>No. SIM</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            {/* SIMPOL with Status Badge */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-sm">SIMPOL</h4>
                                    {(() => {
                                        const status = getExpiryStatus(form.watch("expiredSimpol"));
                                        return (
                                            <div className="flex items-center gap-2">
                                                <Badge className={status.badgeClass}>{status.status}</Badge>
                                                <span className="text-xs text-muted-foreground">{status.displayText}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <FormField control={form.control} name="expiredSimpol" render={({ field }) => (
                                    <FormItem><FormLabel>Tanggal Expired</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            {/* SIMPER BIB with Status Badge */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-sm">SIMPER BIB</h4>
                                    {(() => {
                                        const status = getExpiryStatus(form.watch("expiredSimperBib"));
                                        return (
                                            <div className="flex items-center gap-2">
                                                <Badge className={status.badgeClass}>{status.status}</Badge>
                                                <span className="text-xs text-muted-foreground">{status.displayText}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="expiredSimperBib" render={({ field }) => (
                                        <FormItem><FormLabel>Tanggal Expired</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="statusSimperBib" render={({ field }) => (
                                        <FormItem><FormLabel>Catatan Status</FormLabel><FormControl><Input {...field} placeholder="Catatan tambahan" /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* SIMPER TIA with Status Badge */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-sm">SIMPER TIA</h4>
                                    {(() => {
                                        const status = getExpiryStatus(form.watch("expiredSimperTia"));
                                        return (
                                            <div className="flex items-center gap-2">
                                                <Badge className={status.badgeClass}>{status.status}</Badge>
                                                <span className="text-xs text-muted-foreground">{status.displayText}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="expiredSimperTia" render={({ field }) => (
                                        <FormItem><FormLabel>Tanggal Expired</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="statusSimperTia" render={({ field }) => (
                                        <FormItem><FormLabel>Catatan Status</FormLabel><FormControl><Input {...field} placeholder="Catatan tambahan" /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alamat */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Alamat</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Alamat Lengkap</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="provinsi" render={({ field }) => (
                                <FormItem><FormLabel>Provinsi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="addressGroup" render={({ field }) => (
                                <FormItem><FormLabel>Address Group</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="domisiliKaryawan" render={({ field }) => (
                                <FormItem><FormLabel>Domisili Karyawan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    {/* OS Training */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> OS Training</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name="tglIkutPelatihanOs" render={({ field }) => (
                                    <FormItem><FormLabel>Tgl Ikut Pelatihan OS</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="merekUnitDigunakanOs" render={({ field }) => (
                                    <FormItem><FormLabel>Merek Unit Digunakan OS</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="tglRefreshmentOs" render={({ field }) => (
                                    <FormItem><FormLabel>Tgl Refreshment OS</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="refreshmentOs" render={({ field }) => (
                                    <FormItem><FormLabel>Refreshment OS</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="keteranganOs" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Keterangan OS</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            {/* Certificate Upload */}
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                                <h4 className="font-medium text-sm mb-3">Sertifikat OS (PDF)</h4>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    {/* Current file display */}
                                    {employee?.sertifikatOsUrl && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                                                <a href={employee.sertifikatOsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                                    📄 Lihat Sertifikat
                                                </a>
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Upload new file */}
                                    {!isNew && (
                                        <label className="cursor-pointer">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm">
                                                <Upload className="w-4 h-4" />
                                                {employee?.sertifikatOsUrl ? "Ganti Sertifikat" : "Upload Sertifikat"}
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (file.type !== "application/pdf") {
                                                        toast({ title: "Error", description: "File harus berformat PDF", variant: "destructive" });
                                                        return;
                                                    }
                                                    try {
                                                        const formData = new FormData();
                                                        formData.append("certificate", file);
                                                        const res = await fetch(`/api/employees/${employee?.id}/os-certificate`, {
                                                            method: "POST",
                                                            body: formData
                                                        });
                                                        if (!res.ok) throw new Error("Upload failed");
                                                        const data = await res.json();
                                                        toast({ title: "Berhasil", description: "Sertifikat OS berhasil diupload" });
                                                        queryClient.invalidateQueries({ queryKey: [`/api/employees/${employee?.id}`] });
                                                    } catch (error) {
                                                        toast({ title: "Error", description: "Gagal upload sertifikat", variant: "destructive" });
                                                    }
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* BPJS */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" /> BPJS</CardTitle></CardHeader>
                        <CardContent>
                            <FormField control={form.control} name="bpjsKesehatan" render={({ field }) => (
                                <FormItem className="max-w-md"><FormLabel>No. BPJS Kesehatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
}
