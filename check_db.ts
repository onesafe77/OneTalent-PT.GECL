
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkColumns() {
    try {
        const result = await (storage as any).db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sidak_fatigue_records'
    `);
        console.log("Columns in sidak_fatigue_records:");
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error checking columns:", err);
        process.exit(1);
    }
}

checkColumns();
