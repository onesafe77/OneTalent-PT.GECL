// Pembaca 3 sheet "Rekap *" — hasil MCU lengkap satu orang (fisik, riwayat, lab).
//
// Dipisah dari mcu-health-import.ts karena bentuk header-nya beda: dua tingkat
// (baris grup + baris field) dengan sel grup ter-merge, dan sebagian kolom ekor
// justru memakai baris grup sebagai header. Menyelipkan mode ini ke loop 14 sheet
// penyakit akan mempersulit jalur yang sudah berjalan.
//
// Urutan & kunci kolom TIDAK diturunkan dari file yang diunggah, melainkan dari
// daftar beku shared/mcu-rekap-columns.ts. Alasannya: sel kosong tidak disimpan,
// jadi 108 kolom Rekap Fisik yang kosong total tak akan pernah muncul di `nilai` —
// tanpa daftar kanonik, tombol "tampilkan kolom kosong" mustahil dibuat.

import { REKAP_DEFS, REKAP_KATEGORI, type RekapKategori } from "@shared/mcu-rekap-columns";
import {
  BULAN_ID_URUT, kunciNama, tglExcel, buatKunciBaris,
  type BarisKesehatan, type HasilBaca,
} from "./mcu-health-import";

const t = (v: any) => String(v ?? "").trim();

/** Daftar kolom BERISI menurut urutan, dengan grup ter-merge sudah dibawa ke kanan.
 *  Ini satu-satunya sumber kebenaran posisi: indeks larik tidak bisa dipakai langsung
 *  karena ada kolom kosong di kiri (Rekap Fisik) maupun di kanan. */
function kolomBerisi(G: string[], H: string[]) {
  const lebar = Math.max(G.length, H.length);
  let grupAktif = "";
  const semua: { label: string; grup: string; idx: number }[] = [];
  for (let i = 0; i < lebar; i++) {
    if (G[i]) grupAktif = G[i];                 // sel grup ter-merge: bawa ke kanan
    const label = H[i] || G[i];                 // kolom ekor: baris grup berperan sbg header
    if (!label) continue;
    semua.push({ label, grup: H[i] ? grupAktif : "", idx: i });
  }
  return semua;
}

/** Bangun kunci kolom dari sheet yang diunggah, mengikuti aturan yang sama dgn generator. */
function kunciDariSheet(semua: ReturnType<typeof kolomBerisi>): { key: string; idx: number }[] {
  const dipakai: Record<string, number> = {};
  const out: { key: string; idx: number }[] = [];
  // 11 kolom identitas di depan & 2 kolom periode di belakang punya slot sendiri.
  for (const k of semua.slice(11, -2)) {
    if (k.label === "KESIMPULAN" || k.label === "REKOMENDASI") continue;
    let key = (k.grup ? `${k.grup} — ` : "") + k.label;
    if (dipakai[key]) { dipakai[key]++; key = `${key} (${dipakai[key]})`; }
    else dipakai[key] = 1;
    out.push({ key, idx: k.idx });
  }
  return out;
}

export interface HasilBacaRekap extends HasilBaca {
  /** Selisih antara sheet yang diunggah dan daftar beku — ditampilkan ke pengguna. */
  peringatan: string[];
}

