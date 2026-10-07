import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Mail, Printer } from "lucide-react";
import { workOrderTotals, type WorkOrder } from "@shared/shop";
import { money, shortDate } from "./shopUi";

/** A printable invoice for one work order. Print it, save as PDF, or email a summary. */
export default function InvoiceSheet({
  open,
  onOpenChange,
  order,
  shopName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: WorkOrder;
  shopName: string;
}) {
  const t = workOrderTotals(order.lines, order.taxRate);
  const invoiceDate = order.invoicedAt ?? order.completedAt ?? new Date().toISOString();
  const kind = (k: string) => (k === "labor" ? "Labor" : k === "part" ? "Part" : "Fee");
  const lines = order.lines.map((l) => `${l.description} — ${l.quantity} × ${money(l.unitPrice)} = ${money(l.quantity * l.unitPrice)}`).join("\n");
  const mailto =
    `mailto:${encodeURIComponent(order.customerEmail)}` +
    `?subject=${encodeURIComponent(`Invoice ${order.number} from ${shopName}`)}` +
    `&body=${encodeURIComponent(
      `Hi ${order.customerName.split(" ")[0] || "there"},\n\nHere's the invoice for ${order.title}${order.boatLabel ? ` on ${order.boatLabel}` : ""}.\n\n${lines}\n\nSubtotal ${money(t.subtotal)}${t.tax ? `\nTax ${money(t.tax)}` : ""}\nTotal due ${money(t.total)}\n\n${order.description ? `Notes: ${order.description}\n\n` : ""}Thank you,\n${shopName}`
    )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogTitle className="sr-only">Invoice {order.number}</DialogTitle>
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

        <div id="invoice-sheet" className="text-sm text-foreground">
          <div className="flex items-start justify-between gap-6 border-b border-border pb-4">
            <div>
              <p className="text-xl font-bold tracking-tight">{shopName}</p>
              <p className="text-xs text-muted-foreground mt-1">Invoice</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums">{order.number}</p>
              <p className="text-xs text-muted-foreground">Date {shortDate(invoiceDate)}</p>
              {order.paidAt && <p className="mt-1 inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-300 rounded px-1.5 py-0.5">Paid {shortDate(order.paidAt)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-4 border-b border-border">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bill to</p>
              <p className="font-semibold mt-1">{order.customerName || "Customer"}</p>
              {order.customerEmail && <p className="text-muted-foreground">{order.customerEmail}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Boat</p>
              <p className="font-semibold mt-1">{order.boatLabel || "—"}</p>
              {order.engineHours != null && <p className="text-muted-foreground">{order.engineHours} engine hours at intake</p>}
              {order.completedAt && <p className="text-muted-foreground">Work completed {shortDate(order.completedAt)}</p>}
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
            <div className="flex justify-between text-base font-bold border-t border-border pt-1.5"><span>{order.paidAt ? "Total paid" : "Total due"}</span><span className="tabular-nums">{money(t.total)}</span></div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">Thank you for your business.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
