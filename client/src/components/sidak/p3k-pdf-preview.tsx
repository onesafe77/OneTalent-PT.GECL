import { SidakP3kSession, SidakP3kItem } from "@shared/schema";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface P3kPdfPreviewProps {
    session: SidakP3kSession;
    items: SidakP3kItem[];
}

export function P3kPdfPreview({ session, items }: P3kPdfPreviewProps) {
    // Sort items by ordinal
    const sortedItems = [...items].sort((a, b) => a.ordinal - b.ordinal);

    return (
        <div className="bg-white p-8 max-w-[210mm] mx-auto text-black font-sans text-sm leading-snug print:p-0 print:max-w-none">

            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo-gecl.png" alt="GECL Logo" className="h-[45px] w-auto object-contain" />
                    <span className="font-bold text-lg text-[#006400]">PT. GECL</span>
                </div>
                <div className="text-right text-xs">
                    <div>GECL – HSE – ES – F – 3.02 – 88</div>
                    <div>April 2025/R0</div>
                    <div>Page 1 of 1</div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold text-xl bg-[#d9d9d9] p-2 mb-1 border border-black">
                CHECKLIST INSPEKSI KOTAK P3K
            </div>
            <div className="text-center text-xs italic mb-4">
                Formulir ini digunakan untuk pencatatan hasil inspeksi kotak P3K
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-[120px_20px_1fr] gap-y-2 mb-4 text-sm">
                <div className="font-bold">Tanggal Inspeksi</div>
                <div>:</div>
                <div className="border-b border-black">
                    {session.tanggal ? format(new Date(session.tanggal), "dd MMMM yyyy", { locale: id }) : "-"}
                </div>

                <div className="font-bold">Nama Inspektor</div>
                <div>:</div>
                <div className="border-b border-black">{session.inspectorName}</div>

                <div className="font-bold">Lokasi</div>
                <div>:</div>
                <div className="border-b border-black">{session.lokasi}</div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black mb-6 text-sm">
                <thead>
                    <tr className="bg-[#d9d9d9]">
                        <th className="border border-black p-1 w-10 text-center">No</th>
                        <th className="border border-black p-1 text-left">Nama Item P3K</th>
                        <th className="border border-black p-1 w-20 text-center">Jumlah<br />Minimum</th>
                        <th className="border border-black p-1 w-24 text-center">Kondisi<br />(Tersedia)</th>
                        <th className="border border-black p-1 w-1/3 text-left">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedItems.map((item) => (
                        <tr key={item.id}>
                            <td className="border border-black p-1 text-center">{item.ordinal}</td>
                            <td className="border border-black p-1">{item.itemName}</td>
                            <td className="border border-black p-1 text-center font-medium">{item.minQty}</td>
                            <td className="border border-black p-1 text-center">
                                {item.isAvailable ? "✓" : "✗"}
                            </td>
                            <td className="border border-black p-1">{item.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Notes */}
            <div className="mb-8">
                <div className="font-bold mb-1">Catatan / Keterangan Tambahan:</div>
                <div className="border border-black min-h-[60px] p-2 whitespace-pre-wrap">
                    {session.notes || "-"}
                </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-10 mt-8">
                <div className="text-center">
                    <div className="font-bold mb-8">Nama Inspektor</div>
                    {session.inspectorSignature && (
                        <img src={session.inspectorSignature} alt="Tanda Tangan" className="h-20 mx-auto mb-[-20px]" />
                    )}
                    <div className="border-t border-black pt-1 mt-4">
                        {session.inspectorName}
                    </div>
                </div>
                <div className="text-center">
                    <div className="font-bold mb-8">Penanggung Jawab Area</div>
                    {session.areaResponsibleSignature && (
                        <img src={session.areaResponsibleSignature} alt="Tanda Tangan" className="h-20 mx-auto mb-[-20px]" />
                    )}
                    <div className="border-t border-black pt-1 mt-4">
                        {session.areaResponsibleName || "(..................................)"}
                    </div>
                </div>
            </div>

            {/* Documentation Photos */}
            {session.activityPhotos && session.activityPhotos.length > 0 && (
                <div className="mt-8 break-inside-avoid">
                    <div className="font-bold mb-4 border-b border-black pb-1">Dokumentasi Kegiatan</div>
                    <div className="grid grid-cols-2 gap-4">
                        {session.activityPhotos.map((photo, index) => (
                            <div key={index} className="border border-gray-300 p-2">
                                <img
                                    src={photo}
                                    alt={`Dokumentasi ${index + 1}`}
                                    className="w-full h-48 object-cover object-center"
                                />
                                <div className="text-xs text-center mt-1 text-gray-500">Foto {index + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
