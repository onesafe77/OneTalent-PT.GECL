import type { SidakBehaviorSession, SidakBehaviorRecord, SidakBehaviorObserver } from '@shared/schema';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SidakBehaviorData {
    session: SidakBehaviorSession;
    records: SidakBehaviorRecord[];
    observers: SidakBehaviorObserver[];
}

export function getSidakBehaviorHtml(data: SidakBehaviorData): string {
    const { session, records, observers } = data;

    // Helper to format date
    const formatDate = (dateStr: string | Date | null) => {
        if (!dateStr) return '-';
        return format(new Date(dateStr), 'dd-MM-yyyy', { locale: id });
    };

    // Helper to get checkmark or empty
    const getCheck = (val: any) => {
        return !!val ? '✓' : '';
    };

    // Pad records to minimum 10 rows
    const paddedRecords = [...records];
    while (paddedRecords.length < 10) {
        paddedRecords.push({} as any);
    }

    // Split observers into two groups for the footer
    const observersLeft = observers.slice(0, 4);
    while (observersLeft.length < 4) observersLeft.push({} as any);

    const observersRight = observers.slice(4, 8);
    while (observersRight.length < 4) observersRight.push({} as any);


    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <style>
            .loto-report-container {
                font-family: Arial, sans-serif;
                background: #fff;
                width: 297mm; /* A4 Landscape width */
                min-height: 210mm; /* A4 Landscape height */
                padding: 10mm;
                box-sizing: border-box;
                position: relative;
                color: #000;
            }
            
            .loto-report-container * {
                box-sizing: border-box;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 0;
                border-bottom: 2px solid #000;
                margin-bottom: 10px;
            }

            .logo {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .logo-img {
                height: 50px; /* Slightly larger to be legible */
                display: block;
            }

            .doc-code {
                font-size: 11px;
                text-align: right;
                line-height: 1.4;
            }

            .title-section {
                background: #d3d3d3;
                padding: 8px;
                text-align: center;
                border: 1px solid #000;
                margin-bottom: 12px;
            }

            .title-section h1 {
                font-size: 18px;
                font-weight: bold;
                margin: 0 0 4px 0;
                text-transform: uppercase;
            }

            .title-section p {
                font-size: 10px;
                font-style: italic;
                margin: 0;
            }

            .info-section {
                display: flex;
                border: 1px solid #000;
                margin-bottom: 12px;
            }

            .info-col {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .info-col:first-child {
                border-right: 1px solid #000;
            }

            .info-row {
                display: flex;
                border-bottom: 1px solid #000;
            }
            .info-row:last-child {
                border-bottom: none;
            }

            .info-label {
                width: 120px;
                padding: 4px 8px;
                background: #f0f0f0;
                font-weight: bold;
                font-size: 10px;
                border-right: 1px solid #000;
                display: flex;
                align-items: center;
            }

            .info-value {
                flex: 1;
                padding: 4px 8px;
                font-size: 10px;
                display: flex;
                align-items: center;
            }

            .main-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 15px;
                table-layout: fixed; /* Enforce column widths */
            }

            .main-table th, .main-table td {
                border: 1px solid #000;
                padding: 3px;
                text-align: center;
                vertical-align: middle;
                word-wrap: break-word;
            }

            .main-table th {
                background: #e0e0e0;
                font-weight: bold;
                vertical-align: bottom;
                padding-bottom: 5px;
            }



            /* Vertical Text Styles - Robust wrapper approach */
            .header-wrapper {
                height: 250px;
                position: relative;
                width: 100%;
                margin: 0 auto;
                /* Ensure it takes space */
                display: block;
            }

            .rotated-text {
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%) rotate(-90deg);
                transform-origin: center center;
                
                width: 250px; 
                white-space: normal;
                text-align: left;
                font-size: 9px;
                line-height: 1.25;
                font-weight: normal;
                
                /* Ensure visibility */
                z-index: 10;
            }

            /* Column Widths */
            .col-no { width: 30px; }
            .col-name { width: 120px; text-align: left !important; }
            .col-lambung { width: 70px; }
            .col-check { width: 40px; } 
            .col-sig { width: 65px; }

            .main-col-name { text-align: left !important; padding-left: 5px !important; }

            .footer-section {
                display: flex;
                gap: 15px;
                margin-top: 12px;
            }

            .footer-table {
                flex: 1;
                border-collapse: collapse;
                font-size: 9px;
            }

            .footer-table th, .footer-table td {
                border: 1px solid #000;
                padding: 3px 5px;
                text-align: center;
            }

            .footer-table th {
                background: #e0e0e0;
                font-weight: bold;
            }

            .sig-cell {
                height: 40px;
                min-width: 80px;
            }

            .sig-img {
                max-height: 35px;
                max-width: 75px;
                display: block;
                margin: 0 auto;
            }

            .doc-footer {
                display: flex;
                justify-content: space-between;
                font-size: 8px;
                margin-top: 10px;
                padding-top: 5px;
                border-top: 1px solid #999;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="loto-report-container">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    <img src="/GECL.png" class="logo-img" />
                </div>
                <div style="flex:1; text-align:center;">
                    <strong style="font-size:14px;">PT GOLDEN ENERGI CEMERLANG LESTARI</strong>
                </div>
                <div class="doc-code">
                    <div>GECL – HSE – ES – F – 3.02</div>
                    <div>Maret 2025/R0</div>
                </div>
            </div>

            <!-- Title -->
            <div class="title-section">
                <h1>Inspeksi Sidak Tingkah Laku Driver</h1>
                <p>Observasi Perilaku Mengemudi di Area Operasi</p>
            </div>

            <!-- Info Section -->
            <div class="info-section">
                <div class="info-col">
                    <div class="info-row">
                        <div class="info-label">Tanggal</div>
                        <div class="info-value">${formatDate(session.tanggal)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Shift</div>
                        <div class="info-value">${session.shift || '-'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Lokasi</div>
                        <div class="info-value">${session.lokasi || '-'}</div>
                    </div>
                </div>
                <div class="info-col">
                    <div class="info-row">
                        <div class="info-label">Waktu</div>
                        <div class="info-value">${session.waktu || '-'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Metode Sidak</div>
                        <div class="info-value">${session.metodeSidak || '-'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Total Sampel</div>
                        <div class="info-value">${session.totalSampel || 0} Karyawan</div>
                    </div>
                </div>
            </div>

            <!-- Main Table -->
            <table class="main-table">
                <thead>
                    <tr>
                        <th class="col-no" rowspan="2">No</th>
                        <th class="col-name" rowspan="2">Nama Driver</th>
                        <th class="col-lambung" rowspan="2">No. Lambung</th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Makan Tertidur</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Sering Menguap</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Mengucek/Garuk</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Kurang Tanggap</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Posisi Duduk</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Keluar Jalur</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Reaksi Berat/Lambat</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Tidak Konsentrasi</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Aturan Fatigue Mgt Rules</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Mengendarai Tidak Stabil</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Estimasi Jarak</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Monitoring Lalu Lintas</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Tindakan Bantuan</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Syarat SIA/MHE</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Pelanggaran</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Ganti Driver</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Mandatory Rest</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Koordinasi Pengawas</div>
                            </div>
                        </th>
                        <th class="col-sig" rowspan="2">TTD Driver</th>
                    </tr>
                    <tr>
                        <th colspan="14" style="background:#c0c0c0; font-weight:bold; font-size:8px; padding:4px;">PARAMETER PERILAKU</th>
                        <th colspan="4" style="background:#c0c0c0; font-weight:bold; font-size:8px; padding:4px;">TINDAKAN</th>
                    </tr>
                </thead>
                <tbody>


                    ${paddedRecords.map((rec, idx) => `
                    <tr>
                        <td>${idx + 1}.</td>
                        <td class="main-col-name">${rec.namaDriver || ''}</td>
                        <td>${rec.nomorLambung || ''}</td>
                        <td>${getCheck(rec.mataTertutup)}</td>
                        <td>${getCheck(rec.seringMengedip)}</td>
                        <td>${getCheck(rec.menguapBerulang)}</td>
                        <td>${getCheck(rec.kepalaMengangguk)}</td>
                        <td>${getCheck(rec.posturMembungkuk)}</td>
                        <td>${getCheck(rec.keluarJalur)}</td>
                        <td>${getCheck(rec.reaksiRadioLambat)}</td>
                        <td>${getCheck(rec.tidakMeresponRadio)}</td>
                        <td>${getCheck(rec.alarmFatigueFmsAktif)}</td>
                        <td>${getCheck(rec.mengemudiTidakStabil)}</td>
                        <td>${getCheck(rec.edukasiTwoWay)}</td>
                        <td>${getCheck(rec.monitoringUlang)}</td>
                        <td>${getCheck(rec.instruksiBerhenti)}</td>
                        <td>${getCheck(rec.stretchingMinum)}</td>
                        <td>${getCheck(rec.parkirAman)}</td>
                        <td>${getCheck(rec.gantiDriver)}</td>
                        <td>${getCheck(rec.mandatoryRest)}</td>
                        <td>${getCheck(rec.koordinasiPengawas)}</td>
                        <td class="sig-cell">${rec.driverSignature ? `<img src="${rec.driverSignature}" class="sig-img" />` : ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Footer Signatures -->
             <div class="footer-section">
                <!-- Left Signature Table -->
                <table class="footer-table">
                    <thead>
                        <tr>
                            <th style="width: 30px;">No</th>
                            <th>Nama Pemantau</th>
                            <th>Perusahaan</th>
                            <th style="width:auto">Tanda Tangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${observersLeft.map((obs, idx) => `
                        <tr>
                            <td>${idx + 1}.</td>
                            <td style="text-align:left;">${obs.nama || ''}</td>
                            <td style="text-align:left;">${obs.perusahaan || ''}</td>
                            <td class="sig-cell">
                                ${obs.signatureDataUrl ? `<img src="${obs.signatureDataUrl}" class="sig-img" />` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Right Signature Table -->
                <table class="footer-table">
                    <thead>
                        <tr>
                            <th style="width: 30px;">No</th>
                            <th>Nama Pemantau</th>
                            <th>Perusahaan</th>
                            <th style="width:auto">Tanda Tangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${observersRight.map((obs, idx) => `
                        <tr>
                            <td>${idx + 5}.</td>
                            <td style="text-align:left;">${obs.nama || ''}</td>
                            <td style="text-align:left;">${obs.perusahaan || ''}</td>
                            <td class="sig-cell">
                                ${obs.signatureDataUrl ? `<img src="${obs.signatureDataUrl}" class="sig-img" />` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>


            <!-- Doc Footer -->
            <div class="doc-footer">
                <div>GECL – HSE – ES – F – 3.02</div>
                <div>Maret 2025/R0</div>
                <div>Page 1 of 1</div>
            </div>
        </div>
    </body>
    </html>
    `;
}
