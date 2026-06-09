import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";

const SHEETS = [
  { key: "hazard", name: "Hazard", note: "Laporan bahaya (KTA/TTA, risiko, status)" },
  { key: "inspeksi", name: "Inspeksi", note: "Inspeksi area/objek, kesesuaian waktu" },
  { key: "observasi", name: "Observasi", note: "Observasi P5M/PJA, temuan" },
  { key: "opk", name: "OPK", note: "Observasi per item checklist (Hasil, Deviasi)" },
  { key: "attendance", name: "Attendance", note: "Kehadiran event (Safety Talk/P5M)" },
  { key: "fms", name: "FMS", note: "Alert fatigue kamera, SLA, compliance" },
];

export default function ZeroHarmImport() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ parsed: Record<string, number>; saved: Record<string, number> } | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/zero-harm/import", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal import");
      setResult(data);
      const total = Object.values(data.saved as Record<string, number>).reduce((a, b) => a + b, 0);
      toast({ title: "Import berhasil", description: `${total.toLocaleString("id-ID")} baris diproses` });
    } catch (e: any) {
      toast({ title: "Gagal import", description: e?.message || "Coba lagi", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <button onClick={() => navigate("/workspace/zero-harm")} className="text-sm font-semibold text-[#0e7490] flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </button>
      <div>
        <h1 className="text-xl font-extrabold">Import Data — iSafe / FMS</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload export berkala (.xlsx). Sistem membaca sheet Hazard, Inspeksi, Observasi, Attendance, FMS lalu menyimpan & menghitung.</p>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }} />

      <Card className="border-dashed border-2">
        <CardContent className="py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            {busy ? <Loader2 className="w-7 h-7 text-[#0e7490] animate-spin" /> : <Upload className="w-7 h-7 text-gray-400" />}
          </div>
          <div className="font-bold">{busy ? "Memproses file…" : "Pilih file Excel (.xlsx)"}</div>
          <p className="text-xs text-muted-foreground mt-1">Maks 10MB · export iSafe & FMS</p>
          <Button className="mt-4" disabled={busy} style={{ background: "#0e7490" }} onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> {busy ? "Mengunggah…" : "Pilih File"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-4">
            <div className="font-bold text-sm mb-3 flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> Hasil Import</div>
            <div className="divide-y">
              {SHEETS.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2.5">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-sm"><b>{(result.saved[s.key] ?? 0).toLocaleString("id-ID")}</b> <span className="text-muted-foreground text-xs">baris</span></div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/workspace/zero-harm")}>Lihat Dashboard</Button>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Card>
          <CardContent className="p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-[#0e7490]" /> Sheet yang dibaca</div>
            <div className="divide-y">
              {SHEETS.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2.5">
                  <div><div className="font-medium text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{s.note}</div></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
