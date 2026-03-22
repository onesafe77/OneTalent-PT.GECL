/**
 * SIM/SIMPER Expiry Status Calculator
 * Calculates status based on days until expiry
 */

export type ExpiryLevel = 'aktif' | 'near_expired' | 'expired' | 'nodata';

export interface ExpiryStatus {
    status: string;
    daysLeft: number | null;
    level: ExpiryLevel;
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
    badgeClass: string;
    displayText: string;
}

/**
 * Calculate expiry status from a date string
 * @param expiryDate - Date string (YYYY-MM-DD) or null
 * @returns ExpiryStatus object with status, days left, level, and styling info
 */
export function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
    // No data case
    if (!expiryDate) {
        return {
            status: 'TIDAK ADA',
            daysLeft: null,
            level: 'nodata',
            badgeVariant: 'outline',
            badgeClass: 'bg-gray-100 text-gray-500 border-gray-300',
            displayText: '—'
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Expired
    if (daysLeft < 0) {
        return {
            status: 'EXPIRED',
            daysLeft,
            level: 'expired',
            badgeVariant: 'destructive',
            badgeClass: 'bg-red-700 text-white',
            displayText: `Expired ${Math.abs(daysLeft)} hari lalu`
        };
    }

    // Near Expired (0-60 days)
    if (daysLeft <= 60) {
        return {
            status: 'NEAR EXPIRED',
            daysLeft,
            level: 'near_expired',
            badgeVariant: 'secondary',
            badgeClass: 'bg-yellow-500 text-white',
            displayText: `Sisa ${daysLeft} hari`
        };
    }

    // Aktif (> 60 days)
    return {
        status: 'AKTIF',
        daysLeft,
        level: 'aktif',
        badgeVariant: 'default',
        badgeClass: 'bg-emerald-500 text-white',
        displayText: `Sisa ${daysLeft} hari`
    };
}

/**
 * Get the worst status among multiple expiry statuses
 * Priority: expired > kritis > warning > aktif > nodata
 */
export function getWorstExpiryLevel(levels: ExpiryLevel[]): ExpiryLevel {
    const priority: Record<ExpiryLevel, number> = {
        expired: 4,
        near_expired: 3,
        aktif: 2,
        nodata: 1
    };

    let worst: ExpiryLevel = 'nodata';
    for (const level of levels) {
        if (priority[level] > priority[worst]) {
            worst = level;
        }
    }
    return worst;
}
