
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
    try {
        console.log("Checking if 'waktu' column exists...");

        const check = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'public_induction_attendance' 
      AND column_name = 'waktu';
    `);

        if (check.rows.length === 0) {
            console.log("Column not found. Adding 'waktu' to public_induction_attendance...");
            await db.execute(sql`
        ALTER TABLE public_induction_attendance 
        ADD COLUMN waktu VARCHAR(20);
      `);
            console.log("✅ Column 'waktu' added successfully.");
        } else {
            console.log("ℹ️ Column 'waktu' already exists.");
        }

    } catch (error) {
        console.error("Error running manual migration:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
