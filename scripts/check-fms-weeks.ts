
import 'dotenv/config';
import { db } from "../server/db";
import { fmsViolations } from "../shared/schema";
import { sql } from "drizzle-orm";

async function checkWeeks() {
    const result = await db.execute(sql`
    SELECT week, COUNT(*) as count 
    FROM fms_violations 
    GROUP BY week 
    ORDER BY week
  `);

    console.log("Week Distribution in DB:");
    console.table(result.rows);

    // Check typical dates for each week
    const dateCheck = await db.execute(sql`
    SELECT week, MIN(violation_date) as min_date, MAX(violation_date) as max_date
    FROM fms_violations
    GROUP BY week
    ORDER BY week
  `);

    console.log("Date Ranges per Week:");
    console.table(dateCheck.rows);

    process.exit(0);
}

checkWeeks().catch(console.error);
