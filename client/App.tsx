import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
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
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RoleProvider } from "./context/RoleContext";

// Demo mode: bypass auth for sharing/demo purposes
const DEMO_MODE = true;

// Redirects unauthenticated users to /login; incomplete onboarding to /onboarding
function AuthGuard() {
  const { user, profile, loading } = useAuth();
  if (DEMO_MODE) return <Outlet />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

// Requires login but NOT completed onboarding (for the onboarding page itself)
function OnboardingGuard() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboarding_complete) {
    return profile.role === "vendor"
      ? <Navigate to="/vendor-dashboard" replace />
      : <Navigate to="/" replace />;
  }
  return <Outlet />;
}

// Redirect authenticated users away from login (unless in demo mode)
function PublicOnlyGuard() {
  const { user, profile, loading } = useAuth();
  if (DEMO_MODE) return <Outlet />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" /></div>;
  if (user && profile?.onboarding_complete) {
    return profile.role === "vendor"
      ? <Navigate to="/vendor-dashboard" replace />
      : <Navigate to="/" replace />;
  }
  return <Outlet />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
            <Routes>
              {/* Public — redirect if already logged in */}
              <Route element={<PublicOnlyGuard />}>
                <Route path="/login" element={<AuthPage />} />
              </Route>

              {/* Onboarding — requires login, blocks if already completed */}
              <Route element={<OnboardingGuard />}>
                <Route path="/onboarding" element={<Onboarding />} />
              </Route>

              {/* Protected — require login + completed onboarding */}
              <Route element={<AuthGuard />}>
                <Route path="/" element={<Index />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/my-boats" element={<MyBoats />} />
                <Route path="/project/:id" element={<ProjectDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/vendors" element={<BrowseVendors />} />
                <Route path="/vendor/:name" element={<VendorProfile />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/warranty" element={<Navigate to="/maintenance" replace />} />
                {/* Find Crew sidelined — feature exists in another app */}
                {/* Vendor-facing routes */}
                <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                <Route path="/vendor-rfps" element={<VendorRFPs />} />
                <Route path="/vendor-my-bids" element={<VendorMyBids />} />
                <Route path="/vendor-revenue" element={<VendorRevenue />} />
                <Route path="/vendor-business" element={<VendorBusinessHub />} />
              </Route>

              {/* SEO landing page — public, no auth */}
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />

              {/* Admin portal — has its own password gate, outside AuthGuard */}
              <Route path="/admin" element={<AdminPortal />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
