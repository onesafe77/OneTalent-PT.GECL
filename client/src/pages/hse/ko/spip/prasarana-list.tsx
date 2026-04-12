import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    Plus,
    FileUp,
    FileDown,
    Search,
    Building2,
    CheckCircle2,
    AlertCircle,
    Clock,
    MapPin,
    ExternalLink,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    Filter
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PrasaranaList() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [areaFilter, setAreaFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);

    const { data: prasaranaData, isLoading } = useQuery<any>({
        queryKey: ["/api/spip/prasarana", { search, area_lokasi: areaFilter, status_sertifikat: statusFilter, page }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (areaFilter !== "all") params.append("area_lokasi", areaFilter);
            if (statusFilter !== "all") params.append("status_sertifikat", statusFilter);
            params.append("page", page.toString());

            const res = await fetch(`/api/spip/prasarana?${params.toString()}`);
            if (!res.ok) throw new Error("Gagal mengambil data");
            return res.json();
        }
    });

    const handleDelete = async (id: string) => {
        try {
            await apiRequest(`/api/spip/prasarana/${id}`, "DELETE");
            queryClient.invalidateQueries({ queryKey: ["/api/spip/prasarana"] });
            toast({ title: "Berhasil", description: "Data prasarana berhasil dihapus" });
        } catch (error: any) {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    };

    const handleExport = async () => {
        window.open("/api/spip/prasarana/export", "_blank");
    };

    const items = prasaranaData?.data || [];
    const total = prasaranaData?.total || 0;

    const expiredCount = items.filter((item: any) => {
        if (!item.expSertifikat) return false;
        try {
            return new Date(item.expSertifikat) <= new Date();
        } catch (e) {
            return false;
        }
    }).length;

    const pendingMaintenance = items.filter((item: any) =>
        item.statusPerawatanS1 === "PENDING" || item.statusPerawatanS2 === "PENDING" ||
        item.statusPerawatanS1 === "OVERDUE" || item.statusPerawatanS2 === "OVERDUE"
    ).length;

    const areaCount = new Set(items.map((item: any) => item.areaLokasi)).size;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-red-600">SPIP Sarana & Prasarana</h1>
                <p className="text-muted-foreground">Data Fasilitas & Bangunan Area Tambang PT GECL</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Building2 className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Unit</p>
                                <h3 className="text-2xl font-bold">{total}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Sertifikat Aktif</p>
                                <h3 className="text-2xl font-bold">{total - expiredCount}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 border-l-red-500 shadow-sm ${expiredCount > 0 ? 'animate-pulse' : ''}`}>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Sertifikat Expired</p>
                                <h3 className="text-2xl font-bold text-red-600">{expiredCount}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Clock className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Maintenance Pending</p>
                                <h3 className="text-2xl font-bold text-orange-600">{pendingMaintenance}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><MapPin className="w-6 h-6" /></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Lokasi Area</p>
                                <h3 className="text-2xl font-bold">{areaCount}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-2 items-center flex-1">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari no lambung..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <FileDown className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 font-bold" onClick={() => navigate("/workspace/hse/ko/spip/prasarana/tambah")}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah Data
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-12 text-center uppercase text-[10px] font-bold">No</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">No Lambung</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Jenis Unit</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Area</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Sertifikat</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Maintenance</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7} className="p-4"><Skeleton className="h-12 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground italic">Unit tidak ditemukan.</TableCell>
                            </TableRow>
                        ) : (
                            items.map((item: any, index: number) => {
                                const isExpired = item.expSertifikat && new Date(item.expSertifikat) <= new Date();
                                return (
                                    <TableRow key={item.id} className="hover:bg-gray-50/50">
                                        <TableCell className="text-center text-xs font-semibold">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-red-600 text-sm hover:underline cursor-pointer" onClick={() => navigate(`/workspace/hse/ko/spip/prasarana/${item.id}`)}>
                                            {item.noLambung}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">{item.jenisUnit}</TableCell>
                                        <TableCell className="text-xs font-medium">{item.areaLokasi}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold">{item.noSertifikat || "-"}</span>
                                                {item.expSertifikat && (
                                                    <Badge variant="outline" className={`w-fit text-[9px] font-bold ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {format(new Date(item.expSertifikat), "dd/MM/yyyy", { locale: localeId })}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Badge variant="outline" className={`text-[9px] font-bold ${item.statusPerawatanS1 === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    S1: {item.statusPerawatanS1 || "PENDING"}
                                                </Badge>
                                                <Badge variant="outline" className={`text-[9px] font-bold ${item.statusPerawatanS2 === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    S2: {item.statusPerawatanS2 || "PENDING"}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem onClick={() => navigate(`/workspace/hse/ko/spip/prasarana/${item.id}`)}>
                                                        <Eye className="w-4 h-4 mr-2" /> Detail
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/workspace/hse/ko/spip/prasarana/${item.id}/edit`)}>
                                                        <Edit className="w-4 h-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
