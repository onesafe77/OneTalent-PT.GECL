import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
            </div>

            {/* Scrollable Content - extra padding for bottom action + mobile navbar */}
            <div className="flex-1 overflow-y-auto pb-44">
                <div className="p-4 space-y-6">
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
        </div>
    );
}
