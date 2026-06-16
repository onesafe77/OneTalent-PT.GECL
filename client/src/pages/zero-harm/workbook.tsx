import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Download, FileSpreadsheet, Trash2, Check, RefreshCw } from "lucide-react";
import { createUniver, defaultTheme, LocaleType, merge } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/presets/preset-sheets-core";
import sheetsCoreEnUS from "@univerjs/presets/preset-sheets-core/locales/en-US";
import "@univerjs/presets/lib/styles/preset-sheets-core.css";

export default function ZeroHarmWorkbook() {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const univerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const disposerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const saveTimer = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [autoStatus, setAutoStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [readOnly, setReadOnly] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const lockTimer = useRef<any>(null);
  const computeTimer = useRef<any>(null);
  const loadedRealRef = useRef(false);

  async function recompute() {
    try {
      await apiRequest("/api/zero-harm/workbook/recompute", "POST");
      setComputing(true);
      toast({ title: "Menghitung ulang…", description: "Rumus dihitung dari data terbaru (±1 menit)" });
      pollComputing();
    } catch (e: any) { toast({ title: "Gagal", description: e?.message, variant: "destructive" }); }
  }

  const RAW = new Set(["Validasi", "Hazard", "Inspeksi", "Observasi", "OPK", "Attendance", "FMS"]);

  // buang sheet data mentah dari snapshot → payload kecil & simpan cepat
  function stripRaw(snap: any) {
    if (!snap?.sheetOrder) return snap;
    const sheetOrder: string[] = [];
    const sheets: any = {};
    for (const id of snap.sheetOrder) {
      const sh = snap.sheets?.[id];
      if (!sh) continue;
      if (RAW.has(String(sh.name || "").trim())) continue;
      sheetOrder.push(id); sheets[id] = sh;
    }
    return { ...snap, sheetOrder, sheets };
  }

  async function doSave(silent: boolean) {
    if (readOnly) { if (!silent) throw new Error("Mode baca-saja (sedang diedit orang lain)"); return; }
    if (!loadedRealRef.current) { if (!silent) throw new Error("Workbook belum termuat"); return; }
    const snapshot = apiRef.current?.getActiveWorkbook?.()?.save?.();
    if (!snapshot) { if (!silent) throw new Error("Workbook belum siap"); return; }
    const out = stripRaw(snapshot);
    // pengaman: jangan timpa workbook isi dgn yg kosong (mis. saat init default)
    if (!out.sheetOrder || out.sheetOrder.length < 5) { if (!silent) throw new Error("Workbook kosong, tidak disimpan"); return; }
    await apiRequest("/api/zero-harm/workbook/save", "POST", { data: out });
  }

  function scheduleAutoSave() {
    if (readOnly) return;
    setAutoStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await doSave(true); setAutoStatus("saved"); }
      catch { setAutoStatus("idle"); }
    }, 1500);
  }

  // ---- Kunci edit (kolaborasi) ----
  async function acquireLock() {
    try {
      const r = await apiRequest("/api/zero-harm/workbook/lock", "POST");
      if (r?.ok) { setReadOnly(false); setLockedBy(null); startHeartbeat(); }
    } catch (e: any) {
      // 409 → dipegang user lain
      const by = e?.body?.lock?.name || e?.lock?.name;
      setReadOnly(true); setLockedBy(by || "pengguna lain");
    }
  }
  function startHeartbeat() {
    if (lockTimer.current) clearInterval(lockTimer.current);
    lockTimer.current = setInterval(() => { apiRequest("/api/zero-harm/workbook/lock", "POST").catch(() => {}); }, 30000);
  }

  async function initUniver(data: any) {
    if (!containerRef.current) return;
    readyRef.current = false;
    try { disposerRef.current?.dispose?.(); } catch { /* noop */ }
    try { univerRef.current?.dispose?.(); } catch { /* noop */ }
    containerRef.current.innerHTML = "";
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: merge({}, sheetsCoreEnUS) },
      theme: defaultTheme,
      presets: [UniverSheetsCorePreset({ container: containerRef.current })],
    });
    univerRef.current = univer;
    apiRef.current = univerAPI;
    loadedRealRef.current = !!data; // hanya workbook nyata yg boleh auto-save
    if (data) univerAPI.createWorkbook(data);
    else univerAPI.createWorkbook({ id: "zh", name: "Zero Harm 2.0", sheetOrder: ["s1"], sheets: { s1: { id: "s1", name: "Sheet1", rowCount: 50, columnCount: 20, cellData: {} } } });
    // auto-save: pantau perubahan sel (mutation) → simpan otomatis (debounce)
    try {
      disposerRef.current = univerAPI.onCommandExecuted((cmd: any) => {
        if (readyRef.current && cmd && cmd.type === 2) scheduleAutoSave();
      });
    } catch { /* noop */ }
    // aktifkan auto-save setelah render awal selesai (hindari trigger saat load)
    setTimeout(() => { readyRef.current = true; }, 2500);
  }

  async function pollComputing() {
    if (lockTimer.current) { /* noop */ }
    const tick = async () => {
      try {
        const s = await apiRequest("/api/zero-harm/workbook/status", "GET");
        if (!s?.computing) { await load(); return; }
      } catch { /* ignore */ }
      computeTimer.current = setTimeout(tick, 5000);
    };
    computeTimer.current = setTimeout(tick, 5000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await apiRequest("/api/zero-harm/workbook", "GET");
      if (res?.computing && !res?.data) {
        // sedang menghitung rumus di server → tampilkan status & poll
        setComputing(true); setEmpty(false); setLoading(false);
        pollComputing();
        return;
      }
      setComputing(false);
      if (!res?.data) { setEmpty(true); await initUniver(null); }
      else { setEmpty(false); await initUniver(res.data); }
      // kunci edit: bila dipegang user lain → baca-saja; selain itu klaim kunci
      if (res?.lock && !res.lock.mine) { setReadOnly(true); setLockedBy(res.lock.name); }
      else { await acquireLock(); }
    } catch (e: any) {
      toast({ title: "Gagal memuat workbook", description: e?.message, variant: "destructive" });
      await initUniver(null);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (lockTimer.current) clearInterval(lockTimer.current);
      if (computeTimer.current) clearTimeout(computeTimer.current);
      apiRequest("/api/zero-harm/workbook/lock/release", "POST").catch(() => {});
      try { disposerRef.current?.dispose?.(); } catch { /* noop */ }
      try { univerRef.current?.dispose?.(); } catch { /* noop */ }
    };
  }, []);

  async function save() {
    setBusy(true);
    try { await doSave(false); setAutoStatus("saved"); toast({ title: "Tersimpan", description: "Perubahan workbook disimpan" }); }
    catch (e: any) { toast({ title: "Gagal menyimpan", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function clearWorkbook() {
    if (!confirm("Hapus SEMUA sheet di workbook? Tindakan ini mengosongkan workbook (bisa upload ulang).")) return;
    setBusy(true);
    try {
      await apiRequest("/api/zero-harm/workbook", "DELETE");
      toast({ title: "Workbook dihapus", description: "Semua sheet dikosongkan" });
      setAutoStatus("idle");
      await load();
    } catch (e: any) {
      toast({ title: "Gagal menghapus", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/zero-harm/workbook/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Upload gagal");
      const j = await res.json();
      toast({ title: "Workbook diimpor", description: `${j.sheets} sheet program dimuat` });
      await load();
    } catch (err: any) {
      toast({ title: "Gagal upload", description: err?.message, variant: "destructive" });
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b bg-white">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-teal-600" /> Workbook Zero Harm 2.0 (Excel)</h1>
          <p className="text-[11px] text-slate-500">Semua sheet program — bisa diedit seperti Excel. Perubahan tersimpan otomatis.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 min-w-[90px] text-right">
            {!readOnly && autoStatus === "saving" && <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> menyimpan…</span>}
            {!readOnly && autoStatus === "saved" && <span className="inline-flex items-center gap-1 text-green-600"><Check className="w-3 h-3" /> tersimpan</span>}
          </span>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy || readOnly}><Upload className="w-4 h-4 mr-1" /> Upload Excel</Button>
          <Button size="sm" variant="outline" onClick={recompute} disabled={busy || readOnly || computing} title="Hitung ulang rumus dari data terbaru"><RefreshCw className={`w-4 h-4 mr-1 ${computing ? "animate-spin" : ""}`} /> Hitung Ulang</Button>
          <Button size="sm" variant="outline" onClick={() => window.open("/api/zero-harm/workbook/export", "_blank")}><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={clearWorkbook} disabled={busy || readOnly}><Trash2 className="w-4 h-4 mr-1" /> Hapus</Button>
          <Button size="sm" onClick={save} disabled={busy || readOnly}>{busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Simpan</Button>
        </div>
      </div>
      {computing && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Menghitung rumus dari data…</p>
          <p className="text-xs text-slate-400 mt-1">Sekali jalan (±1 menit). Halaman akan terbuka otomatis setelah selesai.</p>
        </div>
      )}
      {readOnly && (
        <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          🔒 Mode baca-saja — sedang diedit oleh <b>{lockedBy || "pengguna lain"}</b>. Perubahan Anda tidak akan tersimpan sampai mereka selesai.
        </div>
      )}
      {loading && !computing && <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /> Memuat…</div>}
      {empty && !loading && !computing && (
        <div className="p-6 text-sm text-slate-500">Belum ada workbook. Klik <b>Upload Excel</b> untuk mengimpor file <i>Database Zero Harm 2.0</i>.</div>
      )}
      <div ref={containerRef} className="flex-1 min-h-0" style={{ display: loading || computing ? "none" : "block" }} />
    </div>
  );
}
