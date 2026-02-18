
import { db } from "../server/db";
import { sidakFatigueRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Seeding dummy intervention data...");

    try {
        const record = await db
            .select()
            .from(sidakFatigueRecords)
            .limit(1);

        if (record.length === 0) {
            console.log("No records to update.");
            process.exit(0);
        }

        const rec = record[0];
        console.log(`Updating record ID: ${rec.id}, Name: ${rec.nama}`);

        await db
            .update(sidakFatigueRecords)
            .set({
                catatanIntervensi: "Tindak lanjut: Karyawan diminta istirahat 30 menit karena terlihat lelah. Dilakukan re-check setelah istirahat.",
                buktiIntervensi: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=600"
            })
            .where(eq(sidakFatigueRecords.id, rec.id));

        console.log("Record updated with dummy intervention data.");
    } catch (error) {
        console.error("Update failed:", error);
    } finally {
        process.exit(0);
    }
}

main();