export function bacaRekapMCU(XLSX: any, wb: any, karyawan: any[]): HasilBacaRekap {
  const idxKaryawan = new Map<string, any[]>();
  for (const e of karyawan) {
    const k = kunciNama(e.name);
    if (!idxKaryawan.has(k)) idxKaryawan.set(k, []);
    idxKaryawan.get(k)!.push(e);
  }
  const selisihHari = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 86400000;

  const baris: BarisKesehatan[] = [];
  const perKategori: Record<string, number> = {};
  const sheetDilewati: string[] = [];
  const peringatan: string[] = [];

  for (const kategori of REKAP_KATEGORI) {
    const def = REKAP_DEFS[kategori as RekapKategori];
    const ws = wb.Sheets[def.sheet];
    if (!ws) { sheetDilewati.push(def.sheet); continue; }

    // Opsi WAJIB sama persis dengan scripts/gen-rekap-columns.ts. `blankrows: false`
    // membuang baris kosong, sehingga nomor baris grup/header di daftar beku hanya
    // sahih dengan opsi ini. Beda sedikit saja, seluruh pemetaan kolom meleset.
    const grid: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null, raw: false });

    // Baris header DICARI, bukan diasumsikan. Nomor baris di daftar beku hanya sahih
    // untuk file asli; template yang kita hasilkan sendiri atau file yang diberi baris
    // judul tambahan akan bergeser. Baris grup selalu tepat di atas baris header.
    let bh = -1;
    for (let r = 0; r < Math.min(grid.length, 12) && bh === -1; r++) {
      const baris = (grid[r] || []).map(t);
      if (baris.includes("Nama") && baris.some((x: string) => /^no\.?\s*reg/i.test(x))) bh = r;
    }
    if (bh === -1) bh = def.barisHeader;              // jaring pengaman
    const bg = Math.max(0, bh - 1);

    const G = (grid[bg] || []).map(t);
    const H = (grid[bh] || []).map(t);

    // Penjaga: kalau blok identitas tidak seperti yang diharapkan, berarti baris
    // header meleset. Lewati sheet dengan pesan jelas — jangan simpan data acak.
    const semua = kolomBerisi(G, H);
    const id11 = semua.slice(0, 11);
    const ekor2 = semua.slice(-2);
    if (id11[2]?.label !== "Nama" || id11[1]?.label !== "No Reg/No Lab"
      || !/^bulan$/i.test(ekor2[0]?.label || "") || !/^tahun$/i.test(ekor2[1]?.label || "")) {
      sheetDilewati.push(def.sheet);
      peringatan.push(`${def.sheet}: susunan kolom tak dikenali `
        + `(depan: ${id11.slice(0, 3).map(x => x.label).join(" | ")}; `
        + `belakang: ${ekor2.map(x => x.label).join(" | ")}) — sheet dilewati`);
      continue;
    }

    const hidup = kunciDariSheet(semua);

    // Cocokkan menurut POSISI, bukan nama: urutan kolom sheet rekap jauh lebih stabil
    // daripada teks judulnya. Bila beda, kunci dari daftar beku yang menang supaya
    // baris lama tetap sebanding — tapi selisihnya dilaporkan, tidak ditelan diam-diam.
    const kolomNilai: { key: string; idx: number }[] = [];
    for (let i = 0; i < Math.max(hidup.length, def.kolom.length); i++) {
      const beku = def.kolom[i], live = hidup[i];
      if (beku && live) {
        // Template yang kita hasilkan memakai label yang diperjelas ("Irama (Pernafasan)")
        // untuk 4 kolom yang namanya kembar, sedangkan daftar beku memakai akhiran "(2)".
        // Keduanya kolom yang sama — jangan dilaporkan sebagai selisih.
        const samaLabel = live.key.endsWith(` — ${beku.label}`) || live.key === beku.label;
        if (beku.key !== live.key && !samaLabel) {
          peringatan.push(`${def.sheet} kolom ${live.idx + 1}: "${live.key}" != "${beku.key}" (pakai yg beku)`);
        }
        kolomNilai.push({ key: beku.key, idx: live.idx });
      } else if (live) {
        // Kolom tambahan yang belum ada di daftar beku — simpan, jangan dibuang.
        peringatan.push(`${def.sheet}: kolom tambahan "${live.key}" ikut disimpan`);
        kolomNilai.push(live);
      } else if (beku) {
        peringatan.push(`${def.sheet}: kolom "${beku.key}" tidak ada di file ini`);
      }
    }

    // Kolom identitas: 11 kolom berisi PERTAMA. Diambil menurut posisi karena
    // Rekap Fisik punya kolom A kosong sehingga indeksnya bergeser satu.
    const [, iNoReg, iNama, , iJK, iTTL, iDept, iPosisi] = id11.map((x) => x.idx);
    const [iBulan, iTahun] = ekor2.map((x) => x.idx);

    const iKesimpulan = H.findIndex((h: string) => /^kesimpulan$/i.test(h));
    const iRekomendasi = H.findIndex((h: string) => /^rekomendasi$/i.test(h));
    const iKesG = G.findIndex((g: string) => /^kesimpulan$/i.test(g));
    const iRekG = G.findIndex((g: string) => /^rekomendasi$/i.test(g));

    const perKunci = new Map<string, BarisKesehatan>();

    for (let r = bh + 1; r < grid.length; r++) {
      const row = grid[r] || [];
      const nama = t(row[iNama]);
      if (!nama || nama === "-") continue;

      const bulan = t(row[iBulan]);
      const tahun = parseInt(t(row[iTahun]));
      const bulanIdx = BULAN_ID_URUT.findIndex((b) => b.toLowerCase() === bulan.toLowerCase());
      const periode = (!isNaN(tahun) && bulanIdx > -1) ? new Date(Date.UTC(tahun, bulanIdx, 1)) : null;

      const ttl = tglExcel(row[iTTL]);
      const noReg = t(row[iNoReg]) || null;

      const nilai: Record<string, string> = {};
      for (const k of kolomNilai) {
        const v = t(row[k.idx]);
        if (v && v !== "-") nilai[k.key] = v;
      }

      let employeeId: string | null = null;
      let statusTaut = "BELUM";
      const kandidat = idxKaryawan.get(kunciNama(nama)) || [];
      if (kandidat.length) {
        const pasti = ttl ? kandidat.find((e: any) => e.dob && selisihHari(new Date(e.dob), ttl) <= 1) : null;
        if (pasti) { employeeId = pasti.id; statusTaut = "OTOMATIS"; }
        else if (kandidat.length === 1) { employeeId = kandidat[0].id; statusTaut = "PERLU_KONFIRMASI"; }
      }

      const kb = buatKunciBaris(noReg, nama, ttl);
      const ambilG = (iH: number, iG: number) => {
        const i = iH > -1 ? iH : iG;
        return i > -1 ? t(row[i]) || null : null;
      };

      const b: BarisKesehatan = {
        kategori, bulan: bulan || null, tahun: isNaN(tahun) ? null : tahun, periode,
        nama, noReg, kunciBaris: kb,
        jenisKelamin: t(row[iJK]) || null, tanggalLahir: ttl,
        departemenSumber: t(row[iDept]) || null,
        posisiSumber: t(row[iPosisi]) || null,
        employeeId, statusTaut,
        nilai: Object.keys(nilai).length ? nilai : null,
        kesimpulan: ambilG(iKesimpulan, iKesG),
        tindakLanjut: ambilG(iRekomendasi, iRekG),
      };

      // Dedup di memori: baris kembar persis di Excel (mis. Wakidi C-0883 muncul 2x)
      // digabung di sini, bukan diserahkan ke upsert yang akan menelannya diam-diam.
      const kunciPenuh = `${kategori}|${kb}|${periode ? periode.toISOString().slice(0, 10) : "-"}`;
      perKunci.set(kunciPenuh, b);
    }

    const hasil = Array.from(perKunci.values());
    baris.push(...hasil);
    perKategori[kategori] = hasil.length;
  }

  return { baris, perKategori, sheetDilewati, peringatan };
}
