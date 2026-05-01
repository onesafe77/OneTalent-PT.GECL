import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { validateQRData } from "@/lib/crypto-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@shared/schema";

interface SidakEmployeeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeScanned: (employee: Employee) => void;
}

export function SidakEmployeeScanner({ isOpen, onClose, onEmployeeScanned }: SidakEmployeeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const [permissionError, setPermissionError] = useState(false);

  const startCamera = async () => {
    // Check for Secure Context (HTTPS or localhost)
    if (!window.isSecureContext) {
      toast({
        variant: "destructive",
        title: "Koneksi Tidak Aman",
        description: "Browser memblokir kamera pada koneksi HTTP (WiFi). Gunakan HTTPS atau localhost.",
      });
      setPermissionError(true);
      return;
    }

    try {
      setPermissionError(false);

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser Anda tidak mendukung akses kamera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      setPermissionError(true);

      let msg = "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.";
      if (error.name === 'NotAllowedError') {
        msg = "Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.";
      } else if (error.name === 'NotFoundError') {
        msg = "Kamera tidak ditemukan pada perangkat ini.";
      }

      toast({
        variant: "destructive",
        title: "Kamera Error",
        description: msg,
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanQR = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        setIsProcessing(true);

        try {
          let employeeId: string | null = null;
          let isDriverViewUrl = false;

          // Check if this is a Driver View URL format
          // Format: https://domain.com/driver-view?nik=C-025660
          if (code.data.includes('/driver-view?nik=') || code.data.includes('?nik=')) {
            try {
              const url = new URL(code.data);
              const nik = url.searchParams.get('nik');
              if (nik) {
                employeeId = nik;
                isDriverViewUrl = true;
              }
            } catch (e) {
              // Not a valid URL, try other format
            }
          }

          // If not Driver View URL, try token-based QR format
          const parsedQrData = !isDriverViewUrl ? validateQRData(code.data) : null;
          if (!employeeId && parsedQrData && parsedQrData.id) {
            employeeId = parsedQrData.id;
          }

          if (!employeeId) {
            throw new Error("QR Code tidak valid - pastikan ini QR Code karyawan");
          }

          // Validate against backend — checks token expiry for both QR formats
          if (isDriverViewUrl) {
            const validateRes = await fetch("/api/attendance/validate-employee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ employeeId })
            });
            if (!validateRes.ok) {
              const errData = await validateRes.json().catch(() => ({ message: "QR tidak valid" }));
              throw new Error(errData.message || "QR tidak valid");
            }
          } else if (parsedQrData && parsedQrData.token) {
            const validateRes = await fetch("/api/qr/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ employeeId, token: parsedQrData.token })
            });
            if (!validateRes.ok) {
              const errData = await validateRes.json().catch(() => ({ message: "QR tidak valid" }));
              throw new Error(errData.message || "QR tidak valid");
            }
          }

          // Fetch employee data from backend
          const employee = await apiRequest(`/api/employees/${employeeId}`, "GET") as Employee;

          if (!employee) {
            throw new Error("Data karyawan tidak ditemukan");
          }

          // Call the callback with employee data
          onEmployeeScanned(employee);

          toast({
            title: "Berhasil!",
            description: `Data karyawan ${employee.name} berhasil dimuat`,
          });

          // Stop camera and close dialog
          stopCamera();
          onClose();

        } catch (error: any) {
          console.error("Error processing QR:", error);
          toast({
            variant: "destructive",
            title: "Scan Gagal",
            description: error.message || "QR Code tidak valid atau karyawan tidak ditemukan",
          });
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  // Scanning loop
  useEffect(() => {
    if (isScanning && !isProcessing) {
      const interval = setInterval(scanQR, 300);
      return () => clearInterval(interval);
    }
  }, [isScanning, isProcessing]);

  // Start camera when dialog opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Karyawan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: "400px" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Memproses...</p>
                </div>
              </div>
            )}

            <div className="absolute inset-0 border-4 border-blue-500/30 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-blue-500 rounded-lg"></div>
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Arahkan kamera ke QR Code karyawan untuk mengisi data otomatis
          </p>

          <Button
            variant="outline"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-full"
            data-testid="button-close-scanner"
          >
            <X className="mr-2 h-4 w-4" />
            Tutup Scanner
          </Button>

          {permissionError && (
            <Button
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={startCamera}
            >
              <Camera className="mr-2 h-4 w-4" />
              Izinkan Kamera / Coba Lagi
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
