/**
 * Riwayat pelanggaran LINTAS KONTRAKTOR (FMS + Safe Distance).
 *
 * Tujuan: tim HR/HSE bisa melihat rekam jejak seseorang di kontraktor lain
 * sebelum yang bersangkutan masuk GECL. Ini satu-satunya jalur yang membaca
 * sheet tanpa saringan GEC/GECL — seluruh halaman lain tetap hanya milik kita.
 *
 * Fakta yang mendasari rancangan ini (diuji atas 7.794 baris, 2026-09-03):
 *
 *   - NIK adalah nomor SITE, bukan nomor perusahaan: 129 NIK muncul di lebih
 *     dari satu kontraktor. Tanpa fakta ini fitur ini mustahil.
 *   - 765 baris tidak punya NIK sah. Termasuk literal "N/A" yang muncul di 11
 *     kontraktor sekaligus — kalau tidak dibuang, ia menjadi "satu orang"
 *     fiktif berriwayat 11 perusahaan.
 *   - 204 NIK ditulis huruf kecil ("c-036912"). Tanpa penyeragaman huruf, satu
 *     orang terbelah dua dan separuh riwayatnya hilang.
 *   - 963 baris tanpa nama terbaca ("#N/A"). Jadi NIK yang menjadi kunci;
 *     nama hanya alat bantu cari.
 *   - 26 NIK tercatat dengan lebih dari satu nama. Sebagian salah ketik
 *     ("M ALDIANSYAH" vs "M. ALDIANSYAH"), tapi sebagian tampak orang berbeda
 *     ("M. ARSYAT" vs "ZULKADRI NASRI"). Ini TIDAK digabung diam-diam:
 *     setiap orang membawa bendera `namaBentrok` supaya halaman bisa
 *     memperingatkan sebelum ada keputusan diambil atas nama yang keliru.
 *
 * Cakupan tidak merata dan itu harus disampaikan, bukan disembunyikan:
 * tab FMS hanya memuat 13 perusahaan, tab Safe Distance 69. Untuk kontraktor
 * di luar 13 itu, "tidak ada catatan FMS" berarti TIDAK TEREKAM, bukan bersih.
 */

import { ambilPelanggaran, PERUSAHAAN_KITA } from "./fms-sheet";
import { ambilPelanggaranSD } from "./sd-sheet";

/** Nilai yang menyamar sebagai NIK tapi bukan identitas siapa pun. */
const NIK_PALSU = new Set([
    "", "-", "--", "0", "N/A", "NA", "NULL", "NONE", "INVALID", "INVALID NIK",
    "TIDAK ADA", "UNKNOWN", "#N/A", "#REF!", "#VALUE!",
]);

/** Penyeragaman kunci orang: rapatkan spasi, samakan huruf besar. */
export function bakukanNik(v: string): string {
    const s = (v || "").trim().toUpperCase().replace(/\s+/g, "");
    return NIK_PALSU.has(s) || s.startsWith("#") ? "" : s;
}

const bakuNama = (v: string) => (v || "").trim().toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ");

export interface BarisRiwayat {
    kunci: string;
    sumber: "FMS" | "Safe Distance";
    tanggal: string | null;
    jam: string;
    perusahaan: string;
    unit: string;
    nik: string;
    nama: string;
    jabatan: string;
    pelanggaran: string;
    kodePelanggaran: string;
    kategori: string;
    sanksi: string;
    status: string;
    lokasiKm: string;
    jalur: string;
    /** khas FMS */
    kecepatan: number | null;
    batas: number | null;
    deviasi: number | null;
    /** khas Safe Distance */
    detik: number | null;
    masaBerlakuSanksi: string | null;
    /** true bila kejadian ini terjadi SEBELUM orangnya tercatat di GEC/GECL */
    sebelumGecl: boolean;
}

export interface Orang {
    nik: string;
    nama: string;
    namaLain: string[];        // varian nama lain yang tercatat atas NIK ini
    namaBentrok: boolean;      // lebih dari satu nama -> wajib diperingatkan
    jabatan: string;
    perusahaan: string[];      // seluruh kontraktor tempat ia tercatat
    diKita: boolean;           // pernah tercatat di GEC/GECL
    total: number;
    totalFms: number;
    totalSd: number;
    sebelumGecl: number;       // pelanggaran sebelum masuk GEC/GECL
    pertama: string | null;
    terakhir: string | null;
    masukKita: string | null;  // tanggal tercatat paling awal di GEC/GECL
    sanksiTerberat: string;
    sanksiAktif: number;
    belumSelesai: number;
}

/** Bobot sanksi untuk menentukan yang terberat. Urutan matriks BIB. */
const BOBOT: [RegExp, number, string][] = [
    [/phk/i, 5, "PHK"],
    [/sp\s*3/i, 4, "SP 3"],
    [/sp\s*2/i, 3, "SP 2"],
    [/sp\s*1/i, 2, "SP 1"],
    [/konseling|teguran/i, 1, "Konseling"],
];
const bobotSanksi = (s: string) => BOBOT.find(([re]) => re.test(s || ""))?.[1] ?? 0;

