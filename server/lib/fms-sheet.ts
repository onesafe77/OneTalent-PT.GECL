/**
 * Sumber pelanggaran FMS: Google Sheet terbitan (tab "semua pelanggaran").
 *
 * Diambil di SERVER, bukan di peramban. Alasannya:
 *   - notifikasi butuh perbandingan berkala tanpa ada yang membuka halaman
 *   - satu tempat menormalkan data, bukan diulang di tiap halaman
 *   - peramban tidak perlu mengunduh 2 MB CSV tiap kali halaman dibuka
 */

export const FMS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTX9zYvZSIKyKXx-DfhyXZCdTMuqhPY_kXu_WxMWEZ-MHPR779_x_0NklR1VjDGN1e7aoloMaDf5jk9/pub?gid=553324121&single=true&output=csv";

/** Hanya perusahaan kita. GEC dan GECL adalah entitas yang sama di sumber ini. */
export const PERUSAHAAN_KITA = ["GEC", "GECL"];

export interface Pelanggaran {
    kunci: string;            // penanda unik baris, dipakai mendeteksi yang baru
    tanggal: string | null;   // YYYY-MM-DD
    jam: string;
    unit: string;
    perusahaan: string;
    pelanggaran: string;      // sudah dibakukan
    lokasiKm: string;
    jalur: string;
    level: string;            // sudah dibakukan
    kecepatan: number | null;
    batas: number | null;
    deviasi: number | null;
    nik: string;
    nama: string;
    jabatan: string;
    kodePelanggaran: string;
    kategori: string;
    sanksi: string;
    masaBerlakuSanksi: string | null;   // sanksi hangus setelah tanggal ini (pemutihan)
    sumber: string;                     // FMS 1.0 / FMS 2.0
    status: string;
    tanggalPemenuhan: string | null;
    durasiClose: number | null;
    verifikasi: string;
    catatanVerifikasi: string;
    evidence: string;
    nomorSheet: string;      // kolom "No" di sheet, untuk penelusuran balik
    eksekutor: string;
    koordinat: string;
    tanggalOpr: string | null;

    // ── kolom turunan (§2.1–2.3) ───────────────────────────────────────────
    tanggalKerja: string | null;   // aturan 06.00: 00.00–05.59 milik hari sebelumnya
    hari: string;                  // Senin … Minggu, dari tanggalKerja
    jamKe: number | null;          // 0–23
    minggu: number | null;         // WEEKNUM ala Excel
    shift: string;                 // Shift 1 (06–18) / Shift 2 (18–06)
    deviasi2: number | null;       // kecepatan - batas, dihitung bila kolom Deviasi kosong
    rentangDeviasi: string;        // 0-5 / 6-10 / 11-20 / 21-30 / > 30 km/jam
    km: number | null;             // angka KM murni
    pitaKm: string;                // pita 5 km: "0-5", "5-10", …
    zona: string;                  // "P7", "P4", … dari kolom lokasi
}

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * §2.3 — hari kerja mulai 06.00. Pelanggaran 00.00–05.59 masih milik hari kerja
 * SEBELUMNYA. Tanpa ini, pola kelelahan dini hari tersebar ke hari yang salah —
 * padahal justru pola itu yang paling ingin dilihat.
 */
export function turunanWaktu(tanggal: string | null, jam: string) {
    const j = parseInt((jam || "").trim().slice(0, 2));
    const jamKe = Number.isFinite(j) ? j : null;
    if (!tanggal) return { tanggalKerja: null, hari: "", jamKe, minggu: null, shift: "" };
    const d = new Date(tanggal + "T12:00:00");
    if (jamKe !== null && jamKe < 6) d.setDate(d.getDate() - 1);
    const p = (n: number) => String(n).padStart(2, "0");
    const tk = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    // WEEKNUM ala Excel: minggu mulai hari Minggu, 1 Januari selalu W1.
    const awal = new Date(d.getFullYear(), 0, 1);
    const doy = Math.floor((d.getTime() - awal.getTime()) / 86400000) + 1;
    const minggu = Math.floor((doy + awal.getDay() - 1) / 7) + 1;
    const shift = jamKe === null ? "" : jamKe >= 6 && jamKe < 18 ? "Shift 1" : "Shift 2";
    return { tanggalKerja: tk, hari: HARI_ID[d.getDay()], jamKe, minggu, shift };
}

function rentangDeviasi(d: number | null): string {
    if (d === null) return "";
    if (d <= 5) return "0-5 km/jam";
    if (d <= 10) return "6-10 km/jam";
    if (d <= 20) return "11-20 km/jam";
    if (d <= 30) return "21-30 km/jam";
    return "> 30 km/jam";
}

