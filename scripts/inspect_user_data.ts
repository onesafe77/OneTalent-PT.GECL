
import 'dotenv/config';
import { storage } from "../server/storage";

async function inspectUsers() {
    try {
        console.log("Connecting to DB...");
        const users = await storage.getAllEmployees();
        console.log(`Fetched ${users.length} users.`);

        // Filter for the users mentioned by the user
        // "Dimas Saputra" and "Aris Muhammad S"
        // Also check for any HSE department variations
        const hseUsers = users.filter(u =>
            (u.name && u.name.toLowerCase().includes("dimas")) ||
            (u.name && u.name.toLowerCase().includes("aris")) ||
            (u.department && u.department.toLowerCase().includes("hse"))
        );

        console.log("Found users (Matching 'dimas', 'aris', or 'hse' dept):");
        hseUsers.forEach(u => {
            console.log(`Name: ${u.name}`);
            console.log(`Position: ${u.position}`);
            console.log(`Department: '${u.department}'`);
            console.log("-------------------");
        });

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

inspectUsers();
