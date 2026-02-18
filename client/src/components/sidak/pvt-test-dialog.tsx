import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Play, RotateCcw, CheckCircle, AlertTriangle, XCircle, Timer } from "lucide-react";

interface PVTTestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: (data: { passed: boolean; meanRT: number; status: 'green' | 'yellow' | 'red' }) => void;
}

type TestState = "idle" | "waiting" | "ready" | "early" | "result" | "score";

export function PVTTestDialog({ open, onOpenChange, onComplete }: PVTTestDialogProps) {
    const [gameState, setGameState] = useState<TestState>("idle");
    const [attempts, setAttempts] = useState<number[]>([]);
    const [currentRound, setCurrentRound] = useState(1);
    const [reactionTime, setReactionTime] = useState<number | null>(null);
    const [meanRT, setMeanRT] = useState(0);

    const startTimeRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Constants
    const TOTAL_ROUNDS = 3;
    const MIN_DELAY = 2000;
    const MAX_DELAY = 5000;

    useEffect(() => {
        if (!open) {
            resetGame();
        }
    }, [open]);

    const resetGame = () => {
        setGameState("idle");
        setAttempts([]);
        setCurrentRound(1);
        setReactionTime(null);
        setMeanRT(0);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const startRound = () => {
        setGameState("waiting");
        setReactionTime(null);

        // Random delay between 2-5 seconds
        const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

        timeoutRef.current = setTimeout(() => {
            setGameState("ready");
            startTimeRef.current = performance.now();
        }, delay);
    };

    const handleInteraction = () => {
        if (gameState === "waiting") {
            // False start (early click)
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setGameState("early");
            return;
        }

        if (gameState === "ready") {
            // Valid reaction
            const endTime = performance.now();
            const rt = Math.round(endTime - startTimeRef.current);
            setReactionTime(rt);
            setAttempts(prev => [...prev, rt]);
            setGameState("result");
        }
    };

    const nextRound = () => {
        if (currentRound < TOTAL_ROUNDS) {
            setCurrentRound(prev => prev + 1);
            startRound();
        } else {
            finishGame();
        }
    };

    const retryRound = () => {
        startRound();
    };

    const finishGame = () => {
        // Calculate final results
        // Use the attempts array directly if state update is pending, or rely on effect if designed differently.
        // Here we use the attempts array from state + the last one we just pushed? 
        // Actually setGameState("result") happens after setAttempts. 
        // But nextRound logic needs to be careful.
        // Let's calculate from attempts state assuming it's updated.

        // Wait for the last attempt to be in state? 
        // Easier: calculate manually here
        const allAttempts = attempts;
        const sum = allAttempts.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / TOTAL_ROUNDS);
        setMeanRT(avg);
        setGameState("score");
    };

    const handleFinalAction = () => {
        let status: 'green' | 'yellow' | 'red' = 'green';
        let passed = true;

        if (meanRT <= 350) {
            status = 'green';
            passed = true;
        } else if (meanRT <= 500) {
            status = 'yellow';
            passed = true; // Still passed but with warning
        } else {
            status = 'red';
            passed = false;
        }

        onComplete({ passed, meanRT, status });
        onOpenChange(false);
    };

    const getStatusColor = () => {
        if (meanRT <= 350) return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
        if (meanRT <= 500) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    };

    const getStatusText = () => {
        if (meanRT <= 350) return { title: "Respon Sangat Baik", desc: "Anda dalam kondisi prima dan siap bekerja." };
        if (meanRT <= 500) return { title: "Respon Cukup", desc: "Terdeteksi sedikit kelelahan. Harap berhati-hati." };
        return { title: "Respon Lambat", desc: "Kelelahan tingkat tinggi terdeteksi. Sebaiknya istirahat." };
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-full h-[80vh] sm:h-auto flex flex-col p-0 gap-0 overflow-hidden border-0 sm:border rounded-none sm:rounded-lg">

                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Tes Reaksi (PVT)</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Ronde {Math.min(currentRound, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
                    </div>
                </div>

                {/* Game Area */}
                <div
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 cursor-pointer select-none",
                        gameState === "idle" && "bg-background",
                        gameState === "waiting" && "bg-gray-100 dark:bg-gray-900",
                        gameState === "ready" && "bg-green-500 hover:bg-green-600 active:bg-green-700",
                        gameState === "early" && "bg-red-100 dark:bg-red-900/20",
                        gameState === "result" && "bg-background",
                        gameState === "score" && "bg-background"
                    )}
                    onMouseDown={gameState === "waiting" || gameState === "ready" ? handleInteraction : undefined}
                    onTouchStart={gameState === "waiting" || gameState === "ready" ? handleInteraction : undefined}
                >

                    {gameState === "idle" && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto text-blue-600">
                                <Play className="w-10 h-10 ml-1" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Siap Mulai?</h2>
                                <p className="text-muted-foreground">
                                    Ketuk layar secepatnya saat berubah menjadi warna <span className="text-green-600 font-bold">HIJAU</span>.
                                </p>
                            </div>
                            <Button onClick={startRound} size="lg" className="w-full text-lg h-12">
                                Mulai Tes
                            </Button>
                        </div>
                    )}

                    {gameState === "waiting" && (
                        <div className="animate-pulse">
                            <h2 className="text-xl font-medium text-gray-500">Tunggu...</h2>
                        </div>
                    )}

                    {gameState === "ready" && (
                        <div className="text-white animate-in zoom-in duration-75">
                            <h1 className="text-4xl font-extrabold uppercase tracking-widest">KETUK SEKARANG!</h1>
                        </div>
                    )}

                    {gameState === "early" && (
                        <div className="space-y-4 animate-in shake">
                            <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-red-600">Terlalu Cepat!</h2>
                                <p className="text-muted-foreground">Tunggu sampai layar hijau baru ketuk.</p>
                            </div>
                            <Button onClick={retryRound} variant="outline" className="mt-4">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Ulangi
                            </Button>
                        </div>
                    )}

                    {gameState === "result" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-center">
                                <p className="text-muted-foreground uppercase text-xs font-bold tracking-wider mb-1">Waktu Reaksi</p>
                                <div className="text-5xl font-black tabular-nums text-slate-800 dark:text-slate-100">
                                    {reactionTime} <span className="text-lg font-medium text-muted-foreground">ms</span>
                                </div>
                            </div>

                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full transition-all duration-500",
                                        (reactionTime || 0) <= 350 ? "bg-green-500" : (reactionTime || 0) <= 500 ? "bg-yellow-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${Math.min(100, (1000 - (reactionTime || 0)) / 10)}%` }}
                                />
                            </div>

                            <Button onClick={nextRound} className="w-full" size="lg">
                                {currentRound < TOTAL_ROUNDS ? "Lanjut Ronde Berikutnya" : "Lihat Hasil Akhir"}
                            </Button>
                        </div>
                    )}

                    {gameState === "score" && (
                        <div className="space-y-6 w-full max-w-xs animate-in fade-in zoom-in duration-300">
                            <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4", getStatusColor())}>
                                {meanRT <= 500 ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                            </div>

                            <div className="text-center space-y-2">
                                <h2 className={cn("text-2xl font-bold", meanRT <= 350 ? "text-green-600" : meanRT <= 500 ? "text-yellow-600" : "text-red-600")}>
                                    {getStatusText().title}
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    {getStatusText().desc}
                                </p>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                                <span className="text-sm font-medium">Rata-rata Reaksi</span>
                                <span className="text-xl font-bold">{meanRT} ms</span>
                            </div>

                            <Button
                                onClick={handleFinalAction}
                                className={cn("w-full h-12 text-lg", meanRT > 500 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")}
                            >
                                Selesai & Simpan
                            </Button>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}
