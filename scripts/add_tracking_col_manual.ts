
import "dotenv/config";
import { pool } from "../server/db";

async function main() {
    const client = await pool.connect();
    try {
        console.log("Adding tracking_token column to simper_perpanjangan...");
        await client.query(`
      ALTER TABLE simper_perpanjangan 
      ADD COLUMN IF NOT EXISTS tracking_token varchar UNIQUE;
    `);

        console.log("Creating IDX_simper_perpanjangan_token index...");
        await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_simper_perpanjangan_token" 
      ON simper_perpanjangan (tracking_token);
    `);

        console.log("✅ Successfully added column and index.");
    } catch (err) {
        console.error("❌ Error applying schema changes:", err);
    } finally {
        client.release();
        pool.end();
    }
}

main();
