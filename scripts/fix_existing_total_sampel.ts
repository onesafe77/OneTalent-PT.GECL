import { storage } from "../server/storage";

async function fixHistoricalData() {
    console.log("🚀 Starting Sidak Historical Data Fix...");

    // 1. Fix Seatbelt
    console.log("\n--- Fixing Seatbelt Sidaks ---");
    const sbSessions = await storage.getAllSidakSeatbeltSessions();
    console.log(`Found ${sbSessions.length} sessions.`);

    for (const session of sbSessions) {
        if (session.totalSampel === 0) {
            console.log(`Fixing session ${session.id}...`);
            await storage.updateSidakSeatbeltSessionSampleCount(session.id);
        }
    }

    // 2. Fix Roster
    console.log("\n--- Fixing Roster Sidaks ---");
    const rsSessions = await storage.getAllSidakRosterSessions();
    console.log(`Found ${rsSessions.length} sessions.`);

    for (const session of rsSessions) {
        if (session.totalSampel === 0) {
            console.log(`Fixing session ${session.id}...`);
            await storage.updateSidakRosterSessionSampleCount(session.id);
        }
    }

    console.log("\n✅ Historical data fix completed!");
}

fixHistoricalData()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("\n❌ Fix failed:", err);
        process.exit(1);
    });
