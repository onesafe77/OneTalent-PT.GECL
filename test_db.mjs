import { db } from './server/db.ts';
import { rosterSchedules } from './shared/schema.ts';
import { eq, and } from 'drizzle-orm';

async function test() {
    try {
        const employeeId = 'C-028937';
        // Let's insert first
        const [inserted] = await db.insert(rosterSchedules).values({
            employeeId,
            date: '2026-02-28',
            shift: 'SHIFT 1',
            startTime: '06:00',
            endTime: '16:00',
            fitToWork: 'Fit To Work',
            status: 'scheduled'
        }).returning();

        console.log("Newly Inserted ID:", inserted.id);

        // Now let's simulate the issue
        const all = await db.select().from(rosterSchedules).where(eq(rosterSchedules.employeeId, employeeId));

        console.log("All IDs found for employee:", all.map(r => r.id).join(', '));

        const createdIds = new Set([inserted.id]);
        const toDelete = all.filter(r => !createdIds.has(r.id));

        console.log("Rosters to delete (should be old ones):", toDelete.length);
        for (const r of toDelete) {
            await db.delete(rosterSchedules).where(eq(rosterSchedules.id, r.id));
        }

        const finalAll = await db.select().from(rosterSchedules).where(eq(rosterSchedules.employeeId, employeeId));
        console.log("Final rosters length:", finalAll.length);
        console.log("Final roster IDs:", finalAll.map(r => r.id).join(', '));

    } catch (e) {
        console.error(e);
    }
}
test();
