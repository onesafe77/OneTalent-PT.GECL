// Loader logo GECL untuk PDF (jsPDF) — isomorfik browser & Node.
// - Browser (halaman History): HTMLImageElement dari /assets/logo-gecl.png (pola lama).
// - Node (endpoint /api/sidak-recap/form-pdf): baca file logo → data-URL base64.
// jsPDF.addImage menerima keduanya, jadi pemanggil tak perlu peduli lingkungan.
export type PdfLogo = HTMLImageElement | string;

// Memo per file: logo tak berubah selama sesi — muat sekali, download berikutnya instan.
const cachedLogos = new Map<string, Promise<PdfLogo | null>>();

function loadLogoAsset(filename: string): Promise<PdfLogo | null> {
  let cached = cachedLogos.get(filename);
  if (!cached) {
    cached = doLoadLogoAsset(filename).then((logo) => {
      if (logo === null) cachedLogos.delete(filename); // gagal → coba lagi di panggilan berikutnya
      return logo;
    });
    cachedLogos.set(filename, cached);
  }
  return cached;
}

export function loadGeclLogo(): Promise<PdfLogo | null> {
  return loadLogoAsset("logo-gecl.png");
}

// Logo PT Borneo Indobara — kop form BIB (mis. Sidak Pemenuhan Tyre BIB-CLR-SKR-F-014-01)
export function loadBibLogo(): Promise<PdfLogo | null> {
  return loadLogoAsset("logo-bib.png");
}

async function doLoadLogoAsset(filename: string): Promise<PdfLogo | null> {
  try {
    if (typeof window === "undefined") {
      const fs = await import(/* @vite-ignore */ "node:fs/promises");
      const path = await import(/* @vite-ignore */ "node:path");
      const candidates = [
        path.resolve(process.cwd(), `client/public/assets/${filename}`),
        path.resolve(process.cwd(), `dist/public/assets/${filename}`),
      ];
      for (const p of candidates) {
        try {
          const buf = await fs.readFile(p);
          return `data:image/png;base64,${buf.toString("base64")}`;
        } catch { /* coba kandidat berikutnya */ }
      }
      return null;
    }
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load logo"));
      img.src = `/assets/${filename}`;
    });
  } catch (error) {
    console.error("Logo loading failed:", error);
    return null;
  }
}
