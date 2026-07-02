// File: sidak-charging-station-pdf-utils.ts
// Export PDF & JPG "Observasi Kepatuhan Driver di Area Charging Station".
// Layout dibuat persis mengikuti formulir Word resmi:
// - Header = bar judul nama form + subjudul italic
// - Info table 2 baris (Tanggal/Shift, Waktu "sampai", Lokasi, Jumlah Sampel)
// - 6 kolom = teks pertanyaan lengkap VERTIKAL
// - Tabel Pemantau 2 blok bersebelahan (8 slot)
// PDF & JPG di-render dari SATU template HTML (html2canvas) agar identik.

import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { SidakChargingStationSession, SidakChargingStationRecord, SidakChargingStationObserver } from '@shared/schema';

// Kunci checklist + teks pertanyaan lengkap (urut 1-6, sesuai dokumen Word)
const QUESTIONS: { key: string; text: string }[] = [
    { key: "posisiAman", text: "Apakah posisi DT aman, tidak mengganggu akses dan membahayakan yang lain ?" },
    { key: "kabelSesuai", text: "Apakah driver melakukan charging sesuai dengan peruntukan tipe atau warna kabel yang ditetapkan ?" },
    { key: "apdLengkap", text: "Apakah driver melakukan charging menggunakan APD lengkap (sarung tangan sesuai standarnya, Helm, Sepatu Safety) ?" },
    { key: "tetapDiKabin", text: "Apakah driver tetap berada di dalam kabin selama proses charging ?" },
    { key: "tidakMerokok", text: "Apakah driver tidak merokok selama berada di area charging station?" },
    { key: "merapikanKabel", text: "Apakah pengguna merapikan kembali kabel/konektor ke dudukannya setelah selesai digunakan ?" },
];

interface SidakChargingStationData {
    session: SidakChargingStationSession;
    records: SidakChargingStationRecord[];
    observers: SidakChargingStationObserver[];
}

const waktuStr = (s: SidakChargingStationSession) =>
    `${s.waktuMulai || ''}${s.waktuSelesai ? ` sampai ${s.waktuSelesai}` : ''}`.trim() || '-';

