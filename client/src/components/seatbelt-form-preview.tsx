// Seatbelt Form Preview Component
export function SeatbeltFormPreview({ session, records, observers }: {
    session: any;
    records: any[];
    observers: any[];
}) {
    const CheckIcon = ({ checked }: { checked: boolean }) => (
        <span className={`text-lg font-bold ${checked ? 'text-foreground' : 'text-red-500'}`}>
            {checked ? '✓' : '✗'}
        </span>
    );

    return (
        <div className="space-y-4 p-4 bg-white text-black text-sm">
            {/* Header */}
            <div className="text-center border-b pb-3">
                <h2 className="text-lg font-bold">SIDAK SEAT BELT</h2>
                <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
                <p className="text-xs text-gray-500">Formulir ini digunakan sebagai catatan hasil pengecekan seat belt yang dilaksanakan di PT. Goden Energi Cemerlang Lesrari</p>
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
                <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
                <div><span className="font-semibold">Jam:</span> {session.waktu}</div>
                <div><span className="font-semibold">Shift:</span> {session.shift}</div>
                <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
                <div><span className="font-semibold">Departemen:</span> {session.departemen}</div>
                <div><span className="font-semibold">Total Sampel:</span> {session.totalSampel}</div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border text-xs">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border p-2 w-8">No</th>
                            <th className="border p-2">Nama</th>
                            <th className="border p-2">No Kendaraan</th>
                            <th className="border p-2">Perusahaan</th>
                            <th className="border p-1 w-20">Kondisi Sabuk Pengemudi</th>
                            <th className="border p-1 w-20">Kondisi Sabuk Penumpang</th>
                            <th className="border p-1 w-20">Penggunaan Sabuk Pengemudi</th>
                            <th className="border p-1 w-20">Penggunaan Sabuk Penumpang</th>
                            <th className="border p-2">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record: any, idx: number) => (
                            <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border p-2 text-center">{record.ordinal}</td>
                                <td className="border p-2 font-medium">{record.nama}</td>
                                <td className="border p-2">{record.nomorLambung || '-'}</td>
                                <td className="border p-2">{record.perusahaan}</td>
                                <td className="border p-1 text-center"><CheckIcon checked={record.seatbeltDriverCondition} /></td>
                                <td className="border p-1 text-center"><CheckIcon checked={record.seatbeltPassengerCondition} /></td>
                                <td className="border p-1 text-center"><CheckIcon checked={record.seatbeltDriverUsage} /></td>
                                <td className="border p-1 text-center"><CheckIcon checked={record.seatbeltPassengerUsage} /></td>
                                <td className="border p-2 text-gray-600">{record.keterangan || '-'}</td>
                            </tr>
                        ))}\n          </tbody>
                </table>
            </div>

            {/* Observers */}
            <div className="border rounded p-3">
                <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {observers.map((obs: any) => (
                        <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
                            <div className="flex-1">
                                <p className="font-medium">{obs.nama}</p>
                                <p className="text-xs text-gray-500">{obs.nik} - {obs.jabatan}</p>
                                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
                            </div>
                            {obs.tandaTangan && (
                                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
