import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { postLoginPath } from "@shared/api";
import { supabaseMissing } from "@/lib/supabase";
import Index from "./pages/Index";
import Inbox from "./pages/Inbox";
import MyBoats from "./pages/MyBoats";
import ProjectDetail from "./pages/ProjectDetail";
import Settings from "./pages/Settings";
import BrowseVendors from "./pages/BrowseVendors";
import VendorProfile from "./pages/VendorProfile";
import MaintenancePage from "./pages/MaintenancePage";
// WarrantyTracker consolidated into MaintenancePage
// Find Crew sidelined — feature exists in another app
// import FindCrew from "./pages/FindCrew";
// import CrewProfile from "./pages/CrewProfile";
import NotFound from "./pages/NotFound";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorRFPs from "./pages/vendor/VendorRFPs";
import VendorMyBids from "./pages/vendor/VendorMyBids";
import VendorRevenue from "./pages/vendor/VendorRevenue";
import VendorBusinessHub from "./pages/vendor/VendorBusinessHub";
import AuthPage from "./pages/AuthPage";
import Onboarding from "./pages/Onboarding";
import AdminPortal from "./pages/AdminPortal";
import LandingPage from "./pages/LandingPage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RoleProvider } from "./context/RoleContext";
import ErrorBoundary from "./components/ErrorBoundary";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  );
}

function ConfigScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">Bosun isn’t configured</h1>
        <p className="text-sm text-muted-foreground">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to
          your environment, then restart the app.
        </p>
      </div>
    </div>
  );
}

function AuthGuard() {
  const { user, profile, loading } = useAuth();
  if (supabaseMissing) return <ConfigScreen />;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

function OwnerGuard() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (profile?.role === "vendor") return <Navigate to="/vendor-dashboard" replace />;
  return <Outlet />;
}

function VendorGuard() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (profile?.role === "owner") return <Navigate to="/app" replace />;
  return <Outlet />;
}

// Requires login but NOT completed onboarding (for the onboarding page itself)
function OnboardingGuard() {
  const { user, profile, loading } = useAuth();
  if (supabaseMissing) return <ConfigScreen />;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboarding_complete) {
    return <Navigate to={postLoginPath(profile.role, true)} replace />;
  }
  return <Outlet />;
}

function PublicOnlyGuard() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && profile?.onboarding_complete) {
    return <Navigate to={postLoginPath(profile.role, true)} replace />;
  }
  return <Outlet />;
}

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <RoleProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/welcome" element={<Navigate to="/" replace />} />
                <Route path="/landing" element={<Navigate to="/" replace />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />

                <Route element={<PublicOnlyGuard />}>
                  <Route path="/login" element={<AuthPage />} />
                </Route>

                <Route element={<OnboardingGuard />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                </Route>

                <Route element={<AuthGuard />}>
                  <Route element={<OwnerGuard />}>
                    <Route path="/app" element={<Index />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="/my-boats" element={<MyBoats />} />
                    <Route path="/maintenance" element={<MaintenancePage />} />
                  </Route>
                  <Route path="/project/:id" element={<ProjectDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/vendors" element={<BrowseVendors />} />
                  <Route path="/vendor/:name" element={<VendorProfile />} />
                  <Route path="/warranty" element={<Navigate to="/maintenance" replace />} />
                  <Route element={<VendorGuard />}>
                    <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                    <Route path="/vendor-rfps" element={<VendorRFPs />} />
                    <Route path="/vendor-my-bids" element={<VendorMyBids />} />
                    <Route path="/vendor-revenue" element={<VendorRevenue />} />
                    <Route path="/vendor-business" element={<VendorBusinessHub />} />
                  </Route>
                </Route>

                <Route path="/admin" element={<AdminPortal />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </RoleProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

createRoot(document.getElementById("root")!).render(<App />);
