
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, momentLocalizer, Views, ToolbarProps } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

interface ActivityEvent {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string | null;
    isAllDay: boolean;
    reminderMinutes: number;
}

export default function ActivityCalendar() {
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        description: "",
        date: moment().format("YYYY-MM-DD"),
        time: moment().format("HH:mm"),
        reminderMinutes: 15,
    });

    // Fetch events
    const { data: events, isLoading } = useQuery<ActivityEvent[]>({
        queryKey: ["/api/activities"],
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const startTime = moment(`${data.date} ${data.time}`).toISOString();
            const payload = {
                title: data.title,
                description: data.description,
                startTime: startTime,
                endTime: moment(startTime).add(1, 'hour').toISOString(), // Default 1 hour
                reminderMinutes: parseInt(data.reminderMinutes.toString()),
            };

            return await apiRequest("/api/activities", "POST", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            toast({ title: "Sukses", description: "Kegiatan berhasil dijadwalkan" });
            setIsAddOpen(false);
            setNewEvent({
                title: "",
                description: "",
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("HH:mm"),
                reminderMinutes: 15,
            });
        },
        onError: (error) => {
            toast({ title: "Gagal", description: "Gagal menyimpan kegiatan", variant: "destructive" });
        }
    });

    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest(`/api/activities/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            toast({ title: "Terhapus", description: "Kegiatan dihapus" });
            setSelectedEvent(null); // Close dialog
        },
        onError: (e) => {
            toast({ title: "Error", description: "Gagal menghapus: " + e, variant: 'destructive' });
        }
    });

    const handleSelectSlot = ({ start }: { start: Date }) => {
        setNewEvent(prev => ({
            ...prev,
            date: moment(start).format("YYYY-MM-DD"),
            time: moment(start).format("HH:mm")
        }));
        setIsAddOpen(true);
    };

    // Convert DB events to Calendar format with validation
    const calendarEvents = (events || [])
        .map(evt => {
            const start = new Date(evt.startTime);
            const isValidDate = !isNaN(start.getTime());
            if (!isValidDate) {
                console.error("Invalid start time for event:", evt);
                return null;
            }

            let end;
            if (evt.endTime) {
                end = new Date(evt.endTime);
                if (isNaN(end.getTime())) {
                    end = new Date(start.getTime() + 60 * 60 * 1000); // Fallback
                }
            } else {
                end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1h
            }

            return {
                id: evt.id,
                title: evt.title,
                start: start,
                end: end,
                resource: evt
            };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

    // Custom Toolbar Component
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            toolbar.onNavigate("PREV");
        };
        const goToNext = () => {
            toolbar.onNavigate("NEXT");
        };
        const goToCurrent = () => {
            toolbar.onNavigate("TODAY");
        };
        const label = () => {
            return (
                <span className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-100">
                    {moment(toolbar.date).format("MMMM YYYY")}
                </span>
            );
        };

        return (
            <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToBack}
                            className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToCurrent}
                            className="text-xs font-medium px-4 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            Hari Ini
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToNext}
                            className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    {label()}
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {['month', 'week', 'day', 'agenda'].map(view => (
                        <Button
                            key={view}
                            variant={toolbar.view === view ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => toolbar.onView(view as any)}
                            className={cn(
                                "capitalize text-xs px-3",
                                toolbar.view === view
                                    ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400 font-semibold"
                                    : "text-gray-500 dark:text-gray-400"
                            )}
                        >
                            {view === 'agenda' ? 'List' : view}
                        </Button>
                    ))}
                </div>
            </div>
        );
    };

    // Custom Event Component for standard views
    const CustomEvent = ({ event }: any) => {
        return (
            <div className="w-full h-full px-2 py-1 flex items-center justify-between gap-2 overflow-hidden bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-indigo-500 rounded-r-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors group">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="min-w-1 min-h-full bg-indigo-500 rounded-full" />
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                            {event.title}
                        </span>
                        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate flex items-center gap-1">
                            {moment(event.start).format("HH:mm")} <Clock className="w-3 h-3 inline" />
                        </span>
                    </div>
                </div>
                {/* Delete button for non-agenda views (hover only) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus jadwal "${event.title}"?`)) deleteMutation.mutate(event.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-opacity"
                    title="Hapus"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        )
    };

    // Custom Event Component for Agenda View
    const CustomAgendaEvent = ({ event }: any) => {
        return (
            <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">{event.title}</span>
                    <span className="text-xs text-gray-500">{event.resource?.description || "Tidak ada deskripsi"}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 z-50 relative"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirm(`Hapus agenda "${event.title}"?`)) deleteMutation.mutate(event.id);
                    }}
                >
                    <Trash2 className="w-4 h-4 mr-1" /> Hapus
                </Button>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-2 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-2xl shadow-lg text-white">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Activity Calendar</h1>
                    <p className="text-indigo-100 text-sm max-w-xl">
                        Kelola jadwal kegiatan dan reminder pribadi Anda dengan bantuan Mystic AI.
                        Jadwal yang teratur membantu produktivitas Anda.
                    </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-white text-indigo-600 hover:bg-white/90 shadow-xl border-0">
                            <Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Buat Jadwal Baru</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Judul Kegiatan</Label>
                                <Input
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    placeholder="Contoh: Meeting Safety Talk"
                                    className="font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={newEvent.date}
                                        onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jam</Label>
                                    <Input
                                        type="time"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Deskripsi (Opsional)</Label>
                                <Textarea
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    placeholder="Catatan tambahan..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <Label className="flex items-center gap-2 text-slate-600">
                                    <div className="p-1.5 bg-green-100 rounded-full">
                                        <Smartphone className="w-4 h-4 text-green-600" />
                                    </div>
                                    Ingatkan via WhatsApp
                                </Label>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-sm text-slate-500">Ingatkan</span>
                                    <Input
                                        type="number"
                                        className="w-20 text-center"
                                        value={newEvent.reminderMinutes}
                                        onChange={e => setNewEvent({ ...newEvent, reminderMinutes: parseInt(e.target.value) })}
                                        min={5}
                                    />
                                    <span className="text-sm text-slate-500">menit sebelum</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Batal</Button>
                            <Button onClick={() => createMutation.mutate(newEvent)} disabled={!newEvent.title || createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                                {createMutation.isPending ? "Menyimpan..." : "Simpan Jadwal"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedEvent?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{selectedEvent && moment(selectedEvent.start).format("dddd, DD MMMM YYYY")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{selectedEvent && `${moment(selectedEvent.start).format("HH:mm")} - ${moment(selectedEvent.end).format("HH:mm")}`}</span>
                        </div>
                        {selectedEvent?.resource?.description && (
                            <div className="bg-slate-50 p-3 rounded-md text-sm">
                                {selectedEvent.resource.description}
                            </div>
                        )}
                        {selectedEvent?.resource?.participants && (
                            <div className="text-xs text-slate-500">
                                Peserta: {selectedEvent.resource.participants}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button variant="ghost" onClick={() => setSelectedEvent(null)}>Tutup</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(selectedEvent.id)}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deleteMutation.isPending ? "Menghapus..." : "Hapus Jadwal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Calendar Area */}
                <Card className="lg:col-span-3 shadow-sm border-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="h-[700px] modern-calendar-wrapper">
                            <Calendar
                                localizer={localizer}
                                events={calendarEvents}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                // excludeTimes // Not available in all versions, commenting out for safety
                                views={['month', 'week', 'day', 'agenda']}
                                defaultView={Views.MONTH}
                                selectable
                                onSelectSlot={handleSelectSlot}
                                onSelectEvent={(event) => setSelectedEvent(event)}
                                components={{
                                    toolbar: CustomToolbar,
                                    event: CustomEvent,
                                    // Remove custom agenda event to restore default row click behavior if needed, 
                                    // or keep it simple. Let's revert agenda custom component to ensure click works.
                                }}
                                messages={{
                                    next: "Berikutnya",
                                    previous: "Sebelumnya",
                                    today: "Hari Ini",
                                    month: "Bulan",
                                    week: "Minggu",
                                    day: "Hari",
                                    agenda: "Agenda",
                                    noEventsInRange: "Tidak ada kegiatan di rentang ini."
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Side Panel: Today's Agenda & Quick Stats */}
                <div className="space-y-6">
                    {/* Agenda Hari Ini */}
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                                <span className="text-sm text-muted-foreground mr-auto ml-2">Tip: Klik judul jadwal untuk menghapus</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {calendarEvents
                                    .filter(e => moment(e.start).isSame(new Date(), 'day'))
                                    .sort((a, b) => a.start.getTime() - b.start.getTime())
                                    .length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>Tidak ada kegiatan hari ini.</p>
                                        <Button variant="link" size="sm" onClick={() => setIsAddOpen(true)} className="text-indigo-500">
                                            + Tambah Sekarang
                                        </Button>
                                    </div>
                                ) : (
                                    calendarEvents
                                        .filter(e => moment(e.start).isSame(new Date(), 'day'))
                                        .map(e => (
                                            <div key={e.id} className="group flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                                                if (confirm(`Hapus jadwal "${e.title}"?`)) deleteMutation.mutate(e.id);
                                            }}>
                                                <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500" />
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 transition-colors">{e.title}</h4>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {moment(e.start).format("HH:mm")} - {moment(e.end).format("HH:mm")}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                )
                                }
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-none bg-transparent">
                        <CardContent className="p-0 space-y-2">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                <h5 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">Tips Produktivitas</h5>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                    Gunakan <b>Mystic AI</b> untuk menjadwalkan kegiatan lebih cepat. Coba ketik: <i>"Jadwalkan meeting dengan tim HSE besok jam 9 pagi"</i> di menu Chat Regulasi.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="text-xs text-muted-foreground text-center">
                * Klik tanggal kosong untuk tambah jadwal. Klik jadwal untuk menghapus.
            </div>
        </div>
    );
}
