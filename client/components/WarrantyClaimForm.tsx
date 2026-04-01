import { useState, useEffect, useCallback } from "react";
import {
  Info,
  Printer,
  ClipboardCopy,
  ExternalLink,
  Phone,
  ChevronDown,
  Check,
  Shield,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WarrantyClaimFormProps {
  equipment: {
    id: string;
    category: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    purchaseDate: string;
    warrantyExpiry: string;
    dealer: string;
    notes: string;
  };
  boat: {
    name: string;
    make: string;
    model: string;
    year: string;
  };
  ownerName?: string;
}

type ClaimStatus = "draft" | "submitted" | "approved" | "denied";

interface SavedClaim {
  id: string;
  equipmentId: string;
  status: ClaimStatus;
  submittedDate: string | null;
  notes: string;
}

// ---------------------------------------------------------------------------
// Manufacturer warranty portal directory
// ---------------------------------------------------------------------------

interface ManufacturerInfo {
  url: string;
  phone?: string;
  notes?: string;
}

const MANUFACTURER_PORTALS: Record<string, ManufacturerInfo> = {
  Yamaha: {
    url: "https://www.yamaha-motor.com/warranty",
    phone: "1-866-894-1626",
    notes: "Register your product online before filing a claim.",
  },
  Mercury: {
    url: "https://www.mercurymarine.com/en/us/support/warranty/",
    phone: "1-920-929-5040",
    notes: "Claims must be submitted through an authorized dealer.",
  },
  Honda: {
    url: "https://marine.honda.com/warranty",
    phone: "1-866-784-1870",
    notes: "Keep your maintenance records — they may be required.",
  },
  Suzuki: {
    url: "https://www.suzukimarine.com/support/warranty",
    phone: "1-714-996-7040",
    notes: "Extended warranty available through Suzuki Protection Plan.",
  },
  Evinrude: {
    url: "https://www.evinrude.com/en-us/support/warranty.html",
    phone: "1-877-838-5534",
    notes: "BRP handles all Evinrude warranty service.",
  },
  Garmin: {
    url: "https://www.garmin.com/en-US/forms/warranty/",
    phone: "1-913-397-8200",
    notes: "Marine electronics carry a separate warranty from the engine.",
  },
  Raymarine: {
    url: "https://www.raymarine.com/warranty/",
    phone: "1-603-324-7900",
    notes: "Product registration is required before submitting a claim.",
  },
  Simrad: {
    url: "https://www.simrad-yachting.com/support/warranty/",
    phone: "1-800-628-4487",
    notes: "Navico handles all Simrad warranty claims.",
  },
  Lowrance: {
    url: "https://www.lowrance.com/support/warranty/",
    phone: "1-800-628-4487",
    notes: "Submit claims through the Navico warranty portal.",
  },
  Volvo: {
    url: "https://www.volvopenta.com/warranty",
    phone: "1-757-436-2800",
    notes: "Claims must go through an authorized Volvo Penta dealer.",
  },
  Cummins: {
    url: "https://www.cummins.com/parts-and-service/warranty",
    phone: "1-800-286-6467",
    notes: "QuickServe Online portal available for registered users.",
  },
  Lewmar: {
    url: "https://www.lewmar.com/warranty",
    notes: "Contact your local distributor for warranty service.",
  },
  Minn_Kota: {
    url: "https://www.minnkotamotors.com/support/warranty",
    phone: "1-800-227-6433",
    notes: "Registration must be completed within 30 days of purchase.",
  },
  Humminbird: {
    url: "https://www.humminbird.com/support/warranty",
    phone: "1-800-227-6433",
    notes: "Johnson Outdoors handles all Humminbird claims.",
  },
};

// ---------------------------------------------------------------------------
// Local-storage helpers
// ---------------------------------------------------------------------------

const CLAIMS_KEY = "bosun_warranty_claims";

function loadClaims(): SavedClaim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClaims(claims: SavedClaim[]) {
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

const STATUS_STYLES: Record<ClaimStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  denied: "bg-red-50 text-red-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WarrantyClaimForm({
  equipment,
  boat,
  ownerName,
}: WarrantyClaimFormProps) {
  // Editable fields
  const [issueDescription, setIssueDescription] = useState("");
  const [dateDiscovered, setDateDiscovered] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorLicense, setVendorLicense] = useState("");
  const [repairEstimate, setRepairEstimate] = useState("");
  const [partsNeeded, setPartsNeeded] = useState("");

  // Claim tracking
  const [claims, setClaims] = useState<SavedClaim[]>(loadClaims);
  const [copied, setCopied] = useState(false);

  const existingClaim = claims.find((c) => c.equipmentId === equipment.id);

  // Persist claims whenever they change
  useEffect(() => {
    saveClaims(claims);
  }, [claims]);

  // ------- Manufacturer portal lookup -------
  const mfr = equipment.manufacturer;
  const portalKey = Object.keys(MANUFACTURER_PORTALS).find(
    (k) => mfr.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(mfr.toLowerCase()),
  );
  const portal = portalKey ? MANUFACTURER_PORTALS[portalKey] : null;

  // ------- Warranty status -------
  const warrantyExpired =
    equipment.warrantyExpiry && new Date(equipment.warrantyExpiry).getTime() < Date.now();

  // ------- Claim status management -------
  function upsertClaimStatus(status: ClaimStatus) {
    setClaims((prev) => {
      const idx = prev.findIndex((c) => c.equipmentId === equipment.id);
      const entry: SavedClaim = {
        id: existingClaim?.id ?? `claim-${Date.now()}`,
        equipmentId: equipment.id,
        status,
        submittedDate:
          status === "submitted"
            ? new Date().toISOString()
            : existingClaim?.submittedDate ?? null,
        notes: issueDescription,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
  }

  // ------- Build formatted text -------
  const buildClaimText = useCallback(() => {
    const lines: string[] = [
      "=== WARRANTY CLAIM ===",
      "",
      "--- Owner / Vessel ---",
      `Owner: ${ownerName ?? "N/A"}`,
      `Boat: ${boat.name || "N/A"}`,
      `Make / Model / Year: ${boat.make} ${boat.model} (${boat.year})`,
      "",
      "--- Equipment ---",
      `Category: ${equipment.category}`,
      `Manufacturer: ${equipment.manufacturer}`,
      `Model: ${equipment.model}`,
      `Serial #: ${equipment.serialNumber}`,
      `Purchase Date: ${equipment.purchaseDate}`,
      `Warranty Expiry: ${equipment.warrantyExpiry}`,
      `Dealer: ${equipment.dealer}`,
      equipment.notes ? `Equipment Notes: ${equipment.notes}` : "",
      "",
      "--- Claim Details ---",
      `Issue Description: ${issueDescription || "N/A"}`,
      `Date Discovered: ${dateDiscovered || "N/A"}`,
      `Vendor / Technician: ${vendorName || "N/A"}`,
      vendorLicense ? `License / Cert #: ${vendorLicense}` : "",
      `Repair Estimate: ${repairEstimate ? `$${repairEstimate}` : "N/A"}`,
      partsNeeded ? `Parts Needed: ${partsNeeded}` : "",
      "",
      `Claim Status: ${existingClaim?.status ?? "draft"}`,
      existingClaim?.submittedDate
        ? `Submitted: ${new Date(existingClaim.submittedDate).toLocaleDateString()}`
        : "",
      "",
      `Generated: ${new Date().toLocaleString()}`,
    ];
    return lines.filter((l) => l !== "").join("\n");
  }, [
    ownerName,
    boat,
    equipment,
    issueDescription,
    dateDiscovered,
    vendorName,
    vendorLicense,
    repairEstimate,
    partsNeeded,
    existingClaim,
  ]);

  // ------- Actions -------
  function handlePrint() {
    window.print();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildClaimText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = buildClaimText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ------- Shared styles -------
  const inputBase =
    "w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
  const readOnlyField =
    "w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-gray-50 cursor-default";
  const labelCls = "block text-sm font-medium text-foreground mb-1.5";
  const sectionTitle = "text-sm font-semibold text-foreground mb-3";

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .warranty-claim-printable, .warranty-claim-printable * { visibility: visible; }
          .warranty-claim-printable { position: absolute; left: 0; top: 0; width: 100%; padding: 2rem; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="warranty-claim-printable space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Warranty Claim</h2>
              <p className="text-xs text-muted-foreground">
                {equipment.manufacturer} {equipment.model} &middot; S/N {equipment.serialNumber}
              </p>
            </div>
          </div>

          {/* Status badge & dropdown */}
          <div className="no-print flex items-center gap-2">
            <div className="relative">
              <select
                value={existingClaim?.status ?? "draft"}
                onChange={(e) => upsertClaimStatus(e.target.value as ClaimStatus)}
                className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${STATUS_STYLES[existingClaim?.status ?? "draft"]}`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          </div>
        </div>

        {/* Warranty expiry warning */}
        {warrantyExpired && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              This equipment's warranty expired on{" "}
              <span className="font-semibold">
                {new Date(equipment.warrantyExpiry).toLocaleDateString()}
              </span>
              . The manufacturer may deny this claim.
            </p>
          </div>
        )}

        {/* Manufacturer portal info box */}
        {portal && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-800">
                  Submit this claim to {equipment.manufacturer}
                </p>
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2"
                >
                  Open warranty portal
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {portal.phone && (
                  <p className="flex items-center gap-1.5 text-sm text-blue-700">
                    <Phone className="w-3.5 h-3.5" />
                    {portal.phone}
                  </p>
                )}
                {portal.notes && (
                  <p className="text-xs text-blue-600 mt-1">{portal.notes}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Owner / Vessel Section ---- */}
        <div>
          <h3 className={sectionTitle}>Owner &amp; Vessel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Owner</label>
              <div className={readOnlyField}>{ownerName || "N/A"}</div>
            </div>
            <div>
              <label className={labelCls}>Boat Name</label>
              <div className={readOnlyField}>{boat.name || "N/A"}</div>
            </div>
            <div>
              <label className={labelCls}>Make</label>
              <div className={readOnlyField}>{boat.make || "N/A"}</div>
            </div>
            <div>
              <label className={labelCls}>Model / Year</label>
              <div className={readOnlyField}>
                {boat.model || "N/A"} ({boat.year || "N/A"})
              </div>
            </div>
          </div>
        </div>

        {/* ---- Equipment Section ---- */}
        <div>
          <h3 className={sectionTitle}>Equipment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <div className={readOnlyField}>{equipment.category}</div>
            </div>
            <div>
              <label className={labelCls}>Manufacturer</label>
              <div className={readOnlyField}>{equipment.manufacturer}</div>
            </div>
            <div>
              <label className={labelCls}>Model</label>
              <div className={readOnlyField}>{equipment.model}</div>
            </div>
            <div>
              <label className={labelCls}>Serial Number</label>
              <div className={readOnlyField}>{equipment.serialNumber}</div>
            </div>
            <div>
              <label className={labelCls}>Purchase Date</label>
              <div className={readOnlyField}>
                {equipment.purchaseDate
                  ? new Date(equipment.purchaseDate).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
            <div>
              <label className={labelCls}>Warranty Expiry</label>
              <div
                className={`${readOnlyField} ${warrantyExpired ? "text-red-600 font-semibold" : ""}`}
              >
                {equipment.warrantyExpiry
                  ? new Date(equipment.warrantyExpiry).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Dealer</label>
              <div className={readOnlyField}>{equipment.dealer || "N/A"}</div>
            </div>
            {equipment.notes && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Equipment Notes</label>
                <div className={readOnlyField}>{equipment.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Editable Claim Details ---- */}
        <div className="no-print-hide">
          <h3 className={sectionTitle}>Claim Details</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Issue Description</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the problem in detail..."
                rows={4}
                className={inputBase}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Date Issue Discovered</label>
                <input
                  type="date"
                  value={dateDiscovered}
                  onChange={(e) => setDateDiscovered(e.target.value)}
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Repair Estimate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={repairEstimate}
                    onChange={(e) => setRepairEstimate(e.target.value)}
                    placeholder="0.00"
                    className={`${inputBase} pl-7`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Vendor / Technician Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Service provider name"
                  className={inputBase}
                />
              </div>
              <div>
                <label className={labelCls}>
                  License / Certification #
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  value={vendorLicense}
                  onChange={(e) => setVendorLicense(e.target.value)}
                  placeholder="e.g. ABYC-12345"
                  className={inputBase}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Parts Needed
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={partsNeeded}
                onChange={(e) => setPartsNeeded(e.target.value)}
                placeholder="List any replacement parts required..."
                rows={3}
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {/* ---- Actions ---- */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Printer className="w-4 h-4" />
            Generate PDF
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>

        {/* Existing claim metadata (print-only supplement) */}
        {existingClaim?.submittedDate && (
          <p className="text-xs text-muted-foreground pt-1">
            Submitted on{" "}
            {new Date(existingClaim.submittedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </>
  );
}
