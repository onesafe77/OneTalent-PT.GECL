import { useEffect, useState } from "react";

interface ParticleBackgroundProps {
    variant?: 'landing' | 'login';
    className?: string;
}

export function ParticleBackground({ variant = 'landing', className = '' }: ParticleBackgroundProps) {
    return (
        <div className={`fixed inset-0 z-0 w-full h-full pointer-events-none overflow-hidden bg-slate-50 ${className}`}>
            {/* Soft Gradient Blob 1 */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] animate-pulse" />

            {/* Soft Gradient Blob 2 */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-[100px] animate-pulse delay-700" />

            {/* Center Slight Glow */}
            <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[80%] h-[80%] rounded-full bg-white/40 blur-[80px]" />

            {/* Variant Specifics */}
            {variant === 'login' && (
                <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] rounded-full bg-red-400/10 blur-[80px] animate-bounce duration-[10000ms]" />
            )}
        </div>
    );
}
