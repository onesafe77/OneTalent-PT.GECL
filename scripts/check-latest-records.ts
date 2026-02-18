
import { db } from "../server/db";
import { sidakFatigueRecords } from "@shared/schema";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Checking latest 5 records...");

    try {
        const records = await db
            .select({
                id: sidakFatigueRecords.id,
                nama: sidakFatigueRecords.nama,
                catatanIntervensi: sidakFatigueRecords.catatanIntervensi,
                buktiIntervensi: sidakFatigueRecords.buktiIntervensi,
                createdAt: sidakFatigueRecords.createdAt
            })
            .from(sidakFatigueRecords)
            .orderBy(desc(sidakFatigueRecords.createdAt))
            .limit(5);

        records.forEach(r => {
            console.log(`[${r.createdAt}] ID: ${r.id}, Name: ${r.nama}`);
            console.log(`  Note: '${r.catatanIntervensi}'`);
            console.log(`  Evidence: '${r.buktiIntervensi}'`);
            console.log("---");
        });

    } catch (error) {
        console.error("Check failed:", error);
    } finally {
        process.exit(0);
    }
}

main();
