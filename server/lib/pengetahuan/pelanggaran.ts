/**
 * Alat agen untuk data pelanggaran (Google Sheet FMS & Safe Distance).
 *
 * SENGAJA tanpa embedding: pertanyaan pelanggaran hampir selalu hitungan
 * ("berapa", "unit mana paling sering"). Pencarian kemiripan hanya melihat
 * beberapa baris lalu menebak jumlah. Di sini server yang menghitung dengan
 * filter pasti; model hanya merangkai jawaban dari angka yang dikembalikan.
 *
 * Isi sheet = pelanggaran yang sudah ditetapkan (bukan alarm mentah FAMOUS).
 * Nama/NIK hanya dikembalikan untuk HSE/HRGA, sepola dengan halaman riwayat.
 */

import { ambilPelanggaran } from "../fms-sheet";
import { ambilPelanggaranSD } from "../sd-sheet";
import { bangunKorpus, bakukanNik } from "../riwayat-pelanggaran";

export interface Peminta { nama?: string; departemen?: string }

export const bolehDataPribadi = (p: Peminta) => /HSE|HRGA/i.test(p.departemen || "");

interface Baris {
    sumber: "FMS" | "Safe Distance";
    tanggal: string | null; tanggalKerja: string | null; jam: string;
    hari: string; jamKe: number | null; shift: string; minggu: number | null;
    unit: string; pelanggaran: string; lokasiKm: string; km: number | null; jalur: string;
    kecepatan: number | null; batas: number | null; detik: number | null;
    nik: string; nama: string; jabatan: string; sanksi: string; status: string;
}

async function semuaBaris(sumber: string): Promise<Baris[]> {
    const out: Baris[] = [];
    if (sumber !== "safe_distance") {
        for (const x of await ambilPelanggaran()) out.push({
            sumber: "FMS", tanggal: x.tanggal, tanggalKerja: x.tanggalKerja, jam: x.jam, hari: x.hari,
            jamKe: x.jamKe, shift: x.shift, minggu: x.minggu, unit: x.unit, pelanggaran: x.pelanggaran,
            lokasiKm: x.lokasiKm, km: x.km, jalur: x.jalur, kecepatan: x.kecepatan, batas: x.batas, detik: null,
            nik: x.nik, nama: x.nama, jabatan: x.jabatan, sanksi: x.sanksi, status: x.status,
        });
    }
    if (sumber !== "fms") {
        for (const x of await ambilPelanggaranSD()) out.push({
            sumber: "Safe Distance", tanggal: x.tanggal, tanggalKerja: x.tanggalKerja, jam: x.jam, hari: x.hari,
            jamKe: x.jamKe, shift: x.shift, minggu: x.minggu, unit: x.unit, pelanggaran: x.pelanggaran,
            lokasiKm: x.lokasiKm, km: x.km, jalur: x.jalur, kecepatan: x.kecepatan, batas: x.batas, detik: x.detik,
            nik: x.nik, nama: x.nama, jabatan: x.jabatan, sanksi: x.sanksi, status: x.status,
        });
    }
    return out;
}

const SUMBU: Record<string, (b: Baris) => string> = {
    unit: (b) => b.unit,
    jenis: (b) => b.pelanggaran,
    lokasi: (b) => b.lokasiKm,
    pita_km: (b) => (b.km == null ? "" : `KM ${Math.floor(b.km / 5) * 5}-${Math.floor(b.km / 5) * 5 + 5}`),
    jalur: (b) => b.jalur,
    shift: (b) => b.shift,
    jam: (b) => (b.jamKe == null ? "" : `${String(b.jamKe).padStart(2, "0")}:00`),
    hari: (b) => b.hari,
    tanggal: (b) => b.tanggal || "",
    minggu: (b) => (b.minggu == null || !b.tanggalKerja ? "" : `${b.tanggalKerja.slice(0, 4)}-W${String(b.minggu).padStart(2, "0")}`),
    bulan: (b) => (b.tanggal || "").slice(0, 7),
    sanksi: (b) => b.sanksi,
    status: (b) => b.status,
    sumber: (b) => b.sumber,
    orang: (b) => (b.nama ? `${b.nama}${b.nik ? ` (${b.nik})` : ""}` : b.nik),
};
const SUMBU_KRONOLOGIS = new Set(["jam", "tanggal", "minggu", "bulan", "hari"]);
const SUMBU_PRIBADI = new Set(["orang"]);

