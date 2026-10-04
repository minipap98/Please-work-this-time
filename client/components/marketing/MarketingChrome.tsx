import { Link, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { BosunLogo } from "./BosunLogo";
import { useDemoMode } from "@/lib/demoMode";

export type Audience = "boaters" | "shops";

/** Opens the demo as an owner or as a shop. */
export function useStartDemo() {
  const navigate = useNavigate();
  const { enter } = useDemoMode();
  return (audience: Audience) => {
    try {
      if (audience === "shops") {
        localStorage.setItem("bosun_role", "vendor");
        localStorage.setItem("bosun_vendor_id", "MarineMax Service Center");
      } else {
        localStorage.setItem("bosun_role", "owner");
        localStorage.removeItem("bosun_vendor_id");
      }
    } catch {
      // private mode: demo still opens with defaults
    }
    enter();
    navigate(audience === "shops" ? "/vendor-dashboard" : "/app");
  };
}

export function signupPath(audience: Audience) {
  return audience === "shops" ? "/login?mode=signup&role=vendor" : "/login?mode=signup&role=owner";
}

const LINKS: Record<Audience, { href: string; label: string }[]> = {
  boaters: [
    { href: "#how-it-works", label: "How it works" },
    { href: "#boat-log", label: "Boat Log" },
    { href: "#insights", label: "Model insights" },
    { href: "#features", label: "Features" },
  ],
  shops: [
    { href: "#tools", label: "Shop tools" },
    { href: "#crew", label: "Your crew" },
    { href: "#jobs", label: "New jobs" },
  ],
};

export function MarketingNav({ audience }: { audience: Audience }) {
  const navigate = useNavigate();
  const startDemo = useStartDemo();
  const other = audience === "boaters" ? { to: "/shops", label: "For shops" } : { to: "/boaters", label: "For boaters" };
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" aria-label="Bosun home">
            <BosunLogo className="h-5 sm:h-6" />
          </Link>
          <span
            className={
              audience === "shops"
                ? "text-[10px] font-bold uppercase tracking-wider text-white bg-[#052443] rounded px-1.5 py-0.5"
                : "text-[10px] font-bold uppercase tracking-wider text-[#052443] bg-sky-100 rounded px-1.5 py-0.5"
            }
          >
            {audience === "shops" ? "Shops" : "Boaters"}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {LINKS[audience].map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          {audience === "boaters" && (
            <Link to="/parts" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Parts <span className="ml-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-1.5 py-0.5">Soon</span>
            </Link>
          )}
          <Link to={other.to} className="text-sm font-medium text-sky-700 hover:text-sky-800">
            {other.label} →
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button onClick={() => startDemo(audience)} className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">
            Try demo
          </button>
          <button onClick={() => navigate("/login")} className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 sm:px-3 py-2">
            Log in
          </button>
          <button
            onClick={() => navigate(signupPath(audience))}
            className="text-sm font-semibold bg-[#052443] text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-[#0a3360] transition-colors whitespace-nowrap"
          >
            {audience === "shops" ? "Start free" : "Post a job"}
          </button>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter({ audience }: { audience: Audience }) {
  const navigate = useNavigate();
  return (
    <footer className="bg-[#052443] text-slate-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row gap-8 sm:items-start justify-between">
          <div className="max-w-xs">
            <BosunLogo tone="light" className="h-6" />
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              {audience === "shops"
                ? "Shop software for marine service businesses, with new jobs from local boat owners built in."
                : "Find the right marine pro for your boat, and keep its full service history in one place."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <ul className="space-y-2">
              {audience === "shops" ? (
                <>
                  <li><button onClick={() => navigate("/login?mode=signup&role=vendor")} className="hover:text-white">Create a shop account</button></li>
                  <li><button onClick={() => navigate("/tech")} className="hover:text-white">Crew login</button></li>
                  <li><Link to="/boaters" className="hover:text-white">Bosun for boaters</Link></li>
                </>
              ) : (
                <>
                  <li><button onClick={() => navigate("/login?mode=signup&role=owner")} className="hover:text-white">Post a job</button></li>
                  <li><Link to="/parts" className="hover:text-white">Bosun Parts (soon)</Link></li>
                  <li><Link to="/shops" className="hover:text-white">Bosun for shops</Link></li>
                </>
              )}
            </ul>
            <ul className="space-y-2">
              <li><button onClick={() => navigate("/login")} className="hover:text-white">Log in</button></li>
              <li><a href="mailto:hello@bosun.app" className="hover:text-white">Contact</a></li>
              <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Bosun. All rights reserved.</p>
          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Fort Lauderdale, FL</p>
        </div>
      </div>
    </footer>
  );
}
