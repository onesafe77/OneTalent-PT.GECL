
import 'dotenv/config';
import { storage } from "../server/storage";
import { getRoleFromPosition, createUserWithRole } from "../shared/rbac";

const targetNames = [
    "ARIS MUHAMMAD S",
    "MUHAMMAD ALFIANSYAH",
    "AKHMAD ZAINUL FAHMIE",
    "JUMAIDI",
    "M IQBAL",
    "DANU AMPARIAN",
    "MILA MARDIYANA",
    "YUDI ERWANTO",
    "HAIRUL",
    "DIMAS SAPUTRA",
    "BAGUS ANDYKA FIRMANSYAH"
];

async function verifyUsers() {
    try {
        console.log("Connecting to DB...");
        const users = await storage.getAllEmployees();

        console.log("\n--- Verifying Access for Requested Users ---");

        let allAdmin = true;

        for (const name of targetNames) {
            // Find user (case-insensitive partial match)
            const user = users.find(u => u.name.toLowerCase().includes(name.toLowerCase()));

            if (!user) {
                console.log(`⚠️ User not found: ${name}`);
                continue;
            }

            // Compute Role
            const computedRole = getRoleFromPosition(user.position, user.department);
            const isOk = computedRole === "ADMIN";

            console.log(`User: ${user.name}`);
            console.log(`  Dept: '${user.department}'`);
            console.log(`  Role: ${computedRole} ${isOk ? "✅" : "❌"}`);

            if (!isOk) allAdmin = false;
        }

        console.log("----------------------------------------------");
        if (allAdmin) {
            console.log("SUCCESS: All found users have ADMIN access.");
        } else {
            console.log("FAILURE: Some users do not have ADMIN access.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

verifyUsers();
