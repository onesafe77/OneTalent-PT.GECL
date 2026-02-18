
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function manualUpdate() {
    try {
        // Get the first record's ID
        const records = await (storage as any).db.execute(sql`
      SELECT id FROM sidak_fatigue_records LIMIT 1
    `);

        if (records.rows.length === 0) {
            console.log("No records found.");
            process.exit(0);
        }

        const id = records.rows[0].id;
        console.log(`Updating record ${id}...`);

        const result = await storage.updateSidakFatigueRecord(id, {
            catatanIntervensi: "Manual Update Test",
            buktiIntervensi: "https://placehold.co/100x100?text=Manual+Test"
        });

        console.log("Update Result:");
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error manual updating:", err);
        process.exit(1);
    }
}

manualUpdate();