function escapeHtml(str: string): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================
// HTML TEMPLATE (sumber tunggal untuk PDF & JPG)
// ============================================================
function getChargingStationHtml(data: SidakChargingStationData): string {
    const { session, records, observers } = data;
    const tanggal = session.tanggal ? format(new Date(session.tanggal), 'dd-MM-yyyy', { locale: idLocale }) : '-';
    const tanggalShift = `${tanggal}${session.shift ? ` / ${session.shift}` : ''}`;

    const rows: any[] = [...records];
    while (rows.length < 10) rows.push(null);

    const BORDER = '1px solid #000';
    const GRAY = '#D9D9D9';

    // Header kolom 1-6: teks pertanyaan lengkap, vertikal (rotate -90deg; metode yang
    // terbukti dirender benar oleh html2canvas di app ini — lihat sidak-behavior-html-template).
    const qHeaders = QUESTIONS.map((q) =>
        `<th style="border:${BORDER};background:${GRAY};width:7.5%;height:240px;vertical-align:middle;padding:0;position:relative;">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-90deg);transform-origin:center center;width:224px;white-space:normal;font-size:11px;line-height:1.18;text-align:left;">${escapeHtml(q.text)}</div>
        </th>`
    ).join('');

    const cellBase = `border:${BORDER};height:30px;vertical-align:middle;`;
    const bodyRows = rows.map((dr, i) => {
        const checks = QUESTIONS.map((q) => {
            if (!dr) return `<td style="${cellBase}"></td>`;
            const yes = !!dr[q.key];
            return `<td style="${cellBase}text-align:center;font-weight:bold;font-size:13px;color:#000;">${yes ? 'V' : 'X'}</td>`;
        }).join('');
        return `<tr>
            <td style="${cellBase}text-align:center;font-size:11px;">${i + 1}.</td>
            <td style="${cellBase}padding:2px 6px;font-size:11px;">${dr ? escapeHtml(dr.namaDriver || '') : ''}</td>
            <td style="${cellBase}padding:2px 6px;font-size:11px;">${dr ? escapeHtml(dr.nomorLambung || '') : ''}</td>
            ${checks}
            <td style="${cellBase}padding:2px 6px;font-size:10px;">${dr ? escapeHtml(dr.keterangan || '') : ''}</td>
        </tr>`;
    }).join('');

    // Tabel pemantau: 2 blok bersebelahan (kiri 1-4, kanan 5-8).
    // Lebar kolom HARUS di header (table-layout:fixed ambil lebar dari baris pertama). Per blok = 50%.
    // Baris lebih tinggi + font lebih besar dari tabel utama agar TTD & teks jelas.
    const obsCellBase = `border:${BORDER};height:46px;vertical-align:middle;`;
    const obsCell = (o: any, n: number) => `
        <td style="${obsCellBase}text-align:center;font-size:14px;">${n}.</td>
        <td style="${obsCellBase}padding:2px 8px;font-size:14px;">${o ? escapeHtml(o.nama || '') : ''}</td>
        <td style="${obsCellBase}padding:2px 8px;font-size:14px;">${o ? escapeHtml(o.perusahaan || '') : ''}</td>
        <td style="${obsCellBase}text-align:center;">${o && o.signatureDataUrl ? `<img src="${o.signatureDataUrl}" style="max-height:42px;max-width:130px;display:block;margin:0 auto;" />` : ''}</td>`;
    const obsRows = Array.from({ length: 4 }, (_, i) => {
        const left = observers[i];
        const right = observers[i + 4];
        return `<tr>${obsCell(left, i + 1)}${obsCell(right, i + 5)}</tr>`;
    }).join('');
    const obsHeadStyle = `border:${BORDER};background:${GRAY};font-size:14px;padding:6px 3px;text-align:center;vertical-align:middle;font-weight:bold;`;
    const obsHeadCell = `
        <th style="${obsHeadStyle}width:4%;">No</th>
        <th style="${obsHeadStyle}width:18%;">Nama Pemantau</th>
        <th style="${obsHeadStyle}width:11%;">Perusahaan</th>
        <th style="${obsHeadStyle}width:17%;">Tanda Tangan</th>`;

    const infoLabel = `style="background:${GRAY};font-weight:bold;border:${BORDER};padding:5px 8px;width:13%;font-size:12px;"`;
    const infoVal = `style="border:${BORDER};padding:5px 8px;width:37%;font-size:12px;"`;

    return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;width:1400px;padding:18px;box-sizing:border-box;">
        <!-- HEADER: nama form -->
        <div style="border:${BORDER};background:${GRAY};text-align:center;padding:8px 10px;">
            <div style="font-size:20px;font-weight:bold;letter-spacing:0.3px;">OBSERVASI KEPATUHAN DRIVER DI AREA CHARGING STATION</div>
        </div>
        <div style="text-align:center;font-style:italic;font-size:12px;padding:5px 0 8px;">
            Formulir ini digunakan sebagai catatan hasil observasi kepatuhan driver di area charging station yang dilaksanakan di PT Borneo Indobara
        </div>

        <!-- INFO TABLE 2 baris -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
            <tr>
                <td ${infoLabel}>Tanggal/ Shift</td><td ${infoVal}>${escapeHtml(tanggalShift)}</td>
                <td ${infoLabel}>Lokasi</td><td ${infoVal}>${escapeHtml(session.lokasi || '-')}</td>
            </tr>
            <tr>
                <td ${infoLabel}>Waktu</td><td ${infoVal}>${escapeHtml(waktuStr(session))}</td>
                <td ${infoLabel}>Jumlah Sampel</td><td ${infoVal}>${session.totalSampel || records.length} Driver</td>
            </tr>
        </table>

        <!-- MAIN TABLE -->
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <thead>
                <tr>
                    <th style="border:${BORDER};background:${GRAY};width:4%;vertical-align:middle;font-size:12px;">No</th>
                    <th style="border:${BORDER};background:${GRAY};width:15%;vertical-align:middle;font-size:12px;">Nama</th>
                    <th style="border:${BORDER};background:${GRAY};width:12%;vertical-align:middle;font-size:12px;">No Lambung<br/>Kendaraan</th>
                    ${qHeaders}
                    <th style="border:${BORDER};background:${GRAY};width:24%;vertical-align:middle;font-size:12px;">Keterangan</th>
                </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
        </table>
        <div style="font-size:10px;margin-top:3px;">Keterangan kolom 1–6: V = Ya (Patuh), X = Tidak (Tidak Patuh)</div>

        <!-- PEMANTAU: 2 blok bersebelahan -->
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:14px;">
            <thead><tr>${obsHeadCell}${obsHeadCell}</tr></thead>
            <tbody>${obsRows}</tbody>
        </table>

        <!-- FOOTER -->
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#444;margin-top:6px;">
            <span>BIB – HSE – ES – F &nbsp;|&nbsp; Charging Station</span>
            <span>Mei 2026/R0</span>
        </div>
    </div>`;
}

// ============================================================
// RENDER HELPER (HTML -> canvas via html2canvas)
// ============================================================
async function renderToCanvas(data: SidakChargingStationData): Promise<HTMLCanvasElement> {
    const html2canvas = (await import('html2canvas')).default;
    const container = document.createElement('div');
    container.innerHTML = getChargingStationHtml(data);
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1400px';
    container.style.background = '#fff';
    document.body.appendChild(container);

    // Pastikan semua gambar (mis. tanda tangan base64) selesai di-decode sebelum capture,
    // jika tidak html2canvas bisa memotret sebelum gambar siap → tanda tangan kosong.
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return (img.decode ? img.decode().catch(() => {}) : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
        }));
    }));
    await new Promise((r) => setTimeout(r, 300));
    try {
        return await html2canvas(container.firstElementChild as HTMLElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0,
        });
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

// ============================================================
// PUBLIC API
// ============================================================
export async function downloadSidakChargingStationAsJpg(data: SidakChargingStationData, filename: string): Promise<void> {
    const canvas = await renderToCanvas(data);
    await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Failed to create image blob'));
            triggerDownload(blob, filename);
            resolve();
        }, 'image/jpeg', 0.95);
    });
}

export async function downloadSidakChargingStationAsPdf(data: SidakChargingStationData, filename: string): Promise<void> {
    const canvas = await renderToCanvas(data);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Halaman dibuat seukuran gambar → konten mengisi penuh, tanpa ruang kosong kiri/kanan.
    const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ['px_scaling'],
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
}
