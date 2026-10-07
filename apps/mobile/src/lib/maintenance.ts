// What's due on the active boat, and its saved schedule.
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoatRow } from "@bosun/shared/boats/boats";
import { engineRequestFor, getServicePlan, planWithRecord, requestIntervals, saveServicePlan } from "@bosun/shared/maintenance/plan";
import { dueCounts, dueTasks, latestLoggedHours, tasksFor, type TaskStatus } from "@bosun/shared/maintenance/status";
import type { EngineRequest, PlanRecord, ServicePlan } from "@bosun/shared/servicePlan";
import { api } from "./api";
import { useAuth } from "./auth";
import { useBoatLog } from "./boatLog";
import { engineHoursKey, usePref } from "./prefs";
import { supabase } from "./supabase";

export function useServicePlan(boatId: string | undefined) {
  return useQuery({ queryKey: ["service-plan", boatId], queryFn: () => getServicePlan(supabase, boatId!), enabled: !!boatId });
}

export function useSaveServicePlan() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (v: { boatId: string; plan: ServicePlan }) => saveServicePlan(supabase, user!.id, v.boatId, v.plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-plan"] }),
  });
}

export function useRequestIntervals() {
  return useMutation({ mutationFn: (engine: EngineRequest) => requestIntervals(api, engine) });
}

/**
 * The active boat's task list with each task's status. Engine hours come from this device's
 * override, else the newest Boat Log entry that recorded them.
 */
export function useDueTasks(boat: BoatRow | null) {
  const { user } = useAuth();
  const { data: plan, isLoading: planLoading } = useServicePlan(boat?.id);
  const { data: log = [], isLoading: logLoading } = useBoatLog(boat?.id);
  const [storedHours, setStoredHours] = usePref(user && boat ? engineHoursKey(user.id, boat.id) : null);
  const engine = useMemo(() => (boat ? engineRequestFor(boat) : null), [boat]);
  const engineTasks = useMemo(() => (boat ? tasksFor(plan ?? null, { make: boat.engine_make ?? "", model: boat.engine_model ?? "", type: boat.engine_type ?? "" }) : []), [boat, plan]);
  const currentHours = storedHours != null && storedHours !== "" ? Number(storedHours) : latestLoggedHours(log);
  const tasks = useMemo<TaskStatus[]>(() => (boat ? dueTasks({ tasks: engineTasks, manual: plan?.records ?? [], log, currentHours }) : []), [boat, engineTasks, plan, log, currentHours]);
  const counts = useMemo(() => dueCounts(tasks), [tasks]);
  return {
    tasks,
    counts,
    plan: plan ?? null,
    engine,
    engineTasks,
    currentHours,
    setCurrentHours: (n: number | null) => setStoredHours(n == null ? null : String(n)),
    isLoading: !!boat && (planLoading || logLoading),
  };
}

/** Mark a task done: the record goes on the boat's plan (created from the built-in list if needed). */
export function useMarkDone() {
  const save = useSaveServicePlan();
  return useMutation({
    mutationFn: async (v: { boatId: string; plan: ServicePlan | null; engine: EngineRequest; engineTasks: Parameters<typeof planWithRecord>[1]["engineTasks"]; record: PlanRecord }) => {
      await save.mutateAsync({ boatId: v.boatId, plan: planWithRecord(v.plan, { engine: v.engine, engineTasks: v.engineTasks }, v.record) });
    },
  });
}
