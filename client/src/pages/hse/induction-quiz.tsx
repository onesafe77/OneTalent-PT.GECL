import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, ArrowRight, ArrowLeft, Send, Trophy, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { InductionQuestion, InductionSchedule } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function InductionQuiz() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Quiz State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [quizResult, setQuizResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);

    // Fetch pending schedule for current driver (simulated - in real app, use auth context)
    const { data: schedule, isLoading: isLoadingSchedule } = useQuery<InductionSchedule>({
        queryKey: ["/api/induction/my-schedule"],
        retry: false,
    });

    // Fetch questions
    const { data: questions, isLoading: isLoadingQuestions } = useQuery<InductionQuestion[]>({
        queryKey: ["/api/induction/questions"],
        enabled: !!schedule,
    });

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (answers: { questionId: string; selectedAnswerIndex: number }[]) => {
            return await apiRequest("/api/induction/submit-quiz", "POST", {
                scheduleId: schedule?.id,
                answers
            });
        },
        onSuccess: (data) => {
            setQuizResult(data);
            setIsSubmitted(true);
            queryClient.invalidateQueries({ queryKey: ["/api/induction/my-schedule"] });
            toast({
                title: data.passed ? "Selamat! Quiz Lulus" : "Quiz Belum Lulus",
                description: `Skor Anda: ${data.score}/${data.total}`,
                variant: data.passed ? "default" : "destructive"
            });
        },
        onError: (error: Error) => {
            toast({ title: "Gagal Submit", description: error.message, variant: "destructive" });
        }
    });

    const currentQuestion = questions?.[currentQuestionIndex];
    const totalQuestions = questions?.length || 0;
    const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

    const handleSelectAnswer = (questionId: string, answerIndex: number) => {
        if (isSubmitted) return;
        setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        if (!questions) return;

        const answers = questions.map(q => ({
            questionId: q.id,
            selectedAnswerIndex: selectedAnswers[q.id] ?? -1
        }));

        submitMutation.mutate(answers);
    };

    const allAnswered = questions?.every(q => selectedAnswers[q.id] !== undefined) ?? false;

    // No pending schedule
    if (!isLoadingSchedule && !schedule) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <CardTitle>Tidak Ada Induksi Pending</CardTitle>
                        <CardDescription>
                            Anda tidak memiliki jadwal induksi yang perlu diselesaikan saat ini.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isLoadingSchedule || isLoadingQuestions) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Result screen
    if (isSubmitted && quizResult) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        {quizResult.passed ? (
                            <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
                        ) : (
                            <AlertTriangle className="h-20 w-20 text-red-500 mx-auto mb-4" />
                        )}
                        <CardTitle className={quizResult.passed ? "text-green-600" : "text-red-600"}>
                            {quizResult.passed ? "Selamat, Anda Lulus!" : "Maaf, Anda Belum Lulus"}
                        </CardTitle>
                        <CardDescription>
                            Skor: <span className="font-bold text-2xl">{quizResult.score}/{quizResult.total}</span>
                            <br />
                            {quizResult.passed
                                ? "Anda sudah dapat melanjutkan pekerjaan."
                                : "Silakan hubungi HSE untuk jadwal ulang induksi."}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button onClick={() => window.location.href = "/workspace"}>
                            Kembali ke Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Quiz screen
    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Quiz Induksi K3</h1>
                    <p className="text-muted-foreground text-sm">Jawab semua pertanyaan dengan benar</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                    {currentQuestionIndex + 1} / {totalQuestions}
                </Badge>
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className="h-2" />

            {/* Question Card */}
            {currentQuestion && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg leading-relaxed">
                            {currentQuestion.questionText}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(currentQuestion.options as string[]).map((option, idx) => {
                            const isSelected = selectedAnswers[currentQuestion.id] === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectAnswer(currentQuestion.id, idx)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                                        "hover:border-primary/50 hover:bg-primary/5",
                                        isSelected
                                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                            : "border-gray-200 dark:border-gray-700"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                            isSelected
                                                ? "bg-primary text-white"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="flex-1">{option}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
                </Button>

                {currentQuestionIndex === totalQuestions - 1 ? (
                    <Button
                        onClick={handleSubmit}
                        disabled={!allAnswered || submitMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {submitMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Submit Quiz
                    </Button>
                ) : (
                    <Button onClick={handleNext}>
                        Selanjutnya <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Answer Status */}
            <div className="flex flex-wrap gap-2 justify-center pt-4 border-t">
                {questions?.map((q, idx) => (
                    <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={cn(
                            "w-10 h-10 rounded-full font-bold text-sm transition-all",
                            idx === currentQuestionIndex && "ring-2 ring-offset-2 ring-primary",
                            selectedAnswers[q.id] !== undefined
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                    >
                        {idx + 1}
                    </button>
                ))}
            </div>
        </div>
    );
}
