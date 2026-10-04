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

/**
 * Get the manufacturer schedule for the boat's engines, then let the owner pick what to track,
 * adjust intervals, and mark what's already been done (and when) before saving.
 */
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
  const request = useRequestIntervals();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toRows = (tasks: PlanTask[], tracked: (t: PlanTask) => boolean) =>
    tasks.map((t) => {
      const rec = knownDone.filter((r) => r.taskId === t.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      return {
        task: t,
        track: tracked(t),
        done: !!rec,
        date: rec?.date ?? "",
        hours: rec?.engineHours != null ? String(rec.engineHours) : "",
      };
    });

  function fetchSchedule() {
    setError(null);
    setRows(null);
    request.mutate(engine, {
      onSuccess: (tasks) => setRows(toRows(tasks, () => true)),
      onError: (e) => setError(e instanceof Error ? e.message : "Couldn't get a schedule."),
    });
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) setRows(toRows(existing.tasks, () => true));
    else fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setTask = (i: number, patch: Partial<PlanTask>) =>
    setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, task: { ...r.task, ...patch } } : r)));

  const tracked = rows?.filter((r) => r.track) ?? [];
  const missingDates = tracked.some((r) => r.done && !r.date);

  function save() {
    onSave({
      engineLabel: engineLabel(engine),
      source: "claude",
      tasks: tracked.map((r) => r.task),
      records: tracked
        .filter((r) => r.done && r.date)
        .map((r) => ({ taskId: r.task.id, date: r.date, ...(r.hours ? { engineHours: Number(r.hours) } : {}) })),
    });
  }

  const num = "w-14 border border-border rounded px-1.5 py-1 text-xs text-right tabular-nums bg-white";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service schedule for your {engineLabel(engine)}</DialogTitle>
          <DialogDescription>
            Bosun pulls the manufacturer's recommended intervals. Untick anything you don't want reminders for, adjust
            intervals if your shop or manual says otherwise, and mark what's already been done.
          </DialogDescription>
        </DialogHeader>

        {request.isPending && (
          <div className="py-12 text-center">
            <Loader2 className="w-7 h-7 mx-auto animate-spin text-sky-600" />
            <p className="mt-3 text-sm font-semibold">Looking up the schedule…</p>
            <p className="text-xs text-muted-foreground mt-1">Usually 10 to 30 seconds.</p>
          </div>
        )}

        {error && !request.isPending && (
          <div className="py-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={fetchSchedule} className="mt-3 text-sm font-semibold text-sky-700 hover:underline">
              Try again
            </button>
          </div>
        )}

        {rows && !request.isPending && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-xs bg-sky-50 border border-sky-200 text-sky-900 rounded-lg p-2.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              Based on manufacturer guidance for this engine. Double-check against your owner's manual; your shop may
              recommend shorter intervals for heavy use.
            </p>

            <ul className="divide-y divide-border border border-border rounded-lg">
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
                          min={1}
                          className={num}
                          value={r.task.intervalMonths}
                          onChange={(e) => setTask(i, { intervalMonths: Math.max(1, Number(e.target.value) || 1) })}
                          disabled={!r.track}
                        />
                        months
                        <span>or</span>
                        <input
                          type="number"
                          min={0}
                          className={num}
                          value={r.task.intervalHours ?? ""}
                          placeholder="—"
                          onChange={(e) => setTask(i, { intervalHours: e.target.value ? Math.max(1, Number(e.target.value)) : null })}
                          disabled={!r.track}
                        />
                        hours
                      </div>
                      {r.track && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <label className="inline-flex items-center gap-1.5 font-medium">
                            <input
                              type="checkbox"
                              checked={r.done}
                              onChange={(e) => set(i, { done: e.target.checked, date: e.target.checked ? r.date || todayIso() : r.date })}
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
                                className="border border-border rounded px-1.5 py-1 bg-white"
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

            <div className="flex items-center justify-between gap-3">
              <button onClick={fetchSchedule} className="text-sm text-muted-foreground hover:text-foreground">
                {existing ? "Get a fresh schedule" : "Look it up again"}
              </button>
              <button
                onClick={save}
                disabled={saving || tracked.length === 0 || missingDates}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background disabled:opacity-50"
              >
                {saving ? "Saving…" : `Save schedule (${tracked.length} items)`}
              </button>
            </div>
            {missingDates && <p className="text-xs text-amber-700 text-right">Add a date for each item marked already done.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
