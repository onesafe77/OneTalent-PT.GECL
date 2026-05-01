import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateQRData } from "@/lib/crypto-utils";
import jsQR from "jsqr";

interface ObserverData {
  nama: string;
  nik: string;
  perusahaan: string;
  jabatan: string;
}

interface SidakObserverScannerProps {
  onScanSuccess: (observer: ObserverData) => void;
  onCancel: () => void;
  autoStart?: boolean;
}

export function SidakObserverScanner({ onScanSuccess, onCancel, autoStart = true }: SidakObserverScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);
  const { toast } = useToast();

  const startScanning = async () => {
    try {
      setLastScanTime(0);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setIsScanning(true);
      scanningRef.current = true;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => {
          console.log("📷 Camera ready for observer QR scan");
          requestAnimationFrame(scanQRCode);
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Error Kamera",
        description: "Gagal mengakses kamera. Pastikan browser memiliki izin kamera.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    scanningRef.current = false;
    setIsScanning(false);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanQRCode = useCallback(() => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (scanningRef.current) {
        requestAnimationFrame(scanQRCode);
      }
      return;
    }

    const maxWidth = 480;
    const maxHeight = 360;
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    
    let canvasWidth = Math.min(video.videoWidth, maxWidth);
    let canvasHeight = canvasWidth / videoAspectRatio;
    
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = canvasHeight * videoAspectRatio;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.drawImage(video, 0, 0, canvasWidth, canvasHeight);
    
    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    
    if (code) {
      const now = Date.now();
      if (now - lastScanTime < 500) {
        requestAnimationFrame(scanQRCode);
        return;
      }
      setLastScanTime(now);
      
      console.log("🔍 Observer QR detected:", code.data);
      
      if (!code.data || code.data.trim() === '') {
        requestAnimationFrame(scanQRCode);
        return;
      }
      
      const qrData = validateQRData(code.data);
      if (qrData) {
        stopScanning();
        validateObserver(qrData.id, qrData.token);
      } else {
        const lastToastTime = localStorage.getItem('lastInvalidQRToast');
        if (!lastToastTime || now - parseInt(lastToastTime) > 3000) {
          toast({
            title: "QR Code Tidak Valid",
            description: "Pastikan QR Code dari sistem resmi",
            variant: "destructive",
          });
          localStorage.setItem('lastInvalidQRToast', now.toString());
        }
      }
    }
    
    if (scanningRef.current) {
      requestAnimationFrame(scanQRCode);
    }
  }, [toast, lastScanTime]);

  const validateObserver = async (employeeId: string, token: string) => {
    try {
      const response = await fetch("/api/qr/observer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, token })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to validate observer");
      }

      const result = await response.json();
      
      if (result.valid && result.observer) {
        toast({
          title: "QR Code Valid",
          description: `Observer: ${result.observer.nama}`,
        });
        onScanSuccess(result.observer);
      } else {
        throw new Error("Invalid observer data");
      }
    } catch (error: any) {
      console.error("Observer validation error:", error);
      const isExpired = error.message?.includes("Token QR Code Expired");
      toast({
        title: isExpired ? "Token QR Code Expired" : "Validasi Gagal",
        description: isExpired
          ? "Tolong segera melakukan perpanjangan kepada Pihak penyedia Token QR Code"
          : (error.message || "QR Code tidak valid atau karyawan tidak terdaftar"),
        variant: "destructive",
      });
      // Only resume scanning if not an expiry error
      if (!isExpired && !scanningRef.current) {
        startScanning();
      }
    }
  };

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Scan QR Observer</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopScanning();
            onCancel();
          }}
          className="text-white hover:bg-white/20"
          data-testid="button-close-scanner"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-lg">
          <video 
            ref={videoRef}
            className="w-full h-auto bg-gray-900 rounded-lg"
            autoPlay
            muted
            playsInline
            data-testid="scanner-video"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {isScanning && (
            <div className="absolute inset-0 border-4 border-blue-500 rounded-lg opacity-50 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-white space-y-3">
          <p className="text-lg">📱 Arahkan kamera ke QR Code karyawan</p>
          <p className="text-sm text-gray-300">QR Code akan otomatis terdeteksi</p>
        </div>

        {/* Controls */}
        <div className="mt-6 flex gap-3">
          {!isScanning ? (
            <Button 
              onClick={startScanning}
              size="lg"
              className="w-40"
              data-testid="button-start-scan"
            >
              <Camera className="w-5 h-5 mr-2" />
              Mulai Scan
            </Button>
          ) : (
            <Button 
              onClick={stopScanning}
              variant="destructive"
              size="lg"
              className="w-40"
              data-testid="button-stop-scan"
            >
              <CameraOff className="w-5 h-5 mr-2" />
              Stop Scan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
