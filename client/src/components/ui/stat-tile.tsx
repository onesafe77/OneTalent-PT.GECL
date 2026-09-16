import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ubin statistik tunggal untuk SELURUH dashboard.
 *
 * Sebelum ini setiap halaman menggambar ubinnya sendiri: Roster memberi Hadir
 * kotak hijau dan Cuti kotak ungu, Laporan memberi empat ikon empat warna,
 * Dashboard Karyawan memakai bentuk lain lagi. Angka yang sama jadi tampil
 * berbeda tergantung halamannya.
 *
 * Warna DIHAPUS dari ubin dengan sengaja: "Hadir" tidak lebih hijau daripada
 * "Belum Hadir" merah — keduanya sekadar hitungan. Warna disimpan untuk
 * penanda status per baris, tempat ia benar-benar membedakan sesuatu.
 */
export function StatTile({
  label, value, icon: Icon, className,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 flex-none" />}
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2.5 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
    </div>
  );
}
