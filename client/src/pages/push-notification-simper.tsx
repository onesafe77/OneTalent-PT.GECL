import { useState, useMemo, useEffect } from "react"; // Added useEffect
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Added Input
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getExpiryStatus } from "@/lib/expiry-utils";
import type { Employee } from "@shared/schema";
import {
    Send,
    RefreshCw,
    Car,
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Filter,
    Bot,
    Wand2,
    Edit3,
    Settings // Added Settings icon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter // Added DialogFooter
} from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";

interface ExpiringDocument {
    employeeId: string;
    employeeName: string;
    phone: string;
    docType: 'SIMPOL' | 'SIMPER BIB' | 'SIMPER TIA';
    status: string;
    daysLeft: number | null;
    expiredDate: string | null;
    badgeClass: string;
}

export default function PushNotificationSimper() {
    const { toast } = useToast();
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings state

    // Mystic AI & Message customization state
    const [useMystic, setUseMystic] = useState(false);
    const [customMessage, setCustomMessage] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [showEditor, setShowEditor] = useState(false);

    // Settings form state
    const [apiKey, setApiKey] = useState("");
    const [adminPhone, setAdminPhone] = useState("");

    // Fetch settings
    const { data: settings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ["/api/settings/whatsapp"],
        queryFn: async () => {
            const res = await fetch("/api/settings/whatsapp");
            if (!res.ok) throw new Error("Failed to fetch settings");
            return res.json();
        }
    });

    // Update form when settings load
    useEffect(() => {
        if (settings) {
            setAdminPhone(settings.adminPhone || "");
            // API key is masked, so we don't set it directly to avoid overwriting with mask if saved
        }
    }, [settings]);

    // Save settings mutation
    const saveSettingsMutation = useMutation({
        mutationFn: async (data: { apiKey: string, adminPhone: string }) => {
            const res = await fetch("/api/settings/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to save settings");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Berhasil", description: "Pengaturan WhatsApp disimpan" });
            setIsSettingsOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/settings/whatsapp"] });
        },
        onError: (error) => {
            toast({ title: "Gagal", description: `Gagal menyimpan pengaturan: ${error.message}`, variant: "destructive" });
        }
    });

    const handleSaveSettings = () => {
        saveSettingsMutation.mutate({ apiKey, adminPhone });
    };

    // Fetch all employees
    const { data: response, isLoading, refetch } = useQuery<{ data: Employee[] }>({
        queryKey: ["/api/employees", "push-notif"],
        queryFn: async () => {
            const res = await fetch("/api/employees?page=1&per_page=1000");
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        }
    });

    const employees = response?.data || [];

    // Process expiring documents
    const expiringDocs = useMemo(() => {
        const docs: ExpiringDocument[] = [];

        employees.forEach(emp => {
            const phone = emp.phone || "";

            // SIMPOL
            const simpol = getExpiryStatus(emp.expiredSimpol);
            if (['expired', 'kritis', 'warning'].includes(simpol.level)) {
                docs.push({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    phone,
                    docType: 'SIMPOL',
                    status: simpol.status,
                    daysLeft: simpol.daysLeft,
                    expiredDate: emp.expiredSimpol || null,
                    badgeClass: simpol.badgeClass
                });
            }

            // SIMPER BIB
            const bib = getExpiryStatus(emp.expiredSimperBib);
            if (['expired', 'kritis', 'warning'].includes(bib.level)) {
                docs.push({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    phone,
                    docType: 'SIMPER BIB',
                    status: bib.status,
                    daysLeft: bib.daysLeft,
                    expiredDate: emp.expiredSimperBib || null,
                    badgeClass: bib.badgeClass
                });
            }

            // SIMPER TIA
            const tia = getExpiryStatus(emp.expiredSimperTia);
            if (['expired', 'kritis', 'warning'].includes(tia.level)) {
                docs.push({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    phone,
                    docType: 'SIMPER TIA',
                    status: tia.status,
                    daysLeft: tia.daysLeft,
                    expiredDate: emp.expiredSimperTia || null,
                    badgeClass: tia.badgeClass
                });
            }
        });

        // Sort by urgency
        const priorityOrder = { 'EXPIRED': 0, 'KRITIS': 1, 'WARNING': 2 };
        docs.sort((a, b) => (priorityOrder[a.status as keyof typeof priorityOrder] ?? 3) - (priorityOrder[b.status as keyof typeof priorityOrder] ?? 3));

        return docs;
    }, [employees]);

    // Apply filters
    const filteredDocs = useMemo(() => {
        return expiringDocs.filter(doc => {
            const matchType = filterType === "all" || doc.docType === filterType;
            const matchStatus = filterStatus === "all" || doc.status === filterStatus;
            return matchType && matchStatus;
        });
    }, [expiringDocs, filterType, filterStatus]);

    // Toggle selection
    const toggleSelection = (key: string) => {
        const newSet = new Set(selectedDocs);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedDocs(newSet);
    };

    // Select all
    const selectAll = () => {
        if (selectedDocs.size === filteredDocs.length) {
            setSelectedDocs(new Set());
        } else {
            const allKeys = filteredDocs.map(d => `${d.employeeId}-${d.docType}`);
            setSelectedDocs(new Set(allKeys));
        }
    };

    // Send mutation
    const sendMutation = useMutation({
        mutationFn: async (doc: ExpiringDocument) => {
            const res = await fetch("/api/whatsapp/send-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: doc.phone,
                    name: doc.employeeName,
                    docType: doc.docType,
                    daysLeft: doc.daysLeft,
                    expiredDate: doc.expiredDate,
                    customMessage: customMessage || undefined
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Send failed");
            }
            return res.json();
        },
        onSuccess: (_, doc) => {
            toast({ title: "Berhasil", description: `WhatsApp terkirim ke ${doc.employeeName}` });
        },
        onError: (error: Error, doc) => {
            toast({ title: "Gagal", description: `Gagal kirim ke ${doc.employeeName}: ${error.message}`, variant: "destructive" });
        }
    });

    // Send to selected
    const sendToSelected = async () => {
        const toSend = filteredDocs.filter(d => selectedDocs.has(`${d.employeeId}-${d.docType}`));

        if (toSend.length === 0) {
            toast({ title: "Tidak ada yang dipilih", description: "Pilih karyawan yang ingin dikirim reminder", variant: "destructive" });
            return;
        }

        // Capture current customMessage value
        const messageToSend = customMessage || undefined;

        for (const doc of toSend) {
            const key = `${doc.employeeId}-${doc.docType}`;
            setSendingIds(prev => new Set(prev).add(key));

            try {
                // Send directly with current state
                const res = await fetch("/api/whatsapp/send-reminder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phone: doc.phone,
                        name: doc.employeeName,
                        docType: doc.docType,
                        daysLeft: doc.daysLeft,
                        expiredDate: doc.expiredDate,
                        customMessage: messageToSend
                    })
                });

                if (res.ok) {
                    toast({ title: "Berhasil", description: `WhatsApp terkirim ke ${doc.employeeName}` });
                } else {
                    const error = await res.json();
                    toast({ title: "Gagal", description: `Gagal kirim ke ${doc.employeeName}: ${error.message}`, variant: "destructive" });
                }
            } catch (e) {
                toast({ title: "Gagal", description: `Error: ${String(e)}`, variant: "destructive" });
            }

            setSendingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }

        setSelectedDocs(new Set());
    };

    // Stats
    const stats = useMemo(() => ({
        total: expiringDocs.length,
        expired: expiringDocs.filter(d => d.status === 'EXPIRED').length,
        kritis: expiringDocs.filter(d => d.status === 'KRITIS').length,
        warning: expiringDocs.filter(d => d.status === 'WARNING').length,
        noPhone: expiringDocs.filter(d => !d.phone).length
    }), [expiringDocs]);

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data...</div>;
    }

    return (
        <div className="space-y-6 pb-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Push Notifikasi SIMPER</h1>
                    <p className="text-sm text-muted-foreground">
                        Kirim reminder WhatsApp untuk SIMPOL, SIMPER BIB, dan SIMPER TIA yang akan expired
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Settings className="w-4 h-4 mr-2" /> Settings
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Konfigurasi WhatsApp API</DialogTitle>
                                <DialogDescription>
                                    Masukkan API Key dari Notifyme.id untuk menggunakan layanan WhatsApp.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">API Key Notifyme.id</Label>
                                    <Input
                                        id="apiKey"
                                        type="password"
                                        placeholder={settings?.apiKey ? "••••••••" : "Masukkan API Key"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                    {settings?.isConfigured && <p className="text-xs text-green-600 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Terkonfigurasi</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminPhone">Nomor WhatsApp Admin (untuk notifikasi sistem)</Label>
                                    <Input
                                        id="adminPhone"
                                        placeholder="628xxxxxxxxxx"
                                        value={adminPhone}
                                        onChange={(e) => setAdminPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Batal</Button>
                                <Button onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending}>
                                    {saveSettingsMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                    Simpan Pengaturan
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button onClick={sendToSelected} disabled={selectedDocs.size === 0 || sendMutation.isPending}>
                        <Send className="w-4 h-4 mr-2" /> Kirim ({selectedDocs.size})
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-red-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Expired</p>
                                <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-700" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Kritis</p>
                                <p className="text-2xl font-bold text-red-500">{stats.kritis}</p>
                            </div>
                            <Clock className="w-8 h-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Warning</p>
                                <p className="text-2xl font-bold text-amber-500">{stats.warning}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-gray-400">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">No HP Kosong</p>
                                <p className="text-2xl font-bold text-gray-500">{stats.noPhone}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter & Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Jenis Dokumen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Dokumen</SelectItem>
                                <SelectItem value="SIMPOL">SIMPOL</SelectItem>
                                <SelectItem value="SIMPER BIB">SIMPER BIB</SelectItem>
                                <SelectItem value="SIMPER TIA">SIMPER TIA</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="EXPIRED">🔴 EXPIRED</SelectItem>
                                <SelectItem value="KRITIS">🟠 KRITIS</SelectItem>
                                <SelectItem value="WARNING">🟡 WARNING</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={selectAll}>
                            {selectedDocs.size === filteredDocs.length ? "Batal Pilih Semua" : "Pilih Semua"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Message Customization */}
            <Card className="shadow-sm border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-purple-500" /> Kustomisasi Pesan
                    </CardTitle>
                    <CardDescription>
                        Edit template pesan atau gunakan Mystic AI untuk generate pesan personal
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="mystic-mode"
                                    checked={useMystic}
                                    onCheckedChange={(checked) => {
                                        setUseMystic(checked);
                                        if (checked) setShowEditor(false); // Mutually exclusive
                                    }}
                                />
                                <Label htmlFor="mystic-mode" className="flex items-center gap-2">
                                    <Bot className="w-4 h-4" /> Gunakan Mystic AI
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="show-editor"
                                    checked={showEditor}
                                    onCheckedChange={(checked) => {
                                        setShowEditor(checked);
                                        if (checked) setUseMystic(false); // Mutually exclusive
                                    }}
                                />
                                <Label htmlFor="show-editor">Edit Manual</Label>
                            </div>
                        </div>
                        {useMystic && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    setIsGenerating(true);
                                    try {
                                        // Use selected doc or first filtered doc
                                        const firstSelected = filteredDocs.find(d => selectedDocs.has(`${d.employeeId}-${d.docType}`)) || filteredDocs[0];
                                        if (firstSelected) {
                                            const res = await fetch("/api/si-asef/chat", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    message: `Buatkan template pesan WhatsApp reminder SIMPER yang ramah dan personal. 
PENTING: Gunakan placeholder berikut dalam pesan (WAJIB):
- {nama} untuk nama karyawan
- {docType} untuk jenis dokumen (SIMPOL/SIMPER BIB/SIMPER TIA)  
- {daysLeft} untuk sisa hari sebelum expired
- {expiredDate} untuk tanggal expired

Contoh context: ${firstSelected.docType} expired dalam ${firstSelected.daysLeft} hari.

Pesan harus pendek, profesional tapi ramah. Akhiri dengan "- OneTalent GECL". 
JANGAN tulis nama asli, PAKAI {nama}.`,
                                                    conversationHistory: []
                                                })
                                            });
                                            if (res.ok) {
                                                const data = await res.json();
                                                setCustomMessage(data.message || "");
                                                setShowEditor(true);
                                                setUseMystic(false); // Turn off Mystic, show editor instead
                                                toast({ title: "✨ Mystic AI", description: "Pesan berhasil di-generate!" });
                                            } else {
                                                toast({ title: "Error", description: "Gagal generate pesan dari Mystic", variant: "destructive" });
                                            }
                                        } else {
                                            toast({ title: "Info", description: "Tidak ada karyawan dengan dokumen expiring", variant: "destructive" });
                                        }
                                    } catch (e) {
                                        toast({ title: "Error", description: "Gagal generate pesan", variant: "destructive" });
                                    }
                                    setIsGenerating(false);
                                }}
                                disabled={isGenerating || filteredDocs.length === 0}
                            >
                                {isGenerating ? (
                                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Wand2 className="w-4 h-4 mr-2" /> Generate dengan Mystic</>
                                )}
                            </Button>
                        )}
                    </div>

                    {showEditor && (
                        <div className="space-y-2">
                            <Label>Template Pesan (variabel: {'{nama}'}, {'{docType}'}, {'{daysLeft}'}, {'{expiredDate}'})</Label>
                            <Textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                placeholder="Contoh: Halo {nama}, {docType} Anda akan expired dalam {daysLeft} hari..."
                                rows={5}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">💡 Kosongkan untuk menggunakan template default</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee List */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                        Daftar Karyawan ({filteredDocs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[500px] overflow-y-auto space-y-2">
                        {filteredDocs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                                <p>Tidak ada dokumen yang akan expired</p>
                            </div>
                        ) : (
                            filteredDocs.map((doc, idx) => {
                                const key = `${doc.employeeId}-${doc.docType}`;
                                const isSelected = selectedDocs.has(key);
                                const isSending = sendingIds.has(key);
                                const hasPhone = !!doc.phone;

                                return (
                                    <div
                                        key={`${key}-${idx}`}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isSelected ? "bg-primary/5 border-primary" : "bg-slate-50 dark:bg-gray-800/50 hover:bg-slate-100"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelection(key)}
                                                disabled={!hasPhone || isSending}
                                            />
                                            <Avatar className="h-10 w-10 border">
                                                <AvatarFallback className="text-sm">{doc.employeeName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{doc.employeeName}</p>
                                                <p className="text-xs text-muted-foreground">{doc.employeeId}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    📱 {doc.phone || <span className="text-red-500">No HP kosong!</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <Badge variant="outline" className="text-xs">
                                                {doc.docType === 'SIMPOL' && <ShieldAlert className="w-3 h-3 mr-1" />}
                                                {(doc.docType === 'SIMPER BIB' || doc.docType === 'SIMPER TIA') && <Car className="w-3 h-3 mr-1" />}
                                                {doc.docType}
                                            </Badge>
                                            <Badge className={`${doc.badgeClass} text-xs`}>
                                                {doc.status}
                                                {doc.daysLeft !== null && (
                                                    doc.daysLeft < 0
                                                        ? ` (${Math.abs(doc.daysLeft)}d ago)`
                                                        : ` (${doc.daysLeft}d)`
                                                )}
                                            </Badge>
                                            {isSending && (
                                                <Badge className="bg-blue-500 text-white text-xs animate-pulse">
                                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Mengirim...
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
