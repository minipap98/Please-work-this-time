import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Ship } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/app/Page";
import { useAuth } from "@/context/AuthContext";
import { useAcceptTransfer, useTransferPreview } from "@/hooks/use-boat-transfers";
import { transferProblem } from "@shared/boats/transfer";

/** Where a transfer link lands: the boat on offer, and Accept for the account it was sent to. */
export default function TransferAccept() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data: preview, isLoading, isError } = useTransferPreview(token);
  const accept = useAcceptTransfer();

  function onAccept() {
    accept.mutate(token, {
      onSuccess: () => {
        toast.success("It's yours");
        navigate("/my-boats");
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
    });
  }

  async function switchAccount() {
    await signOut();
    navigate(`/login?next=${encodeURIComponent(`/transfer/${token}`)}`);
  }

  let body: React.ReactNode;
  if (isLoading) {
    body = <p className="text-sm text-muted-foreground">Checking the link…</p>;
  } else if (isError) {
    body = <p className="text-sm text-red-600">Couldn't load this transfer. Try again in a minute.</p>;
  } else if (!preview) {
    body = (
      <>
        <p className="text-sm font-semibold">This transfer link isn't valid.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask the seller to send it again.</p>
      </>
    );
  } else {
    const problem = transferProblem(preview, profile?.email);
    const b = preview.boat;
    const label = b ? [b.year, b.make, b.model].filter(Boolean).join(" ") : "Boat";
    body = (
      <div className="space-y-4">
        <div className="flex gap-4">
          {b?.photoUrl ? (
            <img src={b.photoUrl} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
              <Ship className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground">{b?.name?.trim() || label}</p>
            {b?.name?.trim() && <p className="text-sm text-muted-foreground">{label}</p>}
            {b?.engine && <p className="text-sm text-muted-foreground">{b.engine}</p>}
            {preview.fromName && <p className="mt-1 text-sm text-muted-foreground">From {preview.fromName}</p>}
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm">
          <BadgeCheck className="w-4 h-4 text-emerald-600" />
          {preview.entries} service{preview.entries === 1 ? "" : "s"} on record, {preview.verified} verified by the shops that did them.
          {preview.includeCosts ? " Costs included." : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Accepting moves the boat, its Boat Log, maintenance plan and photo to your account. The seller keeps their jobs and invoice files.
        </p>
        {problem ? (
          <div className="space-y-2">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{problem}</p>
            {preview.status === "pending" && (
              <button type="button" onClick={switchAccount} className="text-sm font-semibold text-sky-700 hover:underline">
                Sign out and use a different account
              </button>
            )}
          </div>
        ) : (
          <button type="button" onClick={onAccept} disabled={accept.isPending} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            {accept.isPending ? "Moving the boat…" : "Accept this boat"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <PageContainer className="max-w-xl">
        <PageHeader title="Boat transfer" description="A boat and its service history, offered to your account." />
        <div className="rounded-xl border border-border bg-white shadow-card p-5">{body}</div>
        <p className="mt-4 text-sm">
          <Link to="/my-boats" className="text-sky-700 hover:underline">
            My Boats
          </Link>
        </p>
      </PageContainer>
    </div>
  );
}
