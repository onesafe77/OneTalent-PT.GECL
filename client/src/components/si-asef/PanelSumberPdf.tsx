import { useEffect, useRef, useState } from "react";
import { X, FileText, ExternalLink } from "lucide-react";

/**
 * Panel kanan untuk mencocokkan sitasi dengan PDF ASLI (gaya NotebookLM).
 *
 * Seluruh halaman dirender ke kanvas, lalu potongan teks yang dikutip agen
 * ditandai kotak kuning di atas kanvas dan panel menggulir ke tanda pertama.
 * Tidak memakai TextLayer pdf.js: cukup posisi tiap item teks, jadi tidak perlu
 * CSS lapisan teks dan tidak bentrok dengan gaya aplikasi.
 */

export interface SumberSitasi {
  id: number;
  chunkId?: string;
  documentName?: string;
  kode?: string;
  revisi?: number;
  judul?: string;
  bagian?: string;
  pageNumber?: number;
  pageEnd?: number;
  content?: string;
}

const normal = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Item teks halaman mana yang termasuk kutipan.
 *
 * Pencocokan per URUTAN KATA, bukan per item: PDF memecah teks jadi item yang
 * batasnya tak sejajar dengan potongan (satu item bisa separuh kutipan, separuh
 * paragraf sebelahnya). Setiap kata halaman ditandai bila ia bagian dari rangkaian
 * N kata yang juga muncul berurutan di kutipan; item disorot bila sebagian besar
 * katanya tertandai. Frasa pendek yang kebetulan sama (<N kata) tidak ikut.
 */
export function cocokkanItem(items: string[], kutipan: string, N = 6): Set<number> {
  const kataKutipan = normal(kutipan).split(" ").filter(Boolean);
  const gram = new Set<string>();
  for (let i = 0; i + N <= kataKutipan.length; i++) gram.add(kataKutipan.slice(i, i + N).join(" "));

  const kata: string[] = [], milik: number[] = [];
  items.forEach((t, idx) => normal(t).split(" ").filter(Boolean).forEach((w) => { kata.push(w); milik.push(idx); }));
  const tanda = new Array(kata.length).fill(false);
  for (let i = 0; i + N <= kata.length; i++) {
    if (gram.has(kata.slice(i, i + N).join(" "))) for (let j = i; j < i + N; j++) tanda[j] = true;
  }
  const total = new Map<number, number>(), kena = new Map<number, number>();
  milik.forEach((idx, i) => {
    total.set(idx, (total.get(idx) || 0) + 1);
    if (tanda[i]) kena.set(idx, (kena.get(idx) || 0) + 1);
  });
  const out = new Set<number>();
  kena.forEach((k, idx) => { if (k / total.get(idx)! >= 0.5) out.add(idx); });
  return out;
}

