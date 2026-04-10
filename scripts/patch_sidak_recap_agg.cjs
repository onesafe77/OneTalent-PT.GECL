const fs = require("fs");
const path = require("path");

const routesFile = path.join(__dirname, "../server/routes.ts");
let content = fs.readFileSync(routesFile, "utf-8");

// Add missing totals to stats object
content = content.replace(
    /totalBehavior: behavior\.length,\n\s*totalStandJack: standJack\.length,\n\s*totalHydraulicJack: hydraulicJack\.length,\n\s*totalBottleJack: bottleJack\.length,/g,
    `totalBehavior: behavior.length,
        totalStandJack: standJack.length,
        totalHydraulicJack: hydraulicJack.length,
        totalBottleJack: bottleJack.length,
        totalApar: apar.length,
        totalImpact: impact.length,
        totalMesinLas: mesinLas.length,
        totalMesinKompresor: mesinKompresor.length,
        totalGerindaDuduk: gerindaDuduk.length,
        totalFuelStorage: fuelStorage.length,`
);

// Add to supervisorMap initial state
content = content.replace(
    /jarak: 0, kecepatan: 0, pencahayaan: 0, loto: 0, digital: 0, workshop: 0, behavior: 0, standjack: 0,\n\s*total: 0/g,
    `jarak: 0, kecepatan: 0, pencahayaan: 0, loto: 0, digital: 0, workshop: 0, behavior: 0, 
              standjack: 0, hydraulicjack: 0, bottlejack: 0, apar: 0, impact: 0, mesinlas: 0, 
              mesinkompresor: 0, gerindaduduk: 0, fuelstorage: 0,
              total: 0`
);

fs.writeFileSync(routesFile, content, "utf-8");
console.log("Patched server/routes.ts aggregation successfully.");
