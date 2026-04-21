
import { db } from "./db";
import { sidakAntrianSessions } from "../shared/schema";
import { desc } from "drizzle-orm";

async function debugSidak() {
    const result = await db.select().from(sidakAntrianSessions).orderBy(desc(sidakAntrianSessions.createdAt)).limit(1);
    console.log("Latest Session:", JSON.stringify(result[0], null, 2));
}

debugSidak().catch(console.error);
