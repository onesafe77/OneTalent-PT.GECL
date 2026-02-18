import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkTables() {
    try {
        console.log("Checking tables...");
        const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'sidak_behavior%';
    `);
        console.log("Found tables:", result.rows);
        process.exit(0);
    } catch (error) {
        console.error("Error checking tables:", error);
        process.exit(1);
    }
}

checkTables();
