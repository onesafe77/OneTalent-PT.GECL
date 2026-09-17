import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, IdCard, Car, CalendarDays, Upload, Eye, Download, Trash2, Loader2, X, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { konfirmasi } from "@/components/ui/konfirmasi";
import { cn } from "@/lib/utils";

/**
 * Dokumen pribadi karyawan: KTP, SIM, form cuti. Unggah (HSE/HRGA/PJO), lihat di tempat, unduh.
 * Berkas diambil lewat endpoint bergerbang, bukan tautan berkas umum.
 */

interface Dokumen {
  id: string; jenis: string; keterangan: string | null; nama_berkas: string; mime_type: string;
  ukuran: number; diunggah_oleh: string | null; dibuat: string;
}

const JENIS = [
  { key: "ktp", label: "KTP", Ikon: IdCard, petunjuk: "Scan/foto KTP", jamak: false, contohKet: "" },
  { key: "sim", label: "SIM", Ikon: Car, petunjuk: "SIM A, B1, B2 Umum, dst.", jamak: true, contohKet: "mis. SIM B2 Umum" },
  { key: "cuti", label: "Form Cuti", Ikon: CalendarDays, petunjuk: "Formulir cuti yang sudah ditandatangani", jamak: true, contohKet: "mis. Cuti 1–14 Okt 2026" },
] as const;

