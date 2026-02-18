import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Training } from "@shared/schema";

export default function TrainingMaster() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTraining, setNewTraining] = useState({
        name: "",
        category: "",
        isMandatory: false,
        description: ""
    });

    const { data: trainings = [], isLoading } = useQuery<Training[]>({
        queryKey: ["/api/hse/trainings"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof newTraining) => {
            return await apiRequest("/api/hse/trainings", "POST", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hse/trainings"] });
            setIsAddOpen(false);
            setNewTraining({ name: "", category: "", isMandatory: false, description: "" });
            toast({
                title: "Success",
                description: "Training added successfully",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to add training",
                variant: "destructive",
            });
        }
    });

    const filteredTrainings = trainings.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categories = ["K3 Umum", "Safety", "Technical", "Leadership", "Operational"];

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-black min-h-screen font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
                        Master Data Training
                    </h1>
                    <p className="text-gray-500 text-sm">Manage training catalog for TNA</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Training
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Training</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Training Name</Label>
                                <Input
                                    id="name"
                                    value={newTraining.name}
                                    onChange={(e) => setNewTraining({ ...newTraining, name: e.target.value })}
                                    placeholder="e.g. K3 Umum BNSP"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={newTraining.category}
                                    onValueChange={(val) => setNewTraining({ ...newTraining, category: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="mandatory"
                                    checked={newTraining.isMandatory}
                                    onCheckedChange={(checked) => setNewTraining({ ...newTraining, isMandatory: checked })}
                                />
                                <Label htmlFor="mandatory">Mandatory for All Employees</Label>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="desc">Description</Label>
                                <Input
                                    id="desc"
                                    value={newTraining.description}
                                    onChange={(e) => setNewTraining({ ...newTraining, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => createMutation.mutate(newTraining)}
                                disabled={createMutation.isPending || !newTraining.name || !newTraining.category}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {createMutation.isPending ? "Saving..." : "Save Training"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none shadow-sm bg-white dark:bg-zinc-900/50">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center relative max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 text-gray-400" />
                        <Input
                            placeholder="Search trainings..."
                            className="pl-9 bg-gray-50 dark:bg-zinc-900 border-none focus-visible:ring-1 focus-visible:ring-red-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[30%]">Training Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : filteredTrainings.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No trainings found</TableCell></TableRow>
                            ) : (
                                filteredTrainings.map((t) => (
                                    <TableRow key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/50">
                                        <TableCell className="font-medium">{t.name}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                {t.category}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {t.isMandatory ? (
                                                <span className="text-red-600 text-xs font-bold border border-red-200 bg-red-50 px-2 py-1 rounded-md">MANDATORY</span>
                                            ) : (
                                                <span className="text-orange-600 text-xs font-medium border border-orange-200 bg-orange-50 px-2 py-1 rounded-md">DEVELOPMENT</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{t.description || "-"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
