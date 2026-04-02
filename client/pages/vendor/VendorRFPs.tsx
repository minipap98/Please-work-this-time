import { useState } from "react";
import { Shield, Anchor, MapPin } from "lucide-react";
import Header from "@/components/Header";
import { useRole } from "@/context/RoleContext";
import { submitBid, vendorHasBid, getAllProjects } from "@/data/bidUtils";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM: LineItem = { description: "", quantity: "1", unitPrice: "" };

function lineTotal(item: LineItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  return qty * price;
}

function bidTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export default function VendorRFPs() {
  const { vendorId } = useRole();
  const [, forceUpdate] = useState(0);

  // Dialog state
  const [dialogProjectId, setDialogProjectId] = useState<string | null>(null);
  const [bidMessage, setBidMessage] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);
  const [bidExpiry, setBidExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const allProjects = getAllProjects();
  const openProjects = allProjects.filter(
    (p) => p.status === "gathering" || p.status === "bidding"
  );

  const dialogProject = dialogProjectId
    ? allProjects.find((p) => p.id === dialogProjectId)
    : null;

  const total = bidTotal(lineItems);
  const isValid =
    !!dialogProject &&
    !!vendorId &&
    bidMessage.trim().length > 0 &&
    lineItems.some((item) => item.description.trim() && parseFloat(item.unitPrice) > 0);

  function openDialog(projectId: string) {
    setDialogProjectId(projectId);
    setBidMessage("");
    setLineItems([{ ...EMPTY_ITEM }]);
    setBidExpiry("");
  }

  function closeDialog() {
    setDialogProjectId(null);
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setLineItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!isValid || !dialogProject || !vendorId) return;
    setSubmitting(true);

    const now = new Date();
    const submittedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    );

    submitBid(dialogProject.id, {
      id: `local_${Date.now()}`,
      vendorName: vendorId,
      vendorInitials: vendorId
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      rating: 0,
      reviewCount: 0,
      message: bidMessage.trim(),
      price: total,
      lineItems: validItems.map((item) => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
      })),
      submittedDate,
      expiryDate: bidExpiry || "TBD",
      thread: [],
    });

    setSubmitted((prev) => [...prev, dialogProject.id]);
    setSubmitting(false);
    closeDialog();
    forceUpdate((n) => n + 1);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold text-foreground mb-1">Open RFPs</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {openProjects.length} project{openProjects.length !== 1 ? "s" : ""} currently accepting bids
        </p>

        {openProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">No open RFPs at the moment. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {openProjects.map((project) => {
              const alreadyBid =
                submitted.includes(project.id) ||
                (vendorId ? vendorHasBid(project.id, vendorId) : false);
              return (
                <div
                  key={project.id}
                  className="border border-border rounded-lg p-5 hover:border-sky-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-base font-semibold text-foreground">{project.title}</h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.status === "gathering"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {project.status === "gathering" ? "Gathering candidates" : "Accepting bids"}
                        </span>
                        {project.marinaCOIRequired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Shield className="w-3 h-3" />
                            COI Required
                          </span>
                        )}
                        {project.haulOutRequired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Anchor className="w-3 h-3" />
                            Haul-Out Required
                          </span>
                        )}
                        {project.workLocation && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            <MapPin className="w-3 h-3" />
                            {project.workLocation === "at_marina" ? "At Marina" : project.workLocation === "vendor_facility" ? "Vendor Facility" : "Mobile"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{project.date}</p>
                      <p className="text-sm text-foreground leading-relaxed">{project.description}</p>
                      {project.boat && (
                        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
                          </svg>
                          <span className="font-medium text-foreground">"{project.boat.name}"</span>
                          <span>·</span>
                          <span>{project.boat.year} {project.boat.make} {project.boat.model}</span>
                          <span>·</span>
                          <span>{project.boat.propulsion}</span>
                        </div>
                      )}
                      {project.linkedEquipment && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {"\uD83D\uDD27"} {project.linkedEquipment.manufacturer} {project.linkedEquipment.model}
                            <span className="mx-0.5">·</span>
                            {(() => {
                              const s = project.linkedEquipment.warrantyStatus.toLowerCase();
                              if (s === "active") return <span className="text-green-600">Warranty Active</span>;
                              if (s.includes("expiring")) return <span className="text-amber-600">Warranty Expiring</span>;
                              return <span className="text-red-600">Warranty Expired</span>;
                            })()}
                          </span>
                          {project.isWarrantyClaim && (
                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Warranty Claim
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {project.bids.length} bid{project.bids.length !== 1 ? "s" : ""} submitted
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {alreadyBid ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-green-50 text-green-700 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Bid Submitted
                        </div>
                      ) : (
                        <button
                          onClick={() => openDialog(project.id)}
                          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          Submit Bid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Submit Bid Dialog */}
      {dialogProject && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDialog} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">Submit a Bid</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{dialogProject.title}</p>
                {dialogProject.boat && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17h18M5 17V9l7-5 7 5v8M9 17v-4h6v4" />
                    </svg>
                    <span className="font-medium text-foreground">"{dialogProject.boat.name}"</span>
                    <span>·</span>
                    <span>{dialogProject.boat.year} {dialogProject.boat.make} {dialogProject.boat.model}</span>
                    <span>·</span>
                    <span>{dialogProject.boat.propulsion}</span>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Cover message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    rows={3}
                    placeholder="Introduce yourself, describe your qualifications, and explain why you're a great fit…"
                    className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Itemized estimate <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-muted-foreground">Break down your costs for transparency</span>
                  </div>

                  {/* Column headers */}
                  <div className="grid gap-2 mb-1.5 pr-7" style={{ gridTemplateColumns: "1fr 56px 100px 72px" }}>
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Qty</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Unit price</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Total</span>
                  </div>

                  <div className="space-y-2">
                    {lineItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="grid gap-2 flex-1" style={{ gridTemplateColumns: "1fr 56px 100px 72px" }}>
                          {/* Description */}
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder="e.g. Labor, Parts, Fuel…"
                            className="border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          {/* Qty */}
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, "quantity", e.target.value)}
                            className="border border-border rounded-md px-2 py-1.5 text-sm text-center text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          {/* Unit price */}
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-border rounded-md pl-6 pr-2 py-1.5 text-sm text-right text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          {/* Line total */}
                          <div className="flex items-center justify-end">
                            <span className="text-sm font-medium text-foreground">
                              {lineTotal(item) > 0
                                ? `$${lineTotal(item).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "—"}
                            </span>
                          </div>
                        </div>
                        {/* Remove row */}
                        <button
                          onClick={() => removeItem(i)}
                          disabled={lineItems.length === 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
                          aria-label="Remove item"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add item + total */}
                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add line item
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground">
                        {total > 0
                          ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "$—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiry */}
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Bid valid until
                  </label>
                  <input
                    type="text"
                    value={bidExpiry}
                    onChange={(e) => setBidExpiry(e.target.value)}
                    placeholder="e.g. Mar 25, 2026"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center justify-between">
                <div>
                  {total > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Bid total: <span className="font-bold text-foreground">${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeDialog}
                    className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !isValid}
                    className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting…" : "Submit Bid"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
