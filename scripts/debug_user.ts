
import 'dotenv/config';
import { storage } from "../server/storage";

async function checkUser() {
    const nik = "C-005876";
    console.log(`Restoring data for NIK: ${nik}`);

    const historyRecords = await storage.getSimperEvHistory(nik);
    const latest = historyRecords[0];

    if (latest && latest.workflowLevel) {
        console.log(`Found latest history: ${latest.workflowLevel}. Updating...`);
        await storage.updateSimperEvMonitoringStatusByNik(nik, latest.workflowLevel);
        console.log("Restored.");
    } else {
        console.log("No history found to restore from.");
    }

    process.exit(0);
}

checkUser().catch(console.error);
