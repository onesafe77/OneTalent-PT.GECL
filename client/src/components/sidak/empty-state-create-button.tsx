import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateCreateButtonProps {
    /** Tujuan navigasi, mis. "/workspace/sidak/charging-station/new" */
    href: string;
    /** Teks tombol, mis. "Buat Sidak Baru" */
    label: string;
    /** Ikon lucide opsional di kiri label */
    icon?: ComponentType<{ className?: string }>;
    className?: string;
    variant?: React.ComponentProps<typeof Button>["variant"];
    size?: React.ComponentProps<typeof Button>["size"];
    testId?: string;
    /** Jeda "arm" setelah mount (ms). Lapis kedua bila pointer guard tak relevan. */
    armDelayMs?: number;
}

/**
 * Tombol "Buat Sidak Baru" untuk empty-state halaman riwayat SIDAK.
 *
 * Memperbaiki bug: klik item di halaman Riwayat menavigasi SINKRON ke halaman
 * history. Bila history kosong, tombol ini ter-render persis di titik yang baru
 * di-tap, lalu "ghost click" (compatibility mouse click yang dibangkitkan browser
 * dari gesture touch / device-emulation) jatuh ke tombol ini → langsung membuka
 * form /new.
 *
 * Pertahanan utama (timing-independent): klik hanya diteruskan bila DIDAHULUI
 * `pointerdown` pada tombol ini. Ghost click pasca-navigasi datang sebagai
 * compatibility mouse `click` TANPA pointerdown di elemen baru, jadi ditolak.
 * Klik keyboard (Enter/Space, `detail === 0`) tetap diizinkan untuk aksesibilitas.
 * Pertahanan kedua: abaikan klik dalam ~`armDelayMs` pertama setelah mount.
 */
export function EmptyStateCreateButton({
    href,
    label,
    icon: Icon,
    className,
    variant,
    size,
    testId = "button-create-new",
    armDelayMs = 400,
}: EmptyStateCreateButtonProps) {
    const armedRef = useRef(false);
    const sawPointerDownRef = useRef(false);

    useEffect(() => {
        armedRef.current = false;
        sawPointerDownRef.current = false;
        const t = setTimeout(() => {
            armedRef.current = true;
        }, armDelayMs);
        return () => clearTimeout(t);
    }, [armDelayMs]);

    return (
        <Link
            href={href}
            onClick={(e: React.MouseEvent) => {
                const isKeyboard = e.detail === 0; // Enter/Space pada tombol fokus
                const genuinePointer = sawPointerDownRef.current;
                sawPointerDownRef.current = false;
                // wouter hanya menavigasi bila event tidak di-preventDefault.
                if (!isKeyboard && (!genuinePointer || !armedRef.current)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
        >
            <Button
                variant={variant}
                size={size}
                className={cn(className)}
                data-testid={testId}
                onPointerDown={() => {
                    sawPointerDownRef.current = true;
                }}
            >
                {Icon && <Icon className="h-4 w-4 mr-2" />}
                {label}
            </Button>
        </Link>
    );
}
