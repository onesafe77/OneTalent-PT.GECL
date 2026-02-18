import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, Activity, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FatigueEvidenceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: {
        id: string;
        nama: string;
        catatanIntervensi?: string | null;
        buktiIntervensi?: string | null;
    } | null;
    onSave: (id: string, evidence: string | null, note: string) => Promise<void>;
}

export function FatigueEvidenceDialog({
    open,
    onOpenChange,
    record,
    onSave
}: FatigueEvidenceDialogProps) {
    const [evidence, setEvidence] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load initial data when record changes
    useEffect(() => {
        if (open && record) {
            setEvidence(record.buktiIntervensi || null);
            setNote(record.catatanIntervensi || "");
        }
    }, [open, record]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEvidence(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCapture = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSubmit = async () => {
        if (!record) return;

        if (!evidence && !note.trim()) {
            toast({
                title: "Data Kurang",
                description: "Mohon lengkapi bukti foto atau catatan intervensi",
                variant: "destructive"
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await onSave(record.id, evidence, note);
            onOpenChange(false);
            toast({
                title: "Berhasil",
                description: "Data tindak lanjut berhasil disimpan",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Gagal",
                description: "Gagal menyimpan data tindak lanjut",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tindak Lanjut Fatigue</DialogTitle>
                    <DialogDescription>
                        Update data intervensi untuk <strong>{record?.nama}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Evidence Upload */}
                    <div className="space-y-2">
                        <Label>Bukti Intervensi (Foto)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={handleCapture}>
                            {evidence ? (
                                <div className="relative w-full h-48">
                                    <ImageWithFallback src={evidence} alt="Evidence" className="w-full h-full object-cover rounded-md" />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEvidence(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Camera className="h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500 font-medium">Klik untuk ambil foto / upload</p>
                                    <p className="text-xs text-gray-400">Bukti driver sedang istirahat/minum</p>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    {/* Note Input */}
                    <div className="space-y-2">
                        <Label>Catatan Intervensi</Label>
                        <Textarea
                            placeholder="Contoh: Karyawan diminta tidur 30 menit dan minum air putih..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={(!evidence && !note.trim()) || isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                        {isSubmitting ? (
                            "Menyimpan..."
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Simpan
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Helper component for image fallback
function ImageWithFallback({ src, alt, className }: { src: string, alt: string, className?: string }) {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
                <Activity className="h-8 w-8" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setError(true)}
        />
    );
}
