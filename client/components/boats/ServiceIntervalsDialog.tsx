import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRequestIntervals } from "@/hooks/use-service-plan";
import { engineLabel, type EngineRequest, type PlanRecord, type PlanTask, type ServicePlan } from "@shared/servicePlan";
import { cn } from "@/lib/utils";

interface Row {
  task: PlanTask;
  track: boolean;
  done: boolean;
  date: string;
  hours: string;
}

const todayIso = () => new Date().toLocaleDateString("en-CA");

/** Shortest hour interval first; time-only items after, by months. */
export function byInterval(a: PlanTask, b: PlanTask): number {
  const ah = a.intervalHours ?? Infinity;
  const bh = b.intervalHours ?? Infinity;
  return ah - bh || a.intervalMonths - b.intervalMonths || a.task.localeCompare(b.task);
}

/**
 * Looks up the manufacturer schedule for the engines (or edits an existing one) and lets the
 * owner pick what to track, adjust intervals, and mark what's already been done.
 * Reports the plan as it changes; the parent decides when to save.
 */
export function ServiceScheduleEditor({
  engine,
  initialTasks,
  knownDone,
  onPlanChange,
  compact = false,
}: {
  engine: EngineRequest;
  initialTasks: PlanTask[] | null;
  knownDone: PlanRecord[];
  onPlanChange: (plan: ServicePlan | null, problem: string | null) => void;
  compact?: boolean;
}) {
  const request = useRequestIntervals();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toRows = (tasks: PlanTask[]) =>
    [...tasks].sort(byInterval).map((t) => {
      const rec = knownDone.filter((r) => r.taskId === t.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      return {
        task: t,
        track: true,
        done: !!rec,
        date: rec?.date ?? "",
        hours: rec?.engineHours != null ? String(rec.engineHours) : "",
      };
    });

  function fetchSchedule() {
    setError(null);
    setRows(null);
    request.mutate(engine, {
      onSuccess: (tasks) => setRows(toRows(tasks)),
      onError: (e) => setError(e instanceof Error ? e.message : "Couldn't get a schedule."),
    });
  }

  useEffect(() => {
    if (initialTasks) setRows(toRows(initialTasks));
    else fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tracked = rows?.filter((r) => r.track) ?? [];
  const missingDates = tracked.some((r) => r.done && !r.date);

  useEffect(() => {
    if (!rows) return onPlanChange(null, null);
    onPlanChange(
      {
        engineLabel: engineLabel(engine),
        source: "claude",
        tasks: tracked.map((r) => r.task),
        records: tracked
          .filter((r) => r.done && r.date)
          .map((r) => ({ taskId: r.task.id, date: r.date, ...(r.hours ? { engineHours: Number(r.hours) } : {}) })),
      },
      tracked.length === 0 ? "Pick at least one item to track." : missingDates ? "Add a date for each item marked already done." : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setTask = (i: number, patch: Partial<PlanTask>) =>
    setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, task: { ...r.task, ...patch } } : r)));

  const num = "w-14 border border-border rounded px-1.5 py-1 text-xs text-right tabular-nums bg-white";

  if (request.isPending) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-7 h-7 mx-auto animate-spin text-sky-600" />
        <p className="mt-3 text-sm font-semibold">Looking up the schedule for your {engineLabel(engine)}…</p>
        <p className="text-xs text-muted-foreground mt-1">Usually 10 to 30 seconds.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={fetchSchedule} className="mt-3 text-sm font-semibold text-sky-700 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  if (!rows) return null;

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-xs bg-sky-50 border border-sky-200 text-sky-900 rounded-lg p-2.5">
        <Sparkles className="w-4 h-4 shrink-0" />
        Based on manufacturer guidance for this engine. Double-check against your owner's manual. Anything you don't
        mark as done shows as "not logged yet", not overdue.
      </p>

      <ul className={cn("divide-y divide-border border border-border rounded-lg", compact && "max-h-[50vh] overflow-y-auto")}>
        {rows.map((r, i) => (
          <li key={r.task.id} className={cn("p-3", !r.track && "opacity-50")}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={r.track}
                onChange={(e) => set(i, { track: e.target.checked })}
                className="mt-1 w-4 h-4 accent-sky-600"
                aria-label={`Track ${r.task.task}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.task.task}</p>
                {r.task.notes && <p className="text-xs text-muted-foreground">{r.task.notes}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  Every
                  <input
                    type="number"
                    min={0}
                    className={num}
                    value={r.task.intervalHours ?? ""}
                    placeholder="—"
                    onChange={(e) => setTask(i, { intervalHours: e.target.value ? Math.max(1, Number(e.target.value)) : null })}
                    disabled={!r.track}
                    aria-label="Hours between services"
                  />
                  hours or
                  <input
                    type="number"
                    min={1}
                    className={num}
                    value={r.task.intervalMonths}
                    onChange={(e) => setTask(i, { intervalMonths: Math.max(1, Number(e.target.value) || 1) })}
                    disabled={!r.track}
                    aria-label="Months between services"
                  />
                  months
                </div>
                {r.track && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1.5 font-medium">
                      <input
                        type="checkbox"
                        checked={r.done}
                        onChange={(e) => set(i, { done: e.target.checked })}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      Already done
                    </label>
                    {r.done && (
                      <>
                        <input
                          type="date"
                          max={todayIso()}
                          value={r.date}
                          onChange={(e) => set(i, { date: e.target.value })}
                          className={cn("border rounded px-1.5 py-1 bg-white", r.date ? "border-border" : "border-amber-400")}
                          aria-label="Date done"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="hrs"
                          value={r.hours}
                          onChange={(e) => set(i, { hours: e.target.value })}
                          className={num}
                          aria-label="Engine hours when done"
                        />
                        <span className="text-muted-foreground">engine hrs (optional)</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={fetchSchedule} className="text-xs text-muted-foreground hover:text-foreground">
        {initialTasks ? "Get a fresh schedule" : "Look it up again"}
      </button>
    </div>
  );
}

export default function ServiceIntervalsDialog({
  open,
  onOpenChange,
  engine,
  existing,
  knownDone,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  engine: EngineRequest;
  existing: ServicePlan | null;
  /** Latest done dates already known (Boat Log, earlier records), to pre-fill. */
  knownDone: PlanRecord[];
  saving: boolean;
  onSave: (plan: ServicePlan) => void;
}) {
  const [plan, setPlan] = useState<ServicePlan | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service schedule for your {engineLabel(engine)}</DialogTitle>
          <DialogDescription>
            Untick anything you don't want reminders for, adjust intervals if your shop or manual says otherwise, and
            mark what's already been done.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ServiceScheduleEditor
            engine={engine}
            initialTasks={existing?.tasks ?? null}
            knownDone={knownDone}
            onPlanChange={(p, why) => {
              setPlan(p);
              setProblem(why);
            }}
          />
        )}
        {plan && (
          <div className="flex items-center justify-end gap-3">
            {problem && <p className="text-xs text-amber-700">{problem}</p>}
            <button
              onClick={() => onSave(plan)}
              disabled={saving || !!problem}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save schedule (${plan.tasks.length} items)`}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
