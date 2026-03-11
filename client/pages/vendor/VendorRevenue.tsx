import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { VENDOR_PROFILES } from "@/data/vendorData";
import {
  getVendorBidProjects,
} from "@/data/bidUtils";
import { Bid } from "@/data/projectData";
import {
  getVendorRevenueWithTiers,
  getEscrowStatus,
  TieredTransaction,
} from "@/data/vendorRetentionUtils";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function StatusBadge({ status }: { status: VendorTransaction["status"] }) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Paid
      </span>
    );
  if (status === "in-progress")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
        In Progress
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block" />
      Booked
    </span>
  );
}

function LineItemsDetail({ bid, boatName, boatLabel, feeRate }: { bid: Bid; boatName?: string; boatLabel?: string; feeRate: number }) {
  const hasItems = bid.lineItems && bid.lineItems.length > 0;
  const feePercent = Math.round(feeRate * 100);

  return (
    <div className="px-4 sm:px-5 pb-4 pt-3 bg-muted/20 border-t border-border/40">
      {(boatName || boatLabel) && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
          </svg>
          {boatName && <span className="font-medium text-foreground">"{boatName}"</span>}
          {boatName && boatLabel && <span>·</span>}
          {boatLabel && <span>{boatLabel}</span>}
        </div>
      )}
      {bid.message && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Bid message</p>
          <p className="text-xs text-foreground leading-relaxed">{bid.message}</p>
        </div>
      )}

      {hasItems ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Itemized breakdown</p>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[340px] text-sm px-1">
              <thead>
                <tr className="text-xs font-medium text-muted-foreground border-b border-border/60">
                  <th className="text-left pb-1.5">Description</th>
                  <th className="text-center pb-1.5 w-10">Qty</th>
                  <th className="text-right pb-1.5 w-20 hidden sm:table-cell">Unit Price</th>
                  <th className="text-right pb-1.5 w-20">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bid.lineItems!.map((item, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-1.5 text-foreground">
                      {item.description}
                      <span className="sm:hidden text-xs text-muted-foreground ml-1">
                        × {item.quantity} @ ${item.unitPrice.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1.5 text-center text-muted-foreground hidden sm:table-cell">{item.quantity}</td>
                    <td className="py-1.5 text-right text-muted-foreground hidden sm:table-cell">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-medium text-foreground">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={2} className="pt-2 text-right text-sm font-semibold text-foreground sm:hidden">
                    Gross total
                  </td>
                  <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-foreground hidden sm:table-cell">
                    Gross total
                  </td>
                  <td className="pt-2 text-right font-bold text-foreground">
                    ${fmt(bid.price)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="pt-0.5 text-right text-xs text-red-600 sm:hidden">
                    Bosun fee ({feePercent}%)
                  </td>
                  <td colSpan={3} className="pt-0.5 text-right text-xs text-red-600 hidden sm:table-cell">
                    Bosun fee ({feePercent}%)
                  </td>
                  <td className="pt-0.5 text-right text-xs text-red-600">
                    −${fmt(bid.price * feeRate)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="pt-0.5 text-right text-sm font-bold text-green-700 sm:hidden">
                    Net payout
                  </td>
                  <td colSpan={3} className="pt-0.5 text-right text-sm font-bold text-green-700 hidden sm:table-cell">
                    Net payout
                  </td>
                  <td className="pt-0.5 text-right text-sm font-bold text-green-700">
                    ${fmt(bid.price * (1 - feeRate))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No itemized breakdown — this bid was submitted as a flat rate of ${fmt(bid.price)}.
        </p>
      )}
    </div>
  );
}

/** Parse "Jan 8, 2025" → sortable key "2025-01" and display label "January 2025" */
function getMonthKey(dateStr: string): { key: string; label: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) throw new Error("Invalid date");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { key, label };
  } catch {
    return { key: dateStr, label: dateStr };
  }
}

interface MonthGroup {
  key: string;
  label: string;
  transactions: TieredTransaction[];
  gross: number;
  fee: number;
  net: number;
}

function groupByMonth(transactions: TieredTransaction[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const tx of transactions) {
    const { key, label } = getMonthKey(tx.projectDate);
    if (!map.has(key)) {
      map.set(key, { key, label, transactions: [], gross: 0, fee: 0, net: 0 });
    }
    const group = map.get(key)!;
    group.transactions.push(tx);
    group.gross += tx.gross;
    group.fee += tx.effectiveFee;
    group.net += tx.effectiveNet;
  }
  // Sort most recent first
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export default function VendorRevenue() {
  const { vendorId } = useRole();
  const navigate = useNavigate();

  const vendor = vendorId ? VENDOR_PROFILES[vendorId] : null;
  const revenue = vendorId ? getVendorRevenueWithTiers(vendorId) : null;

  const bidMap: Record<string, Bid> = {};
  if (vendorId) {
    for (const { bid } of getVendorBidProjects(vendorId)) {
      bidMap[bid.id] = bid;
    }
  }

  const paidTxInit = revenue?.transactions.filter((tx) => tx.status === "paid") ?? [];
  const monthGroupsInit = groupByMonth(paidTxInit);

  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    () => new Set(monthGroupsInit.map((g) => g.key))
  );

  if (!vendor || !revenue) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-32">
          <p className="text-muted-foreground text-sm">No vendor profile selected.</p>
        </div>
      </div>
    );
  }

  const hasActivity = revenue.transactions.length > 0;
  const feePercent = Math.round(revenue.effectiveFeeRate * 100);
  const tier = revenue.currentTier;
  const tierProgress = revenue.tierProgress;

  const paidTransactions = paidTxInit;
  const pendingTransactions = revenue.transactions.filter((tx) => tx.status !== "paid");
  const monthGroups = monthGroupsInit;

  function toggleRow(bidId: string) {
    setExpandedBidId((prev) => (prev === bidId ? null : bidId));
  }

  function toggleMonth(key: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function TransactionRow({ tx }: { tx: TieredTransaction }) {
    const bid = bidMap[tx.bidId];
    const isExpanded = expandedBidId === tx.bidId;

    return (
      <div key={tx.bidId}>
        <button
          onClick={() => toggleRow(tx.bidId)}
          className={`w-full text-left px-4 sm:px-5 py-3.5 transition-colors ${
            isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
          }`}
        >
          {/* Mobile card */}
          <div className="sm:hidden">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground leading-snug flex-1 min-w-0 truncate">
                {tx.projectTitle}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={tx.status} />
                <svg
                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 mb-2">{tx.projectDate}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="text-base font-bold text-green-700 whitespace-nowrap">${fmt(tx.effectiveNet)} net</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">${fmt(tx.gross)} gross</span>
              <span className="text-xs text-red-500 whitespace-nowrap">−${fmt(tx.effectiveFee)} fee</span>
            </div>
          </div>

          {/* Desktop row */}
          <div
            className="hidden sm:grid items-center gap-2"
            style={{ gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 20px" }}
          >
            <p className="text-sm font-medium text-foreground truncate pr-2">{tx.projectTitle}</p>
            <p className="text-xs text-muted-foreground text-right whitespace-nowrap">{tx.projectDate}</p>
            <p className="text-sm text-foreground text-right">${fmt(tx.gross)}</p>
            <p className="text-sm text-red-600 text-right">−${fmt(tx.effectiveFee)}</p>
            <p className="text-sm font-semibold text-green-700 text-right">${fmt(tx.effectiveNet)}</p>
            <div className="flex justify-end"><StatusBadge status={tx.status} /></div>
            <div className="flex justify-end">
              <svg
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {isExpanded && bid && (
          <LineItemsDetail bid={bid} boatName={tx.boatName} boatLabel={tx.boatLabel} feeRate={revenue.effectiveFeeRate} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Revenue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bosun retains a {feePercent}% platform fee on all completed jobs.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="border border-border rounded-lg p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Gross Earned</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">${fmt(revenue.paidGross)}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed jobs</p>
          </div>
          <div className="border border-red-100 bg-red-50/40 rounded-lg p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Fee ({feePercent}%)</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600">−${fmt(revenue.tieredPaidFees)}</p>
            <p className="text-xs text-muted-foreground mt-1">{tier.name} tier rate</p>
          </div>
          <div className="border border-green-200 bg-green-50/40 rounded-lg p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Payout</p>
            <p className="text-xl sm:text-2xl font-bold text-green-700">${fmt(revenue.tieredPaidNet)}</p>
            <p className="text-xs text-muted-foreground mt-1">After fees</p>
          </div>
          <div className="border border-sky-200 bg-sky-50/40 rounded-lg p-3 sm:p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-sky-700">${fmt(revenue.tieredPendingNet)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active jobs (est.)</p>
          </div>
        </div>

        {/* Tier progress card */}
        <div className={`border rounded-lg p-4 sm:p-5 mb-8 ${tier.bgColor} border-border`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${tier.badgeColor}`}>
                {tier.name === "Gold" ? "🥇" : tier.name === "Silver" ? "🥈" : "🥉"}
                {tier.name} Tier
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{feePercent}% platform fee</p>
                {revenue.flatFeeSavings > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    You've saved ${fmt(revenue.flatFeeSavings)} vs. standard 10%
                  </p>
                )}
              </div>
            </div>
            {tierProgress.next && (
              <div className="sm:text-right">
                <p className="text-xs text-muted-foreground mb-1.5">
                  ${fmt(tierProgress.remaining)} to {tierProgress.next.name} ({Math.round(tierProgress.next.feeRate * 100)}%)
                </p>
                <div className="w-full sm:w-48 h-2 bg-white/70 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{ width: `${Math.round(tierProgress.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!tierProgress.next && (
              <p className="text-xs text-emerald-600 font-medium">🎉 Highest tier achieved!</p>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Payment History</h2>

          {!hasActivity ? (
            <div className="border border-border rounded-lg py-16 flex flex-col items-center text-center px-4">
              <svg className="w-10 h-10 text-muted-foreground/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-muted-foreground">No payment history yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Accepted bids will appear here once a project is booked or completed.</p>
              <button
                onClick={() => navigate("/vendor-rfps")}
                className="mt-4 px-4 py-2 text-sm font-semibold text-sky-700 bg-sky-50 rounded-md hover:bg-sky-100 transition-colors"
              >
                Browse RFPs
              </button>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">

              {/* Pending / In-Progress section */}
              {pendingTransactions.length > 0 && (
                <div>
                  <div className="bg-sky-50/60 px-4 sm:px-5 py-2.5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Active Jobs</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Escrow Protected
                      </span>
                    </div>
                    <span className="text-xs text-sky-600">{pendingTransactions.length} job{pendingTransactions.length !== 1 ? "s" : ""} · est. {fmtShort(pendingTransactions.reduce((s, t) => s + t.net, 0))} net</span>
                  </div>
                  <div className="divide-y divide-border">
                    {pendingTransactions.map((tx) => (
                      <TransactionRow key={tx.bidId} tx={tx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly groups */}
              {monthGroups.map((group, groupIdx) => {
                const isCollapsed = collapsedMonths.has(group.key);
                const isLast = groupIdx === monthGroups.length - 1;

                return (
                  <div key={group.key} className={groupIdx === 0 && pendingTransactions.length > 0 ? "border-t border-border" : groupIdx > 0 ? "border-t border-border" : ""}>
                    {/* Month header */}
                    <button
                      onClick={() => toggleMonth(group.key)}
                      className="w-full text-left bg-muted/30 hover:bg-muted/50 transition-colors px-4 sm:px-5 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <div>
                          <span className="text-sm font-semibold text-foreground">{group.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{group.transactions.length} job{group.transactions.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      {/* Month totals */}
                      <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
                        <div className="hidden sm:flex items-center gap-5 text-xs">
                          <span className="text-muted-foreground">{fmtShort(group.gross)} gross</span>
                          <span className="text-red-500">−{fmtShort(group.fee)} fee</span>
                        </div>
                        <span className="text-sm font-bold text-green-700 whitespace-nowrap">{fmtShort(group.net)} net</span>
                      </div>
                    </button>

                    {/* Month transactions */}
                    {!isCollapsed && (
                      <div className="divide-y divide-border/60">
                        {/* Desktop column header within month */}
                        <div className="hidden sm:block bg-muted/20 px-5 py-2 border-b border-border/40">
                          <div
                            className="grid items-center text-xs font-medium text-muted-foreground"
                            style={{ gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 20px" }}
                          >
                            <span>Project</span>
                            <span className="text-right">Date</span>
                            <span className="text-right">Gross</span>
                            <span className="text-right">Fee</span>
                            <span className="text-right">Net</span>
                            <span className="text-right">Status</span>
                            <span />
                          </div>
                        </div>
                        <div className="divide-y divide-border/60">
                          {group.transactions.map((tx) => (
                            <TransactionRow key={tx.bidId} tx={tx} />
                          ))}
                        </div>
                        {/* Month subtotal */}
                        <div className="bg-muted/20 px-4 sm:px-5 py-2.5 border-t border-border/40">
                          {/* Mobile */}
                          <div className="sm:hidden flex justify-between items-center">
                            <span className="text-xs font-medium text-muted-foreground">{group.label} total</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">{fmtShort(group.gross)} gross</span>
                              <span className="text-red-500">−{fmtShort(group.fee)}</span>
                              <span className="font-bold text-green-700">{fmtShort(group.net)} net</span>
                            </div>
                          </div>
                          {/* Desktop */}
                          <div
                            className="hidden sm:grid items-center gap-2 text-xs"
                            style={{ gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 20px" }}
                          >
                            <span className="text-muted-foreground font-medium">{group.label} subtotal</span>
                            <span />
                            <span className="text-right font-semibold text-foreground">${fmt(group.gross)}</span>
                            <span className="text-right font-semibold text-red-600">−${fmt(group.fee)}</span>
                            <span className="text-right font-semibold text-green-700">${fmt(group.net)}</span>
                            <span /><span />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Grand total footer */}
              <div className="bg-muted/30 px-4 sm:px-5 py-3.5 border-t-2 border-border">
                {/* Mobile */}
                <div className="sm:hidden space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">All-time total</span>
                    <span className="text-sm font-bold text-green-700">${fmt(revenue.tieredPaidNet)} net</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>${fmt(revenue.paidGross)} gross</span>
                    <span className="text-red-600">−${fmt(revenue.tieredPaidFees)} fee</span>
                  </div>
                  {revenue.pendingGross > 0 && (
                    <div className="flex justify-between items-center pt-1 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">Active jobs (est.)</span>
                      <span className="text-xs font-medium text-sky-700">${fmt(revenue.tieredPendingNet)} net</span>
                    </div>
                  )}
                </div>

                {/* Desktop */}
                <div className="hidden sm:block">
                  <div
                    className="grid items-center gap-2"
                    style={{ gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 20px" }}
                  >
                    <span className="text-sm font-semibold text-foreground">All-time total</span>
                    <span />
                    <span className="text-sm font-bold text-foreground text-right">${fmt(revenue.paidGross)}</span>
                    <span className="text-sm font-bold text-red-600 text-right">−${fmt(revenue.tieredPaidFees)}</span>
                    <span className="text-sm font-bold text-green-700 text-right">${fmt(revenue.tieredPaidNet)}</span>
                    <span /><span />
                  </div>
                  {revenue.pendingGross > 0 && (
                    <div
                      className="grid items-center gap-2 mt-1"
                      style={{ gridTemplateColumns: "1fr 90px 80px 80px 80px 90px 20px" }}
                    >
                      <span className="text-xs text-muted-foreground">Active jobs (est.)</span>
                      <span />
                      <span className="text-xs text-muted-foreground text-right">${fmt(revenue.pendingGross)}</span>
                      <span className="text-xs text-muted-foreground text-right">−${fmt(revenue.pendingGross * revenue.effectiveFeeRate)}</span>
                      <span className="text-xs text-sky-700 font-medium text-right">${fmt(revenue.tieredPendingNet)}</span>
                      <span /><span />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fee info callout */}
        <div className="mt-8 border border-border rounded-lg p-4 flex gap-3">
          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Bosun's Loyalty Fee Tiers</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your fee rate decreases as you earn more on Bosun. <strong>Bronze</strong> (0–$5k): 10% · <strong>Silver</strong> ($5k–$20k): 7% · <strong>Gold</strong> ($20k+): 5%. You're currently on the <strong>{tier.name}</strong> tier at <strong>{feePercent}%</strong>. Net payouts are processed within 3–5 business days of project completion. All active jobs are protected by Bosun's escrow system — funds are secured before work begins and released on completion.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
