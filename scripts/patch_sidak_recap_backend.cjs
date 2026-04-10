const fs = require("fs");
const path = require("path");

const routesFile = path.join(__dirname, "../server/routes.ts");
let content = fs.readFileSync(routesFile, "utf-8");

// 1. Add fetchSession to batch3
content = content.replace(
    /fetchSession\('Apar', storage\.getSidakAparSessions\(\)\),/g,
    `fetchSession('Apar', storage.getSidakAparSessions()),
          fetchSession('MesinLas', storage.getSidakMesinLasSessions()),
          fetchSession('MesinKompresor', storage.getSidakMesinKompresorSessions()),
          fetchSession('GerindaDuduk', storage.getSidakGerindaDudukSessions()),
          fetchSession('FuelStorage', storage.getSidakFuelStorageSessions()),`
);

// 2. Add destructuring
content = content.replace(
    /aparFull\s*\] = await fetchAllInBatches\(\);/g,
    `aparFull, mesinLasFull, mesinKompresorFull, gerindaDudukFull, fuelStorageFull
      ] = await fetchAllInBatches();`
);

// 3. Add to omits
content = content.replace(
    /const apar = omitLargeFields\((.*?)\);/g,
    `const apar = omitLargeFields($1);
      const mesinLas = omitLargeFields(mesinLasFull || []);
      const mesinKompresor = omitLargeFields(mesinKompresorFull || []);
      const gerindaDuduk = omitLargeFields(gerindaDudukFull || []);
      const fuelStorage = omitLargeFields(fuelStorageFull || []);`
);

// 4. Add to allSessionsCount
content = content.replace(
    /bottleJack\.length \+ impact\.length \+ apar\.length;/g,
    `bottleJack.length + impact.length + apar.length + mesinLas.length + mesinKompresor.length + gerindaDuduk.length + fuelStorage.length;`
);

// 5. Add to allSessions mapping
content = content.replace(
    /\.\.\.apar\.map\(\(s: any\) => mapSession\(s, 'Apar'\)\)/g,
    `...apar.map((s: any) => mapSession(s, 'Apar')),
        ...mesinLas.map((s: any) => mapSession(s, 'MesinLas')),
        ...mesinKompresor.map((s: any) => mapSession(s, 'MesinKompresor')),
        ...gerindaDuduk.map((s: any) => mapSession(s, 'GerindaDuduk')),
        ...fuelStorage.map((s: any) => mapSession(s, 'FuelStorage'))`
);

fs.writeFileSync(routesFile, content, "utf-8");
console.log("Patched server/routes.ts successfully for the 4 missing modules.");
