const fs = require("fs");
const path = require("path");

const routesFile = path.join(__dirname, "../server/routes.ts");
let content = fs.readFileSync(routesFile, "utf-8");

const types = [
  'StandJack', 'HydraulicJack', 'BottleJack', 'Impact', 'Apar', 
  'MesinLas', 'MesinKompresor', 'GerindaDuduk', 'FuelStorage'
];

let generatedBlocks = "\n";

types.forEach(type => {
  generatedBlocks += "      if (type === '" + type + "') {\n" +
"        const session = await storage.getSidak" + type + "Session(sessionId as string);\n" +
"        if (!session) return res.status(404).json({ message: 'Session not found' });\n" +
"        const records = await storage.getSidak" + type + "Records(sessionId as string);\n" +
"        const observers = await storage.getSidak" + type + "Observers(sessionId as string);\n\n" +
"        const supervisorName = await resolveNikToName(session.createdBy);\n" +
"        return res.json({\n          session: {\n            ...session,\n" +
"            type: '" + type + "',\n            tanggal: session.tanggal,\n            waktu: session.waktu,\n            departemen: '-',\n" +
"            supervisorName,\n            photos: session.activityPhotos\n          },\n          records,\n          observers\n        });\n      }\n";
});

content = content.replace(
  /return res\.status\(400\)\.json\({ message: "Invalid Sidak Type" }\);/g,
  generatedBlocks + '\n      return res.status(400).json({ message: "Invalid Sidak Type" });'
);

fs.writeFileSync(routesFile, content, "utf-8");
console.log("Patched server/routes.ts for detail endpoint successfully.");
