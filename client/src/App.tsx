import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { Suspense, lazy } from "react";
import { Route, Switch, useLocation } from "wouter";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Lazy load components for better performance
const Workspace = lazy(() => import("@/components/workspace").then(module => ({ default: module.Workspace })));
const MobileDriverView = lazy(() => import("@/pages/mobile-driver-view"));
const DriverView = lazy(() => import("@/pages/driver-view"));
const LoginPage = lazy(() => import("@/pages/login"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));

const LandingPage = lazy(() => import("@/pages/landing-page"));
const MonitoringSimperEvPublic = lazy(() => import("@/pages/monitoring-simper-ev-public"));

/**
 * Router component dengan landing page dan workspace
 */
function Router() {
  const [currentPath] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);

  // Prioritaskan workspace routes - selalu render Workspace untuk path yang dimulai dengan /workspace
  // Wrap dengan ProtectedRoute untuk authentication
  if (currentPath.startsWith('/workspace')) {
    return (
      <ProtectedRoute>
        <Suspense fallback={<LoadingScreen isLoading={true} />}>
          <Workspace key={currentPath + window.location.search} />
        </Suspense>
      </ProtectedRoute>
    );
  }

  return (
    <Switch>
      {/* Landing Page Route - Public Root */}
      <Route path="/">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <LandingPage />
          </Suspense>
        )}
      </Route>

      {/* Login Route - Public */}
      <Route path="/login">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <LoginPage />
          </Suspense>
        )}
      </Route>

      {/* Monitoring Simper EV - Public */}
      <Route path="/monitoring-simper-ev">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <MonitoringSimperEvPublic />
          </Suspense>
        )}
      </Route>

      {/* Reset Password Route - Must be outside workspace but still protected */}
      <Route path="/reset-password">
        {() => (
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen isLoading={true} />}>
              <ResetPasswordPage />
            </Suspense>
          </ProtectedRoute>
        )}
      </Route>
      {/* Compact QR Route Handler */}
      <Route path="/q/:token">
        {(params) => {
          // This route will be handled by server-side redirect
          // But we add this for fallback if needed
          window.location.reload();
          return <div>Processing QR code...</div>;
        }}
      </Route>

      {/* Mobile Driver dan Driver View - render langsung tanpa guard */}
      <Route path="/mobile-driver">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <MobileDriverView />
          </Suspense>
        )}
      </Route>
      <Route path="/mobile-driver/">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <MobileDriverView />
          </Suspense>
        )}
      </Route>
      <Route path="/driver-view">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <DriverView />
          </Suspense>
        )}
      </Route>
      <Route path="/driver-view/">
        {() => (
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <DriverView />
          </Suspense>
        )}
      </Route>

      {/* Meeting Scanner Route */}
      <Route path="/meeting-scanner">
        {() => {
          const token = urlParams.get('token');
          if (token) {
            window.location.href = `/workspace/meeting-scanner?token=${token}`;
          } else {
            window.location.href = `/workspace/meeting-scanner`;
          }
          return <div>Redirecting to meeting scanner...</div>;
        }}
      </Route>

      {/* QR Redirect */}
      <Route path="/qr-redirect">
        {() => {
          const qrData = urlParams.get('data') || urlParams.get('qr');
          if (qrData) {
            try {
              const parsedData = JSON.parse(decodeURIComponent(qrData));

              // Handle meeting QR codes
              if (parsedData.type === "meeting" && parsedData.token) {
                window.location.href = `/workspace/meeting-scanner?token=${parsedData.token}`;
                return <div>Redirecting to meeting scanner...</div>;
              }

              // Handle employee attendance QR codes
              if (parsedData.id) {
                window.location.href = `/mobile-driver?nik=${parsedData.id}`;
                return <div>Redirecting to attendance...</div>;
              }
            } catch (error) {
              console.error('Invalid QR data:', error);
            }
          }
          return <div>Invalid QR code data</div>;
        }}
      </Route>



      {/* Catch-all redirect untuk direct access ke workspace pages */}
      <Route path="/:rest*">
        {(params) => {
          const currentPath = params['rest*'] ? `/${params['rest*']}` : '/';

          // Jangan redirect halaman publik (driver-view, mobile-driver)
          if (currentPath === '/driver-view' || currentPath === '/mobile-driver') {
            return <div>Page not found</div>;
          }

          // Redirect ke workspace dengan path yang sama
          if (currentPath !== '/') {
            window.location.replace(`/workspace${currentPath}${window.location.search}`);
            return <div>Redirecting to workspace...</div>;
          }
          return <div>Page not found</div>;
        }}
      </Route>
    </Switch>
  );
}

/**
 * Aplikasi AttendanceQR - Aplikasi Publik Tanpa Authentication:
 * - Workspace utama berisi semua fitur aplikasi
 * - Mobile driver view untuk QR scan
 * - Driver view untuk tampilan desktop
 */
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ... existing imports

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="attendance-theme">
        <ErrorBoundary>
          <AuthProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;