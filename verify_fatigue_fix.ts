import "dotenv/config";
import { db } from "./server/db";
import { sidakFatigueSessions, sidakFatigueRecords } from "./shared/schema";
import { eq, desc } from "drizzle-orm";
import { DrizzleStorage } from "./server/storage";

const storage = new DrizzleStorage(db);

async function verifyFix() {
    console.log("--- Verifying Sidak Fatigue Fix ---");

    // 1. Create a test session
    const session = await storage.createSidakFatigueSession({
        tanggal: new Date().toISOString().split('T')[0],
        waktu: "13:00",
        shift: "Shift 1",
        waktuMulai: "13:00",
        waktuSelesai: "13:30",
        lokasi: "Verification Test",
        area: "Test Area",
        departemen: "Test Dept",
        createdBy: "C-075768"
    });

    console.log(`Created test session: ${session.id}`);
    console.log(`Initial totalSampel: ${session.totalSampel}`);

    // 2. Add a record
    console.log("Adding a test record...");
    await storage.createSidakFatigueRecord({
        sessionId: session.id,
        nama: "VERIFY TEST",
        nik: "TEST-01",
        jabatan: "Operator",
        nomorLambung: "TEST-01",
        jamTidur: 8,
        konsumiObat: false,
        masalahPribadi: false,
        pemeriksaanRespon: true,
        pemeriksaanKonsentrasi: true,
        pemeriksaanKesehatan: true,
        karyawanSiapBekerja: true,
        fitUntukBekerja: true,
        istirahatDanMonitor: false,
        istirahatLebihdariSatuJam: false,
        tidakBolehBekerja: false
    });

    // 3. Trigger the update (simulating what the route does)
    await storage.updateSidakFatigueSessionSampleCount(session.id);

    // 4. Check results
    const [updatedSession] = await db.select().from(sidakFatigueSessions).where(eq(sidakFatigueSessions.id, session.id));
    console.log(`Updated totalSampel: ${updatedSession.totalSampel}`);

    if (updatedSession.totalSampel === 1) {
        console.log("SUCCESS: totalSampel updated correctly!");
    } else {
        console.log("FAILURE: totalSampel did not update.");
    }

    // Cleanup test session
    await storage.deleteSidakFatigueSession(session.id);
    console.log("Cleanup: Deleted test session.");
}

verifyFix().catch(console.error);
