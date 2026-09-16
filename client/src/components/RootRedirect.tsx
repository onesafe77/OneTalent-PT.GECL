import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "@/components/ui/loading-screen";

export function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  return <Redirect to={isAuthenticated ? "/workspace/dashboard" : "/login"} />;
}
