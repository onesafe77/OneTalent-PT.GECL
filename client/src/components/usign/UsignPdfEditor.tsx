import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    User,
    Trash2,
    Check,
    Maximize2,
    ZoomIn,
    ZoomOut,
    MousePointer2,
    Hand,
    Settings2,
    AlertCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface SignatureBox {
    id: string;
    pageNumber: number;
    posX: number;
    posY: number;
    width: number;
    height: number;
    approverId: string;
    actionType: 'signature' | 'initial' | 'stamp';
    approverName?: string;
    signatureImageUrl?: string;
}

interface UsignPdfEditorProps {
    fileUrl: string;
    onSave: (boxes: SignatureBox[]) => void;
    approvers: { id: string, name: string }[];
    isReadOnly?: boolean;
    initialBoxes?: SignatureBox[];
}

export function UsignPdfEditor({ fileUrl, onSave, approvers, isReadOnly = false, initialBoxes = [] }: UsignPdfEditorProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [boxes, setBoxes] = useState<SignatureBox[]>([]);
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pdfDocRef = useRef<any>(null);
    const lastSyncedUrl = useRef<string | null>(null);

    // Sync boxes with initialBoxes - ONLY when document URL changes or on first load
    useEffect(() => {
        if (initialBoxes.length > 0 && lastSyncedUrl.current !== fileUrl) {
            setBoxes(initialBoxes);
            lastSyncedUrl.current = fileUrl;
        } else if (fileUrl && lastSyncedUrl.current !== fileUrl) {
            // Reset boxes if we switch to a new empty document
            setBoxes([]);
            lastSyncedUrl.current = fileUrl;
        }
    }, [initialBoxes, fileUrl]);

    // Initialize PDF.js
    useEffect(() => {
        const loadPdf = async () => {
            setIsLoading(true);
            try {
                const pdfjsLib = await import('pdfjs-dist');
                const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
                pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;

                const loadingTask = pdfjsLib.getDocument(fileUrl);
                const pdf = await loadingTask.promise;
                pdfDocRef.current = pdf;
                setNumPages(pdf.numPages);
                renderPage(1, scale);
            } catch (error) {
                console.error("Error loading PDF:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPdf();
    }, [fileUrl]);

    const renderPage = async (pageNum: number, newScale: number) => {
        if (!pdfDocRef.current || !canvasRef.current) return;

        const page = await pdfDocRef.current.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 }); // Use scale 1.0 for base dimensions
        setPageDimensions({ width: viewport.width, height: viewport.height });

        const scaledViewport = page.getViewport({ scale: newScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
    };

    const handlePageChange = (delta: number) => {
        const newPage = Math.max(1, Math.min(numPages, currentPage + delta));
        if (newPage !== currentPage) {
            setCurrentPage(newPage);
            renderPage(newPage, scale);
        }
    };

    const handleZoom = (delta: number) => {
        const newScale = Math.max(0.5, Math.min(3.0, scale + delta));
        setScale(newScale);
        renderPage(currentPage, newScale);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (isReadOnly) return;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);

        // Coordinate conversion: Viewport to PDF points
        // PDF points are fixed regardless of scale
        const pdfX = x / scale;
        const pdfY = y / scale;

        const newBox: SignatureBox = {
            id: `box-${Date.now()}`,
            pageNumber: currentPage,
            posX: pdfX - 50, // Center the box
            posY: pdfY - 25,
            width: 100,
            height: 50,
            approverId: approvers[0]?.id || '',
            approverName: approvers[0]?.name || 'Unknown',
            actionType: 'signature'
        };

        setBoxes([...boxes, newBox]);
        setSelectedBoxId(newBox.id);
    };

    const deleteBox = (id: string) => {
        setBoxes(boxes.filter(b => b.id !== id));
        if (selectedBoxId === id) setSelectedBoxId(null);
    };

    const updateBox = (id: string, updates: Partial<SignatureBox>) => {
        setBoxes(prev => prev.map(b => {
            if (b.id !== id) return b;

            const updated = { ...b, ...updates };

            // Safe Clamping using pageDimensions if available
            if (pageDimensions) {
                const maxX = pageDimensions.width - updated.width;
                const maxY = pageDimensions.height - updated.height;

                return {
                    ...updated,
                    posX: Math.max(0, Math.min(maxX, updated.posX)),
                    posY: Math.max(0, Math.min(maxY, updated.posY))
                };
            }

            // Fallback clamping if pageDimensions not yet loaded
            const maxX = (canvasRef.current?.width || 0) / scale - updated.width;
            const maxY = (canvasRef.current?.height || 0) / scale - updated.height;

            return {
                ...updated,
                posX: Math.max(0, Math.min(maxX, updated.posX)),
                posY: Math.max(0, Math.min(maxY, updated.posY))
            };
        }));
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="bg-slate-800/80 backdrop-blur-md p-4 border-b border-slate-700 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                        <Button variant="ghost" size="icon" onClick={() => handlePageChange(-1)} disabled={currentPage === 1}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="px-4 text-sm font-medium text-slate-300 min-w-[80px] text-center">
                            Hal {currentPage} / {numPages}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handlePageChange(1)} disabled={currentPage === numPages}>
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex items-center bg-slate-900/50 rounded-lg p-1 border border-slate-700 ml-2">
                        <Button variant="ghost" size="icon" onClick={() => handleZoom(-0.1)}>
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="px-4 text-xs font-mono text-slate-400 min-w-[60px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleZoom(0.1)}>
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isReadOnly && (
                        <div className="flex items-center gap-2 mr-4 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-amber-500 font-medium">Klik pada dokumen untuk menempatkan TTD</span>
                        </div>
                    )}
                    <Button
                        onClick={() => onSave(boxes)}
                        className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 px-6"
                    >
                        <Check className="w-4 h-4 mr-2" /> Simpan Konfigurasi
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* PDF Canvas Area */}
                <div className="flex-1 overflow-auto bg-slate-950/50 p-12 flex justify-center custom-scrollbar relative">
                    <div
                        ref={containerRef}
                        className="relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white cursor-crosshair group h-fit"
                        onClick={handleCanvasClick}
                        style={{
                            width: canvasRef.current?.width || 'auto',
                            height: canvasRef.current?.height || 'auto'
                        }}
                    >
                        <canvas ref={canvasRef} />

                        {/* Signature Overlays */}
                        <AnimatePresence>
                            {boxes.filter(b => b.pageNumber === currentPage).map((box) => (
                                <motion.div
                                    key={box.id}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    drag={!isReadOnly}
                                    dragMomentum={false}
                                    dragElastic={0}
                                    onDragEnd={(_, info) => {
                                        // info.offset is total distance from start of drag
                                        const deltaX = info.offset.x / scale;
                                        const deltaY = info.offset.y / scale;

                                        updateBox(box.id, {
                                            posX: box.posX + deltaX,
                                            posY: box.posY + deltaY
                                        });
                                    }}
                                    className={`absolute border-2 rounded-lg cursor-move transition-shadow ${selectedBoxId === box.id
                                        ? 'border-primary ring-4 ring-primary/20 z-30 shadow-2xl'
                                        : 'border-blue-500/50 bg-blue-500/5 z-20 hover:border-blue-500 hover:bg-blue-500/10'
                                        }`}
                                    style={{
                                        left: box.posX * scale,
                                        top: box.posY * scale,
                                        width: box.width * scale,
                                        height: box.height * scale,
                                        touchAction: 'none' // Essential for drag on touch devices
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setSelectedBoxId(box.id);
                                    }}
                                >
                                    <div className="absolute -top-10 left-0 right-0 flex justify-between items-center bg-slate-900 text-white text-[10px] px-2 py-1 rounded-t-lg shadow-lg border-x border-t border-slate-700">
                                        <span className="truncate max-w-[80px] font-bold uppercase">
                                            {box.actionType === 'stamp' ? 'Stempel' : box.actionType === 'initial' ? 'Paraf' : 'TTD'}
                                        </span>
                                        <button onClick={() => deleteBox(box.id)} className="hover:text-rose-500">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="w-full h-full flex flex-col items-center justify-center p-0.5 text-center bg-white/50 backdrop-blur-sm overflow-hidden">
                                        {box.signatureImageUrl ? (
                                            <img
                                                src={box.signatureImageUrl}
                                                alt="Signature"
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <>
                                                <User className="w-3 h-3 text-blue-600 mb-0.5" />
                                                <span className="text-[8px] font-bold text-blue-900 leading-tight truncate w-full px-1">
                                                    {approvers.find(a => a.id === box.approverId)?.name || box.approverName || 'Pilih Approver'}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Resize Handle */}
                                    {!isReadOnly && selectedBoxId === box.id && (
                                        <div
                                            className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg cursor-nwse-resize z-40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const startX = e.clientX;
                                                const startY = e.clientY;
                                                const startWidth = box.width;
                                                const startHeight = box.height;

                                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                                    const deltaX = (moveEvent.clientX - startX) / scale;
                                                    const deltaY = (moveEvent.clientY - startY) / scale;
                                                    updateBox(box.id, {
                                                        width: Math.max(40, startWidth + deltaX),
                                                        height: Math.max(20, startHeight + deltaY)
                                                    });
                                                };

                                                const handleMouseUp = () => {
                                                    document.removeEventListener('mousemove', handleMouseMove);
                                                    document.removeEventListener('mouseup', handleMouseUp);
                                                };

                                                document.addEventListener('mousemove', handleMouseMove);
                                                document.addEventListener('mouseup', handleMouseUp);
                                            }}
                                        >
                                            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar Settings (Conditional) */}
                <AnimatePresence>
                    {selectedBoxId && (
                        <motion.aside
                            initial={{ x: 300 }}
                            animate={{ x: 0 }}
                            exit={{ x: 300 }}
                            className="w-80 bg-slate-800 border-l border-slate-700 p-6 z-20 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4" /> Pengaturan Box
                                </h3>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedBoxId(null)}>
                                    <Plus className="w-4 h-4 rotate-45" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Approver</label>
                                    <Select
                                        value={boxes.find(b => b.id === selectedBoxId)?.approverId}
                                        onValueChange={(val) => updateBox(selectedBoxId, { approverId: val })}
                                    >
                                        <SelectTrigger className="bg-slate-900 border-slate-700">
                                            <SelectValue placeholder="Pilih Approver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {approvers.map(a => (
                                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipe Aksi</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['signature', 'initial', 'stamp'].map((type) => (
                                            <Button
                                                key={type}
                                                variant={boxes.find(b => b.id === selectedBoxId)?.actionType === type ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => updateBox(selectedBoxId!, { actionType: type as any })}
                                                className="text-[10px] h-8 capitalize"
                                            >
                                                {type === 'stamp' ? 'Stempel' : type === 'initial' ? 'Paraf' : 'Tanda Tangan'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 mt-4">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-2 font-mono">
                                        <span>X: {Math.round(boxes.find(b => b.id === selectedBoxId)?.posX || 0)}pt</span>
                                        <span>Y: {Math.round(boxes.find(b => b.id === selectedBoxId)?.posY || 0)}pt</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">
                                        Koordinat ini akan dikonversi ke satuan PDF (points) untuk penempatan tanda tangan yang akurat.
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="destructive"
                                className="w-full mt-auto"
                                onClick={() => deleteBox(selectedBoxId)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus Box
                            </Button>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm font-medium animate-pulse">Menyiapkan Dokumen...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
