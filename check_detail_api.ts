
import { storage } from "./server/storage";

async function checkSessionDetail() {
    const sessionId = "2df3a4c1-52de-4c91-93a7-91f10a4c2266";

    try {
        console.log(`Getting records for session ${sessionId}...`);
        const records = await storage.getSidakFatigueRecords(sessionId);
        console.log("Records Count:", records.length);
        const abdul = records.find((r: any) => r.nama === "ABDUL RAHMAN 1");
        console.log("Abdul Rahman 1 Record:");
        console.log(JSON.stringify(abdul, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSessionDetail();
