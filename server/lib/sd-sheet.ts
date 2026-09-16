/**
 * Sumber pelanggaran SAFE DISTANCE: Google Sheet terbitan (tab jarak aman SiCantik).
 *
 * Sheet-nya berbeda dari FMS sekalipun satu berkas: nama kolom lain
 * ("Location SiCantik", "Nama Karyawan"), ada kolom "Safe Distance (seconds)",
 * dan tidak ada "Level"/"Deviasi"/"Durasi Close". Jadi dinormalkan terpisah,
 * tapi memakai ulang pembantu dari fms-sheet supaya aturannya tetap satu.
 *
 * Catatan penting soal isi (diperiksa 2026-09-03, 1.408 baris sumber):
 *   - kolom Perusahaan TIDAK PERNAH berisi "GECL" di sheet ini, hanya "GEC".
 *     Penyaringnya tetap menerima keduanya agar tidak diam-diam kehilangan
 *     baris bila suatu saat ditulis "GECL".
 *   - "Departement" kosong 100% untuk baris kita -> tidak dipakai sebagai sumbu.
 *   - "Speed (Kph)" hanya terisi 4 dari 126 -> kecepatan bukan fokus di sini.
 */

import {
    punyaKita, bacaCsv, tglIndo, turunanWaktu,
    bersih, angkaAtauNull, bakukanStatus,
} from "./fms-sheet";

export const SD_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX9zYvZSIKyKXx-DfhyXZCdTMuqhPY_kXu_WxMWEZ-MHPR779_x_0NklR1VjDGN1e7aoloMaDf5jk9/pub?gid=1194224436&single=true&output=csv";

export interface PelanggaranSD {
    kunci: string;
    tanggal: string | null;          // YYYY-MM-DD
    jam: string;
    unit: string;
    perusahaan: string;
    pelanggaran: string;             // safe distance / overspeed / overtaking
    lokasiKm: string;
    km: number | null;
    pitaKm: string;
    jalur: string;                   // Kosongan / Muatan
    area: string;
    jenisKendaraan: string;
    detik: number | null;            // Safe Distance (seconds) — makin kecil makin bahaya
    rentangDetik: string;
    kecepatan: number | null;
    batas: number | null;

    nik: string;
    nama: string;
    jabatan: string;
    departemen: string;

    kodePelanggaran: string;
    kategori: string;
    sanksi: string;
    status: string;
    statusSanksi: string;            // Aktif / Expired
    masaBerlakuSanksi: string | null;
    nilaiSanksi: number | null;
    sisaHariSanksi: number | null;

    tanggalPemenuhan: string | null;
    durasiClose: number | null;      // hari, dihitung dari tanggal -> pemenuhan
    verifikasi: string;
    catatan: string;
    catatanVerifikasi: string;
    evidence: string;
    capture: string;
    video: string;

    nomorSheet: string;
    tanggalKerja: string | null;
    hari: string;
    jamKe: number | null;
    minggu: number | null;
    shift: string;
}

/** Pita jarak aman. Ambangnya 5 detik; makin kecil makin rawan tabrak belakang. */
function rentangDetik(d: number | null): string {
    if (d === null) return "";
    if (d < 1) return "< 1 detik";
    if (d < 2) return "1-2 detik";
    if (d < 3) return "2-3 detik";
    if (d < 5) return "3-5 detik";
    return "≥ 5 detik";
}

/** Selisih hari antara dua tanggal YYYY-MM-DD. */
function selisihHari(a: string | null, b: string | null): number | null {
    if (!a || !b) return null;
    const n = Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
    return Number.isFinite(n) ? n : null;
}

