
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkSessionRecords() {
    try {
        const sessions = await storage.getAllSidakFatigueSessions();
        if (sessions.length === 0) {
            console.log("No sessions found.");
            process.exit(0);
        }

        const sessionId = sessions[0].id;
        console.log(`Checking records for session ${sessionId}...`);

        const records = await storage.getSidakFatigueRecords(sessionId);
        console.log("Records:");
        console.log(JSON.stringify(records, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error checking session records:", err);
        process.exit(1);
    }
}

checkSessionRecords();
