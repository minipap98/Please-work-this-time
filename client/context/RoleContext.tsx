import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";

export type AppRole = "owner" | "vendor";

interface RoleContextValue {
  role: AppRole;
  vendorId: string | null;
  vendorName: string | null;
  setVendorMode: (vendorId: string) => void;
  setOwnerMode: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const role: AppRole = profile?.role === "vendor" ? "vendor" : "owner";
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);

  useEffect(() => {
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
  }, [profile]);

  function setVendorMode(id: string) {
    setVendorId(id);
  }

  function setOwnerMode() {
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
