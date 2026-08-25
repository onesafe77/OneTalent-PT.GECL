import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
    Building,
    Car,
    Wrench,
    Settings,
    Search,
    Plus,
    Upload,
    Download,
    AlertTriangle,
    Eye,
    Edit,
    Trash2,
    X,
    FileSpreadsheet,
    CheckCircle,
    Clock,
    ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

// Status Badges Colors
const statusUnitColors: Record<string, string> = {
    "ACTIVE": "bg-green-100 text-green-700",
    "SPARE": "bg-yellow-100 text-yellow-700",
    "DISMANTLED": "bg-gray-100 text-gray-700",
};

const statusCommColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200",
    "NEAR EXPIRED": "bg-yellow-100 text-yellow-700 border-yellow-200",
    EXPIRED: "bg-red-100 text-red-700 border-red-200",
    CLOSE: "bg-green-100 text-green-700 border-green-200",
    OPEN: "bg-orange-100 text-orange-700 border-orange-200",
};

const computeDisplayStatus = (dateString: string | null | undefined, rawStatus: string | null | undefined) => {
    if (!dateString) return rawStatus || "-";
    const expDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    if (diffTime < 0) return "EXPIRED";

    const months = differenceInMonths(expDate, today);
    return months < 2 ? "NEAR EXPIRED" : "ACTIVE";
};

// Helper function to calculate months and days until expiry
function getExpiryText(dateString: string | null | undefined) {
    if (!dateString) return null;
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    if (diffTime < 0) return <span className="text-red-500 text-xs mt-1 block font-semibold">Sudah Expired</span>;
    if (diffTime === 0) return <span className="text-orange-500 text-xs mt-1 block font-semibold">Berakhir Hari Ini</span>;

    // Use date-fns for exact months and remaining days
    const months = differenceInMonths(target, today);
    // Add those months to today to find the remaining days
    const dateAfterMonths = new Date(today);
    dateAfterMonths.setMonth(dateAfterMonths.getMonth() + months);
    const days = differenceInDays(target, dateAfterMonths);

    let parts = [];
    if (months > 0) parts.push(`${months} Bulan`);
    if (days > 0) parts.push(`${days} Hari`);

    return <span className="text-blue-600 text-xs mt-1 block font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Sisa Waktu: {parts.join(" ")}</span>;
}

