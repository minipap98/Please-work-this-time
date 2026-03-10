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
import FindCrew from "./pages/FindCrew";
import CrewProfile from "./pages/CrewProfile";
import NotFound from "./pages/NotFound";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorRFPs from "./pages/vendor/VendorRFPs";
import VendorMyBids from "./pages/vendor/VendorMyBids";
import VendorRevenue from "./pages/vendor/VendorRevenue";
import AuthPage from "./pages/AuthPage";
import { RoleProvider } from "./context/RoleContext";
import { getCurrentUser } from "./data/authUtils";

// Redirects unauthenticated users to /login
function AuthGuard() {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<AuthPage />} />

            {/* Protected — require login */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<Index />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/my-boats" element={<MyBoats />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/vendors" element={<BrowseVendors />} />
              <Route path="/vendor/:name" element={<VendorProfile />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/find-crew" element={<FindCrew />} />
              <Route path="/find-crew/:id" element={<CrewProfile />} />
              {/* Vendor-facing routes */}
              <Route path="/vendor-dashboard" element={<VendorDashboard />} />
              <Route path="/vendor-rfps" element={<VendorRFPs />} />
              <Route path="/vendor-my-bids" element={<VendorMyBids />} />
              <Route path="/vendor-revenue" element={<VendorRevenue />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
