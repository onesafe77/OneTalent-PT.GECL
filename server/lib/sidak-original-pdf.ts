// Render PDF form SIDAK memakai LAYOUT ASLI (util jsPDF yang sama dgn tombol download
// di halaman History) — dijalankan di server utk endpoint /api/sidak-recap/form-pdf.
// Util client sudah dibuat isomorfik (logo via loadGeclLogo). Tipe yang tak portable
// (html2canvas/@react-pdf: LOTO, SopKritis, ChargingStation, Behavior) tidak dipetakan
// → caller fallback ke renderer generik.

type UtilThunk = () => Promise<Record<string, any>>;

const MAP: Record<string, { load: UtilThunk; fn: string }> = {
  // Fatigue & Roster: implementasi ASLI ada di sidak-pdf-utils.ts (yang di sidak-seatbelt-pdf-utils
  // hanya stub placeholder — jangan dipakai).
  Fatigue: { load: () => import("../../client/src/lib/sidak-pdf-utils"), fn: "generateSidakFatiguePdf" },
  Roster: { load: () => import("../../client/src/lib/sidak-pdf-utils"), fn: "generateSidakRosterPdf" },
  Seatbelt: { load: () => import("../../client/src/lib/sidak-seatbelt-pdf-utils"), fn: "generateSidakSeatbeltPdf" },
  Rambu: { load: () => import("../../client/src/lib/sidak-rambu-pdf-utils"), fn: "generateSidakRambuPdf" },
  Antrian: { load: () => import("../../client/src/lib/sidak-antrian-pdf-utils"), fn: "generateSidakAntrianPdf" },
  Jarak: { load: () => import("../../client/src/lib/sidak-jarak-pdf-utils"), fn: "generateSidakJarakPdf" },
  Kecepatan: { load: () => import("../../client/src/lib/sidak-kecepatan-pdf-utils"), fn: "generateSidakKecepatanPdf" },
  Pencahayaan: { load: () => import("../../client/src/lib/sidak-pencahayaan-pdf-utils"), fn: "generateSidakPencahayaanPDF" },
  Digital: { load: () => import("../../client/src/lib/sidak-digital-pdf-utils"), fn: "generateSidakDigitalPDF" },
  Workshop: { load: () => import("../../client/src/lib/sidak-workshop-pdf-utils"), fn: "generateSidakWorkshopPDF" },
  Intercom: { load: () => import("../../client/src/lib/sidak-intercom-pdf-utils"), fn: "generateSidakIntercomPdf" },
  StandJack: { load: () => import("../../client/src/lib/sidak-stand-jack-pdf-utils"), fn: "generateSidakStandJackPDF" },
  HydraulicJack: { load: () => import("../../client/src/lib/sidak-hydraulic-jack-pdf-utils"), fn: "generateSidakHydraulicJackPDF" },
  BottleJack: { load: () => import("../../client/src/lib/sidak-bottle-jack-pdf-utils"), fn: "generateSidakBottleJackPDF" },
  Impact: { load: () => import("../../client/src/lib/sidak-impact-pdf-utils"), fn: "generateSidakImpactPDF" },
  Apar: { load: () => import("../../client/src/lib/sidak-apar-pdf-utils"), fn: "generateSidakAparPDF" },
  MesinLas: { load: () => import("../../client/src/lib/sidak-mesin-las-pdf-utils"), fn: "generateSidakMesinLasPDF" },
  MesinKompresor: { load: () => import("../../client/src/lib/sidak-mesin-kompresor-pdf-utils"), fn: "generateSidakMesinKompresorPDF" },
  GerindaDuduk: { load: () => import("../../client/src/lib/sidak-gerinda-duduk-pdf-utils"), fn: "generateSidakGerindaDudukPDF" },
  FuelStorage: { load: () => import("../../client/src/lib/sidak-fuel-storage-pdf-utils"), fn: "generateSidakFuelStoragePDF" },
};

/** Buffer PDF layout asli, atau null bila tipe tak terpetakan (caller pakai fallback generik). */
export async function renderOriginalSidakPdf(
  type: string,
  detail: { session: any; records?: any[]; observers?: any[] },
): Promise<Buffer | null> {
  const entry = MAP[type];
  if (!entry) return null;
  const mod = await entry.load();
  const gen = mod[entry.fn];
  if (typeof gen !== "function") throw new Error(`fn ${entry.fn} tidak ditemukan`);
  const doc = await gen({
    session: detail.session,
    records: detail.records || [],
    observers: detail.observers || [],
  });
  return Buffer.from(doc.output("arraybuffer"));
}
