import 'dotenv/config';
import { db } from "../server/db";
import { employees } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkPhoto() {
    console.log("Checking photo for employee C-075768...");
    try {
        const result = await db.select().from(employees).where(eq(employees.id, "C-075768"));

        if (result.length === 0) {
            console.log("Employee C-075768 not found!");
        } else {
            const emp = result[0];
            console.log("Employee Found:", emp.name);
            console.log("Photo URL:", emp.photoUrl);
            console.log("Full Record:", JSON.stringify(emp, null, 2));
        }
    } catch (error) {
        console.error("Error querying database:", error);
    }
    process.exit(0);
}

checkPhoto();
