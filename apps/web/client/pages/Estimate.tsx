import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, Phone, Printer, Globe } from "lucide-react";
import { BosunLogo } from "@/components/marketing/BosunLogo";
import { usePublicEstimate, useRespondToEstimate } from "@/hooks/use-shop";
import { workOrderTotals } from "@shared/shop";
import { publicEstimateState } from "@shared/shop/estimate";

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Where an estimate link lands: the quote as the customer sees it, with Approve and Decline. No login. */
export default function EstimatePage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError } = usePublicEstimate(token);
  const respond = useRespondToEstimate(token);
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#052443]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <BosunLogo className="h-6" />
        <p className="mt-8 text-lg font-semibold text-[#052443]">This estimate isn't available</p>
        <p className="mt-2 text-sm text-slate-600 max-w-sm">
          The link may be incomplete or the shop may have withdrawn it. Ask them to send it again.
        </p>
        <Link to="/boaters" className="mt-6 text-sm font-semibold text-sky-700 hover:underline">What is Bosun?</Link>
      </div>
    );
  }

  const state = publicEstimateState(data);
  const t = workOrderTotals(data.lines, data.taxRate);
  const shop = data.shop;
  const kind = (k: string) => (k === "labor" ? "Labor" : k === "part" ? "Part" : "Fee");
  const busy = respond.isPending;

  const answer = (approve: boolean) =>
    respond.mutate(
      { approve, note },
      {
        onSuccess: () => {
          setDeclining(false);
          toast.success(approve ? "Approved. The shop has been told." : "Sent to the shop.");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
      },
    );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <header className="bg-white border-b border-border print:border-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/boaters" aria-label="Bosun"><BosunLogo className="h-5" /></Link>
          <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#052443]">
            <Printer className="w-4 h-4" /> Print or save PDF
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Estimate {data.number}</p>
        <h1 className="mt-1 text-3xl font-bold text-[#052443]">{data.title}</h1>
        <p className="mt-1 text-slate-600">
          From <span className="font-semibold text-[#052443]">{shop.name}</span>
          {data.customerName && <> for {data.customerName}</>}
          {data.boatLabel && <> · {data.boatLabel}</>}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Sent {longDate(data.sentAt)} · good through {longDate(data.expiresAt)}
          {data.engineHours != null && <> · {data.engineHours} engine hours</>}
        </p>

        {state === "approved" && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
            <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">You approved this estimate on {longDate(data.approvedAt!)}.</p>
              <p className="mt-0.5 text-sm text-emerald-900/80">
                {shop.name} will be in touch to schedule the work.{shop.phone ? ` Questions? Call ${shop.phone}.` : ""}
              </p>
              {data.note && <p className="mt-1 text-sm text-emerald-900/80">Your note: “{data.note}”</p>}
            </div>
          </div>
        )}
        {state === "declined" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">You declined this estimate on {longDate(data.declinedAt!)}.</p>
            <p className="mt-0.5 text-sm text-amber-900/80">
              {data.note ? `Your note: “${data.note}”. ` : ""}Changed your mind? You can still approve it below until it expires.
            </p>
          </div>
        )}
        {state === "expired" && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-[#052443]">This estimate expired on {longDate(data.expiresAt)}.</p>
            <p className="mt-0.5 text-sm text-slate-600">Prices and parts may have changed. {shop.phone ? `Call ${shop.name} at ${shop.phone} for a current one.` : `Ask ${shop.name} for a current one.`}</p>
          </div>
        )}

        <div className="mt-6 bg-white border border-border rounded-2xl overflow-hidden">
          {data.description && <p className="px-4 pt-4 text-sm text-slate-700 whitespace-pre-line">{data.description}</p>}
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-border">
                <th className="text-left px-4 py-2 font-semibold">Item</th>
                <th className="text-right px-2 py-2 font-semibold w-16">Qty</th>
                <th className="text-right px-2 py-2 font-semibold w-24 hidden sm:table-cell">Rate</th>
                <th className="text-right px-4 py-2 font-semibold w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-4 py-2">
                    {l.description}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400">{kind(l.kind)}</span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.quantity}{l.kind === "labor" ? " hrs" : ""}</td>
                  <td className="px-2 py-2 text-right tabular-nums hidden sm:table-cell">{money(l.unitPrice)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{money(l.quantity * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Labor ({t.laborHours} hrs)</span><span className="tabular-nums">{money(t.labor)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Parts</span><span className="tabular-nums">{money(t.parts)}</span></div>
            {t.fees > 0 && <div className="flex justify-between"><span className="text-slate-500">Fees</span><span className="tabular-nums">{money(t.fees)}</span></div>}
            {t.tax > 0 && <div className="flex justify-between"><span className="text-slate-500">Tax ({data.taxRate}% on parts)</span><span className="tabular-nums">{money(t.tax)}</span></div>}
            <div className="flex justify-between text-base font-bold text-[#052443] border-t border-border pt-1.5"><span>Estimated total</span><span className="tabular-nums">{money(t.total)}</span></div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">An estimate, not a final bill: parts and hours can change once the work is open. {shop.name} will tell you before anything changes the total.</p>

        {(state === "open" || state === "declined") && (
          <div className="print:hidden mt-6 bg-white border border-border rounded-2xl p-4 sm:p-5">
            <label htmlFor="estimate-note" className="block text-sm font-semibold text-[#052443]">
              Anything the shop should know? <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="estimate-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Any week after the 15th works for us."
              className="mt-2 w-full px-3 py-2 text-sm border border-border rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
            {declining ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-600 flex-1 min-w-[12rem]">Tell {shop.name} no? They'll see your note.</p>
                <button onClick={() => setDeclining(false)} className="px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-slate-50">Back</button>
                <button onClick={() => answer(false)} disabled={busy} className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  {busy ? "Sending…" : "Decline estimate"}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => answer(true)} disabled={busy} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                  {busy ? "Sending…" : "Approve estimate"}
                </button>
                {state === "open" && (
                  <button onClick={() => setDeclining(true)} disabled={busy} className="px-4 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-slate-50 disabled:opacity-50">
                    Decline
                  </button>
                )}
                <p className="text-xs text-slate-500 basis-full sm:basis-auto sm:ml-auto">Approving tells {shop.name} to go ahead and schedule it.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-[#052443]">{shop.name}</p>
          {shop.serviceArea && <p>{shop.serviceArea}</p>}
          {shop.phone && <p className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <a className="hover:underline" href={`tel:${shop.phone.replace(/[^\d+]/g, "")}`}>{shop.phone}</a></p>}
          {shop.website && <p className="inline-flex items-center gap-1.5 sm:ml-4"><Globe className="w-3.5 h-3.5" /> <a className="hover:underline" href={shop.website.startsWith("http") ? shop.website : `https://${shop.website}`} target="_blank" rel="noreferrer">{shop.website.replace(/^https?:\/\//, "")}</a></p>}
        </div>

        <div className="print:hidden mt-10 rounded-2xl bg-[#052443] text-white p-6 text-center">
          <p className="font-semibold">Keep this job with your boat</p>
          <p className="mt-1 text-sm text-slate-300">
            A free Bosun account keeps every service on record, reminds you what's due, and makes the history worth something when you sell.
          </p>
          <Link to="/boaters" className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold">
            See how it works
          </Link>
        </div>
      </main>
    </div>
  );
}
