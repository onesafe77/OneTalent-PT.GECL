import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Plus, Send, ChevronDown, ChevronRight, Mic, Square, Search, FileText, BookOpen, Wrench, PenLine } from "lucide-react";
import { PanelSumberPdf, type SumberSitasi } from "@/components/si-asef/PanelSumberPdf";
import { queryClient } from "@/lib/queryClient";
import { CakraMark } from "@/components/brand/CakraMark";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Sumber = SumberSitasi;
/** Satu langkah agen yang dikirim server (SSE) selama menyusun jawaban. */
type Langkah =
  | { tipe: "cari"; kueri: string }
  | { tipe: "temu"; kueri: string; jumlah: number; dokumen: string[] }
  | { tipe: "alat"; nama: string }
  | { tipe: "menyusun" };
type Pesan = { peran: "user" | "ai"; isi: string; sumber?: Sumber[]; langkah?: Langkah[]; berpikir?: boolean; detikBerpikir?: number };

/** Baca aliran Server-Sent Events dari fetch POST (EventSource tak mendukung POST). */
async function bacaAliran(res: Response, tiap: (ev: any) => void) {
  const pembaca = res.body!.getReader();
  const dek = new TextDecoder();
  let sisa = "";
  for (;;) {
    const { value, done } = await pembaca.read();
    if (done) break;
    sisa += dek.decode(value, { stream: true });
    let batas;
    while ((batas = sisa.indexOf("\n\n")) >= 0) {
      const blok = sisa.slice(0, batas); sisa = sisa.slice(batas + 2);
      const data = blok.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("");
      if (data) { try { tiap(JSON.parse(data)); } catch { /* blok rusak diabaikan */ } }
    }
  }
}

// Isi menu "Alat": templat pertanyaan yang dimasukkan ke kotak ketik (tidak langsung dikirim).
const ALAT = [
  { label: "Ringkas temuan Safety Patrol", isi: "Ringkas temuan Safety Patrol minggu ini per lokasi." },
  { label: "Cek regulasi", isi: "Apa dasar regulasi untuk " },
  { label: "Data karyawan", isi: "Tampilkan data karyawan departemen " },
  { label: "Buat JSA", isi: "Buatkan JSA untuk pekerjaan " },
];

// Dikte suara bawaan peramban (Chrome/Edge/Safari). Tombol mik disembunyikan bila tak didukung.
const PengenalSuara: any = typeof window !== "undefined"
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

function salam(): string {
  const j = new Date().getHours();
  if (j < 11) return "Selamat pagi";
  if (j < 15) return "Selamat siang";
  if (j < 19) return "Selamat sore";
  return "Selamat malam";
}

// Sapaan berganti tiap kali Beranda dibuka (gaya Claude), bernuansa K3 & SDM.
// {n} = nama depan. Sapaan waktu tetap ikut di dalam undian supaya terasa wajar.
const SAPAAN = [
  () => `${salam()}, {n}`,
  () => `${salam()}, {n}`,
  () => "Pulang selamat hari ini, {n}",
  () => "Keselamatan dulu, {n}",
  () => "Ada temuan apa hari ini, {n}?",
  () => "Siap bantu cek PPO, {n}",
  () => "Zero harm dimulai dari sini, {n}",
  () => "Mari jaga tim tetap aman, {n}",
  () => "Data karyawan butuh dicek, {n}?",
  () => "Kerja aman, produksi mengikuti",
  () => "Apa yang bisa dibantu, {n}?",
];

/** Hasil dipecah [sebelum, sesudah] nama supaya nama bisa diberi warna sendiri. */
function sapaanAcak(nama: string): [string, string, boolean] {
  const t = SAPAAN[Math.floor(Math.random() * SAPAAN.length)]();
  if (!nama) return [t.replace(/,? \{n\}/, ""), "", false];
  if (!t.includes("{n}")) return [t, "", false];
  const [a, b] = t.split("{n}");
  return [a, b, true];
}

