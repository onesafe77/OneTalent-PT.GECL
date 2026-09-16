/**
 * Trend RCA — mesin pengolah Data -> Informasi (kerangka DIKW).
 *
 * Mengikuti "Panduan RCA" Program Zero Harm dan contoh laporan
 * "RCA Pelanggaran Pengemudi di Area Hauling". Bagian yang dihitung di sini
 * adalah bagian yang MEMANG bisa dihitung dari data:
 *
 *   D -> I : frekuensi, distribusi, tendensi sentral, persentase, tren
 *   I -> K : sinyal yang MENUNJUK ke mana RCA perlu diarahkan
 *   K -> W : TIDAK dihitung. 5-Why, akar penyebab, dan tindakan perbaikan
 *            diisi manusia. Dokumen ini jadi bukti kepatuhan ke pemilik
 *            tambang; jawaban yang terdengar masuk akal tapi tak berdasar
 *            lebih berbahaya daripada kolom kosong.
 *
 * Dua keputusan data yang menentukan seluruh angka (disepakati 2026-09-03):
 *
 *   1. HANYA baris `validation_status = 'Valid'`. Dari 728.810 alert FMS,
 *      673.338 (92%) berstatus "Tidak Valid". Tren di atas angka mentah
 *      berarti menganalisis derau. Angka mentah tetap dilaporkan terpisah
 *      sebagai ukuran mutu deteksi — dan 92% itu sendiri layak di-RCA.
 *
 *   2. Bulan yang belum genap DITANDAI, tidak disembunyikan. Tanpa itu,
 *      bulan berjalan terbaca sebagai penurunan drastis yang palsu.
 */

import { pool } from "../db";

export interface BarisBulan {
    bulan: string;              // YYYY-MM
    total: number;              // valid saja
    mentah: number;             // seluruh alert, sebelum validasi
    unit: number;               // unit aktif — pembanding paparan
    hariTercakup: number;       // hari kalender yang punya data
    hariBulan: number;
    genap: boolean;             // false = bulan berjalan / data belum penuh
}

export interface Ringkas {
    periode: { dari: string; sampai: string };
    perBulan: BarisBulan[];
    perJenis: { jenis: string; jumlah: number; persen: number }[];
    /** matriks bulan x jenis, seperti tabel "Data Dasar Pelanggaran" di contoh */
    matriks: { bulan: string; nilai: Record<string, number>; total: number }[];
    jenisTeratas: string[];

    statistik: {
        total: number;          // seluruh periode, termasuk bulan belum genap
        totalGenap: number;     // hanya bulan genap — ini yang dipakai rata/median
        bulanGenap: number;
        mentah: number;
        persenValid: number | null;
        rata: number | null;
        median: number | null;
        modus: number | null;
        tertinggi: { bulan: string; nilai: number } | null;
        terendah: { bulan: string; nilai: number } | null;
        perubahanAwalAkhir: number | null;   // % dari bulan genap pertama ke terakhir
        perubahanTerakhir: number | null;    // % bulan genap terakhir vs sebelumnya
        arah: "naik" | "turun" | "datar" | null;
    };

    /** Sinyal I -> K: menunjuk ke mana RCA diarahkan, bukan menyimpulkan sebab. */
    sinyal: string[];

    /** Sumbu bantu untuk bagian interpretasi. */
    perShift: Record<string, number>;
    perJam: Record<string, number>;
    perLokasi: { lokasi: string; jumlah: number }[];
    perUnit: { unit: string; jumlah: number }[];
}

