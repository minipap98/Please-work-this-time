import { useState, useEffect, useMemo } from "react";

interface WarrantyClaim {
  id: string;
  projectId: string;
  projectTitle: string;
  ownerName: string;
  equipmentManufacturer: string;
  equipmentModel: string;
  serialNumber: string;
  status:
    | "submitted"
    | "pending_manufacturer"
    | "approved"
    | "denied"
    | "parts_ordered";
  submittedDate: string;
  lastUpdated: string;
  notes: string;
  claimAmount: number;
}

const STORAGE_KEY = "bosun_vendor_warranty_claims";

const STATUS_OPTIONS: WarrantyClaim["status"][] = [
  "submitted",
  "pending_manufacturer",
  "approved",
  "denied",
  "parts_ordered",
];

const STATUS_CONFIG: Record<
  WarrantyClaim["status"],
  { label: string; classes: string }
> = {
  submitted: {
    label: "Submitted",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  pending_manufacturer: {
    label: "Pending Manufacturer",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    classes: "bg-green-50 text-green-700 border-green-200",
  },
  denied: {
    label: "Denied",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
  parts_ordered: {
    label: "Parts Ordered",
    classes: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

function loadClaims(): WarrantyClaim[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveClaims(claims: WarrantyClaim[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

export default function VendorWarrantyClaims() {
  const [claims, setClaims] = useState<WarrantyClaim[]>(loadClaims);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<WarrantyClaim["status"]>("submitted");
  const [editAmount, setEditAmount] = useState("");

  // Re-sync from storage on mount
  useEffect(() => {
    setClaims(loadClaims());
  }, []);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return claims;
    return claims.filter((c) => c.status === filterStatus);
  }, [claims, filterStatus]);

  const stats = useMemo(() => {
    const total = claims.length;
    const approvedAmount = claims
      .filter((c) => c.status === "approved")
      .reduce((sum, c) => sum + c.claimAmount, 0);
    const pendingCount = claims.filter(
      (c) => c.status === "submitted" || c.status === "pending_manufacturer"
    ).length;
    return { total, approvedAmount, pendingCount };
  }, [claims]);

  function startEdit(claim: WarrantyClaim) {
    setEditingId(claim.id);
    setEditNotes(claim.notes);
    setEditStatus(claim.status);
    setEditAmount(String(claim.claimAmount || ""));
  }

  function saveEdit(id: string) {
    const updated = claims.map((c) =>
      c.id === id
        ? {
            ...c,
            status: editStatus,
            notes: editNotes,
            claimAmount: parseFloat(editAmount) || 0,
            lastUpdated: new Date().toISOString().split("T")[0],
          }
        : c
    );
    setClaims(updated);
    saveClaims(updated);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Total Claims
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {stats.total}
          </p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Approved Amount
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            ${stats.approvedAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Pending
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {stats.pendingCount}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">Filter:</span>
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            filterStatus === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white text-foreground border-border hover:border-primary"
          }`}
        >
          All ({claims.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = claims.filter((c) => c.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-foreground border-border hover:border-primary"
              }`}
            >
              {STATUS_CONFIG[s].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Claims list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {claims.length === 0
              ? "No warranty claims yet. File a claim from a project's Equipment & Warranty section."
              : "No claims match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <th className="text-left px-4 py-3">Project / Equipment</th>
                <th className="text-left px-4 py-3">Serial #</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((claim) => {
                const isEditing = editingId === claim.id;
                return (
                  <tr
                    key={claim.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">
                        {claim.projectTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {claim.equipmentManufacturer} {claim.equipmentModel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Owner: {claim.ownerName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {claim.serialNumber}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) =>
                            setEditStatus(
                              e.target.value as WarrantyClaim["status"]
                            )
                          }
                          className="border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[claim.status].classes}`}
                        >
                          {STATUS_CONFIG[claim.status].label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 border border-border rounded pl-5 pr-2 py-1 text-xs text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-foreground">
                          {claim.claimAmount > 0
                            ? `$${claim.claimAmount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "--"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {claim.submittedDate}
                      {claim.lastUpdated !== claim.submittedDate && (
                        <p className="text-[10px] mt-0.5">
                          Updated: {claim.lastUpdated}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-w-[140px]"
                          placeholder="Add notes..."
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {claim.notes || "--"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => saveEdit(claim.id)}
                            className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2.5 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(claim)}
                          className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