export default function Beranda() {
  const { user } = useAuth();
  // Percakapan berjalan DI Beranda. Dulu Enter memindahkan ke /workspace/si-asef —
  // halaman kedua dengan sidebar & gaya sendiri.
  const [pesan, setPesan] = useState<Pesan[]>([]);
  // Sesi dari riwayat di sidebar (?sesi=<id>). Halaman dipasang ulang saat parameter berubah.
  const [sesi, setSesi] = useState<string | null>(() => new URLSearchParams(window.location.search).get("sesi"));
  const [memuatSesi, setMemuatSesi] = useState(() => !!new URLSearchParams(window.location.search).get("sesi"));
  useEffect(() => {
    if (!sesi || !memuatSesi) return;
    (async () => {
      try {
        const r = await fetch(`/api/si-asef/sessions/${sesi}`, { credentials: "include" });
        if (!r.ok) throw new Error(String(r.status));
        const baris: any[] = await r.json();
        setPesan(baris.map((m) => ({ peran: m.role === "model" ? "ai" : "user", isi: m.content, sumber: Array.isArray(m.sources) ? m.sources : undefined })));
      } catch {
        setSesi(null);                                     // sesi tak ada / bukan milik pengguna
        window.history.replaceState(null, "", "/workspace/dashboard");
      } finally { setMemuatSesi(false); }
    })();
  }, []);
  const [menunggu, setMenunggu] = useState(false);
  // Sitasi yang sedang dicocokkan di panel PDF kanan (null = panel tertutup).
  const [sumberAktif, setSumberAktif] = useState<Sumber | null>(null);
  useEffect(() => {
    const tutup = (e: KeyboardEvent) => { if (e.key === "Escape") setSumberAktif(null); };
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, []);
  const bawah = useRef<HTMLDivElement>(null);
  useEffect(() => { bawah.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [pesan, menunggu]);
  const [teks, setTeks] = useState("");
  const [fokus, setFokus] = useState(false);
  const [alatBuka, setAlatBuka] = useState(false);
  const [merekam, setMerekam] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const pengenal = useRef<any>(null);

  const mulaiDikte = () => {
    if (!PengenalSuara) return;
    if (merekam) { pengenal.current?.stop(); return; }
    const r = new PengenalSuara();
    r.lang = "id-ID"; r.interimResults = false; r.continuous = false;
    r.onresult = (e: any) => {
      const hasil = Array.from(e.results).map((x: any) => x[0].transcript).join(" ");
      setTeks((t) => (t ? t.trimEnd() + " " : "") + hasil);
    };
    r.onend = () => setMerekam(false);
    r.onerror = () => setMerekam(false);
    pengenal.current = r; setMerekam(true); r.start();
  };
  useEffect(() => () => pengenal.current?.stop(), []);


  // Tinggi kotak ketik mengikuti isi, dibatasi agar tidak menelan layar.
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [teks]);

  const kirim = async (isi: string) => {
    const t = isi.trim();
    if (!t || menunggu) return;
    setTeks("");
    const mulai = Date.now();
    // Pesan AI sementara yang langkah-langkahnya terisi selama agen bekerja.
    setPesan((p) => [...p, { peran: "user", isi: t }, { peran: "ai", isi: "", langkah: [], berpikir: true }]);
    const ubahTerakhir = (f: (m: Pesan) => Pesan) => setPesan((p) => p.map((m, i) => (i === p.length - 1 ? f(m) : m)));
    setMenunggu(true);
    try {
      const res = await fetch("/api/si-asef/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: t, sessionId: sesi, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      let selesai = false;
      await bacaAliran(res, (ev) => {
        if (ev.tipe === "selesai") {
          selesai = true;
          // Alamat sengaja TIDAK diubah ke ?sesi=: wouter memasang ulang halaman saat query berubah,
          // yang akan menghapus panel berpikir jawaban ini. Sesi tetap bisa dibuka lewat riwayat.
          if (ev.sessionId) setSesi(ev.sessionId);
          ubahTerakhir((m) => ({ ...m, isi: ev.message || "(tidak ada jawaban)", sumber: ev.sources, berpikir: false, detikBerpikir: Math.round((Date.now() - mulai) / 1000) }));
          queryClient.invalidateQueries({ queryKey: ["/api/si-asef/sessions"] });
        } else if (ev.tipe === "galat") {
          selesai = true;
          ubahTerakhir((m) => ({ ...m, isi: ev.pesan || "Maaf, terjadi galat.", berpikir: false }));
        } else if (["cari", "temu", "alat", "menyusun"].includes(ev.tipe)) {
          ubahTerakhir((m) => ({ ...m, langkah: [...(m.langkah || []), ev] }));
        }
      });
      if (!selesai) throw new Error("aliran terputus");
    } catch {
      ubahTerakhir((m) => ({ ...m, isi: "Maaf, gagal menghubungi server. Coba kirim ulang.", berpikir: false }));
    } finally {
      setMenunggu(false);
      setTimeout(() => ta.current?.focus(), 0);
    }
  };

  const chatBaru = () => {
    setPesan([]); setSesi(null); setTeks("");
    if (window.location.search) window.history.replaceState(null, "", "/workspace/dashboard");
    setTimeout(() => ta.current?.focus(), 0);
  };
  // "Chat baru" di sidebar menautkan ke halaman ini juga; bila sudah di sini, URL tak berubah
  // sehingga halaman tak dipasang ulang — sidebar mengirim sinyal ini untuk mengosongkan percakapan.
  useEffect(() => {
    const kosongkan = () => chatBaru();
    window.addEventListener("chat-baru", kosongkan);
    return () => window.removeEventListener("chat-baru", kosongkan);
  }, []);

  const namaDepan = (() => { const w = (user?.name || "").trim().split(/\s+/)[0] || ""; return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""; })();
  const adaTeks = teks.trim().length > 0;
  // Diundi sekali per kunjungan; tidak berubah saat mengetik (render ulang).
  const [sapaan] = useState(() => sapaanAcak(namaDepan));


  const kotakKetik = (
    <>
        {/* Kotak ketik — gaya prototipe: kartu putih membulat, baris bawah berisi chip & aksi */}
        <div
          className={cn(
            // Gaya Claude: kartu 20px, bayangan lembut berlapis, tanpa cincin fokus mencolok.
            "relative w-full rounded-[20px] border bg-card px-4 pb-3 pt-4 text-left transition-[border-color,box-shadow] duration-200",
            fokus
              ? "border-black/15 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.12)] dark:border-white/20"
              : "border-black/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-10px_rgba(0,0,0,0.08)] hover:border-black/15 dark:border-white/10"
          )}
        >
          {/* Garis cahaya tipis di tepi atas (hitam) & bawah (merah), seperti kilau pada bingkai. */}
          <span aria-hidden className={cn("pointer-events-none absolute -top-px left-[38%] right-[12%] h-px transition-opacity duration-300",
            fokus ? "opacity-100" : "opacity-70")}
            style={{ background: "linear-gradient(90deg, transparent, rgba(10,10,10,0.85) 50%, transparent)" }} />
          <span aria-hidden className={cn("pointer-events-none absolute -bottom-px left-[12%] right-[42%] h-px transition-opacity duration-300",
            fokus ? "opacity-100" : "opacity-80")}
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)) 50%, transparent)" }} />
          <textarea
            ref={ta}
            rows={1}
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            onFocus={() => setFokus(true)}
            onBlur={() => setFokus(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); kirim(teks); }
            }}
            placeholder={pesan.length ? "Balas Mystic AI" : "Tanyakan apa pun ke Mystic AI"}
            aria-label="Tulis pertanyaan"
            className="block max-h-[240px] min-h-12 w-full resize-none border-0 bg-transparent px-1 py-0 text-[16px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlatBuka((v) => !v)}
                  aria-expanded={alatBuka}
                  aria-label="Alat"
                  title="Alat"
                  className={cn("grid h-8 w-8 place-items-center rounded-lg border border-black/[0.08] text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.96] dark:border-white/10",
                    alatBuka && "bg-muted text-foreground")}
                >
                  <Plus className={cn("h-4 w-4 transition-transform duration-200", alatBuka && "rotate-45")} />
                </button>
                {alatBuka && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAlatBuka(false)} />
                    <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-60 rounded-xl border border-border bg-card p-1 shadow-lg">
                      {ALAT.map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          onClick={() => { setTeks(a.isi); setAlatBuka(false); setTimeout(() => ta.current?.focus(), 0); }}
                          className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {user?.department && (
                <span className="flex h-8 items-center truncate rounded-lg px-2 text-[13px] text-muted-foreground">
                  {user.department}
                </span>
              )}
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => kirim(teks)}
                disabled={!adaTeks || menunggu}
                aria-label="Kirim"
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.96]",
                  adaTeks ? "bg-primary text-primary-foreground hover:bg-primary/90" : "cursor-not-allowed bg-primary/40 text-primary-foreground"
                )}
              >
                <Send className="h-4 w-4 -translate-x-[1px] translate-y-[1px]" />
              </button>
            </div>
          </div>
        </div>
    </>
  );

  // ---------- Tampilan awal: sapaan + kotak ketik di tengah ----------
  if (memuatSesi) {
    return <div className="flex min-h-full w-full items-center justify-center text-muted-foreground"><CakraMark size={24} spin /></div>;
  }
  if (pesan.length === 0) {
    return (
      <div className="flex min-h-full w-full">
        <div className="m-auto flex w-full max-w-[720px] -translate-y-[6vh] flex-col items-center px-6 py-12 text-center">
          <h1 className="flex animate-fade-up items-center justify-center gap-3 text-balance font-serif text-[40px] font-normal leading-[1.15] tracking-[-0.02em] text-foreground">
            <span className="flex-none text-foreground"><CakraMark size={40} tegas /></span>
            <span>{sapaan[0]}{namaDepan && sapaan[2] && <span className="text-primary">{namaDepan}</span>}{sapaan[1]}</span>
          </h1>
          <div className="mt-8 w-full animate-fade-up [animation-delay:80ms]">{kotakKetik}</div>
        </div>
      </div>
    );
  }

  // ---------- Tampilan percakapan: pesan di atas, kotak ketik menempel di bawah ----------
  return (
    <div className="flex h-full min-h-0 w-full">
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 pb-6 pt-4">
          {pesan.map((m, i) => m.peran === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-black/[0.06] px-4 py-2.5 dark:bg-white/10 text-[15px] leading-relaxed text-foreground">{m.isi}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-[3px] flex-none text-foreground"><CakraMark size={22} /></span>
              <div className="min-w-0 flex-1">
              {(m.berpikir || !!m.langkah?.length) && <PanelBerpikir m={m} />}
              <div className="min-w-0 flex-1 text-[15px] leading-7 text-foreground
                [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&>div>:first-child]:mt-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold
                [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
                [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
                {m.isi && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Tabel: kartu bergaris halus, kepala abu, bisa digeser di layar sempit.
                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-xl border border-black/[0.08] bg-card dark:border-white/10">
                          <table className="w-full border-collapse text-[13.5px] leading-snug tabular-nums">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-black/[0.03] dark:bg-white/5">{children}</thead>,
                      th: ({ children, style }) => (
                        <th style={style} className="whitespace-nowrap border-b border-black/[0.08] px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-white/10">{children}</th>
                      ),
                      td: ({ children, style }) => (
                        <td style={style} className="border-b border-black/[0.05] px-3 py-2 align-top text-foreground [tr:last-child_&]:border-b-0 dark:border-white/5">{children}</td>
                      ),
                      tr: ({ children }) => <tr className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">{children}</tr>,
                      a: ({ href, children, ...rest }) => {
                        const n = href?.startsWith("#sitasi-") ? Number(href.slice(8)) : NaN;
                        const sb = m.sumber?.find((x) => x.id === n);
                        if (!sb) return href?.startsWith("#sitasi-") ? <>{children}</> : <a href={href} {...rest}>{children}</a>;
                        return <ChipSitasi sumber={sb} aktif={sumberAktif?.id === sb.id && sumberAktif?.chunkId === sb.chunkId} onBuka={setSumberAktif} />;
                      },
                    }}
                  >
                    {jadikanSitasi(m.isi, m.sumber)}
                  </ReactMarkdown>
                )}
                {!!m.sumber?.length && !m.berpikir && (
                  <DaftarSumber sumber={m.sumber} aktif={sumberAktif} onBuka={setSumberAktif} />
                )}
              </div>
              </div>
            </div>
          ))}
          <div ref={bawah} />
        </div>
      </div>

      <div className="flex-none px-4 pb-4 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-[720px]">
          {kotakKetik}
          <p className="mt-2 text-center text-[12px] text-muted-foreground">Mystic bisa keliru. Periksa kembali data & regulasi penting.</p>
        </div>
      </div>
    </div>
      {sumberAktif && (
        <div className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto lg:h-full lg:w-[46%] lg:max-w-[680px] lg:flex-none animate-in fade-in slide-in-from-right-4 duration-200">
          <PanelSumberPdf sumber={sumberAktif} onTutup={() => setSumberAktif(null)} />
        </div>
      )}
    </div>
  );
}

