// Pembaca file "Database & Mapping profil Kesehatan Karyawan" (14 sheet penyakit).
// Dipakai bersama oleh endpoint import dan skrip migrasi, supaya logikanya satu saja.

export const BULAN_ID_URUT = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// Nama sheet → kategori yang ditampilkan. Sheet "Rekap *" sengaja dilewati:
// formatnya beda (374 kolom hasil MCU lengkap) dan ditangani terpisah.
export const KATEGORI_SHEET: Record<string, string> = {
  "HT": "Hipertensi",
  "Overweight Obesitas": "Overweight/Obesitas",
  "DM": "Diabetes Melitus",
  "Hiperkolesterolemia": "Hiperkolesterolemia",
  "Hipertriglisemia": "Hipertrigliseridemia",
  "Gout": "Gout/Asam Urat",
  "HbSag": "HbsAg",
  "Gg Faal Hepar": "Gangguan Faal Hepar",
  "Gangguan Ginjal": "Gangguan Ginjal",
  "Rontgen": "Rontgen",
  "EKG": "EKG",
  "Treadmill": "Treadmill",
  "Audiometri": "Audiometri",
  "Spirometri": "Spirometri",
};

const ALIAS: Record<string, string> = {
  m: "muhammad", moh: "muhammad", mohammad: "muhammad", muh: "muhammad",
  ahmad: "achmad", abd: "abdul", rizki: "rizky", rizqi: "rizky",
};

/** Kunci nama tahan-variasi: huruf saja, alias disamakan, urutan kata diabaikan. */
export function kunciNama(s: any): string {
  return String(s || "").normalize("NFKD").replace(/[^\x00-\x7F]/g, "")
    .toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean)
    .map(w => ALIAS[w] ?? w).sort().join(" ");
}

export function tglExcel(v: any): Date | null {
  if (v == null || v === "" || v === "-") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400 * 1000));
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

// TTL di master karyawan tergeser 1 hari dari Excel (jejak impor lama) → beri toleransi.
const selisihHari = (a: any, b: any) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

export interface BarisKesehatan {
  kategori: string; bulan: string | null; tahun: number | null; periode: Date | null;
  nama: string; jenisKelamin: string | null; tanggalLahir: Date | null;
  departemenSumber: string | null; posisiSumber: string | null;
  employeeId: string | null; statusTaut: string;
  nilai: Record<string, string> | null; kesimpulan: string | null; tindakLanjut: string | null;
}

export interface HasilBaca {
  baris: BarisKesehatan[];
  perKategori: Record<string, number>;
  sheetDilewati: string[];
}

/**
 * Baca workbook (objek hasil XLSX.readFile) dan tautkan ke master karyawan.
 * Penautan: nama cocok + TTL cocok (±1 hari) = OTOMATIS; nama cocok tunggal tanpa
 * TTL = PERLU_KONFIRMASI; nama ganda / tak ketemu = BELUM (ditautkan manual di halaman).
 * Sengaja TIDAK menebak nama mirip — ini data medis, salah tempel berbahaya.
 */
export function bacaWorkbookKesehatan(XLSX: any, wb: any, karyawan: any[]): HasilBaca {
  const idxKaryawan = new Map<string, any[]>();
  for (const e of karyawan) {
    const k = kunciNama(e.name);
    if (!idxKaryawan.has(k)) idxKaryawan.set(k, []);
    idxKaryawan.get(k)!.push(e);
  }

  const baris: BarisKesehatan[] = [];
  const perKategori: Record<string, number> = {};
  const sheetDilewati: string[] = [];

  for (const [namaSheet, kategori] of Object.entries(KATEGORI_SHEET)) {
    const ws = wb.Sheets[namaSheet];
    if (!ws) { sheetDilewati.push(namaSheet); continue; }
    const grid: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });

    // Baris header dicari (bukan diasumsikan) — tiap sheet berbeda posisinya.
    let hr = -1, ci = -1;
    for (let r = 0; r < Math.min(grid.length, 10) && hr === -1; r++) {
      for (let c = 0; c < (grid[r]?.length || 0); c++) {
        if (String(grid[r][c] || "").trim() === "Nama") { hr = r; ci = c; break; }
      }
    }
    if (hr === -1) { sheetDilewati.push(namaSheet); continue; }

    const header: string[] = (grid[hr] || []).map((h: any) => String(h || "").trim());
    const kolom = (nm: string) => header.findIndex(h => h.toLowerCase() === nm.toLowerCase());
    const iBulan = kolom("Bulan"), iTahun = kolom("Tahun");
    const iJK = ci + 1, iTTL = ci + 2, iDept = ci + 3, iPosisi = ci + 4;
    const iKesimpulan = header.findIndex(h => /^kesimpulan$/i.test(h));
    const iTL = header.findIndex(h => /^(tindak lanjut|tl)$/i.test(h));

    const kolomNilai: number[] = [];
    for (let c = iPosisi + 1; c < header.length; c++) {
      if (!header[c] || c === iKesimpulan || c === iTL) continue;
      kolomNilai.push(c);
    }

    let n = 0;
    for (let r = hr + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const nama = String(row[ci] || "").trim();
      if (!nama || nama === "-") continue;

      const bulan = iBulan > -1 ? String(row[iBulan] || "").trim() : "";
      const tahun = iTahun > -1 ? parseInt(String(row[iTahun] || "")) : NaN;
      const bulanIdx = BULAN_ID_URUT.findIndex(b => b.toLowerCase() === bulan.toLowerCase());
      const periode = (!isNaN(tahun) && bulanIdx > -1) ? new Date(Date.UTC(tahun, bulanIdx, 1)) : null;

      const ttl = tglExcel(row[iTTL]);
      const nilai: Record<string, string> = {};
      for (const c of kolomNilai) {
        const v = String(row[c] ?? "").trim();
        if (v && v !== "-") nilai[header[c]] = v;
      }

      let employeeId: string | null = null;
      let statusTaut = "BELUM";
      const kandidat = idxKaryawan.get(kunciNama(nama)) || [];
      if (kandidat.length) {
        const pasti = ttl ? kandidat.find((e: any) => e.dob && selisihHari(e.dob, ttl) <= 1) : null;
        if (pasti) { employeeId = pasti.id; statusTaut = "OTOMATIS"; }
        else if (kandidat.length === 1) { employeeId = kandidat[0].id; statusTaut = "PERLU_KONFIRMASI"; }
      }

      baris.push({
        kategori, bulan: bulan || null, tahun: isNaN(tahun) ? null : tahun, periode,
        nama, jenisKelamin: String(row[iJK] || "").trim() || null, tanggalLahir: ttl,
        departemenSumber: String(row[iDept] || "").trim() || null,
        posisiSumber: String(row[iPosisi] || "").trim() || null,
        employeeId, statusTaut,
        nilai: Object.keys(nilai).length ? nilai : null,
        kesimpulan: iKesimpulan > -1 ? String(row[iKesimpulan] || "").trim() || null : null,
        tindakLanjut: iTL > -1 ? String(row[iTL] || "").trim() || null : null,
      });
      n++;
    }
    perKategori[kategori] = n;
  }

  return { baris, perKategori, sheetDilewati };
}
