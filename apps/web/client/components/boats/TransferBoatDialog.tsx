import { useState, type FormEvent } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCancelTransfer, useCreateTransfer, useOutgoingTransfers } from "@/hooks/use-boat-transfers";
import { isTransferLive, transferUrl } from "@shared/boats/transfer";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Send one boat to its buyer, or manage the transfer already waiting on them. */
export default function TransferBoatDialog({
  open,
  onOpenChange,
  boat,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boat: { id: string; label: string };
}) {
  const { data: outgoing = [] } = useOutgoingTransfers();
  const live = outgoing.find((t) => t.boatId === boat.id && isTransferLive(t));
  const create = useCreateTransfer();
  const cancel = useCancelTransfer();
  const [email, setEmail] = useState("");
  const [includeCosts, setIncludeCosts] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await create.mutateAsync({ boatId: boat.id, toEmail: email, includeCosts });
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the transfer.");
    }
  }

  function confirmCancel() {
    if (!live || !window.confirm("Cancel this transfer? The link stops working.")) return;
    cancel.mutate(live.id, { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) });
  }

  const link = live ? transferUrl(window.location.origin, live.token) : "";
  const mailto = live
    ? `mailto:${encodeURIComponent(live.toEmail)}?subject=${encodeURIComponent(`Your ${boat.label} on Bosun`)}&body=${encodeURIComponent(
        `Hi,\n\nI've set up ${boat.label} to move to your Bosun account, with its full service history. Open this link and sign in with this email address to accept it:\n\n${link}\n\nThe link works for 30 days.`,
      )}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Transfer {boat.label}</DialogTitle>
        <DialogDescription>
          The boat moves to the buyer's Bosun account with its Boat Log, maintenance plan and photo. You keep your account, your
          jobs and your invoice files.
        </DialogDescription>

        {live ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
              Waiting on <span className="font-semibold">{live.toEmail}</span> · expires {when(live.expiresAt)}
              {live.includeCosts ? " · costs included" : ""}
            </div>
            <p className="text-muted-foreground">Send them this link. They sign in with that email, or create an account with it, and accept.</p>
            <code className="block min-w-0 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs break-all whitespace-normal">{link}</code>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  toast.success("Link copied");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground"
              >
                <Copy className="w-4 h-4" /> Copy link
              </button>
              <a href={mailto} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted">
                <Mail className="w-4 h-4" /> Email it
              </a>
              <button type="button" onClick={confirmCancel} disabled={cancel.isPending} className="ml-auto text-sm text-red-600 hover:underline disabled:opacity-50">
                Cancel transfer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Buyer's email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@example.com" className={inputCls} />
              <p className="mt-1 text-xs text-muted-foreground">Only an account with this exact email can accept.</p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={includeCosts} onChange={(e) => setIncludeCosts(e.target.checked)} className="mt-0.5" />
              <span>
                Include what I paid
                <span className="block text-xs text-muted-foreground">Costs and line-item prices. Off, and the buyer sees the work and dates only.</span>
              </span>
            </label>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
            <button type="submit" disabled={create.isPending} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {create.isPending ? "Setting up…" : "Create transfer link"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
