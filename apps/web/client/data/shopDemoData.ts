import type { InventoryItem, PartsShipment, WorkOrder } from "@shared/shop";

export interface ShopSettings {
  inboundEmailToken: string;
  laborRate: number;
  taxRate: number;
  bays: string[];
  techs: string[];
  qbLaborItem: string;
  qbPartsItem: string;
  qbFeeItem: string;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  inboundEmailToken: "demo0shop0token",
  laborRate: 145,
  taxRate: 7,
  bays: ["Bay 1", "Bay 2", "Haul-out", "Dockside"],
  techs: ["Marco", "Jess", "Luis"],
  qbLaborItem: "Marine Labor",
  qbPartsItem: "Marine Parts",
  qbFeeItem: "Shop Fees",
};

function at(dayOffset: number, hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

function day(dayOffset: number): string {
  return at(dayOffset, 12).slice(0, 10);
}

export function demoInventory(): InventoryItem[] {
  const now = new Date().toISOString();
  const row = (
    id: string, sku: string, name: string, category: string, bin: string,
    qty: number, reorder: number, cost: number, price: number, supplier: string
  ): InventoryItem => ({
    id, sku, name, category, binLocation: bin, qtyOnHand: qty, reorderPoint: reorder,
    unitCost: cost, unitPrice: price, supplier, updatedAt: now,
  });
  return [
    row("inv-1", "35-877769K01", "Mercury oil filter (Verado)", "Filters", "A1", 14, 6, 11.2, 18.5, "Mercury Marine"),
    row("inv-2", "92-858064K01", "Mercury 25W-50 synthetic blend, qt", "Fluids", "B2", 38, 24, 7.9, 13.95, "Mercury Marine"),
    row("inv-3", "35-8M0093688", "Water separating fuel filter", "Filters", "A2", 4, 6, 19.5, 32, "West Marine"),
    row("inv-4", "47-8M0100526", "Water pump impeller kit", "Cooling", "C1", 3, 4, 42, 74.95, "Defender"),
    row("inv-5", "8M0204700", "Lower unit gear lube, qt", "Fluids", "B3", 22, 10, 9.4, 16.5, "Mercury Marine"),
    row("inv-6", "6EK-WS24A-00", "Yamaha water separator element", "Filters", "A3", 9, 4, 18, 29.95, "Yamaha"),
    row("inv-7", "ANODE-ALU-K", "Aluminum anode kit, 250-300hp", "Anodes", "D1", 2, 3, 48, 89, "Fisheries Supply"),
    row("inv-8", "SPK-NGK-ILFR6", "NGK spark plug ILFR6G", "Ignition", "A4", 30, 12, 9.1, 15.5, "Marine Parts Source"),
    row("inv-9", "BOT-PNT-ABL-G", "Ablative bottom paint, gal", "Paint", "E1", 5, 4, 189, 279, "Jamestown Distributors"),
  ];
}

export function demoWorkOrders(): WorkOrder[] {
  const base = {
    description: "",
    customerEmail: "",
    projectId: null,
    engineHours: null,
    taxRate: 7,
    completedAt: null,
    exportedAt: null,
    createdAt: at(-6, 9),
  };
  return [
    {
      ...base,
      id: "wo-demo-1",
      number: "WO-1041",
      title: "300-hour service, twin Verado 300",
      description: "Oil, filters, gear lube, impellers both engines, anodes.",
      status: "in-progress",
      customerName: "Dana Whitfield",
      boatLabel: "2021 Grady-White Canyon 336 · Reel Therapy",
      assignedTo: "Marco",
      bay: "Bay 1",
      scheduledStart: at(0, 8),
      scheduledEnd: at(1, 16),
      engineHours: 612,
      lines: [
        { id: "l1", kind: "labor", description: "300-hr service labor (2 engines)", quantity: 7, unitPrice: 145 },
        { id: "l2", kind: "part", description: "Mercury oil filter (Verado)", quantity: 2, unitPrice: 18.5, inventoryItemId: "inv-1" },
        { id: "l3", kind: "part", description: "Mercury 25W-50 synthetic blend, qt", quantity: 14, unitPrice: 13.95, inventoryItemId: "inv-2" },
        { id: "l4", kind: "part", description: "Water pump impeller kit", quantity: 2, unitPrice: 74.95, inventoryItemId: "inv-4" },
        { id: "l5", kind: "fee", description: "Shop supplies & disposal", quantity: 1, unitPrice: 35 },
      ],
    },
    {
      ...base,
      id: "wo-demo-2",
      number: "WO-1042",
      title: "Bottom paint + zincs",
      status: "waiting-parts",
      customerName: "Tom Alvarez",
      boatLabel: "2018 Boston Whaler 280 Outrage",
      assignedTo: "Luis",
      bay: "Haul-out",
      scheduledStart: at(2, 7),
      scheduledEnd: at(3, 15),
      lines: [
        { id: "l6", kind: "labor", description: "Haul, pressure wash, block", quantity: 3, unitPrice: 145 },
        { id: "l7", kind: "labor", description: "Sand and 2 coats ablative", quantity: 8, unitPrice: 125 },
        { id: "l8", kind: "part", description: "Ablative bottom paint, gal", quantity: 2, unitPrice: 279, inventoryItemId: "inv-9" },
      ],
    },
    {
      ...base,
      id: "wo-demo-3",
      number: "WO-1043",
      title: "Raw water pump impeller",
      status: "scheduled",
      customerName: "Priya Natarajan",
      boatLabel: "2015 Sea Ray Sundancer 350",
      assignedTo: "Jess",
      bay: "Dockside",
      scheduledStart: at(1, 9),
      scheduledEnd: at(1, 12),
      lines: [
        { id: "l9", kind: "labor", description: "Replace raw water impeller", quantity: 2, unitPrice: 145 },
      ],
    },
    {
      ...base,
      id: "wo-demo-4",
      number: "WO-1039",
      title: "Annual service, Yamaha F250",
      status: "completed",
      customerName: "Chris Moreau",
      boatLabel: "2019 Pursuit S 288",
      assignedTo: "Marco",
      bay: "Bay 2",
      scheduledStart: at(-3, 8),
      scheduledEnd: at(-3, 14),
      completedAt: at(-3, 14),
      engineHours: 418,
      lines: [
        { id: "l10", kind: "labor", description: "Annual service labor", quantity: 3.5, unitPrice: 145 },
        { id: "l11", kind: "part", description: "Yamaha water separator element", quantity: 1, unitPrice: 29.95, inventoryItemId: "inv-6" },
        { id: "l12", kind: "part", description: "NGK spark plug ILFR6G", quantity: 6, unitPrice: 15.5, inventoryItemId: "inv-8" },
        { id: "l13", kind: "part", description: "Lower unit gear lube, qt", quantity: 2, unitPrice: 16.5, inventoryItemId: "inv-5" },
      ],
    },
    {
      ...base,
      id: "wo-demo-5",
      number: "WO-1036",
      title: "Trim tab actuator replacement",
      status: "invoiced",
      customerName: "Dana Whitfield",
      boatLabel: "2021 Grady-White Canyon 336 · Reel Therapy",
      assignedTo: "Jess",
      bay: "Bay 2",
      scheduledStart: at(-9, 9),
      scheduledEnd: at(-9, 13),
      completedAt: at(-9, 13),
      exportedAt: at(-8, 9),
      lines: [
        { id: "l14", kind: "labor", description: "Replace port trim tab actuator", quantity: 2, unitPrice: 145 },
        { id: "l15", kind: "part", description: "Lenco actuator 15091-001", quantity: 1, unitPrice: 189 },
      ],
    },
  ];
}

export function demoShipments(): PartsShipment[] {
  const base = {
    inventoryItemId: null,
    quantity: 1,
    receivedAt: null,
    createdAt: at(-2, 10),
  };
  return [
    {
      ...base,
      id: "sh-demo-1",
      supplier: "Jamestown Distributors",
      description: "Ablative bottom paint, 2 gal",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      status: "out-for-delivery",
      eta: day(0),
      workOrderId: "wo-demo-2",
      boatLabel: "2018 Boston Whaler 280 Outrage",
      customerName: "Tom Alvarez",
      inventoryItemId: "inv-9",
      quantity: 2,
      source: "email",
      emailSubject: "Your order #JD-55120 is out for delivery",
    },
    {
      ...base,
      id: "sh-demo-2",
      supplier: "Defender",
      description: "Impeller kits ×4",
      carrier: "FedEx",
      trackingNumber: "771234567890",
      status: "shipped",
      eta: day(2),
      workOrderId: null,
      boatLabel: "",
      customerName: "",
      inventoryItemId: "inv-4",
      quantity: 4,
      source: "email",
      emailSubject: "Defender order 4410923 has shipped",
    },
    {
      ...base,
      id: "sh-demo-3",
      supplier: "Fisheries Supply",
      description: "Anode kit backorder",
      carrier: "USPS",
      trackingNumber: "9400100000000000000000",
      status: "exception",
      eta: day(1),
      workOrderId: "wo-demo-1",
      boatLabel: "2021 Grady-White Canyon 336 · Reel Therapy",
      customerName: "Dana Whitfield",
      source: "manual",
      emailSubject: null,
    },
    {
      ...base,
      id: "sh-demo-4",
      supplier: "Volvo Penta",
      description: "Duoprop prop set, 3-blade (special order)",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456791",
      status: "shipped",
      eta: day(4),
      workOrderId: null,
      boatLabel: "2016 Chris-Craft Launch 28 · Hull CHCB2816",
      customerName: "Grace Liu",
      source: "email",
      emailSubject: "Your Volvo Penta order has shipped",
    },
  ];
}
