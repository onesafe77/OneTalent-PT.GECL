import "dotenv/config";
import { db } from "./server/db";
import { sidakFatigueSessions, sidakFatigueRecords, sidakFatigueObservers } from "./shared/schema";
import { desc, eq } from "drizzle-orm";

async function checkData() {
    console.log("--- Checking Sidak Fatigue Data ---");

    const latestSessions = await db.select().from(sidakFatigueSessions).orderBy(desc(sidakFatigueSessions.createdAt)).limit(5);

    if (latestSessions.length === 0) {
        console.log("No Sidak Fatigue sessions found.");
        return;
    }

    for (const session of latestSessions) {
        console.log(`\nSession ID: ${session.id}`);
        console.log(`Tanggal: ${session.tanggal}, Waktu: ${session.waktu}, Lokasi: ${session.lokasi}`);
        console.log(`Created At: ${session.createdAt}`);

        const records = await db.select().from(sidakFatigueRecords).where(eq(sidakFatigueRecords.sessionId, session.id));
        console.log(`Records (${records.length}):`);
        records.forEach((r, i) => {
            console.log(`  ${i + 1}. Nama: ${r.nama}, NIK: ${r.nik}, Siap Kerja: ${r.karyawanSiapBekerja}`);
        });

        const observers = await db.select().from(sidakFatigueObservers).where(eq(sidakFatigueObservers.sessionId, session.id));
        console.log(`Observers (${observers.length}):`);
        observers.forEach((o, i) => {
            console.log(`  ${i + 1}. Nama: ${o.nama}, Perusahaan: ${o.perusahaan}`);
        });
    }
}

checkData().catch(console.error);
