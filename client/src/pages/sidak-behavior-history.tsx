import { useQuery } from "@tanstack/react-query";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, ArrowRight, Activity, FileDown } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useLocation } from "wouter";

export default function SidakBehaviorHistory() {
    const { data: sessions, isLoading } = useQuery<any[]>({
        queryKey: ["/api/sidak-behavior"],
    });

    const [, navigate] = useLocation();

    return (
        <MobileSidakLayout
            title="Riwayat Sidak Tingkah Laku"
            step={1}
            totalSteps={1}
            onBack={() => navigate("/workspace/sidak/history")}
        >
            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="h-32" />
                            </Card>
                        ))}
                    </div>
                ) : (
                    sessions?.map((session: any) => (
                        <Card key={session.id} className="overflow-hidden border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{session.lokasi}</CardTitle>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(session.tanggal), "eeee, dd MMMM yyyy", { locale: id })}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                        {session.shift}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">Sampel</p>
                                            <p className="font-bold text-blue-600">{session.totalSampel}</p>
                                        </div>
                                        <div className="text-center border-l pl-4">
                                            <p className="text-xs text-gray-500">Metode</p>
                                            <p className="font-bold text-gray-700">{session.metodeSidak}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        Detail
                                        <ArrowRight className="ml-1 w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}

                {!isLoading && (!sessions || sessions.length === 0) && (
                    <div className="text-center py-20">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Belum ada riwayat sidak.</p>
                        <Link href="/workspace/sidak/behavior/new">
                            <Button variant="link" className="text-blue-600 mt-2">Mulai Sidak Baru</Button>
                        </Link>
                    </div>
                )}
            </div>
        </MobileSidakLayout>
    );
}
