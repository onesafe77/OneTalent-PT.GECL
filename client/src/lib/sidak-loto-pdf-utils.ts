import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { SidakLotoSession, SidakLotoRecord, SidakLotoObserver } from '@shared/schema';
import { getSidakLotoHtml } from './sidak-loto-html-template';

interface SidakLotoData {
    session: SidakLotoSession;
    records: SidakLotoRecord[];
    observers: SidakLotoObserver[];
}

/**
 * Generate PDF from HTML template using html2canvas
 */
export async function generateSidakLotoPdf(data: SidakLotoData): Promise<jsPDF> {
    // 1. Generate HTML string
    const htmlContent = getSidakLotoHtml(data);

    // 2. Create a temporary container for rendering
    const container = document.createElement('div');
    container.innerHTML = htmlContent;

    // Style container to match A4 landscape dimensions and ensure it's visible for rendering but not interfering
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1122px'; // A4 Landscape
    container.style.minHeight = '793px';
    container.style.zIndex = '-1000';

    document.body.appendChild(container);

    // 3. Wait a moment for images to load (logo, signatures)
    // A simple delay helps, or we could use image onload handlers, but html2canvas has some built-in waiting.
    // However, fast injection might miss images.
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // 4. Convert to canvas
        const canvas = await html2canvas(container, {
            scale: 2, // Higher quality
            useCORS: true, // Allow loading remote images if any
            logging: false,
            windowWidth: 1123, // ~297mm * 96dpi / 25.4
            windowHeight: 794  // ~210mm * 96dpi / 25.4
        });

        // 5. Create PDF - A4 Landscape
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();   // 297mm
        const pdfHeight = pdf.internal.pageSize.getHeight();  // 210mm

        // Always fill the full A4 page
        pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            0,
            0,
            pdfWidth,
            pdfHeight
        );

        return pdf;

    } catch (err) {
        console.error("Error generating PDF:", err);
        throw new Error("Gagal membuat PDF dari template HTML");
    } finally {
        // 6. Cleanup
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
}

/**
 * Download as JPG directy from canvas (bypass PDF)
 */
export async function downloadSidakLotoAsJpg(data: SidakLotoData, filename: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('Browser only');

    // 1. Generate HTML string
    const htmlContent = getSidakLotoHtml(data);

    // 2. Create container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1122px';
    container.style.minHeight = '793px';
    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // 3. Render
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        // 4. Download
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('Failed to create image blob'));
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                resolve();
            }, 'image/jpeg', 0.95);
        });

    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
}

