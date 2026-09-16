import { pool } from "../db";
import { ambilPelanggaran, Pelanggaran } from "./fms-sheet";
import { storage } from "../storage";
import { ambilPelanggaranSD, PelanggaranSD } from "./sd-sheet";

/**
 * Deteksi pelanggaran FMS baru lalu buat notifikasi.
 *
 * Jalannya berkala, jadi tidak bergantung ada tidaknya orang membuka halaman.
 *
 * PENJAGA PENTING — jalan pertama kali TIDAK memberi notifikasi. Sheet berisi
 * 994 baris sejak 2024; memberitahukan semuanya sekaligus akan membanjiri
 * lonceng dan membuat orang mengabaikannya sejak hari pertama. Baris yang sudah
 * ada dicatat diam-diam sebagai "sudah terlihat".
 */
export async function periksaPelanggaranBaru(): Promise<{ baru: number; disemai: number }> {
    const fms = await periksaSumber(await ambilPelanggaran(true), "", "fms",
        "Pelanggaran FMS", "/workspace/hse/overspeed");
    const sd = await periksaSumber(await ambilPelanggaranSD(true), "sd:", "safe_distance",
        "Safe Distance", "/workspace/hse/jarak");
    return { baru: fms.baru + sd.baru, disemai: fms.disemai + sd.disemai };
}

type Baris = Pelanggaran | PelanggaranSD;

async function periksaSumber(data: Baris[], awalan: string, type: string, label: string, link: string) {
    if (!data.length) return { baru: 0, disemai: 0 };

    const ada = await pool.query(
        awalan ? "select 1 from fms_sheet_terlihat where kunci like $1 limit 1"
               : "select 1 from fms_sheet_terlihat where kunci not like 'sd:%' limit 1",
        awalan ? [`${awalan}%`] : []);
    const pertamaKali = ada.rowCount === 0;

    // Klaim atomik: hanya baris yang BENAR-BENAR baru disisipkan oleh proses ini
    // yang kembali. Dua proses/cron yang jalan bersamaan tidak lagi mengirim
    // notifikasi yang sama dua kali (dulu: cek-lalu-sisip, balapan).
    const perKunci = new Map(data.map((d) => [awalan + d.kunci, d]));
    const klaim = await pool.query(
        `insert into fms_sheet_terlihat (kunci, tanggal)
         select * from unnest($1::text[], $2::date[])
         on conflict (kunci) do nothing returning kunci`,
        [Array.from(perKunci.keys()), Array.from(perKunci.values()).map((d) => d.tanggal || null)]);
    const baru = klaim.rows.map((r: any) => perKunci.get(r.kunci)!);
    if (!baru.length) return { baru: 0, disemai: 0 };
    if (pertamaKali) return { baru: 0, disemai: baru.length };

    // Notifikasi hanya untuk kejadian 7 hari terakhir. Baris lama yang baru
    // dimasukkan ke sheet bukan kabar mendesak.
    const batas = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const layak = baru.filter((b) => b.tanggal && b.tanggal >= batas);

    if (layak.length > 3) {
        // Diringkas agar lonceng tidak dibanjiri saat sheet diperbarui borongan.
        await storage.createNotification({
            type, title: `${layak.length} ${label.toLowerCase()} baru`, body: ringkas(layak), link, audience: "hse",
            meta: { jumlah: layak.length, unit: Array.from(new Set(layak.map((l) => l.unit))).slice(0, 10) },
        } as any);
    } else {
        for (const b of layak) {
            const kec = b.kecepatan && b.batas ? `${b.kecepatan} kph / batas ${b.batas} kph` : null;
            const detik = "detik" in b && b.detik != null ? `jarak ${b.detik} dtk` : null;
            await storage.createNotification({
                type,
                title: `${b.pelanggaran || label} — ${b.unit}`,
                body: [
                    b.nama ? `${b.nama}${b.nik ? ` (${b.nik})` : ""}` : null,
                    detik || kec,
                    b.lokasiKm ? `KM ${b.lokasiKm}${b.jalur ? ` · ${b.jalur}` : ""}` : null,
                    b.tanggal ? `${b.tanggal} ${b.jam}` : null,
                ].filter(Boolean).join(" · "),
                link, audience: "hse",
                meta: { unit: b.unit, nik: b.nik, kunci: awalan + b.kunci },
            } as any);
        }
    }
    return { baru: layak.length, disemai: 0 };
}

function ringkas(list: Baris[]): string {
    const per: Record<string, number> = {};
    list.forEach((l) => { const k = l.pelanggaran || "Lainnya"; per[k] = (per[k] || 0) + 1; });
    const jenis = Object.entries(per).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join(" · ");
    const unit = Array.from(new Set(list.map((l) => l.unit))).slice(0, 4).join(", ");
    return `${jenis}. Unit: ${unit}${new Set(list.map((l) => l.unit)).size > 4 ? " dan lainnya" : ""}`;
}
