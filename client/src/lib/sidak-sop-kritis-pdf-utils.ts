// Export PDF & JPG "Ringkasan Pengendalian dan SOP Kritikal" (Observasi SOP Kritis / CCC).
// Layout mengikuti formulir PDF resmi (PORTRAIT). PDF & JPG dari satu template HTML (html2canvas).

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ItemRow { uraian: string; status: string }
interface ObserverRow { nama: string; departemenPerusahaan?: string; signatureDataUrl?: string }
interface SopKritisData {
    judulSop?: string;
    tanggalPublikasi?: string;
    perusahaan?: string;
    risiko?: string;
    departemen?: string;
    nilaiRisikoMurni?: string;
    tingkatRisiko?: string;
    kartuCccId?: string;
    pengendalian?: ItemRow[];
    langkah?: ItemRow[];
    observers?: ObserverRow[];
}

function escapeHtml(str: any): string {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const riskColor = (tingkat?: string) => {
    switch ((tingkat || '').toLowerCase()) {
        case 'rendah': return '#22c55e';
        case 'sedang': return '#eab308';
        case 'tinggi': return '#f97316';
        case 'ekstrem': return '#dc2626';
        default: return '#ffffff';
    }
};

function getSopKritisHtml(data: SopKritisData): string {
    const BORDER = '1px solid #000';
    const GRAY = '#D9D9D9';
    const tglPub = data.tanggalPublikasi ? format(new Date(data.tanggalPublikasi), 'dd MMMM yyyy', { locale: idLocale }) : '';

    const pengendalian = [...(data.pengendalian || [])];
    while (pengendalian.length < 10) pengendalian.push(null as any);
    const langkah = [...(data.langkah || [])];
    while (langkah.length < 10) langkah.push(null as any);
    const observers = [...(data.observers || [])];
    while (observers.length < 3) observers.push(null as any);

    const cell = `border:${BORDER};height:28px;vertical-align:middle;font-size:11px;`;
    const checkMark = (it: any, want: string) =>
        it && it.status === want ? `<td style="${cell}text-align:center;font-weight:bold;">V</td>` : `<td style="${cell}"></td>`;

    const pengRows = pengendalian.map((it, i) => `
        <tr>
            <td style="${cell}text-align:center;">${i + 1}.</td>
            <td style="${cell}padding:2px 6px;">${it ? escapeHtml(it.uraian) : ''}</td>
            ${checkMark(it, 'Ya')}${checkMark(it, 'Tidak')}${checkMark(it, 'N/A')}
        </tr>`).join('');

    const langkahRows = langkah.map((it, i) => `
        <tr>
            <td style="${cell}text-align:center;">${i + 1}.</td>
            <td style="${cell}padding:2px 6px;">${it ? escapeHtml(it.uraian) : ''}</td>
            ${checkMark(it, 'Ya')}${checkMark(it, 'Tidak')}
        </tr>`).join('');

    const obsCellBase = `border:${BORDER};height:46px;vertical-align:middle;font-size:12px;`;
    const obsRows = observers.map((o, i) => `
        <tr>
            ${i === 0 ? `<td rowspan="${observers.length}" style="border:${BORDER};vertical-align:top;"></td>` : ''}
            <td style="${obsCellBase}padding:2px 8px;">${o ? escapeHtml(o.nama) : ''}</td>
            <td style="${obsCellBase}padding:2px 8px;">${o ? escapeHtml(o.departemenPerusahaan || '') : ''}</td>
            <td style="${obsCellBase}text-align:center;">${o && o.signatureDataUrl ? `<img src="${o.signatureDataUrl}" style="max-height:40px;max-width:120px;display:block;margin:0 auto;" />` : ''}</td>
        </tr>`).join('');

    const infoLabel = `style="background:${GRAY};font-weight:bold;border:${BORDER};padding:7px 8px;width:18%;font-size:11px;"`;
    const infoVal = `style="border:${BORDER};padding:7px 8px;width:32%;font-size:11px;"`;

    return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;width:794px;min-height:1123px;padding:18px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #888;padding-bottom:6px;margin-bottom:10px;">
            <div style="font-size:14px;font-weight:bold;letter-spacing:0.5px;">PT BORNEO INDOBARA</div>
            <div style="font-size:10px;">BIB – HSE – PPO – F – 176 – 02</div>
        </div>
        <div style="background:${GRAY};border-top:${BORDER};border-bottom:${BORDER};text-align:center;padding:8px 6px;">
            <div style="font-size:20px;font-weight:bold;">Ringkasan Pengendalian dan SOP Kritikal</div>
        </div>
        <div style="text-align:center;font-style:italic;font-size:10px;padding:5px 0 10px;">
            Ringkasan Pengendalian dan SOP Kritikal digunakan sebagai pengendalian risiko fatalitas atau cedera berat
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
            <tr>
                <td ${infoLabel}>Judul SOP</td><td ${infoVal}>${escapeHtml(data.judulSop || '')}</td>
                <td ${infoLabel}>Tanggal Publikasi</td><td ${infoVal}>${escapeHtml(tglPub)}</td>
            </tr>
            <tr>
                <td ${infoLabel}>Perusahaan</td><td ${infoVal}>${escapeHtml(data.perusahaan || '')}</td>
                <td ${infoLabel}>Risiko</td><td ${infoVal}>${escapeHtml(data.risiko || '')}</td>
            </tr>
            <tr>
                <td ${infoLabel}>Departemen</td><td ${infoVal}>${escapeHtml(data.departemen || '')}</td>
                <td ${infoLabel}>Nilai Risiko Murni (NR0)</td>
                <td style="border:${BORDER};padding:7px 8px;font-size:11px;font-weight:bold;background:${riskColor(data.tingkatRisiko)};">${escapeHtml(data.nilaiRisikoMurni || '')}</td>
            </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <thead><tr style="background:${GRAY};">
                <th style="border:${BORDER};width:6%;font-size:11px;padding:5px;">No</th>
                <th style="border:${BORDER};width:70%;font-size:11px;padding:5px;">Pengendalian Kritikal</th>
                <th style="border:${BORDER};width:8%;font-size:11px;padding:5px;">Ya</th>
                <th style="border:${BORDER};width:8%;font-size:11px;padding:5px;">Tidak</th>
                <th style="border:${BORDER};width:8%;font-size:11px;padding:5px;">N/A</th>
            </tr></thead>
            <tbody>${pengRows}</tbody>
        </table>
        <div style="border:${BORDER};border-top:none;background:${GRAY};padding:6px;font-size:12px;font-style:italic;color:#c00;text-align:center;font-weight:bold;">
            Catatan: Jika satu dari Pengendalian Kritikal tidak ada di lapangan – HENTIKAN PEKERJAAN
        </div>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px;">
            <thead><tr style="background:${GRAY};">
                <th style="border:${BORDER};width:6%;font-size:11px;padding:5px;">No</th>
                <th style="border:${BORDER};width:78%;font-size:11px;padding:5px;">Item/Langkah Kritikal</th>
                <th style="border:${BORDER};width:8%;font-size:11px;padding:5px;">Ya</th>
                <th style="border:${BORDER};width:8%;font-size:11px;padding:5px;">Tidak</th>
            </tr></thead>
            <tbody>${langkahRows}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px;">
            <thead><tr style="background:${GRAY};">
                <th style="border:${BORDER};width:38%;font-size:11px;padding:5px;text-align:left;vertical-align:middle;">Catatan Hasil Observasi:</th>
                <th style="border:${BORDER};width:20%;font-size:11px;padding:5px;text-align:center;vertical-align:middle;">Nama</th>
                <th style="border:${BORDER};width:24%;font-size:11px;padding:5px;text-align:center;vertical-align:middle;">Departemen/Perusahaan</th>
                <th style="border:${BORDER};width:18%;font-size:11px;padding:5px;text-align:center;vertical-align:middle;">Tanda Tangan</th>
            </tr></thead>
            <tbody>${obsRows}</tbody>
        </table>

        <div style="display:flex;justify-content:space-between;font-size:9px;color:#444;margin-top:8px;">
            <span>Agustus 2024/R0</span><span>Page 1 of 1</span>
        </div>
    </div>`;
}

async function renderToCanvas(data: SopKritisData): Promise<HTMLCanvasElement> {
    const html2canvas = (await import('html2canvas')).default;
    const container = document.createElement('div');
    container.innerHTML = getSopKritisHtml(data);
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '794px';
    container.style.background = '#fff';
    document.body.appendChild(container);

    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return (img.decode ? img.decode().catch(() => {}) : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); }));
    }));
    await new Promise((r) => setTimeout(r, 300));
    try {
        return await html2canvas(container.firstElementChild as HTMLElement, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', imageTimeout: 0 });
    } finally {
        if (document.body.contains(container)) document.body.removeChild(container);
    }
}

function triggerDownload(blob: Blob, filename: string) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export async function downloadSidakSopKritisAsJpg(data: SopKritisData, filename: string): Promise<void> {
    const canvas = await renderToCanvas(data);
    await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Failed to create image blob'));
            triggerDownload(blob, filename);
            resolve();
        }, 'image/jpeg', 0.95);
    });
}

export async function downloadSidakSopKritisAsPdf(data: SopKritisData, filename: string): Promise<void> {
    const canvas = await renderToCanvas(data);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    // Halaman A4 portrait; gambar di-fit (contain) agar konten utuh di satu halaman, rasio terjaga.
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210, pageH = 297; // A4 mm
    let w = pageW;                              // muat penuh lebar A4
    let h = (canvas.height * w) / canvas.width; // jaga rasio
    if (h > pageH) {                            // bila lebih tinggi dari 1 halaman → fit tinggi
        h = pageH;
        w = (canvas.width * h) / canvas.height;
    }
    const x = (pageW - w) / 2;                  // center horizontal (top-aligned y=0)
    pdf.addImage(imgData, 'JPEG', x, 0, w, h);
    pdf.save(filename);
}
