import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Loader2, Plus, Scissors, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LOG_CATEGORIES,
  invoiceToLogLines,
  useReadInvoice,
  type MaintenanceCategory,
  type NewLogEntry,
} from "@/hooks/use-boat-log";
import { invoiceCheck, splitInvoice, type ExtractedInvoice, type InvoiceLine, type InvoiceSplit } from "@shared/invoice";
import { inputCls, labelCls, money } from "@/components/shop/shopUi";
import { cn } from "@/lib/utils";

type Stage = { step: "pick" } | { step: "reading"; name: string } | { step: "review"; note: string | null };

const EMPTY: ExtractedInvoice = {
  shop: null, invoiceNumber: null, date: null, boat: null, engineHours: null, title: "",
  category: null, laborHours: null, lines: [], tax: null, total: null,
};

/** Upload an old invoice, let Bosun read it, and confirm before it lands in the Boat Log. */
export interface ImportInitial {
  /** What was already read (an emailed receipt); null when reading failed. */
  invoice: ExtractedInvoice | null;
  path: string | null;
  /** Shown instead of the usual "check what we read" line. */
  note?: string | null;
  title?: string;
  description?: string;
}

export default function ImportInvoiceDialog({
  open, onOpenChange, boatId, saving, onSave, initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boatId: string;
  saving: boolean;
  /** One entry, or several when the owner splits the invoice. */
  onSave: (entries: NewLogEntry[]) => void;
  /** Skip the upload step and open straight on review with this data. */
  initial?: ImportInitial;
}) {
  const read = useReadInvoice();
  const [stage, setStage] = useState<Stage>({ step: "pick" });
  const [inv, setInv] = useState<ExtractedInvoice>(EMPTY);
  const [path, setPath] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  // null = one entry for the whole invoice; otherwise each line is assigned to a split.
  const [splits, setSplits] = useState<InvoiceSplit[] | null>(null);
  const [assignment, setAssignment] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setError(null);
    setSplits(null);
    setAssignment([]);
    if (initial) {
      setInv(initial.invoice ?? EMPTY);
      setPath(initial.path);
      setStage({ step: "review", note: initial.note ?? (initial.invoice ? null : "We couldn't read this one. Fill in the details by hand.") });
    } else {
      setStage({ step: "pick" });
      setInv(EMPTY);
      setPath(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const splitEntries = splits ? splitInvoice(inv, splits, assignment) : [];
  const splitCost = (i: number) => {
    const used = splits!.filter((_, gi) => assignment.some((a) => a === gi));
    const idx = used.indexOf(splits![i]);
    return idx >= 0 ? splitEntries[idx]?.cost ?? 0 : 0;
  };

  function startSplit() {
    setSplits([{ title: inv.title, category: inv.category }, { title: "", category: null }]);
    setAssignment(inv.lines.map(() => 0));
  }
  function addSplit() {
    setSplits([...(splits ?? []), { title: "", category: null }]);
  }
  function removeSplit(i: number) {
    const next = splits!.filter((_, j) => j !== i);
    setAssignment(assignment.map((a) => (a === i ? 0 : a > i ? a - 1 : a)));
    if (next.length < 2) {
      setInv({ ...inv, title: next[0]?.title || inv.title, category: next[0]?.category ?? inv.category });
      setSplits(null);
    } else setSplits(next);
  }
  const setSplit = (i: number, patch: Partial<InvoiceSplit>) =>
    setSplits(splits!.map((sp, j) => (j === i ? { ...sp, ...patch } : sp)));

  const usedSplits = splits ? splits.filter((_, gi) => assignment.some((a) => a === gi)) : [];
  const canSave =
    !!inv.date &&
    !saving &&
    (splits ? usedSplits.length > 0 && usedSplits.every((sp) => sp.title.trim()) : !!inv.title.trim());

  function save() {
    const base = {
      boatId,
      date: inv.date!,
      engineHours: inv.engineHours,
      vendorName: inv.shop,
      invoicePath: path,
      invoiceNumber: inv.invoiceNumber,
    };
    const note = (extra: string) =>
      [notes.trim(), inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}${extra}` : extra.replace(/^ · /, "")]
        .filter(Boolean)
        .join("\n") || null;
    if (!splits) {
      onSave([{
        ...base,
        title: inv.title.trim(),
        category: inv.category as MaintenanceCategory | null,
        cost: inv.total ?? (inv.lines.length ? check.computed : null),
        notes: note(""),
        laborHours: inv.laborHours,
        lines: invoiceToLogLines(inv),
      }]);
      return;
    }
    const entries = splitInvoice(inv, splits, assignment);
    onSave(entries.map((e, i) => ({
      ...base,
      title: e.title.trim(),
      category: e.category as MaintenanceCategory | null,
      cost: e.cost,
      notes: note(entries.length > 1 ? ` · part ${i + 1} of ${entries.length}` : ""),
      laborHours: e.laborHours,
      lines: invoiceToLogLines(e),
    })));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.title ?? "Import an invoice"}</DialogTitle>
          <DialogDescription>
            {initial?.description ??
              "Upload a PDF or a photo of an old invoice or receipt. Bosun reads the shop, date, parts and total so you only have to check them."}
          </DialogDescription>
        </DialogHeader>

        {stage.step === "pick" && (
          <div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center hover:border-primary/40 transition-colors">
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
              {!splits && (
                <div className="col-span-2">
                  <label className={labelCls}>What was done</label>
                  <input className={inputCls} value={inv.title} onChange={(e) => setInv({ ...inv, title: e.target.value })} placeholder="Annual service" />
                </div>
              )}
              <div>
                <label className={labelCls}>Shop</label>
                <input className={inputCls} value={inv.shop ?? ""} onChange={(e) => setInv({ ...inv, shop: e.target.value || null })} />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input className={inputCls} type="date" value={inv.date ?? ""} onChange={(e) => setInv({ ...inv, date: e.target.value || null })} />
              </div>
              {!splits && (
                <div>
                  <label className={labelCls}>System</label>
                  <select className={inputCls} value={inv.category ?? ""} onChange={(e) => setInv({ ...inv, category: (e.target.value || null) as ExtractedInvoice["category"] })}>
                    <option value="">Other</option>
                    {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
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

            {inv.lines.length > 1 && !splits && (
              <button
                onClick={startSplit}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline"
              >
                <Scissors className="w-4 h-4" /> Split into separate entries
                <span className="font-normal text-muted-foreground">(e.g. paint and engine work on one bill)</span>
              </button>
            )}

            {splits && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 space-y-2">
                <p className="text-xs text-sky-900">
                  Name each entry, then pick an entry for every line below. Tax and fees are shared out by amount, so the
                  entries add up to what you paid.
                </p>
                {splits.map((sp, i) => (
                  <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <input
                      className={cn(inputCls, "flex-1 min-w-[10rem]")}
                      value={sp.title}
                      onChange={(e) => setSplit(i, { title: e.target.value })}
                      placeholder={i === 0 ? "Engine service" : "Bottom paint"}
                    />
                    <select
                      className={cn(inputCls, "sm:w-44")}
                      value={sp.category ?? ""}
                      onChange={(e) => setSplit(i, { category: (e.target.value || null) as InvoiceSplit["category"] })}
                    >
                      <option value="">Other</option>
                      {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="w-20 text-right text-xs font-semibold tabular-nums">{money(splitCost(i))}</span>
                    <button aria-label="Remove entry" onClick={() => removeSplit(i)} className="text-muted-foreground hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addSplit} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add another entry
                </button>
              </div>
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
                        {splits && <th className="text-left font-medium px-2 py-1.5 w-28">Entry</th>}
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
                          {splits && (
                            <td className="px-2 py-1">
                              <select
                                aria-label="Entry for this line"
                                className="w-full rounded border border-border bg-white px-1 py-0.5 text-xs"
                                value={assignment[i] ?? 0}
                                onChange={(e) => setAssignment(assignment.map((a, j) => (j === i ? Number(e.target.value) : a)))}
                              >
                                {splits.map((sp, gi) => (
                                  <option key={gi} value={gi}>{gi + 1}. {sp.title.trim() || `Entry ${gi + 1}`}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td className="px-1">
                            <button
                              aria-label="Remove line"
                              onClick={() => {
                                setInv({ ...inv, lines: inv.lines.filter((_, j) => j !== i) });
                                setAssignment(assignment.filter((_, j) => j !== i));
                              }}
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
                disabled={!canSave}
                onClick={save}
                className={cn("px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50")}
              >
                {saving ? "Saving…" : splits && usedSplits.length > 1 ? `Add ${usedSplits.length} entries to Boat Log` : "Add to Boat Log"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
