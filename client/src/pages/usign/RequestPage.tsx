import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UsignPdfEditor, type SignatureBox } from "@/components/usign/UsignPdfEditor";
import {
    Upload,
    ArrowRight,
    ArrowLeft,
    UserPlus,
    Settings2,
    Send,
    FileText,
    Search,
    Plus,
    Check,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function UsignRequestPage() {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [ccEmails, setCcEmails] = useState("");
    const [selectedApprovers, setSelectedApprovers] = useState<{ id: string, name: string }[]>([]);
    const [signatureBoxes, setSignatureBoxes] = useState<SignatureBox[]>([]);
    const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);
    const [tempFileUrl, setTempFileUrl] = useState<string | null>(null);

    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [openPopover, setOpenPopover] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    const { data: response, isLoading: employeesLoading } = useQuery<any>({
        queryKey: ["/api/employees"],
    });

    // Support both direct array and paginated object response
    const employees = Array.isArray(response) ? response : (response?.data || []);

    const uploadMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            return await apiRequest("/api/usign/upload", "POST", formData);
        },
        onSuccess: (data) => {
            console.log("✅ USign Upload Success Response:", data);
            if (data && (data.id || (data.document && data.document.id))) {
                const docId = data.id || data.document.id;
                const fileUrl = data.fileUrl || data.document.fileUrl;
                setUploadedDocId(docId);
                setTempFileUrl(fileUrl);
                setStep(2);
            } else {
                console.error("❌ USign Upload invalid data structure:", data);
                toast({
                    title: "Upload Gagal",
                    description: "Server mengembalikan format data yang tidak valid.",
                    variant: "destructive"
                });
            }
        },
        onError: (error: Error) => {
            console.error("❌ USign Upload Mutation Error:", error);
            toast({
                title: "Upload Gagal",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const startFlowMutation = useMutation({
        mutationFn: async () => {
            // 1. Prepare all steps (flat list of boxes with stepOrder from the approver sequence)
            const allSteps = signatureBoxes.map((box) => {
                const approverIndex = selectedApprovers.findIndex(a => a.id === box.approverId);
                return {
                    approverId: box.approverId,
                    stepOrder: approverIndex + 1,
                    actionType: box.actionType,
                    pageNumber: box.pageNumber,
                    posX: box.posX,
                    posY: box.posY,
                    width: box.width,
                    height: box.height
                };
            });

            // 2. Add steps in one go
            await apiRequest(`/api/usign/documents/${uploadedDocId}/steps`, "POST", allSteps);

            // 3. Start flow
            await apiRequest(`/api/usign/documents/${uploadedDocId}/start`, "POST");
        },
        onSuccess: () => {
            toast({ title: "Berhasil", description: "Proses USign telah dimulai." });
            queryClient.invalidateQueries({ queryKey: ["/api/usign/my-requests"] });
            setLocation("/workspace/usign");
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal Memulai Flow",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!title) setTitle(selectedFile.name.replace('.pdf', ''));
        }
    };

    const proceedToConfig = () => {
        if (!file || !title) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("subject", subject);
        // Ensure we pass the current user's nik as ownerId
        formData.append("ownerId", user?.nik || "");
        formData.append("ccEmails", JSON.stringify(ccEmails.split(',').map((e: string) => e.trim()).filter(Boolean)));

        console.log("📤 Uploading USign document with ownerId:", user?.nik);
        uploadMutation.mutate(formData);
    };

    const addApprover = (approverId: string) => {
        if (approverId === user?.nik) {
            toast({ title: "Tidak diizinkan", description: "Anda tidak bisa menambahkan diri sendiri sebagai approver (self-approval).", variant: "destructive" });
            return;
        }
        const emp = employees.find((e: any) => e.id === approverId);
        if (emp && !selectedApprovers.find(a => a.id === approverId)) {
            setSelectedApprovers([...selectedApprovers, { id: emp.id, name: emp.name }]);
        }
    };

    const removeApprover = (id: string) => {
        setSelectedApprovers(selectedApprovers.filter(a => a.id !== id));
        setSignatureBoxes(signatureBoxes.filter(b => b.approverId !== id));
    };

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            {/* Wizard Header */}
            <div className="flex items-center justify-between mb-8 px-4">
                {[
                    { icon: <Upload className="w-4 h-4" />, label: "Upload" },
                    { icon: <UserPlus className="w-4 h-4" />, label: "Approver" },
                    { icon: <Settings2 className="w-4 h-4" />, label: "Konfigurasi" },
                    { icon: <Send className="w-4 h-4" />, label: "Mulai" },
                ].map((s: any, i: number) => (
                    <div key={i} className="flex-1 flex items-center group">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-emerald-500 text-white' :
                            step === i + 1 ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' :
                                'bg-slate-200 text-slate-500'
                            }`}>
                            {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`ml-3 text-sm font-medium hidden md:inline transition-colors ${step === i + 1 ? 'text-primary' : 'text-slate-500'
                            }`}>
                            {s.label}
                        </span>
                        {i < 3 && <div className="flex-1 h-px bg-slate-200 mx-4" />}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <Card className="max-w-xl mx-auto border-none shadow-xl bg-gradient-to-b from-white to-slate-50">
                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-2xl font-bold">Upload Dokumen</CardTitle>
                                <CardDescription>Pilih dokumen PDF yang memerlukan tanda tangan digital.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div
                                    className="border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group relative overflow-hidden"
                                    onClick={() => document.getElementById('pdf-upload')?.click()}
                                >
                                    <Upload className="w-16 h-16 text-slate-400 group-hover:text-primary group-hover:-translate-y-2 transition-all duration-300" />
                                    <p className="mt-4 text-lg font-bold text-slate-700">
                                        {file ? file.name : "Seret PDF atau klik untuk mencari"}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">Ukuran maksimal file: 50MB</p>
                                    <input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label>Judul Dokumen</Label>
                                        <Input placeholder="Contoh: Kontrak Kerjasama 2024" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 text-lg rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subjek (Opsional)</Label>
                                        <Textarea placeholder="Pesan singkat untuk approver..." value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl resize-none" />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 mt-4"
                                    disabled={!file || !title || uploadMutation.isPending}
                                    onClick={proceedToConfig}
                                >
                                    {uploadMutation.isPending ? "Mengupload..." : "Lanjutkan"} <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="max-w-2xl mx-auto">
                        <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
                            <CardHeader className="bg-slate-900 text-white p-8">
                                <CardTitle className="text-2xl">Siapkan Approver</CardTitle>
                                <CardDescription className="text-slate-400">Tentukan urutan orang yang harus menandatangani dokumen ini.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-sm font-semibold text-slate-700">Tambah Approver</Label>
                                    <div className="flex gap-2">
                                        <Popover open={openPopover} onOpenChange={setOpenPopover}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openPopover}
                                                    className="w-full justify-between h-12 text-left font-normal border-slate-200 hover:border-primary/50"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                                        <span className="truncate">
                                                            {searchValue || "Cari karyawan (Nama atau NIK)..."}
                                                        </span>
                                                    </div>
                                                    <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Ketik nama atau NIK..."
                                                        value={searchValue}
                                                        onValueChange={setSearchValue}
                                                    />
                                                    <CommandList>
                                                        {employeesLoading && <CommandEmpty>Memuat data...</CommandEmpty>}
                                                        {!employeesLoading && employees.length === 0 && (
                                                            <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
                                                        )}
                                                        <CommandGroup>
                                                            {employees
                                                                .filter((emp: any) =>
                                                                    emp.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                                                                    emp.id.toLowerCase().includes(searchValue.toLowerCase())
                                                                )
                                                                .slice(0, 100) // Limit to 100 for performance
                                                                .map((emp: any) => (
                                                                    <CommandItem
                                                                        key={emp.id}
                                                                        value={emp.id}
                                                                        onSelect={() => {
                                                                            addApprover(emp.id);
                                                                            setOpenPopover(false);
                                                                            setSearchValue("");
                                                                        }}
                                                                        className="flex flex-col items-start py-3 cursor-pointer"
                                                                    >
                                                                        <div className="flex flex-col text-left w-full">
                                                                            <span className="font-bold text-sm">{emp.name}</span>
                                                                            <span className="text-xs text-slate-500">{emp.id} - {emp.position}</span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-sm font-bold uppercase tracking-widest text-slate-500">Urutan Approval (Sequential)</Label>
                                    <div className="space-y-3">
                                        {selectedApprovers.length > 0 ? (
                                            selectedApprovers.map((app, i) => (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    key={app.id}
                                                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl group hover:border-primary hover:shadow-md transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800">{app.name}</p>
                                                        <p className="text-xs text-slate-500 uppercase tracking-tighter">Approver Ke-{i + 1}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => removeApprover(app.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-slate-50 text-slate-400">
                                                Belum ada approver yang ditambahkan.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => setStep(1)}>
                                        <ArrowLeft className="w-5 h-5 mr-2" /> Kembali
                                    </Button>
                                    <Button
                                        className="flex-3 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 px-8"
                                        disabled={selectedApprovers.length === 0}
                                        onClick={() => setStep(3)}
                                    >
                                        Konfigurasi Tanda Tangan <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-[calc(100vh-250px)]">
                        <UsignPdfEditor
                            fileUrl={tempFileUrl!}
                            approvers={selectedApprovers}
                            onSave={(boxes) => {
                                setSignatureBoxes(boxes);
                                setStep(4);
                            }}
                        />
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
                        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-b from-primary to-blue-700 text-white text-center">
                            <CardContent className="p-12 space-y-8">
                                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-6">
                                    <Send className="w-10 h-10 text-white" />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold">Siap Mengirim?</h2>
                                    <p className="text-blue-100 text-sm opacity-80">
                                        Dokumen *{title}* akan dikirimkan ke **{selectedApprovers.length}** approver secara berurutan.
                                    </p>
                                </div>

                                <div className="bg-black/10 p-4 rounded-2xl border border-white/10 text-left space-y-2">
                                    <div className="flex justify-between text-xs opacity-70">
                                        <span>Alur Approval</span>
                                        <span>{selectedApprovers.length} Tahap</span>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {selectedApprovers.slice(0, 5).map(app => (
                                            <div key={app.id} className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center text-[10px] font-bold ring-2 ring-primary">
                                                {app.name.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        className="h-14 rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white"
                                        onClick={() => setStep(3)}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Tinjau Kembali
                                    </Button>
                                    <Button
                                        className="h-14 rounded-2xl bg-white text-primary hover:bg-slate-100 font-bold text-lg shadow-xl"
                                        disabled={startFlowMutation.isPending}
                                        onClick={() => startFlowMutation.mutate()}
                                    >
                                        {startFlowMutation.isPending ? "Mengirim..." : "Kirim Permintaan Sekarang"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
