import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Upload, FileText, X, AlertTriangle, CheckCircle2, Loader2, Trash2, RotateCcw, ExternalLink, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { konfirmasi } from "@/components/ui/konfirmasi";
import { cn } from "@/lib/utils";

/**
 * Peraturan Pemerintah — koleksi peraturan perundang-undangan yang diunggah manual.
 * Setiap peraturan yang TERBIT dipotong per pasal dan bisa dicari oleh Mystic AI (alat cari_regulasi).
 */

const JENIS = ["UU", "Perppu", "PP", "Perpres", "Keppres", "Permen ESDM", "Kepmen ESDM", "Kepdirjen Minerba", "Permenaker", "Kepmenaker", "Permen LHK", "Kepmen LHK", "Permenkes", "SNI", "Lainnya"];
const BIDANG: Record<string, string> = { minerba: "Minerba", k3: "K3", lingkungan: "Lingkungan Hidup", ketenagakerjaan: "Ketenagakerjaan", lainnya: "Lainnya" };
const STATUS: Record<string, { label: string; kelas: string }> = {
  berlaku: { label: "Berlaku", kelas: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300" },
  diubah: { label: "Diubah", kelas: "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300" },
  dicabut: { label: "Dicabut", kelas: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300" },
};
const MUAT: Record<string, { label: string; kelas: string }> = {
  terbit: { label: "Dapat dicari AI", kelas: "text-emerald-700 dark:text-emerald-300" },
  draf: { label: "Belum terbit", kelas: "text-muted-foreground" },
  gagal: { label: "Gagal diproses", kelas: "text-red-600" },
};

interface Regulasi {
  id: string; jenis: string; nomor: string; tahun: number; judul: string; instansi: string | null; bidang: string; status: string;
  diubah_oleh: string | null; dicabut_oleh: string | null; tanggal_penetapan: string | null; berkas_nama: string | null;
  ukuran_berkas: number | null; mutu: any; status_muat: string; jumlah_potongan: number; galat_muat: string | null;
  diunggah_oleh: string | null; diperiksa_pada: string | null;
}

const label = (r: { jenis: string; nomor: string; tahun: number }) => `${r.jenis} ${r.nomor}/${r.tahun}`;
const kolom = "h-9 w-full rounded-lg border border-black/10 bg-card px-3 text-[14px] outline-none transition-colors focus:border-black/30 dark:border-white/15";

export default function PeraturanPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ items: Regulasi[]; bolehKelola: boolean }>({
    queryKey: ["/api/regulasi"],
    queryFn: () => apiRequest("/api/regulasi", "GET"),
  });
  const [cari, setCari] = useState("");
  const [bidang, setBidang] = useState("");
  const [status, setStatus] = useState("");
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [unggahBuka, setUnggahBuka] = useState(false);

  const items = data?.items ?? [];
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return items.filter((r) =>
      (!bidang || r.bidang === bidang) && (!status || r.status === status) &&
      (!q || `${label(r)} ${r.judul} ${r.instansi ?? ""}`.toLowerCase().includes(q)));
  }, [items, cari, bidang, status]);

  const ringkas = useMemo(() => ({
    total: items.length,
    terbit: items.filter((r) => r.status_muat === "terbit").length,
    pasal: items.reduce((a, r) => a + (r.jumlah_potongan || 0), 0),
  }), [items]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Peraturan Pemerintah</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {ringkas.total} peraturan · {ringkas.terbit} dapat dicari Mystic AI · {ringkas.pasal.toLocaleString("id-ID")} potongan pasal
          </p>
        </div>
        {data?.bolehKelola && (
          <button type="button" onClick={() => setUnggahBuka(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-foreground px-3.5 text-[13.5px] font-medium text-background transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]">
            <Upload className="h-4 w-4" /> Unggah peraturan
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nomor, judul, instansi…" className={cn(kolom, "pl-9")} />
        </div>
        <select value={bidang} onChange={(e) => setBidang(e.target.value)} className={cn(kolom, "w-auto")}>
          <option value="">Semua bidang</option>
          {Object.entries(BIDANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(kolom, "w-auto")}>
          <option value="">Semua status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-black/[0.08] bg-card dark:border-white/10">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…</div>
        ) : tersaring.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <FileText className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="text-[14px] text-foreground">{items.length ? "Tidak ada yang cocok dengan filter" : "Belum ada peraturan"}</p>
            {!items.length && <p className="text-[13px] text-muted-foreground">Unggah PDF peraturan agar Mystic AI dapat menjawab dasar hukumnya.</p>}
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/5">
            {tersaring.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setDipilih(r.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-black/[0.04] text-muted-foreground dark:bg-white/5">
                    <FileText className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-foreground">{label(r)}</span>
                      <span className={cn("rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset", STATUS[r.status]?.kelas)}>{STATUS[r.status]?.label}</span>
                      <span className="text-[12px] text-muted-foreground">{BIDANG[r.bidang]}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{r.judul}</span>
                  </span>
                  <span className={cn("hidden flex-none text-[12px] sm:block", MUAT[r.status_muat]?.kelas)}>
                    {r.status_muat === "terbit" ? `${r.jumlah_potongan} pasal` : MUAT[r.status_muat]?.label}
                  </span>
                  <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/60" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dipilih && <DetailPeraturan id={dipilih} bolehKelola={!!data?.bolehKelola} onTutup={() => setDipilih(null)} onBerubah={() => qc.invalidateQueries({ queryKey: ["/api/regulasi"] })} />}
      {unggahBuka && <DialogUnggah onTutup={() => setUnggahBuka(false)} onSelesai={(id) => { setUnggahBuka(false); qc.invalidateQueries({ queryKey: ["/api/regulasi"] }); setDipilih(id); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ detail

function DetailPeraturan({ id, bolehKelola, onTutup, onBerubah }: { id: string; bolehKelola: boolean; onTutup: () => void; onBerubah: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: r, isLoading } = useQuery<Regulasi & { potongan: { id: string; jenis: string; bagian: string; halaman_awal: number; cuplikan: string }[] }>({
    queryKey: ["/api/regulasi", id],
    queryFn: () => apiRequest(`/api/regulasi/${id}`, "GET"),
  });
  const [halaman, setHalaman] = useState(1);
  const [sibuk, setSibuk] = useState(false);

  const segarkan = () => { qc.invalidateQueries({ queryKey: ["/api/regulasi", id] }); onBerubah(); };
  const aksi = async (fn: () => Promise<any>, sukses: string) => {
    setSibuk(true);
    try { await fn(); toast({ title: sukses }); segarkan(); }
    catch (e: any) { toast({ title: "Gagal", description: e?.message || String(e), variant: "destructive" }); }
    finally { setSibuk(false); }
  };
  const ubahStatus = async (status: string) => {
    let dicabutOleh: string | null = null, diubahOleh: string | null = null;
    if (status === "dicabut") { dicabutOleh = window.prompt("Dicabut oleh peraturan apa? (mis. PP 22/2021)") || ""; if (!dicabutOleh.trim()) return; }
    if (status === "diubah") { diubahOleh = window.prompt("Diubah oleh peraturan apa? (mis. UU 6/2023)") || ""; if (!diubahOleh.trim()) return; }
    await aksi(() => apiRequest(`/api/regulasi/${id}`, "PATCH", { status, dicabutOleh, diubahOleh }), "Status diperbarui");
  };

  const pasal = (r?.potongan || []).filter((p) => p.jenis === "pasal");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 animate-in fade-in duration-150" onClick={onTutup}>
      <aside onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[1080px] flex-col bg-background shadow-2xl animate-in slide-in-from-right-4 duration-200">
        <header className="flex flex-none items-start gap-3 border-b border-black/[0.07] px-5 py-4 dark:border-white/10">
          <div className="min-w-0 flex-1">
            {r ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-semibold text-foreground">{label(r)}</h2>
                  <span className={cn("rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset", STATUS[r.status]?.kelas)}>{STATUS[r.status]?.label}</span>
                  <span className={cn("text-[12px]", MUAT[r.status_muat]?.kelas)}>{MUAT[r.status_muat]?.label}</span>
                </div>
                <p className="mt-0.5 text-[13.5px] text-muted-foreground">{r.judul}</p>
                {(r.dicabut_oleh || r.diubah_oleh) && (
                  <p className="mt-1 text-[12.5px] text-foreground/80">{r.dicabut_oleh ? `Dicabut oleh ${r.dicabut_oleh}` : `Diubah oleh ${r.diubah_oleh}`}</p>
                )}
              </>
            ) : <p className="text-[14px] text-muted-foreground">Memuat…</p>}
          </div>
          <a href={`/api/regulasi/${id}/pdf`} target="_blank" rel="noreferrer" title="Buka PDF di tab baru"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
          <button type="button" onClick={onTutup} aria-label="Tutup" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-[50vh] flex-1 bg-[#f4f4f2] lg:min-h-0 dark:bg-gray-900">
            <iframe key={halaman} title="PDF peraturan" src={`/api/regulasi/${id}/pdf#page=${halaman}`} className="h-full w-full" />
          </div>

          <div className="flex min-h-0 w-full flex-none flex-col border-t border-black/[0.07] lg:w-[380px] lg:border-l lg:border-t-0 dark:border-white/10">
            {!!r?.mutu?.catatan?.length && (
              <div className="flex-none border-b border-amber-200/70 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {r.mutu.catatan.map((c: string) => <p key={c} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />{c}</p>)}
              </div>
            )}
            {r?.status_muat === "gagal" && r.galat_muat && (
              <div className="flex-none border-b border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-800">{r.galat_muat}</div>
            )}

            {bolehKelola && r && (
              <div className="flex flex-none flex-wrap gap-1.5 border-b border-black/[0.07] px-4 py-3 dark:border-white/10">
                <select value={r.status} disabled={sibuk} onChange={(e) => ubahStatus(e.target.value)} className={cn(kolom, "h-8 w-auto text-[13px]")}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>Status: {v.label}</option>)}
                </select>
                {r.status_muat === "terbit" ? (
                  <button type="button" disabled={sibuk} onClick={async () => { if (await konfirmasi({ judul: "Tarik dari pencarian AI?", pesan: "Potongan pasal dihapus dari pencarian Mystic AI. Metadata & PDF tetap tersimpan dan bisa diterbitkan lagi.", tombol: "Tarik", bahaya: false })) aksi(() => apiRequest(`/api/regulasi/${id}/tarik`, "POST"), "Ditarik dari pencarian"); }}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 text-[13px] hover:bg-muted dark:border-white/15">Tarik</button>
                ) : (
                  <button type="button" disabled={sibuk} onClick={() => aksi(() => apiRequest(`/api/regulasi/${id}/terbit`, "POST"), "Diterbitkan")}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-[13px] text-background hover:opacity-90"><RotateCcw className="h-3.5 w-3.5" />Terbitkan</button>
                )}
                <button type="button" disabled={sibuk} onClick={async () => { if (await konfirmasi(`Hapus peraturan ${label(r)}? PDF dan seluruh potongan pasalnya ikut dihapus.`)) { await aksi(() => apiRequest(`/api/regulasi/${id}`, "DELETE"), "Peraturan dihapus"); onTutup(); } }}
                  className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                {sibuk && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="sticky top-0 bg-background/95 px-4 py-2 text-[12px] font-medium text-muted-foreground backdrop-blur">
                {isLoading ? "Memuat pasal…" : `${pasal.length} potongan pasal · klik untuk membuka halamannya`}
              </p>
              <ul className="px-2 pb-4">
                {pasal.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setHalaman(p.halaman_awal)}
                      className={cn("w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5", halaman === p.halaman_awal && "bg-black/[0.04] dark:bg-white/5")}>
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{p.bagian.split(" › ").slice(-1)[0]}</span>
                        <span className="flex-none text-[11px] text-muted-foreground">hal. {p.halaman_awal}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted-foreground">{p.cuplikan.replace(/\s+/g, " ").replace(/^Pasal \S+\s*/, "")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ unggah

function DialogUnggah({ onTutup, onSelesai }: { onTutup: () => void; onSelesai: (id: string) => void }) {
  const { toast } = useToast();
  const [berkas, setBerkas] = useState<File | null>(null);
  const [meta, setMeta] = useState({ jenis: "PP", nomor: "", tahun: "", judul: "", instansi: "", bidang: "minerba", status: "berlaku", diubahOleh: "", dicabutOleh: "", tanggalPenetapan: "" });
  const [pratinjau, setPratinjau] = useState<any>(null);
  const [sibuk, setSibuk] = useState<"" | "pratinjau" | "terbit">("");
  const set = (k: string, v: string) => { setMeta((m) => ({ ...m, [k]: v })); setPratinjau(null); };

  const kirim = async (url: string) => {
    const fd = new FormData();
    fd.append("berkas", berkas!);
    fd.append("meta", JSON.stringify({ ...meta, tahun: Number(meta.tahun) }));
    const r = await fetch(url, { method: "POST", body: fd, credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok && !(url === "/api/regulasi" && r.status === 422)) throw new Error(j.message || `Galat ${r.status}`);
    return { ok: r.ok, ...j };
  };
  const lihat = async () => {
    if (!berkas) return toast({ title: "Pilih berkas PDF dulu", variant: "destructive" });
    setSibuk("pratinjau");
    try { setPratinjau(await kirim("/api/regulasi/pratinjau")); }
    catch (e: any) { toast({ title: "Tidak bisa dipratinjau", description: e.message, variant: "destructive" }); }
    finally { setSibuk(""); }
  };
  const terbit = async () => {
    setSibuk("terbit");
    try {
      const h = await kirim("/api/regulasi");
      if (h.ok) toast({ title: "Peraturan diterbitkan", description: `${h.potongan} potongan pasal kini dapat dicari Mystic AI.` });
      else toast({ title: "Tersimpan, tetapi gagal diterbitkan", description: h.message, variant: "destructive" });
      onSelesai(h.id);
    } catch (e: any) { toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" }); }
    finally { setSibuk(""); }
  };

  const lbl = "mb-1 block text-[12.5px] font-medium text-foreground/80";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 animate-in fade-in duration-150" onClick={onTutup}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="flex flex-none items-center justify-between border-b border-black/[0.07] px-5 py-3.5 dark:border-white/10">
          <h2 className="text-[16px] font-semibold">Unggah peraturan</h2>
          <button type="button" onClick={onTutup} aria-label="Tutup" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-black/5"><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors",
            berkas ? "border-black/15 bg-black/[0.02]" : "border-black/15 hover:bg-black/[0.02] dark:border-white/15")}>
            <FileText className="h-6 w-6 flex-none text-muted-foreground" strokeWidth={1.5} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{berkas ? berkas.name : "Pilih PDF peraturan"}</span>
              <span className="block text-[12px] text-muted-foreground">{berkas ? `${(berkas.size / 1048576).toFixed(1)} MB` : "Maksimal 25 MB · PDF dengan lapisan teks (bukan hasil pindai)"}</span>
            </span>
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { setBerkas(e.target.files?.[0] || null); setPratinjau(null); }} />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1"><span className={lbl}>Jenis</span>
              <select value={meta.jenis} onChange={(e) => set("jenis", e.target.value)} className={kolom}>{JENIS.map((j) => <option key={j}>{j}</option>)}</select></div>
            <div><span className={lbl}>Nomor</span><input value={meta.nomor} onChange={(e) => set("nomor", e.target.value)} placeholder="96 / 1827 K/30/MEM" className={kolom} /></div>
            <div><span className={lbl}>Tahun</span><input value={meta.tahun} onChange={(e) => set("tahun", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2021" inputMode="numeric" className={kolom} /></div>
            <div className="col-span-2 sm:col-span-1"><span className={lbl}>Bidang</span>
              <select value={meta.bidang} onChange={(e) => set("bidang", e.target.value)} className={kolom}>{Object.entries(BIDANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="col-span-2 sm:col-span-4"><span className={lbl}>Judul (tentang)</span><input value={meta.judul} onChange={(e) => set("judul", e.target.value)} placeholder="Pelaksanaan Kegiatan Usaha Pertambangan Mineral dan Batubara" className={kolom} /></div>
            <div className="col-span-2"><span className={lbl}>Instansi <span className="font-normal text-muted-foreground">(opsional)</span></span><input value={meta.instansi} onChange={(e) => set("instansi", e.target.value)} placeholder="Kementerian ESDM" className={kolom} /></div>
            <div><span className={lbl}>Tgl penetapan</span><input type="date" value={meta.tanggalPenetapan} onChange={(e) => set("tanggalPenetapan", e.target.value)} className={kolom} /></div>
            <div><span className={lbl}>Status</span>
              <select value={meta.status} onChange={(e) => set("status", e.target.value)} className={kolom}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            {meta.status === "diubah" && <div className="col-span-2 sm:col-span-4"><span className={lbl}>Diubah oleh</span><input value={meta.diubahOleh} onChange={(e) => set("diubahOleh", e.target.value)} placeholder="UU 6/2023" className={kolom} /></div>}
            {meta.status === "dicabut" && <div className="col-span-2 sm:col-span-4"><span className={lbl}>Dicabut oleh</span><input value={meta.dicabutOleh} onChange={(e) => set("dicabutOleh", e.target.value)} placeholder="PP 22/2021" className={kolom} /></div>}
          </div>

          {pratinjau && (
            <div className="mt-5 space-y-3">
              {pratinjau.sudahAda && (
                <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />Peraturan dengan jenis, nomor, dan tahun ini sudah ada. Menerbitkan akan MENGGANTI PDF & potongan lamanya.</p>
              )}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[["Halaman", pratinjau.halaman], ["Pasal", pratinjau.ringkasan.pasal], ["Penjelasan", pratinjau.ringkasan.penjelasan], ["Lampiran", pratinjau.ringkasan.lampiran]].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg bg-black/[0.03] py-2 dark:bg-white/5"><p className="text-[17px] font-semibold tabular-nums">{v}</p><p className="text-[11.5px] text-muted-foreground">{k}</p></div>
                ))}
              </div>
              {pratinjau.mutu.catatan.length > 0 ? (
                <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  {pratinjau.mutu.catatan.map((c: string) => <p key={c} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />{c}</p>)}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-700"><CheckCircle2 className="h-4 w-4" />Teks terbaca baik, tidak ada nomor pasal yang terlewat.</p>
              )}
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium text-foreground/80">Contoh potongan — periksa pasal tidak terpotong di tengah</p>
                <ul className="space-y-1.5">
                  {pratinjau.contoh.map((c: any, i: number) => (
                    <li key={i} className="rounded-lg border border-black/[0.07] px-3 py-2 dark:border-white/10">
                      <p className="flex justify-between gap-2 text-[12px] font-medium"><span className="truncate">{c.bagian}</span><span className="flex-none font-normal text-muted-foreground">hal. {c.halamanAwal}</span></p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-[12px] leading-snug text-muted-foreground">{c.teks}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-none items-center justify-end gap-2 border-t border-black/[0.07] px-5 py-3 dark:border-white/10">
          <button type="button" onClick={onTutup} className="h-9 rounded-full border border-black/10 px-4 text-[14px] hover:bg-muted dark:border-white/15">Batal</button>
          {!pratinjau ? (
            <button type="button" onClick={lihat} disabled={!!sibuk || !berkas}
              className="flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40">
              {sibuk === "pratinjau" && <Loader2 className="h-4 w-4 animate-spin" />}Pratinjau
            </button>
          ) : (
            <button type="button" onClick={terbit} disabled={!!sibuk || !pratinjau.bisaDiterbitkan}
              className="flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90 disabled:opacity-40">
              {sibuk === "terbit" && <Loader2 className="h-4 w-4 animate-spin" />}{sibuk === "terbit" ? "Memproses pasal…" : "Terbitkan"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
