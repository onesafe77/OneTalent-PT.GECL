import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export interface SignatureData {
    signatureImageUrl: string;
    pageNumber: number;
    posX: number;
    posY: number;
    width: number;
    height: number;
}

class UsignPdfService {
    async mergeSignaturesToPdf(
        originalPdf: string | Buffer | Uint8Array,
        signatures: SignatureData[]
    ): Promise<Uint8Array> {
        try {
            // Sumber PDF asli bisa berupa path filesystem ATAU bytes (file tersimpan di DB)
            const existingPdfBytes = typeof originalPdf === "string"
                ? await fs.readFile(originalPdf)
                : originalPdf;
            const pdfDoc = await PDFDocument.load(existingPdfBytes);

            for (const sig of signatures) {
                // Convert data URL to buffer
                // data:image/png;base64,iVBORw0...
                const base64Data = sig.signatureImageUrl.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');

                let image;
                if (sig.signatureImageUrl.includes('image/png')) {
                    image = await pdfDoc.embedPng(imageBuffer);
                } else if (sig.signatureImageUrl.includes('image/jpeg') || sig.signatureImageUrl.includes('image/jpg')) {
                    image = await pdfDoc.embedJpg(imageBuffer);
                } else {
                    console.warn(`[UsignPdfService] Unsupported signature image format. Attempting PNG.`);
                    try {
                        image = await pdfDoc.embedPng(imageBuffer);
                    } catch (e) {
                        image = await pdfDoc.embedJpg(imageBuffer);
                    }
                }

                const pages = pdfDoc.getPages();
                const pageIndex = sig.pageNumber - 1;

                if (pageIndex >= 0 && pageIndex < pages.length) {
                    const page = pages[pageIndex];
                    const { height: pageHeight } = page.getSize();

                    // Adjust Y coordinate (pdf-lib uses bottom-left origin)
                    // Frontend uses top-left origin
                    // drawY = pageHeight - posY - height
                    const drawY = pageHeight - sig.posY - sig.height;

                    console.log(`[UsignPdfService] Drawing signature on page ${sig.pageNumber} at (${sig.posX}, ${drawY})`);

                    page.drawImage(image, {
                        x: sig.posX,
                        y: drawY,
                        width: sig.width,
                        height: sig.height,
                    });
                } else {
                    console.warn(`[UsignPdfService] Page index ${pageIndex} out of bounds (total pages: ${pages.length})`);
                }
            }

            const bytes = await pdfDoc.save();
            console.log(`[UsignPdfService] PDF saved successfully, size: ${bytes.length} bytes`);
            return bytes;
        } catch (error) {
            console.error("[UsignPdfService] Error merging signatures:", error);
            throw error;
        }
    }
}

export const usignPdfService = new UsignPdfService();
