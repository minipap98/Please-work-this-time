import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { isDemoMode } from "@/lib/demoMode";
import {
  useCrew,
  useMyCrewMemberships,
  useShopSettings,
  useTechInventory,
  useTechJobs,
  useTechUpdateJob,
  type CrewMembership,
} from "@/hooks/use-shop";
import { occupiesDay, pullList, toLocalDateKey, type WorkOrder } from "@shared/shop";
import { WorkOrderBadge, timeRange } from "@/components/shop/shopUi";
import { cn } from "@/lib/utils";

/** A tech's day: only their jobs, the parts to pull, and start / done / note buttons. */
export default function TechToday() {
  const demo = isDemoMode();
  const { user, profile, signOut } = useAuth();
  const { data: demoSettings } = useShopSettings(demo ? "demo-shop" : null);
  const { data: demoCrew = [] } = useCrew(demo ? "demo-shop" : null);
  const demoNames = [...new Set([...(demoSettings?.techs ?? []), ...demoCrew.map((c) => c.techName)])];
  const [demoTech, setDemoTech] = useState<string | undefined>(undefined);
  const { data: memberships = [], isLoading } = useMyCrewMemberships(user?.id, demoTech);
  const [pick, setPick] = useState(0);
  const m: CrewMembership | undefined = memberships[Math.min(pick, memberships.length - 1)];

  const { data: jobs = [] } = useTechJobs(m);
  const { data: inventory = [] } = useTechInventory(m);
  const update = useTechUpdateJob();
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const todayKey = toLocalDateKey(new Date().toISOString());
  const { today, upcoming, done } = useMemo(() => {
    const active = jobs.filter((j) => j.status !== "completed" && j.status !== "invoiced");
    const byStart = (a: WorkOrder, b: WorkOrder) => (a.scheduledStart ?? "9").localeCompare(b.scheduledStart ?? "9");
    return {
      today: active.filter((j) => !j.scheduledStart || occupiesDay(j, todayKey) || (j.scheduledStart.slice(0, 10) < todayKey)).sort(byStart),
      upcoming: active.filter((j) => j.scheduledStart && !occupiesDay(j, todayKey) && j.scheduledStart.slice(0, 10) > todayKey).sort(byStart),
      done: jobs.filter((j) => (j.status === "completed" || j.status === "invoiced") && j.completedAt?.slice(0, 10) === todayKey),
    };
  }, [jobs, todayKey]);

  const act = (order: WorkOrder, status?: WorkOrder["status"]) => {
    const note = notes[order.id];
    update.mutate(
      { order, status, note },
      {
        onSuccess: () => {
          setNotes((n) => ({ ...n, [order.id]: "" }));
          toast.success(status === "completed" ? "Marked done" : status === "in-progress" ? "Started" : "Note saved");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold">Bosun · My jobs</p>
            <p className="text-xs text-muted-foreground truncate">
              {m ? `${m.techName} at ${m.shopName}` : profile?.name ?? ""}
            </p>
          </div>
          {demo && (
            <select
              className="text-xs border border-border rounded-md px-2 py-1 bg-background"
              value={m?.techName ?? ""}
              onChange={(e) => setDemoTech(e.target.value)}
              aria-label="Demo tech"
            >
              {demoNames.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          {!demo && memberships.length > 1 && (
            <select
              className="text-xs border border-border rounded-md px-2 py-1 bg-background"
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
              aria-label="Shop"
            >
              {memberships.map((x, i) => <option key={x.vendorId} value={i}>{x.shopName}</option>)}
            </select>
          )}
          {!demo && user && (
            <button onClick={() => signOut()} className="text-xs text-muted-foreground hover:text-foreground">
              Log out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-5">
        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : !m ? (
          <div className="bg-white border border-border rounded-xl p-5 text-center">
            <p className="text-sm font-semibold">You're not on a shop's crew yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ask your shop to invite <b>{profile?.email ?? user?.email ?? "your email"}</b> under Shop → Shop Settings → Crew logins, then
              reload this page.
            </p>
            <Link to="/app" className="inline-block mt-3 text-sm text-sky-700 hover:underline">Go to my Bosun account</Link>
          </div>
        ) : (
          <>
            {m.role === "manager" && (
              <Link
                to="/crew-shop"
                className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-3"
              >
                <span>
                  <span className="block text-sm font-semibold">Open the shop board</span>
                  <span className="block text-xs text-slate-300">Work orders, schedule, inventory and parts for {m.shopName}</span>
                </span>
                <span aria-hidden>→</span>
              </Link>
            )}
            <Section title={`Today · ${today.length} job${today.length === 1 ? "" : "s"}`}>
              {today.length === 0 ? (
                <Empty text="Nothing assigned to you today." />
              ) : (
                today.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    inventory={inventory}
                    expanded={open === j.id || today.length === 1}
                    onToggle={() => setOpen(open === j.id ? null : j.id)}
                    note={notes[j.id] ?? ""}
                    onNote={(v) => setNotes((n) => ({ ...n, [j.id]: v }))}
                    busy={update.isPending}
                    onStart={() => act(j, "in-progress")}
                    onDone={() => act(j, "completed")}
                    onSaveNote={() => act(j)}
                  />
                ))
              )}
            </Section>

            {upcoming.length > 0 && (
              <Section title="Coming up">
                {upcoming.slice(0, 6).map((j) => (
                  <div key={j.id} className="bg-white border border-border rounded-xl px-3 py-2.5">
                    <p className="text-sm font-medium">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{timeRange(j.scheduledStart, j.scheduledEnd)} · {j.boatLabel || j.customerName}</p>
                  </div>
                ))}
              </Section>
            )}

            {done.length > 0 && (
              <Section title={`Done today · ${done.length}`}>
                {done.map((j) => (
                  <div key={j.id} className="bg-white border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <span className="text-emerald-600">✓</span>
                    <p className="text-sm flex-1 truncate">{j.title}</p>
                  </div>
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground bg-white border border-dashed border-border rounded-xl px-4 py-4 text-center">{text}</p>;
}

function JobCard({
  job, inventory, expanded, onToggle, note, onNote, busy, onStart, onDone, onSaveNote,
}: {
  job: WorkOrder;
  inventory: Parameters<typeof pullList>[1];
  expanded: boolean;
  onToggle: () => void;
  note: string;
  onNote: (v: string) => void;
  busy: boolean;
  onStart: () => void;
  onDone: () => void;
  onSaveNote: () => void;
}) {
  const pulls = pullList(job, inventory);
  const started = job.status === "in-progress";
  return (
    <div className={cn("bg-white border rounded-xl overflow-hidden", started ? "border-sky-300" : "border-border")}>
      <button onClick={onToggle} className="w-full text-left px-3 py-3">
        <div className="flex items-center gap-2">
          <WorkOrderBadge status={job.status} />
          <span className="text-[11px] text-muted-foreground">{timeRange(job.scheduledStart, job.scheduledEnd)}</span>
        </div>
        <p className="text-base font-semibold mt-1">{job.title}</p>
        <p className="text-sm text-muted-foreground">
          {[job.boatLabel, job.customerName, job.bay].filter(Boolean).join(" · ")}
          {job.engineHours != null && ` · ${job.engineHours} hrs`}
        </p>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {pulls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Parts to pull</p>
              <ul className="space-y-1">
                {pulls.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5 min-w-[3rem] text-center">{p.bin || "—"}</span>
                    <span className="flex-1">{p.quantity} × {p.description}</span>
                    {p.inStock !== null && p.inStock < p.quantity && (
                      <span className="text-[10px] font-semibold text-amber-700">only {p.inStock}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-line">{job.description}</p>
            </div>
          )}

          <div>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="What you found or did (the owner sees this in their Boat Log)"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
            {note.trim() && (
              <button onClick={onSaveNote} disabled={busy} className="mt-1 text-xs font-semibold text-sky-700">
                Save note
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onStart}
              disabled={busy || started}
              className="py-3 rounded-xl border border-border text-sm font-semibold disabled:opacity-40"
            >
              {started ? "In progress" : "Start"}
            </button>
            <button
              onClick={onDone}
              disabled={busy}
              className="py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
            >
              Mark done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