const ukuranTeks = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const tanggalTeks = (s: string) => { try { return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

export function DokumenKaryawan({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const kunci = ["/api/employees", employeeId, "dokumen"];
  const { data, isLoading, error } = useQuery<{ items: Dokumen[]; bolehKelola: boolean }>({
    queryKey: kunci,
    queryFn: () => apiRequest(`/api/employees/${employeeId}/dokumen`, "GET"),
    retry: false,
  });
  const [unggah, setUnggah] = useState<string | null>(null);   // jenis yang sedang diunggah
  const [lihat, setLihat] = useState<Dokumen | null>(null);
  const [ket, setKet] = useState<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);
  const jenisAktif = useRef<string>("");

  const urlBerkas = (d: Dokumen, unduh = false) => `/api/employees/${employeeId}/dokumen/${d.id}/berkas${unduh ? "?unduh=1" : ""}`;

  const pilih = (jenis: string) => { jenisAktif.current = jenis; input.current?.click(); };
  const kirim = async (f: File | undefined) => {
    const jenis = jenisAktif.current;
    if (!f || !jenis) return;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)) return toast({ title: "Berkas harus PDF, JPG, PNG, atau WEBP", variant: "destructive" });
    if (f.size > 10 * 1024 * 1024) return toast({ title: "Ukuran berkas melebihi 10 MB", variant: "destructive" });
    const fd = new FormData();
    fd.append("jenis", jenis);
    fd.append("keterangan", ket[jenis] || "");
    fd.append("berkas", f);
    setUnggah(jenis);
    try {
      const r = await fetch(`/api/employees/${employeeId}/dokumen`, { method: "POST", body: fd, credentials: "include" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || `Galat ${r.status}`);
      toast({ title: `${JENIS.find((x) => x.key === jenis)?.label} diunggah` });
      setKet((k) => ({ ...k, [jenis]: "" }));
      qc.invalidateQueries({ queryKey: kunci });
    } catch (e: any) {
      toast({ title: "Gagal mengunggah", description: e.message, variant: "destructive" });
    } finally { setUnggah(null); }
  };
  const hapus = async (d: Dokumen) => {
    if (!(await konfirmasi(`Hapus ${JENIS.find((x) => x.key === d.jenis)?.label} "${d.nama_berkas}"?`))) return;
    try {
      await apiRequest(`/api/employees/${employeeId}/dokumen/${d.id}`, "DELETE");
      qc.invalidateQueries({ queryKey: kunci });
    } catch (e: any) { toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" }); }
  };

  const judul = (
    <div className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      <FileText className="h-3.5 w-3.5" /> Dokumen
    </div>
  );

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-6">
        {judul}
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground"><Lock className="h-4 w-4" />Dokumen pribadi hanya dapat dilihat HSE, HRGA, PJO, atau karyawan yang bersangkutan.</p>
      </div>
    );
  }

  const items = data?.items ?? [];
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        {judul}
        {data && !data.bolehKelola && <span className="text-[12px] text-muted-foreground">Hanya lihat</span>}
      </div>
      <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { kirim(e.target.files?.[0]); e.target.value = ""; }} />

      {isLoading ? (
        <div className="flex h-24 items-center justify-center text-[13px] text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memuat dokumen…</div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {JENIS.map(({ key, label, Ikon, petunjuk, jamak, contohKet }) => {
            const daftar = items.filter((d) => d.jenis === key);
            const bisaTambah = data?.bolehKelola && (jamak || daftar.length === 0);
            return (
              <div key={key} className="flex flex-col rounded-lg border border-black/[0.08] dark:border-white/10">
                <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/[0.04] text-foreground/70 dark:bg-white/5"><Ikon className="h-4 w-4" strokeWidth={1.7} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-foreground">{label}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{daftar.length ? `${daftar.length} berkas` : petunjuk}</p>
                  </div>
                </div>

                <ul className="flex-1 divide-y divide-black/[0.05] dark:divide-white/5">
                  {daftar.length === 0 && (
                    <li className="px-4 py-5 text-center text-[12.5px] text-muted-foreground">Belum ada berkas</li>
                  )}
                  {daftar.map((d) => (
                    <li key={d.id} className="group flex items-center gap-2 px-3 py-2.5">
                      <button type="button" onClick={() => setLihat(d)} className="min-w-0 flex-1 rounded-md px-1 text-left">
                        <span className="block truncate text-[13px] font-medium text-foreground group-hover:underline">{d.keterangan || d.nama_berkas}</span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {d.mime_type === "application/pdf" ? "PDF" : "Gambar"} · {ukuranTeks(d.ukuran)} · {tanggalTeks(d.dibuat)}
                        </span>
                      </button>
                      <button type="button" onClick={() => setLihat(d)} title="Lihat" className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"><Eye className="h-4 w-4" /></button>
                      <a href={urlBerkas(d, true)} title="Unduh" className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"><Download className="h-4 w-4" /></a>
                      {data?.bolehKelola && (
                        <button type="button" onClick={() => hapus(d)} title="Hapus" className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </li>
                  ))}
                </ul>

                {bisaTambah && (
                  <div className="space-y-2 border-t border-black/[0.06] p-3 dark:border-white/10">
                    {jamak && (
                      <input value={ket[key] || ""} onChange={(e) => setKet((k) => ({ ...k, [key]: e.target.value }))} placeholder={`Keterangan (opsional), ${contohKet}`}
                        className="h-8 w-full rounded-md border border-black/10 bg-transparent px-2.5 text-[12.5px] outline-none focus:border-black/30 dark:border-white/15" />
                    )}
                    <button type="button" onClick={() => pilih(key)} disabled={unggah === key}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-black/15 text-[12.5px] text-foreground/80 transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15">
                      {unggah === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {unggah === key ? "Mengunggah…" : `Unggah ${label}`}
                    </button>
                  </div>
                )}
                {data?.bolehKelola && !jamak && daftar.length > 0 && (
                  <p className="border-t border-black/[0.06] px-4 py-2 text-[11.5px] text-muted-foreground dark:border-white/10">Hapus berkas lama untuk mengganti {label}.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lihat && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4 animate-in fade-in duration-150" onClick={() => setLihat(null)}>
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-xl bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-none items-center gap-3 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{JENIS.find((x) => x.key === lihat.jenis)?.label}{lihat.keterangan ? ` — ${lihat.keterangan}` : ""}</p>
                <p className="truncate text-[12px] text-muted-foreground">{lihat.nama_berkas} · diunggah {lihat.diunggah_oleh || "-"} · {tanggalTeks(lihat.dibuat)}</p>
              </div>
              <a href={urlBerkas(lihat, true)} className="flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[13px] font-medium text-background hover:opacity-90"><Download className="h-4 w-4" />Unduh</a>
              <button type="button" onClick={() => setLihat(null)} aria-label="Tutup" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <div className={cn("min-h-0 flex-1", lihat.mime_type === "application/pdf" ? "" : "grid place-items-center overflow-auto bg-[#f4f4f2] p-4 dark:bg-gray-900")}>
              {lihat.mime_type === "application/pdf"
                ? <iframe title={lihat.nama_berkas} src={urlBerkas(lihat)} className="h-full w-full" />
                : <img src={urlBerkas(lihat)} alt={lihat.nama_berkas} className="max-h-full max-w-full rounded-md object-contain shadow" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
