import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Plus, ChevronDown, Mic, Square, Search, FileText, Check, Wrench, PenLine } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { CakraMark } from "@/components/brand/CakraMark";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Sumber = { id: number; documentName?: string; pageNumber?: number };
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
              {PengenalSuara && (
                <button
                  type="button"
                  onClick={mulaiDikte}
                  aria-label={merekam ? "Hentikan dikte" : "Dikte dengan suara"}
                  title={merekam ? "Hentikan dikte" : "Dikte dengan suara"}
                  className={cn("grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-muted",
                    merekam ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {merekam ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-[18px] w-[18px]" />}
                </button>
              )}
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
                <ArrowUp className="h-4 w-4" />
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
            <span className="flex-none text-primary"><CakraMark size={38} /></span>
            <span>{salam()}{namaDepan && `, ${namaDepan}`}</span>
          </h1>
          <p className="mt-3 max-w-[65ch] animate-fade-up text-[15px] text-muted-foreground [animation-delay:60ms]">
            Tanya apa saja soal regulasi, temuan, atau data karyawan.
          </p>
          <div className="mt-8 w-full animate-fade-up [animation-delay:120ms]">{kotakKetik}</div>
        </div>
      </div>
    );
  }

  // ---------- Tampilan percakapan: pesan di atas, kotak ketik menempel di bawah ----------
  return (
    <div className="flex h-full min-h-0 w-full flex-col">

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 pb-6 pt-4">
          {pesan.map((m, i) => m.peran === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-black/[0.06] px-4 py-2.5 dark:bg-white/10 text-[15px] leading-relaxed text-foreground">{m.isi}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-1 flex-none text-foreground"><CakraMark size={22} spin={m.berpikir} /></span>
              <div className="min-w-0 flex-1">
              {(m.berpikir || !!m.langkah?.length) && <PanelBerpikir m={m} />}
              <div className="min-w-0 flex-1 text-[15px] leading-7 text-foreground
                [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_table]:border-collapse [&_th]:text-left [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&>div>:first-child]:mt-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold
                [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
                [&_p]:my-2 [&_table]:my-3 [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
                [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
                {m.isi && <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.isi.replace(/\{\{ref:(\d+)\}\}/g, "[$1]")}</ReactMarkdown>}
                {!!m.sumber?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.sumber.map((sb) => (
                      <span key={sb.id} className="rounded-full border border-border px-2.5 py-0.5 text-[12px] text-muted-foreground">
                        [{sb.id}] {sb.documentName}{sb.pageNumber ? ` · hal. ${sb.pageNumber}` : ""}
                      </span>
                    ))}
                  </div>
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
  );
}

/**
 * Panel "berpikir": langkah agen tampil langsung selagi bekerja, lalu dilipat menjadi satu baris
 * ("Berpikir 6 dtk · 2 pencarian") yang bisa dibuka kembali.
 */
function PanelBerpikir({ m }: { m: Pesan }) {
  const [buka, setBuka] = useState(false);
  const langkah = m.langkah || [];
  const pencarian = langkah.filter((l) => l.tipe === "cari").length;
  const terbuka = m.berpikir || buka;

  const baris = (l: Langkah, i: number, aktif: boolean) => {
    const ikon = l.tipe === "cari" ? Search : l.tipe === "temu" ? FileText : l.tipe === "alat" ? Wrench : PenLine;
    const Ikon = aktif ? null : ikon;
    return (
      <li key={i} className="flex gap-2.5">
        <span className="mt-[3px] grid h-4 w-4 flex-none place-items-center">
          {aktif ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> : Ikon && <Ikon className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          {l.tipe === "cari" && <span>Mencari di PPO: <span className="text-foreground">“{l.kueri}”</span></span>}
          {l.tipe === "temu" && (
            <div>
              <span>{l.jumlah ? `Menemukan ${l.jumlah} bagian relevan` : "Tidak menemukan bagian yang cocok"}</span>
              {!!l.dokumen?.length && (
                <ul className="mt-1 space-y-0.5">
                  {l.dokumen.slice(0, 4).map((d) => <li key={d} className="truncate text-[12px] text-muted-foreground/80">{d}</li>)}
                </ul>
              )}
            </div>
          )}
          {l.tipe === "alat" && <span>{l.nama}</span>}
          {l.tipe === "menyusun" && <span>Menyusun jawaban</span>}
        </div>
      </li>
    );
  };

  return (
    <div className="mb-2">
      <button type="button" onClick={() => !m.berpikir && setBuka((v) => !v)}
        className={cn("flex items-center gap-1.5 text-[13px] text-muted-foreground", !m.berpikir && "hover:text-foreground")}>
        {m.berpikir
          ? <span className="bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent [animation:kilau-berpikir_1.6s_linear_infinite]">Berpikir…</span>
          : <span>Berpikir {m.detikBerpikir ?? 0} dtk{pencarian ? ` · ${pencarian} pencarian` : ""}</span>}
        {!m.berpikir && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", buka && "rotate-180")} />}
      </button>
      {terbuka && (
        <ul className="mt-2 space-y-2 border-l border-border pl-3 text-[13px] leading-5 text-muted-foreground">
          {langkah.length === 0 && m.berpikir && (
            <li className="flex gap-2.5"><span className="mt-[3px] grid h-4 w-4 place-items-center"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /></span>Memahami pertanyaan</li>
          )}
          {langkah.map((l, i) => baris(l, i, !!m.berpikir && i === langkah.length - 1))}
          {!m.berpikir && langkah.length > 0 && (
            <li className="flex gap-2.5"><span className="mt-[3px] grid h-4 w-4 place-items-center"><Check className="h-3.5 w-3.5" /></span>Selesai</li>
          )}
        </ul>
      )}
      <style>{`@keyframes kilau-berpikir{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
