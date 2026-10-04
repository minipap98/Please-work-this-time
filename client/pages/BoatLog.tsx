import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LOG_CATEGORIES,
  historyShareUrl,
  useCreateHistoryShare,
  useHistoryShare,
  useRevokeHistoryShare,
  useSetHistoryCosts,
  useAddLogEntry,
  useBoatLog,
  useDeleteLogEntry,
  useLogBoats,
  type LogBoat,
  type MaintenanceCategory,
  type NewLogEntry,
} from "@/hooks/use-boat-log";
import { isVerified, logToCsv, summarizeLog, type LogEntry } from "@shared/boatLog";
import { lineAmount } from "@shared/shop";
import { downloadFile, inputCls, labelCls, money } from "@/components/shop/shopUi";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | "verified" | "owner";

function longDate(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BoatLog() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data: boats = [], isLoading } = useLogBoats();
  const boatId = params.get("boat") ?? boats[0]?.id;
  const boat = boats.find((b) => b.id === boatId);
  const { data: entries = [] } = useBoatLog(boatId);
  const add = useAddLogEntry();
  const remove = useDeleteLogEntry();

  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);

  const summary = useMemo(() => summarizeLog(entries), [entries]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries
      .filter((e) => source === "all" || (source === "verified" ? isVerified(e) : !isVerified(e)))
      .filter((e) => category === "all" || e.category === category)
      .filter(
        (e) =>
          !needle ||
          [e.title, e.vendorName ?? "", e.notes ?? "", ...e.lines.map((l) => l.description)].some((f) =>
            f.toLowerCase().includes(needle)
          )
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, source, category, q]);

  const byYear = useMemo(() => {
    const m = new Map<string, LogEntry[]>();
    for (const e of shown) {
      const y = e.date.slice(0, 4);
      m.set(y, [...(m.get(y) ?? []), e]);
    }
    return [...m.entries()];
  }, [shown]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!isLoading && boats.length === 0) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Boat Log</h1>
          <p className="text-muted-foreground mt-2">
            Add your boat during onboarding or in My Boats, and every job — yours and your yard's — will be logged here.
          </p>
          <Link to="/my-boats" className="inline-block mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background">
            Go to My Boats
          </Link>
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Boat Log</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              The full service history of your boat. Jobs done through Bosun are itemized and verified by the shop.
            </p>
          </div>
          {boats.length > 1 && (
            <select
              className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
              value={boatId}
              onChange={(e) => setParams({ boat: e.target.value })}
            >
              {boats.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.label}</option>)}
            </select>
          )}
        </div>

        {boat && (
          <div className="border border-border rounded-xl bg-white p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold truncate">{boat.name}</p>
                <p className="text-sm text-muted-foreground">{[boat.label, boat.engine].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadFile(`${boat.name.replace(/\W+/g, "-")}-service-log.csv`, logToCsv(entries))}
                  disabled={entries.length === 0}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                >
                  CSV
                </button>
                <button
                  onClick={() =>
                    exportPdf(boat, entries).catch((e) =>
                      toast({ title: "PDF failed", description: String(e), variant: "destructive" })
                    )
                  }
                  disabled={entries.length === 0}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                >
                  Service history PDF
                </button>
                <button
                  onClick={() => setSharing(true)}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100"
                >
                  Share for a listing
                </button>
                <button onClick={() => setAdding(true)} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-foreground text-background">
                  + Log work
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Stat label="Entries" value={String(summary.entries)} sub={`${summary.verified} shop-verified`} />
              <Stat label="Last service" value={summary.lastService ? longDate(summary.lastService) : "—"} />
              <Stat label="Engine hours" value={summary.latestEngineHours != null ? String(summary.latestEngineHours) : "—"} sub="last recorded" />
              <Stat label="Lifetime spend" value={money(summary.totalSpent)} sub={summary.spentByYear[0] ? `${money(summary.spentByYear[0].total)} in ${summary.spentByYear[0].year}` : undefined} />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex gap-1">
            {([["all", "All"], ["verified", "Shop-verified"], ["owner", "My entries"]] as [SourceFilter, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSource(v)}
                className={cn("text-xs font-medium rounded-full px-3 py-1.5 border whitespace-nowrap", source === v ? "bg-foreground text-background border-foreground" : "border-border bg-white hover:bg-muted")}
              >
                {l}
              </button>
            ))}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white">
            <option value="all">All systems</option>
            {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search work, parts, shops…"
            className="sm:ml-auto sm:w-64 px-3 py-1.5 text-sm border border-border rounded-lg bg-white"
          />
        </div>

        {shown.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-12 text-center bg-white">
            <p className="text-sm font-semibold">{entries.length === 0 ? "No work logged yet" : "Nothing matches"}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {entries.length === 0
                ? "Log past work yourself. Jobs you book on Bosun are added automatically when the shop closes them out."
                : "Try another filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {byYear.map(([year, list]) => (
              <section key={year}>
                <h2 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">{year}</h2>
                <ol className="relative border-l-2 border-border ml-2 space-y-3">
                  {list.map((e) => {
                    const verified = isVerified(e);
                    const open = expanded.has(e.id);
                    return (
                      <li key={e.id} className="ml-4">
                        <span className={cn("absolute -left-[7px] mt-4 w-3 h-3 rounded-full border-2 border-white", verified ? "bg-emerald-500" : "bg-slate-400")} />
                        <div className="border border-border rounded-xl bg-white p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">{longDate(e.date)}</span>
                                {verified ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                    ✓ Verified by {e.vendorName ?? "shop"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
                                    {e.vendorName ? `Logged by you · ${e.vendorName}` : "Logged by you"}
                                  </span>
                                )}
                                {e.category && <span className="text-[10px] text-muted-foreground">{e.category}</span>}
                              </div>
                              <p className="text-sm font-semibold mt-1">{e.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[
                                  e.engineHours != null && `${e.engineHours} engine hrs`,
                                  e.laborHours != null && `${e.laborHours} labor hrs`,
                                  e.lines.filter((l) => l.kind === "part").length > 0 && `${e.lines.filter((l) => l.kind === "part").length} parts`,
                                ].filter(Boolean).join(" · ")}
                              </p>
                              {e.notes && <p className="text-sm text-foreground/80 mt-2">{e.notes}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              {e.cost != null && <p className="text-sm font-semibold tabular-nums">{money(e.cost)}</p>}
                              {e.lines.length > 0 && (
                                <button onClick={() => toggle(e.id)} className="text-xs text-sky-700 hover:underline mt-1">
                                  {open ? "Hide" : "Itemized"}
                                </button>
                              )}
                              {!verified && (
                                <button
                                  onClick={() => confirm("Delete this entry?") && remove.mutate({ id: e.id, boatId: e.boatId })}
                                  className="block ml-auto text-[11px] text-muted-foreground hover:text-red-600 mt-1"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          {open && (
                            <table className="w-full text-xs mt-3 border-t border-border">
                              <tbody>
                                {e.lines.map((l, i) => (
                                  <tr key={i} className="border-b border-border/60 last:border-0">
                                    <td className="py-1.5 pr-2 text-[10px] uppercase text-muted-foreground w-12">{l.kind}</td>
                                    <td className="py-1.5 pr-2">{l.description}</td>
                                    <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">{l.quantity} × {money(l.unitPrice)}</td>
                                    <td className="py-1.5 text-right tabular-nums">{money(lineAmount(l))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </main>

      {boat && <ShareDialog open={sharing} onOpenChange={setSharing} boat={boat} entryCount={entries.length} />}

      {boat && (
        <AddEntryDialog
          open={adding}
          onOpenChange={setAdding}
          boatId={boat.id}
          lastHours={summary.latestEngineHours}
          saving={add.isPending}
          onSave={(entry) =>
            add.mutate(entry, {
              onSuccess: () => {
                setAdding(false);
                toast({ title: "Logged" });
              },
              onError: (err) => toast({ title: "Couldn't save", description: String(err), variant: "destructive" }),
            })
          }
        />
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-bold tabular-nums truncate">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

function AddEntryDialog({
  open, onOpenChange, boatId, lastHours, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boatId: string;
  lastHours: number | null;
  saving: boolean;
  onSave: (e: NewLogEntry) => void;
}) {
  const blank = (): NewLogEntry => ({
    boatId,
    title: "",
    category: null,
    date: new Date().toLocaleDateString("en-CA"),
    engineHours: null,
    cost: null,
    vendorName: null,
    notes: null,
  });
  const [d, setD] = useState<NewLogEntry>(blank);
  useEffect(() => {
    if (open) setD(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, boatId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Log work</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>What was done</label>
            <input className={inputCls} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Changed fuel/water separator" />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input className={inputCls} type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>System</label>
            <select className={inputCls} value={d.category ?? ""} onChange={(e) => setD({ ...d, category: (e.target.value || null) as MaintenanceCategory | null })}>
              <option value="">Other</option>
              {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Engine hours</label>
            <input
              className={inputCls}
              type="number"
              min={0}
              placeholder={lastHours != null ? `Last: ${lastHours}` : ""}
              value={d.engineHours ?? ""}
              onChange={(e) => setD({ ...d, engineHours: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={labelCls}>Cost</label>
            <input className={inputCls} type="number" min={0} step="0.01" value={d.cost ?? ""} onChange={(e) => setD({ ...d, cost: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Done by (leave blank if you did it)</label>
            <input className={inputCls} value={d.vendorName ?? ""} onChange={(e) => setD({ ...d, vendorName: e.target.value || null })} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Notes / part numbers</label>
            <textarea className={inputCls} rows={3} value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value || null })} />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              disabled={!d.title.trim() || !d.date || saving}
              onClick={() => onSave(d)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function exportPdf(boat: LogBoat, entries: LogEntry[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 50;
  const right = pageW - m;
  const s = summarizeLog(entries);
  let y = 56;

  const ensure = (h: number) => {
    if (y + h > pageH - 50) {
      doc.addPage();
      y = 56;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Service History", m, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · Bosun`, right, y, { align: "right" });
  y += 26;
  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(boat.name, m, y);
  y += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text([boat.label, boat.engine].filter(Boolean).join(" · "), m, y);
  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    `${s.entries} entries · ${s.verified} verified by the performing shop · ` +
      `last engine hours ${s.latestEngineHours ?? "n/a"} · lifetime spend ${money(s.totalSpent)}`,
    m,
    y
  );
  y += 14;
  doc.setDrawColor(220);
  doc.line(m, y, right, y);
  y += 20;

  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    ensure(50);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(e.title, m + 80, y, { maxWidth: right - m - 160 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(longDate(e.date), m, y);
    if (e.cost != null) doc.text(money(e.cost), right, y, { align: "right" });
    y += 12;
    doc.setTextColor(110);
    const meta = [
      isVerified(e) ? `Verified by ${e.vendorName ?? "shop"}` : e.vendorName ? `Owner-logged · ${e.vendorName}` : "Owner-logged",
      e.category,
      e.engineHours != null ? `${e.engineHours} engine hrs` : null,
      e.laborHours != null ? `${e.laborHours} labor hrs` : null,
    ].filter(Boolean).join(" · ");
    doc.text(meta, m + 80, y);
    y += 12;
    for (const l of e.lines) {
      ensure(12);
      doc.text(`${l.quantity} × ${l.description}`, m + 92, y, { maxWidth: right - m - 180 });
      doc.text(money(lineAmount(l)), right, y, { align: "right" });
      y += 11;
    }
    if (e.notes) {
      const wrapped = doc.splitTextToSize(e.notes, right - m - 80) as string[];
      ensure(wrapped.length * 11);
      doc.setTextColor(60);
      doc.text(wrapped, m + 80, y);
      y += wrapped.length * 11;
    }
    y += 10;
    doc.setDrawColor(235);
    doc.line(m, y - 4, right, y - 4);
    y += 8;
  }

  doc.save(`${boat.name.replace(/\W+/g, "-")}-service-history.pdf`);
}

function ShareDialog({
  open, onOpenChange, boat, entryCount,
}: { open: boolean; onOpenChange: (o: boolean) => void; boat: LogBoat; entryCount: number }) {
  const { toast } = useToast();
  const { data: share, isLoading } = useHistoryShare(boat.id);
  const create = useCreateHistoryShare();
  const setCosts = useSetHistoryCosts();
  const revoke = useRevokeHistoryShare();
  const [showCosts, setShowCosts] = useState(false);
  const [copied, setCopied] = useState(false);
  // Mirror the saved setting so the box ticks instantly; revert if the save fails.
  useEffect(() => {
    if (share) setShowCosts(share.showCosts);
  }, [share]);
  const costs = showCosts;
  const url = share ? historyShareUrl(share.token) : null;

  const fail = (e: unknown) => toast({ title: "Something went wrong", description: String(e), variant: "destructive" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Selling {boat.name}? Share its service history</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Create a link to add to your listing. Buyers see every service on record, when it was done and who did it, with
          shop-recorded jobs marked as verified. Your notes and contact details are never shown.
        </p>

        <label className="flex items-start gap-3 border border-border rounded-xl p-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={costs}
            disabled={setCosts.isPending}
            onChange={(e) => {
              const v = e.target.checked;
              setShowCosts(v);
              if (share)
                setCosts.mutate(
                  { share, showCosts: v, boatId: boat.id },
                  {
                    onError: (err) => {
                      setShowCosts(!v);
                      fail(err);
                    },
                  }
                );
            }}
          />
          <span>
            <span className="block text-sm font-semibold">Show what each job cost</span>
            <span className="block text-xs text-muted-foreground">Off by default. You can change this any time; the link stays the same.</span>
          </span>
        </label>

        {isLoading ? null : url ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input readOnly value={url} className="flex-1 min-w-0 px-3 py-2 text-sm border border-border rounded-lg bg-muted" onFocus={(e) => e.currentTarget.select()} />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="px-3 py-2 text-sm font-semibold rounded-lg bg-foreground text-background"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <a href={url} target="_blank" rel="noreferrer" className="text-sky-700 font-medium hover:underline">Preview what buyers see</a>
              <button
                onClick={() =>
                  confirm("Turn off this link? Anyone who has it will no longer see your boat's history.") &&
                  revoke.mutate({ share: share!, boatId: boat.id }, { onError: fail, onSuccess: () => toast({ title: "Link turned off" }) })
                }
                className="text-xs text-muted-foreground hover:text-red-600"
              >
                Turn off link
              </button>
            </div>
          </div>
        ) : (
          <button
            disabled={create.isPending}
            onClick={() =>
              create.mutate(
                { boatId: boat.id, showCosts },
                { onError: fail, onSuccess: () => toast({ title: "Link ready", description: "Copy it into your listing." }) }
              )
            }
            className="w-full py-2.5 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : `Create share link${entryCount ? ` (${entryCount} services)` : ""}`}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
