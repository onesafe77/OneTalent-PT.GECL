import "dotenv/config";
import { db } from "./server/db";
import { sidakFatigueRecords } from "./shared/schema";
import { desc, gte } from "drizzle-orm";

async function checkRecentRecords() {
    console.log("--- Checking Recent Sidak Fatigue Records ---");

    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentRecords = await db.select().from(sidakFatigueRecords).where(gte(sidakFatigueRecords.createdAt, oneHourAgo)).orderBy(desc(sidakFatigueRecords.createdAt));

    console.log(`Found ${recentRecords.length} records in the last hour.`);
    recentRecords.forEach((r, i) => {
        console.log(`${i + 1}. ID: ${r.id}, SessionID: ${r.sessionId}, Nama: ${r.nama}, CreatedAt: ${r.createdAt}`);
    });
}

checkRecentRecords().catch(console.error);
