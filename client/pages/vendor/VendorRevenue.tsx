import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { VENDOR_PROFILES } from "@/data/vendorData";
import {
  getVendorRevenue,
  getVendorBidProjects,
  BOSUN_FEE_RATE,
  VendorTransaction,
} from "@/data/bidUtils";
import { Bid } from "@/data/projectData";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function LineItemsDetail({ bid, boatName, boatLabel }: { bid: Bid; boatName?: string; boatLabel?: string }) {
  const hasItems = bid.lineItems && bid.lineItems.length > 0;

  return (
    <div className="px-5 pb-4 pt-3 bg-muted/20 border-t border-border/40">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-medium text-muted-foreground border-b border-border/60">
                <th className="text-left pb-1.5">Description</th>
                <th className="text-center pb-1.5 w-12">Qty</th>
                <th className="text-right pb-1.5 w-24">Unit Price</th>
                <th className="text-right pb-1.5 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bid.lineItems!.map((item, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="py-1.5 text-foreground">{item.description}</td>
                  <td className="py-1.5 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-1.5 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-medium text-foreground">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-foreground">
                  Gross total
                </td>
                <td className="pt-2 text-right font-bold text-foreground">
                  ${fmt(bid.price)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="pt-0.5 text-right text-xs text-red-600">
                  Bosun fee ({Math.round(BOSUN_FEE_RATE * 100)}%)
                </td>
                <td className="pt-0.5 text-right text-xs text-red-600">
                  −${fmt(bid.price * BOSUN_FEE_RATE)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="pt-0.5 text-right text-sm font-bold text-green-700">
                  Net payout
                </td>
                <td className="pt-0.5 text-right text-sm font-bold text-green-700">
                  ${fmt(bid.price * (1 - BOSUN_FEE_RATE))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No itemized breakdown — this bid was submitted as a flat rate of ${fmt(bid.price)}.
        </p>
      )}
    </div>
  );
}

export default function VendorRevenue() {
  const { vendorId } = useRole();
  const navigate = useNavigate();
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);

  const vendor = vendorId ? VENDOR_PROFILES[vendorId] : null;
  const revenue = vendorId ? getVendorRevenue(vendorId) : null;

  // Build a map of bidId → Bid for quick lookup
  const bidMap: Record<string, Bid> = {};
  if (vendorId) {
    for (const { bid } of getVendorBidProjects(vendorId)) {
      bidMap[bid.id] = bid;
    }
  }

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
  const feePercent = Math.round(BOSUN_FEE_RATE * 100);

  function toggleRow(bidId: string) {
    setExpandedBidId((prev) => (prev === bidId ? null : bidId));
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Revenue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bosun retains a {feePercent}% platform fee on all completed jobs.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Gross Earned</p>
            <p className="text-2xl font-bold text-foreground">${fmt(revenue.paidGross)}</p>
            <p className="text-xs text-muted-foreground mt-1">From completed jobs</p>
          </div>

          <div className="border border-red-100 bg-red-50/40 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Platform Fee ({feePercent}%)</p>
            <p className="text-2xl font-bold text-red-600">−${fmt(revenue.paidFees)}</p>
            <p className="text-xs text-muted-foreground mt-1">Bosun service fee</p>
          </div>

          <div className="border border-green-200 bg-green-50/40 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Payout</p>
            <p className="text-2xl font-bold text-green-700">${fmt(revenue.paidNet)}</p>
            <p className="text-xs text-muted-foreground mt-1">After fees</p>
          </div>

          <div className="border border-sky-200 bg-sky-50/40 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Payout</p>
            <p className="text-2xl font-bold text-sky-700">${fmt(revenue.pendingNet)}</p>
            <p className="text-xs text-muted-foreground mt-1">Active jobs (est.)</p>
          </div>
        </div>

        {/* Transaction table */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Payment History</h2>

          {!hasActivity ? (
            <div className="border border-border rounded-lg py-16 flex flex-col items-center text-center">
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
              {/* Table header */}
              <div className="bg-muted/40 px-5 py-2.5 border-b border-border">
                <div
                  className="grid items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  style={{ gridTemplateColumns: "1fr 80px 80px 80px 80px 90px 20px" }}
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

              {/* Rows */}
              <div className="divide-y divide-border">
                {revenue.transactions.map((tx) => {
                  const bid = bidMap[tx.bidId];
                  const isExpanded = expandedBidId === tx.bidId;

                  return (
                    <div key={tx.bidId}>
                      {/* Main row */}
                      <button
                        onClick={() => toggleRow(tx.bidId)}
                        className={`w-full text-left px-5 py-3.5 transition-colors ${
                          isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                        }`}
                      >
                        <div
                          className="grid items-center gap-2"
                          style={{ gridTemplateColumns: "1fr 80px 80px 80px 80px 90px 20px" }}
                        >
                          <p className="text-sm font-medium text-foreground truncate pr-2">
                            {tx.projectTitle}
                          </p>
                          <p className="text-xs text-muted-foreground text-right whitespace-nowrap">
                            {tx.projectDate}
                          </p>
                          <p className="text-sm text-foreground text-right">${fmt(tx.gross)}</p>
                          <p className="text-sm text-red-600 text-right">−${fmt(tx.fee)}</p>
                          <p className="text-sm font-semibold text-green-700 text-right">
                            ${fmt(tx.net)}
                          </p>
                          <div className="flex justify-end">
                            <StatusBadge status={tx.status} />
                          </div>
                          <div className="flex justify-end">
                            <svg
                              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && bid && (
                        <LineItemsDetail bid={bid} boatName={tx.boatName} boatLabel={tx.boatLabel} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals footer */}
              <div className="bg-muted/30 px-5 py-3.5 border-t-2 border-border">
                <div
                  className="grid items-center gap-2"
                  style={{ gridTemplateColumns: "1fr 80px 80px 80px 80px 90px 20px" }}
                >
                  <span className="text-sm font-semibold text-foreground">Completed total</span>
                  <span />
                  <span className="text-sm font-bold text-foreground text-right">${fmt(revenue.paidGross)}</span>
                  <span className="text-sm font-bold text-red-600 text-right">−${fmt(revenue.paidFees)}</span>
                  <span className="text-sm font-bold text-green-700 text-right">${fmt(revenue.paidNet)}</span>
                  <span /><span />
                </div>
                {revenue.pendingGross > 0 && (
                  <div
                    className="grid items-center gap-2 mt-1"
                    style={{ gridTemplateColumns: "1fr 80px 80px 80px 80px 90px 20px" }}
                  >
                    <span className="text-xs text-muted-foreground">Pending (est.)</span>
                    <span />
                    <span className="text-xs text-muted-foreground text-right">${fmt(revenue.pendingGross)}</span>
                    <span className="text-xs text-muted-foreground text-right">−${fmt(revenue.pendingGross * BOSUN_FEE_RATE)}</span>
                    <span className="text-xs text-sky-700 font-medium text-right">${fmt(revenue.pendingNet)}</span>
                    <span /><span />
                  </div>
                )}
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
            <p className="text-sm font-medium text-foreground">About Bosun's {feePercent}% platform fee</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Bosun retains a {feePercent}% fee on all jobs completed through the platform. Net payouts are processed within 3–5 business days of project completion. Pending amounts are estimates based on accepted bids and may change if a project is modified or cancelled.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
