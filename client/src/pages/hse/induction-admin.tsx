
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, FileText, BrainCircuit, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { InductionMaterial, InductionQuestion } from "@shared/schema";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function InductionAdmin() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("materials");

    // MATERIALS STATE
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    // QUESTIONS STATE
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>("all");
    const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        questionText: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        materialId: ""
    });
    const [isGenerating, setIsGenerating] = useState(false);

    // QUERIES
    const { data: materials, isLoading: isLoadingMaterials } = useQuery<InductionMaterial[]>({
        queryKey: ["/api/induction/materials"],
    });

    const { data: questions, isLoading: isLoadingQuestions } = useQuery<InductionQuestion[]>({
        queryKey: ["/api/induction/questions", activeTab === "questions" ? selectedMaterialId : null],
        enabled: activeTab === "questions",
    });

    // MUTATIONS - MATERIALS
    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile || !uploadTitle) throw new Error("File and Title required");
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("title", uploadTitle);
            formData.append("description", "Uploaded via Admin"); // Optional description

            const res = await fetch("/api/induction/materials", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/materials"] });
            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadTitle("");
            toast({ title: "Success", description: "Materi berhasil diupload" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const deleteMaterialMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest(`/api/induction/materials/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/materials"] });
            toast({ title: "Success", description: "Materi dihapus" });
        }
    });

    // MUTATIONS - QUESTIONS
    const createQuestionMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest("/api/induction/questions", "POST", {
                ...data,
                isActive: true,
                order: (questions?.length || 0) + 1
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/questions"] });
            setIsQuestionDialogOpen(false);
            setNewQuestion({
                questionText: "",
                options: ["", "", "", ""],
                correctAnswerIndex: 0,
                materialId: ""
            });
            toast({ title: "Success", description: "Soal berhasil ditambahkan" });
        }
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest(`/api/induction/questions/${id}`, "DELETE");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/questions"] });
            toast({ title: "Success", description: "Soal dihapus" });
        }
    });

    const generateAiMutation = useMutation({
        mutationFn: async (materialId: string) => {
            return await apiRequest("/api/induction/questions/generate-from-material", "POST", { materialId });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/induction/questions"] });
            toast({ title: "Success", description: `Berhasil generate ${data.count} soal dari AI` });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Generate AI", description: error.message, variant: "destructive" });
        }
    });

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            await uploadMutation.mutateAsync();
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerateAi = async (materialId: string) => {
        if (!materialId) return toast({ title: "Pilih materi dulu", variant: "destructive" });
        setIsGenerating(true);
        try {
            await generateAiMutation.mutateAsync(materialId);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Induksi K3</h1>
                    <p className="text-muted-foreground">Kelola materi dan bank soal untuk induksi karyawan.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="materials">Materi Induksi</TabsTrigger>
                    <TabsTrigger value="questions">Bank Soal</TabsTrigger>
                </TabsList>

                {/* MATERIALS TAB */}
                <TabsContent value="materials" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Daftar Materi</CardTitle>
                                <CardDescription>File PPT/PDF yang menjadi bahan induksi.</CardDescription>
                            </div>
                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button><Plus className="mr-2 h-4 w-4" /> Upload Materi</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload Materi Baru</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleUpload} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Judul Materi</Label>
                                            <Input
                                                value={uploadTitle}
                                                onChange={(e) => setUploadTitle(e.target.value)}
                                                placeholder="Contoh: Induksi K3 Umum 2025"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>File (PDF/PPTX)</Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,.pptx"
                                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">Maksimal 10MB.</p>
                                        </div>
                                        <Button type="submit" disabled={isUploading} className="w-full">
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Upload
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {isLoadingMaterials ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : materials?.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground">Belum ada materi. Silakan upload.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Judul</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead>Tanggal Upload</TableHead>
                                            <TableHead>Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materials?.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell className="font-medium">{m.title}</TableCell>
                                                <TableCell><span className="uppercase text-xs font-bold px-2 py-1 bg-muted rounded">{m.fileType}</span></TableCell>
                                                <TableCell>{new Date(m.uploadedAt || "").toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => deleteMaterialMutation.mutate(m.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* QUESTIONS TAB */}
                <TabsContent value="questions" className="space-y-4">
                    <div className="flex justify-between items-center gap-4">
                        <div className="w-[300px]">
                            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Materi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Materi</SelectItem>
                                    {materials?.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => handleGenerateAi(selectedMaterialId)} disabled={selectedMaterialId === "all" || isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4 text-purple-600" />}
                                Generate AI
                            </Button>

                            <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button><Plus className="mr-2 h-4 w-4" /> Tambah Manual</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Buat Soal Baru</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Materi Terkait</Label>
                                            <Select
                                                value={newQuestion.materialId}
                                                onValueChange={(v) => setNewQuestion({ ...newQuestion, materialId: v })}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Pilih Materi" /></SelectTrigger>
                                                <SelectContent>
                                                    {materials?.map((m) => (
                                                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Pertanyaan</Label>
                                            <Textarea
                                                value={newQuestion.questionText}
                                                onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                                                placeholder="Tulis pertanyaan..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Pilihan Jawaban</Label>
                                            {newQuestion.options.map((opt, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <span className="w-6 text-sm font-bold">{String.fromCharCode(65 + idx)}.</span>
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const newOpts = [...newQuestion.options];
                                                            newOpts[idx] = e.target.value;
                                                            setNewQuestion({ ...newQuestion, options: newOpts });
                                                        }}
                                                        placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                                                    />
                                                    <input
                                                        type="radio"
                                                        name="correctAnswer"
                                                        checked={newQuestion.correctAnswerIndex === idx}
                                                        onChange={() => setNewQuestion({ ...newQuestion, correctAnswerIndex: idx })}
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-xs text-muted-foreground">*Pilih radio button di sebelah kanan jawaban yang benar.</p>
                                        </div>
                                        <Button onClick={() => createQuestionMutation.mutate(newQuestion)} className="w-full">Simpan</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            {isLoadingQuestions ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : questions?.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground">Belum ada soal. Gunakan tombol Tambah atau Generate AI.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Pertanyaan</TableHead>
                                            <TableHead>Materi</TableHead>
                                            <TableHead>Jawaban Benar</TableHead>
                                            <TableHead>Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {questions?.map((q, idx) => (
                                            <TableRow key={q.id}>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell className="max-w-[400px]">
                                                    <div className="font-medium line-clamp-2">{q.questionText}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {(q.options as string[]).map((o, i) => (
                                                            <span key={i} className={i === q.correctAnswerIndex ? "text-green-600 font-bold mr-2" : "mr-2"}>
                                                                {String.fromCharCode(65 + i)}. {o}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {materials?.find(m => m.id === q.materialId)?.title || "-"}
                                                </TableCell>
                                                <TableCell className="font-bold text-green-600">
                                                    {String.fromCharCode(65 + (q.correctAnswerIndex || 0))}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => deleteQuestionMutation.mutate(q.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
