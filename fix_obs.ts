import { db } from './server/db.js';
import { sidakSeatbeltSessions, sidakSeatbeltObservers } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fix() {
    const sessions = await db.select().from(sidakSeatbeltSessions).where(eq(sidakSeatbeltSessions.lokasi, 'CCR GECL'));
    console.log('sessions', sessions);

    if (sessions.length > 0) {
        const session = sessions[sessions.length - 1];
        console.log('Last Session ID:', session.id);

        // Check observers of this session
        const obs = await db.select().from(sidakSeatbeltObservers).where(eq(sidakSeatbeltObservers.sessionId, session.id));
        console.log('OBSERVERS', obs);

        const records = await db.insert(sidakSeatbeltObservers).values({
            sessionId: session.id,
            nama: 'Arif Rahman',
            nik: '-', // Unknown
            perusahaan: 'PT GECL',
            jabatan: 'Spv',
            signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        }).returning();
        console.log('Inserted:', records);
    }
    process.exit(0);
}

fix().catch(console.error);
