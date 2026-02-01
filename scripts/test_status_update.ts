
import 'dotenv/config';
import { storage } from "../server/storage";
import { db } from "../server/db";
import { simperEvMonitoring, simperEvHistory } from "../shared/schema";
import { eq } from "drizzle-orm";

async function runTest() {
    console.log("Starting Status Update Test...");

    const testNik = "TEST-NIK-001";

    // 1. Clean up potential old test data
    await db.delete(simperEvHistory).where(eq(simperEvHistory.nikSimper, testNik));
    await db.delete(simperEvMonitoring).where(eq(simperEvMonitoring.nikSimper, testNik));

    // 2. Create a dummy monitoring record
    console.log("Creating monitoring record...");
    await storage.createSimperEvMonitoring({
        nama: "Test User",
        nikSimper: testNik,
        unit: "Test Unit",
        statusPengajuan: "Original Status"
    });

    // 3. Verify initial status
    let record = (await storage.getAllSimperEvMonitoring()).find(r => r.nikSimper === testNik);
    console.log("Initial Status:", record?.statusPengajuan);

    if (record?.statusPengajuan !== "Original Status") {
        console.error("Failed to create initial record correctly.");
        return;
    }

    // 4. Simulate the API route logic
    console.log("Creating history record and triggering status update...");
    const newWorkflowLevel = "New Workflow Status";

    await storage.createSimperEvHistory({
        nikSimper: testNik,
        approver: "Admin",
        status: "APPROVED",
        workflowLevel: newWorkflowLevel,
        message: "Test update"
    });

    // Manually call the update method as the route would
    await storage.updateSimperEvMonitoringStatusByNik(testNik, newWorkflowLevel);

    // 5. Verify updated status
    record = (await storage.getAllSimperEvMonitoring()).find(r => r.nikSimper === testNik);
    console.log("Final Status:", record?.statusPengajuan);

    if (record?.statusPengajuan === newWorkflowLevel) {
        console.log("SUCCESS: Status updated correctly.");
    } else {
        console.error("FAILURE: Status DID NOT update. Expected:", newWorkflowLevel, "Got:", record?.statusPengajuan);
    }

    // Cleanup
    await db.delete(simperEvHistory).where(eq(simperEvHistory.nikSimper, testNik));
    await db.delete(simperEvMonitoring).where(eq(simperEvMonitoring.nikSimper, testNik));
    process.exit(0);
}

runTest().catch(console.error);