function keFms(x: any): BarisRiwayat {
    return {
        kunci: "F|" + x.kunci, sumber: "FMS",
        tanggal: x.tanggal, jam: x.jam, perusahaan: x.perusahaan, unit: x.unit,
        nik: x.nik, nama: x.nama, jabatan: x.jabatan,
        pelanggaran: x.pelanggaran, kodePelanggaran: x.kodePelanggaran,
        kategori: x.kategori, sanksi: x.sanksi, status: x.status,
        lokasiKm: x.lokasiKm, jalur: x.jalur,
        kecepatan: x.kecepatan, batas: x.batas, deviasi: x.deviasi2 ?? x.deviasi ?? null,
        detik: null, masaBerlakuSanksi: x.masaBerlakuSanksi, sebelumGecl: false,
    };
}

function keSd(x: any): BarisRiwayat {
    return {
        kunci: "S|" + x.kunci, sumber: "Safe Distance",
        tanggal: x.tanggal, jam: x.jam, perusahaan: x.perusahaan, unit: x.unit,
        nik: x.nik, nama: x.nama, jabatan: x.jabatan,
        pelanggaran: x.pelanggaran, kodePelanggaran: x.kodePelanggaran,
        kategori: x.kategori, sanksi: x.sanksi, status: x.status,
        lokasiKm: x.lokasiKm, jalur: x.jalur,
        kecepatan: x.kecepatan, batas: x.batas, deviasi: null,
        detik: x.detik, masaBerlakuSanksi: x.masaBerlakuSanksi, sebelumGecl: false,
    };
}

export interface Korpus {
    baris: BarisRiwayat[];              // hanya yang ber-NIK sah
    orang: Map<string, Orang>;
    perNik: Map<string, BarisRiwayat[]>;
    /** dibuang karena tanpa NIK sah — dilaporkan, tidak disembunyikan */
    tanpaNik: number;
    perusahaanFms: string[];
    perusahaanSd: string[];
}

export async function bangunKorpus(paksa = false): Promise<Korpus> {
    const [fms, sd] = await Promise.all([
        ambilPelanggaran(paksa, false),
        ambilPelanggaranSD(paksa, false),
    ]);
    const mentah = [...fms.map(keFms), ...sd.map(keSd)];

    const baris: BarisRiwayat[] = [];
    let tanpaNik = 0;
    for (const b of mentah) {
        const nik = bakukanNik(b.nik);
        if (!nik) { tanpaNik++; continue; }
        baris.push({ ...b, nik });
    }

    const perNik = new Map<string, BarisRiwayat[]>();
    for (const b of baris) {
        const a = perNik.get(b.nik);
        if (a) a.push(b); else perNik.set(b.nik, [b]);
    }

    const hariIni = new Date().toISOString().slice(0, 10);
    const orang = new Map<string, Orang>();

    for (const [nik, r] of perNik) {
        r.sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));

        // Nama: varian terbanyak dipakai sebagai nama utama, sisanya dicatat.
        const hitungNama = new Map<string, { asli: string; n: number }>();
        for (const x of r) {
            const k = bakuNama(x.nama);
            if (!k) continue;
            const o = hitungNama.get(k);
            if (o) o.n++; else hitungNama.set(k, { asli: x.nama.trim(), n: 1 });
        }
        const urutNama = [...hitungNama.values()].sort((a, b) => b.n - a.n);

        const tglKita = r.filter((x) => PERUSAHAAN_KITA.includes(x.perusahaan))
            .map((x) => x.tanggal).filter(Boolean) as string[];
        const masukKita = tglKita.length ? tglKita[0] : null;

        // Penanda "sebelum masuk GECL" hanya bermakna kalau kita tahu kapan ia
        // mulai tercatat di GEC/GECL. Tanpa itu, dibiarkan false.
        if (masukKita) {
            for (const x of r) {
                x.sebelumGecl = !PERUSAHAAN_KITA.includes(x.perusahaan)
                    && !!x.tanggal && x.tanggal < masukKita;
            }
        }

        const tgl = r.map((x) => x.tanggal).filter(Boolean) as string[];
        const terberat = r.map((x) => x.sanksi).filter(Boolean)
            .sort((a, b) => bobotSanksi(b) - bobotSanksi(a))[0] || "";

        orang.set(nik, {
            nik,
            nama: urutNama[0]?.asli ?? "",
            namaLain: urutNama.slice(1).map((x) => x.asli),
            namaBentrok: urutNama.length > 1,
            jabatan: r.map((x) => x.jabatan).filter(Boolean).pop() ?? "",
            perusahaan: [...new Set(r.map((x) => x.perusahaan).filter(Boolean))],
            diKita: tglKita.length > 0 || r.some((x) => PERUSAHAAN_KITA.includes(x.perusahaan)),
            total: r.length,
            totalFms: r.filter((x) => x.sumber === "FMS").length,
            totalSd: r.filter((x) => x.sumber === "Safe Distance").length,
            sebelumGecl: r.filter((x) => x.sebelumGecl).length,
            pertama: tgl[0] ?? null,
            terakhir: tgl[tgl.length - 1] ?? null,
            masukKita,
            sanksiTerberat: terberat,
            sanksiAktif: r.filter((x) => x.sanksi && x.masaBerlakuSanksi && x.masaBerlakuSanksi >= hariIni).length,
            belumSelesai: r.filter((x) => x.status && x.status !== "Closed").length,
        });
    }

    return {
        baris, orang, perNik, tanpaNik,
        perusahaanFms: [...new Set(fms.map((x) => x.perusahaan).filter(Boolean))].sort(),
        perusahaanSd: [...new Set(sd.map((x) => x.perusahaan).filter(Boolean))].sort(),
    };
}
