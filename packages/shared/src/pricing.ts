// What shops pay. One place for the numbers so the marketing page and billing agree.

export const PLANS = [
  {
    key: "shop",
    name: "Shop",
    monthly: 99,
    tagline: "For independent shops and mobile techs.",
    features: [
      "Bid on jobs posted near you",
      "Work orders, bay and tech schedule",
      "Customers and boats on file",
      "Live inventory and parts tracking from your inbox",
      "Invoicing and payment collection",
      "QuickBooks Online and Desktop export",
      "Vendor Insights",
      "3 crew logins",
    ],
  },
  {
    key: "yard",
    name: "Yard",
    monthly: 249,
    tagline: "For yards and multi-bay operations.",
    features: [
      "Everything in Shop",
      "Unlimited crew logins",
      "Multiple locations",
      "We import your customers, boats and parts for you",
      "A named contact at Bosun",
    ],
  },
] as const;

export type PlanKey = (typeof PLANS)[number]["key"];

/**
 * New-customer fee, charged on a customer's first year of business with a shop and only when the
 * owner pays through Bosun. The first job carries 10% (on its first $10,000). Everything else in
 * that first year starts at 5% and steps down as the customer's total passes each threshold.
 * After 12 months the customer is the shop's: no fee.
 */
export const FIRST_JOB_RATE = 0.1;
export const FIRST_JOB_BAND = 10_000;
export const FIRST_YEAR_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 25_000, rate: 0.05 },
  { upTo: 50_000, rate: 0.025 },
  { upTo: 100_000, rate: 0.015 },
  { upTo: Infinity, rate: 0.01 },
];
export const FIRST_YEAR_MONTHS = 12;

/** Fee on one job, given how much this customer has already paid the shop in their first year. */
export function jobFee(amount: number, paidBefore: number, isFirstJob: boolean): number {
  let fee = 0;
  let from = Math.max(0, paidBefore);
  const to = from + Math.max(0, amount);
  if (isFirstJob) {
    const slice = Math.min(to, FIRST_JOB_BAND) - from;
    if (slice > 0) {
      fee += slice * FIRST_JOB_RATE;
      from += slice;
    }
  }
  for (const band of FIRST_YEAR_BANDS) {
    if (from >= to) break;
    const slice = Math.min(to, band.upTo) - from;
    if (slice > 0) {
      fee += slice * band.rate;
      from += slice;
    }
  }
  return Math.round(fee * 100) / 100;
}

/** Fees across a customer's first-year jobs, in order. */
export function firstYearFees(jobs: number[]): number[] {
  let paid = 0;
  return jobs.map((amount, i) => {
    const fee = jobFee(amount, paid, i === 0);
    paid += amount;
    return fee;
  });
}

export const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
export const pct = (r: number) => `${(r * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
