import { useEffect } from "react";
import { useLocation } from "wouter";

// Wrapper page: Register Eksternal pindah ke top-level sidebar.
// Redirect ke document-control dengan tab=external.
export default function ExternalRegisterPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/workspace/hse/k3/document-control?tab=external");
  }, [setLocation]);
  return (
    <div className="p-8 text-center text-gray-400 text-sm">Mengarahkan ke Register Eksternal…</div>
  );
}
