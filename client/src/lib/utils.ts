import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Versi kecil dari berkas /api/uploads. Foto karyawan disimpan ukuran penuh
 * (rata-rata 372 KB) padahal avatar hanya puluhan piksel — tanpa ini satu tabel
 * bisa menarik belasan MB. Lebar harus salah satu yang dilayani server:
 * 48, 96, 192, atau 384. URL selain /api/uploads dikembalikan apa adanya.
 */
export function fotoKecil(url?: string | null, lebar: 48 | 96 | 192 | 384 = 96) {
  if (!url || !url.startsWith("/api/uploads/")) return url || "";
  return `${url}${url.includes("?") ? "&" : "?"}w=${lebar}`;
}
