import { Link, useNavigate } from "react-router-dom";
import { Ship } from "lucide-react";
import { toast } from "sonner";
import { useAcceptTransfer, useIncomingTransfers, useTransferPreview, type BoatTransfer } from "@/hooks/use-boat-transfers";
import { cn } from "@/lib/utils";

/** Boats other owners have handed to this account and that are still waiting on a yes. */
export default function IncomingTransfers({ className }: { className?: string }) {
  const { data: incoming = [] } = useIncomingTransfers();
  if (incoming.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {incoming.map((t) => (
        <Row key={t.id} transfer={t} />
      ))}
    </div>
  );
}

function Row({ transfer }: { transfer: BoatTransfer }) {
  const navigate = useNavigate();
  const { data: p } = useTransferPreview(transfer.token);
  const accept = useAcceptTransfer();
  const label = p?.boat ? [p.boat.year, p.boat.make, p.boat.model].filter(Boolean).join(" ") : "A boat";
  const from = p?.fromName ? ` from ${p.fromName}` : "";

  function onAccept() {
    accept.mutate(transfer.token, {
      onSuccess: () => {
        toast.success("It's yours");
        navigate("/my-boats");
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <Ship className="w-5 h-5 text-sky-700 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-sky-900">
          {label}
          {from} is waiting for you
        </p>
        {p && (
          <p className="text-xs text-sky-800">
            {p.entries} service{p.entries === 1 ? "" : "s"} on record ({p.verified} verified by shops)
          </p>
        )}
      </div>
      <Link to={`/transfer/${transfer.token}`} className="text-xs font-semibold text-sky-700 hover:underline">
        View
      </Link>
      <button type="button" onClick={onAccept} disabled={accept.isPending} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
        Accept
      </button>
    </div>
  );
}
