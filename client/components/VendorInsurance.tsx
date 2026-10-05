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
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useMyVendorProfile, useUpdateMyVendorProfile } from "@/hooks/use-supabase";
import { toast } from "sonner";
import type { Tables } from "@/lib/database.types";

interface VendorInsuranceProps {
  vendorName?: string;
  vendorId?: string;
}

const STATUS_CONFIG = {
  verified: {
    label: "On file",
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

function insuranceStatus(expiry: string | null | undefined) {
  if (!expiry) return "none" as const;
  const now = Date.now();
  const t = new Date(expiry).getTime();
  if (t < now) return "expired" as const;
  if (t - now < 30 * 24 * 60 * 60 * 1000) return "expiring" as const;
  return "verified" as const;
}

export default function VendorInsurance(_props: VendorInsuranceProps) {
  const { user } = useAuth();
  const { data: rawProfile } = useMyVendorProfile();
  const profile = rawProfile as Tables<"vendor_profiles"> | null | undefined;
  const update = useUpdateMyVendorProfile();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const status = insuranceStatus(profile?.insurance_expiry);
  const cfg = STATUS_CONFIG[status];
  const policy = profile?.insurance_provider
    ? {
        provider: profile.insurance_provider,
        policyNumber: profile.insurance_policy_number,
        expiryDate: profile.insurance_expiry,
        coverageAmount: profile.insurance_coverage,
      }
    : null;

  async function handleSave() {
    if (!user || !provider.trim() || !policyNumber.trim() || !expiryDate) return;
    setSaving(true);
    try {
      let coi_url = profile?.coi_url ?? null;
      let coi_file_name = profile?.coi_file_name ?? null;
      if (file) {
        const path = `${user.id}/coi-${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("vendor-documents").upload(path, file, {
          upsert: true,
        });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("vendor-documents").getPublicUrl(path);
        coi_url = data.publicUrl;
        coi_file_name = file.name;
      }
      await update.mutateAsync({
        insured: true,
        insurance_provider: provider.trim(),
        insurance_policy_number: policyNumber.trim(),
        insurance_expiry: expiryDate,
        insurance_coverage: coverageAmount.trim() || null,
        coi_url,
        coi_file_name,
      });
      toast.success("Insurance saved.");
      setOpen(false);
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save insurance.");
    } finally {
      setSaving(false);
    }
  }

  const isFormValid = provider.trim() && policyNumber.trim() && expiryDate;

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <cfg.Icon className={`w-4 h-4 ${cfg.text}`} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Certificate of Insurance</h3>
            <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

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
              <p className="font-medium text-foreground">
                {policy.expiryDate
                  ? new Date(policy.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Coverage</span>
              <p className="font-medium text-foreground">{policy.coverageAmount || "—"}</p>
            </div>
          </div>
          {profile?.coi_url && (
            <a href={profile.coi_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700">
              <FileText className="w-3.5 h-3.5" />
              {profile.coi_file_name || "COI.pdf"}
            </a>
          )}
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          <input className="w-full border border-border rounded-md px-3 py-2 text-sm" placeholder="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
          <input className="w-full border border-border rounded-md px-3 py-2 text-sm" placeholder="Policy number" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          <input className="w-full border border-border rounded-md px-3 py-2 text-sm" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <input className="w-full border border-border rounded-md px-3 py-2 text-sm" placeholder="Coverage amount" value={coverageAmount} onChange={(e) => setCoverageAmount(e.target.value)} />
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-sky-700">
            <Upload className="w-4 h-4" />
            {file ? file.name : "Upload COI (PDF)"}
          </button>
          <button
            type="button"
            disabled={!isFormValid || saving}
            onClick={() => void handleSave()}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save insurance"}
          </button>
        </div>
      )}
    </div>
  );
}
