import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eraser, RotateCcw, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  title?: string;
  autoSave?: boolean;
}

export function SignaturePad({ onSave, onClear, disabled = false, title = "Tanda Tangan Digital", autoSave = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Canvas settings
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    setContext(ctx);

    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !context) return;
    
    setIsDrawing(true);
    const pos = getPosition(e);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;

    // Hanya untuk mouse: preventDefault di listener touch React bersifat pasif (memicu warning).
    // Scroll/zoom saat menggambar sudah dicegah oleh CSS `touch-none` (touch-action:none) pada canvas.
    if (!('touches' in e)) e.preventDefault();
    const pos = getPosition(e);
    context.lineTo(pos.x, pos.y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
    if (autoSave) {
      const canvas = canvasRef.current;
      if (canvas) {
        // Use pixel check to confirm something was drawn
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const hasDrawing = pixels.some((v, i) => i % 4 === 3 && v > 0);
        if (hasDrawing) {
          const dataUrl = canvas.toDataURL('image/png');
          onSave(dataUrl);
        }
      }
    }
  };

  const getPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
    const scaleY = canvas.height / (rect.height * window.devicePixelRatio);

    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onClear) onClear();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Convert to data URL (base64 PNG)
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            className="w-full touch-none cursor-crosshair"
            style={{ height: '200px' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            data-testid="signature-canvas"
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Tanda tangan di sini</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={clearSignature}
            variant="outline"
            disabled={!hasSignature || disabled}
            className="flex-1 min-w-[80px] h-10"
            data-testid="button-clear-signature"
          >
            <Eraser className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Hapus</span>
          </Button>
          <Button
            onClick={clearSignature}
            variant="outline"
            disabled={!hasSignature || disabled}
            className="flex-1 min-w-[80px] h-10"
            data-testid="button-reset-signature"
          >
            <RotateCcw className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Ulangi</span>
          </Button>
          <Button
            onClick={saveSignature}
            disabled={!hasSignature || disabled}
            className="flex-1 min-w-[80px] h-10"
            data-testid="button-save-signature"
          >
            <Check className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Simpan</span>
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Gunakan jari atau stylus untuk membuat tanda tangan
        </p>
      </CardContent>
    </Card>
  );
}
