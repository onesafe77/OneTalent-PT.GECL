import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Download, Maximize2, Minimize2, PencilLine, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Flowchart di jawaban chat, digambar dengan Excalidraw.
 *
 * Agen menulis blok ```mermaid (format teks yang andal dihasilkan model), lalu di sini
 * diubah ke elemen Excalidraw oleh @excalidraw/mermaid-to-excalidraw. Pustaka Excalidraw
 * besar (±1 MB), jadi dimuat hanya saat sebuah jawaban memang berisi flowchart.
 */

const Excalidraw = lazy(async () => {
  await import("@excalidraw/excalidraw/index.css");
  const m = await import("@excalidraw/excalidraw");
  return { default: m.Excalidraw };
});

type Hasil = { elements: any[]; files: any } | { galat: string };

export function FlowchartExcalidraw({ kode }: { kode: string }) {
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [api, setApi] = useState<any>(null);
  const [ubah, setUbah] = useState(false);
  const [penuh, setPenuh] = useState(false);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const [{ parseMermaidToExcalidraw }, { convertToExcalidrawElements }] = await Promise.all([
          import("@excalidraw/mermaid-to-excalidraw"),
          import("@excalidraw/excalidraw"),
        ]);
        const { elements, files } = await parseMermaidToExcalidraw(kode, { themeVariables: { fontSize: "16px" } } as any);
        // Font label ditetapkan SEBELUM konversi supaya lebar teks diukur dengan font yang sama
        // (mengganti font sesudahnya membuat label terpotong). 2 = Helvetica/sans sistem.
        const kerangka = (elements as any[]).map((e) => ({
          ...e,
          ...(e.label ? { label: { ...e.label, fontFamily: 2, fontSize: 16 } } : {}),
          ...(e.type === "text" ? { fontFamily: 2 } : {}),
        }));
        const el = convertToExcalidrawElements(kerangka as any, { regenerateIds: true }).map((e: any) => ({
          ...e,
          // Gaya OneTalent: garis gelap, sudut membulat, tanpa arsiran; keputusan (diamond) disorot merah muda.
          roughness: 0,
          strokeColor: e.type === "text" ? "#1f1f1f" : e.type === "arrow" ? "#6b6b6b" : "#1f1f1f",
          backgroundColor: e.type === "diamond" ? "#fde8e8" : e.type === "rectangle" || e.type === "ellipse" ? "#ffffff" : e.backgroundColor,
          fillStyle: "solid",
          roundness: e.type === "rectangle" ? { type: 3 } : e.roundness,
          // fontFamily sengaja tidak diganti: lebar teks sudah diukur dengan font bawaan,
          // menggantinya membuat huruf awal label terpotong.
        }));
        if (!batal) setHasil({ elements: el, files });
      } catch (err: any) {
        if (!batal) setHasil({ galat: String(err?.message || err).slice(0, 160) });
      }
    })();
    return () => { batal = true; };
  }, [kode]);

  // Pas-kan gambar ke bingkai setiap kali ukuran bingkai berubah.
  useEffect(() => {
    if (!api) return;
    // Dua kali: segera, lalu setelah font kanvas selesai dimuat (ukuran teks berubah).
    const pas = () => api.scrollToContent(undefined, { fitToViewport: true, viewportZoomFactor: 0.88, animate: false } as any);
    const t1 = setTimeout(pas, 80), t2 = setTimeout(pas, 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [api, penuh]);

  const unduh = async () => {
    if (!api) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements: api.getSceneElements(), files: api.getFiles(),
      appState: { ...api.getAppState(), exportBackground: true, viewBackgroundColor: "#ffffff" }, mimeType: "image/png",
    } as any);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "flowchart-onetalent.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const dataAwal = useMemo(() => (hasil && "elements" in hasil ? {
    elements: hasil.elements, files: hasil.files,
    appState: { viewBackgroundColor: "#ffffff", currentItemRoughness: 0, zenModeEnabled: false },
    scrollToContent: true,
  } : null), [hasil]);

  if (hasil && "galat" in hasil) {
    return (
      <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
        <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" /> Flowchart tidak dapat digambar</p>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-[12px] text-foreground/80">{kode}</pre>
      </div>
    );
  }

  const tombol = "flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground";

  return (
    <div className={cn(
      "my-4 overflow-hidden rounded-xl border border-black/[0.08] bg-card dark:border-white/10",
      penuh && "fixed inset-4 z-50 my-0 flex flex-col shadow-2xl",
    )}>
      <div className="flex h-10 flex-none items-center gap-1 border-b border-black/[0.06] px-2 dark:border-white/10">
        <span className="px-1.5 text-[12px] font-medium text-foreground/80">Flowchart</span>
        <span className="flex-1" />
        <button type="button" className={tombol} onClick={() => setUbah((v) => !v)} title={ubah ? "Mode lihat" : "Ubah di kanvas"}>
          {ubah ? <Eye className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}{ubah ? "Lihat" : "Ubah"}
        </button>
        <button type="button" className={tombol} onClick={unduh} disabled={!api} title="Unduh PNG">
          <Download className="h-3.5 w-3.5" />PNG
        </button>
        <button type="button" className={tombol} onClick={() => setPenuh((v) => !v)} title={penuh ? "Kecilkan" : "Layar penuh"}>
          {penuh ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div data-flowchart-lihat={!ubah || undefined} className={cn("relative w-full", penuh ? "min-h-0 flex-1" : "h-[460px]")}>
        {/* Menu & bilah bawaan Excalidraw disembunyikan di mode lihat; kontrol ada di bilah atas kita.
            !important karena CSS Excalidraw sendiri memberi display pada elemen ini. */}
        <style>{`[data-flowchart-lihat] .App-menu_top,[data-flowchart-lihat] .App-bottom-bar,[data-flowchart-lihat] .layer-ui__wrapper__footer,[data-flowchart-lihat] .main-menu-trigger{display:none!important}`}</style>
        {!dataAwal ? (
          <div className="grid h-full place-items-center text-[13px] text-muted-foreground">Menggambar flowchart…</div>
        ) : (
          <Suspense fallback={<div className="grid h-full place-items-center text-[13px] text-muted-foreground">Memuat kanvas…</div>}>
            <Excalidraw
              excalidrawAPI={setApi}
              initialData={dataAwal as any}
              viewModeEnabled={!ubah}
              langCode="id-ID"
              UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false, toggleTheme: false, changeViewBackgroundColor: false } }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
