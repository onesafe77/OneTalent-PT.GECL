
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  Filter,
  Plus,
  Trash2,
  Download,
  Upload,
  Users,
  Clock,
  RefreshCw,
  Sparkles,
  Plane,
  Briefcase
} from "lucide-react";
import * as XLSX from 'xlsx';

interface LeaveRosterMonitoring {
 id: string;
 nik: string;
 name: string;
 nomorLambung: string | null;
 month?: string;
 investorGroup: string;
 lastLeaveDate: string | null;
 leaveOption: string;
 monitoringDays: number;
 nextLeaveDate: string | null;
 onSite?: string | null;
 status: string;
 createdAt: string;
 updatedAt: string;
}

export default function LeaveRosterMonitoringPage() {
 const { toast } = useToast();
 const queryClient = useQueryClient();

 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [investorGroupFilter, setInvestorGroupFilter] = useState("all");

  // Dialogs
 const [isSyncing, setIsSyncing] = useState(false);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [analysisResult, setAnalysisResult] = useState<string | null>(null);
 const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Data Fetching
 const { data: monitoringData = [], isLoading } = useQuery<LeaveRosterMonitoring[]>({
 queryKey: ["/api/leave-roster-monitoring"],
 staleTime: 60000,
 refetchInterval: 60000,
  });

  // Sync Mutation
 const syncMutation = useMutation({
 mutationFn: () => apiRequest("/api/leave-roster-monitoring/sync", "POST"),
 onMutate: () => setIsSyncing(true),
 onSuccess: () => {
 toast({ title: "Sync Berhasil", description: "Data monitoring telah diperbarui dari Roster." });
 queryClient.invalidateQueries({ queryKey: ["/api/leave-roster-monitoring"] });
    },
 onError: (err: any) => {
 toast({ title: "Sync Gagal", description: err.message, variant: "destructive" });
    },
 onSettled: () => setIsSyncing(false)
  });

  // Analyze Mutation
 const analyzeMutation = useMutation({
 mutationFn: () => apiRequest("/api/leave-roster-monitoring/analyze", "POST"),
 onMutate: () => setIsAnalyzing(true),
 onSuccess: (data: any) => {
 setAnalysisResult(data.analysis);
 setIsAnalysisOpen(true);
    },
 onError: (err: any) => {
 toast({ title: "Analisa Gagal", description: err.message, variant: "destructive" });
    },
 onSettled: () => setIsAnalyzing(false)
  });

  // Filter Logic
 const filteredData = monitoringData.filter((item) => {
 const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.nik.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = statusFilter === "all" || item.status === statusFilter;
 const matchesGroup = investorGroupFilter === "all" || item.investorGroup === investorGroupFilter;
 return matchesSearch && matchesStatus && matchesGroup;
  });

  // Unique Groups
 const investorGroups = Array.from(new Set(monitoringData.map(i => i.investorGroup)));

  // Categorize for Live Dashboard
 const activeEmployees = monitoringData.filter(i => i.status === 'Aktif');
 const upcomingLeave = monitoringData.filter(i => i.status === 'Akan Cuti').sort((a, b) => (a.nextLeaveDate || '').localeCompare(b.nextLeaveDate || ''));
 const currentLeave = monitoringData.filter(i => i.status === 'Sedang Cuti');

 return (
    <div className="container mx-auto p-6 space-y-8 min-h-screen bg-muted">

      {/* Header with Mystic Gradient */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl shadow-sm border border-border">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-foreground">
            Monitoring Roster Cuti
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">
            Real-time synchronization with Roster Schedule
          </p>
        </div>
        <div className="flex gap-3">
          <Button
 onClick={() => syncMutation.mutate()}
 disabled={isSyncing}
 variant="outline"
 className="border-blue-200 hover:bg-blue-50 text-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Syncing..." : "Sync Roster"}
          </Button>

          <Button
 onClick={() => analyzeMutation.mutate()}
 disabled={isAnalyzing}
 
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isAnalyzing ? "Analyzing..." : "Ask Mystic"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList>
          <TabsTrigger value="live" className="rounded-lg data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            Live Insights
          </TabsTrigger>
          <TabsTrigger value="table" className="rounded-lg data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            Data Table
          </TabsTrigger>
        </TabsList>

        {/* LIVE INSIGHTS TAB */}
        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1. SEDANG CUTI */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Plane className="w-5 h-5 text-blue-500" />
                    Sedang Cuti
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">{currentLeave.length}</Badge>
                </div>
                <CardDescription>Karyawan yang saat ini off roster/cuti.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {currentLeave.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Tidak ada yang sedang cuti</div>
                ) : (
                  <div className="space-y-3">
                    {currentLeave.map(emp => (
                      <div key={emp.id} className="p-3 bg-muted rounded-lg border border-border">
                        <div className="font-semibold text-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                          <span>{emp.investorGroup}</span>
                          <span>Sejak: {emp.lastLeaveDate ? format(parseISO(emp.lastLeaveDate), 'dd MMM') : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. AKAN CUTI */}
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Akan Cuti
                  </CardTitle>
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">{upcomingLeave.length}</Badge>
                </div>
                <CardDescription>Jadwal cuti dalam 7-14 hari ke depan.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingLeave.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Tidak ada jadwal cuti dekat</div>
                ) : (
                  <div className="space-y-3">
                    {upcomingLeave.map(emp => (
                      <div key={emp.id} className="p-3 bg-muted rounded-lg border border-border">
                        <div className="font-semibold text-foreground">{emp.name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px]">
                            {emp.nextLeaveDate ? format(parseISO(emp.nextLeaveDate), 'dd MMM yyyy') : 'Segera'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{emp.investorGroup}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. AKTIF / WORKING */}
            <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-foreground" />
                    Aktif Bekerja
                  </CardTitle>
                  <Badge className="bg-muted text-foreground hover:bg-muted">{activeEmployees.length}</Badge>
                </div>
                <CardDescription>Karyawan yang sedang on site/roster kerja.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                  {activeEmployees.slice(0, 50).map(emp => (
                    <div key={emp.id} className="flex justify-between items-center p-2 border-b border-border last:border-0 hover:bg-muted rounded transition-colors">
                      <div>
                        <div className="font-medium text-sm text-foreground dark:text-muted-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.nik}</div>
                      </div>
                      <div className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">
                        Hari ke-{emp.monitoringDays}
                      </div>
                    </div>
                  ))}
                  {activeEmployees.length > 50 && (
                    <div className="text-center text-xs text-muted-foreground pt-2">
                      ...dan {activeEmployees.length - 50} lainnya. Lihat tabel untuk detail.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* TABLE TAB */}
        <TabsContent value="table">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <CardTitle>Data Lengkap</CardTitle>
                <div className="flex gap-2">
                  <Input
 placeholder="Cari Nama/NIK..."
 className="max-w-xs"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={investorGroupFilter} onValueChange={setInvestorGroupFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Group</SelectItem>
                      {investorGroups.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Terakhir Cuti</TableHead>
                      <TableHead>Durasi Kerja</TableHead>
                      <TableHead>Status Roster</TableHead>
                      <TableHead>Estimasi Cuti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.nik}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.investorGroup}</TableCell>
                        <TableCell>{item.lastLeaveDate ? format(parseISO(item.lastLeaveDate), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${item.monitoringDays > 60 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {item.monitoringDays} Hari
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
 className={`
                                        ${item.status === 'Aktif' ? 'bg-muted text-foreground' : ''}
                                        ${item.status === 'Sedang Cuti' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${item.status === 'Akan Cuti' ? 'bg-orange-100 text-orange-700' : ''}
                                    `}
 variant="outline"
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.nextLeaveDate ? format(parseISO(item.nextLeaveDate), 'dd MMM yyyy') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Dialog */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Mystic Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg text-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {analysisResult}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsAnalysisOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}