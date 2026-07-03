// Loader logo GECL untuk PDF (jsPDF) — isomorfik browser & Node.
// - Browser (halaman History): HTMLImageElement dari /assets/logo-gecl.png (pola lama).
// - Node (endpoint /api/sidak-recap/form-pdf): baca file logo → data-URL base64.
// jsPDF.addImage menerima keduanya, jadi pemanggil tak perlu peduli lingkungan.
export type PdfLogo = HTMLImageElement | string;

// Memo: logo tak berubah selama sesi — muat sekali, download berikutnya instan.
let cachedLogo: Promise<PdfLogo | null> | null = null;

export function loadGeclLogo(): Promise<PdfLogo | null> {
  if (!cachedLogo) {
    cachedLogo = doLoadGeclLogo().then((logo) => {
      if (logo === null) cachedLogo = null; // gagal → coba lagi di panggilan berikutnya
      return logo;
    });
  }
  return cachedLogo;
}

async function doLoadGeclLogo(): Promise<PdfLogo | null> {
  try {
    if (typeof window === "undefined") {
      const fs = await import(/* @vite-ignore */ "node:fs/promises");
      const path = await import(/* @vite-ignore */ "node:path");
      const candidates = [
        path.resolve(process.cwd(), "client/public/assets/logo-gecl.png"),
        path.resolve(process.cwd(), "dist/public/assets/logo-gecl.png"),
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
      img.src = "/assets/logo-gecl.png";
    });
  } catch (error) {
    console.error("Logo loading failed:", error);
    return null;
  }
}
