import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Anchor, ClipboardList, Copy, LogOut, MapPin, Search, ShieldCheck, Sparkles, Users, Wrench } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BosunLogo } from "@/components/marketing/BosunLogo";
import { PageContainer, PageHeader, Panel, StatGrid, StatTile } from "@/components/app/Page";
import LocationPicker from "@/components/LocationPicker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAdminAction, useAdminAiUsage, useAdminAudit, useAdminDemand, useAdminPeople, useAdminPersonDetail, useAdminProspects, useCreateProspect, useDraftOutreach, useSearchProspects, useUpdateProspect,
} from "@/hooks/use-admin";
import { PROSPECT_STATUSES, PROSPECT_TRADES, demandCells, prospectScore, type AdminAction, type AdminPerson, type DemandCell, type Prospect, type ProspectStatus } from "@shared/admin";
import { AI_ALERT_USD_30D, AI_KIND_LABELS, type AiStatus } from "@shared/aiUsage";
import type { PickedLocation } from "@shared/geo";
import { cn } from "@/lib/utils";

type Tab = "overview" | "people" | "shops" | "demand" | "prospects" | "ai" | "audit";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "shops", label: "Shops" },
  { key: "demand", label: "Demand" },
  { key: "prospects", label: "Prospects" },
  { key: "ai", label: "AI usage" },
  { key: "audit", label: "Audit log" },
];
const usd = (n: number) => (n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(n < 100 ? 2 : 0)}`);

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const ago = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400_000);
  return d === 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
};
const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400";
const btn = "px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white hover:bg-muted disabled:opacity-50";

export default function AdminPortal() {
  const { user, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Panel className="max-w-sm text-center">
          <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="mt-3 text-lg font-bold">Bosun team only</h1>
          <p className="mt-1 text-sm text-muted-foreground">This account isn't an admin. Another admin can grant it from People.</p>
          <Link to="/app" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">Back to Bosun</Link>
        </Panel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-[#052443] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BosunLogo tone="light" className="h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 border border-sky-400/40 rounded px-1.5 py-0.5">Admin</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn("px-3 py-1.5 text-sm rounded-lg", tab === t.key ? "bg-white/15 font-semibold" : "text-slate-300 hover:text-white")}>{t.label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-slate-300 truncate max-w-[12rem]">{profile.name || profile.email}</span>
            <Link to="/app" className="text-slate-300 hover:text-white">App</Link>
            <button onClick={() => signOut()} className="inline-flex items-center gap-1 text-slate-300 hover:text-white"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="md:hidden flex gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("px-3 py-1 text-xs rounded-full whitespace-nowrap", tab === t.key ? "bg-white text-[#052443] font-semibold" : "text-slate-300")}>{t.label}</button>
          ))}
        </div>
      </header>
      <PageContainer wide>
        {tab === "overview" && <Overview go={setTab} />}
        {tab === "people" && <People mode="people" />}
        {tab === "shops" && <People mode="shops" />}
        {tab === "demand" && <Demand />}
        {tab === "prospects" && <Prospects />}
        {tab === "ai" && <AiUsage />}
        {tab === "audit" && <Audit />}
      </PageContainer>
    </div>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────────── */

function Overview({ go }: { go: (t: Tab) => void }) {
  const people = useAdminPeople();
  const demand = useAdminDemand();
  const prospects = useAdminProspects();
  const ai = useAdminAiUsage();
  const ps = people.data ?? [];
  const owners = ps.filter((p) => p.role === "owner");
  const shops = ps.filter((p) => p.shop);
  const projects = demand.data ?? [];
  const monthAgo = Date.now() - 30 * 86400_000;
  const recentJobs = projects.filter((p) => Date.parse(p.createdAt) >= monthAgo);
  const thin = projects.filter((p) => (p.status === "bidding" || p.status === "gathering" || p.status === "active") && p.bidders <= 1);
  const cells = useMemo(() => demandCells(projects), [projects]);
  const due = (prospects.data?.prospects ?? []).filter((p) => p.nextFollowUp && p.nextFollowUp <= new Date().toLocaleDateString("en-CA") && !["onboarded", "declined", "not-a-fit"].includes(p.status));
  return (
    <>
      <PageHeader title="Bosun operations" description="Who's on the platform, where the work is, and who to call next." />
      {people.error && <p className="mb-4 text-sm text-red-600">{String(people.error)}</p>}
      <StatGrid className="sm:grid-cols-3 lg:grid-cols-7">
        <StatTile icon={<Users />} label="Boat owners" value={owners.length} sub={`${owners.filter((o) => Date.parse(o.createdAt) >= monthAgo).length} new in 30d`} onClick={() => go("people")} />
        <StatTile icon={<Wrench />} label="Shops" value={shops.length} sub={`${shops.filter((s) => s.shop?.verifiedAt).length} verified`} onClick={() => go("shops")} />
        <StatTile icon={<ClipboardList />} label="Jobs posted" value={projects.length} sub={`${recentJobs.length} in 30d`} onClick={() => go("demand")} />
        <StatTile icon={<Search />} label="Open jobs, ≤1 bid" value={thin.length} tone={thin.length ? "warn" : "default"} sub="where shops are missing" onClick={() => go("demand")} />
        <StatTile icon={<MapPin />} label="Prospects" value={prospects.data?.prospects.length ?? 0} sub={`${(prospects.data?.prospects ?? []).filter((p) => p.status === "interested").length} interested`} onClick={() => go("prospects")} />
        <StatTile icon={<Anchor />} label="Follow-ups due" value={due.length} tone={due.length ? "warn" : "default"} onClick={() => go("prospects")} />
        <StatTile
          icon={<Sparkles />}
          label="AI spend, 30d"
          value={ai.data ? usd(ai.data.summary.month.cost) : "—"}
          tone={ai.data?.summary.spenders.some((s) => s.flagged) ? "warn" : "default"}
          sub={ai.data ? `${ai.data.summary.month.calls} reads · ${ai.data.summary.spenders.filter((s) => s.flagged).length} flagged` : "loading"}
          onClick={() => go("ai")}
        />
      </StatGrid>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel padded={false}>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between"><h2 className="text-sm font-semibold">Where new shops would win work first</h2><button onClick={() => go("demand")} className="text-xs font-semibold text-sky-700 hover:underline">All demand</button></div>
          {cells.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">No jobs yet.</p> : (
            <ul className="divide-y divide-border">
              {cells.slice(0, 6).map((c) => (
                <li key={`${c.area}|${c.category}`} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1"><span className="font-medium">{c.area}</span> <span className="text-muted-foreground">· {c.category}</span></span>
                  <span className="text-xs text-muted-foreground">{c.jobs} jobs · {c.thin} thin · {c.shopsBidding} shops</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel padded={false}>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between"><h2 className="text-sm font-semibold">Newest accounts</h2><button onClick={() => go("people")} className="text-xs font-semibold text-sky-700 hover:underline">All people</button></div>
          <ul className="divide-y divide-border">
            {ps.slice(0, 6).map((p) => (
              <li key={p.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate"><span className="font-medium">{p.name || p.email}</span> <span className="text-muted-foreground">· {p.shop ? p.shop.businessName : "owner"}</span></span>
                <span className="text-xs text-muted-foreground">{ago(p.createdAt)}{!p.onboardingComplete && " · not onboarded"}</span>
              </li>
            ))}
            {ps.length === 0 && !people.isLoading && <li className="px-5 py-4 text-sm text-muted-foreground">No accounts yet.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ── People / Shops ───────────────────────────────────────────────────────── */

function People({ mode }: { mode: "people" | "shops" }) {
  const { user } = useAuth();
  const people = useAdminPeople();
  const act = useAdminAction();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "owner" | "vendor" | "suspended" | "not-onboarded" | "admin">("all");
  const [open, setOpen] = useState<AdminPerson | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (people.data ?? [])
      .filter((p) => (mode === "shops" ? !!p.shop : true))
      .filter((p) => filter === "all" ? true : filter === "owner" ? p.role === "owner" : filter === "vendor" ? p.role === "vendor" : filter === "suspended" ? p.suspended : filter === "not-onboarded" ? !p.onboardingComplete : p.isAdmin)
      .filter((p) => !needle || [p.name, p.email, p.location, p.shop?.businessName ?? "", p.shop?.phone ?? ""].some((f) => f.toLowerCase().includes(needle)));
  }, [people.data, q, filter, mode]);

  const run = (p: AdminPerson, action: AdminAction) => {
    const confirms: Partial<Record<AdminAction, string>> = {
      suspend: `Suspend ${p.name || p.email}? They can't sign in until reinstated.`,
      delete: `Delete ${p.name || p.email} permanently? Their boats, jobs and bids go with them.`,
      "remove-admin": `Remove admin from ${p.name || p.email}?`,
    };
    if (confirms[action] && !confirm(confirms[action])) return;
    act.mutate({ id: p.id, action }, {
      onSuccess: () => {
        toast.success(action === "reset-password" ? "Reset email sent" : "Done");
        if (action === "delete") setOpen(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <PageHeader
        title={mode === "shops" ? "Shops" : "People"}
        description={mode === "shops" ? "Every shop on Bosun: activity, verification and insurance." : "Every account: owners, shops and crew."}
        actions={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, shop, town" className={`${inputCls} sm:w-72`} />}
      />
      {people.error && <p className="mb-4 text-sm text-red-600">{String(people.error)}</p>}
      {mode === "people" && (
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {([["all", "All"], ["owner", "Owners"], ["vendor", "Shops"], ["not-onboarded", "Not onboarded"], ["suspended", "Suspended"], ["admin", "Admins"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={cn("text-xs font-medium rounded-full px-3 py-1.5 whitespace-nowrap border", filter === v ? "bg-primary text-primary-foreground border-primary" : "border-border bg-white hover:bg-muted")}>{l}</button>
          ))}
        </div>
      )}
      <Panel padded={false}>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">{mode === "shops" ? "Shop" : "Person"}</th>
              <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">{mode === "shops" ? "Owner" : "Role"}</th>
              <th className="text-left px-4 py-2.5 font-semibold hidden lg:table-cell">{mode === "shops" ? "Activity" : "On Bosun"}</th>
              <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Last sign-in</th>
              <th className="text-left px-4 py-2.5 font-semibold">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.id} onClick={() => setOpen(p)} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-foreground">{mode === "shops" ? p.shop?.businessName : p.name || "(no name)"}</p>
                  <p className="text-xs text-muted-foreground">{mode === "shops" ? p.shop?.phone || p.email : p.email}</p>
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{mode === "shops" ? p.name || p.email : p.shop ? `Shop · ${p.shop.businessName}` : "Owner"}</td>
                <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">
                  {p.shop ? `${p.shop.bids} bids · ${p.shop.won} won · ${p.shop.workOrders} WOs · last bid ${ago(p.shop.lastBidAt)}` : `${p.boats} boat${p.boats === 1 ? "" : "s"} · ${p.jobsPosted} job${p.jobsPosted === 1 ? "" : "s"} · joined ${when(p.createdAt)}`}
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{ago(p.lastSignIn)}</td>
                <td className="px-4 py-2.5"><Flags p={p} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{people.isLoading ? "Loading…" : "Nobody matches."}</td></tr>}
          </tbody>
        </table>
      </Panel>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (() => {
            const p = (people.data ?? []).find((x) => x.id === open.id) ?? open;
            const me = p.id === user?.id;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{p.name || p.email}</DialogTitle>
                  <DialogDescription>{p.email} · {p.shop ? `Shop: ${p.shop.businessName}` : "Boat owner"} · joined {when(p.createdAt)}</DialogDescription>
                </DialogHeader>
                <Flags p={p} />
                {!p.shop && <OwnerDetail id={p.id} />}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Last sign-in</dt><dd>{ago(p.lastSignIn)}</dd>
                  <dt className="text-muted-foreground">Location</dt><dd>{p.location || "—"}</dd>
                  {p.shop ? (
                    <>
                      <dt className="text-muted-foreground">Bids / won</dt><dd>{p.shop.bids} / {p.shop.won}{p.shop.bids ? ` (${Math.round((p.shop.won / p.shop.bids) * 100)}%)` : ""}</dd>
                      <dt className="text-muted-foreground">Work orders</dt><dd>{p.shop.workOrders}</dd>
                      <dt className="text-muted-foreground">Phone</dt><dd>{p.shop.phone || "—"}</dd>
                      <dt className="text-muted-foreground">Insurance</dt><dd>{p.shop.insured ? `on file${p.shop.insuranceExpiry ? `, expires ${when(p.shop.insuranceExpiry)}` : ""}` : "none"}</dd>
                    </>
                  ) : (
                    <>
                      <dt className="text-muted-foreground">Boats</dt><dd>{p.boats}</dd>
                      <dt className="text-muted-foreground">Jobs posted</dt><dd>{p.jobsPosted}</dd>
                    </>
                  )}
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  {p.shop && (p.shop.verifiedAt
                    ? <button className={btn} onClick={() => run(p, "unverify")}>Remove verification</button>
                    : <button className={cn(btn, "border-emerald-300 bg-emerald-50 text-emerald-800")} onClick={() => run(p, "verify")}>Verify shop</button>)}
                  {p.suspended
                    ? <button className={btn} onClick={() => run(p, "reinstate")}>Reinstate</button>
                    : <button className={cn(btn, "border-amber-300 bg-amber-50 text-amber-800")} disabled={me} onClick={() => run(p, "suspend")}>Suspend</button>}
                  {p.isAdmin
                    ? <button className={btn} disabled={me} onClick={() => run(p, "remove-admin")}>Remove admin</button>
                    : <button className={btn} onClick={() => run(p, "make-admin")}>Make admin</button>}
                  <button className={btn} onClick={() => run(p, "reset-password")}>Send password reset</button>
                  {p.shop && <Link to={`/vendor/${encodeURIComponent(p.shop.id)}`} className={btn} target="_blank">View public profile</Link>}
                  <button className={cn(btn, "text-red-600 ml-auto")} disabled={me} onClick={() => run(p, "delete")}>Delete account</button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** An owner's boats, what's been done to them and what they've spent. */
function OwnerDetail({ id }: { id: string }) {
  const d = useAdminPersonDetail(id);
  const [boat, setBoat] = useState<string | null>(null);
  if (d.isLoading) return <p className="text-xs text-muted-foreground">Loading boats and history…</p>;
  if (d.error) return <p className="text-xs text-red-600">{String(d.error)}</p>;
  if (!d.data) return null;
  const { boats, records, jobs, totals } = d.data;
  const shown = records.filter((r) => !boat || r.boatId === boat);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Boats</p><p className="text-lg font-bold tabular-nums">{boats.length}</p></div>
        <div className="rounded-lg border border-border px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Services logged</p><p className="text-lg font-bold tabular-nums">{totals.services}<span className="text-xs font-normal text-muted-foreground"> · {totals.verified} verified</span></p></div>
        <div className="rounded-lg border border-border px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Spend on record</p><p className="text-lg font-bold tabular-nums">{money(totals.spend)}</p>{totals.bosunSpend > 0 && <p className="text-[10px] text-muted-foreground">{money(totals.bosunSpend)} through Bosun</p>}</div>
      </div>
      {boats.length === 0 ? <p className="text-xs text-muted-foreground">No boats added yet.</p> : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {boats.map((b) => (
            <li key={b.id} className={cn("px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-slate-50", boat === b.id && "bg-sky-50")} onClick={() => setBoat(boat === b.id ? null : b.id)}>
              {b.photoUrl ? <img src={b.photoUrl} alt="" className="w-12 h-9 rounded object-cover shrink-0" /> : <div className="w-12 h-9 rounded bg-slate-100 shrink-0 flex items-center justify-center"><Anchor className="w-4 h-4 text-slate-400" /></div>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{b.label || "Boat"}{b.name && <span className="text-muted-foreground font-normal"> · {b.name}</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{[b.engines, b.lengthFt && `${b.lengthFt} ft`, b.homePort, b.hullId && `HIN ${b.hullId}`].filter(Boolean).join(" · ") || "No details"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{money(b.spend)}</p>
                <p className="text-[11px] text-muted-foreground">{b.services} service{b.services === 1 ? "" : "s"}{b.lastService ? ` · last ${when(b.lastService)}` : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {shown.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{boat ? "Work on this boat" : "Work history"}</p>
          <ul className="max-h-56 overflow-y-auto divide-y divide-border rounded-lg border border-border text-sm">
            {shown.slice(0, 50).map((r) => (
              <li key={r.id} className="px-3 py-1.5 flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{when(r.date)}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}{r.vendor && <span className="text-muted-foreground"> · {r.vendor}</span>}</span>
                <span className={cn("text-[10px] font-semibold uppercase", r.source === "owner" ? "text-slate-400" : "text-emerald-700")}>{r.source === "owner" ? "owner" : "verified"}</span>
                <span className="tabular-nums w-20 text-right">{r.cost != null ? money(Number(r.cost)) : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {jobs.length > 0 && (
        <p className="text-xs text-muted-foreground">{jobs.length} job{jobs.length === 1 ? "" : "s"} posted on Bosun · {jobs.filter((j) => j.acceptedPrice != null).length} awarded · {jobs.filter((j) => j.bids === 0).length} with no bids</p>
      )}
    </div>
  );
}

function Flags({ p }: { p: AdminPerson }) {
  const f: { t: string; c: string }[] = [];
  if (p.isAdmin) f.push({ t: "Admin", c: "bg-[#052443] text-white border-transparent" });
  if (p.suspended) f.push({ t: "Suspended", c: "bg-red-50 text-red-700 border-red-200" });
  if (!p.emailConfirmed) f.push({ t: "Email unconfirmed", c: "bg-slate-100 text-slate-600 border-slate-200" });
  if (!p.onboardingComplete) f.push({ t: "Not onboarded", c: "bg-amber-50 text-amber-700 border-amber-200" });
  if (p.shop?.verifiedAt) f.push({ t: "Verified", c: "bg-emerald-50 text-emerald-700 border-emerald-200" });
  if (p.shop && p.shop.insuranceExpiry && p.shop.insuranceExpiry < new Date().toLocaleDateString("en-CA")) f.push({ t: "COI expired", c: "bg-red-50 text-red-700 border-red-200" });
  if (p.shop && p.shop.bids === 0) f.push({ t: "No bids yet", c: "bg-slate-100 text-slate-600 border-slate-200" });
  return <div className="flex flex-wrap gap-1">{f.map((x) => <span key={x.t} className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5 border whitespace-nowrap", x.c)}>{x.t}</span>)}</div>;
}

/* ── Demand ───────────────────────────────────────────────────────────────── */

function Demand() {
  const demand = useAdminDemand();
  const projects = demand.data ?? [];
  const cells = useMemo(() => demandCells(projects), [projects]);
  const [pick, setPick] = useState<DemandCell | null>(null);
  const inCell = pick ? projects.filter((p) => demandCells([p])[0]?.area === pick.area && (p.category?.trim() || "General") === pick.category) : [];
  return (
    <>
      <PageHeader title="Demand" description="Jobs owners have posted, grouped by area and trade. Thin = no bid or a single shop. Recruit where it's thin and busy." />
      {demand.error && <p className="mb-4 text-sm text-red-600">{String(demand.error)}</p>}
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel padded={false} className="lg:col-span-3">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr><th className="text-left px-4 py-2.5 font-semibold">Area · trade</th><th className="text-right px-3 py-2.5 font-semibold">Jobs</th><th className="text-right px-3 py-2.5 font-semibold">Thin</th><th className="text-right px-3 py-2.5 font-semibold">30d</th><th className="text-right px-3 py-2.5 font-semibold">Shops</th><th className="text-right px-4 py-2.5 font-semibold">Score</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cells.map((c) => (
                <tr key={`${c.area}|${c.category}`} onClick={() => setPick(c)} className={cn("cursor-pointer hover:bg-slate-50", pick === c && "bg-sky-50")}>
                  <td className="px-4 py-2.5"><span className="font-medium">{c.area}</span><span className="text-muted-foreground"> · {c.category}</span></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.jobs}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", c.thin && "text-amber-700 font-semibold")}>{c.thin}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.recentJobs}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.shopsBidding}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{c.score}</td>
                </tr>
              ))}
              {cells.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{demand.isLoading ? "Loading…" : "No jobs posted yet."}</td></tr>}
            </tbody>
          </table>
        </Panel>
        <Panel padded={false} className="lg:col-span-2">
          <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-semibold">{pick ? `${pick.area} · ${pick.category}` : "Pick a row"}</h2></div>
          {pick ? (
            <ul className="divide-y divide-border">
              {inCell.map((p) => (
                <li key={p.id} className="px-5 py-2.5 text-sm">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{when(p.createdAt)} · {p.status} · {p.bids} bid{p.bids === 1 ? "" : "s"} from {p.bidders} shop{p.bidders === 1 ? "" : "s"}</p>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-4 text-sm text-muted-foreground">The jobs behind a row show here. Use them as the pitch when you call a shop in that area.</p>}
        </Panel>
      </div>
    </>
  );
}

/* ── Prospects ────────────────────────────────────────────────────────────── */

function Prospects() {
  const { profile } = useAuth();
  const data = useAdminProspects();
  const demand = useAdminDemand();
  const update = useUpdateProspect();
  const create = useCreateProspect();
  const search = useSearchProspects();
  const draft = useDraftOutreach();
  const cells = useMemo(() => demandCells(demand.data ?? []), [demand.data]);
  const [status, setStatus] = useState<"all" | ProspectStatus | "due">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<PickedLocation | null>(null);
  const [radius, setRadius] = useState(25);
  const [trades, setTrades] = useState<string[]>(PROSPECT_TRADES.slice(0, 4).map((t) => t.key));
  const [draftText, setDraftText] = useState<{ subject: string; email: string; text: string } | null>(null);
  const [newP, setNewP] = useState({ name: "", phone: "", website: "", address: "", area: "", notes: "" });

  const today = new Date().toLocaleDateString("en-CA");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data.data?.prospects ?? [])
      .map((p) => ({ ...p, ...prospectScore(p, cells) }))
      .filter((p) => status === "all" ? true : status === "due" ? !!p.nextFollowUp && p.nextFollowUp <= today && !["onboarded", "declined", "not-a-fit"].includes(p.status) : p.status === status)
      .filter((p) => !needle || [p.name, p.address, p.area, p.phone, p.trades.join(" ")].some((f) => f.toLowerCase().includes(needle)))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.reviewCount - a.reviewCount);
  }, [data.data, cells, status, q, today]);
  const current = open ? rows.find((p) => p.id === open) ?? (data.data?.prospects ?? []).find((p) => p.id === open) ?? null : null;

  const demandLines = (p: Prospect) =>
    cells
      .filter((c) => c.lat != null && c.lng != null && p.lat != null && p.lng != null && Math.hypot((c.lat - p.lat) * 69, (c.lng - p.lng) * 60) <= 25)
      .slice(0, 4)
      .map((c) => `${c.jobs} ${c.category.toLowerCase()} job${c.jobs === 1 ? "" : "s"} near ${c.area}${c.thin ? `, ${c.thin} with no shop bidding` : ""}`);

  const exportCsv = () => {
    const head = ["Name", "Status", "Score", "Phone", "Website", "Address", "Area", "Trades", "Rating", "Reviews", "Next follow-up", "Notes"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [head, ...rows.map((p) => [p.name, p.status, p.score, p.phone, p.website, p.address, p.area, p.trades.join("; "), p.rating ?? "", p.reviewCount, p.nextFollowUp ?? "", p.notes])].map((r) => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `bosun-prospects-${today}.csv`;
    a.click();
  };

  return (
    <>
      <PageHeader
        title="Shop prospects"
        description="Marine shops near open demand, ranked by how worth a call they are. Statuses and notes are shared with the team."
        actions={
          <>
            <button onClick={() => setSearching(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground"><Search className="w-4 h-4" /> Find shops</button>
            <button onClick={() => setAdding(true)} className={btn + " py-2 text-sm"}>Add by hand</button>
            <button onClick={exportCsv} className={btn + " py-2 text-sm"} disabled={rows.length === 0}>Export CSV</button>
          </>
        }
      />
      {data.error && <p className="mb-4 text-sm text-red-600">{String(data.error)}</p>}
      {data.data && !data.data.placesConfigured && (
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Shop search needs a server-side Google key: add <code>GOOGLE_PLACES_SERVER_KEY</code> in Vercel (a key with Places API (New) enabled and no website restriction). Adding by hand works now.
        </p>
      )}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {([["all", "All"], ["due", "Follow-up due"], ...PROSPECT_STATUSES.map((s) => [s.value, s.label])] as [typeof status, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)} className={cn("text-xs font-medium rounded-full px-3 py-1.5 whitespace-nowrap border", status === v ? "bg-primary text-primary-foreground border-primary" : "border-border bg-white hover:bg-muted")}>{l}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, area, trade" className={`${inputCls} sm:ml-auto sm:w-64`} />
      </div>
      <Panel padded={false}>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr><th className="text-left px-4 py-2.5 font-semibold">Shop</th><th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Area · trades</th><th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Google</th><th className="text-left px-3 py-2.5 font-semibold">Status</th><th className="text-right px-4 py-2.5 font-semibold">Score</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.id} onClick={() => setOpen(p.id)} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-2.5"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.phone || p.website || p.address}</p></td>
                <td className="px-3 py-2.5 hidden md:table-cell text-xs text-muted-foreground">{p.area}{p.trades.length ? ` · ${p.trades.join(", ")}` : ""}{p.nearbyThinJobs ? <span className="block text-amber-700 font-medium">{p.nearbyThinJobs} thin jobs within 25 mi</span> : null}</td>
                <td className="px-3 py-2.5 hidden sm:table-cell text-xs text-muted-foreground">{p.rating != null ? `★ ${p.rating} (${p.reviewCount})` : "—"}</td>
                <td className="px-3 py-2.5"><StatusPill s={p.status} />{p.nextFollowUp && p.nextFollowUp <= today && <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">Follow up</span>}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{p.score}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{data.isLoading ? "Loading…" : "No prospects yet. Find shops around an area, or add one by hand."}</td></tr>}
          </tbody>
        </table>
      </Panel>

      {/* Find shops */}
      <Dialog open={searching} onOpenChange={setSearching}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Find shops near an area</DialogTitle><DialogDescription>Searches Google for marine businesses and files the new ones here. Shops already on Bosun are marked onboarded.</DialogDescription></DialogHeader>
          <LocationPicker value={place} onChange={setPlace} placeholder="Town or marina to search around" confirmLabel="Search around here" />
          <div className="flex items-center gap-3 text-sm">
            <label className="text-muted-foreground">Within</label>
            <select className={`${inputCls} w-28`} value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{[10, 15, 25, 30].map((m) => <option key={m} value={m}>{m} miles</option>)}</select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROSPECT_TRADES.map((t) => (
              <button key={t.key} onClick={() => setTrades((xs) => xs.includes(t.key) ? xs.filter((x) => x !== t.key) : [...xs, t.key])} className={cn("text-xs rounded-full px-2.5 py-1 border", trades.includes(t.key) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-white")}>{t.key}</button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button className={btn + " py-2 text-sm"} onClick={() => setSearching(false)}>Cancel</button>
            <button
              disabled={!place || trades.length === 0 || search.isPending}
              onClick={() => place && search.mutate({ area: place.label, lat: place.lat, lng: place.lng, radiusMiles: radius, trades }, {
                onSuccess: (r) => { toast.success(`${r.found} shops found, ${r.added} new`); setSearching(false); },
                onError: (e) => toast.error(e.message),
              })}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              {search.isPending ? "Searching…" : "Search"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add by hand */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add a prospect</DialogTitle></DialogHeader>
          {(["name", "phone", "website", "address", "area", "notes"] as const).map((k) => (
            <div key={k}><label className="block text-xs font-semibold text-muted-foreground mb-1 capitalize">{k}</label><input className={inputCls} value={newP[k]} onChange={(e) => setNewP({ ...newP, [k]: e.target.value })} /></div>
          ))}
          <div className="flex justify-end gap-2">
            <button className={btn + " py-2 text-sm"} onClick={() => setAdding(false)}>Cancel</button>
            <button disabled={!newP.name.trim() || create.isPending} onClick={() => create.mutate(newP, { onSuccess: () => { setAdding(false); setNewP({ name: "", phone: "", website: "", address: "", area: "", notes: "" }); }, onError: (e) => toast.error(e.message) })} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50">Add</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prospect detail */}
      <Dialog open={!!current} onOpenChange={(o) => { if (!o) { setOpen(null); setDraftText(null); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle>{current.name}</DialogTitle>
                <DialogDescription>{[current.address, current.rating != null && `★ ${current.rating} (${current.reviewCount} reviews)`].filter(Boolean).join(" · ")}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 text-sm">
                {current.phone && <a href={`tel:${current.phone}`} className={btn}>Call {current.phone}</a>}
                {current.website && <a href={current.website} target="_blank" rel="noreferrer" className={btn}>Website</a>}
                {current.lat != null && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(current.name + " " + current.address)}`} target="_blank" rel="noreferrer" className={btn}>Map</a>}
              </div>
              {demandLines(current).length > 0 && (
                <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900">
                  <p className="font-semibold mb-1">Why call them</p>
                  <ul className="list-disc pl-4 space-y-0.5">{demandLines(current).map((l) => <li key={l}>{l}</li>)}</ul>
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select className={inputCls} value={current.status} onChange={(e) => update.mutate({ id: current.id, status: e.target.value as ProspectStatus }, { onError: (er) => toast.error(er.message) })}>
                    {PROSPECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Next follow-up</label>
                  <input type="date" className={inputCls} value={current.nextFollowUp ?? ""} onChange={(e) => update.mutate({ id: current.id, nextFollowUp: e.target.value || null })} /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Owner</label>
                  <input className={inputCls} defaultValue={current.assignedTo} placeholder={profile?.name ?? "Who's on it"} onBlur={(e) => e.target.value !== current.assignedTo && update.mutate({ id: current.id, assignedTo: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                <textarea className={inputCls} rows={3} defaultValue={current.notes} placeholder="Who you spoke to, what they said, what's next" onBlur={(e) => e.target.value !== current.notes && update.mutate({ id: current.id, notes: e.target.value })} /></div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-sky-600" /> Outreach draft</p>
                  <button className={btn} disabled={draft.isPending} onClick={() => draft.mutate({ id: current.id, demand: demandLines(current), sender: profile?.name }, { onSuccess: setDraftText, onError: (e) => toast.error(e.message) })}>{draft.isPending ? "Writing…" : draftText ? "Rewrite" : "Write email + text"}</button>
                </div>
                {draftText && (
                  <div className="mt-3 space-y-3 text-sm">
                    <CopyBlock label={`Email · ${draftText.subject}`} text={`Subject: ${draftText.subject}\n\n${draftText.email}`} />
                    <CopyBlock label="Text message" text={draftText.text} />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <button className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy className="w-3 h-3" /> Copy</button></div>
      <pre className="whitespace-pre-wrap font-sans text-sm bg-slate-50 border border-border rounded-lg p-3">{text}</pre>
    </div>
  );
}

function StatusPill({ s }: { s: ProspectStatus }) {
  const c: Record<ProspectStatus, string> = {
    new: "bg-slate-100 text-slate-700 border-slate-200",
    contacted: "bg-sky-50 text-sky-700 border-sky-200",
    interested: "bg-amber-50 text-amber-700 border-amber-200",
    onboarded: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-red-50 text-red-700 border-red-200",
    "not-a-fit": "bg-slate-100 text-slate-500 border-slate-200",
  };
  return <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5 border whitespace-nowrap", c[s])}>{PROSPECT_STATUSES.find((x) => x.value === s)?.label}</span>;
}

/* ── AI usage ─────────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<AiStatus, string> = { pending: "in flight", ok: "read", failed: "failed", cached: "reused", denied: "over limit" };

function AiUsage() {
  const q = useAdminAiUsage();
  const d = q.data;
  const s = d?.summary;
  const flagged = s?.spenders.filter((p) => p.flagged) ?? [];
  const who = (id: string) => d?.people[id]?.name || d?.people[id]?.email || id.slice(0, 8);
  return (
    <>
      <PageHeader title="AI usage" description="Every Claude call Bosun pays for: invoice and receipt reads, service schedules and outreach drafts. Each account has a daily and monthly allowance." />
      {q.error && <p className="mb-4 text-sm text-red-600">{String(q.error)}</p>}
      {d && !d.configured && <p className="mb-4 text-sm text-amber-700">ANTHROPIC_API_KEY isn't set on the server, so nothing is being read right now.</p>}
      {flagged.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{flagged.length} account{flagged.length === 1 ? "" : "s"} worth a look</p>
            <p className="text-xs mt-0.5">Hit a limit today, or past {usd(AI_ALERT_USD_30D)} of reads in 30 days: {flagged.slice(0, 5).map((p) => who(p.userId)).join(", ")}{flagged.length > 5 ? "…" : ""}. Suspend from People if it's not a real owner.</p>
          </div>
        </div>
      )}
      <StatGrid className="sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Sparkles />} label="Today" value={s ? usd(s.today.cost) : "—"} sub={s ? `${s.today.calls} reads` : ""} />
        <StatTile icon={<Sparkles />} label="Last 30 days" value={s ? usd(s.month.cost) : "—"} sub={s ? `${s.month.calls} reads · ${s.month.cached} reused for free` : ""} />
        <StatTile icon={<AlertTriangle />} label="Over limit today" value={s?.today.denied ?? "—"} tone={s?.today.denied ? "warn" : "default"} sub="requests turned away" />
        <StatTile icon={<Users />} label="Accounts using AI" value={s?.spenders.length ?? "—"} sub="in 30 days" />
      </StatGrid>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Panel padded={false} className="lg:col-span-2">
          <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-semibold">Top accounts, 30 days</h2></div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr>
              <th className="text-left px-5 py-2 font-semibold">Account</th>
              <th className="text-right px-3 py-2 font-semibold">Today</th>
              <th className="text-right px-3 py-2 font-semibold">30d reads</th>
              <th className="text-right px-3 py-2 font-semibold">30d cost</th>
              <th className="text-left px-5 py-2 font-semibold hidden sm:table-cell">Last</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {(s?.spenders ?? []).slice(0, 40).map((p) => (
                <tr key={p.userId} className={cn(p.flagged && "bg-amber-50/60")}>
                  <td className="px-5 py-2 min-w-0"><span className="font-medium">{who(p.userId)}</span>{p.flagged && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-700">flag</span>}{d?.people[p.userId]?.name && <span className="block text-xs text-muted-foreground truncate">{d.people[p.userId].email}</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.callsToday}{p.deniedToday ? <span className="text-amber-700"> +{p.deniedToday} denied</span> : null}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.calls30d}{p.cached30d ? <span className="text-muted-foreground text-xs"> ({p.cached30d} reused)</span> : null}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{usd(p.cost30d)}</td>
                  <td className="px-5 py-2 text-muted-foreground hidden sm:table-cell">{ago(p.lastAt)}</td>
                </tr>
              ))}
              {(s?.spenders ?? []).length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">{q.isLoading ? "Loading…" : "No AI reads in the last 30 days."}</td></tr>}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-5">
          <Panel padded={false}>
            <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-semibold">By feature, 30 days</h2></div>
            <ul className="divide-y divide-border">
              {(s?.byKind ?? []).map((k) => (
                <li key={k.kind} className="px-5 py-2.5 text-sm flex items-center justify-between gap-3"><span>{AI_KIND_LABELS[k.kind]}</span><span className="text-muted-foreground tabular-nums">{k.calls30d} · {usd(k.cost30d)}</span></li>
              ))}
              {(s?.byKind ?? []).length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">Nothing yet.</li>}
            </ul>
          </Panel>
          <Panel padded={false}>
            <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-semibold">Limits per account</h2></div>
            <ul className="divide-y divide-border">
              {(d?.limits ?? []).map((l) => (
                <li key={l.kind} className="px-5 py-2.5 text-sm flex items-center justify-between gap-3"><span>{AI_KIND_LABELS[l.kind]}</span><span className="text-muted-foreground tabular-nums">{l.perDay}/day · {l.perMonth}/month</span></li>
              ))}
            </ul>
            <p className="px-5 py-2.5 text-xs text-muted-foreground border-t border-border">Change them in the ai_limits table; they apply on the next request.</p>
          </Panel>
        </div>
      </div>
      <Panel padded={false} className="mt-5">
        <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-semibold">Recent</h2></div>
        <ul className="divide-y divide-border">
          {(d?.recent ?? []).map((r) => (
            <li key={r.id} className="px-5 py-2 text-sm flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              <span className="min-w-0 flex-1 truncate"><span className="font-medium">{r.userId ? who(r.userId) : "system"}</span> · {AI_KIND_LABELS[r.kind]} · <span className={cn(r.status === "denied" && "text-amber-700 font-semibold", r.status === "failed" && "text-red-600")}>{STATUS_LABEL[r.status]}</span>{r.note ? <span className="text-muted-foreground"> · {r.note}</span> : null}</span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{r.status === "ok" || r.status === "failed" ? `${(r.inputTokens + r.outputTokens).toLocaleString()} tok · ${usd(r.costUsd)}` : ""}</span>
            </li>
          ))}
          {(d?.recent ?? []).length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground text-center">{q.isLoading ? "Loading…" : "Nothing yet."}</li>}
        </ul>
      </Panel>
    </>
  );
}

/* ── Audit ────────────────────────────────────────────────────────────────── */

function Audit() {
  const audit = useAdminAudit();
  return (
    <>
      <PageHeader title="Audit log" description="Everything the team has done here." />
      <Panel padded={false}>
        <ul className="divide-y divide-border">
          {(audit.data ?? []).map((e) => (
            <li key={e.id} className="px-5 py-2.5 text-sm flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              <span className="min-w-0 flex-1 truncate"><span className="font-medium">{e.admin}</span> · {e.action} · {e.targetLabel}{Object.keys(e.detail ?? {}).length ? <span className="text-muted-foreground"> · {JSON.stringify(e.detail)}</span> : null}</span>
            </li>
          ))}
          {(audit.data ?? []).length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground text-center">{audit.isLoading ? "Loading…" : "Nothing yet."}</li>}
        </ul>
      </Panel>
    </>
  );
}
