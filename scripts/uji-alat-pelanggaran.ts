// Cek alat agen pelanggaran terhadap hitungan langsung dari sheet. Jalankan: npx tsx scripts/uji-alat-pelanggaran.ts
import assert from "node:assert";
import { ambilPelanggaran } from "../server/lib/fms-sheet";
import { ambilPelanggaranSD } from "../server/lib/sd-sheet";
import { tanyaPelanggaran, riwayatPelanggaranOrang } from "../server/lib/pengetahuan/pelanggaran";
(async () => {
  const hse = { nama: "uji", departemen: "HSE" }, ops = { nama: "uji", departemen: "PRODUKSI" };
  const f = await ambilPelanggaran(), s = await ambilPelanggaranSD();
  let ok = 0; const t = (n: string, fn: () => any) => Promise.resolve(fn()).then(() => { ok++; console.log("✓", n); });

  await t("total semua = fms + sd", async () => assert.equal((await tanyaPelanggaran({}, hse)).total, f.length + s.length));
  await t("filter tanggal & jenis", async () => {
    const exp = f.filter((x) => x.pelanggaran === "Overspeed" && x.tanggal && x.tanggal >= "2026-08-01" && x.tanggal <= "2026-08-31").length;
    assert.equal((await tanyaPelanggaran({ sumber: "fms", jenis: "overspeed", dari: "2026-08-01", sampai: "2026-08-31" }, hse)).total, exp);
  });
  await t("peringkat unit teratas benar", async () => {
    const m: any = {}; s.forEach((x) => (m[x.unit] = (m[x.unit] || 0) + 1));
    const top = Math.max(...(Object.values(m) as number[]));
    assert.equal((await tanyaPelanggaran({ sumber: "safe_distance", kelompokkan: "unit" }, hse)).per_unit[0].jumlah, top);
  });
  await t("jumlah per_shift = total", async () => {
    const h = await tanyaPelanggaran({ kelompokkan: "shift" }, hse);
    assert.equal(h.per_shift.reduce((a: number, b: any) => a + b.jumlah, 0), h.total);
  });
  await t("non-HSE: nama/NIK tersembunyi", async () => {
    const h = await tanyaPelanggaran({ contoh: 5 }, ops);
    assert.ok(h.contoh_terbaru.length && h.contoh_terbaru.every((c: any) => !("nama" in c) && !("nik" in c)));
  });
  await t("non-HSE: filter orang & kelompok orang ditolak", async () => {
    assert.ok((await tanyaPelanggaran({ orang: "a" }, ops)).galat);
    assert.ok((await tanyaPelanggaran({ kelompokkan: "orang" }, ops)).galat);
  });
  await t("riwayat lintas: non-HSE ditolak, HSE dapat", async () => {
    assert.ok((await riwayatPelanggaranOrang({ nik: f.find((x) => x.nik)!.nik }, ops)).galat);
    const r: any = await riwayatPelanggaranOrang({ nik: f.find((x) => x.nik && x.nik.length > 3)!.nik }, hse);
    assert.ok(r.orang && r.orang.total >= 1 && r.kejadian.length >= 1);
  });
  await t("filter kosong → total 0 + catatan", async () => {
    const h = await tanyaPelanggaran({ dari: "2030-01-01" }, hse);
    assert.equal(h.total, 0); assert.ok(h.catatan);
  });
  console.log(`${ok}/8 lulus`); process.exit(0);
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
