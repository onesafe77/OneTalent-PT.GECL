
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function getAbdulRahman() {
    try {
        const result = await (storage as any).db.execute(sql`
      SELECT * FROM sidak_fatigue_records WHERE nama = 'ABDUL RAHMAN 1' ORDER BY created_at DESC LIMIT 1
    `);
        console.log("Record Detail:");
        console.log("ID:", result.rows[0].id);
        console.log("SessionID:", result.rows[0].session_id);
        console.log("Nama:", result.rows[0].nama);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getAbdulRahman();
