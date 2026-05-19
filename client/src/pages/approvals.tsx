import { useEffect } from "react";
import { useLocation } from "wouter";

// Wrapper page: Approval pindah ke top-level sidebar.
// Untuk reuse fungsi approval lama, redirect ke document-control dengan tab=inbox.
// Halaman ini hanya berfungsi sebagai entry point — fungsionalitas approval
// tetap di document-control.tsx untuk menjaga compatibility & reuse logic.
export default function ApprovalsPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/workspace/hse/k3/document-control?tab=inbox");
  }, [setLocation]);
  return (
    <div className="p-8 text-center text-gray-400 text-sm">Mengarahkan ke Approval Inbox…</div>
  );
}
