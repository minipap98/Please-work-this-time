// Fill the maintenance schedule from the Boat Log: when a logged job (title, notes or
// line items) mentions the work, that task counts as done on the job's date.

export interface LoggedWork {
  date: string; // YYYY-MM-DD
  engineHours: number | null;
  text: string; // title + notes + line item descriptions
}

export interface DerivedRecord {
  taskId: string;
  date: string;
  engineHours?: number;
  notes?: string;
}

// Task id → what that work looks like on an invoice. Spelling slips seen on real invoices
// (e.g. "spark pug") are included on purpose.
const PATTERNS: [RegExp, RegExp][] = [
  [/^oil_filter$/, /\boil filter|oil (&|and) filter|oil change|(4|four)[- ]?stroke oil|engine oil|\b(25|10|20)w-?\d\d\b/i],
  [/^(gear_lube|gear_oil)$/, /gear (lube|oil)|lower unit (lube|oil|service)/i],
  [/^(drive_fluid|drive_oil)$/, /drive (fluid|oil|lube)|gear lube/i],
  [/^impeller$/, /impeller|water pump (repair|kit|service|rebuild)/i],
  [/^spark_plugs$/, /spark p(l)?ugs?/i],
  [/^fuel_filter(_vst|_primary|_secondary)?$/, /fuel filter|fuel\/?water separator|water sep(arator)?( filter)?|racor/i],
  [/^(engine_zincs|drive_zincs)$/, /\banode|\bzincs?\b/i],
  [/^(heat_zinc|heat_exchanger_zinc)$/, /heat exchanger (zinc|anode)/i],
  [/^air_filter$/, /air filter/i],
  [/^supercharger_oil$/, /supercharger oil/i],
  [/^throttle_body$/, /throttle body/i],
  [/^(drive_belt|drive_belts|serpentine_belt)$/, /\bbelt\b/i],
  [/^coolant$/, /coolant|antifreeze/i],
  [/^thermostat$/, /thermostat/i],
  [/^bellows$/, /bellow|gimbal/i],
  [/^throttle_cables$/, /(throttle|shift) cable/i],
  [/^shaft_packing$/, /shaft packing|cutlass|dripless/i],
  [/^valve_clearance$/, /valve (clearance|adjust)/i],
  [/^general_bottom_paint$/, /bottom paint|antifoul/i],
  [/^general_hull_wax$/, /\bwax|compound|detail/i],
  [/^(battery|general_battery)$/, /batter(y|ies)/i],
  [/^general_bilge_pump$/, /bilge pump/i],
  [/^general_steering$/, /steering/i],
];

export function taskMatches(taskId: string, text: string): boolean {
  return PATTERNS.some(([id, re]) => id.test(taskId) && re.test(text));
}

/** The latest logged job that covers each task. */
export function recordsFromLog(taskIds: string[], log: LoggedWork[]): DerivedRecord[] {
  const out: DerivedRecord[] = [];
  const sorted = [...log].sort((a, b) => b.date.localeCompare(a.date));
  for (const taskId of taskIds) {
    const hit = sorted.find((w) => taskMatches(taskId, w.text));
    if (hit) {
      out.push({
        taskId,
        date: hit.date,
        ...(hit.engineHours != null ? { engineHours: hit.engineHours } : {}),
        notes: "From your Boat Log",
      });
    }
  }
  return out;
}

/** Manual records and Boat Log records together: the most recent per task (manual wins ties). */
export function mergeRecords<T extends { taskId: string; date: string }>(manual: T[], derived: T[]): T[] {
  const best = new Map<string, T>();
  for (const r of derived) {
    const cur = best.get(r.taskId);
    if (!cur || r.date > cur.date) best.set(r.taskId, r);
  }
  for (const r of manual) {
    const cur = best.get(r.taskId);
    if (!cur || r.date >= cur.date) best.set(r.taskId, r);
  }
  return [...best.values()];
}
