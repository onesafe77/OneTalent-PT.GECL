
import { SidakP3kSession, SidakP3kItem } from "@shared/schema";
import { Check, X, ImageIcon, User, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface P3kDetailViewProps {
    session: SidakP3kSession;
    items: SidakP3kItem[];
}

export function P3kDetailView({ session, items }: P3kDetailViewProps) {
    // Sort items by ordinal to match form order
    const sortedItems = [...items].sort((a, b) => a.ordinal - b.ordinal);

    return (
        <div className="space-y-6 pb-8">
            {/* Header Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Item Tersedia</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {items.filter(i => i.isAvailable).length}
                                <span className="text-sm font-normal text-blue-500 ml-1">/ {items.length}</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Inspektor</p>
                            <p className="text-sm font-bold text-orange-700 dark:text-orange-300 truncate max-w-[120px]">
                                {session.inspectorName}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Checklist Cards */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="h-6 w-1 bg-blue-600 rounded-full"></span>
                    Detail Pengecekan
                </h3>
                <div className="grid gap-4">
                    {sortedItems.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 mt-0.5">
                                            {item.ordinal}
                                        </span>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white text-base">
                                                {item.itemName}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Min Qty: {item.minQty}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "px-3 py-1 text-xs font-bold uppercase",
                                            item.isAvailable
                                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                        )}
                                    >
                                        {item.isAvailable ? (
                                            <><Check className="w-3 h-3 mr-1" /> Tersedia</>
                                        ) : (
                                            <><X className="w-3 h-3 mr-1" /> Tidak Ada</>
                                        )}
                                    </Badge>
                                </div>

                                {item.notes && (
                                    <div className="ml-9 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-300 italic border border-gray-100 dark:border-gray-800">
                                        "{item.notes}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Additional Notes */}
            {session.notes && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="h-6 w-1 bg-amber-500 rounded-full"></span>
                        Catatan Tambahan
                    </h3>
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800 text-sm text-gray-800 dark:text-gray-200">
                        {session.notes}
                    </div>
                </div>
            )}

            {/* Photos */}
            {session.activityPhotos && session.activityPhotos.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-purple-600" />
                        Dokumentasi
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {session.activityPhotos.map((photo, index) => (
                            <div key={index} className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative group">
                                <img
                                    src={photo}
                                    alt={`Dokumentasi ${index + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-3">Inspektor</p>
                    {session.inspectorSignature ? (
                        <img src={session.inspectorSignature} alt="TTD Inspektor" className="h-16 mx-auto mb-2 object-contain" />
                    ) : (
                        <div className="h-16 flex items-center justify-center text-gray-300 italic text-xs">Belum ada TTD</div>
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 inline-block min-w-[120px]">
                        {session.inspectorName}
                    </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-3">Penanggung Jawab</p>
                    {session.areaResponsibleSignature ? (
                        <img src={session.areaResponsibleSignature} alt="TTD PJ" className="h-16 mx-auto mb-2 object-contain" />
                    ) : (
                        <div className="h-16 flex items-center justify-center text-gray-300 italic text-xs">Belum ada TTD</div>
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 inline-block min-w-[120px]">
                        {session.areaResponsibleName || "-"}
                    </p>
                </div>
            </div>
        </div>
    );
}
