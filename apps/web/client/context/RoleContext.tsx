import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { DEMO_VENDOR_ID, useDemoMode } from "@/lib/demoMode";

export type AppRole = "owner" | "vendor";

interface RoleContextValue {
  role: AppRole;
  vendorId: string | null;
  vendorName: string | null;
  setVendorMode: (vendorId: string) => void;
  setOwnerMode: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

function loadPersistedDemoRole(): { role: AppRole; vendorId: string | null } {
  try {
    const lsRole = localStorage.getItem("bosun_role") as AppRole | null;
    let lsVendorId = localStorage.getItem("bosun_vendor_id");
    // The demo shop was renamed; move returning demo visitors to the new name.
    if (lsVendorId === "MarineMax Service Center") {
      lsVendorId = DEMO_VENDOR_ID;
      localStorage.setItem("bosun_vendor_id", lsVendorId);
    }
    if (lsRole === "vendor") return { role: "vendor", vendorId: lsVendorId || DEMO_VENDOR_ID };
  } catch {}
  return { role: "owner", vendorId: null };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { demo } = useDemoMode();
  const persisted = loadPersistedDemoRole();
  const [demoRole, setDemoRole] = useState<AppRole>(persisted.role);
  const [vendorId, setVendorId] = useState<string | null>(demo ? persisted.vendorId : null);
  const [vendorName, setVendorName] = useState<string | null>(demo ? persisted.vendorId : null);

  const role: AppRole = demo ? demoRole : profile?.role === "vendor" ? "vendor" : "owner";

  useEffect(() => {
    if (demo) {
      const next = loadPersistedDemoRole();
      setDemoRole(next.role);
      setVendorId(next.vendorId);
      setVendorName(next.vendorId);
      return;
    }
    if (!profile || profile.role !== "vendor" || supabaseMissing) {
      setVendorId(null);
      setVendorName(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("vendor_profiles")
      .select("id, business_name")
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setVendorId(data?.id ?? null);
        setVendorName(data?.business_name ?? profile.name);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, demo]);

  function setVendorMode(id: string) {
    setVendorId(id);
    setVendorName(id);
    if (demo) {
      setDemoRole("vendor");
      localStorage.setItem("bosun_role", "vendor");
      localStorage.setItem("bosun_vendor_id", id);
    }
  }

  function setOwnerMode() {
    if (demo) {
      setDemoRole("owner");
      setVendorId(null);
      setVendorName(null);
      localStorage.setItem("bosun_role", "owner");
      localStorage.removeItem("bosun_vendor_id");
      return;
    }
    setVendorId(null);
    setVendorName(null);
  }

  return (
    <RoleContext.Provider value={{ role, vendorId, vendorName, setVendorMode, setOwnerMode }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside <RoleProvider>");
  return ctx;
}
