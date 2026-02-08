import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function testFormat() {
    try {
        const result = await db.execute(sql`SELECT '06/02/2026 06:00'::timestamp`);
        console.log("Casting successful:", result.rows[0]);
    } catch (e: any) {
        console.log("Casting failed for DD/MM/YYYY:", e.message);
    }

    try {
        const result = await db.execute(sql`SELECT '2026-02-06 06:00'::timestamp`);
        console.log("Casting successful for ISO:", result.rows[0]);
    } catch (e: any) {
        console.log("Casting failed for ISO:", e.message);
    }
}

testFormat().catch(console.error);
