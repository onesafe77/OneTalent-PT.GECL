import { storage } from "../server/storage";

async function testApi() {
    const startDate = "2026-02-06";
    const endDate = "2026-02-07";
    const options = {
        startTime: "06:00",
        endTime: "06:00"
    };

    console.log(`Calling getFmsAnalytics with:`, { startDate, endDate, options });
    const result = await storage.getFmsAnalytics(startDate, endDate, options);

    console.log("Summary Result:");
    console.log(JSON.stringify(result.summary, null, 2));

    console.log("Available Violation Types length:", result.availableViolationTypes.length);
    console.log("By Violation length:", result.byViolation.length);
    console.log("Available Weeks length:", result.availableWeeks.length);

    if (result.availableViolationTypes.length === 0) {
        console.log("WARNING: availableViolationTypes is EMPTY!");
    }
}

testApi().catch(console.error);