export const DEF_TANYA_PELANGGARAN = {
    type: "function",
    function: {
        name: "tanya_pelanggaran",
        description: "Hitung & telusuri pelanggaran RESMI karyawan GECL dari data FMS (overspeed, merokok, handphone) dan Safe Distance (jarak aman SiCantik). Gunakan untuk pertanyaan jumlah, tren, peringkat unit/lokasi/jam/shift rawan, atau daftar kejadian. Angka dihitung server — jangan menebak sendiri.",
        parameters: {
            type: "object",
            properties: {
                sumber: { type: "string", enum: ["fms", "safe_distance", "semua"], description: "Default semua" },
                dari: { type: "string", description: "Tanggal awal YYYY-MM-DD (inklusif)" },
                sampai: { type: "string", description: "Tanggal akhir YYYY-MM-DD (inklusif)" },
                jenis: { type: "string", description: "Jenis pelanggaran, mis. Overspeed, Merokok, Safe Distance" },
                unit: { type: "string", description: "Nomor unit, mis. GECL 9138 (cocok sebagian)" },
                lokasi: { type: "string", description: "Teks lokasi/KM (cocok sebagian)" },
                shift: { type: "string", enum: ["Shift 1", "Shift 2"] },
                orang: { type: "string", description: "Nama atau NIK karyawan (cocok sebagian)" },
                kelompokkan: { type: "string", enum: Object.keys(SUMBU), description: "Sumbu peringkat/tren" },
                contoh: { type: "integer", description: "Jumlah contoh baris terbaru (0-20, default 5)" },
            },
        },
    },
};

export async function tanyaPelanggaran(arg: any, peminta: Peminta) {
    const pribadi = bolehDataPribadi(peminta);
    if (arg.orang && !pribadi) return { galat: "Pencarian per orang hanya untuk departemen HSE/HRGA." };
    if (SUMBU_PRIBADI.has(arg.kelompokkan) && !pribadi) return { galat: "Peringkat per orang hanya untuk departemen HSE/HRGA." };

    const sumber = ["fms", "safe_distance"].includes(arg.sumber) ? arg.sumber : "semua";
    const semua = await semuaBaris(sumber);
    const ada = (v: string, q?: string) => !q || (v || "").toLowerCase().includes(String(q).toLowerCase());
    const unitQ = arg.unit ? String(arg.unit).replace(/\s+/g, "").toLowerCase() : "";

    const cocok = semua.filter((b) =>
        (!arg.dari || (b.tanggal && b.tanggal >= arg.dari)) &&
        (!arg.sampai || (b.tanggal && b.tanggal <= arg.sampai)) &&
        ada(b.pelanggaran, arg.jenis) && ada(b.lokasiKm, arg.lokasi) &&
        (!arg.shift || b.shift === arg.shift) &&
        (!unitQ || b.unit.replace(/\s+/g, "").toLowerCase().includes(unitQ)) &&
        (!arg.orang || ada(b.nama, arg.orang) || bakukanNik(b.nik) === bakukanNik(arg.orang)));

    const tgl = cocok.map((b) => b.tanggal).filter(Boolean).sort() as string[];
    const hasil: any = {
        sumber: sumber === "semua" ? "FMS + Safe Distance (Google Sheet, GECL)" : sumber === "fms" ? "FMS (Google Sheet, GECL)" : "Safe Distance SiCantik (Google Sheet, GECL)",
        filter: Object.fromEntries(Object.entries(arg).filter(([k, v]) => v != null && v !== "" && k !== "contoh")),
        total: cocok.length,   // angka resmi untuk dijawab; per_jenis hanya rinciannya
        rentang_data: tgl.length ? { pertama: tgl[0], terakhir: tgl[tgl.length - 1] } : null,
        data_terbaru_di_sheet: (semua.map((b) => b.tanggal).filter(Boolean).sort() as string[]).pop() ?? null,
        per_jenis: hitung(cocok, SUMBU.jenis, false, 10),
    };

    const fk = SUMBU[arg.kelompokkan];
    if (fk) {
        hasil[`per_${arg.kelompokkan}`] = hitung(cocok, fk, SUMBU_KRONOLOGIS.has(arg.kelompokkan), 25);
        // Sumbu waktu diurut kronologis; puncaknya dihitung di sini supaya model tidak mencari sendiri.
        if (SUMBU_KRONOLOGIS.has(arg.kelompokkan)) hasil.puncak = hitung(cocok, fk, false, 3);
    }

    const n = Math.max(0, Math.min(20, Number.isFinite(+arg.contoh) ? +arg.contoh : 5));
    hasil.contoh_terbaru = [...cocok]
        .sort((a, b) => `${b.tanggal} ${b.jam}`.localeCompare(`${a.tanggal} ${a.jam}`))
        .slice(0, n)
        .map((b) => ({
            sumber: b.sumber, tanggal: b.tanggal, jam: b.jam, shift: b.shift, unit: b.unit, pelanggaran: b.pelanggaran,
            lokasi: b.lokasiKm || null, jalur: b.jalur || null,
            kecepatan: b.kecepatan != null ? `${b.kecepatan} kph / batas ${b.batas ?? "?"}` : null,
            jarak_detik: b.detik, sanksi: b.sanksi || null, status: b.status || null,
            ...(pribadi ? { nama: b.nama || null, nik: b.nik || null } : {}),
        }));
    if (!pribadi) hasil.catatan = "Nama & NIK disembunyikan: pengguna bukan HSE/HRGA.";
    if (!cocok.length) hasil.catatan = [hasil.catatan, "Tidak ada pelanggaran yang cocok dengan filter ini di data sheet."].filter(Boolean).join(" ");
    return hasil;
}

