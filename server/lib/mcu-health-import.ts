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

/**
 * Cari kolom identitas berdasarkan NAMA kolom, bukan posisi.
 *
 * Dulu fungsinya diasumsikan: iJK = ci+1, iTTL = ci+2, iDept = ci+3, iPosisi = ci+4.
 * Asumsi itu salah untuk sheet yang susunannya beda, dan salahnya SENYAP:
 *  - "Gg Faal Hepar" tidak punya kolom JK & TTL sama sekali (Nama|Department|Posisi|GOT|GPT),
 *    sehingga nilai GOT/GPT tersimpan sebagai departemen & posisi, dan hilang dari `nilai`.
 *  - 3 sheet "Rekap *" menyisipkan kolom Perusahaan setelah Nama, sehingga jenis kelamin
 *    akan terisi "PT. GECL".
 * Karena ini data medis, salah kolom lebih berbahaya daripada gagal impor.
 *
 * Offset posisi lama tetap dipakai sebagai jaring pengaman bila nama kolom tak ditemukan.
 */
/**
 * Kunci dedup satu baris MCU.
 *
 * Nama saja TIDAK cukup: ada dua orang berbeda bernama "Wakidi" (lahir 1986-07-15 dan
 * 1985-05-11) yang MCU di periode yang sama. Dengan kunci lama (kategori,nama,periode)
 * hasil uji jantung salah satunya hilang tanpa pesan apa pun.
 *
 * Urutan: No Reg (paling tepat, hanya ada di sheet Rekap) -> nama+TTL -> nama.
 */
export function buatKunciBaris(noReg: string | null, nama: string, ttl: Date | null): string {
  if (noReg && noReg !== "-") return noReg;
  if (ttl && !isNaN(ttl.getTime())) {
    const y = ttl.getFullYear(), m = String(ttl.getMonth() + 1).padStart(2, "0"), d = String(ttl.getDate()).padStart(2, "0");
    return `${nama}|${y}-${m}-${d}`;
  }
  return nama;
}

export function cariKolomIdentitas(header: string[], ci: number, namaSheet = "") {
  const cocok = (re: RegExp) => header.findIndex((h) => re.test(h.trim()));
  const pilih = (re: RegExp, tebakanPosisi: number, label: string) => {
    const byNama = cocok(re);
    if (byNama > -1) {
      if (byNama !== tebakanPosisi) {
        console.warn(`[mcu-import] ${namaSheet}: kolom ${label} ada di ${byNama}, ` +
          `bukan ${tebakanPosisi} spt tebakan posisi — pakai hasil pencarian nama.`);
      }
      return byNama;
    }
    // Tidak ketemu lewat nama. Jangan pakai tebakan posisi kalau kolomnya memang
    // TIDAK ADA di sheet ini — itu justru sumber kerusakannya.
    console.warn(`[mcu-import] ${namaSheet}: kolom ${label} tidak ada; dikosongkan.`);
    return -1;
  };

  const iJK = pilih(/^(jk|jenis kelamin|l\/p)$/i, ci + 1, "JK");
  const iTTL = pilih(/^(ttl|tanggal lahir|tgl lahir)$/i, ci + 2, "TTL");
  const iDept = pilih(/^(department|departemen|dept)$/i, ci + 3, "Department");
  const iPosisi = pilih(/^(posisi|jabatan|position)$/i, ci + 4, "Posisi");
  const iNoReg = cocok(/^no\.?\s*(reg|lab)/i);

  // Kolom nilai dimulai setelah kolom identitas TERAKHIR yang benar-benar ada.
  const akhirIdentitas = Math.max(ci, iJK, iTTL, iDept, iPosisi, iNoReg);

  return { iJK, iTTL, iDept, iPosisi, iNoReg, akhirIdentitas };
}

const BULAN_SINGKAT: Record<string, number> = {
  jan: 1, feb: 2, peb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
  jul: 7, agu: 8, ags: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

export function tglExcel(v: any): Date | null {
  if (v == null || v === "" || v === "-") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400 * 1000));

  const str = String(v).trim();
  if (!str || str === "-") return null;

  // Urutan Indonesia: HARI dulu, baru BULAN. new Date("04/07/1999") bawaan JavaScript
  // membacanya sebagai 7 April (gaya Amerika) dan "15/03/1995" langsung tidak sah —
  // padahal tanggal lahir inilah yang dipakai menautkan ke data karyawan.
  // Pakai Date.UTC agar tidak bergeser sehari seperti tanggal bawaan Excel.
  let m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const hari = +m[1], bulan = +m[2];
    if (hari >= 1 && hari <= 31 && bulan >= 1 && bulan <= 12) {
      return new Date(Date.UTC(+m[3], bulan - 1, hari));
    }
  }
  m = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);       // 1999-07-04
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = str.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/);            // 4 Juli 1999
  if (m) {
    const bulan = BULAN_SINGKAT[m[2].slice(0, 3).toLowerCase()];
    if (bulan) return new Date(Date.UTC(+m[3], bulan - 1, +m[1]));
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// TTL di master karyawan tergeser 1 hari dari Excel (jejak impor lama) → beri toleransi.
const selisihHari = (a: any, b: any) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

export interface BarisKesehatan {
  kategori: string; bulan: string | null; tahun: number | null; periode: Date | null;
  nama: string; noReg: string | null; kunciBaris: string;
  jenisKelamin: string | null; tanggalLahir: Date | null;
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
    const { iJK, iTTL, iDept, iPosisi, akhirIdentitas } = cariKolomIdentitas(header, ci, namaSheet);
    const iKesimpulan = header.findIndex(h => /^kesimpulan$/i.test(h));
    const iTL = header.findIndex(h => /^(tindak lanjut|tl)$/i.test(h));

    const kolomNilai: number[] = [];
    for (let c = akhirIdentitas + 1; c < header.length; c++) {
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

      const ambil = (i: number) => (i > -1 ? String(row[i] ?? "").trim() : "");
      const ttl = iTTL > -1 ? tglExcel(row[iTTL]) : null;
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
        noReg: null, kunciBaris: buatKunciBaris(null, nama, ttl),
        nama, jenisKelamin: ambil(iJK) || null, tanggalLahir: ttl,
        departemenSumber: ambil(iDept) || null,
        posisiSumber: ambil(iPosisi) || null,
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
