const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../client/src/pages/sidak-recap.tsx");
let content = fs.readFileSync(file, "utf-8");

// 1. Update interfaces
content = content.replace(
    /intercom: number;\n\s*total: number;/g,
    `intercom: number;
  standjack: number;
  hydraulicjack: number;
  bottlejack: number;
  apar: number;
  impact: number;
  mesinlas: number;
  mesinkompresor: number;
  gerindaduduk: number;
  fuelstorage: number;
  total: number;`
);

content = content.replace(
    /totalIntercom: number;\n\s*totalKaryawanDiperiksa: number;/g,
    `totalIntercom: number;
    totalStandJack: number;
    totalHydraulicJack: number;
    totalBottleJack: number;
    totalApar: number;
    totalImpact: number;
    totalMesinLas: number;
    totalMesinKompresor: number;
    totalGerindaDuduk: number;
    totalFuelStorage: number;
    totalKaryawanDiperiksa: number;`
);

// 2. Add stat cards just before the closing </div> of the stats grid
// We search for the exact block around the last Card (SIDAK Intercom)
const statCardsHtml = `
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalStandJack || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Stand Jack</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalHydraulicJack || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Hydraulic Jack</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalBottleJack || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Bottle Jack</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalApar || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK APAR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-900/30 rounded-lg">
                <PenTool className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalImpact || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Impact</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalMesinLas || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Mesin Las</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalMesinKompresor || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Mesin Kompresor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <PenTool className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalGerindaDuduk || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Gerinda Duduk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 dark:bg-stone-900/30 rounded-lg">
                <Building className="h-5 w-5 text-stone-600 dark:text-stone-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats.totalFuelStorage || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">SIDAK Fuel Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
`;

content = content.replace(
    /SIDAK Intercom<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*<\/CardContent>\n\s*<\/Card>\n\s*<\/div>/,
    `SIDAK Intercom</p>
              </div>
            </div>
          </CardContent>
        </Card>
${statCardsHtml}      </div>`
);


// 3. Add Badges to supervisor section
const supervisorBadges = `
                      {supervisor.standjack > 0 && (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                          SJ: {supervisor.standjack}
                        </Badge>
                      )}
                      {supervisor.hydraulicjack > 0 && (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                          HJ: {supervisor.hydraulicjack}
                        </Badge>
                      )}
                      {supervisor.bottlejack > 0 && (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                          BJ: {supervisor.bottlejack}
                        </Badge>
                      )}
                      {supervisor.apar > 0 && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                          APAR: {supervisor.apar}
                        </Badge>
                      )}
                      {supervisor.impact > 0 && (
                        <Badge variant="outline" className="text-xs bg-zinc-50 text-zinc-700">
                          IM: {supervisor.impact}
                        </Badge>
                      )}
                      {supervisor.mesinlas > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          ML: {supervisor.mesinlas}
                        </Badge>
                      )}
                      {supervisor.mesinkompresor > 0 && (
                        <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700">
                          MK: {supervisor.mesinkompresor}
                        </Badge>
                      )}
                      {supervisor.gerindaduduk > 0 && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                          GD: {supervisor.gerindaduduk}
                        </Badge>
                      )}
                      {supervisor.fuelstorage > 0 && (
                        <Badge variant="outline" className="text-xs bg-stone-50 text-stone-700">
                          FS: {supervisor.fuelstorage}
                        </Badge>
                      )}
`;

content = content.replace(
    /\{supervisor\.intercom > 0 && \(\n\s*<Badge variant="outline" className="text-xs bg-stone-50 text-stone-700">\n\s*I: \{supervisor\.intercom\}\n\s*<\/Badge>\n\s*\)\}/,
    `{supervisor.intercom > 0 && (
                        <Badge variant="outline" className="text-xs bg-stone-50 text-stone-700">
                          I: {supervisor.intercom}
                        </Badge>
                      )}${supervisorBadges}`
);

fs.writeFileSync(file, content, "utf-8");
console.log("Patched client/src/pages/sidak-recap.tsx successfully");
