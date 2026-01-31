import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
    MessageSquare, Image, Video, Send, Upload, X, AlertCircle, CheckCircle,
    Users, UserCheck, Search, Filter, History, FileText, Trash2, Eye,
    ChevronDown, Check, RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type BlastType = "text" | "image" | "video";
type RecipientType = "all" | "selected";

interface Employee {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
    phone: string;
    status: string | null;
}

interface Template {
    id: string;
    name: string;
    message: string;
    blastType: string;
    mediaUrls: string[] | null;
    createdAt: string;
}

interface Blast {
    id: string;
    subject: string | null;
    message: string;
    blastType: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    status: string;
    createdAt: string;
    completedAt: string | null;
}

interface BlastResult {
    success: boolean;
    blastId: string;
    totalRecipients: number;
    sent: number;
    failed: number;
    failedNumbers: string[];
}

export default function BlastWhatsApp() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("compose");

    // Form state
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [blastType, setBlastType] = useState<BlastType>("text");
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
    const [result, setResult] = useState<BlastResult | null>(null);

    // Recipient state
    const [recipientType, setRecipientType] = useState<RecipientType>("all");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");

    // Template state
    const [templateName, setTemplateName] = useState("");
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Test send state
    const [testPhone, setTestPhone] = useState("");
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Detail modal state
    const [selectedBlastId, setSelectedBlastId] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Queries
    const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
        queryKey: ["/api/whatsapp/employees"],
        queryFn: async () => {
            const res = await fetch("/api/whatsapp/employees");
            if (!res.ok) throw new Error("Failed to fetch employees");
            return res.json();
        },
    });

    const { data: templates = [] } = useQuery<Template[]>({
        queryKey: ["/api/whatsapp/templates"],
        queryFn: async () => {
            const res = await fetch("/api/whatsapp/templates");
            if (!res.ok) throw new Error("Failed to fetch templates");
            return res.json();
        },
    });

    const { data: blasts = [], isLoading: isLoadingBlasts } = useQuery<Blast[]>({
        queryKey: ["/api/whatsapp/blasts"],
        queryFn: async () => {
            const res = await fetch("/api/whatsapp/blasts");
            if (!res.ok) throw new Error("Failed to fetch blasts");
            return res.json();
        },
    });

    const { data: blastDetail } = useQuery({
        queryKey: ["/api/whatsapp/blasts", selectedBlastId],
        queryFn: async () => {
            if (!selectedBlastId) return null;
            const res = await fetch(`/api/whatsapp/blasts/${selectedBlastId}`);
            if (!res.ok) throw new Error("Failed to fetch blast detail");
            return res.json();
        },
        enabled: !!selectedBlastId,
    });

    // Computed values
    const departments = useMemo(() => {
        const depts = new Set(employees.map(e => e.department).filter(Boolean));
        return Array.from(depts) as string[];
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(e => {
            const matchesSearch = !searchQuery ||
                e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.phone.includes(searchQuery);
            const matchesDept = departmentFilter === "all" || e.department === departmentFilter;
            return matchesSearch && matchesDept;
        });
    }, [employees, searchQuery, departmentFilter]);

    // Mutations
    const blastMutation = useMutation({
        mutationFn: async () => {
            const body = {
                subject,
                message,
                type: blastType,
                mediaUrls: uploadedUrls.filter(u => u),
                recipientType,
                selectedEmployeeIds: recipientType === "selected" ? selectedEmployeeIds : [],
            };

            const response = await fetch("/api/whatsapp/blast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Blast failed");
            }
            return response.json();
        },
        onSuccess: (data) => {
            setResult(data);
            queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/blasts"] });
            toast({
                title: "Blast Selesai!",
                description: `${data.sent} terkirim, ${data.failed} gagal`,
                variant: data.failed > 0 ? "destructive" : "default",
            });
        },
        onError: (error) => {
            toast({ title: "Blast gagal", description: String(error), variant: "destructive" });
        },
    });

    const saveTemplateMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/whatsapp/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: templateName,
                    message,
                    blastType,
                    mediaUrls: uploadedUrls.filter(u => u),
                }),
            });
            if (!response.ok) throw new Error("Failed to save template");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
            toast({ title: "Template disimpan!" });
            setShowSaveTemplate(false);
            setTemplateName("");
        },
        onError: (error) => {
            toast({ title: "Gagal menyimpan template", description: String(error), variant: "destructive" });
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete template");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
            toast({ title: "Template dihapus" });
        },
    });

    const testSendMutation = useMutation({
        mutationFn: async () => {
            const body: any = { phone: testPhone, message, type: blastType };
            if (blastType === "image" && uploadedUrls[0]) body.imageUrl = uploadedUrls[0];
            if (blastType === "video" && uploadedUrls[0]) body.videoUrl = uploadedUrls[0];

            const response = await fetch("/api/whatsapp/test-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Test send failed");
            return data;
        },
        onSuccess: () => {
            setTestResult({ success: true, message: "Pesan test berhasil dikirim!" });
            toast({ title: "Test Berhasil", description: `Pesan berhasil dikirim ke ${testPhone}` });
        },
        onError: (error) => {
            setTestResult({ success: false, message: String(error) });
            toast({ title: "Test Gagal", description: String(error), variant: "destructive" });
        },
    });

    // Handlers
    const handleBlast = () => {
        if (!message.trim()) {
            toast({ title: "Pesan wajib diisi", variant: "destructive" });
            return;
        }
        if (blastType !== "text" && uploadedUrls.length === 0) {
            toast({ title: "Upload file terlebih dahulu", variant: "destructive" });
            return;
        }
        if (recipientType === "selected" && selectedEmployeeIds.length === 0) {
            toast({ title: "Pilih minimal satu penerima", variant: "destructive" });
            return;
        }
        blastMutation.mutate();
    };

    const handleTestSend = () => {
        if (!testPhone.trim() || !message.trim()) {
            toast({ title: "Nomor dan pesan wajib diisi", variant: "destructive" });
            return;
        }
        testSendMutation.mutate();
    };

    const handleSelectAll = () => {
        setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
    };

    const handleDeselectAll = () => {
        setSelectedEmployeeIds([]);
    };

    const handleToggleEmployee = (id: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleLoadTemplate = (template: Template) => {
        setMessage(template.message);
        setBlastType(template.blastType as BlastType);
        setUploadedUrls(template.mediaUrls || []);
        setSelectedTemplateId(template.id);
        toast({ title: "Template dimuat", description: template.name });
    };

    const resetForm = () => {
        setSubject("");
        setMessage("");
        setUploadedUrls([]);
        setResult(null);
        setSelectedEmployeeIds([]);
        setRecipientType("all");
    };

    const recipientCount = recipientType === "all" ? employees.length : selectedEmployeeIds.length;

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 lg:p-8 space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div variants={itemVariants}>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                        Blast WhatsApp
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Kirim pengumuman massal ke karyawan via WhatsApp dengan mudah & cepat.
                    </p>
                </motion.div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <motion.div variants={itemVariants}>
                    <TabsList className="grid w-full grid-cols-3 lg:w-[480px] p-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-sm">
                        <TabsTrigger
                            value="compose"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all duration-300"
                        >
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                <span className="font-medium">Buat Pesan</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-sm transition-all duration-300"
                        >
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4" />
                                <span className="font-medium">Riwayat</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="templates"
                            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-sm transition-all duration-300"
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="font-medium">Template</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>
                </motion.div>

                {/* COMPOSE TAB */}
                <TabsContent value="compose" className="space-y-6 focus-visible:ring-0">
                    <div className="grid gap-8 lg:grid-cols-12">
                        {/* Left Column - Message Form */}
                        <motion.div variants={itemVariants} className="lg:col-span-7 space-y-6">
                            <Card className="border-none shadow-xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-gray-100">
                                        <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">1</span>
                                        Buat Pengumuman
                                    </CardTitle>
                                    <CardDescription>Pilih jenis pesan, target penerima, dan isi konten Anda.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Template Selector */}
                                    {templates.length > 0 && (
                                        <div className="space-y-2 p-4 bg-gray-50/80 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Load</Label>
                                            <Select onValueChange={(id) => {
                                                const t = templates.find(t => t.id === id);
                                                if (t) handleLoadTemplate(t);
                                            }}>
                                                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <SelectValue placeholder="Pilih template yang tersimpan..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Subject */}
                                    <div className="space-y-2">
                                        <Label>Judul (tracking internal)</Label>
                                        <Input
                                            placeholder="Contoh: Pengumuman Libur Natal 2026"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                        />
                                    </div>

                                    {/* Blast Type */}
                                    <div className="space-y-3">
                                        <Label>Jenis Pesan</Label>
                                        <RadioGroup
                                            value={blastType}
                                            onValueChange={(v) => {
                                                setBlastType(v as BlastType);
                                                setUploadedUrls([]);
                                            }}
                                            className="grid grid-cols-3 gap-3"
                                        >
                                            {[
                                                { value: "text", icon: MessageSquare, label: "Teks" },
                                                { value: "image", icon: Image, label: "Gambar" },
                                                { value: "video", icon: Video, label: "Video" },
                                            ].map(({ value, icon: Icon, label }) => (
                                                <div key={value} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${blastType === value ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 hover:border-gray-300"}`}>
                                                    <RadioGroupItem value={value} id={value} />
                                                    <Label htmlFor={value} className="flex items-center gap-2 cursor-pointer">
                                                        <Icon className="w-4 h-4" /> {label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-2">
                                        <Label>Isi Pesan *</Label>
                                        <Textarea
                                            placeholder="Ketik pesan pengumuman..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            rows={4}
                                        />
                                    </div>

                                    {/* Media URL */}
                                    {blastType !== "text" && (
                                        <div className="space-y-2">
                                            <Label>{blastType === "image" ? "URL Gambar" : "URL Video"} (Publik)</Label>
                                            <p className="text-xs text-amber-600">
                                                ⚠️ Gunakan URL publik (imgbb, imgur, Google Drive publik)
                                            </p>
                                            <Input
                                                placeholder="https://example.com/image.jpg"
                                                value={uploadedUrls[0] || ""}
                                                onChange={(e) => setUploadedUrls([e.target.value])}
                                            />
                                            {uploadedUrls[0] && (
                                                <div className="flex items-center gap-2 text-sm text-green-600">
                                                    <CheckCircle className="w-4 h-4" /> URL siap digunakan
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Save as Template */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowSaveTemplate(true)}
                                            disabled={!message.trim()}
                                        >
                                            <FileText className="w-4 h-4 mr-1" /> Simpan Template
                                        </Button>
                                    </div>

                                    {/* Test Send */}
                                    <div className="p-4 border border-dashed rounded-lg space-y-3">
                                        <Label className="text-sm font-medium">🧪 Test Kirim</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="081234567890"
                                                value={testPhone}
                                                onChange={(e) => setTestPhone(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={handleTestSend}
                                                disabled={testSendMutation.isPending || !message.trim()}
                                            >
                                                {testSendMutation.isPending ? "..." : "Test"}
                                            </Button>
                                        </div>
                                        {testResult && (
                                            <p className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                                {testResult.message}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                        </motion.div>

                        {/* Right Column - Recipients & Preview */}
                        <motion.div variants={itemVariants} className="lg:col-span-5 space-y-6">
                            {/* Recipient Selection */}
                            <Card className="border-none shadow-xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs">2</span>
                                        Penerima
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <RadioGroup
                                        value={recipientType}
                                        onValueChange={(v) => setRecipientType(v as RecipientType)}
                                        className="grid grid-cols-2 gap-3"
                                    >
                                        <div className={`relative flex items-center space-x-2 p-3 border rounded-xl cursor-pointer transition-all duration-200 ${recipientType === "all" ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-purple-500/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                                            <RadioGroupItem value="all" id="all" />
                                            <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer font-medium">
                                                <Users className="w-4 h-4 text-purple-500" /> Semua
                                                <span className="text-xs font-normal text-muted-foreground">({employees.length})</span>
                                            </Label>
                                        </div>
                                        <div className={`relative flex items-center space-x-2 p-3 border rounded-xl cursor-pointer transition-all duration-200 ${recipientType === "selected" ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-purple-500/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                                            <RadioGroupItem value="selected" id="selected" />
                                            <Label htmlFor="selected" className="flex items-center gap-2 cursor-pointer font-medium">
                                                <UserCheck className="w-4 h-4 text-purple-500" /> Manual
                                            </Label>
                                        </div>
                                    </RadioGroup>

                                    {recipientType === "selected" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input
                                                        placeholder="Cari..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="pl-9 bg-white dark:bg-gray-800"
                                                    />
                                                </div>
                                                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                                    <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800">
                                                        <Filter className="w-3.5 h-3.5 mr-2 text-gray-500" />
                                                        <SelectValue placeholder="Dept" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Semua</SelectItem>
                                                        {departments.map(d => (
                                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
                                                    Check All
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handleDeselectAll} className="h-8 text-xs">
                                                    Uncheck All
                                                </Button>
                                                <Badge variant="secondary" className="ml-auto">{selectedEmployeeIds.length} dipilih</Badge>
                                            </div>

                                            <ScrollArea className="h-[250px] border rounded-lg bg-white/50 dark:bg-gray-900/50 p-2">
                                                {filteredEmployees.map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        className="flex items-center gap-3 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md cursor-pointer transition-colors"
                                                        onClick={() => handleToggleEmployee(emp.id)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedEmployeeIds.includes(emp.id)}
                                                            onCheckedChange={() => handleToggleEmployee(emp.id)}
                                                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{emp.name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                <span>{emp.phone}</span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                                <span className="truncate">{emp.department}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </ScrollArea>
                                        </motion.div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Preview & Send */}
                            <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 ring-1 ring-blue-100 dark:ring-blue-900/20">
                                <CardHeader className="pb-3 border-b border-blue-100/50 dark:border-blue-900/20">
                                    <CardTitle className="flex items-center gap-2 text-lg text-blue-900 dark:text-blue-100">
                                        <span className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-100 flex items-center justify-center text-xs">3</span>
                                        Preview & Kirim
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="p-4 bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full" />
                                        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 relative z-10 font-sans leading-relaxed">
                                            {message || "Pratinjau pesan akan muncul di sini..."}
                                        </p>
                                        {uploadedUrls[0] && (
                                            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                                <Image className="w-4 h-4 text-gray-400" />
                                                <p className="text-xs text-gray-500 font-mono truncate">{uploadedUrls[0]}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg text-center border border-white/20">
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{recipientCount}</p>
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Penerima</p>
                                        </div>
                                        <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg text-center border border-white/20">
                                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{blastType}</p>
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipe</p>
                                        </div>
                                    </div>

                                    {blastMutation.isPending && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Mengirim pesan...</span>
                                                <span>Mohon tunggu</span>
                                            </div>
                                            <Progress className="h-2" value={45} />
                                        </div>
                                    )}

                                    {result && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-3"
                                        >
                                            <Alert variant={result.failed > 0 ? "destructive" : "default"} className="border-l-4">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="font-medium">
                                                    Blast selesai! {result.sent} terkirim, {result.failed} gagal.
                                                </AlertDescription>
                                            </Alert>
                                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <p className="font-bold text-gray-700">{result.totalRecipients}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase">Total</p>
                                                </div>
                                                <div className="p-2 bg-green-50 rounded-lg shadow-sm border border-green-100">
                                                    <p className="font-bold text-green-600">{result.sent}</p>
                                                    <p className="text-[10px] text-green-600/70 uppercase">Sukses</p>
                                                </div>
                                                <div className="p-2 bg-red-50 rounded-lg shadow-sm border border-red-100">
                                                    <p className="font-bold text-red-600">{result.failed}</p>
                                                    <p className="text-[10px] text-red-600/70 uppercase">Gagal</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" onClick={resetForm} className="w-full">
                                                <RefreshCw className="w-4 h-4 mr-2" /> Buat Baru
                                            </Button>
                                        </motion.div>
                                    )}

                                    {!result && (
                                        <Button
                                            onClick={handleBlast}
                                            disabled={blastMutation.isPending || !message.trim()}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 h-12 text-base font-semibold group transition-all duration-300 hover:scale-[1.02]"
                                        >
                                            {blastMutation.isPending ? "Mengirim..." : (
                                                <>
                                                    <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                                                    Kirim Sekarang
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </TabsContent>

                {/* HISTORY TAB */}
                <TabsContent value="history">
                    <motion.div variants={itemVariants}>
                        <Card className="border-none shadow-xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                            <CardHeader>
                                <CardTitle className="text-xl">Riwayat Blast</CardTitle>
                                <CardDescription>Pantau status pengiriman pesan WhatsApp Anda.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingBlasts ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                                        <p>Memuat riwayat...</p>
                                    </div>
                                ) : blasts.length === 0 ? (
                                    <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>Belum ada riwayat blast</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {blasts.map((blast, index) => (
                                            <motion.div
                                                key={blast.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer"
                                                onClick={() => {
                                                    setSelectedBlastId(blast.id);
                                                    setShowDetailModal(true);
                                                }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <Badge variant={blast.status === "completed" ? "default" : blast.status === "failed" ? "destructive" : "secondary"} className="rounded-md">
                                                            {blast.status}
                                                        </Badge>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            {format(new Date(blast.createdAt), "d MMM yyyy, HH:mm", { locale: id })}
                                                        </span>
                                                    </div>
                                                    <p className="font-semibold text-gray-900 dark:text-white truncate pr-4">{blast.subject || "Tanpa Judul"}</p>
                                                    <p className="text-sm text-gray-500 truncate">{blast.message.substring(0, 80)}...</p>
                                                </div>
                                                <div className="flex items-center gap-6 text-center">
                                                    <div className="hidden sm:block">
                                                        <p className="text-lg font-bold text-green-600">{blast.sentCount}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sent</p>
                                                    </div>
                                                    <div className="hidden sm:block">
                                                        <p className="text-lg font-bold text-red-600">{blast.failedCount}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Failed</p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 -rotate-90" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>

                {/* TEMPLATES TAB */}
                <TabsContent value="templates">
                    <motion.div variants={itemVariants}>
                        <Card className="border-none shadow-xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                            <CardHeader>
                                <CardTitle className="text-xl">Template Pesan</CardTitle>
                                <CardDescription>Kelola template pesan untuk penggunaan berulang.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {templates.length === 0 ? (
                                    <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>Belum ada template. Buat di tab "Buat Pesan".</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {templates.map((template, index) => (
                                            <motion.div
                                                key={template.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group relative p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${template.blastType === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {template.blastType === 'image' ? <Image className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                                        </div>
                                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">{template.name}</h4>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full">
                                                        {format(new Date(template.createdAt), "d MMM", { locale: id })}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 min-h-[60px]">
                                                    {template.message}
                                                </p>

                                                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-50 dark:border-gray-800">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs hover:bg-blue-50 hover:text-blue-600"
                                                        onClick={() => {
                                                            handleLoadTemplate(template);
                                                            setActiveTab("compose");
                                                        }}
                                                    >
                                                        <Send className="w-3 h-3 mr-1.5" /> Gunakan
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>
            </Tabs>

            {/* Save Template Dialog */}
            <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Simpan Template</DialogTitle>
                        <DialogDescription>Beri nama untuk template ini</DialogDescription>
                    </DialogHeader>
                    <Input
                        placeholder="Nama template..."
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Batal</Button>
                        <Button onClick={() => saveTemplateMutation.mutate()} disabled={!templateName.trim()}>
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            {/* Blast Detail Dialog */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Detail Blast</DialogTitle>
                    </DialogHeader>
                    {blastDetail && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{blastDetail.blast.totalRecipients}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total</p>
                                </div>
                                <div className="p-4 bg-green-50/50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{blastDetail.blast.sentCount}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Terkirim</p>
                                </div>
                                <div className="p-4 bg-red-50/50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{blastDetail.blast.failedCount}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Gagal</p>
                                </div>

                            </div>

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium mb-1">Pesan:</p>
                                <p className="text-sm whitespace-pre-wrap">{blastDetail.blast.message}</p>
                            </div>

                            <div>
                                <p className="font-medium mb-2">Daftar Penerima ({blastDetail.recipients.length})</p>
                                <ScrollArea className="h-[300px] border rounded-lg">
                                    <div className="p-2 space-y-1">
                                        {blastDetail.recipients.map((r: any) => (
                                            <div key={r.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm">
                                                <div>
                                                    <p className="font-medium">{r.employeeName}</p>
                                                    <p className="text-gray-500">{r.phone}</p>
                                                </div>
                                                <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                                                    {r.status === "sent" ? "Terkirim" : r.status === "failed" ? "Gagal" : "Pending"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>

                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog >
        </motion.div >
    );
}
