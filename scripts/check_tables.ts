
import 'dotenv/config';
import { pool } from "../server/db";

async function checkTables() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'simper_ev_monitoring';
    `);

        console.log("Columns for simper_ev_monitoring:", res.rows);
    } catch (error) {
        console.error("Error checking tables:", error);
    } finally {
        await pool.end();
    }
}

checkTables();
