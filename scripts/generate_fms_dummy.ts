
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { format, subDays, addHours } from 'date-fns';

const TOTAL_ROWS = 100;
const OUTPUT_FILE = 'fms_dummy_data.xlsx';

const VIOLATION_TYPES = [
    'Overspeed', 'Fatigue (Microsleep)', 'Distraction (Smoking)', 'Distraction (Phone)', 'Seatbelt', 'Camera Tampering'
];
const COMPANIES = ['PT GECL'];
const LOCATIONS = ['Hauling KM 10', 'Loading Point A', 'Dumping Point', 'Pit B', 'Rest Area', 'Simpang 4'];
const VEHICLE_PREFIXES = ['DT', 'HD', 'LV', 'GD'];

function getRandomItem(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

console.log('Generating dummy FMS data...');

const data = [];
const today = new Date();
const startDate = subDays(today, 30);

for (let i = 0; i < TOTAL_ROWS; i++) {
    const date = getRandomDate(startDate, today);
    const violationDate = format(date, 'yyyy-MM-dd');
    const violationTime = format(date, 'HH:mm:ss');

    // Shift Logic (Simple)
    const hour = date.getHours();
    const shift = (hour >= 6 && hour < 18) ? 'Shift 1' : 'Shift 2';

    // Weighted Invalid Status (30% Invalid)
    const isValid = Math.random() > 0.3;
    const status = isValid ? 'Valid' : 'Tidak Valid';

    const vehicle = `${getRandomItem(VEHICLE_PREFIXES)}-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`;
    const company = getRandomItem(COMPANIES);

    data.push({
        'No': i + 1,
        'Date': violationDate,
        'Time': violationTime,
        'Vehicle No': vehicle,
        'Company': company,
        'Violation': getRandomItem(VIOLATION_TYPES),
        'Location': getRandomItem(LOCATIONS),
        'Coordinate Level': `${(-2.0 - Math.random()).toFixed(6)}, ${(115.0 + Math.random()).toFixed(6)}`,
        'Shift': shift,
        'Validation': status,
        'Date Opr': violationDate, // Simplified
        'Week': Math.ceil(date.getDate() / 7),
        'Month': format(date, 'MMM'),
        'Level': Math.floor(Math.random() * 3) + 1
    });
}

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'FMS Data');

XLSX.writeFile(workbook, OUTPUT_FILE);

console.log(`Successfully generated ${OUTPUT_FILE} with ${TOTAL_ROWS} rows.`);