/** Pembaca CSV yang menghormati tanda kutip dan koma di dalam sel. */
export function bacaCsv(teks: string): string[][] {
    const baris: string[][] = [];
    let kolom: string[] = [], buf = "", kutip = false;
    for (let i = 0; i < teks.length; i++) {
        const c = teks[i];
        if (kutip) {
            if (c === '"') { if (teks[i + 1] === '"') { buf += '"'; i++; } else kutip = false; }
            else buf += c;
        } else if (c === '"') kutip = true;
        else if (c === ",") { kolom.push(buf); buf = ""; }
        else if (c === "\n") { kolom.push(buf); baris.push(kolom); kolom = []; buf = ""; }
        else if (c !== "\r") buf += c;
    }
    if (buf || kolom.length) { kolom.push(buf); baris.push(kolom); }
    return baris;
}

/** "03/01/2024" (dd/mm/yyyy) -> "2024-01-03". Disusun manual agar tidak kena
 *  pergeseran zona waktu. */
export function tglIndo(s: string): string | null {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec((s || "").trim());
    if (!m) return null;
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Nilai kosong yang menyamar. Selain "#N/A" dan "#REF!" (rumus gagal), sumbernya
 * juga berisi "N/A" dan "-" yang diketik tangan — tanpa ini keduanya terhitung
 * sebagai NIK, dan "N/A" muncul sebagai pengemudi dengan 19 pelanggaran.
 */
const KOSONG = new Set(["", "-", "--", "n/a", "na", "#n/a", "#ref!", "#value!", "null", "0", "invalid", "invalid nik", "tidak ada", "unknown"]);
export const bersih = (v: string) => {
    const s = (v || "").trim();
    return s.startsWith("#") || KOSONG.has(s.toLowerCase()) ? "" : s;
};

export const angkaAtauNull = (s: string) => {
    const n = parseFloat(String(s ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

/**
 * Pembakuan nilai. Sumbernya diketik tangan, jadi satu hal punya beberapa tulisan:
 *   "OverSpeed" / "Overspeed"     -> Overspeed
 *   "1" / "Level 1"               -> Level 1
 *   "#REF!"                       -> kosong (rumus spreadsheet yang rusak)
 * Tanpa ini, satu jenis pelanggaran terhitung sebagai dua kategori berbeda.
 */
function bakukanPelanggaran(v: string): string {
    const s = (v || "").trim();
    if (!s || s.startsWith("#")) return "";
    if (/^overspeed$/i.test(s)) return "Overspeed";
    if (/^merokok$/i.test(s)) return "Merokok";
    if (/handphone|hp\b/i.test(s)) return "Menggunakan Handphone";
    return s;
}
function bakukanLevel(v: string): string {
    const s = (v || "").trim();
    if (!s || s.startsWith("#")) return "";
    const m = /(\d)/.exec(s);
    return m ? `Level ${m[1]}` : s;
}
export function bakukanStatus(v: string): string {
    const s = (v || "").trim();
    return !s || s.startsWith("#") ? "" : s;
}

export function uraikanCsv(teks: string): Pelanggaran[] {
    const baris = bacaCsv(teks);
    if (!baris.length) return [];
    const h = baris[0].map((x) => x.trim());
    const ix = (n: string) => h.indexOf(n);
    const kol = {
        tanggal: ix("Date"), jam: ix("Time"), unit: ix("Vehicle No"), perusahaan: ix("Perusahaan"),
        pelanggaran: ix("Violation"), km: ix("Location (KM)"), jalur: ix("Jalur"), level: ix("Level"),
        kecepatan: ix("Speed (Kph)"), batas: ix("Speed Limit"), deviasi: ix("Deviasi"),
        nik: ix("NIK"), nama: ix("Nama"), jabatan: ix("Jabatan"),
        kode: ix("Kode Pelanggaran"), kategori: ix("Kategori Pelanggaran"), sanksi: ix("Sanksi"),
        masaBerlaku: ix("Masa Berlaku Sanksi"), sumber: ix("Sumber"),
        status: ix("Status"), pemenuhan: ix("Tanggal Pemenuhan"), durasi: ix("Durasi Close"),
        verifikasi: ix("Verifikasi"), catatanVerifikasi: ix("Catatan Verifikasi"),
        evidence: ix("Evidence"), no: ix("No"),
        eksekutor: ix("Nama Eksekutor"), koordinat: ix("Coordinate"), tanggalOpr: ix("Date Opr"),
    };
    const ambil = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");

    return baris.slice(1)
        .filter((r) => r.length > 5 && ambil(r, kol.unit))
        .map((r) => {
            const tanggal = tglIndo(ambil(r, kol.tanggal));
            const unit = ambil(r, kol.unit);
            const jam = ambil(r, kol.jam);
            return {
                // Kunci dari isi baris, bukan nomor urut — nomor urut bergeser
                // bila ada baris disisipkan di tengah spreadsheet.
                kunci: [tanggal, jam, unit, ambil(r, kol.nik), ambil(r, kol.km)].join("|"),
                tanggal, jam, unit,
                perusahaan: ambil(r, kol.perusahaan).toUpperCase(),
                pelanggaran: bakukanPelanggaran(ambil(r, kol.pelanggaran)),
                lokasiKm: ambil(r, kol.km),
                // "Kosongan"/"kosongan" dan "Muatan"/"muatan" adalah hal yang sama;
                // tanpa pembakuan, satu jalur terhitung sebagai dua kategori.
                jalur: (() => { const v = bersih(ambil(r, kol.jalur)); return v ? v[0].toUpperCase() + v.slice(1).toLowerCase() : ""; })(),
                level: bakukanLevel(ambil(r, kol.level)),
                kecepatan: angkaAtauNull(ambil(r, kol.kecepatan)),
                batas: angkaAtauNull(ambil(r, kol.batas)),
                deviasi: angkaAtauNull(ambil(r, kol.deviasi)),
                nik: bersih(ambil(r, kol.nik)), nama: bersih(ambil(r, kol.nama)), jabatan: bersih(ambil(r, kol.jabatan)),
                kodePelanggaran: bersih(ambil(r, kol.kode)), kategori: bersih(ambil(r, kol.kategori)),
                sanksi: bersih(ambil(r, kol.sanksi)),
                masaBerlakuSanksi: tglIndo(ambil(r, kol.masaBerlaku)),
                sumber: bersih(ambil(r, kol.sumber)),
                status: bakukanStatus(ambil(r, kol.status)),
                tanggalPemenuhan: tglIndo(ambil(r, kol.pemenuhan)),
                durasiClose: angkaAtauNull(ambil(r, kol.durasi)),
                verifikasi: bersih(ambil(r, kol.verifikasi)),
                catatanVerifikasi: bersih(ambil(r, kol.catatanVerifikasi)),
                evidence: bersih(ambil(r, kol.evidence)),
                nomorSheet: bersih(ambil(r, kol.no)),
                eksekutor: bersih(ambil(r, kol.eksekutor)),
                koordinat: bersih(ambil(r, kol.koordinat)),
                tanggalOpr: tglIndo(ambil(r, kol.tanggalOpr)),
                ...(() => {
                    const w = turunanWaktu(tanggal, jam);
                    const kec = angkaAtauNull(ambil(r, kol.kecepatan));
                    const bts = angkaAtauNull(ambil(r, kol.batas));
                    // Deviasi hanya bermakna untuk pelanggaran kecepatan. Merokok dan
                    // Handphone tidak punya kecepatan, tapi kolom Deviasi berisi 0 —
                    // tanpa penjagaan ini 43 pelanggaran merokok masuk rentang
                    // "0-5 km/jam" dan menarik turun rerata deviasi.
                    const devKolom = angkaAtauNull(ambil(r, kol.deviasi));
                    const adaKecepatan = kec !== null || bts !== null;
                    const dev = adaKecepatan ? (devKolom ?? (kec !== null && bts !== null ? kec - bts : null)) : null;
                    const lok = ambil(r, kol.km);
                    // Jalan hauling di site ini < 40 km. Nilai seperti 45.417 adalah
                    // serial tanggal Excel yang bocor ke kolom lokasi — dibuang, bukan
                    // digambar sebagai pita KM 45415-45420.
                    const kmMentah = angkaAtauNull((/^[\d.]+/.exec(lok) || [""])[0]);
                    const km = kmMentah !== null && kmMentah >= 0 && kmMentah <= 100 ? kmMentah : null;
                    const zn = (/\b(P\d+)\b/i.exec(lok) || [])[1];
                    return {
                        ...w,
                        deviasi2: dev,
                        rentangDeviasi: rentangDeviasi(dev),
                        km,
                        pitaKm: km === null ? "" : `${Math.floor(km / 5) * 5}-${Math.floor(km / 5) * 5 + 5} km`,
                        zona: zn ? zn.toUpperCase() : "",
                    };
                })(),
            };
        });
}

let cache: { waktu: number; data: Pelanggaran[] } | null = null;
const UMUR_CACHE = 5 * 60 * 1000;   // 5 menit

/** Milik GEC/GECL saja — perilaku bawaan seluruh halaman yang sudah ada. */
export const punyaKita = (x: { perusahaan: string }) =>
    PERUSAHAAN_KITA.includes((x.perusahaan || "").toUpperCase());

/**
 * Sheet diunduh & diurai UTUH (semua kontraktor), lalu disaring saat dikembalikan.
 * Dengan begitu halaman riwayat lintas-kontraktor tidak memicu unduhan kedua,
 * dan pemanggil lama tetap menerima GEC/GECL saja tanpa perubahan apa pun.
 */
export async function ambilPelanggaran(paksa = false, hanyaKita = true): Promise<Pelanggaran[]> {
    if (paksa || !cache || Date.now() - cache.waktu >= UMUR_CACHE) {
        const r = await fetch(FMS_CSV_URL, { redirect: "follow" });
        if (!r.ok) throw new Error(`Gagal mengambil sheet FMS: HTTP ${r.status}`);
        cache = { waktu: Date.now(), data: uraikanCsv(await r.text()) };
    }
    return hanyaKita ? cache.data.filter(punyaKita) : cache.data;
}
