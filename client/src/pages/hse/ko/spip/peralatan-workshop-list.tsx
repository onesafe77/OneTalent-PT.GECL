import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import {
    Settings,
    Search,
    Plus,
    Upload,
    Download,
    AlertTriangle,
    Eye,
    Edit,
    Trash2,
    LayoutGrid,
    List,
    ChevronDown,
    ChevronRight,
    Wrench,
    Clock,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ModalImportPeralatanWorkshop } from "./peralatan-workshop-modal-import";
import { ModalFormPeralatanWorkshop } from "./peralatan-workshop-detail";

export default function SPIPWorkshopList() {
    const [, navigate] = useLocation();
    const [search, setSearch] = useState("");
    const [jenisUnit, setJenisUnit] = useState("all");
    const [areaLokasi, setAreaLokasi] = useState("all");
    const [status, setStatus] = useState("all");
    const [isGrouped, setIsGrouped] = useState(false);

    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<any>(null);

    const queryParams = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(jenisUnit !== "all" ? { jenis_unit: jenisUnit } : {}),
        ...(areaLokasi !== "all" ? { area_lokasi: areaLokasi } : {}),
        ...(status !== "all" ? { status } : {}),
    });

    const { data: qData, isLoading, refetch } = useQuery({
        queryKey: ["/api/spip/peralatan/workshop", queryParams.toString()],
        queryFn: async () => {
            const res = await fetch(`/api/spip/peralatan/workshop?${queryParams.toString()}`);
            if (!res.ok) throw new Error("Gagal memuat data");
            return res.json();
        }
    });

    const items = qData?.data || [];
    const total = qData?.total || 0;

    // Summaries
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expired = items.filter((i: any) => !i.expSertifikat || new Date(i.expSertifikat) <= today).length;
        const active = items.length - expired;
        const distinctTypes = new Set(items.map((i: any) => i.jenisUnit)).size;
        const distinctLocations = new Set(items.map((i: any) => i.areaLokasi)).size;

        const soonExp = items.filter((i: any) => {
            if (!i.expSertifikat) return false;
            const exp = new Date(i.expSertifikat);
            const days = differenceInDays(exp, today);
            return days > 0 && days <= 30;
        }).length;

        return { total: items.length, active, expired, distinctTypes, distinctLocations, soonExp };
    }, [items]);

    // Grouping
    const groupedData = useMemo(() => {
        if (!isGrouped) return null;
        const groups: Record<string, any[]> = {};
        items.forEach((item: any) => {
            if (!groups[item.jenisUnit]) groups[item.jenisUnit] = [];
            groups[item.jenisUnit].push(item);
        });
        return groups;
    }, [items, isGrouped]);

    const getStatusText = (item: any) => {
        if (!item.expSertifikat) return "EXPIRED";
        const exp = new Date(item.expSertifikat);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (exp <= today) return "EXPIRED";

        const days = differenceInDays(exp, today);
        const months = Math.floor(days / 30);
        const years = Math.floor(months / 12);

        return `${years} Thn, ${months % 12} Bln, ${days % 30} Hari`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span>HSE</span> / <span>KO</span> / <span>SPIP</span> / <span>Peralatan</span> / <span className="font-semibold text-gray-900">Bergerak</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">SPIP Peralatan Bergerak</h1>
                <p className="text-gray-500 text-sm">Data Peralatan Workshop & Bengkel Area Tambang PT GECL</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 mb-1">Total Alat</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 mb-1 text-emerald-600">Alat Aktif</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </CardContent></Card>
                <Card className={stats.expired > 0 ? "border-red-200 bg-red-50/10" : ""}><CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-red-600 mb-1">Alat EXPIRED</p>
                    <p className={`text-2xl font-bold text-red-600 ${stats.expired > 0 ? "animate-pulse" : ""}`}>{stats.expired}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 mb-1">Jenis Alat</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.distinctTypes}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-500 mb-1">Jumlah Lokasi</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.distinctLocations}</p>
                </CardContent></Card>
                <Card className={stats.soonExp > 0 ? "border-amber-200 bg-amber-50/10" : ""}><CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-amber-600 mb-1">Exp ≤ 30 Hari</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.soonExp}</p>
                </CardContent></Card>
            </div>

            {/* Alert Banner */}
            {stats.expired > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full border border-red-200 shadow-sm animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-red-800">{stats.expired} peralatan bergerak memiliki sertifikat EXPIRED</h4>
                        <p className="text-sm text-red-600">Segera lakukan pembaharuan sertifikat untuk memastikan keamanan operasional.</p>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-2 flex-1 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input placeholder="Cari no lambung, jenis, lokasi..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={jenisUnit} onValueChange={setJenisUnit}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Jenis Unit" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Jenis</SelectItem>
                            <SelectItem value="AIR COMPRESSORE">AIR COMPRESSORE</SelectItem>
                            <SelectItem value="STAND JACK">STAND JACK</SelectItem>
                            <SelectItem value="BOTTLE JACK">BOTTLE JACK</SelectItem>
                            <SelectItem value="MITTER SAW">MITTER SAW</SelectItem>
                            <SelectItem value="GERINDA">GERINDA</SelectItem>
                            <SelectItem value="PALU">PALU</SelectItem>
                            <SelectItem value="WHEEL CHOCK">WHEEL CHOCK</SelectItem>
                            <SelectItem value="AIR IMPACT">AIR IMPACT</SelectItem>
                            <SelectItem value="AIR GREASE">AIR GREASE</SelectItem>
                            <SelectItem value="LAS LISTRIK">LAS LISTRIK</SelectItem>
                            <SelectItem value="TYER CAGE">TYER CAGE</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={areaLokasi} onValueChange={setAreaLokasi}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Area/Lokasi" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Lokasi</SelectItem>
                            <SelectItem value="Storing BMD">Storing BMD</SelectItem>
                            <SelectItem value="Storing AK">Storing AK</SelectItem>
                            <SelectItem value="Storing Resty Kadoi">Storing Resty Kadoi</SelectItem>
                            <SelectItem value="Storing BKS">Storing BKS</SelectItem>
                            <SelectItem value="Workshop Jam'ani">Workshop Jam'ani</SelectItem>
                            <SelectItem value="Workshop BSM">Workshop BSM</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="AKTIF">Aktif</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <Button variant="outline" onClick={() => setIsGrouped(!isGrouped)} className="flex-1 lg:flex-none">
                        {isGrouped ? <List className="w-4 h-4 mr-2" /> : <LayoutGrid className="w-4 h-4 mr-2" />}
                        {isGrouped ? "Flat View" : "Group View"}
                    </Button>
                    <Button variant="secondary" onClick={() => setIsImportOpen(true)} className="flex-1 lg:flex-none">
                        <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" onClick={() => window.open('/api/spip/peralatan/workshop/export')} className="flex-1 lg:flex-none">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button onClick={() => { setEditingUnit(null); setIsFormOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white flex-1 lg:flex-none">
                        <Plus className="w-4 h-4 mr-2" /> Tambah Alat
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            {!isGrouped && <TableHead className="w-12 text-center">No</TableHead>}
                            <TableHead>No Lambung</TableHead>
                            <TableHead>Jenis Unit</TableHead>
                            <TableHead>Kapasitas</TableHead>
                            <TableHead>Area/Lokasi</TableHead>
                            <TableHead>Komisioner</TableHead>
                            <TableHead>EXP</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-500">Memuat data peralatan...</TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-500">Tidak ada data ditemukan.</TableCell></TableRow>
                        ) : isGrouped ? (
                            Object.entries(groupedData!).map(([groupName, groupItems]) => (
                                <GroupRows
                                    key={groupName}
                                    name={groupName}
                                    items={groupItems}
                                    onEdit={(u) => { setEditingUnit(u); setIsFormOpen(true); }}
                                    getStatusText={getStatusText}
                                />
                            ))
                        ) : (
                            items.map((item: any, idx: number) => (
                                <ItemRow
                                    key={item.id}
                                    item={item}
                                    idx={idx + 1}
                                    onEdit={(u) => { setEditingUnit(u); setIsFormOpen(true); }}
                                    getStatusText={getStatusText}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <ModalImportPeralatanWorkshop isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={refetch} />
            {isFormOpen && (
                <ModalFormPeralatanWorkshop
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    unit={editingUnit}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}

function ItemRow({ item, idx, onEdit, getStatusText }: any) {
    const statusText = getStatusText(item);
    const isExpired = statusText === "EXPIRED";

    return (
        <TableRow className="hover:bg-gray-50/80 transition-colors">
            {idx && <TableCell className="text-center text-gray-500">{idx}</TableCell>}
            <TableCell className="font-bold text-slate-800">{item.noLambung}</TableCell>
            <TableCell className="text-slate-600 text-xs font-medium">{item.jenisUnit}</TableCell>
            <TableCell className="text-slate-600">{item.kapasitas || "-"}</TableCell>
            <TableCell className="text-slate-600 font-medium">{item.areaLokasi || "-"}</TableCell>
            <TableCell className="text-slate-600 text-xs">{item.komisioner || "-"}</TableCell>
            <TableCell className="text-slate-600 text-xs">
                {item.expSertifikat ? format(new Date(item.expSertifikat), "dd MMM yyyy") : "-"}
            </TableCell>
            <TableCell className="p-0">
                <div className={`flex items-center justify-center p-2 h-full min-h-[40px] ${isExpired ? "bg-red-600 text-white font-bold text-xs" : "text-emerald-600 font-bold text-xs"}`}>
                    {statusText}
                </div>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-amber-600"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function GroupRows({ name, items, onEdit, getStatusText }: any) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <TableRow className="bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors" onClick={() => setIsOpen(!isOpen)}>
                <TableCell colSpan={9} className="py-2 px-4 shadow-inner">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Wrench className="w-4 h-4 text-slate-500" />
                        {name} <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-700">{items.length} Unit</Badge>
                    </div>
                </TableCell>
            </TableRow>
            {isOpen && items.map((item: any) => (
                <ItemRow key={item.id} item={item} onEdit={onEdit} getStatusText={getStatusText} />
            ))}
        </>
    );
}
