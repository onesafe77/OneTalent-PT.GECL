import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

/**
 * Pengganti `window.confirm()` bergaya ChatGPT untuk seluruh aplikasi.
 *
 *   if (!(await konfirmasi("Hapus laporan ini?"))) return;
 *
 * Satu <KonfirmasiHost/> dipasang di App; fungsi `konfirmasi` bisa dipanggil
 * dari mana saja (tanpa hook) dan mengembalikan Promise<boolean>.
 * Pesan yang menyebut hapus/kosongkan otomatis memakai tombol merah.
 */

interface Opsi {
  judul?: string;
  pesan: string;
  tombol?: string;
  bahaya?: boolean;
}
type Antrean = Opsi & { selesai: (ok: boolean) => void };

let pasang: ((a: Antrean) => void) | null = null;

const KATA_BAHAYA = /hapus|delete|kosongkan|permanen|tidak dapat dibatalkan/i;

export function konfirmasi(isi: string | Opsi): Promise<boolean> {
  const o: Opsi = typeof isi === "string" ? { pesan: isi } : isi;
  // ponytail: bila host belum terpasang (mis. halaman publik tanpa App), jatuh ke confirm bawaan.
  if (!pasang) return Promise.resolve(window.confirm(o.pesan));
  return new Promise((selesai) => pasang!({ ...o, selesai }));
}

/** Judul ringkas ala ChatGPT ("Hapus percakapan?"); pesan lengkap tetap tampil di bawahnya. */
function judulBawaan(o: Opsi, bahaya: boolean) {
  if (o.judul) return o.judul;
  const p = o.pesan.trim();
  const m = p.match(/^hapus ([a-z]+)/i) || p.match(/menghapus ([a-z]+(?: [a-z]+)?)/i);
  if (m) return `Hapus ${m[1].replace(/ (ini|itu)$/i, "")}?`;
  return bahaya ? "Hapus data?" : "Lanjutkan?";
}

export function KonfirmasiHost() {
  const [aktif, setAktif] = useState<Antrean | null>(null);
  const [buka, setBuka] = useState(false);

  useEffect(() => {
    pasang = (a) => { setAktif(a); setBuka(true); };
    return () => { pasang = null; };
  }, []);

  const tutup = (ok: boolean) => {
    if (!aktif) return;
    aktif.selesai(ok);
    setBuka(false);
  };

  const bahaya = aktif ? (aktif.bahaya ?? KATA_BAHAYA.test(aktif.pesan)) : false;
  const judul = aktif ? judulBawaan(aktif, bahaya) : "";
  const pesanSamaJudul = aktif && judul === aktif.pesan.trim();

  return (
    <Dialog.Root open={buka} onOpenChange={(v) => { if (!v) tutup(false); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-[201] m-auto h-fit w-[calc(100%-32px)] max-w-[420px] rounded-2xl border border-black/[0.06] bg-card p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.25)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-white/10"
        >
          <Dialog.Title className="text-[17px] font-semibold leading-snug text-foreground">{judul}</Dialog.Title>
          <Dialog.Description className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
            {pesanSamaJudul ? (bahaya ? "Tindakan ini tidak dapat dibatalkan." : "") : aktif?.pesan}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Cancel
              onClick={() => tutup(false)}
              className="h-9 rounded-full border border-black/10 px-4 text-[14px] font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] dark:border-white/15"
            >
              Batal
            </Dialog.Cancel>
            <Dialog.Action
              onClick={() => tutup(true)}
              className={cn(
                "h-9 rounded-full px-4 text-[14px] font-medium transition-[background-color,transform] duration-150 active:scale-[0.97]",
                bahaya ? "bg-red-600 text-white hover:bg-red-700" : "bg-foreground text-background hover:opacity-90",
              )}
            >
              {aktif?.tombol ?? (bahaya ? "Hapus" : "Lanjutkan")}
            </Dialog.Action>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
