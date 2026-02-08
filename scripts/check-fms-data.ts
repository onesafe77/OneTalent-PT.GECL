import { db } from "../server/db";
import { fmsViolations } from "../shared/schema";
import { count, sql } from "drizzle-orm";

async function checkData() {
    console.log("Checking fms_violations table...");
    const total = await db.select({ value: count() }).from(fmsViolations);
    console.log("Total records:", total[0].value);

    if (total[0].value > 0) {
        const samples = await db.select().from(fmsViolations).limit(5);
        console.log("Sample records:");
        console.table(samples.map(s => ({
            id: s.id,
            date: s.violationDate,
            time: s.violationTime,
            ts: s.violationTimestamp,
            type: s.violationType
        })));

        // Check specific range from screenshot
        const rangeCheck = await db.select({ value: count() })
            .from(fmsViolations)
            .where(sql`violation_timestamp >= '2026-02-06 06:00:00' AND violation_timestamp <= '2026-02-07 06:00:00'`);
        console.log("Records in range 2026-02-06 06:00 to 2026-02-07 06:00:", rangeCheck[0].value);
    }
}

checkData().catch(console.error);
