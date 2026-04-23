import { db } from "./server/db";
import { fmsDriverInvestigations } from "./shared/schema";

async function run() {
  const all = await db.select().from(fmsDriverInvestigations);
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

run().catch(console.error);
