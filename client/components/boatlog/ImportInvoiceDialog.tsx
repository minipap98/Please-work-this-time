import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Loader2, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LOG_CATEGORIES,
  invoiceToLogLines,
  useReadInvoice,
  type MaintenanceCategory,
  type NewLogEntry,
} from "@/hooks/use-boat-log";
import { invoiceCheck, type ExtractedInvoice, type InvoiceLine } from "@shared/invoice";
import { inputCls, labelCls, money } from "@/components/shop/shopUi";
import { cn } from "@/lib/utils";

type Stage = { step: "pick" } | { step: "reading"; name: string } | { step: "review"; note: string | null };

const EMPTY: ExtractedInvoice = {
  shop: null, invoiceNumber: null, date: null, boat: null, engineHours: null, title: "",
  category: null, laborHours: null, lines: [], tax: null, total: null,
};

/** Upload an old invoice, let Bosun read it, and confirm before it lands in the Boat Log. */
export default function ImportInvoiceDialog({
  open, onOpenChange, boatId, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boatId: string;
  saving: boolean;
  onSave: (e: NewLogEntry) => void;
}) {
  const read = useReadInvoice();
  const [stage, setStage] = useState<Stage>({ step: "pick" });
  const [inv, setInv] = useState<ExtractedInvoice>(EMPTY);
  const [path, setPath] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStage({ step: "pick" });
    setInv(EMPTY);
    setPath(null);
    setNotes("");
    setError(null);
  }, [open]);

  function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    setStage({ step: "reading", name: file.name });
    read.mutate(
      { file, boatId },
      {
        onSuccess: (r) => {
          setPath(r.path);
          if (r.status === "read") {
            setInv(r.invoice);
            setStage({ step: "review", note: null });
          } else {
            setInv(EMPTY);
            setStage({ step: "review", note: r.reason });
          }
        },
        onError: (e) => {
          setError(e instanceof Error ? e.message : "Upload failed. Try again.");
          setStage({ step: "pick" });
        },
      }
    );
  }

  const check = invoiceCheck(inv);
  const mismatch = inv.lines.length > 0 && check.difference != null && Math.abs(check.difference) > 1;
  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setInv({ ...inv, lines: inv.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  function save() {
    const cost = inv.total ?? (inv.lines.length ? check.computed : null);
    onSave({
      boatId,
      title: inv.title.trim(),
      category: inv.category as MaintenanceCategory | null,
      date: inv.date!,
      engineHours: inv.engineHours,
      cost,
      vendorName: inv.shop,
      notes: [notes.trim(), inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : ""].filter(Boolean).join("\n") || null,
      laborHours: inv.laborHours,
      lines: invoiceToLogLines(inv),
      invoicePath: path,
      invoiceNumber: inv.invoiceNumber,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import an invoice</DialogTitle>
          <DialogDescription>
            Upload a PDF or a photo of an old invoice or receipt. Bosun reads the shop, date, parts and total so you only
            have to check them.
          </DialogDescription>
        </DialogHeader>

        {stage.step === "pick" && (
          <div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center hover:border-foreground/40 transition-colors">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">Choose a PDF or photo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Up to 15 MB. Stored privately with your boat.</p>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  choose(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <p className="mt-3 text-xs text-muted-foreground">
              Imported entries are marked "Logged by you", not shop-verified. Buyers viewing a share link never see the
              invoice itself.
            </p>
          </div>
        )}

        {stage.step === "reading" && (
          <div className="py-12 text-center">
            <Loader2 className="w-7 h-7 mx-auto animate-spin text-sky-600" />
            <p className="mt-3 text-sm font-semibold">Reading {stage.name}…</p>
            <p className="text-xs text-muted-foreground mt-1">This usually takes 10 to 30 seconds.</p>
          </div>
        )}

        {stage.step === "review" && (
          <div className="space-y-4">
            {stage.note ? (
              <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">{stage.note}</p>
            ) : (
              <p className="flex items-center gap-2 text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-lg p-3">
                <Sparkles className="w-4 h-4 shrink-0" /> Check what we read, fix anything that's off, then save.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>What was done</label>
                <input className={inputCls} value={inv.title} onChange={(e) => setInv({ ...inv, title: e.target.value })} placeholder="Annual service" />
              </div>
              <div>
                <label className={labelCls}>Shop</label>
                <input className={inputCls} value={inv.shop ?? ""} onChange={(e) => setInv({ ...inv, shop: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input className={inputCls} type="date" value={inv.date ?? ""} onChange={(e) => setInv({ ...inv, date: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>System</label>
                <select className={inputCls} value={inv.category ?? ""} onChange={(e) => setInv({ ...inv, category: (e.target.value || null) as ExtractedInvoice["category"] })}>
                  <option value="">Other</option>
                  {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Engine hours</label>
                <input className={inputCls} type="number" min={0} value={inv.engineHours ?? ""} onChange={(e) => setInv({ ...inv, engineHours: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Invoice #</label>
                <input className={inputCls} value={inv.invoiceNumber ?? ""} onChange={(e) => setInv({ ...inv, invoiceNumber: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Total paid</label>
                <input className={inputCls} type="number" min={0} step="0.01" value={inv.total ?? ""} onChange={(e) => setInv({ ...inv, total: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>

            {inv.boat && (
              <p className="text-xs text-muted-foreground">
                Invoice says: <span className="font-medium text-foreground">{inv.boat}</span>. Make sure it's this boat.
              </p>
            )}

            {inv.lines.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                      <tr>
                        <th className="text-left font-medium px-2 py-1.5 w-14">Type</th>
                        <th className="text-left font-medium px-2 py-1.5">Item</th>
                        <th className="text-right font-medium px-2 py-1.5 w-16">Qty</th>
                        <th className="text-right font-medium px-2 py-1.5 w-20">Each</th>
                        <th className="text-right font-medium px-2 py-1.5 w-20">Amount</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {inv.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 uppercase text-[10px] text-muted-foreground">{l.kind}</td>
                          <td className="px-2 py-1">
                            <input
                              className="w-full bg-transparent focus:outline-none focus:bg-muted/40 rounded px-1"
                              value={l.description}
                              onChange={(e) => setLine(i, { description: e.target.value })}
                            />
                            {l.partNumber && <span className="px-1 text-[10px] text-muted-foreground">{l.partNumber}</span>}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">{l.quantity}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{money(l.unitPrice)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{money(l.amount)}</td>
                          <td className="px-1">
                            <button
                              aria-label="Remove line"
                              onClick={() => setInv({ ...inv, lines: inv.lines.filter((_, j) => j !== i) })}
                              className="text-muted-foreground hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/30 text-xs">
                  <span className="text-muted-foreground">
                    {inv.lines.length} lines{inv.tax ? ` + ${money(inv.tax)} tax` : ""} = {money(check.computed)}
                  </span>
                  {mismatch ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> {money(Math.abs(check.difference!))} off the total. Worth a look.
                    </span>
                  ) : (
                    inv.total != null && <span className="font-semibold text-emerald-700">Matches the total</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember about this job" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setStage({ step: "pick" })} className="text-sm text-muted-foreground hover:text-foreground">
                Use a different file
              </button>
              <button
                disabled={!inv.title.trim() || !inv.date || saving}
                onClick={save}
                className={cn("px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50")}
              >
                {saving ? "Saving…" : "Add to Boat Log"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