export function PanelSumberPdf({ sumber, onTutup }: { sumber: SumberSitasi; onTutup: () => void }) {
  const wadah = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"muat" | "siap" | "galat">("muat");
  const [adaSorotan, setAdaSorotan] = useState(true);
  const [jumlahHal, setJumlahHal] = useState(0);
  const url = sumber.chunkId ? `/api/si-asef/sumber/${encodeURIComponent(sumber.chunkId)}/pdf` : "";

  useEffect(() => {
    let batal = false;
    const el = wadah.current;
    if (!el || !url) { setStatus("galat"); return; }
    el.innerHTML = "";
    setStatus("muat");
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const doc = await pdfjs.getDocument({ url, withCredentials: true }).promise;
        if (batal) return;
        setJumlahHal(doc.numPages);
        const lebar = el.clientWidth - 32;
        const awal = sumber.pageNumber ?? 1, akhir = sumber.pageEnd ?? awal;
        let targetY: number | null = null;
        let tanda = 0;

        for (let n = 1; n <= doc.numPages; n++) {
          if (batal) return;
          const hal = await doc.getPage(n);
          const dasar = hal.getViewport({ scale: 1 });
          const skala = lebar / dasar.width;
          const vp = hal.getViewport({ scale: skala });
          const rasio = window.devicePixelRatio || 1;

          const kotak = document.createElement("div");
          kotak.className = "relative mx-auto mb-4 overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-black/5";
          kotak.style.width = `${vp.width}px`; kotak.style.height = `${vp.height}px`;
          kotak.dataset.halaman = String(n);
          const kanvas = document.createElement("canvas");
          kanvas.width = Math.floor(vp.width * rasio); kanvas.height = Math.floor(vp.height * rasio);
          kanvas.style.width = `${vp.width}px`; kanvas.style.height = `${vp.height}px`;
          kotak.appendChild(kanvas);
          const label = document.createElement("span");
          label.className = "absolute bottom-1.5 right-2 rounded bg-black/50 px-1.5 text-[10px] text-white";
          label.textContent = `${n} / ${doc.numPages}`;
          kotak.appendChild(label);
          el.appendChild(kotak);

          await hal.render({ canvasContext: kanvas.getContext("2d")!, viewport: vp, transform: rasio !== 1 ? [rasio, 0, 0, rasio, 0, 0] : undefined }).promise;

          // Sorot hanya di rentang halaman potongan.
          if (sumber.content && n >= awal && n <= akhir) {
            const isi = await hal.getTextContent();
            const items = isi.items.map((it: any) => it.str ?? "");
            const cocok = cocokkanItem(items, sumber.content);
            cocok.forEach((i) => {
              const it: any = isi.items[i];
              const t = pdfjs.Util.transform(vp.transform, it.transform);
              const tinggi = Math.hypot(t[2], t[3]);
              const tanda_ = document.createElement("mark");
              tanda_.className = "pointer-events-none absolute rounded-[2px]";
              // Gaya langsung: <mark> punya latar kuning pekat bawaan yang menutupi teks.
              Object.assign(tanda_.style, { background: "rgba(250, 204, 21, 0.38)", mixBlendMode: "multiply", color: "transparent" });
              tanda_.style.left = `${t[4] - 1}px`;
              tanda_.style.top = `${t[5] - tinggi * 0.95}px`;
              tanda_.style.width = `${it.width * skala + 2}px`;
              tanda_.style.height = `${tinggi * 1.2}px`;
              kotak.appendChild(tanda_);
              targetY ??= kotak.offsetTop + parseFloat(tanda_.style.top);
              tanda++;
            });
          }
          if (n === awal && targetY === null && !sumber.content) targetY = kotak.offsetTop;
          if (n === 1) setStatus("siap");
          if (n === Math.min(akhir, doc.numPages)) {
            // Tanpa sorotan: tetap lompat ke halaman awal potongan.
            const y = targetY ?? (el.querySelector(`[data-halaman="${awal}"]`) as HTMLElement | null)?.offsetTop ?? 0;
            el.scrollTo({ top: Math.max(0, y - 120), behavior: "smooth" });
          }
        }
        if (!batal) setAdaSorotan(tanda > 0);
      } catch (e) {
        console.error("panel sumber:", e);
        if (!batal) setStatus("galat");
      }
    })();
    return () => { batal = true; };
  }, [url, sumber.id, sumber.content]);

  const judul = sumber.kode ? `${sumber.kode} R${String(sumber.revisi ?? 0).padStart(2, "0")}` : sumber.documentName;

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-col border-l border-black/[0.07] bg-[#f7f7f5] dark:border-white/10 dark:bg-gray-900">
      <header className="flex flex-none items-start gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
        <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">{sumber.id}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-foreground">{judul}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {sumber.judul ?? ""}{sumber.bagian ? ` · ${sumber.bagian}` : ""}{sumber.pageNumber ? ` · hal. ${sumber.pageNumber}${sumber.pageEnd && sumber.pageEnd !== sumber.pageNumber ? `–${sumber.pageEnd}` : ""}` : ""}
          </p>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" title="Buka PDF di tab baru"
            className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button type="button" onClick={onTutup} aria-label="Tutup sumber"
          className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </header>

      {!adaSorotan && status === "siap" && sumber.content && (
        <div className="flex-none border-b border-amber-200/70 bg-amber-50 px-4 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
          <p className="mb-1 font-medium">Kutipan yang dipakai</p>
          <p className="line-clamp-4">{sumber.content}</p>
        </div>
      )}

      <div ref={wadah} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4" />

      {status === "muat" && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center text-[13px] text-muted-foreground">Memuat PDF…</div>
      )}
      {status === "galat" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-muted-foreground">
          <FileText className="h-6 w-6" strokeWidth={1.5} />
          <p>PDF tidak dapat dimuat. Dokumen mungkin sudah direvisi sejak jawaban ini dibuat.</p>
          {sumber.content && <p className="mt-2 line-clamp-6 text-left text-foreground/80">{sumber.content}</p>}
        </div>
      )}
      <span className="sr-only">{jumlahHal} halaman</span>
    </aside>
  );
}
