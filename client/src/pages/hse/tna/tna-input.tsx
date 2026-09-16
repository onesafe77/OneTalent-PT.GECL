import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Building2,
    User,
    Briefcase,
    Save,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Search,
    Loader2,
    BarChart3,
    ChevronDown,
    Edit,
    X,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Employee } from "@shared/schema";

type MatrixRow = {
    id: string; // random local ID for key
    trainingId: string;
    trainingName: string;
    category: string;
    plan: "M" | "D";
    actual: "C" | "NC" | "";
    actualDate?: string;
    notes?: string;
    isMandatory?: boolean;
};

export default function TnaInput() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [period, setPeriod] = useState("2026-01");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [rows, setRows] = useState<MatrixRow[]>([]);

    // Popover states
    const [openTrainingCombobox, setOpenTrainingCombobox] = useState(false);
    const [openEmployeeCombobox, setOpenEmployeeCombobox] = useState(false);
    const [showSavedData, setShowSavedData] = useState(false);

    // Inline Editing State
    const [editingEntry, setEditingEntry] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ plan: string, actual: string }>({ plan: "", actual: "" });

    // Fetch Lists
    const { data: trainings = [] } = useQuery<any[]>({ queryKey: ["/api/hse/trainings"] });
    const { data: employeesResponse } = useQuery<{ data: Employee[], total: number }>({ queryKey: ["/api/employees?per_page=1000"] });
    const employees = employeesResponse?.data || [];

    // Load Existing TNA Data when Employee & Period Selected
    const { data: existingTna, isLoading: tnaLoading } = useQuery({
        queryKey: ["/api/hse/tna", selectedEmployee?.id, period],
        enabled: !!selectedEmployee?.id && !!period,
    });

    // Load all saved TNA entries for the rekap section (individual entries with training details)
    const { data: savedEntries = [], isLoading: savedEntriesLoading } = useQuery<any[]>({
        queryKey: ["/api/hse/tna/all-raw-entries"],
    });

    // DEBUG: Force invalidation once to ensure we get fresh data
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/hse/trainings"] });
    }, [queryClient]);

    console.log("DEBUG: Trainings loaded:", trainings.length, trainings);

    // Effect to populate rows from existing TNA or Mandatory Defaults
    useEffect(() => {
        if (!selectedEmployee) {
            setRows([]);
            return;
        }

        if (existingTna && existingTna.entries && existingTna.entries.length > 0) {
            // Populate from saved database
            const savedRows = existingTna.entries.map((entry: any) => ({
                id: entry.id || Math.random().toString(36).substring(7),
                trainingId: entry.trainingId,
                trainingName: entry.trainingName,
                category: entry.trainingCategory,
                plan: entry.planStatus,
                actual: entry.actualStatus,
                actualDate: entry.actualDate ? new Date(entry.actualDate).toISOString().split('T')[0] : "",
                notes: entry.notes,
                isMandatory: entry.isMandatory
            }));
            setRows(savedRows);
        } else if (trainings.length > 0 && !tnaLoading) {
            // New TNA: Auto-fill Mandatory
            // Only if request finished and no existing data found
            const mandatory = trainings.filter((t: any) => t.isMandatory);
            const initialRows: MatrixRow[] = mandatory.map((t: any) => ({
                id: Math.random().toString(36).substring(7),
                trainingId: t.id,
                trainingName: t.name,
                category: t.category,
                plan: "M",
                actual: "",
                isMandatory: true
            }));
            setRows(initialRows);
        }
    }, [selectedEmployee, existingTna, trainings, tnaLoading]);


    const handleAddTraining = (training: any) => {
        if (!selectedEmployee) {
            toast({ title: "Select Employee First", description: "Please select an employee to assign training.", variant: "destructive" });
            return;
        }
        if (rows.some(r => r.trainingId === training.id)) {
            toast({ title: "Already added", description: "This training is already in the matrix.", variant: "secondary" });
            return;
        }

        const newRow: MatrixRow = {
            id: Math.random().toString(36).substring(7),
            trainingId: training.id,
            trainingName: training.name,
            category: training.category,
            plan: "D",
            actual: "",
            isMandatory: training.isMandatory
        };
        setRows([...rows, newRow]);
        setOpenTrainingCombobox(false);
    };

    const updateRow = (id: string, field: keyof MatrixRow, value: any) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const handleSave = async () => {
        if (!selectedEmployee) return;

        try {
            const payload = {
                employeeId: selectedEmployee.id,
                period: period,
                entries: rows.map(r => ({
                    trainingId: r.trainingId,
                    planStatus: r.plan,
                    actualStatus: r.actual,
                    actualDate: r.actualDate || null,
                    notes: r.notes || ""
                }))
            };

            console.log("DEBUG: TNA Save Payload:", JSON.stringify(payload, null, 2));
            await apiRequest("/api/hse/tna", "POST", payload);
            toast({ title: "Success", description: "TNA Data saved successfully." });

            // Invalidate all related queries for auto-refresh
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna", selectedEmployee.id, period] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/gap-analysis"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/department-compliance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/all-entries"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna/all-raw-entries"] });
        } catch (err: any) {
            console.error("DEBUG: TNA Save Error:", err);
            console.error("DEBUG: Error Response:", err?.message || err);
            toast({ title: "Error", description: `Failed to save TNA data: ${err?.message || 'Unknown error'}`, variant: "destructive" });
        }
    };

    const startEditing = (entry: any) => {
        setEditingEntry(entry.id);
        setEditForm({
            plan: entry.planStatus,
            actual: entry.actualStatus || ""
        });
    };

    const cancelEditing = () => {
        setEditingEntry(null);
        setEditForm({ plan: "", actual: "" });
    };

    const saveEditing = async (id: string) => {
        try {
            await apiRequest(`/api/hse/tna/entries/${id}`, "PATCH", {
                planStatus: editForm.plan,
                actualStatus: editForm.actual || null,
            });

            toast({ title: "Success", description: "Entry updated successfully" });
            setEditingEntry(null);

            // Invalidate queries to refresh all views
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna/all-raw-entries"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/all-entries"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/gap-analysis"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/department-compliance"] });

            if (selectedEmployee) {
                queryClient.invalidateQueries({ queryKey: ["/api/hse/tna", selectedEmployee.id, period] });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update entry", variant: "destructive" });
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-black min-h-screen font-sans pb-24">
            {/* Sticky Employee Header */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 -mx-6 px-6 py-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex-1 min-w-[300px]">
                        {/* Employee Selector */}
                        <Popover open={openEmployeeCombobox} onOpenChange={setOpenEmployeeCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className={cn("w-full md:w-[450px] justify-between text-left font-normal h-12 bg-white dark:bg-zinc-950", !selectedEmployee && "text-muted-foreground")}>
                                    {selectedEmployee ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/20 flex items-center justify-center text-sm font-bold text-red-700 dark:text-red-400">
                                                {selectedEmployee.name?.charAt(0)}
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold text-sm leading-tight text-gray-900 dark:text-gray-100">{selectedEmployee.name}</span>
                                                <span className="text-xs text-muted-foreground leading-tight">{selectedEmployee.id}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Select Employee to start TNA...</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[450px]" align="start">
                                <Command filter={(value, search) => {
                                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                                    return 0;
                                }}>
                                    <CommandInput placeholder="Search by Name or NIK..." />
                                    <CommandList>
                                        <CommandEmpty>No employee found.</CommandEmpty>
                                        <CommandGroup heading="Employees">
                                            {employees.map((emp) => (
                                                <CommandItem
                                                    key={emp.id}
                                                    value={`${emp.name} ${emp.id}`}
                                                    onSelect={() => {
                                                        setSelectedEmployee(emp);
                                                        setOpenEmployeeCombobox(false);
                                                    }}
                                                    className="cursor-pointer py-3"
                                                >
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                            {emp.name?.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{emp.name}</span>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span className="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{emp.id}</span>
                                                                <span>{emp.department || "-"}</span>
                                                                <span>{emp.position || "-"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-2">
                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Assessment Period</Label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-[140px] h-8 font-bold border-none bg-transparent shadow-none focus:ring-0 text-right px-0 text-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2026-01">January 2026</SelectItem>
                                    <SelectItem value="2026-02">February 2026</SelectItem>
                                    <SelectItem value="2026-03">March 2026</SelectItem>
                                    <SelectItem value="2026-04">April 2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="h-10 w-[1px] bg-gray-200 dark:bg-zinc-700 mx-2"></div>
                        <Button
                            onClick={handleSave}
                            disabled={!selectedEmployee || rows.length === 0}
                            className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 px-6"
                        >
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </div>
                </div>

                {/* Selected Employee Info Context */}
                {selectedEmployee && (
                    <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400" /> {selectedEmployee.position || "No Position"}</span>
                            <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> {selectedEmployee.department || "No Dept"}</span>
                            <span className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-medium border border-border">Active Employee</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`max-w-7xl mx-auto space-y-6 transition-all duration-300 ${!selectedEmployee ? 'opacity-50 pointer-events-none grayscale' : ''}`}>

                {/* Training Selector */}
                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-1">
                            <Label className="mb-2 block text-xs uppercase text-gray-400 font-bold">Add Additional Training</Label>
                            <Popover open={openTrainingCombobox} onOpenChange={setOpenTrainingCombobox}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between text-left font-normal text-muted-foreground border-dashed">
                                        <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Search training to add to matrix...</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[400px]" align="start">
                                    <Command filter={(value, search) => {
                                        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                                        return 0;
                                    }}>
                                        <CommandInput placeholder={`Search from ${trainings.length} trainings...`} />
                                        <CommandList>
                                            <CommandEmpty>No training found.</CommandEmpty>
                                            <CommandGroup>
                                                {trainings.map((t: any) => (
                                                    <CommandItem
                                                        key={t.id}
                                                        value={t.name}
                                                        onSelect={() => handleAddTraining(t)}
                                                        className="cursor-pointer"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span>{t.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">{t.category}</span>
                                                                {t.isMandatory && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Mandatory</span>}
                                                            </div>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="w-[1px] h-10 bg-gray-100 dark:bg-zinc-800 mx-2" />
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> <span className="font-medium">M</span> = Mandatory
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span> <span className="font-medium">D</span> = Development
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Matrix Table */}
                <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-zinc-900/50">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[15%]">Category</TableHead>
                                    <TableHead className="w-[30%]">Training Name</TableHead>
                                    <TableHead className="w-[10%] text-center">PLAN</TableHead>
                                    <TableHead className="w-[15%] text-center">ACTUAL</TableHead>
                                    <TableHead className="w-[15%]">Completion Date</TableHead>
                                    <TableHead className="w-[10%]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tnaLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading TNA Data...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            {selectedEmployee ? "No trainings added. Start by adding a training above." : "Select an employee to view their Training Matrix."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => (
                                        <TableRow key={row.id} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-900/80">
                                            <TableCell className="font-medium text-gray-500 text-xs uppercase tracking-wider">
                                                {row.category}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{row.trainingName}</span>
                                                    {row.isMandatory && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">MANDATORY</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select
                                                    value={row.plan}
                                                    onValueChange={(v) => updateRow(row.id, 'plan', v)}
                                                    disabled={row.isMandatory}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "w-[70px] mx-auto h-8 border-none font-bold shadow-sm",
                                                        row.plan === 'M' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="M">M</SelectItem>
                                                        <SelectItem value="D">D</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select
                                                    value={row.actual}
                                                    onValueChange={(v) => updateRow(row.id, 'actual', v)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "w-[90px] mx-auto h-8 shadow-sm transition-colors",
                                                        row.actual === 'C' ? "bg-muted text-foreground border-border" :
                                                            row.actual === 'NC' ? "bg-zinc-100 text-zinc-600 border-zinc-200" : ""
                                                    )}>
                                                        <SelectValue placeholder="-" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="C"><span className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="w-3 h-3" /> Complied</span></SelectItem>
                                                        <SelectItem value="NC"><span className="flex items-center gap-2 font-medium text-red-600"><AlertCircle className="w-3 h-3" /> Not Yet</span></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    className={cn("h-8 text-xs", !row.actualDate && "text-muted-foreground")}
                                                    value={row.actualDate || ""}
                                                    onChange={(e) => updateRow(row.id, 'actualDate', e.target.value)}
                                                    disabled={row.actual !== 'C'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeRow(row.id)}
                                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* Section: Data TNA Tersimpan */}
            <Card className="border-none shadow-sm mt-6 bg-white dark:bg-zinc-900/50">
                <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setShowSavedData(!showSavedData)}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Data TNA Tersimpan</h3>
                            <p className="text-xs text-gray-500">Lihat semua data TNA dari semua karyawan</p>
                        </div>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", showSavedData && "rotate-180")} />
                </div>

                {showSavedData && (
                    <div className="border-t border-gray-100 dark:border-zinc-800">
                        <div className="p-4">
                            {savedEntriesLoading ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    Loading data...
                                </div>
                            ) : savedEntries && savedEntries.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50 dark:bg-zinc-900">
                                                <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs w-[15%]">Category</th>
                                                <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs w-[30%]">Training Name</th>
                                                <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs w-[10%]">PLAN</th>
                                                <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs w-[15%]">ACTUAL</th>
                                                <th className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs w-[20%]">Karyawan</th>
                                                <th className="px-3 py-2.5 text-center font-medium text-gray-600 text-xs w-[10%]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {savedEntries.map((row: any, idx: number) => (
                                                <tr key={`${row.id}_${idx}`} className="border-b hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        {row.trainingCategory}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{row.trainingName}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {editingEntry === row.id ? (
                                                            <Select
                                                                value={editForm.plan}
                                                                onValueChange={(v) => setEditForm({ ...editForm, plan: v })}
                                                            >
                                                                <SelectTrigger className="w-[70px] mx-auto h-7 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="M">M</SelectItem>
                                                                    <SelectItem value="D">D</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <span className={cn(
                                                                "px-3 py-1 rounded text-xs font-bold",
                                                                row.planStatus === 'M' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                                                            )}>
                                                                {row.planStatus}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {editingEntry === row.id ? (
                                                            <Select
                                                                value={editForm.actual}
                                                                onValueChange={(v) => setEditForm({ ...editForm, actual: v })}
                                                            >
                                                                <SelectTrigger className="w-[100px] mx-auto h-7 text-xs">
                                                                    <SelectValue placeholder="-" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="C">Complied</SelectItem>
                                                                    <SelectItem value="NC">Not Yet</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            row.actualStatus === 'C' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-foreground border border-border">
                                                                    <CheckCircle2 className="w-3 h-3" /> Complied
                                                                </span>
                                                            ) : row.actualStatus === 'NC' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                                                                    <AlertCircle className="w-3 h-3" /> Not Yet
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-700">{row.employeeName}</span>
                                                            <span className="text-[10px] text-gray-400">{row.department}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {editingEntry === row.id ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-foreground hover:text-primary hover:bg-muted" onClick={() => saveEditing(row.id)}>
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={cancelEditing}>
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => startEditing(row)}>
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                                                    console.log("DEBUG: Row Data:", row);
                                                                    if (!row || !row.id) {
                                                                        alert("Error: Cannot delete. ID is missing.");
                                                                        return;
                                                                    }
                                                                    if (window.confirm(`Are you sure you want to delete entry ID: ${row.id}?`)) {
                                                                        apiRequest("/api/hse/tna/delete-entry", "POST", { id: row.id }).then(() => {
                                                                            toast({ title: "Deleted", description: "Entry deleted successfully" });
                                                                            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna/all-raw-entries"] });
                                                                            queryClient.invalidateQueries({ queryKey: ["/api/hse/tna-dashboard/all-entries"] });
                                                                            if (selectedEmployee) {
                                                                                queryClient.invalidateQueries({ queryKey: ["/api/hse/tna", selectedEmployee.id, period] });
                                                                            }
                                                                        }).catch(err => {
                                                                            console.error("Delete Error for ID " + row.id + ":", err);
                                                                            toast({ title: "Error", description: err.message || "Failed to delete entry", variant: "destructive" });
                                                                        });
                                                                    }
                                                                }}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    Belum ada data TNA tersimpan. Mulai dengan menambahkan data di atas.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