// Form Schema
const formSchema = z.object({
    jenisSpip: z.string().default("PERALATAN"),
    jenisUnit: z.string().min(1, "Wajib diisi"),
    merk: z.string().min(1, "Wajib diisi"),
    type: z.string().min(1, "Wajib diisi"),
    noLambung: z.string().min(1, "Wajib diisi"),
    noPolisi: z.string().optional().nullable(),
    noRangka: z.string().optional().nullable(),
    noMesin: z.string().optional().nullable(),
    tahunPembuatan: z.coerce.number().min(2000).max(2030).optional().nullable(),
    gandar: z.coerce.number().default(4),
    volumeVessel: z.coerce.number().optional().nullable(),
    tare: z.coerce.number().optional().nullable(),
    aebs: z.string().optional().nullable(),

    tglPengajuanBib: z.string().optional().nullable(),
    expiredBib: z.string().optional().nullable(),
    statusBib: z.string().optional().nullable(),

    expiredTia: z.string().optional().nullable(),
    statusTia: z.string().optional().nullable(),

    noTma: z.string().optional().nullable(),
    statusTma: z.string().optional().nullable(),

    statusUnit: z.string().min(1, "Wajib diisi"),
    owner: z.string().optional().nullable(),
    namaPic: z.string().optional().nullable(),
    nikKtp: z.string().max(16).optional().nullable(),
    kepemilikan: z.string().optional().nullable(),
    noKontak: z.string().optional().nullable(),
    komisioner: z.string().optional().nullable(),
    keterangan: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function SPIPPeralatan() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [search, setSearch] = useState("");
    const [jenisUnit, setJenisUnit] = useState<string>("all");
    const [merk, setMerk] = useState<string>("all");
    const [statusUnit, setStatusUnit] = useState<string>("all");
    const [statusBib, setStatusBib] = useState<string>("all");
    // Urutan bawaan: nomor lambung menaik (9002 → 9156). Sebelumnya urut waktu input
    // sehingga daftar terlihat acak dan sulit dicek kelengkapannya.
    const [sortBy, setSortBy] = useState<string>("lambung");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [lambungMin, setLambungMin] = useState<string>("");
    const [lambungMax, setLambungMax] = useState<string>("");

    // View States
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);

    // Fetch Data
    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search ? { search } : {}),
        ...(jenisUnit !== "all" ? { jenis_unit: jenisUnit } : {}),
        ...(merk !== "all" ? { merk } : {}),
        ...(statusUnit !== "all" ? { status_unit: statusUnit } : {}),
        ...(statusBib !== "all" ? { status_bib: statusBib } : {}),
        sort_by: sortBy,
        sort_dir: sortDir,
        ...(lambungMin.trim() ? { lambung_min: lambungMin.trim() } : {}),
        ...(lambungMax.trim() ? { lambung_max: lambungMax.trim() } : {}),
    });

    const { data: qData, isLoading, refetch } = useQuery({
        queryKey: ["/api/spip/peralatan", queryParams.toString()],
        queryFn: async () => {
            const res = await fetch(`/api/spip/peralatan?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        }
    });

    const items = (qData as any)?.data || [];
    const total = (qData as any)?.total || 0;

    // Calculate Summaries from all items
    const { data: allData } = useQuery({
        queryKey: ["/api/spip/peralatan/all"],
        queryFn: async () => {
            const res = await fetch("/api/spip/peralatan?limit=10000");
            if (!res.ok) throw new Error("Gagal memuat semua data");
            return res.json();
        }
    });

    const allItems = allData?.data || [];
    const totalUnit = allItems.length;
    const unitActive = allItems.filter((i: any) => i.statusUnit === "ACTIVE").length;
    const unitSpare = allItems.filter((i: any) => i.statusUnit === "SPARE").length;
    const unitEv = allItems.filter((i: any) => i.jenisUnit && i.jenisUnit.includes("ELECTRIC")).length;
    const unitKonv = allItems.filter((i: any) => i.jenisUnit && i.jenisUnit.includes("KONVENSIONAL")).length;

    let stikerActive = 0;
    let stikerNearExp = 0;
    let stikerExpired = 0;

    allItems.forEach((i: any) => {
        const bib = computeDisplayStatus(i.expiredBib, i.statusBib);
        const tia = computeDisplayStatus(i.expiredTia, i.statusTia);
        const statuses = [bib, tia];
        if (statuses.includes("EXPIRED")) stikerExpired++;
        else if (statuses.includes("NEAR EXPIRED")) stikerNearExp++;
        else if (statuses.includes("ACTIVE")) stikerActive++;
    });

    // Chart Data Generation
    const expiryByMonth = allItems.reduce((acc: any, item: any) => {
        if (item.expiredBib) {
            const date = new Date(item.expiredBib);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (date >= today) {
                const numMonths = differenceInMonths(date, today);
                if (numMonths >= 0 && numMonths <= 12) {
                    const label = format(date, 'MMM yyyy', { locale: id });
                    acc[label] = (acc[label] || 0) + 1;
                }
            } else {
                const label = "Expired";
                acc[label] = (acc[label] || 0) + 1;
            }
        }
        return acc;
    }, {});

    const chartData = Object.keys(expiryByMonth).map(key => ({
        name: key,
        jumlah: expiryByMonth[key]
    })).sort((a, b) => {
        if (a.name === "Expired") return -1;
        if (b.name === "Expired") return 1;
        const dateA = new Date(`1 ${a.name}`);
        const dateB = new Date(`1 ${b.name}`);
        return dateA.getTime() - dateB.getTime();
    });

    // Handlers
    const handleExport = () => {
        window.open("/api/spip/peralatan/export", "_blank");
    };

    const getStatusKomisioning = (expiredDateStr: string | null | undefined, tglPengajuan: string | null | undefined) => {
        if (!expiredDateStr) {
            return tglPengajuan ? "OPEN" : "";
        }
        const expDate = new Date(expiredDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expDate <= today ? "EXPIRED" : "CLOSE";
    };

    return (
        <div className="space-y-6">
            {/* SECTION A — HEADER HALAMAN */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>HSE</span>
                    <span>/</span>
                    <span>KO</span>
                    <span>/</span>
                    <span>SPIP</span>
                    <span>/</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Peralatan</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SPIP Peralatan</h1>
                <p className="text-gray-500">Sarana Prasarana Instalasi Peralatan — Manajemen Unit Dump Truck.</p>
            </div>

            {/* SECTION C — ALERT BANNER */}
            {stikerExpired > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full">
                        <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="font-medium text-red-800">Perhatian: {stikerExpired} unit memiliki stiker komisioning EXPIRED</h4>
                        <p className="text-sm text-red-600">Segera lakukan perpanjangan komisioning untuk unit-unit tersebut.</p>
                    </div>
                </div>
            )}

            {/* SECTION B — SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-gray-500 mb-1">Total Unit</p>
                        <p className="text-2xl font-bold text-slate-800">{totalUnit}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-gray-500 mb-1">Unit Aktif</p>
                        <p className="text-2xl font-bold text-emerald-600">{unitActive}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-gray-500 mb-1">Unit Spare</p>
                        <p className="text-2xl font-bold text-amber-500">{unitSpare}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-gray-500 mb-1">DT-EV</p>
                        <p className="text-2xl font-bold text-blue-600">{unitEv}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-gray-500 mb-1">Konvensional</p>
                        <p className="text-2xl font-bold text-slate-600">{unitKonv}</p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/30">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-green-700 font-medium mb-1">Stiker Active</p>
                        <p className="text-2xl font-bold text-green-600">{stikerActive}</p>
                    </CardContent>
                </Card>
                <Card className={`${stikerNearExp > 0 ? "border-yellow-300" : "border-gray-200"} bg-yellow-50/30`}>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-yellow-700 font-medium mb-1">Near Expired</p>
                        <p className={`text-2xl font-bold ${stikerNearExp > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                            {stikerNearExp}
                        </p>
                    </CardContent>
                </Card>
                <Card className={`${stikerExpired > 0 ? "border-red-300 shadow-sm" : "border-gray-200"} bg-red-50/20`}>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-red-700 font-medium mb-1">Stiker Expired</p>
                        <p className={`text-2xl font-bold ${stikerExpired > 0 ? "text-red-600 animate-pulse" : "text-gray-400"}`}>
                            {stikerExpired}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* SECTION: CHART ANALYTICS */}
            <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Proyeksi Kedaluwarsa Stiker (1 Tahun Kedepan)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="jumlah" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION D — ACTION BAR */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            <div className="relative w-full lg:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Cari no lambung, merk, owner..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={jenisUnit} onValueChange={setJenisUnit}>
                                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Jenis Unit" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Jenis</SelectItem>
                                    <SelectItem value="DT - ELECTRIC VEHICLE">DT - EV</SelectItem>
                                    <SelectItem value="DT - KONVENSIONAL">DT - Konvensional</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={merk} onValueChange={setMerk}>
                                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Merk" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Merk</SelectItem>
                                    <SelectItem value="XCMG">XCMG</SelectItem>
                                    <SelectItem value="FAW">FAW</SelectItem>
                                    <SelectItem value="DONGFENG">DONGFENG</SelectItem>
                                    <SelectItem value="SHACMAN">SHACMAN</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusUnit} onValueChange={setStatusUnit}>
                                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="SPARE">Spare</SelectItem>
                                    <SelectItem value="DISMANTLED">Dismantled</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusBib} onValueChange={setStatusBib}>
                                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status Stiker" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Stiker</SelectItem>
                                    <SelectItem value="ACTIVE">Stiker: Active</SelectItem>
                                    <SelectItem value="NEAR EXPIRED">Stiker: Near Exp</SelectItem>
                                    <SelectItem value="EXPIRED">Stiker: Expired</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Rentang nomor lambung — disaring dari ANGKA-nya, jadi 9090-9110
                                mengambil tepat unit di rentang itu berapa pun panjang teksnya. */}
                            <div className="flex items-center gap-1 rounded-md border px-2 h-10">
                                <span className="text-xs text-gray-400 whitespace-nowrap">Lambung</span>
                                <Input type="number" placeholder="9000" value={lambungMin}
                                    onChange={(e) => { setLambungMin(e.target.value); setPage(1); }}
                                    className="h-7 w-[74px] border-0 px-1 text-xs shadow-none focus-visible:ring-0" />
                                <span className="text-gray-300">–</span>
                                <Input type="number" placeholder="9999" value={lambungMax}
                                    onChange={(e) => { setLambungMax(e.target.value); setPage(1); }}
                                    className="h-7 w-[74px] border-0 px-1 text-xs shadow-none focus-visible:ring-0" />
                                {(lambungMin || lambungMax) && (
                                    <button type="button" title="Hapus rentang"
                                        onClick={() => { setLambungMin(""); setLambungMax(""); setPage(1); }}
                                        className="text-gray-400 hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
                                )}
                            </div>

                            <Select value={`${sortBy}:${sortDir}`}
                                onValueChange={(v) => { const [b, d] = v.split(":"); setSortBy(b); setSortDir(d as "asc" | "desc"); setPage(1); }}>
                                <SelectTrigger className="w-[185px]"><SelectValue placeholder="Urutkan" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lambung:asc">Lambung terkecil → besar</SelectItem>
                                    <SelectItem value="lambung:desc">Lambung terbesar → kecil</SelectItem>
                                    <SelectItem value="expired_bib:asc">BIB paling dekat expired</SelectItem>
                                    <SelectItem value="expired_tia:asc">TIA paling dekat expired</SelectItem>
                                    <SelectItem value="tahun:desc">Tahun terbaru</SelectItem>
                                    <SelectItem value="jenis:asc">Jenis unit (A-Z)</SelectItem>
                                    <SelectItem value="terbaru:desc">Terakhir ditambahkan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 w-full lg:w-auto">
                            <Button variant="outline" onClick={handleExport} className="whitespace-nowrap flex-1 lg:flex-none">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <Button variant="outline" onClick={() => setIsImportOpen(true)} className="whitespace-nowrap flex-1 lg:flex-none">
                                <Upload className="w-4 h-4 mr-2" />
                                Import Excel
                            </Button>
                            <Button onClick={() => navigate("/workspace/hse/ko/spip/peralatan/tambah")} className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap flex-1 lg:flex-none">
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Unit
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION E — TABEL DATA */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-12 text-center">No</TableHead>
                                <TableHead className="w-[140px] whitespace-nowrap">
                                    <button type="button"
                                        onClick={() => { setSortBy("lambung"); setSortDir(sortBy === "lambung" && sortDir === "asc" ? "desc" : "asc"); setPage(1); }}
                                        className="inline-flex items-center gap-1 font-medium transition-colors hover:text-gray-900">
                                        No Lambung
                                        <ArrowUpDown className={`h-3 w-3 ${sortBy === "lambung" ? "text-gray-900" : "text-gray-300"}`} />
                                    </button>
                                </TableHead>
                                <TableHead>Jenis Unit</TableHead>
                                <TableHead>Merk / Type</TableHead>
                                <TableHead className="text-center">Tahun</TableHead>
                                <TableHead className="text-center">Vol M³</TableHead>
                                <TableHead className="text-center">TMA</TableHead>
                                <TableHead className="text-center">BIB Expired</TableHead>
                                <TableHead className="text-center">Status BIB</TableHead>
                                <TableHead className="text-center">Status TIA</TableHead>
                                <TableHead className="text-center">Status Unit</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={13} className="text-center py-8">Memuat data...</TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={13} className="text-center py-8 text-gray-500">Tidak ada data unit peralatan.</TableCell></TableRow>
                            ) : (
                                items.map((item: any, index: number) => {
                                    const isExpired = computeDisplayStatus(item.expiredBib, item.statusBib) === "EXPIRED" || computeDisplayStatus(item.expiredTia, item.statusTia) === "EXPIRED";
                                    return (
                                        <TableRow key={item.id} className={`hover:bg-gray-50 ${isExpired ? 'bg-red-50/30' : ''}`}>
                                            <TableCell className="text-center">{(page - 1) * limit + index + 1}</TableCell>
                                            <TableCell className="whitespace-nowrap font-semibold text-gray-900">{item.noLambung}</TableCell>
                                            <TableCell className="text-xs text-gray-600">{item.jenisUnit}</TableCell>
                                            <TableCell className="text-xs text-gray-600">{item.merk}<br />{item.type}</TableCell>
                                            <TableCell className="text-center text-gray-600">{item.tahunPembuatan || "-"}</TableCell>
                                            <TableCell className="text-center font-mono text-xs">{item.volumeVessel || "-"}</TableCell>
                                            <TableCell className="text-center">
                                                {item.noTma ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs">{item.noTma}</span>
                                                        <Badge variant="outline" className={`text-[10px] h-4 px-1 ${statusCommColors[item.statusTma || ""] || ""}`}>{item.statusTma || "-"}</Badge>
                                                    </div>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-center text-xs">
                                                {item.expiredBib ? format(new Date(item.expiredBib), "dd MMM yy") : "-"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {computeDisplayStatus(item.expiredBib, item.statusBib) && computeDisplayStatus(item.expiredBib, item.statusBib) !== "-" && (
                                                    <Badge variant="outline" className={`text-[10px] ${statusCommColors[computeDisplayStatus(item.expiredBib, item.statusBib) as string] || "bg-gray-100 text-gray-700"} border`}>
                                                        {computeDisplayStatus(item.expiredBib, item.statusBib)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {computeDisplayStatus(item.expiredTia, item.statusTia) && computeDisplayStatus(item.expiredTia, item.statusTia) !== "-" && (
                                                    <Badge variant="outline" className={`text-[10px] ${statusCommColors[computeDisplayStatus(item.expiredTia, item.statusTia) as string] || "bg-gray-100 text-gray-700"} border`}>
                                                        {computeDisplayStatus(item.expiredTia, item.statusTia)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={`text-xs ${statusUnitColors[item.statusUnit] || ""}`}>
                                                    {item.statusUnit}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[120px] truncate" title={item.owner}>{item.owner || "-"}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-800" onClick={() => navigate(`/workspace/hse/ko/spip/peralatan/${item.id}`)}><Eye className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-800" onClick={() => navigate(`/workspace/hse/ko/spip/peralatan/${item.id}/edit`)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-800" onClick={() => { setSelectedUnit(item); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Dummy implementation */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-gray-500">
                        Menampilkan {items.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} dari {total} data
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
                        <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(page + 1)}>Next</Button>
                    </div>
                </div>
            </Card>

            {/* MODALS */}
            {isImportOpen && (
                <ModalImportPeralatan
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    onSuccess={() => { refetch(); setIsImportOpen(false); }}
                />
            )}


            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Unit Peralatan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus unit <strong>{selectedUnit?.noLambung}</strong> secara permanen? Data yang sudah dihapus tidak dapat dikembalikan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                try {
                                    await apiRequest(`/api/spip/peralatan/${selectedUnit?.id}`, "DELETE");
                                    queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/spip/peralatan/all"] });
                                    toast({ title: "Berhasil dihapus" });
                                    setIsDeleteOpen(false);
                                } catch (e) {
                                    toast({ title: "Gagal menghapus", variant: "destructive" });
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Hapus Permanen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// -------------------------------------------------------------
// Component: ModalImportPeralatan
// -------------------------------------------------------------
function ModalImportPeralatan({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const downloadTemplate = () => {
        const templateData = [
            {
                "NO LAMBUNG": "DT GECL 001",
                "JENIS UNIT": "DT - KONVENSIONAL",
                "MERK": "XCMG",
                "TYPE": "XG90",
                "NO POLISI": "B 1234 CD",
                "NO RANGKA": "MHKDF...",
                "NO MESIN": "WP12...",
                "TAHUN PEMBUATAN": "2024",
                "Gandar": "4",
                "VOLUME Vessel M3": "54.6",
                "TARE (Kosongan)": "15000",
                "AEBS": "Vixmo",
                "TGL. PENGAJUAN": "01-01-2024",
                "EXPIRED STIKER (BIB)": "31-12-2024",
                "STATUS STICKER (BIB)": "CLOSE",
                "TGL. EXPIRED (TIA)": "31-12-2024",
                "STATUS STICKER (TIA)": "CLOSE",
                "NO TMA": "TMA-2024-001",
                "STATUS STICKER (TMA)": "CLOSE",
                "STATUS UNIT": "ACTIVE",
                "OWNER": "PT. Vendor",
                "NAMA / PIC": "Budi",
                "NIK KTP": "3321000...",
                "Kepemilikan STNK/Faktur": "Milik Sendiri",
                "NO. KONTAK": "0812345678",
                "KOMISIONER": "Andi",
                "KETERANGAN": "-"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_Peralatan");
        XLSX.writeFile(wb, "Template_Import_Peralatan.xlsx");
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            // parse preview
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const ab = evt.target?.result;
                    const wb = XLSX.read(ab, { type: 'array' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];

                    // Gunakan defval agar kolom kosong tidak hilang dan tidak merusak urutan (shift)
                    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
                    setPreview(data.slice(0, 5));
                } catch (e) {
                    console.error("Preview render error", e);
                    toast({ title: "Gagal membaca file Excel", variant: "destructive" });
                }
            };
            reader.readAsArrayBuffer(selected);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setIsUploading(true);
        setProgress(30);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/spip/peralatan/import", {
                method: "POST",
                body: formData,
            });
            setProgress(80);
            const result = await res.json();

            if (res.ok) {
                toast({ title: `Berhasil import ${result.imported} data`, description: `${result.skipped} data dilewati.` });
                setProgress(100);
                setTimeout(onSuccess, 500);
            } else {
                toast({ title: "Import gagal", description: result.error, variant: "destructive" });
            }
        } catch (e: any) {
            console.error("Import request error:", e);
            toast({ title: "Terjadi kesalahan", description: e.message || String(e), variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Data Peralatan</DialogTitle>
                    <DialogDescription>
                        Upload file Excel (.xlsx) dengan format kolom yang sesuai dengan template sistem.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* STEP 1 */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-gray-50">
                        <div className="bg-red-100 p-3 rounded-full mb-3">
                            <FileSpreadsheet className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-sm font-semibold mb-1">Pilih File Excel</h3>
                        <p className="text-xs text-gray-500 mb-4">Hanya mendukung .xlsx / .xls. Maksimal 5MB.</p>
                        <div className="flex gap-2 mb-4">
                            <Button variant="outline" className="bg-white" onClick={() => document.getElementById('fileImport')?.click()}>
                                Browse File
                            </Button>
                            <Button variant="outline" className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50" onClick={downloadTemplate}>
                                <Download className="w-4 h-4 mr-2" /> Download Template
                            </Button>
                        </div>
                        <input type="file" id="fileImport" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        {file && <p className="text-sm text-green-600 font-medium">{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>}
                    </div>

                    {/* STEP 2 */}
                    {preview.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-sm mb-2">Preview 5 Baris Pertama</h3>
                            <div className="border rounded-md overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-gray-100">
                                            {Object.keys(preview[0]).map(key => <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.map((row, i) => (
                                            <TableRow key={i}>
                                                {Object.values(row).map((val: any, j) => <TableCell key={j} className="whitespace-nowrap">{val?.toString()}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Memproses data...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>Batal</Button>
                    <Button onClick={handleImport} disabled={!file || isUploading} className="bg-red-600 hover:bg-red-700">
                        {isUploading ? "Mengimport..." : "Import Sekarang"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// -------------------------------------------------------------
// Component: ModalFormPeralatan
// -------------------------------------------------------------
function ModalFormPeralatan({ isOpen, onClose, unit, onSuccess }: { isOpen: boolean, onClose: () => void, unit?: any, onSuccess: () => void }) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("identitas");

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: unit ? {
            ...unit,
            tglPengajuanBib: unit.tglPengajuanBib ? new Date(unit.tglPengajuanBib).toISOString().split('T')[0] : "",
            expiredBib: unit.expiredBib ? new Date(unit.expiredBib).toISOString().split('T')[0] : "",
            expiredTia: unit.expiredTia ? new Date(unit.expiredTia).toISOString().split('T')[0] : "",
        } : {
            jenisSpip: "PERALATAN",
            jenisUnit: "DT - KONVENSIONAL",
            merk: "XCMG",
            type: "",
            noLambung: "",
            gandar: 4,
            statusUnit: "ACTIVE",
        }
    });

    // Derived state to calculate status auto
    const watchExpiredBib = form.watch("expiredBib");
    const watchTglBib = form.watch("tglPengajuanBib");
    const watchExpiredTia = form.watch("expiredTia");

    useEffect(() => {
        // Auto calculate status BIB
        if (watchExpiredBib) {
            const expDate = new Date(watchExpiredBib);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            form.setValue("statusBib", expDate <= today ? "EXPIRED" : "CLOSE");
        } else if (watchTglBib) {
            form.setValue("statusBib", "OPEN");
        } else {
            form.setValue("statusBib", "");
        }
    }, [watchExpiredBib, watchTglBib]);

    useEffect(() => {
        // Auto calculate status TIA
        if (watchExpiredTia) {
            const expDate = new Date(watchExpiredTia);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            form.setValue("statusTia", expDate <= today ? "EXPIRED" : "CLOSE");
        } else {
            form.setValue("statusTia", "");
        }
    }, [watchExpiredTia]);

    const onSubmit = async (data: FormData) => {
        try {
            const url = unit ? `/api/spip/peralatan/${unit.id}` : "/api/spip/peralatan";
            const method = unit ? "PUT" : "POST";

            const payload = { ...data };
            // nullify empty strings for dates
            if (!payload.tglPengajuanBib) delete payload.tglPengajuanBib;
            if (!payload.expiredBib) delete payload.expiredBib;
            if (!payload.expiredTia) delete payload.expiredTia;

            await apiRequest(url, method, payload);
            toast({ title: unit ? "Data diperbarui" : "Data ditambahkan" });
            onSuccess();
        } catch (e: any) {
            toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{unit ? "Edit Unit Peralatan" : "Tambah Unit Peralatan Baru"}</DialogTitle>
                    <DialogDescription>
                        Lengkapi informasi spesifikasi dan komisioning unit di bawah ini.
                    </DialogDescription>
                </DialogHeader>

                <form id="peralatan-form" onSubmit={form.handleSubmit(onSubmit)}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                            <TabsTrigger value="identitas">Identitas Unit</TabsTrigger>
                            <TabsTrigger value="spesifikasi">Spesifikasi Vessel</TabsTrigger>
                            <TabsTrigger value="komisioning">Komisioning</TabsTrigger>
                            <TabsTrigger value="kepemilikan">Kepemilikan</TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            {/* TAB 1: IDENTITAS */}
                            <TabsContent value="identitas" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Jenis SPIP</Label>
                                        <Input disabled value="PERALATAN" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Jenis Unit <span className="text-red-500">*</span></Label>
                                        <Select value={form.watch("jenisUnit")} onValueChange={(v) => form.setValue("jenisUnit", v)}>
                                            <SelectTrigger><SelectValue placeholder="Pilih Jenis Unit" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DT - ELECTRIC VEHICLE">DT - ELECTRIC VEHICLE</SelectItem>
                                                <SelectItem value="DT - KONVENSIONAL">DT - KONVENSIONAL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Merk <span className="text-red-500">*</span></Label>
                                        <Select value={form.watch("merk")} onValueChange={(v) => form.setValue("merk", v)}>
                                            <SelectTrigger><SelectValue placeholder="Pilih Merk" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="XCMG">XCMG</SelectItem>
                                                <SelectItem value="FAW">FAW</SelectItem>
                                                <SelectItem value="DONGFENG">DONGFENG</SelectItem>
                                                <SelectItem value="SHACMAN">SHACMAN</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type Unit <span className="text-red-500">*</span></Label>
                                        <Input {...form.register("type")} placeholder="E.g. XG90..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No Lambung <span className="text-red-500">*</span></Label>
                                        <Input {...form.register("noLambung")} placeholder="DT GECL XXXX" />
                                        {form.formState.errors.noLambung && <p className="text-xs text-red-500">{form.formState.errors.noLambung.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No Polisi</Label>
                                        <Input {...form.register("noPolisi")} placeholder="B 1234 CD" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No Rangka</Label>
                                        <Input {...form.register("noRangka")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No Mesin</Label>
                                        <Input {...form.register("noMesin")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tahun Pembuatan</Label>
                                        <Input type="number" {...form.register("tahunPembuatan")} placeholder="2024" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Gandar</Label>
                                        <Input type="number" {...form.register("gandar")} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>AEBS</Label>
                                        <Select value={form.watch("aebs") || ""} onValueChange={(v) => form.setValue("aebs", v)}>
                                            <SelectTrigger><SelectValue placeholder="Sistem AEBS" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Vixmo">Vixmo</SelectItem>
                                                <SelectItem value="Pabrikan">Pabrikan</SelectItem>
                                                <SelectItem value="Tidak Ada">Tidak Ada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 2: SPESIFIKASI */}
                            <TabsContent value="spesifikasi" className="space-y-4">
                                <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm mb-4">
                                    Catatan otomatis: DT-EV biasanya = 54.6 M³ | Konvensional = lihat dokumen STNK.
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Volume Vessel (M³)</Label>
                                        <Input type="number" step="0.01" {...form.register("volumeVessel")} placeholder="e.g. 54.6" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>TARE / Berat Kosongan (Kg)</Label>
                                        <Input type="number" step="0.01" {...form.register("tare")} placeholder="e.g. 15000" />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 3: KOMISIONING */}
                            <TabsContent value="komisioning" className="space-y-6">
                                <div className="border rounded-md p-4 space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b pb-2">BIB - Binuang Mitra Bersama</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tgl Pengajuan BIB</Label>
                                            <Input type="date" {...form.register("tglPengajuanBib")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Expired STIKER BIB</Label>
                                            <Input type="date" {...form.register("expiredBib")} />
                                            {getExpiryText(form.watch("expiredBib"))}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Status BIB</Label>
                                            <div className="h-10 border rounded-md px-3 py-2 bg-gray-50 flex items-center">
                                                <span className={`text-xs font-semibold ${form.watch("statusBib") === "EXPIRED" ? "text-red-500" : form.watch("statusBib") === "CLOSE" ? "text-green-500" : "text-gray-500"}`}>
                                                    {form.watch("statusBib") || "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border rounded-md p-4 space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b pb-2">TIA</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Expired STIKER TIA</Label>
                                            <Input type="date" {...form.register("expiredTia")} />
                                            {getExpiryText(form.watch("expiredTia"))}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Status TIA</Label>
                                            <div className="h-10 border rounded-md px-3 py-2 bg-gray-50 flex items-center">
                                                <span className={`text-xs font-semibold ${form.watch("statusTia") === "EXPIRED" ? "text-red-500" : form.watch("statusTia") === "CLOSE" ? "text-green-500" : "text-gray-500"}`}>
                                                    {form.watch("statusTia") || "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border rounded-md p-4 space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b pb-2">TMA</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>No TMA</Label>
                                            <Input {...form.register("noTma")} placeholder="Nomor TMA..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Status TMA</Label>
                                            <Select value={form.watch("statusTma") || ""} onValueChange={(v) => form.setValue("statusTma", v)}>
                                                <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CLOSE">CLOSE</SelectItem>
                                                    <SelectItem value="OPEN">OPEN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 4: KEPEMILIKAN */}
                            <TabsContent value="kepemilikan" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Status Unit <span className="text-red-500">*</span></Label>
                                        <Select value={form.watch("statusUnit")} onValueChange={(v) => form.setValue("statusUnit", v)}>
                                            <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                                <SelectItem value="SPARE">SPARE</SelectItem>
                                                <SelectItem value="DISMANTLED">DISMANTLED</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pemilik (Owner)</Label>
                                        <Input {...form.register("owner")} placeholder="Nama PT / Perorangan" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nama PIC</Label>
                                        <Input {...form.register("namaPic")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>NIK KTP</Label>
                                        <Input {...form.register("nikKtp")} placeholder="16 digit..." maxLength={16} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kepemilikan</Label>
                                        <Select value={form.watch("kepemilikan") || ""} onValueChange={(v) => form.setValue("kepemilikan", v)}>
                                            <SelectTrigger><SelectValue placeholder="Jenis Kepemilikan" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="STNK">STNK</SelectItem>
                                                <SelectItem value="FAKTUR">FAKTUR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No Kontak</Label>
                                        <Input {...form.register("noKontak")} placeholder="0812345678" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Komisioner</Label>
                                        <Input {...form.register("komisioner")} />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Keterangan Tambahan</Label>
                                        <Textarea {...form.register("keterangan")} />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </form>

                <DialogFooter className="mt-6 border-t pt-4">
                    <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
                    <Button form="peralatan-form" type="submit" className="bg-red-600 hover:bg-red-700">Simpan Data</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// -------------------------------------------------------------
// Component: ModalDetailPeralatan
// -------------------------------------------------------------
function ModalDetailPeralatan({ isOpen, onClose, unit, onEdit }: { isOpen: boolean, onClose: () => void, unit: any, onEdit: () => void }) {
    if (!unit) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4 mb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                {unit.noLambung}
                                <Badge variant="outline" className={`${statusUnitColors[unit.statusUnit] || "bg-gray-100"}`}>
                                    {unit.statusUnit}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-base text-gray-500">
                                {unit.jenisUnit} • {unit.merk} {unit.type}
                            </DialogDescription>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-lg text-center min-w-20">
                            <span className="block text-xs text-gray-500 mb-1">Jenis SPIP</span>
                            <span className="font-semibold text-gray-800">{unit.jenisSpip}</span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Identitas & Spesifikasi Teknis</h3>
                        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <div><span className="text-gray-500 block">No Polisi</span><span className="font-medium">{unit.noPolisi || "-"}</span></div>
                            <div><span className="text-gray-500 block">Tahun Pembuatan</span><span className="font-medium">{unit.tahunPembuatan || "-"}</span></div>
                            <div><span className="text-gray-500 block">No Rangka</span><span className="font-medium">{unit.noRangka || "-"}</span></div>
                            <div><span className="text-gray-500 block">No Mesin</span><span className="font-medium">{unit.noMesin || "-"}</span></div>
                            <div><span className="text-gray-500 block">Gandar</span><span className="font-medium">{unit.gandar || "-"}</span></div>
                            <div><span className="text-gray-500 block">Volume Vessel</span><span className="font-medium">{unit.volumeVessel ? `${unit.volumeVessel} M³` : "-"}</span></div>
                            <div><span className="text-gray-500 block">Tare (Kosongan)</span><span className="font-medium">{unit.tare ? `${unit.tare} Kg` : "-"}</span></div>
                            <div><span className="text-gray-500 block">Sistem AEBS</span><span className="font-medium">{unit.aebs || "-"}</span></div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Status Komisioning</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="bg-white border-dashed">
                                <CardContent className="p-3">
                                    <p className="text-xs text-gray-500 font-medium mb-1 line-through">PT. BMB (BIB)</p>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-semibold text-gray-800">{unit.expiredBib ? format(new Date(unit.expiredBib), "dd MMM yyyy") : "-"}</p>
                                        <Badge variant="outline" className={`text-[10px] ${statusCommColors[unit.statusBib] || ""}`}>{unit.statusBib || "-"}</Badge>
                                    </div>
                                    <p className="text-xs text-gray-400">Pengajuan: {unit.tglPengajuanBib ? format(new Date(unit.tglPengajuanBib), "dd/MM/yy") : "-"}</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-dashed">
                                <CardContent className="p-3">
                                    <p className="text-xs text-gray-500 font-medium mb-1">TIA</p>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-semibold text-gray-800">{unit.expiredTia ? format(new Date(unit.expiredTia), "dd MMM yyyy") : "-"}</p>
                                        <Badge variant="outline" className={`text-[10px] ${statusCommColors[unit.statusTia] || ""}`}>{unit.statusTia || "-"}</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-dashed">
                                <CardContent className="p-3">
                                    <p className="text-xs text-gray-500 font-medium mb-1">TMA</p>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-semibold text-gray-800 break-all">{unit.noTma || "-"}</p>
                                        <Badge variant="outline" className={`text-[10px] ${statusCommColors[unit.statusTma] || ""}`}>{unit.statusTma || "-"}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Kepemilikan</h3>
                        <div className="border border-gray-100 rounded-lg p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <div><span className="text-gray-500 block">Owner</span><span className="font-medium">{unit.owner || "-"}</span></div>
                            <div><span className="text-gray-500 block">Kepemilikan</span><span className="font-medium">{unit.kepemilikan || "-"}</span></div>
                            <div><span className="text-gray-500 block">Nama PIC</span><span className="font-medium">{unit.namaPic || "-"}</span></div>
                            <div><span className="text-gray-500 block">No Kontak PIC</span><span className="font-medium">{unit.noKontak || "-"}</span></div>
                            <div><span className="text-gray-500 block">NIK KTP</span><span className="font-medium">{unit.nikKtp || "-"}</span></div>
                            <div><span className="text-gray-500 block">Komisioner</span><span className="font-medium">{unit.komisioner || "-"}</span></div>
                            {unit.keterangan && <div className="col-span-2"><span className="text-gray-500 block">Keterangan Tambahan</span><span className="font-medium">{unit.keterangan}</span></div>}
                        </div>
                    </section>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                    <Button variant="default" onClick={onEdit} className="bg-red-600 hover:bg-red-700">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
