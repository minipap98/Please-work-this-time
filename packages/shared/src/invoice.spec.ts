import { describe, expect, it } from "vitest";
import { INVOICE_SCHEMA, invoiceCheck, invoiceToLogLines, normalizeDate, normalizeInvoice, splitInvoice } from "./invoice";

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

describe("invoice schema", () => {
  it("never pairs an enum with a type array (the API rejects that)", () => {
    const bad: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (Array.isArray(n.type) && "enum" in n) bad.push(path);
      for (const [k, v] of Object.entries(n)) walk(v, `${path}.${k}`);
    };
    walk(INVOICE_SCHEMA, "schema");
    expect(bad).toEqual([]);
  });
});

describe("splitting an invoice", () => {
  const inv = normalizeInvoice({
    title: "Haul-out",
    total: 1100,
    tax: 100,
    laborHours: 10,
    lines: [
      { kind: "part", description: "Bottom paint", quantity: 2, unitPrice: 150, amount: 300 },
      { kind: "labor", description: "Paint labor", quantity: 4, unitPrice: 100, amount: 400 },
      { kind: "part", description: "Impeller", quantity: 1, unitPrice: 100, amount: 100 },
      { kind: "labor", description: "Engine labor", quantity: 2, unitPrice: 100, amount: 200 },
    ],
  });
  const splits = [
    { title: "Bottom paint", category: "Hull & Bottom" as const },
    { title: "Impeller", category: "Cooling System" as const },
  ];

  it("shares tax in proportion and adds up to what was paid", () => {
    const out = splitInvoice(inv, splits, [0, 0, 1, 1]);
    expect(out.map((e) => [e.title, e.cost, e.laborHours, e.lines.length])).toEqual([
      ["Bottom paint", 770, 4, 2],
      ["Impeller", 330, 2, 2],
    ]);
    expect(out.reduce((s, e) => s + e.cost, 0)).toBe(1100);
  });

  it("drops empty splits and keeps a single entry whole", () => {
    const out = splitInvoice(inv, splits, [0, 0, 0, 0]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: "Bottom paint", cost: 1100, laborHours: 10 });
  });

  it("never loses a cent to rounding", () => {
    const odd = normalizeInvoice({ total: 100, lines: [1, 1, 1].map(() => ({ kind: "part", description: "x", quantity: 1, unitPrice: 1, amount: 1 })) });
    const out = splitInvoice(odd, [{ title: "a", category: null }, { title: "b", category: null }, { title: "c", category: null }], [0, 1, 2]);
    expect(out.map((e) => e.cost)).toEqual([33.33, 33.33, 33.34]);
  });
});
