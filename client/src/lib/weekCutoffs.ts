import { getWeek, startOfWeek, endOfWeek, setWeek, addDays } from 'date-fns';

export interface WeekRange {
  weekNumber: number; // calendar week number (e.g. 16)
  startDate: string;  // YYYY-MM-DD (Sunday)
  endDate: string;    // YYYY-MM-DD (Saturday)
  label: string;      // "Week 16 (12 Apr – 18 Apr)"
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const MONTH_INDEX: Record<string, number> = {
  Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
  Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11
};

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shortLabel(d: Date): string {
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

/**
 * Compute Sunday–Saturday date range for a given calendar week number + year.
 * Uses Sunday-start convention: week 16 of 2026 = Apr 12 (Sun) → Apr 18 (Sat)
 */
export function getWeekDateRange(weekNumber: number, year: number): { startDate: string; endDate: string } {
  const ref = setWeek(new Date(year, 0, 4), weekNumber, { weekStartsOn: 0 });
  const sun = startOfWeek(ref, { weekStartsOn: 0 }); // Sunday
  const nextSun = addDays(sun, 7); // Next Sunday

  return {
    startDate: `${toYMD(sun)}T06:00:00`,
    endDate: `${toYMD(nextSun)}T05:59:59`
  };
}

/**
 * Return all calendar weeks (Sun–Sat) that overlap a given month.
 * Handles edge case where last week of Dec rolls over to week 1 of next year.
 */
export function getWeeksInMonth(year: number, monthName: string): WeekRange[] {
  const mi = MONTH_INDEX[monthName];
  if (mi === undefined) return [];

  const firstDay = new Date(year, mi, 1);
  const lastDay = new Date(year, mi + 1, 0); // last day of month

  const firstWeekNum = getWeek(firstDay, { weekStartsOn: 0 });
  const lastWeekNum = getWeek(lastDay, { weekStartsOn: 0 });

  const weeks: WeekRange[] = [];

  // Handle December edge case: last days may roll to week 1 of next year
  if (lastWeekNum < firstWeekNum) {
    // Dec: iterate from firstWeekNum to max weeks in year, then add week 1
    const maxWeek = getWeek(new Date(year, 11, 24), { weekStartsOn: 0 });
    for (let w = firstWeekNum; w <= maxWeek; w++) {
      const { startDate, endDate } = getWeekDateRange(w, year);
      weeks.push({
        weekNumber: w,
        startDate,
        endDate,
        label: `Week ${w} (${shortLabel(new Date(startDate))} – ${shortLabel(new Date(endDate))})`
      });
    }
    // week 1 of next year
    const { startDate, endDate } = getWeekDateRange(1, year + 1);
    weeks.push({
      weekNumber: 1,
      startDate,
      endDate,
      label: `Week 1 (${shortLabel(new Date(startDate))} – ${shortLabel(new Date(endDate))})`
    });
  } else {
    for (let w = firstWeekNum; w <= lastWeekNum; w++) {
      const { startDate, endDate } = getWeekDateRange(w, year);
      weeks.push({
        weekNumber: w,
        startDate,
        endDate,
        label: `Week ${w} (${shortLabel(new Date(startDate))} – ${shortLabel(new Date(endDate))})`
      });
    }
  }

  return weeks;
}

/** Get current calendar week number (Sunday-start) */
export function getCurrentWeekNumber(): number {
  return getWeek(new Date(), { weekStartsOn: 0 });
}

/**
 * Nomor minggu berjalan (cutweek) dari sebuah tanggal — sama dengan sistem Monitoring Fatigue
 * (minggu kalender, mulai Minggu). Menerima Date atau string "YYYY-MM-DD".
 * Mengembalikan 0 bila tanggal tidak valid.
 */
export function getRunningWeek(d: string | Date | null | undefined): number {
  if (!d) return 0;
  let date: Date;
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  } else {
    date = d;
  }
  if (isNaN(date.getTime())) return 0;
  return getWeek(date, { weekStartsOn: 0 });
}
