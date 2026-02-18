
import { storage } from "./server/storage";
import { sql } from "drizzle-orm";

async function checkAllInterventions() {
    try {
        const result = await (storage as any).db.execute(sql`
      SELECT id, nama, catatan_intervensi, bukti_intervensi, created_at
      FROM sidak_fatigue_records 
      WHERE catatan_intervensi IS NOT NULL OR bukti_intervensi IS NOT NULL
      ORDER BY created_at DESC
    `);
        console.log("Intervention Records Found:");
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAllInterventions();
