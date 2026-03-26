import { useState, useRef } from "react";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { getAllVendorProfiles } from "@/data/vendorProfileUtils";
import {
  getVendorClients,
  getVendorBoatHistory,
  getMaintenanceReminders,
  generateQuickInvoice,
  getVendorScorecard,
  VendorClient,
  VendorBoatService,
  MaintenanceReminder,
  QuickInvoice,
} from "@/data/vendorRetentionUtils";
import { resizePhoto, getProjectPhotos, addProjectPhoto, removeProjectPhoto } from "@/lib/photoUtils";

type Tab = "clients" | "history" | "reminders";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "clients", label: "Clients", icon: "👤" },
  { key: "history", label: "Service History", icon: "🔧" },
  { key: "reminders", label: "Reminders", icon: "🔔" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function VendorBusinessHub() {
  const { vendorId } = useRole();
  const [activeTab, setActiveTab] = useState<Tab>("clients");
  const [expandedBoats, setExpandedBoats] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const vendor = vendorId ? getAllVendorProfiles()[vendorId] : null;

  if (!vendor || !vendorId) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-muted-foreground">Switch to vendor mode to access the Business Hub.</p>
        </main>
      </>
    );
  }

  const clients = getVendorClients(vendorId);
  const boatHistory = getVendorBoatHistory(vendorId);
  const reminders = getMaintenanceReminders(vendorId);

  const q = search.toLowerCase().trim();

  const filteredClients = q
    ? clients.filter(
        (c) =>
          c.ownerName.toLowerCase().includes(q) ||
          c.boats.some(
            (b) =>
              b.name.toLowerCase().includes(q) ||
              b.label.toLowerCase().includes(q) ||
              b.services.some((s) => s.title.toLowerCase().includes(q))
          )
      )
    : clients;

  // Flatten all services from all boats into a chronological list for the history tab
  const allServices: (VendorBoatService & { boatName: string; boatLabel: string })[] = [];
  for (const boat of boatHistory) {
    for (const svc of boat.services) {
      if (!svc.isOtherVendor) {
        allServices.push({ ...svc, boatName: boat.name, boatLabel: boat.label });
      }
    }
  }
  allServices.sort((a, b) => {
    try {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } catch {
      return 0;
    }
  });

  const filteredServices = q
    ? allServices.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.boatName.toLowerCase().includes(q) ||
          (s.category?.toLowerCase().includes(q) ?? false)
      )
    : allServices;

  const filteredReminders = q
    ? reminders.filter(
        (r) =>
          r.boatName.toLowerCase().includes(q) ||
          r.boatLabel.toLowerCase().includes(q) ||
          r.lastService.toLowerCase().includes(q) ||
          r.suggestedFollowUp.toLowerCase().includes(q) ||
          (r.category?.toLowerCase().includes(q) ?? false)
      )
    : reminders;

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSearch("");
  }

  function toggleBoat(boatName: string) {
    setExpandedBoats((prev) => {
      const next = new Set(prev);
      if (next.has(boatName)) next.delete(boatName);
      else next.add(boatName);
      return next;
    });
  }

  return (
    <div className="pb-16 md:pb-0">
      <Header />
      {/* ── Greeting ───────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 ring-2 ring-sky-200">
            <span className="text-sm font-bold text-sky-700">{vendor.initials}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              Welcome back, {vendor.name.split(" ")[0]}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{vendor.serviceArea}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
            <svg className="w-3.5 h-3.5 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-foreground">{vendor.rating}</span>
            <span className="hidden sm:inline">· {vendor.completedJobs} jobs</span>
          </div>
        </div>
      </div>

      {/* ── Performance Scorecard ────────────────────────────── */}
      {(() => {
        const scorecard = getVendorScorecard(vendorId);
        return (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              <div className={`rounded-lg border p-3 flex flex-col items-center justify-center text-center ${scorecard.tier.badgeColor}`}>
                <span className="text-lg mb-0.5">
                  {scorecard.tier.name === "Gold" ? "🥇" : scorecard.tier.name === "Silver" ? "🥈" : "🥉"}
                </span>
                <span className="text-xs font-bold">{scorecard.tier.name} Tier</span>
                <span className="text-[10px] opacity-70">{Math.round(scorecard.tier.feeRate * 100)}% fee</span>
              </div>
              <div className="rounded-lg border border-border bg-white p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-foreground">{Math.round(scorecard.bidWinRate)}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Win Rate</p>
                <p className="text-[10px] text-muted-foreground">{scorecard.acceptedBids}/{scorecard.totalBids} bids</p>
              </div>
              <div className="rounded-lg border border-border bg-white p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-foreground">{Math.round(scorecard.completionRate)}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Completion</p>
                <p className="text-[10px] text-muted-foreground">{scorecard.completedJobs} jobs done</p>
              </div>
              <div className="rounded-lg border border-border bg-white p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{scorecard.averageRating.toFixed(1)}</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Avg Rating</p>
              </div>
              <div className="rounded-lg border border-border bg-white p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-lg sm:text-xl font-bold text-foreground">{Math.round(scorecard.repeatClientRate)}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Repeat Clients</p>
                <p className="text-[10px] text-muted-foreground">{scorecard.repeatClients}/{scorecard.uniqueClients} boats</p>
              </div>
            </div>
          </div>
        );
      })()}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Page header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">Business Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your clients, service history, and maintenance reminders
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-sky-500 text-sky-700"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.key === "reminders" && reminders.filter((r) => r.urgency !== "ok").length > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {reminders.filter((r) => r.urgency !== "ok").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative mb-5">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "clients" ? "Search clients, boats, or services…" :
              activeTab === "history" ? "Search services or boats…" :
              "Search reminders…"
            }
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-border rounded-lg bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "clients" && (
          <ClientsTab clients={filteredClients} expandedBoats={expandedBoats} toggleBoat={toggleBoat} search={q} vendorId={vendorId} />
        )}
        {activeTab === "history" && (
          <HistoryTab services={filteredServices} search={q} vendorId={vendorId} />
        )}
        {activeTab === "reminders" && <RemindersTab reminders={filteredReminders} search={q} />}
      </main>
    </div>
  );
}

