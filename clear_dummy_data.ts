
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function clearDummyData() {
    const id = "09f455ba-fd20-4f72-abc7-a4c75bfddbb9";
    try {
        await (storage as any).db.execute(sql`
      UPDATE sidak_fatigue_records 
      SET catatan_intervensi = NULL, bukti_intervensi = NULL 
      WHERE id = ${id}
    `);
        console.log("CLEARED");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

clearDummyData();
