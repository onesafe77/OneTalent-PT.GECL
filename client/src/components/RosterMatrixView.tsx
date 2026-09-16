import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, X, Edit2, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface RosterSchedule {
    id: string;
    employeeId: string;
    date: string;       // YYYY-MM-DD
    shift: string;      // SHIFT 1, SHIFT 2, OVER SHIFT, CUTI, etc.
    startTime?: string;
    endTime?: string;
    hariKerja?: string; // numbers like 21, 9, etc.
    employee?: {
        id: string;
        name: string;
        nomorLambung?: string;
    };
    actualNomorLambung?: string | null;
    plannedNomorLambung?: string | null;
}

interface RosterMatrixViewProps {
    year: number;
    month: number;
    rosterData: RosterSchedule[];
    employees: any[]; // Used for finding mitra or left side details if needed
    onOpenUploadForPerson?: (employeeId: string) => void;
}

export function RosterMatrixView({ year, month, rosterData, onOpenUploadForPerson }: RosterMatrixViewProps) {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Group rosters by employeeId -> date -> roster array (usually 1 per day)
    const rosterByEmployeeAndDate = rosterData.reduce((acc, roster) => {
        if (!acc[roster.employeeId]) acc[roster.employeeId] = {};
        acc[roster.employeeId][roster.date] = roster;
        return acc;
    }, {} as Record<string, Record<string, RosterSchedule>>);

    // Extract unique employees from rosterData to display rows
    const uniqueEmployeesMap = rosterData.reduce((acc, roster) => {
        if (!acc[roster.employeeId] && roster.employee) {
            acc[roster.employeeId] = roster.employee;
        }
        return acc;
    }, {} as Record<string, any>);

    const uniqueEmployees = Object.values(uniqueEmployeesMap);

    const getShiftCellText = (roster: RosterSchedule | undefined) => {
        if (!roster) return "";

        // Map shift to abbreviation
        let shiftAbbr = "";
        const shiftUpper = roster.shift.toUpperCase();
        if (shiftUpper.includes("SHIFT 1")) shiftAbbr = "DS";
        else if (shiftUpper.includes("SHIFT 2")) shiftAbbr = "NS";
        else if (shiftUpper.includes("OVER")) shiftAbbr = "OFF"; // Overshift as per user request
        else if (shiftUpper.includes("CUTI")) shiftAbbr = "CT";
        else shiftAbbr = roster.shift;

        const hariKerja = roster.hariKerja ? roster.hariKerja : "";
        return `${shiftAbbr}${hariKerja}`;
    };

    /**
     * Warna sel roster.
     *
     * Dulu memakai hex Excel apa adanya (#A9D08E, #FFD966, #FF0000) — merah murni
     * di ratusan sel membuat CUTI terbaca seperti kecelakaan kerja, dan tak satu pun
     * punya varian mode gelap. Kini memakai semburat yang sama dengan lencana
     * SIM/SIMPER di aplikasi: latar tipis, teks pekat, tetap terbeda sekilas.
     */
    const getShiftCellColor = (roster: RosterSchedule | undefined) => {
        if (!roster) return "bg-card";

        const shiftUpper = roster.shift.toUpperCase();
        if (shiftUpper.includes("SHIFT 1") || shiftUpper.includes("SHIFT 2")) {
            return "bg-muted text-foreground font-medium";
        } else if (shiftUpper.includes("OVER")) {
            return "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-400 font-medium";
        } else if (shiftUpper.includes("CUTI")) {
            return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 font-medium";
        }
        return "bg-muted text-muted-foreground";
    };

    // Get active Nomor Lambung logic (same as roster.tsx fallback chain)
    const getNomorLambung = (empId: string, empData: any) => {
        // Find the latest active roster for them to get actualNomorLambung if we wanted, 
        // but just mapping from employee master for now is fine for the left column
        return empData?.nomorLambung || "-";
    };

    const handleEditClick = (employeeId: string) => {
        setEditingEmployeeId(employeeId);
        const newData: Record<string, string> = {};
        daysInMonth.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const rosterDaily = rosterByEmployeeAndDate[employeeId]?.[dateStr];
            newData[dateStr] = getShiftCellText(rosterDaily);
        });
        setEditData(newData);
    };

    const handleCancelEdit = () => {
        setEditingEmployeeId(null);
        setEditData({});
    };

    const handleInputChange = (dateStr: string, val: string) => {
        setEditData(prev => ({ ...prev, [dateStr]: val }));
    };

    const handleSaveRow = async (employeeId: string, employeeName: string) => {
        setIsSaving(true);
        try {
            const monthStr = format(monthStart, 'yyyy-MM');
            const payloadRosters = daysInMonth.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const shiftValue = editData[dateStr] || '';
                if (!shiftValue.trim()) return null;

                let normalizedShift = 'SHIFT 1';
                const rawShift = shiftValue.toUpperCase().trim();
                if (rawShift.startsWith('DS')) normalizedShift = 'SHIFT 1';
                else if (rawShift.startsWith('NS')) normalizedShift = 'SHIFT 2';
                else if (rawShift.startsWith('OFF') || rawShift.startsWith('OS')) normalizedShift = 'OVER SHIFT';
                else if (rawShift.startsWith('CTO') || rawShift.startsWith('CT')) normalizedShift = 'CUTI';

                const hariKerjaMatch = rawShift.match(/^([A-Z]+)(\d*)$/);
                const hariKerja = hariKerjaMatch && hariKerjaMatch[2] ? hariKerjaMatch[2] : '';

                let defaultStartTime = '06:00', defaultEndTime = '16:00';
                if (normalizedShift === 'SHIFT 2') { defaultStartTime = '18:00'; defaultEndTime = '06:00'; }
                else if (normalizedShift === 'CUTI') { defaultStartTime = '00:00'; defaultEndTime = '00:00'; }
                else if (normalizedShift === 'OVER SHIFT') { defaultStartTime = '06:00'; defaultEndTime = '18:00'; }

                return {
                    employeeId: employeeId,
                    date: dateStr,
                    shift: normalizedShift,
                    startTime: defaultStartTime,
                    endTime: defaultEndTime,
                    jamTidur: '',
                    fitToWork: 'Fit To Work',
                    hariKerja: hariKerja,
                    status: 'scheduled'
                };
            }).filter(Boolean);

            await apiRequest("/api/roster/update-employee-schedule", "POST", {
                employeeId,
                month: monthStr,
                rosters: payloadRosters
            });

            toast({
                title: "Berhasil",
                description: `Jadwal ${employeeName} berhasil diperbarui.`
            });

            setEditingEmployeeId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            queryClient.refetchQueries({ queryKey: ["/api/roster"] });
        } catch (error: any) {
            console.error("Failed to save row", error);
            const errMsg = error.response?.data?.message || "Gagal menyimpan jadwal";
            toast({
                title: "Error",
                description: errMsg,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full overflow-hidden border">
            <div className="table-responsive overflow-x-auto">
                <table className="w-full table-auto min-w-[2000px] border-collapse text-xs">
                    <thead>
                        {/* Top Header Row for Month */}
                        <tr>
                            <th className="border border-primary/30 bg-primary p-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground" colSpan={5}>
                                {/* Empty span over fixed columns */}
                            </th>
                            <th className="border border-primary/30 bg-primary p-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground" colSpan={daysInMonth.length}>
                                {format(monthStart, 'MMMM yyyy')}
                            </th>
                        </tr>
                        {/* Second Header Row for Columns */}
                        <tr className="bg-primary">
                            <th className="border border-primary/30 bg-primary p-1 w-12 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground">NO</th>
                            <th className="border border-primary/30 bg-primary p-1 min-w-[150px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground">NAMA DRIVER</th>
                            <th className="border border-primary/30 bg-primary p-1 min-w-[100px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground">NIK</th>
                            <th className="border border-primary/30 bg-primary p-1 min-w-[100px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground">Nomor Lambung</th>
                            <th className="border border-primary/30 bg-primary p-1 min-w-[100px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground">MITRA</th>
                            <th className="border border-primary/30 bg-primary p-1 min-w-[80px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground">AKSI</th>

                            {/* Date Columns */}
                            {daysInMonth.map(date => (
                                <th key={format(date, 'yyyy-MM-dd')} className="border border-primary/30 bg-primary p-1 min-w-[35px] text-center font-mono text-[10px] font-medium tabular-nums text-primary-foreground">
                                    {format(date, 'dd')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueEmployees.length === 0 ? (
                            <tr>
                                <td colSpan={6 + daysInMonth.length} className="text-center p-4">
                                    Tidak ada data roster untuk bulan ini
                                </td>
                            </tr>
                        ) : (
                            uniqueEmployees.map((employee, index) => (
                                <tr key={employee.id} className="hover:bg-muted">
                                    <td className="border border-gray-300 p-1 text-center">{index + 1}</td>
                                    <td className="border border-gray-300 p-1">{employee.name}</td>
                                    <td className="border border-gray-300 p-1 text-center">{employee.id}</td>
                                    <td className="border border-gray-300 p-1 text-center">{getNomorLambung(employee.id, employee)}</td>
                                    <td className="border border-gray-300 p-1 text-center">{employee.investorGroup || "-"}</td>
                                    <td className="border border-gray-300 p-1 text-center">
                                        {editingEmployeeId === employee.id ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-foreground hover:text-primary hover:bg-muted" onClick={() => handleSaveRow(employee.id, employee.name)} disabled={isSaving}>
                                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleCancelEdit} disabled={isSaving}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1">
                                                <Button size="icon" variant="ghost" title="Edit Inline" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleEditClick(employee.id)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                {onOpenUploadForPerson && (
                                                    <Button size="icon" variant="ghost" title="Upload Excel Roster Karyawan" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => onOpenUploadForPerson(employee.id)}>
                                                        <Upload className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Days Cells */}
                                    {daysInMonth.map(date => {
                                        const dateStr = format(date, 'yyyy-MM-dd');
                                        const rosterDaily = rosterByEmployeeAndDate[employee.id]?.[dateStr];
                                        const isEditing = editingEmployeeId === employee.id;
                                        const cellColor = getShiftCellColor(rosterDaily);
                                        const cellText = getShiftCellText(rosterDaily);

                                        return (
                                            <td
                                                key={dateStr}
                                                className={`border border-gray-300 p-0 text-center ${!isEditing && cellColor}`}
                                                title={rosterDaily ? `${rosterDaily.shift} (${rosterDaily.startTime} - ${rosterDaily.endTime})` : 'No Schedule'}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editData[dateStr] || ''}
                                                        onChange={(e) => handleInputChange(dateStr, e.target.value)}
                                                        className="w-full h-full text-center p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 min-w-[35px]"
                                                        placeholder="-"
                                                        disabled={isSaving}
                                                    />
                                                ) : (
                                                    <div className="p-1 w-full h-full min-h-[24px] flex items-center justify-center">
                                                        {cellText}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card >
    );
}
