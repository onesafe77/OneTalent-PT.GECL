
import 'dotenv/config';
import { db } from "../server/db";
import { fmsViolations } from "../shared/schema";
import { sql, eq, and, or, desc, asc, inArray } from "drizzle-orm";

async function getFmsAnalytics(
    startDate?: string,
    endDate?: string,
    options?: {
        startTime?: string;
        endTime?: string;
        violationType?: string;
        shift?: string;
        validationStatus?: string;
        week?: string;
    }
) {
    // Exact copy of the logic in server/storage.ts to confirm behavior
    const conditions: any[] = [];
    if (startDate && endDate) {
        conditions.push(sql`${fmsViolations.violationDate} >= ${startDate}`);
        conditions.push(sql`${fmsViolations.violationDate} <= ${endDate}`);
    }

    // 10. Available Weeks Filter (Similar strategy: include Date but exclude Week filter)
    const conditionsForAvailableWeeks: any[] = [];
    if (startDate && endDate) {
        conditionsForAvailableWeeks.push(sql`${fmsViolations.violationDate} >= ${startDate}`);
        conditionsForAvailableWeeks.push(sql`${fmsViolations.violationDate} <= ${endDate}`);
    }

    if (options?.startTime) conditionsForAvailableWeeks.push(sql`${fmsViolations.violationTime}::time >= ${options.startTime}::time`);
    if (options?.endTime) conditionsForAvailableWeeks.push(sql`${fmsViolations.violationTime}::time <= ${options.endTime}::time`);

    if (options?.violationType && options.violationType !== 'all') {
        const types = options.violationType.split(',').map(t => t.trim()).filter(t => t);
        if (types.length === 1) conditionsForAvailableWeeks.push(eq(fmsViolations.violationType, types[0]));
        else if (types.length > 1) conditionsForAvailableWeeks.push(inArray(fmsViolations.violationType, types));
    }

    if (options?.shift && options.shift !== 'all') {
        const shifts = options.shift.split(',').map(s => s.trim()).filter(s => s);
        if (shifts.length === 1) conditionsForAvailableWeeks.push(eq(fmsViolations.shift, shifts[0]));
        else if (shifts.length > 1) conditionsForAvailableWeeks.push(inArray(fmsViolations.shift, shifts));
    }

    if (options?.validationStatus && options.validationStatus !== 'all') {
        const statuses = options.validationStatus.split(',').map(s => s.trim()).filter(s => s);
        const statusConditions: any[] = [];
        for (const status of statuses) {
            if (status === 'Valid') statusConditions.push(sql`${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True'`);
            else if (status === 'Tidak Valid') statusConditions.push(sql`${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False'`);
        }
        if (statusConditions.length > 0) conditionsForAvailableWeeks.push(or(...statusConditions));
    }

    const availableWeeksFilter = conditionsForAvailableWeeks.length > 0 ? and(...conditionsForAvailableWeeks) : undefined;

    // 11. Available Weeks (Independent of week filter) - NEW
    const availableWeeks = await db
        .select({
            week: fmsViolations.week
        })
        .from(fmsViolations)
        .where(availableWeeksFilter)
        .groupBy(fmsViolations.week)
        .orderBy(asc(fmsViolations.week));

    return availableWeeks.map(w => w.week);
}

async function run() {
    console.log("Testing with Date Range: 2026-02-01 to 2026-02-28");
    const result = await getFmsAnalytics('2026-02-01', '2026-02-28', {});
    console.log("Available Weeks:", result);
    process.exit(0);
}

run().catch(console.error);
