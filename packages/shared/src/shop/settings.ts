// A shop's settings row (shop_settings): rates, bays, techs and the QuickBooks item names.

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

/** What a shop starts with (and what the demo shop uses). */
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

/** The address suppliers' shipping emails get forwarded to. */
export function partsInboundAddress(token: string, domain: string): string {
  return `parts+${token}@${domain}`;
}
