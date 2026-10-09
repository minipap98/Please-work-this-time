import { useState } from "react";
import { Inbox, Mail } from "lucide-react";
import { toast } from "sonner";
import ImportInvoiceDialog from "@/components/boatlog/ImportInvoiceDialog";
import { useAddLogEntry, useLogBoats, useReceiptInbox, useResolveReceipt, type InboxReceipt } from "@/hooks/use-boat-log";
import { useMyBoats } from "@/hooks/use-my-boat";
import { useDemoMode } from "@/lib/demoMode";
import { cn } from "@/lib/utils";
import { RECEIPTS_ADDRESS } from "@shared/boatLog/receipts";

export { RECEIPTS_ADDRESS };

const when = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Receipts the owner emailed in, waiting for a look. Each one opens the same review the manual
 * import uses; nothing reaches the Boat Log until they save it.
 */
export default function ReceiptInbox({ className }: { className?: string }) {
  const { demo } = useDemoMode();
  const inbox = useReceiptInbox();
  const resolve = useResolveReceipt();
  const add = useAddLogEntry();
  const { data: boats = [] } = useLogBoats();
  const { primary } = useMyBoats();
  const [open, setOpen] = useState<InboxReceipt | null>(null);
  const [boatId, setBoatId] = useState<string>("");

  if (demo) return null;
  const items = inbox.data ?? [];
  if (items.length === 0) return null;

  const start = (r: InboxReceipt) => {
    // Best guess at the boat: the invoice names one, else the active boat.
    const named = r.extracted?.boat?.toLowerCase() ?? "";
    const match = named ? boats.find((b) => [b.name, b.label].some((x) => x && named.includes(x.toLowerCase()))) : undefined;
    setBoatId(match?.id ?? primary?.id ?? boats[0]?.id ?? "");
    setOpen(r);
  };

  return (
    <section className={cn("min-w-0 overflow-hidden rounded-xl border border-sky-200 bg-sky-50/60 p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-white border border-sky-200 flex items-center justify-center shrink-0 text-sky-700"><Inbox className="w-4 h-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {items.length === 1 ? "1 emailed receipt to review" : `${items.length} emailed receipts to review`}
          </p>
          <p className="text-xs text-muted-foreground">Nothing is added to your Boat Log until you check it.</p>
          <ul className="mt-3 divide-y divide-sky-100 rounded-lg border border-sky-100 bg-white">
            {items.map((r) => (
              <li key={r.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <Mail className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                  <p className="text-sm font-medium truncate">
                    {r.extracted?.title || r.subject || r.attachmentName || "Receipt"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[r.extracted?.shop, r.extracted?.date ? when(r.extracted.date) : null, r.extracted?.total != null ? `$${r.extracted.total.toLocaleString()}` : null, `received ${when(r.receivedAt)}`]
                      .filter(Boolean)
                      .join(" · ")}
                    {r.reading && <span className="text-sky-700"> · reading it now…</span>}
                    {r.readError && !r.extracted && <span className="text-amber-700"> · couldn't be read, fill in by hand</span>}
                  </p>
                </div>
                <button
                  onClick={() => start(r)}
                  disabled={r.reading}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground whitespace-nowrap disabled:opacity-50"
                >
                  {r.reading ? "Reading…" : "Review"}
                </button>
                <button
                  onClick={() => resolve.mutate({ id: r.id, status: "dismissed" }, { onError: (e) => toast.error(e.message) })}
                  className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  Not a receipt
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {open && boatId && (
        <ImportInvoiceDialog
          open
          onOpenChange={(o) => !o && setOpen(null)}
          boatId={boatId}
          saving={add.isPending}
          initial={{
            invoice: open.extracted,
            path: open.attachmentPath,
            title: "Review emailed receipt",
            description: `From ${open.fromEmail}${open.subject ? ` · "${open.subject}"` : ""}. Check what we read, pick the boat, then save.`,
          }}
          onSave={async (entries) => {
            try {
              for (const e of entries) await add.mutateAsync({ ...e, boatId });
              await resolve.mutateAsync({ id: open.id, status: "added" });
              setOpen(null);
              toast.success(entries.length > 1 ? `Added ${entries.length} entries to the Boat Log` : "Added to the Boat Log");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}
      {open && boats.length > 1 && (
        <BoatPickBar boats={boats} value={boatId} onChange={setBoatId} />
      )}
    </section>
  );
}

/** Floats above the review dialog so the owner can change which boat the receipt belongs to. */
function BoatPickBar({ boats, value, onChange }: { boats: { id: string; name: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] rounded-full border border-border bg-white shadow-lg px-3 py-1.5 flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">This receipt is for</span>
      <select className="bg-transparent font-semibold focus:outline-none" value={value} onChange={(e) => onChange(e.target.value)}>
        {boats.map((b) => <option key={b.id} value={b.id}>{b.name ? `${b.name} · ${b.label}` : b.label}</option>)}
      </select>
    </div>
  );
}
