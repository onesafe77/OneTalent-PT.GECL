import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Check, AlertCircle, Trash2, ExternalLink, Table2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SheetConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  spreadsheetTitle?: string;
}

const DASHBOARD_TYPES = [
  { id: "overspeed", name: "Dashboard Overspeed", description: "Data pelanggaran kecepatan" },
  { id: "jarak-aman", name: "Dashboard Jarak Aman", description: "Data pelanggaran jarak aman" },
  { id: "fatigue", name: "Dashboard Fatigue Validation", description: "Data validasi fatigue" },
];

export default function GoogleSheetsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [configs, setConfigs] = useState<SheetConfig[]>(() => {
    const saved = localStorage.getItem("google-sheets-configs");
    return saved ? JSON.parse(saved) : [];
  });

  const [newConfig, setNewConfig] = useState({
    dashboardId: "",
    spreadsheetUrl: "",
    sheetName: ""
  });

  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState("");

  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url.length > 20 ? url : null;
  };

  const fetchSheets = async () => {
    const spreadsheetId = extractSpreadsheetId(newConfig.spreadsheetUrl);
    if (!spreadsheetId) {
      toast({ title: "Error", description: "URL atau ID Spreadsheet tidak valid", variant: "destructive" });
      return;
    }

    setIsLoadingSheets(true);
    try {
      const metaRes = await fetch(`/api/google-sheets/metadata/${spreadsheetId}`);
      if (!metaRes.ok) throw new Error("Gagal mengambil metadata");
      const metadata = await metaRes.json();
      
      setSpreadsheetTitle(metadata.title || "");
      setAvailableSheets(metadata.sheets?.map((s: any) => s.name) || []);
      
      if (metadata.sheets?.length > 0) {
        setNewConfig(prev => ({ ...prev, sheetName: metadata.sheets[0].name }));
      }
      
      toast({ title: "Berhasil", description: `Terhubung ke "${metadata.title}"` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Gagal terhubung ke spreadsheet", variant: "destructive" });
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const saveConfig = () => {
    const spreadsheetId = extractSpreadsheetId(newConfig.spreadsheetUrl);
    if (!spreadsheetId || !newConfig.sheetName || !newConfig.dashboardId) {
      toast({ title: "Error", description: "Lengkapi semua field", variant: "destructive" });
      return;
    }

    const dashboard = DASHBOARD_TYPES.find(d => d.id === newConfig.dashboardId);
    const newEntry: SheetConfig = {
      id: newConfig.dashboardId,
      name: dashboard?.name || newConfig.dashboardId,
      spreadsheetId,
      sheetName: newConfig.sheetName,
      spreadsheetTitle
    };

    const updated = [...configs.filter(c => c.id !== newConfig.dashboardId), newEntry];
    setConfigs(updated);
    localStorage.setItem("google-sheets-configs", JSON.stringify(updated));

    toast({ title: "Tersimpan", description: `Konfigurasi ${dashboard?.name} berhasil disimpan` });
    
    setNewConfig({ dashboardId: "", spreadsheetUrl: "", sheetName: "" });
    setAvailableSheets([]);
    setSpreadsheetTitle("");
  };

  const removeConfig = (id: string) => {
    const updated = configs.filter(c => c.id !== id);
    setConfigs(updated);
    localStorage.setItem("google-sheets-configs", JSON.stringify(updated));
    toast({ title: "Dihapus", description: "Konfigurasi berhasil dihapus" });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6" />
          Pengaturan Google Sheets
        </h1>
        <p className="text-muted-foreground mt-1">
          Tautkan Google Spreadsheet ke dashboard untuk sinkronisasi data otomatis
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Tambah Koneksi Baru</CardTitle>
          <CardDescription>Hubungkan spreadsheet ke salah satu dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pilih Dashboard</Label>
            <Select 
              value={newConfig.dashboardId} 
              onValueChange={(v) => setNewConfig(prev => ({ ...prev, dashboardId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih dashboard..." />
              </SelectTrigger>
              <SelectContent>
                {DASHBOARD_TYPES.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>URL atau ID Spreadsheet</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/... atau ID"
                value={newConfig.spreadsheetUrl}
                onChange={(e) => setNewConfig(prev => ({ ...prev, spreadsheetUrl: e.target.value }))}
              />
              <Button 
                onClick={fetchSheets} 
                disabled={!newConfig.spreadsheetUrl || isLoadingSheets}
                variant="secondary"
              >
                {isLoadingSheets ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hubungkan"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pastikan spreadsheet sudah di-share ke akun Google yang terhubung
            </p>
          </div>

          {availableSheets.length > 0 && (
            <>
              {spreadsheetTitle && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4" />
                  Terhubung ke: <strong>{spreadsheetTitle}</strong>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Pilih Sheet</Label>
                <Select 
                  value={newConfig.sheetName} 
                  onValueChange={(v) => setNewConfig(prev => ({ ...prev, sheetName: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sheet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map(sheet => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={saveConfig} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Simpan Konfigurasi
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Koneksi Tersimpan</CardTitle>
          <CardDescription>Daftar spreadsheet yang sudah terhubung</CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Table2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada spreadsheet yang terhubung</p>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map(config => (
                <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {config.spreadsheetTitle || config.spreadsheetId} → {config.sheetName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeConfig(config.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
