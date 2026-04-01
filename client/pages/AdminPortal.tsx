import { useState, useMemo, useEffect } from "react";
import {
  Users,
  FolderKanban,
  Gavel,
  CalendarCheck,
  DollarSign,
  Search,
  TrendingUp,
  Activity,
  BarChart3,
  Star,
  Shield,
  LogOut,
  Eye,
} from "lucide-react";
import { getAugmentedProjects } from "@/data/bidUtils";
import { supabase, supabaseMissing } from "@/lib/supabase";
import type { Project } from "@/data/projectData";

// ── Constants ────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "bosun2026";
const PLATFORM_FEE_RATE = 0.07;

// ── Mock data generators ─────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James", "Sarah", "Michael", "Emily", "Robert", "Jessica", "David", "Amanda",
  "Christopher", "Megan", "Daniel", "Ashley", "Matthew", "Lauren", "Andrew",
  "Stephanie", "William", "Nicole",
];
const LAST_NAMES = [
  "Thompson", "Martinez", "Anderson", "Wilson", "Taylor", "Davis", "Miller",
  "Garcia", "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall", "Allen",
  "Young", "King", "Wright",
];

function generateMockUsers() {
  const users: Array<{
    id: number;
    name: string;
    email: string;
    role: "owner" | "vendor";
    signupDate: string;
    status: "active" | "inactive";
    activity: number;
  }> = [];

  for (let i = 0; i < 18; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const role = i < 11 ? "owner" : "vendor";
    const daysAgo = Math.floor(Math.random() * 180) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    users.push({
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
      role,
      signupDate: date.toISOString().split("T")[0],
      status: Math.random() > 0.15 ? "active" : "inactive",
      activity: role === "owner" ? Math.floor(Math.random() * 6) + 1 : Math.floor(Math.random() * 12) + 1,
    });
  }
  return users;
}

const MONTHLY_REVENUE = [
  { month: "Oct", revenue: 4200 },
  { month: "Nov", revenue: 6800 },
  { month: "Dec", revenue: 3100 },
  { month: "Jan", revenue: 7500 },
  { month: "Feb", revenue: 9200 },
  { month: "Mar", revenue: 8400 },
];

function generateActivityFeed(projects: Project[]) {
  const activities: Array<{
    id: number;
    type: "project" | "bid" | "booking" | "review";
    description: string;
    user: string;
    project: string;
    timestamp: Date;
  }> = [];

  let id = 0;
  for (const p of projects.slice(0, 10)) {
    const daysAgo = Math.floor(Math.random() * 14);
    activities.push({
      id: id++,
      type: "project",
      description: "New project posted",
      user: p.owner ?? "Boat Owner",
      project: p.title,
      timestamp: new Date(Date.now() - daysAgo * 86400000 - Math.random() * 86400000),
    });

    for (const bid of p.bids.slice(0, 2)) {
      activities.push({
        id: id++,
        type: "bid",
        description: "Bid submitted",
        user: bid.vendorName,
        project: p.title,
        timestamp: new Date(Date.now() - (daysAgo - 1) * 86400000 - Math.random() * 86400000),
      });
    }

    if (p.status === "completed" || p.status === "in-progress") {
      activities.push({
        id: id++,
        type: "booking",
        description: "Booking confirmed",
        user: p.owner ?? "Boat Owner",
        project: p.title,
        timestamp: new Date(Date.now() - (daysAgo - 2) * 86400000 - Math.random() * 86400000),
      });
    }

    if (p.status === "completed" && p.bids.length > 0) {
      activities.push({
        id: id++,
        type: "review",
        description: "Review left",
        user: p.owner ?? "Boat Owner",
        project: p.title,
        timestamp: new Date(Date.now() - (daysAgo - 3) * 86400000 - Math.random() * 86400000),
      });
    }
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Activity icon helper ─────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "project":
      return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><FolderKanban className="w-4 h-4 text-blue-600" /></div>;
    case "bid":
      return <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Gavel className="w-4 h-4 text-amber-600" /></div>;
    case "booking":
      return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CalendarCheck className="w-4 h-4 text-green-600" /></div>;
    case "review":
      return <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Star className="w-4 h-4 text-purple-600" /></div>;
    default:
      return <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Activity className="w-4 h-4 text-gray-600" /></div>;
  }
}

