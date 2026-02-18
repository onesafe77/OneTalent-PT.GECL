
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkSessionRecordsFull() {
    const sessionId = "2df3a4c1-52de-4c91-93a7-91f10a4c2266";
    try {
        const result = await (storage as any).db.execute(sql`
      SELECT id, ordinal, nama, nik, catatan_intervensi, bukti_intervensi 
      FROM sidak_fatigue_records 
      WHERE session_id = ${sessionId}
      ORDER BY ordinal ASC
    `);
        console.log("Records in Session:");
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSessionRecordsFull();
