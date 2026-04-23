import { db } from "./server/db.js";
import { fmsDriverInvestigations } from "./shared/schema.js";

async function check() {
  const all = await db.select().from(fmsDriverInvestigations);
  console.log("DB Investigations:", all);
}
check().catch(console.error).finally(() => process.exit(0));
