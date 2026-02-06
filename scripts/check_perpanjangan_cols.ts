
import "dotenv/config";
import { pool } from "../server/db";

async function main() {
    const client = await pool.connect();
    try {
        const table = "simper_perpanjangan";
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

        console.log(`Columns for ${table}:`);
        console.table(res.rows);
    } catch (err) {
        console.error("Error checking columns:", err);
    } finally {
        client.release();
        pool.end();
    }
}

main();
