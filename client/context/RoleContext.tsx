import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type AppRole = "owner" | "vendor";

interface RoleContextValue {
  role: AppRole;
  vendorId: string | null;
  setVendorMode: (vendorId: string) => void;
  setOwnerMode: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

function loadPersistedRole(): { role: AppRole; vendorId: string | null } {
  try {
    const lsRole = localStorage.getItem("bosun_role") as AppRole | null;
    const lsVendorId = localStorage.getItem("bosun_vendor_id");
    if (lsRole === "vendor" && lsVendorId) return { role: "vendor", vendorId: lsVendorId };
  } catch {}
  return { role: "owner", vendorId: null };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const persisted = loadPersistedRole();
  const [role, setRole] = useState<AppRole>(persisted.role);
  const [vendorId, setVendorId] = useState<string | null>(persisted.vendorId);

  // Sync role when profile loads
  useEffect(() => {
    if (!profile) return;
    const lsRole = localStorage.getItem("bosun_role") as AppRole | null;
    if (!lsRole) {
      // No persisted override — use profile role
      setRole(profile.role);
      if (profile.role === "vendor") {
        localStorage.setItem("bosun_role", "vendor");
      }
    }
  }, [profile]);

  function setVendorMode(id: string) {
    setRole("vendor");
    setVendorId(id);
    localStorage.setItem("bosun_role", "vendor");
    localStorage.setItem("bosun_vendor_id", id);
  }

  function setOwnerMode() {
    setRole("owner");
    setVendorId(null);
    localStorage.setItem("bosun_role", "owner");
    localStorage.removeItem("bosun_vendor_id");
  }

  return (
    <RoleContext.Provider value={{ role, vendorId, setVendorMode, setOwnerMode }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside <RoleProvider>");
  return ctx;
}
