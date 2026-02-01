
import 'dotenv/config';
import { storage } from '../server/storage';

async function testQueries() {
    console.log("Testing Simper EV Monitoring query...");
    try {
        const results = await storage.getAllSimperEvMonitoring();
        console.log("Simper EV Monitoring results:", results.length);
    } catch (error) {
        console.error("Error fetching Simper EV data:", error);
    }

    console.log("Testing Simper Mitra query...");
    try {
        const mitras = await storage.getSimperMitras();
        console.log("Simper Mitra results:", mitras);
    } catch (error) {
        console.error("Error fetching Simper Mitra data:", error);
    }
}

testQueries();
