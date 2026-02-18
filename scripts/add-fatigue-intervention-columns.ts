
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Adding intervention columns to sidak_fatigue_records...");

    try {
        await db.execute(sql`
      ALTER TABLE sidak_fatigue_records 
      ADD COLUMN IF NOT EXISTS catatan_intervensi TEXT;
    `);
        console.log("Added catatan_intervensi column.");

        await db.execute(sql`
      ALTER TABLE sidak_fatigue_records 
      ADD COLUMN IF NOT EXISTS bukti_intervensi TEXT;
    `);
        console.log("Added bukti_intervensi column.");

        console.log("Migration complete!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

main();
