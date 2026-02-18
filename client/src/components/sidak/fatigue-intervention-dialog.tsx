import { useState, useRef } from "react";
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
import { Camera, Upload, X, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FatigueInterventionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeName: string;
    onProcceedToRetest: (evidence: string, note: string) => void;
}

export function FatigueInterventionDialog({
    open,
    onOpenChange,
    employeeName,
    onProcceedToRetest
}: FatigueInterventionDialogProps) {
    const [evidence, setEvidence] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const isFormValid = evidence || note.trim();

    const handleSubmit = () => {
        if (!isFormValid) {
            toast({
                title: "Data Kurang",
                description: "Mohon lengkapi bukti foto atau catatan intervensi",
                variant: "destructive"
            });
            return;
        }

        onProcceedToRetest(evidence || "", note);
        // Reset form
        setEvidence(null);
        setNote("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tindak Lanjut Fatigue</DialogTitle>
                    <DialogDescription>
                        Driver <strong>{employeeName}</strong> terindikasi fatigue. Mohon lakukan intervensi (istirahat, minum kopi, senam ringan) dan lampirkan bukti foto/catatan sebelum tes ulang.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Evidence Upload */}
                    <div className="space-y-2">
                        <Label>Bukti Intervensi (Foto) - <span className="text-gray-400 font-normal">Opsional jika ada catatan</span></Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={handleCapture}>
                            {evidence ? (
                                <div className="relative w-full h-48">
                                    <img src={evidence} alt="Evidence" className="w-full h-full object-cover rounded-md" />
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
                        <Label>Catatan Intervensi - <span className="text-gray-400 font-normal">Opsional jika ada foto</span></Label>
                        <Textarea
                            placeholder="Contoh: Karyawan diminta tidur 30 menit dan minum air putih..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleSubmit} disabled={!isFormValid} className="bg-blue-600 hover:bg-blue-700">
                        <Activity className="h-4 w-4 mr-2" />
                        Lanjut Tes Ulang
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