// ── Clients Tab ─────────────────────────────────────────────────────────────

function ClientsTab({
  clients,
  expandedBoats,
  toggleBoat,
  search,
  vendorId,
}: {
  clients: VendorClient[];
  expandedBoats: Set<string>;
  toggleBoat: (name: string) => void;
  search: string;
  vendorId: string;
}) {
  const [selectedInvoice, setSelectedInvoice] = useState<{ invoice: QuickInvoice; projectId: string } | null>(null);

  if (clients.length === 0) {
    return search
      ? <EmptyState message={`No clients or services match "${search}".`} />
      : <EmptyState message="No clients yet. Complete your first job to see clients here." />;
  }

  function handleServiceClick(svc: VendorBoatService) {
    if (svc.isOtherVendor || svc.status !== "paid" || !svc.bidId) return;
    const inv = generateQuickInvoice(vendorId, svc.projectId, svc.bidId);
    if (inv) setSelectedInvoice({ invoice: inv, projectId: svc.projectId });
  }

  return (
    <>
      <div className="space-y-4">
        {clients.map((client) => (
          <div key={client.ownerName} className="border border-border rounded-lg overflow-hidden">
            {/* Client header */}
            <div className="px-5 py-4 bg-slate-50/50 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">
                      {client.ownerName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{client.ownerName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {client.totalJobs} {client.totalJobs === 1 ? "job" : "jobs"} · {client.boats.length} boat{client.boats.length !== 1 ? "s" : ""} · Since {client.firstJobDate}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{fmt(client.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">lifetime revenue</p>
                </div>
              </div>
            </div>

            {/* Boats */}
            <div className="divide-y divide-border">
              {client.boats.map((boat) => {
                const isOpen = search ? true : expandedBoats.has(boat.name);
                return (
                  <div key={boat.name}>
                    <button
                      onClick={() => toggleBoat(boat.name)}
                      className="w-full text-left px-5 py-3 hover:bg-muted/40 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">⛵</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{boat.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{boat.label} · {boat.propulsion}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{boat.services.length} {boat.services.length === 1 ? "job" : "jobs"}</span>
                        <svg
                          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-3 space-y-1.5">
                        {boat.services.map((svc, idx) => {
                          const canInvoice = !svc.isOtherVendor && svc.status === "paid" && !!svc.bidId;
                          return (
                            <div
                              key={idx}
                              onClick={() => canInvoice && handleServiceClick(svc)}
                              className={`flex items-center justify-between py-1.5 px-3 rounded text-sm ${
                                svc.isOtherVendor
                                  ? "bg-slate-50 border border-dashed border-border/60"
                                  : canInvoice
                                  ? "bg-muted/30 cursor-pointer hover:bg-sky-50 hover:border-sky-200 border border-transparent transition-colors"
                                  : "bg-muted/30"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className={svc.isOtherVendor ? "text-muted-foreground" : "text-foreground"}>{svc.title}</span>
                                <span className="text-muted-foreground ml-2 text-xs">{svc.date}</span>
                                {svc.isOtherVendor && (
                                  <span className="ml-2 text-[10px] text-muted-foreground/70 bg-slate-100 px-1.5 py-0.5 rounded">other vendor</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`font-medium ${svc.isOtherVendor ? "text-muted-foreground" : ""}`}>{fmt(svc.price)}</span>
                                <StatusBadge status={svc.status} />
                                {canInvoice && (
                                  <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Invoice modal overlay */}
      {selectedInvoice && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setSelectedInvoice(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <InvoicePreview invoice={selectedInvoice.invoice} projectId={selectedInvoice.projectId} onClose={() => setSelectedInvoice(null)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Service History Tab ─────────────────────────────────────────────────────

function HistoryTab({
  services,
  search,
  vendorId,
}: {
  services: (VendorBoatService & { boatName: string; boatLabel: string })[];
  search: string;
  vendorId: string;
}) {
  const [selectedInvoice, setSelectedInvoice] = useState<{ invoice: QuickInvoice; projectId: string } | null>(null);

  if (services.length === 0) {
    return search
      ? <EmptyState message={`No services match "${search}".`} />
      : <EmptyState message="No service history yet." />;
  }

  function handleServiceClick(svc: VendorBoatService) {
    if (svc.status !== "paid" || !svc.bidId) return;
    const inv = generateQuickInvoice(vendorId, svc.projectId, svc.bidId);
    if (inv) setSelectedInvoice({ invoice: inv, projectId: svc.projectId });
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Column header */}
        <div className="hidden sm:grid grid-cols-[1fr_120px_100px_80px_80px] gap-2 px-5 py-2 text-xs text-muted-foreground font-medium bg-muted/20 border-b border-border">
          <span>Service</span>
          <span>Boat</span>
          <span className="text-right">Date</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Status</span>
        </div>
        <div className="divide-y divide-border/50">
          {services.map((svc, idx) => {
            const canInvoice = svc.status === "paid" && !!svc.bidId;
            return (
              <div
                key={idx}
                onClick={() => canInvoice && handleServiceClick(svc)}
                className={`sm:grid grid-cols-[1fr_120px_100px_80px_80px] gap-2 px-5 py-3 text-sm items-center transition-colors ${
                  canInvoice ? "cursor-pointer hover:bg-sky-50" : "hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {svc.category && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hidden sm:inline flex-shrink-0">
                      {svc.category}
                    </span>
                  )}
                  <span className="text-foreground truncate">{svc.title}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate sm:text-sm">{svc.boatName}</p>
                </div>
                <span className="text-muted-foreground text-xs sm:text-sm sm:text-right">{svc.date}</span>
                <span className="font-medium sm:text-right">{fmt(svc.price)}</span>
                <div className="sm:text-right flex items-center justify-end gap-1.5">
                  <StatusBadge status={svc.status} />
                  {canInvoice && (
                    <svg className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice modal overlay */}
      {selectedInvoice && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setSelectedInvoice(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <InvoicePreview invoice={selectedInvoice.invoice} projectId={selectedInvoice.projectId} onClose={() => setSelectedInvoice(null)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Invoice Preview (reused from former Invoices tab) ───────────────────────

function generateInvoicePDF(invoice: QuickInvoice): Promise<Blob> {
  return import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 50;
    const colRight = pageW - margin;
    let y = 50;

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(invoice.invoiceNumber, margin, y + 16);

    // Vendor name top-right
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(invoice.vendorName, colRight, y, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(invoice.vendorServiceArea, colRight, y + 14, { align: "right" });

    y += 50;
    doc.setDrawColor(220);
    doc.line(margin, y, colRight, y);
    y += 20;

    // From / Bill To
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("FROM", margin, y);
    doc.text("BILL TO", pageW / 2 + 20, y);
    y += 14;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.vendorName, margin, y);
    doc.text(invoice.ownerName, pageW / 2 + 20, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(invoice.vendorServiceArea, margin, y);
    if (invoice.boatName) {
      doc.text(`${invoice.boatLabel} — "${invoice.boatName}"`, pageW / 2 + 20, y);
    }

    y += 28;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Service date: ${invoice.projectDate}`, margin, y);
    y += 24;

    // Line items table header
    const col1 = margin;
    const col2 = colRight - 170;
    const col3 = colRight - 110;
    const col4 = colRight;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin - 8, y - 10, colRight - margin + 16, 20, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100);
    doc.text("Description", col1, y);
    doc.text("Qty", col2, y, { align: "right" });
    doc.text("Rate", col3, y, { align: "right" });
    doc.text("Amount", col4, y, { align: "right" });
    y += 18;

    // Line items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const item of invoice.items) {
      doc.setTextColor(30);
      doc.text(item.description, col1, y);
      doc.setTextColor(100);
      doc.text(String(item.quantity), col2, y, { align: "right" });
      doc.text(fmt(item.unitPrice), col3, y, { align: "right" });
      doc.setTextColor(30);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(item.quantity * item.unitPrice), col4, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 18;
      doc.setDrawColor(235);
      doc.line(margin - 8, y - 6, colRight + 8, y - 6);
    }

    y += 10;
    doc.setDrawColor(200);
    doc.line(col3 - 60, y, colRight, y);
    y += 22;

    // Total (owner-facing — no Bosun fee shown)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("Total", col3 - 60, y);
    doc.text(fmt(invoice.subtotal), col4, y, { align: "right" });

    // Footer
    y = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(170);
    doc.text("Generated by Bosun — Your Boating Partner", pageW / 2, y, { align: "center" });

    return doc.output("blob");
  });
}

function InvoicePreview({ invoice, projectId, onClose }: { invoice: QuickInvoice; projectId: string; onClose: () => void }) {
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<"email" | "text" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(() => getProjectPhotos(projectId));

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await resizePhoto(file);
      addProjectPhoto(projectId, dataUrl);
    }
    setPhotos(getProjectPhotos(projectId));
    e.target.value = "";
  }

  function handleRemovePhoto(index: number) {
    removeProjectPhoto(projectId, index);
    setPhotos(getProjectPhotos(projectId));
  }

  async function handleSend(method: "email" | "text") {
    setSending(true);
    setSendMenuOpen(false);
    try {
      const blob = await generateInvoicePDF(invoice);
      const filename = `${invoice.invoiceNumber}.pdf`;

      if (method === "email") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} — ${invoice.projectTitle}`);
        const body = encodeURIComponent(
          `Hi ${invoice.ownerName},\n\nPlease find attached the invoice for "${invoice.projectTitle}" completed on ${invoice.projectDate}.\n\nAmount due: ${fmt(invoice.subtotal)}\n\nThank you for your business!\n\n${invoice.vendorName}`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        const smsBody = encodeURIComponent(
          `Hi ${invoice.ownerName} — here's your invoice for "${invoice.projectTitle}" (${fmt(invoice.subtotal)}). PDF is attached. Thanks! — ${invoice.vendorName}`
        );
        window.open(`sms:?body=${smsBody}`, "_blank");
      }

      setSent(method);
      setTimeout(() => setSent(null), 3000);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-border rounded-lg bg-white shadow-xl">
      {/* Invoice header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{invoice.invoiceNumber}</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{invoice.projectTitle}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Vendor & client info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground mb-1">From</p>
            <p className="font-medium text-foreground">{invoice.vendorName}</p>
            <p className="text-muted-foreground">{invoice.vendorServiceArea}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Bill To</p>
            <p className="font-medium text-foreground">{invoice.ownerName}</p>
            {invoice.boatName && <p className="text-muted-foreground">{invoice.boatLabel} — "{invoice.boatName}"</p>}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Service date: {invoice.projectDate}
        </div>

        {/* Line items */}
        <div className="border border-border rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_50px_70px_70px] gap-2 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          {invoice.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_50px_70px_70px] gap-2 px-3 py-2 text-xs border-t border-border/50">
              <span className="text-foreground">{item.description}</span>
              <span className="text-center text-muted-foreground">{item.quantity}</span>
              <span className="text-right text-muted-foreground">{fmt(item.unitPrice)}</span>
              <span className="text-right font-medium">{fmt(item.quantity * item.unitPrice)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{fmt(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bosun Fee ({Math.round(invoice.feeRate * 100)}%)</span>
            <span className="text-red-600">−{fmt(invoice.bosunFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
            <span>Net Payout</span>
            <span className="text-emerald-700">{fmt(invoice.netPayout)}</span>
          </div>
        </div>

        {/* Job Photos */}
        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Job Photos</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
            >
              + Add Photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          {photos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative group">
                  <img
                    src={photo}
                    alt={`Job photo ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No photos yet — add before/after shots of your work</p>
          )}
        </div>

        {/* Send button */}
        <div className="pt-2 relative">
          {sent ? (
            <div className="w-full py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              PDF downloaded — {sent === "email" ? "email" : "message"} opened
            </div>
          ) : (
            <>
              <button
                onClick={() => setSendMenuOpen((v) => !v)}
                disabled={sending}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Invoice
                  </>
                )}
              </button>

              {sendMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSendMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => handleSend("email")}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-foreground">Send via Email</p>
                        <p className="text-xs text-muted-foreground">Download PDF & open email with pre-filled message</p>
                      </div>
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={() => handleSend("text")}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div>
                        <p className="font-medium text-foreground">Send via Text</p>
                        <p className="text-xs text-muted-foreground">Download PDF & open messaging with pre-filled text</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reminders Tab ───────────────────────────────────────────────────────────

function RemindersTab({ reminders, search }: { reminders: MaintenanceReminder[]; search: string }) {
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  if (reminders.length === 0) {
    return search
      ? <EmptyState message={`No reminders match "${search}".`} />
      : <EmptyState message="No maintenance reminders yet. Complete more jobs to generate follow-up suggestions." />;
  }

  const urgencyConfig = {
    overdue: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", label: "Overdue" },
    upcoming: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Upcoming" },
    ok: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", label: "On Track" },
  };

  function handleSendReminder(reminder: MaintenanceReminder) {
    const key = `${reminder.boatName}-${reminder.category}`;
    setSentReminders((prev) => new Set([...prev, key]));
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder, idx) => {
        const config = urgencyConfig[reminder.urgency];
        const key = `${reminder.boatName}-${reminder.category}`;
        const isSent = sentReminders.has(key);

        return (
          <div key={idx} className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{reminder.category}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{reminder.suggestedFollowUp}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">{reminder.boatName}</span> · {reminder.boatLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last: {reminder.lastService} — {reminder.lastServiceDate} ({reminder.monthsSince}mo ago)
                </p>
              </div>
              <div className="flex-shrink-0">
                {isSent ? (
                  <span className="text-xs text-emerald-600 font-medium px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md">
                    Sent ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendReminder(reminder)}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-white border border-border hover:border-sky-300 hover:bg-sky-50 transition-colors"
                  >
                    Send Reminder
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "in-progress": "bg-sky-50 text-sky-700 border-sky-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
  }[status] ?? "bg-gray-50 text-gray-600 border-gray-200";

  const label = {
    paid: "Paid",
    "in-progress": "Active",
    pending: "Pending",
  }[status] ?? status;

  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config}`}>
      {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
