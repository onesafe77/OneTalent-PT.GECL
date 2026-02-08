import { db } from "../server/db";
import { fmsViolations } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkShifts() {
    console.log("Checking unique shifts in fms_violations...");
    const shifts = await db.select({
        shift: fmsViolations.shift,
        count: sql<number>`count(*)::integer`
    }).from(fmsViolations).groupBy(fmsViolations.shift);

    console.table(shifts);
}

checkShifts().catch(console.error);
