import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
    const res = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'fms_violations' AND column_name IN ('manual_driver_name', 'manual_driver_nik')
  `);

    const existing = res.rows.map(r => r.column_name);
    console.log('Existing columns:', existing);

    if (!existing.includes('manual_driver_name')) {
        await client.query(`ALTER TABLE fms_violations ADD COLUMN manual_driver_name VARCHAR(150)`);
        console.log('Added manual_driver_name column');
    } else {
        console.log('manual_driver_name already exists');
    }

    if (!existing.includes('manual_driver_nik')) {
        await client.query(`ALTER TABLE fms_violations ADD COLUMN manual_driver_nik VARCHAR(50)`);
        console.log('Added manual_driver_nik column');
    } else {
        console.log('manual_driver_nik already exists');
    }

    console.log('Done!');
} catch (err) {
    console.error('Error:', err.message);
} finally {
    await client.end();
}