export function uraikanCsvSD(teks: string): PelanggaranSD[] {
    const baris = bacaCsv(teks);
    if (!baris.length) return [];
    const h = baris[0].map((x) => x.trim());
    const ix = (n: string) => h.indexOf(n);
    const kol = {
        no: ix("No"), tanggal: ix("Date"), jam: ix("Time"), unit: ix("Vehicle No"),
        perusahaan: ix("Perusahaan"), pelanggaran: ix("Violation"),
        lokasi: ix("Location SiCantik"), shift: ix("Shift"), jalur: ix("Jalur"),
        kecepatan: ix("Speed (Kph)"), batas: ix("Speed Limit"), detik: ix("Safe Distance (seconds)"),
        jenisKendaraan: ix("Vehicle Type"), area: ix("Area"), departemen: ix("Departement"),
        nik: ix("NIK"), nama: ix("Nama Karyawan"), jabatan: ix("Jabatan"),
        kode: ix("Kode Pelanggaran"), kategori: ix("Kategori Pelanggaran"), sanksi: ix("Sanksi"),
        status: ix("Status"), masaBerlaku: ix("Masa Berlaku Sanksi"), pemenuhan: ix("Tanggal Pemenuhan"),
        evidence: ix("Evidence"), catatan: ix("Catatan"),
        verifikasi: ix("Verifikasi"), catatanVerifikasi: ix("Catatan Verifikasi"),
        sisa: ix("Durasi Sanksi Tersisa"), statusSanksi: ix("Status Sanksi"), nilai: ix("Nilai Sanksi"),
        capture: ix("Capture Pelanggaran"), video: ix("Video Pelanggaran"), link: ix("link"),
    };
    const ambil = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");

    return baris.slice(1)
        .filter((r) => r.length > 5 && ambil(r, kol.unit))
        .map((r) => {
            const tanggal = tglIndo(ambil(r, kol.tanggal));
            const jam = ambil(r, kol.jam);
            const unit = ambil(r, kol.unit);
            const w = turunanWaktu(tanggal, jam);
            const detik = angkaAtauNull(ambil(r, kol.detik));
            const lok = ambil(r, kol.lokasi);
            // Lokasi ditulis dengan koma desimal ("16,5"). Angka di luar 0-100 km
            // bukan KM — biasanya bocoran nomor seri tanggal Excel.
            const kmMentah = angkaAtauNull(lok.replace(",", "."));
            const km = kmMentah !== null && kmMentah >= 0 && kmMentah <= 100 ? kmMentah : null;
            const pemenuhan = tglIndo(ambil(r, kol.pemenuhan));
            const shiftSheet = bersih(ambil(r, kol.shift));

            return {
                kunci: [tanggal ?? "", jam, unit, ambil(r, kol.no)].join("|"),
                tanggal, jam, unit,
                perusahaan: ambil(r, kol.perusahaan).toUpperCase(),
                // Sumber menulis "safe distance" dan "Safe Distance" — dibakukan.
                pelanggaran: (() => {
                    const v = bersih(ambil(r, kol.pelanggaran)).toLowerCase();
                    if (!v) return "";
                    if (v.includes("safe")) return "Safe Distance";
                    if (v.includes("over") && v.includes("speed")) return "Overspeed";
                    if (v.includes("overtak")) return "Overtaking";
                    return v[0].toUpperCase() + v.slice(1);
                })(),
                lokasiKm: lok, km,
                pitaKm: km === null ? "" : `${Math.floor(km / 5) * 5}-${Math.floor(km / 5) * 5 + 5}`,
                jalur: (() => { const v = bersih(ambil(r, kol.jalur)); return v ? v[0].toUpperCase() + v.slice(1).toLowerCase() : ""; })(),
                area: bersih(ambil(r, kol.area)),
                jenisKendaraan: bersih(ambil(r, kol.jenisKendaraan)),
                detik, rentangDetik: rentangDetik(detik),
                kecepatan: angkaAtauNull(ambil(r, kol.kecepatan)),
                batas: angkaAtauNull(ambil(r, kol.batas)),

                nik: bersih(ambil(r, kol.nik)),
                nama: bersih(ambil(r, kol.nama)),
                jabatan: bersih(ambil(r, kol.jabatan)),
                departemen: bersih(ambil(r, kol.departemen)),

                kodePelanggaran: bersih(ambil(r, kol.kode)),
                kategori: bersih(ambil(r, kol.kategori)),
                sanksi: bersih(ambil(r, kol.sanksi)),
                status: bakukanStatus(ambil(r, kol.status)),
                statusSanksi: bersih(ambil(r, kol.statusSanksi)),
                masaBerlakuSanksi: tglIndo(ambil(r, kol.masaBerlaku)),
                nilaiSanksi: angkaAtauNull(bersih(ambil(r, kol.nilai))),
                sisaHariSanksi: angkaAtauNull(bersih(ambil(r, kol.sisa))),

                tanggalPemenuhan: pemenuhan,
                durasiClose: selisihHari(tanggal, pemenuhan),
                verifikasi: bersih(ambil(r, kol.verifikasi)),
                catatan: bersih(ambil(r, kol.catatan)),
                catatanVerifikasi: bersih(ambil(r, kol.catatanVerifikasi)),
                evidence: ambil(r, kol.evidence),
                capture: ambil(r, kol.link),
                video: ambil(r, kol.video),

                nomorSheet: ambil(r, kol.no),
                tanggalKerja: w.tanggalKerja, hari: w.hari, jamKe: w.jamKe, minggu: w.minggu,
                // Shift dari sheet dipakai kalau ada; kalau kosong, dihitung dari jam.
                shift: shiftSheet || w.shift,
            } as PelanggaranSD;
        });
}

let cache: { pada: number; data: PelanggaranSD[] } | null = null;
const UMUR_CACHE = 5 * 60 * 1000;

/** Sama seperti FMS: urai utuh, saring saat dikembalikan. */
export async function ambilPelanggaranSD(paksa = false, hanyaKita = true): Promise<PelanggaranSD[]> {
    if (paksa || !cache || Date.now() - cache.pada >= UMUR_CACHE) {
        const r = await fetch(SD_CSV_URL, { redirect: "follow" });
        if (!r.ok) throw new Error(`Sheet Safe Distance menolak: HTTP ${r.status}`);
        cache = { pada: Date.now(), data: uraikanCsvSD(await r.text()) };
    }
    return hanyaKita ? cache.data.filter(punyaKita) : cache.data;
}
