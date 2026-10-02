import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import NotificationCenter from "@/components/NotificationCenter";
import { DEMO_VENDOR_ID, useDemoMode } from "@/lib/demoMode";
import { VENDOR_PROFILES } from "@/data/vendorData";

const OWNER_MENU_ITEMS = [
  { label: "My Boats", to: "/my-boats" },
  { label: "Boat Log", to: "/boat-log" },
  { label: "Maintenance", to: "/maintenance" },
  { label: "Settings", to: "/settings" },
];

const VENDOR_MENU_ITEMS = [
  { label: "Dashboard", to: "/vendor-dashboard" },
  { label: "Shop", to: "/vendor-shop" },
  { label: "Inbox", to: "/inbox" },
  { label: "Business Hub", to: "/vendor-business" },
  { label: "Analytics", to: "/vendor-revenue" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { role, vendorId, vendorName, setVendorMode, setOwnerMode } = useRole();
  const { user: supabaseUser, profile, signOut: supabaseSignOut } = useAuth();
  const { demo, exit: exitDemo } = useDemoMode();

  const isAuthenticated = !!supabaseUser;
  const isVendor = role === "vendor";
  const demoVendor = demo && vendorId ? VENDOR_PROFILES[vendorId] : null;

  const displayName = demo
    ? (isVendor ? (demoVendor?.name.split(" ")[0] ?? "Vendor") : "Demo")
    : isVendor
      ? (vendorName?.split(" ")[0] ?? profile?.name.split(" ")[0] ?? "Vendor")
      : (profile?.name.split(" ")[0] ?? "Me");
  const displayInitials = demo
    ? (isVendor ? (demoVendor?.initials ?? "V") : "D")
    : isVendor
      ? (vendorName ?? profile?.name ?? "V").slice(0, 2).toUpperCase()
      : (profile?.initials || profile?.name?.slice(0, 1) || "?").toUpperCase();

  function handleSignOut() {
    setMenuOpen(false);
    if (demo) {
      exitDemo();
      setOwnerMode();
      navigate("/");
      return;
    }
    supabaseSignOut();
    navigate("/login");
  }

  function handleSwitchToVendor() {
    setMenuOpen(false);
    setPickerOpen(true);
  }

  function handleSwitchToOwner() {
    setMenuOpen(false);
    setOwnerMode();
    navigate("/app");
  }

  function handlePickVendor(name: string) {
    setVendorMode(name);
    setPickerOpen(false);
    navigate("/vendor-dashboard");
  }

  const unreadCount = 0;

  return (
    <>
      {demo && (
        <div className={`bg-amber-50 border-b border-amber-200 text-amber-900 ${isVendor ? "mt-[3px]" : ""}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-3">
            <p className="text-xs font-medium">
              Demo mode — sample services and RFPs. Live jobs stay behind Log In.
            </p>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 whitespace-nowrap"
            >
              Exit demo
            </button>
          </div>
        </div>
      )}
      {/* Amber stripe for vendor mode */}
      {isVendor && <div className="h-[3px] bg-sky-400 fixed top-0 left-0 right-0 z-50" />}

      <header
        className={`border-b border-border bg-white sticky z-40 ${isVendor ? "top-[3px]" : "top-0"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">

          {/* Logo / Nav */}
          {isVendor ? (
            <div className="flex items-center gap-3 sm:gap-6">
              <Link to="/vendor-dashboard" className="hover:opacity-70 transition-opacity flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-lg font-bold tracking-tight text-foreground">Bosun</span>
                <span className="text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 whitespace-nowrap">Vendor</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/vendor-my-bids"
                  className="relative px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
                >
                  My Bids
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/vendor-shop"
                  className="px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
                >
                  Shop
                </Link>
                <Link
                  to="/vendor-business"
                  className="px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
                >
                  Business Hub
                </Link>
              </nav>
            </div>
          ) : (
            <Link to="/app" className="hover:opacity-70 transition-opacity">
              <span className="text-lg font-bold tracking-tight text-foreground">Bosun</span>
            </Link>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Logged-in user info */}
            {isAuthenticated && !demo && (
              <span className="hidden sm:inline text-xs text-muted-foreground mr-1">
                {supabaseUser.email}
              </span>
            )}
            {demo && (
              <span className="hidden sm:inline text-xs font-medium text-amber-700 mr-1">
                Demo
              </span>
            )}

            {/* Notification bell */}
            <NotificationCenter />

            {/* Owner: Inbox link */}
            {!isVendor && (
              <div className="flex items-center">
                <Link
                  to="/inbox"
                  className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Inbox
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            )}

            {/* Profile dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`flex items-center gap-1.5 pl-1.5 pr-2 sm:pl-2 sm:pr-3 py-1.5 rounded-full border transition-colors ${
                  isVendor
                    ? "border-sky-300 hover:border-sky-400 hover:bg-sky-50/60"
                    : "border-border hover:border-primary hover:bg-primary/5"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isVendor ? "bg-sky-400" : "bg-primary"
                  }`}
                >
                  <span className={`text-xs font-bold ${isVendor ? "text-white" : "text-primary-foreground"}`}>
                    {displayInitials}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-md shadow-lg z-20 py-1">
                    {isVendor ? (
                      <>
                        {VENDOR_MENU_ITEMS.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => { setMenuOpen(false); navigate(item.to); }}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                        {vendorId && (
                          <button
                            onClick={() => { setMenuOpen(false); navigate(`/vendor/${encodeURIComponent(vendorId)}`); }}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            My Profile
                          </button>
                        )}
                        {demo && (
                          <button
                            onClick={handleSwitchToOwner}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            View as owner
                          </button>
                        )}
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                          {demo ? "Exit demo" : "Sign Out"}
                        </button>
                      </>
                    ) : (
                      <>
                        {OWNER_MENU_ITEMS.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => { setMenuOpen(false); navigate(item.to); }}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                        {demo && (
                          <button
                            onClick={handleSwitchToVendor}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            View as vendor
                          </button>
                        )}
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                          {demo ? "Exit demo" : "Sign Out"}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {pickerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setPickerOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">Switch to Vendor View</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Browse the sample RFPs as a South Florida shop</p>
              </div>

              <div className="overflow-y-auto flex-1 py-2">
                {Object.values(VENDOR_PROFILES).filter((v) => v.name === DEMO_VENDOR_ID).map((vendor) => (
                  <button
                    key={vendor.name}
                    onClick={() => handlePickVendor(vendor.name)}
                    className="w-full text-left px-5 py-3.5 hover:bg-sky-50 transition-colors flex items-center gap-3 border-b border-border/40 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-sky-700">{vendor.initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {vendor.specialties[0]} · {vendor.serviceArea.split(" · ")[0]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-border flex-shrink-0">
                <button
                  onClick={() => setPickerOpen(false)}
                  className="w-full py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom navigation (vendor only) ─────────────────── */}
      {isVendor && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-14">
            {([
              {
                to: "/vendor-dashboard",
                label: "Projects",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
              },
              {
                to: "/vendor-my-bids",
                label: "My Bids",
                badge: unreadCount,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
              {
                to: "/vendor-shop",
                label: "Shop",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437" />
                  </svg>
                ),
              },
              {
                to: "/vendor-business",
                label: "Hub",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                to: "/vendor-revenue",
                label: "Revenue",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ] as const).map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? "text-sky-600" : "text-muted-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sky-500 rounded-full" />
                  )}
                  <span className="relative">
                    {item.icon}
                    {"badge" in item && (item as any).badge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {(item as any).badge}
                      </span>
                    )}
                  </span>
                  <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