/** "[1]" / "[1][2]" / "{{ref:1}}" -> tautan #sitasi-n yang dirender sebagai chip. Hanya nomor yang punya sumber. */
function jadikanSitasi(isi: string, sumber?: Sumber[]) {
  const ada = new Set((sumber || []).map((x) => x.id));
  return isi
    .replace(/\{\{ref:(\d+)\}\}/g, "[$1]")
    .replace(/\[(\d{1,2})\](?!\()/g, (t, n) => (ada.has(+n) ? `[${n}](#sitasi-${n})` : t));
}

const labelDok = (sb: Sumber) =>
  sb.kode ? `${sb.kode} R${String(sb.revisi ?? 0).padStart(2, "0")}` : (sb.documentName || "Dokumen").split(" — ")[0];

/** Chip angka di dalam kalimat (gaya NotebookLM): hover = pratinjau kutipan, klik = PDF di kanan. */
function ChipSitasi({ sumber, aktif, onBuka }: { sumber: Sumber; aktif: boolean; onBuka: (s: Sumber) => void }) {
  return (
    <span className="group/sitasi relative mx-[2px] inline-block align-[1px]">
      <button
        type="button"
        onClick={() => onBuka(sumber)}
        aria-label={`Sumber ${sumber.id}: ${labelDok(sumber)}`}
        className={cn(
          "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-semibold leading-none tabular-nums transition-colors duration-150",
          aktif ? "bg-primary text-primary-foreground" : "bg-black/[0.07] text-foreground/70 hover:bg-primary hover:text-primary-foreground dark:bg-white/10",
        )}
      >
        {sumber.id}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-[320px] -translate-x-1/2 translate-y-1 rounded-xl border border-black/[0.08] bg-card p-3 text-left opacity-0 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.2)] transition-[opacity,transform] duration-150 group-hover/sitasi:visible group-hover/sitasi:translate-y-0 group-hover/sitasi:opacity-100 group-hover/sitasi:delay-200 dark:border-white/10"
      >
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <FileText className="h-3.5 w-3.5 flex-none text-primary" />
          <span className="truncate">{labelDok(sumber)}</span>
          {sumber.pageNumber && <span className="ml-auto flex-none font-normal text-muted-foreground">hal. {sumber.pageNumber}</span>}
        </span>
        {sumber.judul && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{sumber.judul}{sumber.bagian ? ` · ${sumber.bagian}` : ""}</span>}
        {sumber.content && (
          <span className="mt-2 line-clamp-4 block border-l-2 border-amber-400 bg-amber-50/70 py-1 pl-2 text-[12.5px] font-normal leading-snug text-foreground/85 dark:bg-amber-400/10">
            {sumber.content}
          </span>
        )}
        <span className="mt-2 block text-[11px] text-muted-foreground">Klik untuk mencocokkan di PDF</span>
      </span>
    </span>
  );
}

