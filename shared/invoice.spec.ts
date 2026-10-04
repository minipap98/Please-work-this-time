import { describe, expect, it } from "vitest";
import { invoiceCheck, invoiceToLogLines, normalizeDate, normalizeInvoice } from "./invoice";

// Shaped like a real 300-hour service invoice for a Pursuit with twin F300s (shop renamed).
const parts: [string, number, string, number][] = [
  ["N261344003", 2, "Oil filter", 32], ["6PEWS24A00", 2, "Fuel filter (motor)", 20.2],
  ["90430-08003", 4, "Gear lube drain gasket", 2.95], ["8M0078015", 2, "Heavy duty gear lube", 45],
  ["90340-14M09", 2, "Oil drain gasket", 3.25], ["8M0078629", 14, "Qts 4-stroke oil 25W-40", 22.99],
  ["6G54525102", 2, "Anode TNT bracket", 34.99], ["6CE4537300", 2, "Anode above prop", 50.4],
  ["CRC06007", 2, "6-56 lubricant", 14.98], ["18-7866", 2, "Water separator filter (boat)", 24.99],
  ["6CEW007802", 2, "Water pump repair kit", 335.89], ["93101-28019", 4, "Drive shaft oil seal", 24.65],
  ["6CE4431101", 2, "Water pump housing", 27.35], ["LFR6A11", 12, "Spark plug", 13.95],
  ["6KA4534400", 2, "Oil seal cover", 21.25], ["69CE1241100", 4, "Thermostat", 51.25],
  ["67F1130101", 8, "Cylinder block anode", 66.99], ["6CE4381001", 1, "Tilt piston assy", 615.25],
];
const raw = {
  shop: "Example Marine Services",
  invoiceNumber: "20349",
  date: "4-22-2026",
  boat: "Pursuit 326, F300 Yamaha",
  engineHours: null,
  title: "Engine service: water pumps, thermostats, anodes, tilt piston",
  category: "Cooling System",
  laborHours: 13.75,
  lines: [
    ...parts.map(([pn, q, d, p]) => ({ kind: "part", partNumber: pn, description: d, quantity: q, unitPrice: p, amount: Math.round(q * p * 100) / 100 })),
    { kind: "fee", partNumber: null, description: "Shop materials", quantity: 1, unitPrice: 35, amount: 35 },
    { kind: "labor", partNumber: null, description: "Labor (13.75 hrs @ $165)", quantity: 13.75, unitPrice: 165, amount: "2,268.75" },
    { kind: "fee", partNumber: null, description: "2.99% credit card fee", quantity: 1, unitPrice: null, amount: 175.33 },
  ],
  tax: 383.61,
  total: "$6,039.12",
};

describe("invoice import", () => {
  it("normalizes a model response and checks it adds up", () => {
    const inv = normalizeInvoice(raw);
    expect(inv.date).toBe("2026-04-22");
    expect(inv.total).toBe(6039.12);
    expect(inv.lines).toHaveLength(21);
    expect(inv.lines[20]).toMatchObject({ kind: "fee", unitPrice: 175.33, amount: 175.33 });
    expect(inv.lines[19].amount).toBe(2268.75);
    expect(invoiceCheck(inv)).toEqual({ computed: 6039.12, difference: 0 });
    expect(invoiceToLogLines(inv)[0]).toEqual({ kind: "part", description: "Oil filter (N261344003)", quantity: 2, unitPrice: 32 });
  });

  it("drops anything it can't trust", () => {
    const inv = normalizeInvoice({ category: "Engines", date: "13/45/2026", engineHours: -4, lines: "nope" });
    expect(inv).toMatchObject({ category: null, date: null, engineHours: null, lines: [], title: "Service", total: null });
    expect(invoiceCheck(inv).difference).toBeNull();
  });

  it("reads common date formats", () => {
    expect(normalizeDate("2026-04-22")).toBe("2026-04-22");
    expect(normalizeDate("5/6/26")).toBe("2026-05-06");
    expect(normalizeDate("02/30/2026")).toBeNull();
  });
});
