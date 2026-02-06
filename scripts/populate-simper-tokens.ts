
import "dotenv/config";
import { pool } from "../server/db";
import { randomUUID } from "node:crypto";

async function main() {
    console.log("🚀 Starting trackingToken population for simper_perpanjangan...");
    const client = await pool.connect();

    try {
        // Check for records without trackingToken
        const { rows: records } = await client.query(
            "SELECT id FROM simper_perpanjangan WHERE tracking_token IS NULL"
        );

        console.log(`🔍 Found ${records.length} records without trackingToken.`);

        if (records.length === 0) {
            console.log("✅ No records need updating.");
            return;
        }

        let updatedCount = 0;
        for (const record of records) {
            const token = randomUUID();
            await client.query(
                "UPDATE simper_perpanjangan SET tracking_token = $1 WHERE id = $2",
                [token, record.id]
            );
            updatedCount++;
            if (updatedCount % 10 === 0) {
                console.log(`⏳ Progress: ${updatedCount}/${records.length} records updated...`);
            }
        }

        console.log(`✨ Successfully updated ${updatedCount} records with trackingTokens.`);
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

main();
