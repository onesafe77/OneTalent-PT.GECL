import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log('Successfully connected to the database at:', res.rows[0].now);
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    }
}

main();
