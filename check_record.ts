
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkRecord() {
    try {
        const result = await (storage as any).db.execute(sql`
      SELECT * FROM sidak_fatigue_records LIMIT 1
    `);
        console.log("Record Sample:");
        console.log(JSON.stringify(result.rows[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error checking record:", err);
        process.exit(1);
    }
}

checkRecord();
