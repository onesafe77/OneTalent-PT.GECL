
import "dotenv/config";
import { db } from "./server/db";
import { sidakBehaviorSessions } from "./shared/schema";

async function testInsert() {
    try {
        console.log("Testing insert...");
        const payload = {
            tanggal: '2026-02-18',
            waktu: '13:57',
            shift: 'Shift 1',
            lokasi: 'CCR GECL',
            metodeSidak: 'Acak'
        };
        const [result] = await db.insert(sidakBehaviorSessions).values(payload).returning();
        console.log("Insert success:", result);
        process.exit(0);
    } catch (error) {
        console.error("Insert failed:", error);
        process.exit(1);
    }
}

testInsert();
