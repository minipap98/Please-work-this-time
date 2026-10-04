import { describe, expect, it } from "vitest";
import { PLAN_SCHEMA, engineLabel, normalizePlan, planPrompt } from "./servicePlan";

describe("service plan", () => {
  it("labels engines and builds the prompt", () => {
    expect(engineLabel({ engineMake: "Yamaha", engineModel: "F300 4.2L V6 (earlier generation)", engineCount: 2 })).toBe(
      "Twin Yamaha F300 4.2L V6 (earlier generation)"
    );
    const p = planPrompt({ engineMake: "Yamaha", engineModel: "F300", engineType: "Outboard", engineCount: 2, boatMake: "Pursuit", boatModel: "DC 326" });
    expect(p).toContain("Twin Yamaha F300 (Outboard)");
    expect(p).toContain("Boat: Pursuit DC 326");
  });

  it("cleans up what the model returns", () => {
    const tasks = normalizePlan({
      tasks: [
        { id: "oil_filter", task: "Engine Oil & Filter", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Yamalube 10W-30 FC-W" },
        { id: "oil_filter", task: "Oil again", category: "Nonsense", intervalMonths: 999, intervalHours: 2, notes: "" },
        { task: "Water Pump Impeller", category: "Cooling System", intervalMonths: 36, intervalHours: 300, notes: null },
        { task: "" },
      ],
    });
    expect(tasks).toEqual([
      { id: "oil_filter", task: "Engine Oil & Filter", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Yamalube 10W-30 FC-W" },
      { id: "oil_filter_2", task: "Oil again", category: "Engine Oil & Fuel", intervalMonths: 120, intervalHours: null, notes: null },
      { id: "water_pump_impeller", task: "Water Pump Impeller", category: "Cooling System", intervalMonths: 36, intervalHours: 300, notes: null },
    ]);
    expect(normalizePlan("nope")).toEqual([]);
  });

  it("never pairs an enum with a type array", () => {
    const bad: string[] = [];
    const walk = (n: unknown, path: string) => {
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (Array.isArray(o.type) && "enum" in o) bad.push(path);
      for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
    };
    walk(PLAN_SCHEMA, "schema");
    expect(bad).toEqual([]);
  });
});
