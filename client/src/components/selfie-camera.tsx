import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check } from "lucide-react";

interface SelfieCameraProps {
    onCapture: (dataUrl: string) => void;
    value?: string;
    onClear?: () => void;
}

export function SelfieCamera({ onCapture, value, onClear }: SelfieCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string>("");

    const startCamera = async () => {
        setIsStarting(true);
        setError("");
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
                audio: false,
            });
            // Only set state; the <video> element belum di-render saat ini (conditional on `stream`).
            // useEffect below will attach srcObject saat element sudah mount.
            setStream(mediaStream);
        } catch (err: any) {
            console.error("Camera error:", err);
            setError(err?.message || "Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
        } finally {
            setIsStarting(false);
        }
    };

    const stopCamera = () => {
        setStream((prev) => {
            prev?.getTracks().forEach((t) => t.stop());
            return null;
        });
    };

    // Attach stream to <video> setelah element ter-mount (saat `stream` jadi truthy & komponen re-render).
    useEffect(() => {
        const video = videoRef.current;
        if (!stream || !video) return;
        video.srcObject = stream;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch((err) => {
                console.error("Video play() error:", err);
                setError("Gagal memulai preview kamera: " + (err?.message || ""));
            });
        }
        return () => {
            video.srcObject = null;
        };
    }, [stream]);

    // Stop tracks on unmount
    useEffect(() => {
        return () => {
            setStream((prev) => {
                prev?.getTracks().forEach((t) => t.stop());
                return null;
            });
        };
    }, []);

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        // Reject kalau video belum streaming — capture akan hasilkan canvas kosong
        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            setError("Kamera belum siap. Tunggu video muncul lalu coba lagi.");
            return;
        }
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        // Validasi hasil capture — data URL minimum harus punya konten
        if (!dataUrl || dataUrl.length < 1000) {
            setError("Hasil foto kosong. Pastikan kamera aktif & coba lagi.");
            return;
        }
        onCapture(dataUrl);
        stopCamera();
    };

    if (value) {
        return (
            <div className="relative border rounded-xl p-2 bg-gray-50">
                <img src={value} alt="Selfie" className="w-full max-h-64 object-contain bg-white rounded-lg" />
                <div className="mt-2 flex justify-center">
                    <Button type="button" variant="outline" size="sm" onClick={() => { onClear?.(); }}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Foto Ulang
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-xl p-3 bg-gray-50 space-y-3">
            {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
            )}
            {stream ? (
                <>
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={stopCamera}>Batal</Button>
                        <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" onClick={capture}>
                            <Check className="w-4 h-4 mr-1" /> Ambil Foto
                        </Button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <Camera className="w-10 h-10 text-gray-400" />
                    <p className="text-sm text-gray-500 text-center">Aktifkan kamera depan untuk mengambil foto selfie</p>
                    <Button type="button" onClick={startCamera} disabled={isStarting} className="bg-red-600 hover:bg-red-700">
                        <Camera className="w-4 h-4 mr-2" />
                        {isStarting ? "Membuka..." : "Buka Kamera"}
                    </Button>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
