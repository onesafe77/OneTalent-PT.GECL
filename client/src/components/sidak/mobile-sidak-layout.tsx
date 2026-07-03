import { ArrowLeft, Check, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

// Pengingat di Step 1 semua form SIDAK: sidak harus memakai akun sendiri
// (createdBy/atribusi data mengikuti akun yang login).
function AccountReminder() {
    const { user } = useAuth();
    return (
        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold mb-0.5">Gunakan akun Anda sendiri</p>
                <p>
                    {user
                        ? <>Anda login sebagai <b>{user.name}</b> ({user.nik}). Pastikan ini akun Anda — </>
                        : <>Pastikan Anda login dengan akun Anda sendiri — </>}
                    dilarang melakukan sidak menggunakan akun orang lain.
                </p>
            </div>
        </div>
    );
}

interface MobileSidakLayoutProps {
    title: string;
    subtitle?: string;
    step: number;
    totalSteps: number;
    onBack: () => void;
    children: React.ReactNode;
    bottomAction?: React.ReactNode;
    headerRight?: React.ReactNode;
}

export function MobileSidakLayout({
    title,
    subtitle,
    step,
    totalSteps,
    onBack,
    children,
    bottomAction,
    headerRight
}: MobileSidakLayoutProps) {
    const progress = (step / totalSteps) * 100;
    const { user } = useAuth();

    // Popup konfirmasi akun — muncul sekali setiap form SIDAK dibuka
    const [showAccountDialog, setShowAccountDialog] = useState(true);

    // Penanda "Terakhir disimpan" — dengar broadcast dari useSidakDraft (semua form SIDAK)
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    useEffect(() => {
        const onSaved = (e: Event) => {
            const at = (e as CustomEvent)?.detail?.at ?? null;
            setLastSaved(at);
        };
        window.addEventListener("sidak:draft-saved", onSaved as EventListener);
        return () => window.removeEventListener("sidak:draft-saved", onSaved as EventListener);
    }, []);
    const lastSavedLabel = lastSaved
        ? new Date(lastSaved).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="h-8 w-8 -ml-2 text-gray-600 dark:text-gray-300"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                        )}
                    </div>
                    {headerRight}
                    <div className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                        Step {step}/{totalSteps}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                    <Progress value={progress} className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 [&>div]:bg-red-600" />
                </div>

                {/* Penanda terakhir disimpan */}
                {lastSavedLabel && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        <span>Terakhir disimpan {lastSavedLabel} · Langkah {step}</span>
                    </div>
                )}
            </div>

            {/* Scrollable Content - extra padding for bottom action + mobile navbar */}
            <div className="flex-1 overflow-y-auto pb-44">
                <div className="p-4 space-y-6">
                    {step === 1 && <AccountReminder />}
                    {children}
                </div>
            </div>

            {/* Sticky Bottom Action - positioned above mobile navbar */}
            {bottomAction && (
                <div className="fixed bottom-20 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-lg z-20">
                    <div className="max-w-md mx-auto">
                        {bottomAction}
                    </div>
                </div>
            )}

            {/* Popup konfirmasi akun — wajib dikonfirmasi sebelum mulai mengisi sidak */}
            <AlertDialog open={showAccountDialog && step === 1}>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader>
                        <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <UserCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <AlertDialogTitle className="text-center">Gunakan Akun Anda Sendiri</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            {user
                                ? <>Anda login sebagai <b className="text-gray-900 dark:text-white">{user.name}</b> ({user.nik}). Pastikan ini akun Anda — </>
                                : <>Pastikan Anda login dengan akun Anda sendiri — </>}
                            dilarang melakukan sidak menggunakan akun orang lain.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() => setShowAccountDialog(false)}
                        >
                            Ya, ini akun saya
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
