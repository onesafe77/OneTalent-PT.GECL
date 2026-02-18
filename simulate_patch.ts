
import fetch from "node-fetch";
import { sql } from "drizzle-orm";

async function simulateFrontendPatch() {
    const baseUrl = "http://localhost:5000";
    try {
        // First, find a record ID
        const detailRes = await fetch(`${baseUrl}/api/sidak-recap/detail?sessionId=ANY&type=Fatigue`);
        // Wait, I need a real sessionId. I'll just use my manual script to get one.
    } catch (err) {
        console.error(err);
    }
}

// Since I have direct access to storage, I'll just use that with a script that acts like the route.
import { storage } from "./server/storage";

async function testFrontendLikePatch() {
    try {
        const id = "09f455ba-fd20-4f72-abc7-a4c75bfddbb9"; // Today's record for ABDUL RAHMAN 1

        console.log(`Simulating PATCH for ID ${id}...`);

        // Exact body the frontend sends
        const body = {
            buktiIntervensi: "data:image/png;base64,SIMULATED_FRONTEND_DATA",
            catatanIntervensi: "Note from simulation"
        };

        // Logic from routes.ts
        const validFields = [
            "catatanIntervensi", "buktiIntervensi",
            "konsumiObat", "masalahPribadi", "pemeriksaanRespon",
            "pemeriksaanKonsentrasi", "pemeriksaanKesehatan",
            "karyawanSiapBekerja", "fitUntukBekerja", "istirahatDanMonitor",
            "istirahatLebihdariSatuJam", "tidakBolehBekerja"
        ];

        const updateData: any = {};
        for (const key of Object.keys(body)) {
            if (validFields.includes(key)) {
                updateData[key] = (body as any)[key];
            }
        }

        console.log("updateData:", updateData);

        const result = await storage.updateSidakFatigueRecord(id, updateData);
        console.log("Result:", JSON.stringify(result, null, 2));

    } catch (err) {
        console.error(err);
    }
}

testFrontendLikePatch();
