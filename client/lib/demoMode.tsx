import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const DEMO_VENDOR_ID = "Dean's Marine";
const STORAGE_KEY = "bosun_demo_mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (import.meta.env.VITE_DEMO_MODE === "true") return true;
    if (new URLSearchParams(window.location.search).get("demo") === "1") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistDemoMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private-mode failures
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bosun-demo-change"));
  }
}

interface DemoModeContextValue {
  demo: boolean;
  enter: () => void;
  exit: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(() => isDemoMode());

  useEffect(() => {
    const sync = () => setDemo(isDemoMode());
    window.addEventListener("bosun-demo-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("bosun-demo-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const enter = useCallback(() => {
    persistDemoMode(true);
    setDemo(true);
  }, []);

  const exit = useCallback(() => {
    persistDemoMode(false);
    setDemo(false);
  }, []);

  const value = useMemo(() => ({ demo, enter, exit }), [demo, enter, exit]);

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
