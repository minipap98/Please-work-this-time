import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { isDemoMode, useDemoMode } from "@/lib/demoMode";
import type { Json } from "@/lib/database.types";
import { normalizePlan, type EngineRequest, type PlanRecord, type PlanTask, type ServicePlan } from "@shared/servicePlan";

const DEMO_KEY = "bosun_demo_service_plan_v1";

function readDemo(): ServicePlan | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as ServicePlan) : null;
  } catch {
    return null;
  }
}

/** The saved schedule for a boat, or null if the owner hasn't set one up. */
export function useServicePlan(boatId: string | undefined) {
  const { demo } = useDemoMode();
  return useQuery({
    queryKey: ["service-plan", demo ? "demo" : boatId],
    queryFn: async (): Promise<ServicePlan | null> => {
      if (demo) return readDemo();
      if (supabaseMissing || !boatId) return null;
      const { data, error } = await supabase.from("boat_service_plans").select("*").eq("boat_id", boatId).maybeSingle();
      if (error) {
        // Table not created yet (migration not run): behave as "no plan".
        if (/boat_service_plans|relation .* does not exist|schema cache/i.test(error.message)) return null;
        throw error;
      }
      if (!data) return null;
      return {
        engineLabel: data.engine_label,
        tasks: normalizePlan({ tasks: data.tasks }),
        records: (Array.isArray(data.records) ? data.records : []) as unknown as PlanRecord[],
        source: data.source === "manual" ? "manual" : "claude",
      };
    },
    enabled: demo || !!boatId,
  });
}

/** A canned schedule for the demo boat's Mercury Verado 250. */
function demoTasks(): PlanTask[] {
  return normalizePlan({
    tasks: [
      { id: "oil_filter", task: "Engine Oil & Filter", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Mercury 25W-50 synthetic blend. Every 100 hrs or yearly." },
      { id: "gear_lube", task: "Gearcase Lube", category: "Drivetrain", intervalMonths: 12, intervalHours: 100, notes: "Mercury High Performance Gear Lube; check for water in the old lube." },
      { id: "fuel_filter", task: "Fuel Filter (on engine)", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: null },
      { id: "water_separator", task: "Fuel/Water Separator (boat)", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "More often with ethanol fuel." },
      { id: "anodes", task: "Engine & Gearcase Anodes", category: "Drivetrain", intervalMonths: 12, intervalHours: null, notes: "Replace at 50% wasted; check twice a season in salt." },
      { id: "impeller", task: "Water Pump Impeller", category: "Cooling System", intervalMonths: 36, intervalHours: 300, notes: "Sooner in sandy or silty water." },
      { id: "spark_plugs", task: "Spark Plugs", category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: null },
      { id: "thermostat", task: "Thermostat", category: "Cooling System", intervalMonths: 36, intervalHours: 300, notes: null },
      { id: "drive_belt", task: "Accessory Drive Belt", category: "Drivetrain", intervalMonths: 12, intervalHours: 100, notes: "Inspect yearly; replace at 300 hrs." },
      { id: "steering_fluid", task: "Power Steering Fluid", category: "Drivetrain", intervalMonths: 12, intervalHours: 100, notes: "Check level and condition." },
    ],
  });
}

/** Ask for a schedule for the boat's engines (not saved until the owner confirms). */
export function useRequestIntervals() {
  return useMutation({
    mutationFn: async (engine: EngineRequest): Promise<PlanTask[]> => {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 1200));
        return demoTasks();
      }
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/maintenance/intervals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token ?? ""}` },
        body: JSON.stringify(engine),
      });
      const json = (await res.json().catch(() => ({}))) as { tasks?: unknown; error?: string; code?: string };
      if (res.ok && json.tasks) return normalizePlan({ tasks: json.tasks });
      throw new Error(
        json.code === "not_configured"
          ? "Service interval lookup isn't switched on yet."
          : json.error ?? `Schedule lookup failed (server error ${res.status}).`
      );
    },
  });
}

export function useSaveServicePlan(boatId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (plan: ServicePlan) => {
      if (isDemoMode()) {
        localStorage.setItem(DEMO_KEY, JSON.stringify(plan));
        return;
      }
      if (!user || !boatId) throw new Error("Add your boat first.");
      const { error } = await supabase.from("boat_service_plans").upsert({
        boat_id: boatId,
        owner_id: user.id,
        engine_label: plan.engineLabel,
        tasks: plan.tasks as unknown as Json,
        records: plan.records as unknown as Json,
        source: plan.source,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        if (/boat_service_plans|does not exist|schema cache/i.test(error.message)) {
          throw new Error("Saving schedules needs a quick database update (20261014_service_plans.sql).");
        }
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-plan"] }),
  });
}