// ── Bar chart component ──────────────────────────────────────────────────────

function SimpleBarChart({ data }: { data: typeof MONTHLY_REVENUE }) {
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-3 h-40 px-2">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-slate-600">{formatCurrency(d.revenue)}</span>
          <div
            className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md transition-all duration-500"
            style={{ height: `${(d.revenue / max) * 100}%`, minHeight: 8 }}
          />
          <span className="text-xs text-slate-500 font-medium">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("bosun_admin_auth", "true");
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <Shield className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bosun Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Enter admin password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-3 rounded-lg bg-slate-800 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                error ? "border-red-500" : "border-slate-700"
              }`}
            />
            {error && <p className="text-red-400 text-xs mt-1.5">Incorrect password. Try again.</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────────────────

function AdminDashboard() {
  const projects = useMemo(() => getAugmentedProjects(), []);
  const mockUsers = useMemo(() => generateMockUsers(), []);
  const activityFeed = useMemo(() => generateActivityFeed(projects), [projects]);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "vendor">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity" | "revenue">("overview");
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [accountCountLoaded, setAccountCountLoaded] = useState(false);

  // Try to fetch real account count from Supabase
  useEffect(() => {
    if (supabaseMissing || accountCountLoaded) return;
    setAccountCountLoaded(true);
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (!error && typeof count === "number") setAccountCount(count);
      });
  }, [accountCountLoaded]);

  // ── Computed stats ───────────────────────────────────────────────────────

  const totalAccounts = accountCount ?? mockUsers.length;
  const totalProjects = projects.length;
  const totalBids = projects.reduce((sum, p) => sum + p.bids.length, 0);

  const bookedProjectIds: string[] = [];
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("booking_")) {
        bookedProjectIds.push(key.replace("booking_", ""));
      }
    }
  } catch { /* no-op */ }
  const completedOrBooked = projects.filter(
    (p) => p.status === "completed" || p.status === "in-progress" || bookedProjectIds.includes(p.id)
  );
  const totalBookings = completedOrBooked.length;

  const acceptedBidPrices = projects
    .filter((p) => p.chosenBidId)
    .map((p) => {
      const bid = p.bids.find((b) => b.id === p.chosenBidId);
      return bid?.price ?? 0;
    });
  const totalAcceptedValue = acceptedBidPrices.reduce((a, b) => a + b, 0);
  const platformRevenue = totalAcceptedValue * PLATFORM_FEE_RATE;

  const gmv = completedOrBooked.reduce((sum, p) => {
    const bid = p.bids.find((b) => b.id === p.chosenBidId);
    return sum + (bid?.price ?? p.bids[0]?.price ?? 0);
  }, 0);

  const avgBidsPerProject = totalProjects > 0 ? (totalBids / totalProjects).toFixed(1) : "0";
  const avgProjectValue =
    totalBids > 0
      ? formatCurrency(projects.reduce((s, p) => s + p.bids.reduce((bs, b) => bs + b.price, 0), 0) / totalBids)
      : "$0";

  const categoryCounts: Record<string, number> = {};
  for (const p of projects) {
    const cat = p.category ?? "Uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const vendorRatings: Record<string, number[]> = {};
  for (const p of projects) {
    for (const b of p.bids) {
      if (!vendorRatings[b.vendorName]) vendorRatings[b.vendorName] = [];
      vendorRatings[b.vendorName].push(b.rating);
    }
  }
  const topVendor = Object.entries(vendorRatings)
    .map(([name, ratings]) => ({ name, avg: ratings.reduce((a, b) => a + b, 0) / ratings.length }))
    .sort((a, b) => b.avg - a.avg)[0];

  // ── Users filtering ──────────────────────────────────────────────────────

  const filteredUsers = mockUsers.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ── Transactions table ───────────────────────────────────────────────────

  const recentTransactions = projects
    .filter((p) => p.chosenBidId && p.bids.find((b) => b.id === p.chosenBidId))
    .slice(0, 8)
    .map((p) => {
      const bid = p.bids.find((b) => b.id === p.chosenBidId)!;
      return {
        project: p.title,
        vendor: bid.vendorName,
        amount: bid.price,
        fee: bid.price * PLATFORM_FEE_RATE,
        date: p.date,
      };
    });

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Eye },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "activity" as const, label: "Activity", icon: Activity },
    { id: "revenue" as const, label: "Revenue", icon: DollarSign },
  ];

  function handleLogout() {
    localStorage.removeItem("bosun_admin_auth");
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-sky-400" />
            <span className="text-lg font-bold text-white tracking-tight">Bosun Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 sticky top-[52px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Summary Cards (always visible) ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Accounts", value: totalAccounts.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Projects Posted", value: totalProjects.toLocaleString(), icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Bids Received", value: totalBids.toLocaleString(), icon: Gavel, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Bookings", value: totalBookings.toLocaleString(), icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50" },
            { label: "Platform Revenue", value: formatCurrency(platformRevenue), icon: DollarSign, color: "text-sky-600", bg: "bg-sky-50" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Avg Bids / Project", value: avgBidsPerProject },
                  { label: "Avg Bid Value", value: avgProjectValue },
                  { label: "Top Category", value: topCategory },
                  { label: "Top-Rated Vendor", value: topVendor?.name.split(" ").slice(0, 2).join(" ") ?? "N/A" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{stat.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Activity Feed */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                Recent Activity
              </h3>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {activityFeed.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{item.description}</span>
                        {" "}
                        <span className="text-slate-500">by {item.user}</span>
                      </p>
                      <p className="text-xs text-slate-400 truncate">{item.project}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ───────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl border border-slate-200">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                {(["all", "owner", "vendor"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      roleFilter === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {r === "all" ? "All" : r === "owner" ? "Owners" : "Vendors"}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Signed Up</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600">
                              {user.name.split(" ").map((n) => n[0]).join("")}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "owner"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {user.role === "owner" ? "Owner" : "Vendor"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{user.signupDate}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "active" ? "bg-green-500" : "bg-slate-300"
                            }`}
                          />
                          <span className={user.status === "active" ? "text-slate-700" : "text-slate-400"}>
                            {user.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-700 font-medium">
                          {user.activity} {user.role === "owner" ? "projects" : "bids"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No users match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-400">
              Showing {filteredUsers.length} of {mockUsers.length} users
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ────────────────────────────────────────────── */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              Activity Feed
            </h3>
            <div className="space-y-4">
              {activityFeed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{item.user}</span>
                      <span className="text-slate-500"> - {item.description}</span>
                    </p>
                    <p className="text-sm text-slate-500 truncate mt-0.5">{item.project}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(item.timestamp)}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.type === "project"
                        ? "bg-blue-50 text-blue-600"
                        : item.type === "bid"
                        ? "bg-amber-50 text-amber-600"
                        : item.type === "booking"
                        ? "bg-green-50 text-green-600"
                        : "bg-purple-50 text-purple-600"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REVENUE TAB ─────────────────────────────────────────────── */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            {/* GMV + Platform Revenue cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">GMV (Gross Merchandise Value)</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(gmv)}</p>
                <p className="text-xs text-slate-400 mt-1">Total value of booked/completed projects</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Platform Take (7%)</p>
                <p className="text-3xl font-bold text-sky-600 mt-2">{formatCurrency(gmv * PLATFORM_FEE_RATE)}</p>
                <p className="text-xs text-slate-400 mt-1">Revenue from platform fees</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Accepted Bid Revenue</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(platformRevenue)}</p>
                <p className="text-xs text-slate-400 mt-1">7% of accepted bid prices</p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                Monthly Revenue (Platform Take)
              </h3>
              <SimpleBarChart data={MONTHLY_REVENUE} />
            </div>

            {/* Transactions table */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-sky-600" />
                  Recent Transactions
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Project</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Vendor</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">Platform Fee</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{tx.project}</td>
                        <td className="px-4 py-3 text-slate-500">{tx.vendor}</td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-3 text-right text-sky-600 font-medium">{formatCurrency(tx.fee)}</td>
                        <td className="px-4 py-3 text-slate-500">{tx.date}</td>
                      </tr>
                    ))}
                    {recentTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No transactions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function AdminPortal() {
  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem("bosun_admin_auth") === "true"
  );

  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />;
  }

  return <AdminDashboard />;
}
