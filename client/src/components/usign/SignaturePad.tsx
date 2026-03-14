import { useRef, useState } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eraser, RotateCcw, Check, Type, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onCancel?: () => void;
    title?: string;
    defaultValue?: string;
    isPending?: boolean;
}

export function USignSignaturePad({ onSave, onCancel, title = "Tanda Tangan Digital", defaultValue, isPending }: SignaturePadProps) {
    const sigCanvas = useRef<ReactSignatureCanvas>(null);
    const [activeTab, setActiveTab] = useState("draw");
    const [typedName, setTypedName] = useState("");
    const [fontFamily, setFontFamily] = useState("'Dancing Script', cursive");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const clear = () => {
        sigCanvas.current?.clear();
        setUploadedImage(null);
        setTypedName("");
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setUploadedImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (activeTab === "draw") {
            if (sigCanvas.current?.isEmpty()) return;
            onSave(sigCanvas.current!.getTrimmedCanvas().toDataURL("image/png"));
        } else if (activeTab === "type") {
            if (!typedName) return;
            // Creation of a temporary canvas to render text as image
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 200;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "black";
                ctx.font = `60px ${fontFamily}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
                onSave(canvas.toDataURL("image/png"));
            }
        } else if (activeTab === "upload") {
            if (!uploadedImage) return;
            onSave(uploadedImage);
        }
    };

    return (
        <Card className="w-full border-none shadow-none">
            <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="draw" className="flex items-center gap-2">
                            <Eraser className="w-4 h-4" /> Lukis
                        </TabsTrigger>
                        <TabsTrigger value="type" className="flex items-center gap-2">
                            <Type className="w-4 h-4" /> Ketik
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Unggah
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="draw" className="space-y-4">
                        <div className="border-2 border-dashed border-muted rounded-xl bg-slate-50 relative overflow-hidden h-[200px]">
                            <ReactSignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    className: "signature-canvas w-full h-full cursor-crosshair",
                                }}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground hover:text-destructive transition-colors">
                                <RotateCcw className="w-4 h-4 mr-2" /> Bersihkan
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="type" className="space-y-4">
                        <div className="space-y-4">
                            <Input
                                placeholder="Ketik nama Anda..."
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="text-lg h-12"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={fontFamily === "'Dancing Script', cursive" ? "secondary" : "outline"}
                                    onClick={() => setFontFamily("'Dancing Script', cursive")}
                                    className="font-dancing text-lg h-16"
                                >
                                    Styles 1
                                </Button>
                                <Button
                                    variant={fontFamily === "'Great Vibes', cursive" ? "secondary" : "outline"}
                                    onClick={() => setFontFamily("'Great Vibes', cursive")}
                                    className="font-great-vibes text-lg h-16"
                                >
                                    Styles 2
                                </Button>
                            </div>
                            <div className="p-8 border rounded-xl flex items-center justify-center bg-slate-50 min-h-[120px]">
                                <p style={{ fontFamily }} className="text-4xl text-black truncate max-w-full">
                                    {typedName || "Pratinjau"}
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-muted rounded-xl bg-slate-50 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-slate-100 transition-colors h-[200px]"
                        >
                            {uploadedImage ? (
                                <img src={uploadedImage} alt="Uploaded signature" className="max-h-full object-contain" />
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                                    <p className="text-sm font-medium">Klik untuk upload tanda tangan</p>
                                    <p className="text-xs text-muted-foreground mt-1">PNG atau JPG disarankan</p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={onFileChange}
                            />
                        </div>
                        {uploadedImage && (
                            <div className="flex justify-center">
                                <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground hover:text-destructive transition-colors">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Ganti Gambar
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={onCancel}>
                        Batal
                    </Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={isPending}>
                        {isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                            <Check className="w-4 h-4 mr-2" />
                        )}
                        Terapkan
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
