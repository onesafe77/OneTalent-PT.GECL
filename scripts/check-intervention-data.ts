
import { db } from "../server/db";
import { sidakFatigueRecords } from "@shared/schema";
import { isNotNull, or, ne } from "drizzle-orm";

async function main() {
    console.log("Checking for records with intervention data...");

    try {
        const records = await db
            .select()
            .from(sidakFatigueRecords)
            .where(
                or(
                    isNotNull(sidakFatigueRecords.catatanIntervensi),
                    isNotNull(sidakFatigueRecords.buktiIntervensi),
                    ne(sidakFatigueRecords.catatanIntervensi, ""),
                    ne(sidakFatigueRecords.buktiIntervensi, "")
                )
            )
            .limit(5);

        console.log(`Found ${records.length} records with intervention data.`);
        if (records.length > 0) {
            records.forEach(r => {
                console.log(`- ID: ${r.id}, Name: ${r.nama}, Note: ${r.catatanIntervensi}, Evidence: ${r.buktiIntervensi}`);
            });
        } else {
            console.log("No records found with intervention data.");
        }
    } catch (error) {
        console.error("Check failed:", error);
    } finally {
        process.exit(0);
    }
}

main();
