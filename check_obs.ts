import { db } from './server/db.js';
import { sidakSeatbeltObservers } from './shared/schema.js';
import { ilike, or } from 'drizzle-orm';

async function check() {
    const observers = await db.select().from(sidakSeatbeltObservers).where(
        or(
            ilike(sidakSeatbeltObservers.nama, '%putri%'),
            ilike(sidakSeatbeltObservers.nama, '%arif%')
        )
    );
    console.log('OBSERVERS:', observers);
    process.exit(0);
}
check().catch(console.error);
