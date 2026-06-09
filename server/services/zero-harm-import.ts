// Parser import iSafe/FMS untuk Zero Harm (SIMANTIK).
// Baca workbook .xlsx → map kolom per sheet (by header) → normalisasi → baris siap upsert.
import * as XLSX from "xlsx";
import crypto from "crypto";

function hash(s: string) { return crypto.createHash("sha1").update(s).digest("hex").slice(0, 24); }
function lc(s: any) { return String(s ?? "").trim().toLowerCase(); }

// Ambil nilai kolom by nama header (case-insensitive, cocok sebagian).
function pick(row: Record<string, any>, ...names: string[]): string {
  const keys = Object.keys(row);
  for (const n of names) {
    const target = lc(n);
    const k = keys.find((kk) => lc(kk) === target) || keys.find((kk) => lc(kk).includes(target));
    if (k && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}
const numOrNull = (v: string) => { const n = parseFloat(String(v).replace(/[^\d.-]/g, "")); return isNaN(n) ? null : n; };
const intOrNull = (v: string) => { const n = numOrNull(v); return n === null ? null : Math.round(n); };
const dateOrNull = (v: any) => { if (!v) return null; if (v instanceof Date) return v; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

type Parsed = { hazard: any[]; inspeksi: any[]; observasi: any[]; opk: any[]; attendance: any[]; fms: any[] };

export function parseZeroHarmWorkbook(buffer: Buffer): { rows: Parsed; counts: Record<string, number>; sheetsFound: string[] } {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const found = wb.SheetNames;
  const sheet = (name: string): Record<string, any>[] => {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  };
  const rows: Parsed = { hazard: [], inspeksi: [], observasi: [], opk: [], attendance: [], fms: [] };

  // ---- Hazard ----
  for (const r of sheet("Hazard")) {
    const hid = pick(r, "Hazard ID");
    if (!hid && !pick(r, "Judul Laporan")) continue;
    rows.hazard.push({
      sourceKey: "HZ-" + hash(JSON.stringify(r)),
      hazardId: hid || null,
      nikPelapor: pick(r, "NIK Pelapor") || null,
      namaPelapor: pick(r, "Nama Pelapor") || null,
      perusahaanPelapor: pick(r, "Perusahaan Pelapor") || null,
      departemenPelapor: pick(r, "Departemen Pelapor") || null,
      jenisTemuan: pick(r, "Jenis Temuan") || null,
      resiko: pick(r, "Resiko Temuan") || null,
      status: pick(r, "Status Laporan") || null,
      ketidaksesuaian: pick(r, "Ketidaksesuaian") || null,
      tanggalLaporan: dateOrNull(pick(r, "Tanggal Laporan")),
      week: pick(r, "Week") || null, month: pick(r, "Month") || null, quartal: pick(r, "Quartal") || null,
      raw: r,
    });
  }
  // ---- Inspeksi ----
  for (const r of sheet("Inspeksi")) {
    const id = pick(r, "ID Inspeksi");
    if (!id && !pick(r, "Judul Inspeksi")) continue;
    rows.inspeksi.push({
      sourceKey: "IN-" + hash(JSON.stringify(r)),
      idInspeksi: id || null,
      namaPelaksana: pick(r, "Nama Pelaksana") || null,
      nikPelaksana: pick(r, "NIK Pelaksana") || null,
      perusahaan: pick(r, "Perusahaan Pelaksana") || null,
      judul: pick(r, "Judul Inspeksi") || null,
      lokasi: pick(r, "Lokasi Inspeksi") || null,
      jenisObjek: pick(r, "Jenis Objek Inspeksi") || null,
      jumlahTemuan: intOrNull(pick(r, "Jumlah Temuan")),
      jumlahClose: intOrNull(pick(r, "Jumlah Close")),
      status: pick(r, "Status Inspeksi") || null,
      kesesuaianWaktu: pick(r, "Kesesuaian Waktu") || null,
      tanggal: dateOrNull(pick(r, "Tanggal Inspeksi")),
      week: pick(r, "Week") || null, month: pick(r, "Month") || null, quartal: pick(r, "Quartal") || null,
      raw: r,
    });
  }
  // ---- Observasi ----
  for (const r of sheet("Observasi")) {
    const id = pick(r, "ID Observasi");
    if (!id && !pick(r, "Judul Observasi")) continue;
    rows.observasi.push({
      sourceKey: "OB-" + hash(JSON.stringify(r)),
      idObservasi: id || null,
      judul: pick(r, "Judul Observasi") || null,
      lokasi: pick(r, "Lokasi observasi") || null,
      perusahaanPekerja: pick(r, "Perusahaan Pekerja") || null,
      namaPja: pick(r, "Nama PJA") || null,
      nikPja: pick(r, "NIK PJA") || null,
      namaPelapor: pick(r, "Nama Pelapor") || null,
      jumlahTemuan: intOrNull(pick(r, "Jumlah Temuan")),
      jumlahClose: intOrNull(pick(r, "Jumlah Close")),
      status: pick(r, "Status Observasi") || null,
      tanggal: dateOrNull(pick(r, "Tanggal Observasi")),
      week: pick(r, "Week") || null, month: pick(r, "Month") || null, quartal: pick(r, "Quartal") || null,
      raw: r,
    });
  }
  // ---- OPK (observasi per item checklist) ----
  for (const r of sheet("OPK")) {
    const id = pick(r, "ID Observasi"); const item = pick(r, "Item Checklist");
    if (!id && !pick(r, "Judul Observasi")) continue;
    rows.opk.push({
      sourceKey: "OP-" + hash(JSON.stringify(r)),
      idObservasi: id || null,
      namaObserver: pick(r, "Nama Observer") || null,
      nikObserver: pick(r, "NIK Observer") || null,
      perusahaanObserver: pick(r, "Perusahaan Observer") || null,
      judul: pick(r, "Judul Observasi") || null,
      lokasi: pick(r, "Lokasi Observasi") || null,
      sublokasi: pick(r, "Sublokasi Observasi") || null,
      nikUnitTerlibat: pick(r, "NIK / No Unit Terlibat", "NIK / No Unit") || null,
      namaTerlibat: pick(r, "Nama Orang Terlibat") || null,
      perusahaanTerlibat: pick(r, "Perusahaan Orang / Unit Terlibat", "Perusahaan Orang") || null,
      itemChecklist: item || null,
      hasil: pick(r, "Hasil (Concatenate)", "Hasil") || null,
      detailTemuan: pick(r, "Detail Temuan") || null,
      deviasi: pick(r, "Deviasi") || null,
      jenisPekerjaan: pick(r, "Jenis Pekerjaan") || null,
      tanggal: dateOrNull(pick(r, "Tanggal Observasi")),
      week: pick(r, "Week") || null, month: pick(r, "Month") || null, quartal: pick(r, "Quartal") || null,
      raw: r,
    });
  }
  // ---- Attendance ----
  for (const r of sheet("Attendance")) {
    const ev = pick(r, "Nama Event"); const nik = pick(r, "NIK");
    if (!ev && !nik) continue;
    rows.attendance.push({
      sourceKey: "AT-" + hash(JSON.stringify(r)),
      namaEvent: ev || null,
      tipeEvent: pick(r, "Tipe Event") || null,
      peserta: pick(r, "Peserta") || null,
      nik: nik || null,
      jabatan: pick(r, "jabatan") || null,
      departemen: pick(r, "Departemen") || null,
      perusahaan: pick(r, "Perusahaan") || null,
      statusAbsen: pick(r, "Status Absen") || null,
      shift: pick(r, "Shift") || null,
      tanggalEvent: dateOrNull(pick(r, "Tanggal Event")),
      week: pick(r, "Week") || null, month: pick(r, "Month") || null, quartal: pick(r, "Quartal") || null,
      raw: r,
    });
  }
  // ---- FMS ----
  for (const r of sheet("FMS")) {
    const veh = pick(r, "Vehicle No"); const date = pick(r, "Date");
    if (!veh && !date) continue;
    rows.fms.push({
      sourceKey: "FM-" + hash(JSON.stringify(r)),
      tanggal: dateOrNull(date),
      vehicleNo: veh || null,
      company: pick(r, "Company") || null,
      violation: pick(r, "Violation") || null,
      shift: pick(r, "Shift") || null,
      validationStatus: pick(r, "validation_status") || null,
      validatedBy: pick(r, "validated_by") || null,
      sla: numOrNull(pick(r, "SLA")),
      kategoriValidasi: pick(r, "Kategori Validasi") || null,
      kategori: pick(r, "Kategori") || null,
      week: pick(r, "Week") || null, month: pick(r, "Month") || null,
      raw: r,
    });
  }

  const counts = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, (v as any[]).length]));
  return { rows, counts, sheetsFound: found };
}
