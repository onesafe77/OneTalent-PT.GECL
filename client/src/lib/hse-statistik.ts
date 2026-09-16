/**
 * Sumber data bersama untuk modul Incident.
 * Acuan: PROMPT-HSE-OneTalent.md §2 (man-hours) dan §3 (frequency rate).
 *
 * CATATAN PENTING: data ini masih tersimpan di localStorage peramban, bukan di
 * basis data (lihat DEFAULT_DATA di halaman statistik lama). Artinya angkanya
 * hanya ada di satu komputer. Dokumen §2.2 meminta perhitungan dilakukan lewat
 * trigger basis data — itu pekerjaan berikutnya, bukan bagian perubahan tampilan.
 */

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
export const STORAGE_KEY = "gecl_dashboard_2026";

/** §2.1 — nilai bawaan lapangan: jam per hari 10, faktor ketersediaan 0,85. */
export const JAM_PER_HARI_BAKU = 10;
export const FAKTOR_BAKU = 0.85;

export const HARI_PER_BULAN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Baris statistik turunan dari view she_statistik_bulanan (§3). */
export interface StatistikBulan {
    bulan: number; jam_bulan: string | number;
    insiden: number; insiden_fatigue: number; insiden_kendaraan: number;
    insiden_manual: number;
    tifr: string | null; fatigue_fr: string | null; cifr: string | null;
}

export interface DataStatistik {
    manpower: number[];
    days_in_month: number[];
    leap_year: boolean;
    hours_per_day: number;
    factor_mh: number;
    ti_incidents: number[];
    tr_value: number;
    mode_ytd_tifr: boolean;
    fatigue_incidents: number[];
    mode_ytd_fatigue: boolean;
    menabrak: number[];
    rebah: number[];
    mode_ytd_cifr: boolean;
    production_target: number[];
    production_actual: number[];
    aiInsights: string[];
    tr_fatigue?: number;
    tr_cifr?: number;
}

export const DATA_BAWAAN: DataStatistik = {
    manpower: Array(12).fill(0),
    days_in_month: [...HARI_PER_BULAN],
    leap_year: false,
    hours_per_day: JAM_PER_HARI_BAKU,
    factor_mh: FAKTOR_BAKU,
    ti_incidents: Array(12).fill(0),
    tr_value: 6.42,
    mode_ytd_tifr: true,
    fatigue_incidents: Array(12).fill(0),
    mode_ytd_fatigue: true,
    menabrak: Array(12).fill(0),
    rebah: Array(12).fill(0),
    mode_ytd_cifr: true,
    production_target: Array(12).fill(0),
    production_actual: Array(12).fill(0),
    aiInsights: [],
    tr_fatigue: 0,
    tr_cifr: 0,
};

export function bacaData(): DataStatistik {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) return { ...DATA_BAWAAN, ...JSON.parse(s) };
    } catch { /* localStorage bisa ditolak */ }
    return { ...DATA_BAWAAN };
}

export function simpanData(d: DataStatistik) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { }
}

/**
 * §2.3 — bulan berjalan memakai hari yang SUDAH lewat, bukan sebulan penuh.
 * Memakai 31 hari di pertengahan bulan membuat pembagi membengkak sehingga
 * frequency rate terlihat jauh lebih baik daripada kenyataannya (§6.3).
 */
export function hariBawaan(tahun: number, bulan1: number): number {
    const kini = new Date();
    if (tahun === kini.getFullYear() && bulan1 === kini.getMonth() + 1)
        return kini.getDate() - 1 || 1;
    if (tahun > kini.getFullYear() || (tahun === kini.getFullYear() && bulan1 > kini.getMonth() + 1))
        return 0;
    return new Date(tahun, bulan1, 0).getDate();
}

/** §2.1 — Man Hours = manpower × hari kerja × jam per hari × faktor. */
export function manHours(d: DataStatistik, i: number): number {
    const hari = i === 1 && d.leap_year ? 29 : d.days_in_month[i];
    return (d.manpower[i] || 0) * (hari || 0) * (d.hours_per_day || 0) * (d.factor_mh || 0);
}

/**
 * §3 — rate kumulatif berjalan. Bulan tanpa jam kerja mengembalikan `null`,
 * BUKAN nol: nol berarti "tidak ada insiden", null berarti "belum dihitung".
 */
export function seriKumulatif(d: DataStatistik, insiden: number[]): (number | null)[] {
    let jam = 0, ins = 0;
    return Array.from({ length: 12 }, (_, i) => {
        jam += manHours(d, i);
        ins += insiden[i] || 0;
        return jam > 0 ? (ins * 1_000_000) / jam : null;
    });
}