const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const namaBulan = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${bulanIndo[parseInt(m) - 1] ?? m} ${y}`;
};

const bulat = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/** Statistik deskriptif sesuai panduan: mean, median, mode. */
function tendensi(nilai: number[]) {
    if (!nilai.length) return { rata: null, median: null, modus: null };
    const urut = [...nilai].sort((a, b) => a - b);
    const n = urut.length;
    const median = n % 2 ? urut[(n - 1) / 2] : (urut[n / 2 - 1] + urut[n / 2]) / 2;
    // Modus hanya bermakna kalau ada nilai yang benar-benar berulang.
    const hitung = new Map<number, number>();
    urut.forEach((x) => hitung.set(x, (hitung.get(x) ?? 0) + 1));
    const terbanyak = [...hitung.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
        rata: bulat(nilai.reduce((a, b) => a + b, 0) / n, 1),
        median: bulat(median, 1),
        modus: terbanyak && terbanyak[1] > 1 ? terbanyak[0] : null,
    };
}

export async function hitungRca(dari: string, sampai: string): Promise<Ringkas> {
    const P = [dari, sampai];

    // ── Per bulan: valid, mentah, unit, dan cakupan hari ──────────────────
    const b = await pool.query(
        `select to_char(violation_date,'YYYY-MM')            as bulan,
                count(*) filter (where validation_status = 'Valid')::int as total,
                count(*)::int                                as mentah,
                count(distinct vehicle_no) filter (where validation_status = 'Valid')::int as unit,
                count(distinct violation_date)::int          as hari
           from fms_violations
          where violation_date between $1 and $2
          group by 1 order by 1`, P);

    const perBulan: BarisBulan[] = b.rows.map((r: any) => {
        const [y, m] = r.bulan.split("-").map(Number);
        const hariBulan = new Date(y, m, 0).getDate();
        return {
            bulan: r.bulan, total: r.total, mentah: r.mentah, unit: r.unit,
            hariTercakup: r.hari, hariBulan,
            // Ambang 90%: sehari-dua libur data masih wajar, tapi bulan yang
            // baru terisi separuh tidak boleh ikut menghitung tren.
            genap: r.hari >= hariBulan * 0.9,
        };
    });

    // ── Per jenis pelanggaran ─────────────────────────────────────────────
    const j = await pool.query(
        `select coalesce(nullif(trim(violation_type),''),'(tanpa jenis)') as jenis,
                count(*)::int as n
           from fms_violations
          where violation_date between $1 and $2 and validation_status = 'Valid'
          group by 1 order by 2 desc`, P);
    const totalValid = j.rows.reduce((a: number, r: any) => a + r.n, 0);
    const perJenis = j.rows.map((r: any) => ({
        jenis: r.jenis, jumlah: r.n,
        persen: totalValid ? bulat((r.n / totalValid) * 100, 1) : 0,
    }));
    // Contoh dokumen memakai 3 kolom jenis. Kita ambil 5 teratas — cukup kaya
    // tapi masih muat di halaman Word potret.
    const jenisTeratas = perJenis.slice(0, 5).map((x) => x.jenis);

    // ── Matriks bulan x jenis (tabel "Data Dasar Pelanggaran") ────────────
    const mx = await pool.query(
        `select to_char(violation_date,'YYYY-MM') as bulan,
                coalesce(nullif(trim(violation_type),''),'(tanpa jenis)') as jenis,
                count(*)::int as n
           from fms_violations
          where violation_date between $1 and $2 and validation_status = 'Valid'
          group by 1,2`, P);
    const matriks = perBulan.map((bl) => {
        const nilai: Record<string, number> = {};
        jenisTeratas.forEach((t) => { nilai[t] = 0; });
        let lain = 0;
        mx.rows.filter((r: any) => r.bulan === bl.bulan).forEach((r: any) => {
            if (jenisTeratas.includes(r.jenis)) nilai[r.jenis] += r.n; else lain += r.n;
        });
        if (lain) nilai["Lainnya"] = lain;
        return { bulan: bl.bulan, nilai, total: bl.total };
    });
    if (matriks.some((m) => m.nilai["Lainnya"])) jenisTeratas.push("Lainnya");

    // ── Statistik deskriptif — HANYA dari bulan genap ─────────────────────
    const genap = perBulan.filter((x) => x.genap);
    const deret = genap.map((x) => x.total);
    const { rata, median, modus } = tendensi(deret);
    const awal = genap[0], akhir = genap[genap.length - 1];
    const sebelumAkhir = genap[genap.length - 2];
    const persenBeda = (a?: number, z?: number) =>
        a && z !== undefined && a > 0 ? bulat(((z - a) / a) * 100, 1) : null;

    const tertinggi = genap.length ? genap.reduce((a, x) => (x.total > a.total ? x : a)) : null;
    const terendah = genap.length ? genap.reduce((a, x) => (x.total < a.total ? x : a)) : null;
    const perubahanAwalAkhir = genap.length > 1 ? persenBeda(awal.total, akhir.total) : null;
    const mentahTotal = perBulan.reduce((a, x) => a + x.mentah, 0);

    // ── Sumbu bantu ───────────────────────────────────────────────────────
    const sumbu = async (kolom: string, batas = 10) => {
        const r = await pool.query(
            `select coalesce(nullif(trim(${kolom}),''),'(kosong)') as k, count(*)::int as n
               from fms_violations
              where violation_date between $1 and $2 and validation_status = 'Valid'
              group by 1 order by 2 desc limit ${batas}`, P);
        return r.rows as { k: string; n: number }[];
    };
    const sft = await sumbu("shift", 5);
    const lok = await sumbu("location", 10);
    const unt = await sumbu("vehicle_no", 10);
    // violation_time bertipe `time`, bukan teks — extract, bukan split_part.
    const jam = await pool.query(
        `select lpad(extract(hour from violation_time)::text,2,'0') as k, count(*)::int as n
           from fms_violations
          where violation_date between $1 and $2 and validation_status = 'Valid'
            and violation_time is not null
          group by 1 order by 1`, P);

    const perShift: Record<string, number> = {};
    sft.forEach((r) => { perShift[r.k] = r.n; });
    const perJam: Record<string, number> = {};
    jam.rows.forEach((r: any) => { perJam[r.k] = r.n; });

    // ── Sinyal I -> K ─────────────────────────────────────────────────────
    // Menunjuk ke mana RCA diarahkan. Tidak menyimpulkan SEBAB — itu tugas
    // 5-Why yang diisi manusia.
    const sinyal: string[] = [];
    if (perJenis[0] && perJenis[0].persen >= 30) {
        sinyal.push(`"${perJenis[0].jenis}" menyumbang ${perJenis[0].persen}% dari seluruh pelanggaran valid (${perJenis[0].jumlah} dari ${totalValid}). Ini kandidat utama fokus RCA.`);
    }
    if (perubahanAwalAkhir !== null && Math.abs(perubahanAwalAkhir) >= 15) {
        const kata = perubahanAwalAkhir > 0 ? "meningkat" : "menurun";
        sinyal.push(`Total pelanggaran valid ${kata} ${Math.abs(perubahanAwalAkhir)}% dari ${namaBulan(awal.bulan)} (${awal.total}) ke ${namaBulan(akhir.bulan)} (${akhir.total}).`);
    }
    if (tertinggi && genap.length >= 3 && rata && tertinggi.total > rata * 1.3) {
        sinyal.push(`${namaBulan(tertinggi.bulan)} menonjol dengan ${tertinggi.total} pelanggaran — ${bulat((tertinggi.total / rata - 1) * 100, 0)}% di atas rata-rata bulanan (${rata}). Periksa apa yang berbeda pada bulan itu.`);
    }
    const persenValid = mentahTotal ? bulat((totalValid / mentahTotal) * 100, 1) : null;
    if (persenValid !== null && persenValid < 20) {
        sinyal.push(`Hanya ${persenValid}% alert yang tervalidasi valid (${totalValid} dari ${mentahTotal}). Tingkat "tidak valid" setinggi ini adalah temuan tersendiri — periksa ambang deteksi perangkat atau konsistensi proses validasi.`);
    }
    const sTop = Object.entries(perShift).sort((a, b) => b[1] - a[1]);
    if (sTop.length >= 2 && sTop[1][1] > 0 && sTop[0][1] / sTop[1][1] >= 1.4) {
        sinyal.push(`${sTop[0][0]} menyumbang ${bulat((sTop[0][1] / (sTop[0][1] + sTop[1][1])) * 100, 0)}% pelanggaran — ${bulat(sTop[0][1] / sTop[1][1], 1)}x lipat ${sTop[1][0]}.`);
    }
    const jTop = Object.entries(perJam).sort((a, b) => b[1] - a[1])[0];
    if (jTop) sinyal.push(`Puncak pelanggaran terjadi pada pukul ${jTop[0]}.00 (${jTop[1]} kejadian).`);
    const belumGenap = perBulan.filter((x) => !x.genap);
    if (belumGenap.length) {
        sinyal.push(`Perhatian: ${belumGenap.map((x) => namaBulan(x.bulan)).join(", ")} datanya belum genap sebulan, jadi DIKELUARKAN dari perhitungan tren agar tidak terbaca sebagai penurunan palsu.`);
    }

    return {
        periode: { dari, sampai },
        perBulan, perJenis, matriks, jenisTeratas,
        statistik: {
            // Dibedakan dengan sengaja: rata-rata & median dihitung dari bulan
            // genap saja, jadi totalnya harus ikut disebut terpisah — kalau
            // tidak, pembaca yang membagi total dengan jumlah bulan akan
            // menemukan angka yang tidak cocok.
            total: totalValid,
            totalGenap: deret.reduce((a, b) => a + b, 0),
            bulanGenap: genap.length,
            mentah: mentahTotal, persenValid,
            rata, median, modus,
            tertinggi: tertinggi ? { bulan: tertinggi.bulan, nilai: tertinggi.total } : null,
            terendah: terendah ? { bulan: terendah.bulan, nilai: terendah.total } : null,
            perubahanAwalAkhir,
            perubahanTerakhir: sebelumAkhir ? persenBeda(sebelumAkhir.total, akhir.total) : null,
            arah: perubahanAwalAkhir === null ? null
                : perubahanAwalAkhir > 5 ? "naik" : perubahanAwalAkhir < -5 ? "turun" : "datar",
        },
        sinyal,
        perShift, perJam,
        perLokasi: lok.map((r) => ({ lokasi: r.k, jumlah: r.n })),
        perUnit: unt.map((r) => ({ unit: r.k, jumlah: r.n })),
    };
}

/**
 * Evaluasi efektivitas (langkah 5 panduan): bandingkan periode sesudah
 * tindakan dengan periode RCA. Murni hitungan — tidak ada penilaian.
 */
export async function hitungEvaluasi(
    dariAwal: string, sampaiAwal: string, dariSesudah: string, sampaiSesudah: string,
) {
    const satu = async (a: string, z: string) => {
        const r = await pool.query(
            `select count(*) filter (where validation_status = 'Valid')::int as valid,
                    count(distinct violation_date)::int as hari
               from fms_violations where violation_date between $1 and $2`, [a, z]);
        return { valid: r.rows[0].valid as number, hari: r.rows[0].hari as number };
    };
    const sebelum = await satu(dariAwal, sampaiAwal);
    const sesudah = await satu(dariSesudah, sampaiSesudah);
    // Dibandingkan PER HARI, bukan total — periode sebelum dan sesudah jarang
    // sama panjang, dan membandingkan total mentah akan menyesatkan.
    const perHariSebelum = sebelum.hari ? sebelum.valid / sebelum.hari : null;
    const perHariSesudah = sesudah.hari ? sesudah.valid / sesudah.hari : null;
    const turunPersen = perHariSebelum && perHariSesudah !== null
        ? bulat(((perHariSebelum - perHariSesudah) / perHariSebelum) * 100, 1) : null;
    return {
        sebelum: { ...sebelum, perHari: perHariSebelum ? bulat(perHariSebelum, 1) : null },
        sesudah: { ...sesudah, perHari: perHariSesudah !== null ? bulat(perHariSesudah, 1) : null },
        turunPersen,
        efektif: turunPersen === null ? null : turunPersen > 0,
    };
}