function hitung(rows: Baris[], f: (b: Baris) => string, kronologis: boolean, maks: number) {
    const m = new Map<string, number>();
    for (const r of rows) { const k = f(r) || "(kosong)"; m.set(k, (m.get(k) || 0) + 1); }
    const arr = Array.from(m, ([nilai, jumlah]) => ({ nilai, jumlah }));
    // ponytail: kronologis diurut waktu lalu dipotong dari ekor (terbaru); lainnya peringkat terbanyak.
    return kronologis
        ? arr.sort((a, b) => a.nilai.localeCompare(b.nilai)).slice(-maks)
        : arr.sort((a, b) => b.jumlah - a.jumlah).slice(0, maks);
}

export const DEF_RIWAYAT_LINTAS = {
    type: "function",
    function: {
        name: "riwayat_pelanggaran_orang",
        description: "Riwayat pelanggaran historis SATU orang LINTAS SEMUA KONTRAKTOR di site (FMS + Safe Distance), termasuk sebelum masuk GECL. Khusus HSE/HRGA. Cari dengan NIK (paling akurat) atau nama.",
        parameters: {
            type: "object",
            properties: {
                nik: { type: "string", description: "NIK site, mis. C-036912" },
                nama: { type: "string", description: "Nama (cocok sebagian) bila NIK tidak diketahui" },
            },
        },
    },
};

export async function riwayatPelanggaranOrang(arg: any, peminta: Peminta) {
    if (!bolehDataPribadi(peminta)) {
        console.warn(`[riwayat-pelanggaran] AKSES DITOLAK (chat): ${peminta.nama} (${peminta.departemen})`);
        return { galat: "Riwayat lintas kontraktor hanya untuk departemen HSE dan HRGA." };
    }
    const kor = await bangunKorpus(false);
    const nik = bakukanNik(arg.nik || "");
    let calon = nik && kor.orang.has(nik) ? [kor.orang.get(nik)!] : [];
    if (!calon.length && arg.nama) {
        const q = String(arg.nama).toUpperCase().replace(/[.,]/g, "").trim();
        calon = Array.from(kor.orang.values()).filter((o) =>
            [o.nama, ...o.namaLain].some((n) => n.toUpperCase().replace(/[.,]/g, "").includes(q)));
    }
    if (!calon.length) return { total: 0, catatan: "Tidak ditemukan di data FMS/Safe Distance lintas kontraktor. Ingat: tab FMS hanya mencakup sebagian kontraktor, jadi 'tidak ada' bisa berarti tidak terekam." };
    if (calon.length > 1) {
        return { catatan: `${calon.length} orang cocok; minta pengguna memilih NIK.`,
            kandidat: calon.slice(0, 10).map((o) => ({ nik: o.nik, nama: o.nama, perusahaan: o.perusahaan, total: o.total })) };
    }
    const o = calon[0];
    console.log(`[riwayat-pelanggaran] ${peminta.nama} (${peminta.departemen}) membuka riwayat ${o.nik} via chat`);
    const baris = (kor.perNik.get(o.nik) || []).slice().sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
    return {
        sumber: "Riwayat lintas kontraktor (Google Sheet FMS + Safe Distance)",
        orang: {
            nik: o.nik, nama: o.nama, nama_lain: o.namaLain,
            peringatan: o.namaBentrok ? "NIK ini tercatat dengan lebih dari satu nama — pastikan orangnya sama sebelum menyimpulkan." : null,
            jabatan: o.jabatan, perusahaan: o.perusahaan, pernah_di_gecl: o.diKita, masuk_gecl_tercatat: o.masukKita,
            total: o.total, fms: o.totalFms, safe_distance: o.totalSd, sebelum_gecl: o.sebelumGecl,
            pertama: o.pertama, terakhir: o.terakhir, sanksi_terberat: o.sanksiTerberat,
            sanksi_aktif: o.sanksiAktif, belum_selesai: o.belumSelesai,
        },
        kejadian: baris.slice(0, 30).map((b) => ({
            sumber: b.sumber, tanggal: b.tanggal, jam: b.jam, perusahaan: b.perusahaan, unit: b.unit,
            pelanggaran: b.pelanggaran, lokasi: b.lokasiKm || null, sanksi: b.sanksi || null,
            masa_berlaku_sanksi: b.masaBerlakuSanksi, status: b.status || null, sebelum_gecl: b.sebelumGecl,
            kecepatan: b.kecepatan != null ? `${b.kecepatan} kph / batas ${b.batas ?? "?"}` : null, jarak_detik: b.detik,
        })),
        ...(baris.length > 30 ? { catatan: `Ditampilkan 30 dari ${baris.length} kejadian terbaru.` } : {}),
    };
}
