
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function verify() {
    try {
        console.log("Verifying public_induction_attendance schema...");

        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'public_induction_attendance' 
      AND column_name = 'waktu';
    `);

        if (result.rows.length > 0) {
            console.log("✅ Column 'waktu' found in public_induction_attendance.");
            console.log(result.rows[0]);
        } else {
            console.error("❌ Column 'waktu' NOT found!");
            process.exit(1);
        }
    } catch (error) {
        console.error("Error verifying schema:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verify();
