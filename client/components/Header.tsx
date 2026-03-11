import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { PROJECTS } from "@/data/projectData";
import { VENDOR_PROFILES } from "@/data/vendorData";
import { getAllVendorProfiles } from "@/data/vendorProfileUtils";
import { useRole } from "@/context/RoleContext";
import { getVendorUnreadCount } from "@/data/bidUtils";
import { getCurrentUser, logout } from "@/data/authUtils";

const OWNER_MENU_ITEMS = [
  { label: "My Boats", to: "/my-boats" },
  { label: "Maintenance Log", to: "/maintenance" },
  { label: "Settings", to: "/settings" },
];

const VENDOR_MENU_ITEMS = [
  { label: "Dashboard", to: "/vendor-dashboard" },
  { label: "Business Hub", to: "/vendor-business" },
  { label: "Payment History", to: "/vendor-revenue" },
];

// Count unread messages across all projects (owner view)
function getOwnerUnreadCount() {
  return PROJECTS.reduce((total, project) => {
    return total + project.bids.reduce((bidTotal, bid) => {
      const lastRead = parseInt(localStorage.getItem(`msg_read_${bid.id}`) ?? "0");
      const unread = bid.thread.filter((m, i) => m.from === "vendor" && i >= lastRead).length;
      return bidTotal + unread;
    }, 0);
  }, 0);
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { role, vendorId, setVendorMode, setOwnerMode } = useRole();

  const currentUser = getCurrentUser();
  const isVendor = role === "vendor";
  const currentVendor = vendorId ? getAllVendorProfiles()[vendorId] : null;

  // Display name/initials: prefer auth user data, fall back to vendor profile
  const displayName = isVendor
    ? (currentVendor?.name.split(" ")[0] ?? currentUser?.name.split(" ")[0] ?? "Vendor")
    : (currentUser?.name.split(" ")[0] ?? "Me");
  const displayInitials = isVendor
    ? (currentVendor?.initials ?? currentUser?.initials ?? "V")
    : (currentUser?.initials ?? "?");

  function handleSignOut() {
    setMenuOpen(false);
    logout();
    navigate("/login");
  }

  const ownerUnread = isVendor ? 0 : getOwnerUnreadCount();
  const vendorUnread = isVendor && vendorId ? getVendorUnreadCount(vendorId) : 0;
  const unreadCount = isVendor ? vendorUnread : ownerUnread;

  function handleSwitchToVendor() {
    setMenuOpen(false);
    setPickerOpen(true);
  }

  function handleSwitchToOwner() {
    setMenuOpen(false);
    setOwnerMode();
    navigate("/");
  }

  function handlePickVendor(name: string) {
    setVendorMode(name);
    setPickerOpen(false);
    navigate("/vendor-dashboard");
  }

  return (
    <>
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
                  to="/vendor-business"
                  className="px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
                >
                  Business Hub
                </Link>
              </nav>
            </div>
          ) : (
            <Link to="/" className="hover:opacity-70 transition-opacity">
              <span className="text-lg font-bold tracking-tight text-foreground">Bosun</span>
            </Link>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
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
                  {ownerUnread > 0 && (
                    <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {ownerUnread}
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
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={handleSwitchToOwner}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          Switch to Owner View
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Sign Out
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
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={handleSwitchToVendor}
                          className="w-full text-left px-4 py-2 text-sm text-sky-700 font-medium hover:bg-sky-50 transition-colors"
                        >
                          Switch to Vendor View
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Sign Out
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

      {/* Vendor picker modal */}
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
                <p className="text-sm text-muted-foreground mt-0.5">Select a vendor profile to simulate their experience</p>
              </div>

              <div className="overflow-y-auto flex-1 py-2">
                {Object.values(VENDOR_PROFILES).filter((v) => v.name === "MarineMax Service Center").map((vendor) => (
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs text-muted-foreground">{vendor.rating}</span>
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
          <div className="grid grid-cols-4 h-14">
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
