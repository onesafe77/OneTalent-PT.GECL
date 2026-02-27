import { db } from './server/db.js';
import { rosterSchedules } from './shared/schema.js';

async function test() {
    try {
        const r = await db.insert(rosterSchedules).values({
            employeeId: 'C-028937',
            date: '2026-02-28',
            shift: 'SHIFT 1',
            startTime: '06:00',
            endTime: '16:00',
            fitToWork: 'Fit To Work',
            status: 'scheduled'
        }).returning();
        console.log("Returned row:", r);
        console.log("Returned ID:", r[0].id);

        // delete what we just inserted to clean up
        const { eq } = await import('drizzle-orm');
        await db.delete(rosterSchedules).where(eq(rosterSchedules.id, r[0].id));
    } catch (e) {
        console.error(e);
    }
}

test();
