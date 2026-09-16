/**
 * Pembaca PDF "Laporan Penyelidikan Insiden" (format BIB - HSE - ES - F - 3.03).
 *
 * Dua lapis pembacaan:
 *   1. Lapisan TEKS  — identitas, orang terlibat, tabel penyebab & rekomendasi
 *   2. Lapisan VEKTOR — kotak centang. Centang TIDAK ada di lapisan teks; ia
 *      digambar sebagai jalur kecil. Kotak ±9pt, centang ±6,5pt. Tiap centang
 *      dicocokkan dengan teks terdekat di sebelah kanannya.
 *
 * Hasilnya adalah DRAF untuk diperiksa manusia, bukan untuk langsung disimpan.
 */

const BULAN_ID: Record<string, number> = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

/** "23 April 2026" -> "2026-04-23". Disusun manual, bukan lewat Date, agar
 *  tidak kena pergeseran zona waktu (Jebakan 6.5). */
export function tanggalIndo(s: string | null | undefined): string | null {
    const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s || "");
    if (!m) return null;
    const b = BULAN_ID[m[2].toLowerCase()];
    if (!b) return null;
    return `${m[3]}-${String(b).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

/** "21.00" -> rentang master jam "21.01 - 22.00". */
export function keRentangJam(jam: string | null): string | null {
    const m = /(\d{1,2})[.:](\d{2})/.exec(jam || "");
    if (!m) return null;
    let h = parseInt(m[1]);
    if (parseInt(m[2]) === 0) h = (h + 23) % 24;   // 21.00 masuk rentang 20.01-21.00
    return `${String(h).padStart(2, "0")}.01 - ${String((h + 1) % 24).padStart(2, "0")}.00`;
}

export interface DrafInsiden {
    no_registrasi: string | null; judul: string | null; tanggal: string | null;
    jam: string | null; lokasi: string | null; perusahaan: string | null;
    custodian: string | null; klasifikasi: string | null; mekanisme: string | null;
    kategori_khusus: string | null; klasifikasi_lost_cost: string | null;
    nama_terlibat: string | null; nik_terlibat: string | null; jabatan: string | null;
    /** SEMUA orang di laporan. Pemilihan siapa yang dicatat dilakukan di
     *  pemanggil, setelah dicocokkan dengan daftar manpower. */
    orang: { nik: string; jabatan: string; lahir: string | null }[];
    usia: number | null; hari_kerja: string | null; catatan: string | null;
    penyebab: { jenis: string; kode: string; uraian: string; detail: string }[];
    rekomendasi: { uraian: string; pic: string; due_date: string | null }[];
    tercentang: string[];
    peringatan: string[];
}

/** Kode BARAICA -> jenis penyebab (§4.3). */
const JENIS_DARI_KODE = (kode: string) => {
    const c = (kode || "").trim()[0]?.toUpperCase();
    if (c === "T") return "TTA";
    if (c === "K") return "KTA";
    if (c === "P") return "PRIBADI";
    if (c === "M") return "PEKERJAAN";
    return "TTA";
};

/** Usia pada saat kejadian, dari tanggal lahir. */
export function usiaSaatKejadian(lahir: string | null, tanggal: string | null): number | null {
    if (!lahir || !tanggal) return null;
    const l = lahir.split("-").map(Number), k = tanggal.split("-").map(Number);
    return k[0] - l[0] - (k[1] < l[1] || (k[1] === l[1] && k[2] < l[2]) ? 1 : 0);
}

export async function bacaPdfInsiden(buf: Buffer): Promise<DrafInsiden> {
    // SATU pustaka saja. Memakai pdf-parse dan pdfjs bersamaan menimbulkan
    // bentrok versi worker ("API version does not match Worker version").
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const peringatan: string[] = [];

    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
    const tercentang: string[] = [];
    let jumlahKotak = 0;
    const barisTeks: string[] = [];

    for (let np = 1; np <= doc.numPages; np++) {
        const page = await doc.getPage(np);
        const vp = page.getViewport({ scale: 1 });

        // Teks disusun ulang jadi baris: kelompokkan menurut y, urutkan menurut x.
        const items = (await page.getTextContent()).items as any[];
        const kata = items.filter((it) => it.str?.trim())
            .map((it) => ({ s: it.str.trim(), x: it.transform[4], y: vp.height - it.transform[5] }));
        const kelompok = new Map<number, typeof kata>();
        for (const k of kata) {
            const kunci = Math.round(k.y / 4);      // toleransi 4pt agar satu baris tidak terpecah
            (kelompok.get(kunci) ?? kelompok.set(kunci, []).get(kunci)!).push(k);
        }
        [...kelompok.entries()].sort((a, b) => a[0] - b[0]).forEach(([, isi]) =>
            barisTeks.push(isi.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")));

        // Jalur vektor: kotak ±9pt, centang ±6,5pt.
        const ops = await page.getOperatorList();
        const tanda: { x: number; y: number }[] = [];
        for (let i = 0; i < ops.fnArray.length; i++) {
            if (ops.fnArray[i] !== pdfjs.OPS.constructPath) continue;
            const bb = Array.from(ops.argsArray[i][2] as Float32Array) as number[];
            const w = bb[2] - bb[0], h = bb[3] - bb[1];
            if (w > 7 && w < 12 && h > 7 && h < 12) jumlahKotak++;
            else if (w > 3.5 && w < 7 && h > 3.5 && h < 7) tanda.push({ x: bb[0], y: bb[1] });
        }
        for (const c of tanda) {
            const dekat = kata.filter((t) => t.x > c.x && Math.abs(t.y - c.y) < 8).sort((a, b) => a.x - b.x)[0];
            if (dekat) tercentang.push(dekat.s);
        }
    }
    await doc.destroy();

    const teks = barisTeks.join("\n");
    const ambil = (re: RegExp) => { const m = re.exec(teks); return m ? m[1].trim() : null; };

    if (jumlahKotak === 0) peringatan.push("Tidak ada kotak centang terdeteksi — tata letak formulir mungkin berbeda. Periksa bagian klasifikasi secara manual.");
    if (tercentang.length === 0 && jumlahKotak > 0) peringatan.push("Kotak ditemukan tetapi tidak satu pun tercentang. Pastikan formulirnya memang kosong.");

    // ── 3. petakan centang ke kolom ─────────────────────────────────────────
    const cocok = (daftar: string[]) => tercentang.find((t) => daftar.some((d) => t.toLowerCase() === d.toLowerCase())) ?? null;
    const klasifikasi = cocok(["Fatal", "LTI", "MTI", "FAI", "PD", "NM"]);
    const kategoriKhusus = cocok(["Potensial Fatal", "Kelelahan", "Kebakaran", "Cedera Jari & Tangan",
        "Lain-lain", "Keracunan", "PAK", "PTK", "Dehidrasi/HeatStres"]);
    const rugi = tercentang.find((t) => /Jt\b/i.test(t)) ?? null;
    const mekanisme = tercentang.find((t) => t.includes("/") && t.length > 14 && !/Aturan Baku/i.test(t)) ?? null;

    // ── 4. orang terlibat ───────────────────────────────────────────────────
    const orang = [...teks.matchAll(/NIK\s+(C-\d+)\s+DoH BIB\s+([^\n]*)\nJabatan\s+([^\n]*?)\s+Tgl Lahir\s+(\d{1,2}\s+\w+\s+\d{4})/g)]
        .map((m) => ({ nik: m[1], jabatan: m[3].trim(), lahir: tanggalIndo(m[4]) }));

    const hariKerja = ambil(/Hari Kerja ke\s+(\d+)/);
    const tanggal = tanggalIndo(ambil(/Tanggal & waktu kejadian\s+(\d{1,2}\s+\w+\s+\d{4})/));


    // ── 5. penyebab (bagian N) & rekomendasi (bagian O) ─────────────────────
    const potong = (a: string, b: string) => {
        const i = teks.indexOf(a), j = teks.indexOf(b);
        return i < 0 ? "" : teks.slice(i, j < 0 ? undefined : j);
    };
    const penyebab = [...potong("N. KLASIFIKASI", "O. TINDAKAN")
        .matchAll(/(?:^|\n)(\d{1,2})\s+([TKPM]\d+\.\d+)\s+([^\n]+)/g)]
        .map((m) => ({ jenis: JENIS_DARI_KODE(m[2]), kode: m[2], uraian: m[3].trim(), detail: "" }));

    const rekomendasi = [...potong("O. TINDAKAN", "P. TIM")
        // Kode bisa lebih dari satu: "T1.1, P8.5, M5.13, M3.1". Pola harus
        // menelan SELURUH deretan kode, kalau tidak sisanya bocor ke uraian.
        .matchAll(/(?:^|\n)(\d{1,2})\s+((?:[TKPM]\d+\.\d+(?:\s*,\s*)?)+)\s+([\s\S]+?)(\d{1,2}\s+\w+\s+\d{4})/g)]
        .map((m) => {
            const isi = m[3].replace(/\s+/g, " ").trim();
            // "uraian ... NAMA PIC" — PIC ditulis HURUF BESAR di akhir.
            const pic = /([A-Z][A-Z\s,.]{6,})$/.exec(isi)?.[1]?.trim() ?? "";
            return { uraian: pic ? isi.slice(0, isi.length - pic.length).trim() : isi, pic, due_date: tanggalIndo(m[4]) };
        });

    return {
        no_registrasi: ambil(/([A-Z]{3}-[A-Z]{3}-INC-\d{4}-\d{2}-\d{3})/),
        judul: ambil(/Judul Laporan\s+(.+?)\s*\n/),
        tanggal,
        jam: keRentangJam(ambil(/Tanggal & waktu kejadian\s+\d{1,2}\s+\w+\s+\d{4}\s+([\d.:]+)\s*WITA/)),
        lokasi: ambil(/Lokasi kejadian\s+(.+?)\s*\n/),
        perusahaan: ambil(/Perusahaan\s+(PT [^\n]+?)\s+Dept/),
        custodian: ambil(/Dept\. kustodian\s+(.+?)\s*\n/),
        klasifikasi, mekanisme, kategori_khusus: kategoriKhusus, klasifikasi_lost_cost: rugi,
        nama_terlibat: null, nik_terlibat: null, jabatan: null, orang,
        usia: null, hari_kerja: hariKerja,
        catatan: potong("E. DESKRIPSI SINGKAT INSIDEN", "F. FOTO")
            .replace("E. DESKRIPSI SINGKAT INSIDEN", "").replace(/\s+/g, " ").trim().slice(0, 4000) || null,
        penyebab, rekomendasi, tercentang, peringatan,
    };
}
