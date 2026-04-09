import { storage } from "../server/storage";
import { insertSidakSeatbeltSessionSchema, insertSidakSeatbeltRecordSchema, insertSidakRosterSessionSchema, insertSidakRosterRecordSchema } from "./shared/schema";

async function verifyFix() {
    console.log("🚀 Starting Sidak Fix Verification...");

    // 1. Test Seatbelt
    console.log("\n--- Testing Seatbelt Sidak ---");
    const sbSession = await storage.createSidakSeatbeltSession({
        tanggal: "2026-04-07",
        waktu: "10:00",
        shift: "Shift 1",
        shiftType: "Shift 1",
        lokasi: "Test Location",
        activityPhotos: []
    });
    console.log("Created Seatbelt Session:", sbSession.id);
    console.log("Initial totalSampel:", sbSession.totalSampel);

    await storage.createSidakSeatbeltRecord({
        sessionId: sbSession.id,
        nama: "Test Driver",
        nik: "T-001",
        nomorLambung: "TX-01",
        perusahaan: "Test Co",
        seatbeltDriverCondition: true,
        seatbeltPassengerCondition: true,
        seatbeltDriverUsage: true,
        seatbeltPassengerUsage: true,
        keterangan: "Test"
    });
    console.log("Added first Seatbelt record.");

    const sbSessionUpdated1 = await storage.getSidakSeatbeltSession(sbSession.id);
    console.log("Updated totalSampel (1 record):", sbSessionUpdated1?.totalSampel);

    if (sbSessionUpdated1?.totalSampel !== 1) {
        throw new Error(`Seatbelt totalSampel mismatch! Expected 1, got ${sbSessionUpdated1?.totalSampel}`);
    }

    // 2. Test Roster
    console.log("\n--- Testing Roster Sidak ---");
    const rsSession = await storage.createSidakRosterSession({
        tanggalPelaksanaan: "2026-04-07",
        jamPelaksanaan: "10:00",
        shift: "Shift 1",
        lokasi: "Test Location",
        subLokasi: "Test Sub",
        activityPhotos: []
    });
    console.log("Created Roster Session:", rsSession.id);

    await storage.createSidakRosterRecord({
        sessionId: rsSession.id,
        nama: "Test Employee",
        nik: "T-002",
        jabatan: "Operator",
        perusahaan: "Test Co",
        shiftTercatat: "Shift 1",
        absensiFingerprint: "Hadir",
        keterangan: "Test"
    });
    console.log("Added first Roster record.");

    const rsSessionUpdated1 = await storage.getSidakRosterSession(rsSession.id);
    console.log("Updated totalSampel (1 record):", rsSessionUpdated1?.totalSampel);

    if (rsSessionUpdated1?.totalSampel !== 1) {
        throw new Error(`Roster totalSampel mismatch! Expected 1, got ${rsSessionUpdated1?.totalSampel}`);
    }

    console.log("\n✅ Verification successful! Both Seatbelt and Roster sample counts are working correctly.");
}

verifyFix()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("\n❌ Verification failed:", err);
        process.exit(1);
    });
