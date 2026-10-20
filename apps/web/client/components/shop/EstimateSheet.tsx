import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, Mail, Printer } from "lucide-react";
import { workOrderTotals, type WorkOrder } from "@shared/shop";
import { ESTIMATE_VALID_DAYS, estimateText } from "@shared/shop/estimate";
import { money, shortDate } from "./shopUi";

/** A printable estimate plus the link the customer approves it from. Email it, copy the link, or print. */
export default function EstimateSheet({
  open,
  onOpenChange,
  order,
  shopName,
  link,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: WorkOrder;
  shopName: string;
  link: string;
}) {
  const t = workOrderTotals(order.lines, order.taxRate);
  const sentAt = order.estimateSentAt ?? new Date().toISOString();
  const goodThrough = new Date(Date.parse(sentAt) + ESTIMATE_VALID_DAYS * 86400_000).toISOString();
  const kind = (k: string) => (k === "labor" ? "Labor" : k === "part" ? "Part" : "Fee");
  const { subject, body } = estimateText(order, shopName, link);
  const mailto = `mailto:${encodeURIComponent(order.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the estimate link", link);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogTitle className="sr-only">Estimate {order.number}</DialogTitle>

        <div className="print:hidden rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-sm font-semibold text-sky-900">Send this link. The customer approves or declines there, no account needed.</p>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 px-3 py-1.5 text-sm font-mono border border-border rounded-lg bg-white" aria-label="Estimate link" />
            <button onClick={copyLink} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white hover:bg-muted">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="mt-2 text-xs text-sky-900/70">
            Good through {shortDate(goodThrough)}. You'll get a notification the moment they answer; an approved estimate shows up on your board as a job to schedule.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end print:hidden">
          {order.customerEmail && (
            <a href={mailto} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted">
              <Mail className="w-4 h-4" /> Email to {order.customerEmail}
            </a>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground">
            <Printer className="w-4 h-4" /> Print / save PDF
          </button>
        </div>

        <div id="estimate-sheet" className="text-sm text-foreground">
          <div className="flex items-start justify-between gap-6 border-b border-border pb-4">
            <div>
              <p className="text-xl font-bold tracking-tight">{shopName}</p>
              <p className="text-xs text-muted-foreground mt-1">Estimate</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums">{order.number}</p>
              <p className="text-xs text-muted-foreground">Date {shortDate(sentAt)}</p>
              <p className="text-xs text-muted-foreground">Good through {shortDate(goodThrough)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-4 border-b border-border">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prepared for</p>
              <p className="font-semibold mt-1">{order.customerName || "Customer"}</p>
              {order.customerEmail && <p className="text-muted-foreground">{order.customerEmail}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Boat</p>
              <p className="font-semibold mt-1">{order.boatLabel || "—"}</p>
              {order.engineHours != null && <p className="text-muted-foreground">{order.engineHours} engine hours</p>}
            </div>
          </div>

          <p className="font-semibold pt-4">{order.title}</p>
          {order.description && <p className="text-muted-foreground mt-0.5 whitespace-pre-line">{order.description}</p>}

          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-1.5 font-semibold">Item</th>
                <th className="text-right py-1.5 font-semibold w-16">Qty</th>
                <th className="text-right py-1.5 font-semibold w-24">Rate</th>
                <th className="text-right py-1.5 font-semibold w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={l.id ?? i} className="border-b border-border/60">
                  <td className="py-1.5">
                    {l.description}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{kind(l.kind)}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{l.quantity}{l.kind === "labor" ? " hrs" : ""}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(l.unitPrice)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(l.quantity * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-3 max-w-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Labor ({t.laborHours} hrs)</span><span className="tabular-nums">{money(t.labor)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Parts</span><span className="tabular-nums">{money(t.parts)}</span></div>
            {t.fees > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Fees</span><span className="tabular-nums">{money(t.fees)}</span></div>}
            {t.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({order.taxRate}% on parts)</span><span className="tabular-nums">{money(t.tax)}</span></div>}
            <div className="flex justify-between text-base font-bold border-t border-border pt-1.5"><span>Estimated total</span><span className="tabular-nums">{money(t.total)}</span></div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            An estimate, not a final bill: parts and hours can change once the work is open. Approve online at {link}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
