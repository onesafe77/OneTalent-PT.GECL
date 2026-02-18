
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkTodayRecords() {
    try {
        const result = await (storage as any).db.execute(sql`
      SELECT id, nama, nik, created_at 
      FROM sidak_fatigue_records 
      WHERE created_at >= '2026-02-17'
      ORDER BY created_at DESC
    `);
        console.log("Today's Records:");
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTodayRecords();