/** Baris sumber di bawah jawaban: ringkas "N sumber", dibuka jadi daftar kartu. */
function DaftarSumber({ sumber, aktif, onBuka }: { sumber: Sumber[]; aktif: Sumber | null; onBuka: (s: Sumber) => void }) {
  const [buka, setBuka] = useState(false);
  const dokumen = Array.from(new Set(sumber.map(labelDok)));
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setBuka((v) => !v)}
        className="inline-flex h-8 items-center gap-2 rounded-full border border-black/[0.08] bg-card pl-1.5 pr-2.5 text-[13px] text-muted-foreground transition-colors hover:border-black/15 hover:text-foreground dark:border-white/10">
        <span className="flex items-center">
          {sumber.slice(0, 3).map((sb, i) => (
            <span key={sb.id} style={{ zIndex: 3 - i }}
              className={cn("relative flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#ececec] text-[10.5px] font-semibold leading-none text-foreground/75 ring-2 ring-card dark:bg-gray-700", i > 0 && "-ml-1.5")}>
              {sb.id}
            </span>
          ))}
        </span>
        <FileText className="h-3.5 w-3.5 flex-none" />
        <span>{sumber.length} sumber</span>
        <span className="text-black/20 dark:text-white/20">·</span>
        <span>{dokumen.length} dokumen</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", buka && "rotate-180")} />
      </button>
      {buka && (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {sumber.map((sb) => (
            <button key={sb.id} type="button" onClick={() => onBuka(sb)}
              className={cn("flex min-w-0 items-start gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-colors",
                aktif?.id === sb.id && aktif?.chunkId === sb.chunkId ? "border-primary/50" : "border-black/[0.08] hover:border-black/20 dark:border-white/10")}>
              <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-[#ececec] px-1 text-[10.5px] font-semibold leading-none text-foreground/75 dark:bg-gray-700">{sb.id}</span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-foreground">{labelDok(sb)}{sb.pageNumber ? <span className="font-normal text-muted-foreground"> · hal. {sb.pageNumber}</span> : null}</span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted-foreground">{sb.content || sb.judul}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Kalimat status yang sedang dikerjakan agen, untuk baris "berpikir" yang hidup. */
function kalimatLangkah(l?: Langkah): string {
  if (!l) return "Memahami pertanyaan";
  if (l.tipe === "cari") return `Mencari \u201C${l.kueri}\u201D di PPO`;
  if (l.tipe === "temu") return l.jumlah ? `Membaca ${l.dokumen?.[0]?.split(" — ")[0] ?? `${l.jumlah} bagian`}` : "Tidak ada yang cocok, mencoba kata lain";
  if (l.tipe === "alat") return l.nama;
  return "Menyusun jawaban";
}

/**
 * Tampilan "berpikir": satu baris berkilau yang kalimatnya berganti mengikuti langkah agen.
 * Selesai -> ringkas ("Menelusuri 2 dokumen · 8 dtk"), bisa dibuka jadi garis waktu.
 */
function PanelBerpikir({ m }: { m: Pesan }) {
  const [buka, setBuka] = useState(false);
  const langkah = m.langkah || [];
  const dokumen = Array.from(new Set(langkah.flatMap((l) => (l.tipe === "temu" ? l.dokumen || [] : []))));

  if (m.berpikir) {
    const kini = kalimatLangkah(langkah[langkah.length - 1]);
    return (
      <div className="mb-2 flex h-6 items-center">
        <span key={kini} className="kilau-teks animate-in fade-in slide-in-from-bottom-1 text-[14px] duration-300">{kini}…</span>
        <style>{`.kilau-teks{background:linear-gradient(90deg,hsl(var(--muted-foreground)) 0%,hsl(var(--muted-foreground)) 40%,hsl(var(--foreground)) 50%,hsl(var(--muted-foreground)) 60%,hsl(var(--muted-foreground)) 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:kilau 2s linear infinite}@keyframes kilau{from{background-position:125% 0}to{background-position:-125% 0}}@media (prefers-reduced-motion:reduce){.kilau-teks{animation:none;color:hsl(var(--muted-foreground))}}`}</style>
      </div>
    );
  }

  const ringkas = [dokumen.length ? `Menelusuri ${dokumen.length} dokumen` : langkah.length ? `${langkah.length} langkah` : "Berpikir", `${m.detikBerpikir ?? 0} dtk`].join(" · ");
  const ikon = (l: Langkah) => (l.tipe === "cari" ? Search : l.tipe === "temu" ? BookOpen : l.tipe === "alat" ? Wrench : PenLine);

  return (
    <div className="mb-2">
      <button type="button" onClick={() => setBuka((v) => !v)}
        className="group flex h-6 items-center gap-1 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground">
        {ringkas}
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", buka && "rotate-90")} />
      </button>
      {buka && (
        <ol className="relative mb-3 mt-2 space-y-3 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <span aria-hidden className="absolute bottom-2 left-[10px] top-2 w-px bg-black/[0.08] dark:bg-white/10" />
          {langkah.map((l, i) => {
            const Ikon = ikon(l);
            return (
              <li key={i} className="relative flex gap-3">
                <span className="relative grid h-5 w-5 flex-none place-items-center rounded-full bg-background text-muted-foreground">
                  <Ikon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 pt-px text-[13px] leading-5 text-muted-foreground">
                  {l.tipe === "temu" ? (
                    <>
                      <p>{l.jumlah ? `Membaca ${l.jumlah} bagian relevan` : "Tidak menemukan bagian yang cocok"}</p>
                      {!!l.dokumen?.length && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {l.dokumen.slice(0, 4).map((d) => (
                            <span key={d} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-black/[0.08] bg-card px-2 py-0.5 text-[12px] text-foreground/80 dark:border-white/10">
                              <FileText className="h-3 w-3 flex-none text-primary" />
                              <span className="truncate">{d}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p>{kalimatLangkah(l)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
