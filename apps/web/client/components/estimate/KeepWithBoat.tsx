import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Ship } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLogBoats } from "@/hooks/use-boat-log";
import { useMyBoats } from "@/hooks/use-my-boat";
import { useClaimEstimate } from "@/hooks/use-shop";
import { useCreateBoat } from "@/hooks/use-supabase";
import { isDemoMode } from "@/lib/demoMode";
import { supabaseMissing } from "@/lib/supabase";
import { boatRowFromForm, type BoatForm } from "@shared/boats/boats";
import { boatFormFromEstimateLabel, estimateClaimStep, estimateLoginPath, pickClaimBoat, type PublicEstimate } from "@shared/shop/estimate";

const input = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400";

/**
 * "Keep this job with your boat": after approving, the customer files the estimate to one of
 * their own boats so the shop's completed record lands in their Boat Log. Log in or sign up
 * (both come back here), pick a boat or add one prefilled from the shop's label, then
 * claim_estimate() does the write. The demo's one boat stands in for a signed-in owner.
 */
export default function KeepWithBoat({ token, estimate }: { token: string; estimate: PublicEstimate }) {
  const { user } = useAuth();
  const demo = isDemoMode();
  const signedIn = demo || !!user;
  const step = estimateClaimStep(estimate, signedIn);

  // Not approved yet: just the pitch, same as before estimates could be kept.
  if (step === "approve-first") {
    return (
      <section className="print:hidden mt-10 rounded-2xl bg-[#052443] text-white p-6 text-center">
        <p className="font-semibold">Keep this job with your boat</p>
        <p className="mt-1 text-sm text-slate-300">
          A free Bosun account keeps every service on record, reminds you what's due, and makes the history worth something when you sell.
        </p>
        <Link to="/boaters" className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold">
          See how it works
        </Link>
      </section>
    );
  }

  return (
    <section className="print:hidden mt-10 rounded-2xl bg-[#052443] text-white p-6">
      {step === "kept" || step === "filed" ? (
        <Filed estimate={estimate} step={step} />
      ) : (
        <>
          <h2 className="font-semibold text-lg">Keep this job with your boat</h2>
          <p className="mt-1 text-sm text-slate-300">
            A free Bosun account keeps every service on record, reminds you what's due, and makes the history worth something when you sell.
            {step === "pick-boat" ? " Pick the boat this job is for and the shop's record goes into your Boat Log when they finish." : ""}
          </p>
          {step === "sign-in" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={estimateLoginPath(token, "signin")} className="inline-block px-5 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold">
                Log in
              </Link>
              <Link to={estimateLoginPath(token, "signup")} className="inline-block px-5 py-2.5 rounded-xl border border-white/40 text-white text-sm font-semibold hover:bg-white/10">
                Sign up
              </Link>
              <p className="basis-full text-xs text-slate-400 mt-1">Use the email the shop sent this estimate to. You'll come straight back here.</p>
            </div>
          ) : (
            <PickBoat token={token} estimate={estimate} demo={demo} />
          )}
        </>
      )}
    </section>
  );
}

function Filed({ estimate, step }: { estimate: PublicEstimate; step: "kept" | "filed" }) {
  return (
    <div className="flex gap-3">
      <BadgeCheck className="w-6 h-6 text-emerald-300 shrink-0 mt-0.5" />
      <div>
        <h2 className="font-semibold text-lg">Filed to your Boat Log</h2>
        <p className="mt-1 text-sm text-slate-300">
          {step === "filed"
            ? `${estimate.shop.name}'s itemized record of this job is in your Boat Log.`
            : `This job is kept with your boat. ${estimate.shop.name}'s itemized record lands in your Boat Log the moment they mark it complete.`}
        </p>
        <Link to={`/boat-log${estimate.ownerBoatId ? `?boat=${encodeURIComponent(estimate.ownerBoatId)}` : ""}`} className="mt-3 inline-block px-4 py-2 rounded-xl bg-white text-[#052443] text-sm font-semibold">
          Open the Boat Log
        </Link>
      </div>
    </div>
  );
}

