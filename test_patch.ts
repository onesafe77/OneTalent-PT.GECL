
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function testPatch() {
    try {
        const records = await (storage as any).db.execute(sql`
      SELECT id FROM sidak_fatigue_records LIMIT 1
    `);

        if (records.rows.length === 0) {
            console.log("No records found.");
            process.exit(0);
        }

        const id = records.rows[0].id;
        console.log(`Testing PATCH logic for id ${id}...`);

        // Simulate what's in routes.ts
        const reqBody = {
            catatanIntervensi: "PATCH Test SUCCESS",
            buktiIntervensi: "data:image/png;base64,TEST"
        };

        const validFields = [
            "catatanIntervensi", "buktiIntervensi"
        ];

        const updateData: any = {};
        for (const key of Object.keys(reqBody)) {
            if (validFields.includes(key)) {
                updateData[key] = (reqBody as any)[key];
            }
        }

        console.log("updateData created:", updateData);

        const result = await storage.updateSidakFatigueRecord(id, updateData);
        console.log("Result from storage.updateSidakFatigueRecord:", JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error in testPatch:", err);
        process.exit(1);
    }
}

testPatch();
