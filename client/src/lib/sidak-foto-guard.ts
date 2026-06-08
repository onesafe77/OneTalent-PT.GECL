// Guard: wajib ada Foto Kegiatan sebelum download PDF/JPG di semua history Sidak.
type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

/**
 * Kembalikan true bila boleh lanjut download. Bila belum ada foto kegiatan,
 * tampilkan toast peringatan dan kembalikan false.
 * `entity` bisa berupa objek session/detail yang punya field `activityPhotos`.
 */
export function fotoKegiatanGuard(entity: any, toast: ToastFn): boolean {
  const photos = entity?.activityPhotos;
  if (!Array.isArray(photos) || photos.length === 0) {
    toast({
      title: "Foto kegiatan wajib diupload",
      description: "Upload minimal 1 foto kegiatan lewat menu 'Kelola Foto' sebelum mengunduh PDF/JPG.",
      variant: "destructive",
    });
    return false;
  }
  return true;
}
