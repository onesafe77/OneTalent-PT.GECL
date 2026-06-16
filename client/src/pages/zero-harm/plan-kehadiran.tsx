import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Save, Loader2, ClipboardPaste } from "lucide-react";

interface Officer { nik: string; nama: string; dept: string | null; programs: string[]; days: Record<number, number | null>; }
interface PlanData { year: number; officers: Officer[]; }

const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);

export default function ZeroHarmPlanKehadiran() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [year, setYear] = useState(2026);
  const [fromWeek, setFromWeek] = useState(20);
  const [edits, setEdits] = useState<Record<string, number | null>>({}); // `${nik}|${week}` → days|null

  const { data, isLoading, isFetching } = useQuery<PlanData>({
    queryKey: ["zh-plan-kehadiran", year],
    queryFn: () => apiRequest(`/api/zero-harm/plan-kehadiran?year=${year}`, "GET"),
    placeholderData: (p) => p,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(edits).map(([k, days]) => {
        const [nik, week] = k.split("|");
        return { nik, week: Number(week), days };
      });
      return apiRequest("/api/zero-harm/plan-kehadiran", "POST", { year, entries });
    },
    onSuccess: (r: any) => {
      toast({ title: "Plan kehadiran tersimpan", description: `${Object.keys(edits).length} sel → ${r?.programs ?? 0} program. Workbook sedang dihitung ulang…` });
      setEdits({});
      qc.invalidateQueries({ queryKey: ["zh-plan-kehadiran", year] });
    },
    onError: (e: any) => toast({ title: "Gagal menyimpan", description: e?.message, variant: "destructive" }),
  });

  // ---- Tempel dari Spreadsheet ----
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  function processPaste() {
    const text = pasteText.replace(/\r/g, "");
    const rows = text.split("\n").map((l) => l.split("\t")).filter((r) => r.some((c) => c.trim() !== ""));
    if (rows.length < 2) { toast({ title: "Data kurang", description: "Tempel termasuk baris header minggu (W..) dan baris pengawas.", variant: "destructive" }); return; }
    // 1) baris header minggu = baris dgn sel terbanyak cocok /^W\d+$/
    let headerIdx = -1, best = 0;
    let weekColOf: Record<number, number> = {}; // colIndex → weekNum (untuk header terpilih)
    rows.forEach((r, i) => {
      const map: Record<number, number> = {}; let n = 0;
      r.forEach((c, ci) => { const m = /^W\s*(\d+)$/i.exec(c.trim()); if (m) { map[ci] = Number(m[1]); n++; } });
      if (n > best) { best = n; headerIdx = i; weekColOf = map; }
    });
    if (headerIdx < 0 || best === 0) { toast({ title: "Header minggu tak ditemukan", description: "Pastikan ada baris berisi W1, W2, … (mis. W23, W24).", variant: "destructive" }); return; }
    // 2) kolom NIK = kolom yg mayoritas selnya cocok /^C-?\d+$/i (di bawah header)
    const dataRows = rows.slice(headerIdx + 1);
    const nikScore: Record<number, number> = {};
    dataRows.forEach((r) => r.forEach((c, ci) => { if (/^C-?\d+$/i.test(c.trim())) nikScore[ci] = (nikScore[ci] || 0) + 1; }));
    const nikCol = Object.keys(nikScore).sort((a, b) => nikScore[+b] - nikScore[+a])[0];
    if (nikCol == null) { toast({ title: "Kolom NIK tak ditemukan", description: "Sertakan kolom NIK (mis. C-014627) saat menyalin.", variant: "destructive" }); return; }
    const nc = Number(nikCol);
    // 3) bangun edits
    const knownNiks = new Set(officers.map((o) => o.nik));
    const newEdits: Record<string, number | null> = {};
    let matched = 0, unknown = 0, cells = 0;
    const weekCols = Object.keys(weekColOf).map(Number);
    for (const r of dataRows) {
      const nik = (r[nc] || "").trim().toUpperCase();
      if (!/^C-?\d+$/i.test(nik)) continue;
      if (knownNiks.has(nik)) matched++; else unknown++;
      for (const ci of weekCols) {
        const week = weekColOf[ci];
        const raw = (r[ci] ?? "").trim();
        let days: number | null;
        if (raw === "" || /^NA$/i.test(raw)) days = null;
        else { const n = Number(raw); if (Number.isNaN(n)) continue; days = Math.max(0, Math.min(7, n)); }
        newEdits[`${nik}|${week}`] = days;
        cells++;
      }
    }
    if (cells === 0) { toast({ title: "Tidak ada nilai terbaca", variant: "destructive" }); return; }
    // pindah jendela minggu ke minggu terkecil yg ter-paste agar langsung terlihat
    const minWeek = Math.min(...weekCols.map((ci) => weekColOf[ci]));
    setFromWeek(Math.max(1, Math.min(49, minWeek)));
    setEdits((prev) => ({ ...prev, ...newEdits }));
    setPasteOpen(false); setPasteText("");
    toast({ title: "Tempel berhasil", description: `${matched} pengawas cocok${unknown ? `, ${unknown} tak dikenal (diabaikan)` : ""} · ${cells} sel. Klik Simpan untuk terapkan.` });
  }

  const officers = data?.officers ?? [];
  const weeks = useMemo(() => WEEKS.filter((w) => w >= fromWeek && w <= fromWeek + 13), [fromWeek]);
  const cellVal = (nik: string, w: number, fallback: number | null | undefined) => {
    const k = `${nik}|${w}`;
    return k in edits ? edits[k] : (fallback ?? null);
  };
  const setCell = (nik: string, w: number, raw: string) =>
    setEdits((prev) => ({ ...prev, [`${nik}|${w}`]: raw === "" ? null : Math.max(0, Math.min(7, Number(raw))) }));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-600" /> Plan Kehadiran Pengawas — Zero Harm 2.0
          </h1>
          <p className="text-xs text-slate-500">Isi hari kerja (0–7) atau kosongkan = <b>NA</b> (cuti). Satu input otomatis masuk ke <b>semua sheet OPK</b> di Workbook.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setEdits({}); }}
            className="text-sm border rounded-lg px-3 py-2 bg-white font-medium">
            {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={fromWeek} onChange={(e) => setFromWeek(Number(e.target.value))}
            className="text-sm border rounded-lg px-3 py-2 bg-white font-medium">
            {Array.from({ length: 13 }, (_, i) => i * 4 + 1).map((w) => <option key={w} value={w}>Mulai W{w}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste className="w-4 h-4 mr-1" /> Tempel dari Spreadsheet
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !Object.keys(edits).length}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Simpan ({Object.keys(edits).length})
          </Button>
        </div>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tempel Plan Kehadiran dari Spreadsheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Di Google Sheet, salin blok yang memuat <b>kolom NIK</b> + <b>baris header minggu</b> (W23, W24, …) + nilai (7 / NA), lalu tempel di bawah. Urutan kolom bebas — sistem mendeteksi otomatis.
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Tempel di sini (Ctrl/Cmd+V)…\nContoh:\nNama\tNIK\tW23\tW24\tW25\nARIF\tC-014627\tNA\t7\t7"}
              className="h-48 font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPasteOpen(false); setPasteText(""); }}>Batal</Button>
            <Button onClick={processPaste} disabled={!pasteText.trim()}>Proses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="p-0 overflow-hidden">
        {isLoading && !data ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : officers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Belum ada pengawas. Upload workbook master / seed roster dulu.</div>
        ) : (
          <div className="overflow-x-auto relative">
            {isFetching && <div className="absolute top-2 right-2 text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> memuat…</div>}
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold border-b min-w-[180px]">Pengawas</th>
                  {weeks.map((w) => <th key={w} className="px-2 py-2 text-center font-semibold border-b border-l whitespace-nowrap min-w-[44px]">W{w}</th>)}
                </tr>
              </thead>
              <tbody>
                {officers.map((o) => (
                  <tr key={o.nik} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-b">
                      <div className="font-medium text-slate-700">{o.nama}</div>
                      <div className="text-[10px] text-slate-400">{o.nik} · {o.programs?.length ?? 0} program</div>
                    </td>
                    {weeks.map((w) => {
                      const v = cellVal(o.nik, w, o.days?.[w]);
                      return (
                        <td key={w} className="border-b border-l p-0.5 text-center">
                          <input
                            type="number" min={0} max={7}
                            value={v == null ? "" : v}
                            placeholder="NA"
                            onChange={(e) => setCell(o.nik, w, e.target.value)}
                            className={`w-10 text-center text-xs border rounded py-1 ${v == null ? "bg-slate-50 text-slate-400" : "bg-white"}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-slate-400">
        Hari = jumlah hari kerja minggu itu (denominator: ROUNDUP(hari/7 × target)). Kosong = NA (cuti, tak dihitung). Simpan → menulis ke semua program Sidak pengawas + hitung ulang Workbook.
      </p>
    </div>
  );
}
