
import { db } from "./db";
import { employees } from "../shared/schema";
import { inArray, isNotNull } from "drizzle-orm";

async function checkUnits() {
    const targetUnits = ["GECL 9084", "GECL 9144", "GECL 9009", "GECL 9004", "GECL 9150"];

    const results = await db
        .select({
            nomorLambung: employees.nomorLambung,
            investorGroup: employees.investorGroup,
            nama: employees.nama
        })
        .from(employees)
        .where(inArray(employees.nomorLambung, targetUnits));

    console.log("Found matches:", results.length);
    console.log("Details:", results);

    const totalWithLambung = await db
        .select({ count: employees.id })
        .from(employees)
        .where(isNotNull(employees.nomorLambung));

    console.log("Total employees with nomorLambung:", totalWithLambung.length);
}

checkUnits().catch(console.error);