function PickBoat({ token, estimate, demo }: { token: string; estimate: PublicEstimate; demo: boolean }) {
  const { data: boats = [], isLoading } = useLogBoats();
  const { primary } = useMyBoats();
  const claim = useClaimEstimate(token);
  const create = useCreateBoat();
  const guess = useMemo(() => pickClaimBoat({ boatLabel: estimate.boatLabel }, boats, primary?.id), [boats, estimate.boatLabel, primary?.id]);
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<BoatForm>(() => boatFormFromEstimateLabel(estimate.boatLabel));
  const selected = picked ?? guess?.id ?? null;
  const busy = claim.isPending || create.isPending;
  const canAdd = !demo && !supabaseMissing;
  const showForm = !isLoading && (adding || boats.length === 0);

  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : String(e));

  const keep = (boatId: string) =>
    claim.mutate(boatId, {
      onSuccess: (r) => toast.success(r.filed ? "Filed to your Boat Log." : "Kept with your boat. It's filed when the shop marks it complete."),
      onError: fail,
    });

  async function addAndKeep() {
    if (!form.make.trim() && !form.model.trim() && !form.name.trim()) {
      toast.error("Give the boat at least a make or a name.");
      return;
    }
    try {
      const row = await create.mutateAsync(boatRowFromForm(form));
      keep(row.id);
    } catch (e) {
      fail(e);
    }
  }

  const set = (k: keyof BoatForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (isLoading) return <p className="mt-4 text-sm text-slate-300">Loading your boats…</p>;

  return (
    <div className="mt-4">
      {boats.length > 0 && !adding && (
        <>
          <ul className="space-y-2" role="radiogroup" aria-label="Your boats">
            {boats.map((b) => (
              <li key={b.id}>
                <label className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${selected === b.id ? "border-sky-300 bg-white/10" : "border-white/20 hover:bg-white/5"}`}>
                  <input type="radio" name="keep-boat" className="accent-sky-400" checked={selected === b.id} onChange={() => setPicked(b.id)} />
                  <Ship className="w-4 h-4 text-sky-300 shrink-0" />
                  <span className="text-sm">
                    <span className="font-semibold">{b.name || b.label}</span>
                    {b.name && b.label && <span className="text-slate-300"> · {b.label}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => selected && keep(selected)} disabled={!selected || busy} className="px-5 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold disabled:opacity-50">
              {claim.isPending ? "Filing…" : "Keep with this boat"}
            </button>
            {canAdd && (
              <button onClick={() => setAdding(true)} disabled={busy} className="px-4 py-2.5 rounded-xl border border-white/40 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">
                It's a different boat
              </button>
            )}
          </div>
        </>
      )}

      {showForm && (
        canAdd ? (
          <div className="rounded-xl border border-white/20 bg-white/5 p-4">
            <p className="text-sm font-semibold">{boats.length === 0 ? "Add your boat" : "Add a different boat"}</p>
            <p className="text-xs text-slate-300 mt-0.5">Filled in from the shop's record. You can add engines and a home port later in My Boats.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[#052443]">
              <label className="text-xs font-medium text-slate-200">Boat name
                <input className={`${input} mt-1`} value={form.name} onChange={set("name")} placeholder="Reel Time" />
              </label>
              <label className="text-xs font-medium text-slate-200">Year
                <input className={`${input} mt-1`} value={form.year} onChange={set("year")} inputMode="numeric" placeholder="2019" />
              </label>
              <label className="text-xs font-medium text-slate-200">Make
                <input className={`${input} mt-1`} value={form.make} onChange={set("make")} placeholder="Pursuit" />
              </label>
              <label className="text-xs font-medium text-slate-200">Model
                <input className={`${input} mt-1`} value={form.model} onChange={set("model")} placeholder="S 288" />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={addAndKeep} disabled={busy} className="px-5 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold disabled:opacity-50">
                {busy ? "Saving…" : "Add boat and keep this job"}
              </button>
              {boats.length > 0 && (
                <button onClick={() => setAdding(false)} disabled={busy} className="px-4 py-2.5 rounded-xl border border-white/40 text-sm font-semibold hover:bg-white/10">
                  Back
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300">Add your boat in <Link to="/my-boats" className="font-semibold text-white underline">My Boats</Link>, then come back to this link.</p>
        )
      )}
    </div>
  );
}
