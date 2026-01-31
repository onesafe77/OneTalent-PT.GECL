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
        return format(new Date(dateStr), 'dd-MM-yyyy', { locale: id });
    };

    // Helper to get checkmark or empty
    const getCheck = (val: boolean | number | null) => {
        return val ? '✓' : '-';
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
            .col-name { width: 140px; text-align: left !important; }
            .col-nik { width: 80px; }
            .col-company { width: 100px; text-align: left !important; }
            .col-check { width: 40px; } 
            .col-ket { width: auto; text-align: left !important; }

/* ... */

            /* Main Table */
            <table class="main-table">
                <thead>
                    <tr>
                        <th class="col-no" rowspan="2">No</th>
                        <th class="col-name" rowspan="2">Nama</th>
                        <th class="col-nik" rowspan="2">NIK</th>
                        <th class="col-company" rowspan="2">Perusahaan</th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki?</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Apakah danger tag sesuai dan memadai?</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Apakah gembok sesuai dan memadai?</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?</div>
                            </div>
                        </th>
                        <th class="col-check">
                            <div class="header-wrapper">
                                <div class="rotated-text">Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?</div>
                            </div>
                        </th>
                        <th class="col-ket" rowspan="2">Keterangan</th>
                    </tr>
                    <!-- Empty row for logic if needed -->
                </thead>
                <tbody>


                    ${paddedRecords.map((rec, idx) => `
                    <tr>
                        <td>${idx + 1}.</td>
                        <td class="main-col-name">${rec.nama || (rec as any).namaNik || (rec as any).namaKaryawan || ''}</td>
                        <td>${rec.nik || ''}</td>
                        <td>${rec.perusahaan || ''}</td>
                        <td>${getCheck(rec.q1_gembokTagTerpasang)}</td>
                        <td>${getCheck(rec.q2_dangerTagSesuai)}</td>
                        <td>${getCheck(rec.q3_gembokSesuai)}</td>
                        <td>${getCheck(rec.q4_kunciUnik)}</td>
                        <td>${getCheck(rec.q5_haspBenar)}</td>
                        <td style="text-align:left;">${rec.keterangan || ''}</td>
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
                                ${obs.tandaTangan ? `<img src="${obs.tandaTangan}" class="sig-img" />` : ''}
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
                                ${obs.tandaTangan ? `<img src="${obs.tandaTangan}" class="sig-img" />` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>


            <!-- Doc Footer -->
            <div class="doc-footer">
                <div>BIB – HSE – ES – F – 3.02 – 83</div>
                <div>Maret 2025/R0</div>
                <div>Page 1 of 1</div>
            </div>
        </div>
    </body>
    </html>
    `;
}
