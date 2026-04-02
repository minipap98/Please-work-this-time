import { useState, useRef } from "react";
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getAllVendorProfiles } from "@/data/vendorProfileUtils";
import {
  getVendorInsuranceStatus,
  saveVendorInsurance,
} from "@/data/vendorProfileUtils";

interface VendorInsuranceProps {
  vendorName: string;
}

const STATUS_CONFIG = {
  verified: {
    label: "Verified",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    Icon: ShieldCheck,
  },
  expiring: {
    label: "Expiring Soon",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    Icon: AlertTriangle,
  },
  expired: {
    label: "Expired",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    Icon: AlertTriangle,
  },
  none: {
    label: "No Policy",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
    Icon: Shield,
  },
} as const;

export default function VendorInsurance({ vendorName }: VendorInsuranceProps) {
  const [open, setOpen] = useState(false);
  const [, refresh] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const profiles = getAllVendorProfiles();
  const profile = profiles[vendorName];
  const status = getVendorInsuranceStatus(vendorName);
  const cfg = STATUS_CONFIG[status];
  const policy = profile?.insurancePolicy;
  const coi = profile?.coiDocument;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5 MB.");
      return;
    }
    if (file.type !== "application/pdf") {
      alert("Only PDF files are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!provider.trim() || !policyNumber.trim() || !expiryDate || !coverageAmount.trim()) return;
    setSaving(true);
    saveVendorInsurance(
      vendorName,
      fileDataUrl ? { fileName, dataUrl: fileDataUrl } : null,
      {
        provider: provider.trim(),
        policyNumber: policyNumber.trim(),
        expiryDate,
        coverageAmount: coverageAmount.trim(),
      }
    );
    setSaving(false);
    setOpen(false);
    setFileDataUrl("");
    setFileName("");
    refresh((n) => n + 1);
  }

  const isFormValid =
    provider.trim() && policyNumber.trim() && expiryDate && coverageAmount.trim();

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <cfg.Icon className={`w-4 h-4 ${cfg.text}`} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Certificate of Insurance
            </h3>
            <span
              className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              {cfg.label}
            </span>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Policy summary (always visible if policy exists) */}
      {policy && (
        <div className="px-4 pb-3 -mt-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Provider</span>
              <p className="font-medium text-foreground">{policy.provider}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Policy #</span>
              <p className="font-medium text-foreground">{policy.policyNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expires</span>
              <p className={`font-medium ${status === "expired" ? "text-red-600" : status === "expiring" ? "text-amber-600" : "text-foreground"}`}>
                {new Date(policy.expiryDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Coverage</span>
              <p className="font-medium text-foreground">{policy.coverageAmount}</p>
            </div>
          </div>

          {status === "expiring" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Policy expires within 30 days. Please renew soon.
            </div>
          )}
          {status === "expired" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Policy has expired. Upload a renewed certificate.
            </div>
          )}

          {coi && (
            <a
              href={coi.dataUrl}
              download={coi.fileName}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              {coi.fileName}
            </a>
          )}
        </div>
      )}

      {/* Collapsible upload / update form */}
      {open && (
        <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/30">
          <p className="text-xs font-semibold text-foreground mb-1">
            {policy ? "Update Insurance Details" : "Add Insurance Details"}
          </p>

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              COI Document (PDF, max 5 MB)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose File
              </button>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {fileName || "No file selected"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Insurance Provider <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. State Farm"
                className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Policy Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="e.g. POL-12345"
                className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Coverage Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={coverageAmount}
                onChange={(e) => setCoverageAmount(e.target.value)}
                placeholder="e.g. $1,000,000"
                className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={!isFormValid || saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Insurance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
