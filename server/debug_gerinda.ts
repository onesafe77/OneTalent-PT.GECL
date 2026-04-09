import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function debug() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Connect to DB...");
        const client = await pool.connect();

        console.log("\n--- Testing gen_random_uuid() ---");
        try {
            const uuidRes = await client.query("SELECT gen_random_uuid()");
            console.log("  ✅ gen_random_uuid() works:", uuidRes.rows[0].gen_random_uuid);
        } catch (e: any) {
            console.log("  ❌ gen_random_uuid() FAILED:", e.message);
        }

        console.log("\n--- Checking Sidak Gerinda Duduk Tables ---");
        const tables = ['sidak_gerinda_duduk_sessions', 'sidak_gerinda_duduk_records', 'sidak_gerinda_duduk_observers'];

        for (const table of tables) {
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);

            console.log(`\nTable: ${table}`);
            if (res.rows.length === 0) {
                console.log("  ❌ TABLE NOT FOUND");
            } else {
                res.rows.forEach(col => {
                    console.log(`  - ${col.column_name}: ${col.data_type}`);
                });
            }
        }

        client.release();
    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        await pool.end();
    }
}

debug();
