import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Anchor, BarChart3, BookOpen, Briefcase, ChevronDown, ClipboardList, Compass, DollarSign, Home, LogOut,
  MessageSquare, Settings, Store, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import { DEMO_VENDOR_ID, useDemoMode } from "@/lib/demoMode";
import { VENDOR_PROFILES } from "@/data/vendorData";
import NotificationCenter from "@/components/NotificationCenter";
import ShopSearchBar from "@/components/shop/ShopSearch";
import BoatSwitcher from "@/components/boats/BoatSwitcher";
import { BosunLogo } from "@/components/marketing/BosunLogo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Paths that also count as "here" (e.g. a detail page under this section). */
  match?: string[];
}

const OWNER_NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, match: ["/project"] },
  { to: "/my-boats", label: "My Boats", icon: Anchor },
  { to: "/boat-log", label: "Boat Log", icon: BookOpen },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/vendors", label: "Find a Shop", icon: Compass, match: ["/vendor/"] },
  { to: "/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

const VENDOR_NAV: NavItem[] = [
  { to: "/vendor-dashboard", label: "Today", icon: Zap },
  { to: "/vendor-rfps", label: "Jobs Near You", icon: Compass },
  { to: "/vendor-my-bids", label: "My Bids", icon: ClipboardList, match: ["/project"] },
  { to: "/vendor-shop", label: "Shop", icon: Store },
  { to: "/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/vendor-insights", label: "Insights", icon: BarChart3 },
  { to: "/vendor-revenue", label: "Revenue", icon: DollarSign },
];

/** The five that fit a phone's bottom bar. */
const OWNER_TABS = ["/app", "/boat-log", "/maintenance", "/vendors", "/inbox"];
const VENDOR_TABS = ["/vendor-dashboard", "/vendor-rfps", "/vendor-shop", "/inbox", "/vendor-insights"];

/**
 * Signed-in layout: navy sidebar on desktop, top bar everywhere, bottom tabs on phones,
 * and a light canvas for the page. Pages render their own <main> inside.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Each page opens at the top, not wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const { role, vendorId, vendorName, setVendorMode, setOwnerMode } = useRole();
  const { user, profile, signOut } = useAuth();
  const { demo, exit: exitDemo } = useDemoMode();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isVendor = role === "vendor";
  const nav = isVendor ? VENDOR_NAV : OWNER_NAV;
  const tabs = (isVendor ? VENDOR_TABS : OWNER_TABS).map((to) => nav.find((n) => n.to === to)!);
  const demoVendor = demo && vendorId ? VENDOR_PROFILES[vendorId] : null;

  const fullName = demo
    ? isVendor ? demoVendor?.name ?? "Demo shop" : "Demo owner"
    : isVendor ? vendorName ?? profile?.name ?? "Your shop" : profile?.name ?? "You";
  const initials = demo
    ? isVendor ? demoVendor?.initials ?? "V" : "D"
    : isVendor
      ? (vendorName ?? profile?.name ?? "V").slice(0, 2).toUpperCase()
      : (profile?.initials || profile?.name?.slice(0, 1) || "?").toUpperCase();

  const isActive = (item: NavItem) =>
    pathname === item.to || (item.match ?? []).some((m) => pathname.startsWith(m));

  function handleSignOut() {
    if (demo) {
      exitDemo();
      setOwnerMode();
      navigate("/");
      return;
    }
    signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-foreground md:flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col bg-brand text-white sticky top-0 h-screen">
        <Link to={isVendor ? "/vendor-dashboard" : "/app"} className="px-5 pt-5 pb-4">
          <BosunLogo tone="light" className="h-6" />
          {isVendor && (
            <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-sky-300">Shop</span>
          )}
        </Link>
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px]", active ? "text-sky-300" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-4">
          {demo && (
            <button
              onClick={() => (isVendor ? (setOwnerMode(), navigate("/app")) : setPickerOpen(true))}
              className="w-full mb-2 rounded-lg border border-white/15 px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300">Demo</span>
              {isVendor ? "View as a boat owner →" : "View as a shop →"}
            </button>
          )}
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar initials={initials} vendor={isVendor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{fullName}</p>
              <p className="truncate text-[11px] text-slate-400">{demo ? "Sample account" : user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
          {demo && (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
              <div className="px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium truncate">Demo mode · sample boats, shops and jobs. Nothing here is saved.</span>
                <button onClick={handleSignOut} className="font-semibold whitespace-nowrap hover:underline">Exit demo</button>
              </div>
            </div>
          )}
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link to={isVendor ? "/vendor-dashboard" : "/app"} className="md:hidden flex items-center gap-2">
              <BosunLogo className="h-5" />
              {isVendor && <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Shop</span>}
            </Link>
            {isVendor ? (
              <div className="hidden md:flex flex-1 items-center gap-4 min-w-0">
                <ShopSearchBar vendorId={vendorId} />
                <span className="text-sm text-muted-foreground truncate">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4 min-w-0">
                <BoatSwitcher />
                <span className="text-sm text-muted-foreground truncate">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-2">
              {isVendor && <span className="md:hidden"><ShopSearchBar vendorId={vendorId} /></span>}
              {!isVendor && <span className="md:hidden"><BoatSwitcher compact /></span>}
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-white pl-1 pr-2 py-1 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar initials={initials} vendor={isVendor} size="sm" />
                  <span className="hidden sm:inline text-sm font-medium max-w-[10rem] truncate">{fullName.split(" ")[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold truncate">{fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{demo ? "Sample account" : user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {nav.map((item) => (
                    <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)} className="md:hidden">
                      <item.icon className="w-4 h-4 mr-2 text-muted-foreground" /> {item.label}
                    </DropdownMenuItem>
                  ))}
                  {isVendor && vendorId && (
                    <DropdownMenuItem onClick={() => navigate(`/vendor/${encodeURIComponent(vendorId)}`)}>
                      <Briefcase className="w-4 h-4 mr-2 text-muted-foreground" /> My public profile
                    </DropdownMenuItem>
                  )}
                  {!isVendor && (
                    <DropdownMenuItem onClick={() => navigate("/settings")} className="hidden md:flex">
                      <Settings className="w-4 h-4 mr-2 text-muted-foreground" /> Settings
                    </DropdownMenuItem>
                  )}
                  {demo && (
                    <DropdownMenuItem onClick={() => (isVendor ? (setOwnerMode(), navigate("/app")) : setPickerOpen(true))}>
                      {isVendor ? "View as a boat owner" : "View as a shop"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2 text-muted-foreground" /> {demo ? "Exit demo" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* ── Page ── */}
        <div className="flex-1 pb-20 md:pb-0">{children}</div>
      </div>

      {/* ── Bottom tabs (phone) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-14">
          {tabs.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn("flex flex-col items-center justify-center gap-0.5", active ? "text-brand" : "text-muted-foreground")}
              >
                <item.icon className={cn("w-5 h-5", active && "text-sky-500")} strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn("text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
                  {item.label === "Jobs Near You" ? "Jobs" : item.label === "Find a Shop" ? "Shops" : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {pickerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setPickerOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <h2 className="text-lg font-semibold">See Bosun as a shop</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Run the sample shop: its board, parts, jobs nearby and insights.</p>
              </div>
              {Object.values(VENDOR_PROFILES).filter((v) => v.name === DEMO_VENDOR_ID).map((vendor) => (
                <button
                  key={vendor.name}
                  onClick={() => { setVendorMode(vendor.name); setPickerOpen(false); navigate("/vendor-dashboard"); }}
                  className="w-full text-left px-6 py-4 hover:bg-sky-50 flex items-center gap-3"
                >
                  <Avatar initials={vendor.initials} vendor />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{vendor.specialties[0]} · {vendor.serviceArea.split(" · ")[0]}</p>
                  </div>
                </button>
              ))}
              <div className="px-6 py-4 border-t border-border">
                <button onClick={() => setPickerOpen(false)} className="w-full py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Avatar({ initials, vendor, size = "md" }: { initials: string; vendor: boolean; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs",
        vendor ? "bg-sky-400 text-brand" : "bg-sky-100 text-brand"
      )}
    >
      {initials}
    </span>
  );
}
