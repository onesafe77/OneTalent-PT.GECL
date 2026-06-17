import { useState, useEffect, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Save, Loader2, ClipboardPaste } from "lucide-react";

interface Officer { nik: string; nama: string | null; dept: string | null; perusahaan?: string | null; ord: number; days: Record<number, number | null>; }
interface Section { section: string; officers: Officer[]; }
interface PlanData { year: number; sections: Section[]; }

const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);
const SECTION_ORDER = ["Pengawas Hauling", "Pengawas FMS", "Pengawas Workshop"];
const sectionRank = (s: string) => { const i = SECTION_ORDER.indexOf(s); return i < 0 ? 99 : i; };
const sectionColor = (s: string) =>
  /hauling/i.test(s) ? "bg-green-100 text-green-800"
  : /fms/i.test(s) ? "bg-amber-100 text-amber-800"
  : /workshop/i.test(s) ? "bg-red-100 text-red-800"
  : "bg-slate-100 text-slate-700";

// model editable: section → nik → officer(+days)
type Model = Record<string, Record<string, Officer>>;

export default function ZeroHarmPlanKehadiran() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [year, setYear] = useState(2026);
  const [fromWeek, setFromWeek] = useState(20);
  const [model, setModel] = useState<Model>({});
  const [dirty, setDirty] = useState(0);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const { data, isLoading, isFetching } = useQuery<PlanData>({
    queryKey: ["zh-plan-kehadiran", year],
    queryFn: () => apiRequest(`/api/zero-harm/plan-kehadiran?year=${year}`, "GET"),
    placeholderData: (p) => p,
  });

  // muat model dari server saat data berubah (reset edit)
  useEffect(() => {
    if (!data) return;
    const m: Model = {};
    for (const s of data.sections || []) {
      m[s.section] = {};
      for (const o of s.officers) m[s.section][o.nik] = { ...o, days: { ...o.days } };
    }
    setModel(m); setDirty(0);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const rows: any[] = [];
      for (const section of Object.keys(model))
        for (const nik of Object.keys(model[section])) {
          const o = model[section][nik];
          rows.push({ section, nik, nama: o.nama, dept: o.dept, perusahaan: o.perusahaan ?? null, ord: o.ord, days: o.days });
        }
      return apiRequest("/api/zero-harm/plan-kehadiran", "POST", { year, rows });
    },
    onSuccess: (r: any) => {
      toast({ title: "Plan kehadiran tersimpan", description: `${r?.planCells ?? 0} sel → ${r?.derived ?? 0} entri program. Workbook dihitung ulang…` });
      setDirty(0);
      qc.invalidateQueries({ queryKey: ["zh-plan-kehadiran", year] });
    },
    onError: (e: any) => toast({ title: "Gagal menyimpan", description: e?.message, variant: "destructive" }),
  });

  const weeks = useMemo(() => WEEKS.filter((w) => w >= fromWeek && w <= fromWeek + 13), [fromWeek]);
  const sections = useMemo(
    () => Object.keys(model).sort((a, b) => sectionRank(a) - sectionRank(b) || a.localeCompare(b))
      .map((section) => ({ section, officers: Object.values(model[section]).sort((a, b) => (a.ord - b.ord) || String(a.nama).localeCompare(String(b.nama))) })),
    [model],
  );

  function setCell(section: string, nik: string, week: number, raw: string) {
    setModel((prev) => {
      const m = { ...prev, [section]: { ...prev[section] } };
      const o = { ...m[section][nik], days: { ...m[section][nik].days } };
      o.days[week] = raw === "" ? null : Math.max(0, Math.min(7, Number(raw)));
      m[section][nik] = o; return m;
    });
    setDirty((d) => d + 1);
  }

  function processPaste() {
    const rows = pasteText.replace(/\r/g, "").split("\n").map((l) => l.split("\t")).filter((r) => r.some((c) => c.trim() !== ""));
    if (rows.length < 2) { toast({ title: "Data kurang", description: "Sertakan baris header minggu + baris pengawas.", variant: "destructive" }); return; }
    // header minggu
    let weekColOf: Record<number, number> = {}; let best = 0, headerIdx = -1;
    rows.forEach((r, i) => { const map: Record<number, number> = {}; let n = 0; r.forEach((c, ci) => { const m = /^W\s*(\d+)$/i.exec(c.trim()); if (m) { map[ci] = +m[1]; n++; } }); if (n > best) { best = n; headerIdx = i; weekColOf = map; } });
    if (best === 0) { toast({ title: "Header minggu tak ditemukan (W1, W2, …)", variant: "destructive" }); return; }
    const dataRows = rows.slice(headerIdx + 1);
    // kolom NIK & section
    const nikScore: Record<number, number> = {}, secScore: Record<number, number> = {};
    dataRows.forEach((r) => r.forEach((c, ci) => {
      if (/^C-?\d+$/i.test(c.trim())) nikScore[ci] = (nikScore[ci] || 0) + 1;
      if (/pengawas\s+(hauling|fms|workshop)/i.test(c.trim())) secScore[ci] = (secScore[ci] || 0) + 1;
    }));
    const nikCol = Object.keys(nikScore).sort((a, b) => nikScore[+b] - nikScore[+a])[0];
    const secCol = Object.keys(secScore).sort((a, b) => secScore[+b] - secScore[+a])[0];
    if (nikCol == null) { toast({ title: "Kolom NIK tak ditemukan (mis. C-014627)", variant: "destructive" }); return; }
    if (secCol == null) { toast({ title: "Kolom Jabatan/section tak ditemukan", description: "Sertakan kolom 'Pengawas Hauling/FMS/Workshop'.", variant: "destructive" }); return; }
    const nc = +nikCol, sc = +secCol, namaCol = nc - 1 >= 0 ? nc - 1 : nc + 1;
    const weekCols = Object.keys(weekColOf).map(Number);
    // bangun model dari paste (gabung ke model lama)
    const m: Model = JSON.parse(JSON.stringify(model));
    let officers = 0, cells = 0; const secsSeen = new Set<string>();
    dataRows.forEach((r, idx) => {
      const nik = (r[nc] || "").trim().toUpperCase(); if (!/^C-?\d+$/i.test(nik)) return;
      const rawSec = (r[sc] || "").trim();
      const sm = /pengawas\s+(hauling|fms|workshop)/i.exec(rawSec);
      const section = sm ? "Pengawas " + sm[1][0].toUpperCase() + sm[1].slice(1).toLowerCase() : rawSec;
      if (!section) return;
      secsSeen.add(section);
      if (!m[section]) m[section] = {};
      if (!m[section][nik]) { m[section][nik] = { nik, nama: (r[namaCol] || "").trim() || null, dept: null, perusahaan: null, ord: idx, days: {} }; officers++; }
      const o = m[section][nik];
      for (const ci of weekCols) {
        const raw = (r[ci] ?? "").trim();
        let days: number | null;
        if (raw === "" || /^NA$/i.test(raw)) days = null; else { const n = Number(raw); if (Number.isNaN(n)) continue; days = Math.max(0, Math.min(7, n)); }
        o.days[weekColOf[ci]] = days; cells++;
      }
    });
    if (cells === 0) { toast({ title: "Tidak ada nilai terbaca", variant: "destructive" }); return; }
    setModel(m); setDirty((d) => d + cells);
    const minWeek = Math.min(...weekCols.map((ci) => weekColOf[ci]));
    setFromWeek(Math.max(1, Math.min(49, minWeek)));
    setPasteOpen(false); setPasteText("");
    toast({ title: "Tempel berhasil", description: `${secsSeen.size} section · ${officers} pengawas baru · ${cells} sel. Periksa lalu klik Simpan.` });
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-600" /> Plan Kehadiran Pengawas — Zero Harm 2.0
          </h1>
          <p className="text-xs text-slate-500">Hari kerja (0–7) atau kosong = <b>NA</b> (cuti), per <b>section</b> (Hauling/FMS/Workshop). Satu input → Aktual Kehadiran semua sheet OPK.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-sm border rounded-lg px-3 py-2 bg-white font-medium">
            {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={fromWeek} onChange={(e) => setFromWeek(Number(e.target.value))} className="text-sm border rounded-lg px-3 py-2 bg-white font-medium">
            {Array.from({ length: 13 }, (_, i) => i * 4 + 1).map((w) => <option key={w} value={w}>Mulai W{w}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}><ClipboardPaste className="w-4 h-4 mr-1" /> Tempel dari Spreadsheet</Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !dirty}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Simpan{dirty ? ` (${dirty})` : ""}
          </Button>
        </div>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Tempel Plan Kehadiran dari Spreadsheet (tab GECL)</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Salin blok yang memuat <b>kolom Jabatan</b> (Pengawas Hauling/FMS/Workshop) + <b>NIK</b> + <b>baris header minggu</b> (W23, W24, …) + nilai (7/NA). Urutan kolom bebas — dideteksi otomatis.</p>
            <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} className="h-48 font-mono text-xs"
              placeholder={"Tempel di sini…\nNama\tNIK\tJabatan\tW23\tW24\nARIF\tC-014627\tPengawas Hauling\tNA\t7"} />
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
        ) : sections.length === 0 ? (
          <div className="p-10 text-center text-slate-400">Belum ada data. Klik <b>Tempel dari Spreadsheet</b> untuk mengisi dari Google Sheet (tab GECL).</div>
        ) : (
          <div className="overflow-x-auto relative">
            {isFetching && <div className="absolute top-2 right-2 text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> memuat…</div>}
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold border-b min-w-[200px]">Pengawas</th>
                  {weeks.map((w) => <th key={w} className="px-2 py-2 text-center font-semibold border-b border-l whitespace-nowrap min-w-[44px]">W{w}</th>)}
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <Fragment key={s.section}>
                    <tr>
                      <td colSpan={weeks.length + 1} className={`px-3 py-1.5 font-bold text-xs border-b ${sectionColor(s.section)}`}>{s.section} · {s.officers.length} pengawas</td>
                    </tr>
                    {s.officers.map((o) => (
                      <tr key={s.section + "|" + o.nik} className="hover:bg-slate-50/50">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-b">
                          <div className="font-medium text-slate-700">{o.nama || o.nik}</div>
                          <div className="text-[10px] text-slate-400">{o.nik}</div>
                        </td>
                        {weeks.map((w) => {
                          const v = o.days[w];
                          return (
                            <td key={w} className="border-b border-l p-0.5 text-center">
                              <input type="number" min={0} max={7} value={v == null ? "" : v} placeholder="NA"
                                onChange={(e) => setCell(s.section, o.nik, w, e.target.value)}
                                className={`w-10 text-center text-xs border rounded py-1 ${v == null ? "bg-slate-50 text-slate-400" : "bg-white"}`} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-slate-400">
        Denominator: ROUNDUP(hari/7 × target). Section <b>Hauling</b> → sheet 3.5–3.10, 5.1, 5.2 · <b>Workshop</b> → 7.2. FMS disimpan (belum dipetakan). Simpan → derive ke program + hitung ulang Workbook.
      </p>
    </div>
  );
}
