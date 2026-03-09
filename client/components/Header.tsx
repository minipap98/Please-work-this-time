import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PROJECTS } from "@/data/projectData";

const MENU_ITEMS = [
  { label: "My Boats", to: "/my-boats" },
  { label: "Maintenance Log", to: "/maintenance" },
  { label: "Settings", to: "/settings" },
  { label: "Sign Out", to: null },
];

// Count unread messages across all projects
function getUnreadCount() {
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
  const navigate = useNavigate();
  const unreadCount = getUnreadCount();

  return (
    <header className="border-b border-border bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="hover:opacity-70 transition-opacity">
          <span className="text-lg font-bold tracking-tight text-foreground">Bosun</span>
        </Link>

        {/* Inbox + Profile */}
        <div className="flex items-center gap-2">
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

          {/* Profile */}
          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-foreground">D</span>
              </div>
              <span className="text-sm font-medium text-foreground">Dean</span>
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
                <div className="absolute right-0 mt-2 w-44 bg-white border border-border rounded-md shadow-lg z-20 py-1">
                  {MENU_ITEMS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setMenuOpen(false);
                        if (item.to) navigate(item.to);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
