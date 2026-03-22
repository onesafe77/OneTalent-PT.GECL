import type { SidakLotoSession, SidakLotoRecord, SidakLotoObserver } from '@shared/schema';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SidakLotoData {
    session: SidakLotoSession;
    records: SidakLotoRecord[];
    observers: SidakLotoObserver[];
}

export function getSidakLotoHtml(data: SidakLotoData): string {
    const { session, records, observers } = data;

    // Helper to format date
    const formatDate = (dateStr: string | Date | null) => {
        if (!dateStr) return '-';
        return format(new Date(dateStr), 'dd MMMM yyyy', { locale: id });
    };

    // Helper to get checkmark or dash
    const getCheck = (val: boolean | number | null | undefined) => {
        return val ? '✓' : '';
    };

    // Pad records to minimum 10 rows
    const paddedRecords = [...records];
    while (paddedRecords.length < 10) {
        paddedRecords.push({} as any);
    }

    // Split observers into two groups for the footer (side by side)
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
            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
                font-family: Arial, Helvetica, sans-serif;
                background: #fff;
                color: #000;
            }

            .page {
                width: 1122px;
                height: 793px;
                padding: 25px 30px;
                position: relative;
                overflow: hidden;
            }

            /* ===== HEADER ===== */
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #000;
                padding-bottom: 6px;
                margin-bottom: 6px;
            }
            .header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .header-logo {
                height: 40px;
            }
            .header-company {
                font-size: 13px;
                font-weight: bold;
            }
            .header-right {
                text-align: right;
                font-size: 9px;
                line-height: 1.4;
            }

            /* ===== TITLE ===== */
            .title-bar {
                background: #d9d9d9;
                border: 1px solid #000;
                text-align: center;
                padding: 5px 0;
                margin-bottom: 6px;
            }
            .title-bar h1 {
                font-size: 13px;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
            }
            .title-bar p {
                font-size: 8px;
                font-style: italic;
                margin: 2px 0 0 0;
            }

            /* ===== INFO TABLE ===== */
            .info-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 6px;
            }
            .info-table td {
                border: 1px solid #000;
                padding: 5px 8px;
                height: 26px;
            }
            .info-label {
                background: #f0f0f0;
                font-weight: bold;
                width: 150px;
            }
            .info-value {
                width: auto;
            }

            /* ===== MAIN DATA TABLE ===== */
            .data-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 9px;
                table-layout: fixed;
                margin-bottom: 6px;
            }
            .data-table th,
            .data-table td {
                border: 1px solid #000;
                padding: 3px 4px;
                text-align: center;
                vertical-align: middle;
            }
            .data-table th {
                background: #e0e0e0;
                font-weight: bold;
            }

            /* Fixed column widths — proportioned for A4 landscape */
            .col-no { width: 30px; }
            .col-nama { width: 150px; }
            .col-nik { width: 80px; }
            .col-perusahaan { width: 100px; }
            .col-q { width: 55px; }
            .col-ket { width: auto; }

            /* Row height for data body */
            .data-table tbody td {
                height: 28px;
                font-size: 9px;
            }

            /* Rotated header cells */
            .q-header {
                height: 140px;
                padding: 0 !important;
                position: relative;
                overflow: visible;
            }
            .q-header .q-wrap {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 130px;
                transform: translate(-50%, -50%) rotate(-90deg);
                font-size: 7px;
                font-weight: bold;
                line-height: 1.3;
                text-align: left;
                white-space: normal;
            }

            /* Static header cells (No, Nama, NIK, etc.) vertically centered in tall header */
            .data-table th.static-header {
                vertical-align: middle;
                font-size: 10px;
            }

            /* Align text left for name/company */
            .text-left { text-align: left !important; padding-left: 5px !important; }

            /* ===== OBSERVER / SIGNATURE SECTION ===== */
            .observer-section {
                display: flex;
                gap: 12px;
                margin-bottom: 6px;
            }
            .observer-table {
                flex: 1;
                border-collapse: collapse;
                font-size: 9px;
            }
            .observer-table th,
            .observer-table td {
                border: 1px solid #000;
                padding: 2px 4px;
                text-align: center;
                vertical-align: middle;
            }
            .observer-table th {
                background: #e0e0e0;
                font-weight: bold;
                height: 20px;
            }
            .observer-table .obs-no { width: 26px; }
            .observer-table .obs-nama { text-align: left; }
            .observer-table .obs-perusahaan { text-align: left; }
            .observer-table .obs-ttd { width: 100px; height: 40px; }
            .sig-img {
                max-height: 35px;
                max-width: 90px;
                display: block;
                margin: 0 auto;
            }

            /* ===== DOC FOOTER ===== */
            .doc-footer {
                display: flex;
                justify-content: space-between;
                font-size: 7px;
                color: #666;
                border-top: 1px solid #999;
                padding-top: 3px;
                position: absolute;
                bottom: 15px;
                left: 30px;
                right: 30px;
            }
        </style>
    </head>
    <body>
        <div class="page">

            <!-- HEADER -->
            <div class="header">
                <div class="header-left">
                    <img src="/GECL.png" class="header-logo" onerror="this.style.display='none'" />
                    <span class="header-company">PT GOLDEN ENERGI CEMERLANG LESTARI</span>
                </div>
                <div class="header-right">
                    GECL – HSE – ES – F – 3.02 – 83<br>
                    Maret 2025/R0
                </div>
            </div>

            <!-- TITLE -->
            <div class="title-bar">
                <h1>Inspeksi Kepatuhan Lock Out Tie Out (LOTO)</h1>
                <p>Safety Patrol – LOTO Compliance Inspection Record</p>
            </div>

            <!-- INFO -->
            <table class="info-table">
                <tr>
                    <td class="info-label">Tanggal Pelaksanaan</td>
                    <td class="info-value">${formatDate((session as any).tanggalPelaksanaan || session.tanggal)}</td>
                    <td class="info-label">Lokasi</td>
                    <td class="info-value">${session.lokasi || '-'}</td>
                </tr>
                <tr>
                    <td class="info-label">Shift</td>
                    <td class="info-value">${session.shift || '-'}</td>
                    <td class="info-label">Departemen</td>
                    <td class="info-value">${session.departemen || '-'}</td>
                </tr>
            </table>

            <!-- MAIN DATA TABLE -->
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="col-no static-header" rowspan="2">No</th>
                        <th class="col-nama static-header" rowspan="2">Nama</th>
                        <th class="col-nik static-header" rowspan="2">NIK</th>
                        <th class="col-perusahaan static-header" rowspan="2">Perusahaan</th>
                        <th class="col-q q-header">
                            <div class="q-wrap">Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki?</div>
                        </th>
                        <th class="col-q q-header">
                            <div class="q-wrap">Apakah danger tag sesuai dan memadai?</div>
                        </th>
                        <th class="col-q q-header">
                            <div class="q-wrap">Apakah gembok sesuai dan memadai?</div>
                        </th>
                        <th class="col-q q-header">
                            <div class="q-wrap">Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?</div>
                        </th>
                        <th class="col-q q-header">
                            <div class="q-wrap">Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?</div>
                        </th>
                        <th class="col-ket static-header" rowspan="2">Keterangan</th>
                    </tr>
                    <tr>
                        <!-- empty second header row for rowspan alignment -->
                    </tr>
                </thead>
                <tbody>
                    ${paddedRecords.map((rec, idx) => `
                    <tr>
                        <td>${idx + 1}.</td>
                        <td class="text-left">${rec.nama || (rec as any).namaKaryawan || ''}</td>
                        <td>${rec.nik || ''}</td>
                        <td class="text-left">${rec.perusahaan || ''}</td>
                        <td>${getCheck(rec.q1_gembokTagTerpasang)}</td>
                        <td>${getCheck(rec.q2_dangerTagSesuai)}</td>
                        <td>${getCheck(rec.q3_gembokSesuai)}</td>
                        <td>${getCheck(rec.q4_kunciUnik)}</td>
                        <td>${getCheck(rec.q5_haspBenar)}</td>
                        <td class="text-left">${rec.keterangan || ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- OBSERVER / SIGNATURE SECTION -->
            <div class="observer-section">
                <!-- Left Table -->
                <table class="observer-table">
                    <thead>
                        <tr>
                            <th class="obs-no">No</th>
                            <th>Nama Pemantau</th>
                            <th>Perusahaan</th>
                            <th>Tanda Tangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${observersLeft.map((obs, idx) => `
                        <tr>
                            <td>${idx + 1}.</td>
                            <td class="obs-nama">${obs.nama || ''}</td>
                            <td class="obs-perusahaan">${obs.perusahaan || ''}</td>
                            <td class="obs-ttd">
                                ${obs.tandaTangan ? `<img src="${obs.tandaTangan}" class="sig-img" />` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Right Table -->
                <table class="observer-table">
                    <thead>
                        <tr>
                            <th class="obs-no">No</th>
                            <th>Nama Pemantau</th>
                            <th>Perusahaan</th>
                            <th>Tanda Tangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${observersRight.map((obs, idx) => `
                        <tr>
                            <td>${idx + 5}.</td>
                            <td class="obs-nama">${obs.nama || ''}</td>
                            <td class="obs-perusahaan">${obs.perusahaan || ''}</td>
                            <td class="obs-ttd">
                                ${obs.tandaTangan ? `<img src="${obs.tandaTangan}" class="sig-img" />` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- DOC FOOTER -->
            <div class="doc-footer">
                <div>GECL – HSE – ES – F – 3.02 – 83</div>
                <div>Maret 2025/R0</div>
                <div>Page 1 of 1</div>
            </div>

        </div>
    </body>
    </html>
    `;
}