/** §8 — angka gaya Indonesia: titik ribuan, koma desimal. */
export const angka = (n: number | null | undefined, desimal = 0) =>
    n === null || n === undefined || !Number.isFinite(n)
        ? "–"
        : n.toLocaleString("id-ID", { minimumFractionDigits: desimal, maximumFractionDigits: desimal });

/* ── Satu sumber data: basis data ────────────────────────────────────────────
   Sebelumnya halaman Statistik menulis ke localStorage sementara halaman
   Man Hour membaca dari server. Halaman mana pun yang dimuat belakangan
   menimpa tampilan yang lain, dan insiden yang sudah diketik terlihat hilang.
   Kedua halaman kini memakai dua fungsi di bawah ini.                        */

export const TAHUN_AKTIF = new Date().getFullYear();

/** Muat setahun dari basis data. localStorage hanya dipakai bila server kosong. */
/** Statistik turunan: insiden dihitung dari data insiden, bukan diketik. */
export async function muatStatistik(tahun = TAHUN_AKTIF): Promise<StatistikBulan[]> {
    try {
        const r = await fetch(`/api/hse/manhours/${tahun}`);
        if (!r.ok) return [];
        const j = await r.json();
        return Array.isArray(j.statistik) ? j.statistik : [];
    } catch { return []; }
}

export async function muatDariServer(tahun = TAHUN_AKTIF): Promise<DataStatistik> {
    const lokal = bacaData();
    try {
        const r = await fetch(`/api/hse/manhours/${tahun}`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!Array.isArray(j.bulan) || j.bulan.length === 0) return lokal;

        const d: DataStatistik = {
            ...lokal,
            manpower: Array(12).fill(0),
            days_in_month: [...HARI_PER_BULAN],
            ti_incidents: Array(12).fill(0),
            fatigue_incidents: Array(12).fill(0),
            menabrak: Array(12).fill(0),
            rebah: Array(12).fill(0),
            production_actual: Array(12).fill(0),
        };
        for (const b of j.bulan) {
            const i = Number(b.bulan) - 1;
            if (i < 0 || i > 11) continue;
            d.manpower[i] = Number(b.manpower) || 0;
            d.days_in_month[i] = Number(b.hari_kerja) || 0;
            d.ti_incidents[i] = Number(b.insiden) || 0;
            d.fatigue_incidents[i] = Number(b.insiden_fatigue) || 0;
            d.menabrak[i] = Number(b.insiden_menabrak) || 0;
            d.rebah[i] = Number(b.insiden_rebah) || 0;
            d.production_actual[i] = Number(b.produksi) || 0;
        }
        const b0 = j.bulan[0];
        d.hours_per_day = Number(b0.jam_per_hari) || lokal.hours_per_day;
        d.factor_mh = Number(b0.faktor) || lokal.factor_mh;
        if (j.target) {
            d.tr_value = Number(j.target.tifr) || 0;
            d.tr_fatigue = Number(j.target.fatigue_fr) || 0;
            d.tr_cifr = Number(j.target.cifr) || 0;
        }
        simpanData(d);
        return d;
    } catch {
        return lokal;   // server tak terjangkau — jangan kosongkan layar
    }
}

/** Simpan setahun ke basis data. Melempar bila gagal, supaya pemanggil tahu. */
export async function simpanKeServer(d: DataStatistik, tahun = TAHUN_AKTIF) {
    const bulan = Array.from({ length: 12 }, (_, i) => ({
        bulan: i + 1,
        manpower: d.manpower[i] || null,
        hari_kerja: (i === 1 && d.leap_year ? 29 : d.days_in_month[i]) || null,
        jam_per_hari: d.hours_per_day || null,
        faktor: d.factor_mh || null,
        insiden: d.ti_incidents[i] || 0,
        insiden_fatigue: d.fatigue_incidents[i] || 0,
        insiden_menabrak: d.menabrak[i] || 0,
        insiden_rebah: d.rebah[i] || 0,
        produksi: d.production_actual[i] || null,
    }));
    const r = await fetch(`/api/hse/manhours/${tahun}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            bulan,
            target: { tifr: d.tr_value ?? null, fatigue_fr: d.tr_fatigue ?? null, cifr: d.tr_cifr ?? null },
        }),
    });
    if (!r.ok) throw new Error("Gagal menyimpan");
    simpanData(d);
    return r.json();
}
