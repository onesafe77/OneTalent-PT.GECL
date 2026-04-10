const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../client/src/pages/sidak-recap.tsx");
let content = fs.readFileSync(file, "utf-8");

const equipmentFormPreviewComp = `
function EquipmentFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: any[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm font-sans">
      <div className="text-center border-b-2 border-slate-600 pb-3">
        <h2 className="text-xl font-extrabold text-slate-800">CHECKLIST PEMERIKSAAN {session.type.toUpperCase()}</h2>
        <p className="text-gray-600 font-semibold">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-xl bg-slate-50">
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tanggal</span> <span className="font-medium text-gray-900">{session.tanggal}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Jam</span> <span className="font-medium text-gray-900">{session.waktu}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Shift</span> <span className="font-medium text-gray-900">{session.shift || '-'}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lokasi</span> <span className="font-medium text-gray-900">{session.lokasi || '-'}</span></div>
        <div className="col-span-2 flex flex-col pt-2 border-t border-slate-200"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Supervisor</span> <span className="font-bold text-gray-900">{session.supervisorName}</span></div>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-600 text-white">
              <th className="p-3 w-8 text-center border-r border-slate-500">No</th>
              <th className="p-3 text-left border-r border-slate-500">Nama Alat / No. Register</th>
              <th className="p-3 w-20 text-center border-r border-slate-500">Kondisi (S)</th>
              <th className="p-3 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => {
              const results = record.inspectionResults || {};
              const vals = Object.values(results);
              const allOk = vals.length > 0 && vals.every(v => v === 'S');
              let tindakLanjut = "-";
              if (record.tindakLanjutPerbaikan && typeof record.tindakLanjutPerbaikan === 'object') {
                tindakLanjut = Object.values(record.tindakLanjutPerbaikan).filter(Boolean).join(", ") || "-";
              } else if (typeof record.tindakLanjutPerbaikan === 'string') {
                tindakLanjut = record.tindakLanjutPerbaikan;
              }

              return (
                <tr key={record.id} className={\`\${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors\`}>
                  <td className="p-3 text-center border-r border-slate-200 font-bold text-slate-700">{record.ordinal}</td>
                  <td className="p-3 font-extrabold text-gray-900 border-r border-slate-200">{record.noRegisterPeralatan || record.namaAlat || 'Alat ' + record.ordinal}</td>
                  <td className="p-3 text-center border-r border-slate-200">
                    <div className={\`inline-flex items-center justify-center p-1 rounded-full \${allOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                      <CheckIcon checked={allOk} />
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 italic">{tindakLanjut}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 bg-gray-50/30">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Signature className="h-5 w-5" />
          Observer / Pengamat:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-center gap-4 border border-slate-200 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-1">
                <p className="font-extrabold text-gray-900">{obs.nama}</p>
                <div className="flex flex-col mt-1">
                  <p className="text-xs font-bold text-slate-600">{obs.nik || '-'}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">{obs.perusahaan || 'BIB'}</p>
                </div>
              </div>
              {obs.tandaTangan && (
                <div className="p-2 border border-slate-100 rounded-lg bg-gray-50">
                  <img src={obs.tandaTangan} alt="TTD" className="h-16 w-24 object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

// Insert the component just above IntercomFormPreview
content = content.replace(
    /function IntercomFormPreview/g,
    equipmentFormPreviewComp + '\nfunction IntercomFormPreview'
);

// Switch for Form Tab (around line 2580 before RosterFormPreview fallback)
const formTypes = ['StandJack', 'HydraulicJack', 'BottleJack', 'Impact', 'APAR', 'Apar', 'MesinLas', 'MesinKompresor', 'GerindaDuduk', 'FuelStorage'];
const formSwitchCondition = formTypes.map(t => `selectedSession?.type === '${t}'`).join(' || ');

content = content.replace(
    /(\) : selectedSession\?\.type === 'Intercom' \? \(\n\s*<IntercomFormPreview[\s\S]*?\/>\n\s*\) : \(\n\s*<RosterFormPreview)/,
    `) : ${formSwitchCondition} ? (
                      <EquipmentFormPreview
                        session={detailData.session}
                        records={detailData.records as any[]}
                        observers={detailData.observers}
                      />
                    $1`
);

// Switch for Records Datagrid (around line 3010 before empty Table fallback)
// The raw records datagrid UI defaults to standard blank table if it falls through Intercom. We can just use the identical table for Equipment.
const recordsGridHtml = `
                    ) : ${formSwitchCondition} ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Alat</TableHead>
                            <TableHead className="text-center">Kondisi</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as any[])?.map((record) => {
                            const results = record.inspectionResults || {};
                            const vals = Object.values(results);
                            const allOk = vals.length > 0 && vals.every(v => v === 'S');
                            let tindakLanjut = "-";
                            if (record.tindakLanjutPerbaikan && typeof record.tindakLanjutPerbaikan === 'object') {
                              tindakLanjut = Object.values(record.tindakLanjutPerbaikan).filter(Boolean).join(", ") || "-";
                            } else if (typeof record.tindakLanjutPerbaikan === 'string') {
                              tindakLanjut = record.tindakLanjutPerbaikan;
                            }
                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.ordinal}</TableCell>
                                <TableCell className="font-medium">{record.noRegisterPeralatan || record.namaAlat || 'Alat ' + record.ordinal}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={allOk ? 'default' : 'destructive'}>
                                    {allOk ? 'Baik (S)' : 'Buruk'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">{tindakLanjut}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
`;

content = content.replace(
    /(\) : selectedSession\?\.type === 'Intercom' \? \([\s\S]*?<\/Table>\n\s*\) : \(\n\s*<Table>\n\s*<TableHeader>)/,
    recordsGridHtml + '$1'
);

fs.writeFileSync(file, content, "utf-8");
console.log("Patched sidak-recap.tsx with EquipmentFormPreview successfully.");
