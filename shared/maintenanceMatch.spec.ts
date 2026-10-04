import { describe, expect, it } from "vitest";
import { mergeRecords, recordsFromLog, taskMatches } from "./maintenanceMatch";

// Line items as they appeared on a real twin-F300 300-hour service invoice.
const invoice = [
  "Engine service: water pumps, thermostats, anodes, tilt piston",
  "OIL FILTER", "FUEL FILTER (MOTOR)", "GEAR LUBE DRAIN GASKET", "HEAVY DUTY GEAR LUBE", "QTS 4 STROKE OIL 25W-40",
  "ANODE TNT BRACKET", "WATER SEP FILTER (BOAT)", "WATER PUMP REPAIR KIT", "SPARK PUG", "THERMOSTAT", "CYLINDER BLOCK ANODE",
].join(" · ");

describe("maintenance from the Boat Log", () => {
  it("recognizes the work on a real invoice", () => {
    for (const id of ["oil_filter", "gear_lube", "impeller", "spark_plugs", "fuel_filter", "fuel_filter_primary", "engine_zincs"]) {
      expect(taskMatches(id, invoice)).toBe(true);
    }
    expect(taskMatches("general_bottom_paint", invoice)).toBe(false);
    expect(taskMatches("air_filter", invoice)).toBe(false);
  });

  it("takes the latest matching job for each task", () => {
    const recs = recordsFromLog(["oil_filter", "general_bottom_paint", "air_filter"], [
      { date: "2025-03-01", engineHours: 210, text: "Oil change" },
      { date: "2026-04-22", engineHours: null, text: invoice },
      { date: "2026-03-22", engineHours: null, text: "Bottom paint, 2 coats ablative" },
    ]);
    expect(recs).toEqual([
      { taskId: "oil_filter", date: "2026-04-22", notes: "From your Boat Log" },
      { taskId: "general_bottom_paint", date: "2026-03-22", notes: "From your Boat Log" },
    ]);
  });

  it("keeps the newer of a manual record and a logged job", () => {
    const merged = mergeRecords(
      [{ taskId: "oil_filter", date: "2026-06-01" }, { taskId: "impeller", date: "2024-01-01" }],
      [{ taskId: "oil_filter", date: "2026-04-22" }, { taskId: "impeller", date: "2026-04-22" }]
    );
    expect(merged.find((r) => r.taskId === "oil_filter")?.date).toBe("2026-06-01");
    expect(merged.find((r) => r.taskId === "impeller")?.date).toBe("2026-04-22");
    expect(merged).toHaveLength(2);
  });
});
