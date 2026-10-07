// What an owner can post a job for. Shops' specialties (vendors/catalog.ts) are matched against the label.

export const JOB_CATEGORIES = [
  { label: "Engine Service", description: "Oil changes, tune-ups, impeller replacement, winterization" },
  { label: "Detailing & Waxing", description: "Hull cleaning, buffing, waxing, interior detailing" },
  { label: "Decking & Upholstery", description: "Teak decking, vinyl flooring, seat re-upholstery" },
  { label: "Electrical", description: "Wiring, bilge pumps, lighting, battery systems" },
  { label: "Electronics & AV", description: "GPS, fishfinders, stereo systems, chartplotters" },
  { label: "Hull & Gelcoat", description: "Osmotic blistering, gelcoat repair, antifouling paint" },
  { label: "Mechanical", description: "Steering, throttle, trim tabs, outdrive service" },
  { label: "Other / Custom", description: "Something else not listed above" },
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number]["label"];

export const WORK_LOCATIONS = [
  { value: "at_marina", label: "At my marina" },
  { value: "vendor_facility", label: "At the shop" },
  { value: "mobile", label: "Mobile / at my dock" },
] as const;
