import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Permission } from "@shared/rbac";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions,
  requireAll = false,
  fallbackPath = "/workspace"
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, hasAllPermissions, user } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Akun subcon hanya boleh mengakses modul MCU
  if (user?.accountType === "subcon" && location !== "/workspace/hse/mcu") {
    return <Redirect to="/workspace/hse/mcu" />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    
    if (!hasAccess) {
      return <Redirect to={fallbackPath} />;
    }
  }

  return <>{children}</>;
}
