export type MaintenanceCategory =
  | "Engine Oil & Fuel"
  | "Cooling System"
  | "Drivetrain"
  | "Electrical & Safety"
  | "Hull & Bottom";

export const CATEGORY_ICONS: Record<MaintenanceCategory, string> = {
  "Engine Oil & Fuel": "🛢️",
  "Cooling System": "❄️",
  Drivetrain: "⚙️",
  "Electrical & Safety": "⚡",
  "Hull & Bottom": "🚤",
};

export interface MaintenanceTask {
  id: string;
  task: string;
  category: MaintenanceCategory;
  intervalMonths: number;
  intervalHours?: number; // engine hours interval (whichever comes first)
  notes?: string;
}

export interface ServiceRecord {
  taskId: string;
  date: string; // YYYY-MM-DD
  engineHours?: number; // engine hours at time of service
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// ENGINE-SPECIFIC TASK LISTS
// ─────────────────────────────────────────────────────────────

// Mercury Verado (supercharged 4-stroke outboard)
const MERCURY_VERADO_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",       task: "Engine Oil & Filter",          category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Mercury Full Synthetic 25W-50. Every 100 hrs or annually, whichever comes first." },
  { id: "gear_lube",        task: "Lower Unit Gear Lube",          category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Mercury Hi-Performance Gear Lube. Drain and fill every 100 hrs or annually." },
  { id: "supercharger_oil", task: "Supercharger Oil",              category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Verado-specific. Use Mercury Supercharger Oil only. Replace every 100 hrs or annually." },
  { id: "air_filter",       task: "Air Filter",                    category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Inspect and replace every 100 hrs or annually." },
  { id: "fuel_filter_vst",  task: "Fuel Filter (VST 10-micron)",   category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Critical for Verado fuel system. Replace every 100 hrs or annually." },
  { id: "impeller",         task: "Water Pump Impeller",           category: "Cooling System",    intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years. Never run dry — inspect for cracking at each service." },
  { id: "spark_plugs",      task: "Spark Plugs (NGK Iridium)",     category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "drive_belt",       task: "Serpentine Belt Inspection",    category: "Drivetrain",        intervalMonths: 12, notes: "Inspect annually for glazing or cracking. Replace as needed." },
  { id: "throttle_body",    task: "Throttle Body Cleaning",        category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "Inspect and clean every 300 hrs or 3 years to prevent carbon buildup." },
  { id: "engine_zincs",     task: "Engine Sacrificial Zincs",      category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually. Every 6 months in saltwater." },
];

// Mercury FourStroke (naturally aspirated 4-stroke outboard)
const MERCURY_FOURSTROKE_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",  task: "Engine Oil & Filter",  category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Mercury 4-Stroke Full Synthetic or FC-W certified oil. Every 100 hrs or annually." },
  { id: "gear_lube",   task: "Lower Unit Gear Lube", category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Mercury Hi-Performance Gear Lube. Every 100 hrs or annually." },
  { id: "air_filter",  task: "Air Filter",           category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "fuel_filter", task: "Fuel Filter",          category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "impeller",    task: "Water Pump Impeller",  category: "Cooling System",    intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "spark_plugs", task: "Spark Plugs",          category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "engine_zincs",task: "Engine Sacrificial Zincs", category: "Drivetrain",   intervalMonths: 12, notes: "Replace annually. Every 6 months in saltwater." },
];

// Mercury Pro XS / OptiMax (2-stroke direct injection outboard)
const MERCURY_PROXS_TASKS: MaintenanceTask[] = [
  { id: "oil_reservoir", task: "2-Stroke Injection Oil Level", category: "Engine Oil & Fuel", intervalMonths: 1,  intervalHours: 50,  notes: "Check XPS 2-Stroke Synthetic Blend oil reservoir every 50 hours or monthly." },
  { id: "gear_lube",     task: "Lower Unit Gear Lube",         category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Mercury Hi-Performance Gear Lube. Every 100 hrs or annually." },
  { id: "fuel_filter",   task: "Fuel Filter (VST)",            category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "impeller",      task: "Water Pump Impeller",          category: "Cooling System",    intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "spark_plugs",   task: "Spark Plugs",                  category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "engine_zincs",  task: "Engine Sacrificial Zincs",     category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
];

// Yamaha F-series 4-stroke outboard
const YAMAHA_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",   task: "Engine Oil & Filter",     category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Yamalube 4M FC-W Certified 10W-30 or 25W-40. Every 100 hrs or annually." },
  { id: "gear_oil",     task: "Lower Unit Gear Oil",     category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Yamalube Gear Oil. Drain and fill every 100 hrs or annually." },
  { id: "fuel_filter",  task: "Fuel Filter",             category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "VST filter: every 300 hrs or 3 years. Inline filter: annually." },
  { id: "air_filter",   task: "Air Filter Inspection",   category: "Engine Oil & Fuel", intervalMonths: 12, notes: "Inspect annually. Replace as needed based on condition." },
  { id: "impeller",     task: "Water Pump Impeller",     category: "Cooling System",    intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "spark_plugs",  task: "Spark Plugs",             category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Standard plugs: 100 hrs/1 yr. Iridium: 200 hrs/2 yrs." },
  { id: "engine_zincs", task: "Engine Sacrificial Zincs",category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually. Every 6 months in saltwater." },
];

// Yamaha XTO Offshore (V8 5.6L 425/450hp)
const YAMAHA_XTO_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",   task: "Engine Oil & Filter",         category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Yamalube 4M Synthetic 0W-40 or 5W-30. Every 100 hrs or annually." },
  { id: "gear_oil",     task: "Lower Unit Gear Oil",         category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Yamalube Gear Oil. Every 100 hrs or annually." },
  { id: "fuel_filter",  task: "High-Pressure Fuel Filter",   category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually. XTO uses high-pressure DI injection." },
  { id: "air_filter",   task: "Air Filter",                  category: "Engine Oil & Fuel", intervalMonths: 12, notes: "Inspect annually. XTO uses large-volume air intake." },
  { id: "impeller",     task: "Water Pump Impeller",         category: "Cooling System",    intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "spark_plugs",  task: "Spark Plugs (Iridium)",       category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "drive_belt",   task: "Accessory Belt Inspection",   category: "Drivetrain",        intervalMonths: 12, notes: "Inspect annually." },
  { id: "engine_zincs", task: "Engine Sacrificial Zincs",    category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
];

// Suzuki DF-series 4-stroke outboard
const SUZUKI_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",   task: "Engine Oil & Filter",     category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Suzuki Marine Motor Oil 10W-40 FC-W. Every 100 hrs or annually." },
  { id: "gear_oil",     task: "Gear Oil",                category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Suzuki Outboard Gear Oil. Every 100 hrs or annually." },
  { id: "air_filter",   task: "Air Filter",              category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "fuel_filter",  task: "Fuel Filter",             category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "impeller",     task: "Water Pump Impeller",     category: "Cooling System",    intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "spark_plugs",  task: "Spark Plugs",             category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "engine_zincs", task: "Engine Sacrificial Zincs",category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
];

// Honda BF-series 4-stroke outboard
const HONDA_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",     task: "Engine Oil & Filter",                  category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Honda Marine 10W-30 or 10W-40 FC-W. Every 100 hrs or annually." },
  { id: "gear_oil",       task: "Lower Unit Gear Oil",                  category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Honda Genuine Gear Oil. Every 100 hrs or annually." },
  { id: "air_filter",     task: "Air Filter",                           category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 200, notes: "Foam: clean every 100 hrs, replace every 200 hrs. Paper: annually." },
  { id: "fuel_filter",    task: "Fuel Filter",                          category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "impeller",       task: "Water Pump Impeller",                  category: "Cooling System",    intervalMonths: 36, intervalHours: 200, notes: "Replace every 200 hrs or 3 years." },
  { id: "spark_plugs",    task: "Spark Plugs (Iridium)",                category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "engine_zincs",   task: "Engine Sacrificial Zincs",             category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
  { id: "throttle_cables",task: "Throttle & Shift Cable Inspection",    category: "Drivetrain",        intervalMonths: 12, notes: "Inspect and lubricate annually." },
];

// Evinrude E-TEC G2 (2-stroke direct injection outboard)
const EVINRUDE_TASKS: MaintenanceTask[] = [
  { id: "oil_injection", task: "2-Stroke Injection Oil Check", category: "Engine Oil & Fuel", intervalMonths: 1,  intervalHours: 50,  notes: "Evinrude XD100 oil. E-TEC auto-injects — check reservoir every 50 hrs or monthly." },
  { id: "gear_oil",      task: "Gear Oil",                    category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "BRP HPF Pro Gear Lube. Every 100 hrs or annually." },
  { id: "fuel_filter",   task: "Fuel Filter",                 category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "impeller",      task: "Water Pump Impeller",         category: "Cooling System",    intervalMonths: 36, intervalHours: 300, notes: "Replace every 300 hrs or 3 years." },
  { id: "spark_plugs",   task: "Spark Plugs",                 category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 300, notes: "E-TEC DI reduces carbon buildup — replace every 300 hrs or 3 years." },
  { id: "engine_zincs",  task: "Engine Sacrificial Zincs",    category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
  { id: "battery",       task: "Battery Inspection & Load Test", category: "Electrical & Safety", intervalMonths: 12, notes: "E-TEC relies heavily on battery voltage. Load test annually; replace below 70% capacity." },
];

// MerCruiser Alpha / Bravo (I/O Sterndrive)
const MERCRUISER_IO_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",     task: "Engine Oil & Filter",             category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Mercury Full Synthetic 25W-40. Every 100 hrs or annually." },
  { id: "drive_fluid",    task: "Alpha / Bravo Drive Fluid",       category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Mercury High Performance Gear Lube. Check every 20 hrs; drain/fill every 100 hrs or annually." },
  { id: "impeller",       task: "Raw Water Impeller",              category: "Cooling System",    intervalMonths: 12, intervalHours: 200, notes: "Replace annually or every 200 hrs. Do not skip — failure causes severe overheating." },
  { id: "spark_plugs",    task: "Spark Plugs",                     category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "coolant",        task: "Engine Coolant (50/50 mix)",      category: "Cooling System",    intervalMonths: 24, notes: "Flush and replace every 2 years with Mercury Antifreeze." },
  { id: "bellows",        task: "Bellows & Gimbal Ring Inspection",category: "Drivetrain",        intervalMonths: 24, notes: "Inspect U-joint, shift cable, and exhaust bellows every 2 years. Replace cracked bellows immediately." },
  { id: "fuel_filter",    task: "Fuel Filter",                     category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "drive_zincs",    task: "Drive Sacrificial Zincs",         category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
  { id: "serpentine_belt",task: "Serpentine Belt Inspection",      category: "Drivetrain",        intervalMonths: 12, notes: "Inspect annually for wear, cracks, or glazing." },
];

// MerCruiser Inboard (shaft-drive)
const MERCRUISER_INBOARD_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",     task: "Engine Oil & Filter",          category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Mercury Full Synthetic 25W-40. Every 100 hrs or annually." },
  { id: "impeller",       task: "Raw Water Impeller",           category: "Cooling System",    intervalMonths: 12, intervalHours: 200, notes: "Replace annually or every 200 hrs." },
  { id: "spark_plugs",    task: "Spark Plugs",                  category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "coolant",        task: "Engine Coolant (50/50 mix)",   category: "Cooling System",    intervalMonths: 24, notes: "Flush and replace every 2 years." },
  { id: "shaft_packing",  task: "Shaft Packing / Cutlass Bearing", category: "Drivetrain",    intervalMonths: 12, notes: "Inspect and adjust packing gland annually. Replace cutlass bearing every 3–5 years." },
  { id: "fuel_filter",    task: "Fuel Filter",                  category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Replace every 100 hrs or annually." },
  { id: "heat_exchanger_zinc", task: "Heat Exchanger Zinc",     category: "Cooling System",    intervalMonths: 12, notes: "Replace annually." },
  { id: "serpentine_belt",task: "Serpentine Belt Inspection",   category: "Drivetrain",        intervalMonths: 12, notes: "Inspect annually." },
];

// Volvo Penta Diesel (D4 / D6 / D8 / D13 — IPS or Sterndrive)
const VOLVO_DIESEL_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",            task: "Engine Oil & Filter",               category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 150, notes: "Volvo Penta Synthetic Diesel Engine Oil. Every 150 hrs or annually." },
  { id: "drive_oil",             task: "IPS / SX-Drive Oil",                category: "Drivetrain",        intervalMonths: 12, intervalHours: 300, notes: "Volvo Penta IPS Drive Oil. Change every 300 hrs or annually." },
  { id: "fuel_filter_primary",   task: "Primary Fuel Filter (Pre-Filter)",  category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 300, notes: "Replace every 300 hrs or annually. Monitor the water separator bowl." },
  { id: "fuel_filter_secondary", task: "Secondary Fuel Filter",             category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 300, notes: "Replace every 300 hrs or annually." },
  { id: "impeller",              task: "Raw Water Impeller",                category: "Cooling System",    intervalMonths: 24, intervalHours: 300, notes: "Replace every 300 hrs or 2 years." },
  { id: "coolant",               task: "Engine Coolant (OAT)",              category: "Cooling System",    intervalMonths: 24, notes: "Organic Acid Technology coolant. Test annually; replace every 2 years." },
  { id: "drive_zincs",           task: "Drive Sacrificial Zincs",           category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
  { id: "heat_zinc",             task: "Heat Exchanger Zinc",               category: "Cooling System",    intervalMonths: 12, notes: "Replace annually." },
];

// Volvo Penta Gasoline (5.0 GXi / 5.7 GXi / 8.1 GXi — Sterndrive)
const VOLVO_GAS_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",  task: "Engine Oil & Filter",    category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 100, notes: "Every 100 hrs or annually." },
  { id: "drive_oil",   task: "SX / DPS Drive Oil",     category: "Drivetrain",        intervalMonths: 12, intervalHours: 100, notes: "Volvo Penta Drive Oil. Every 100 hrs or annually." },
  { id: "impeller",    task: "Raw Water Impeller",      category: "Cooling System",    intervalMonths: 12, intervalHours: 200, notes: "Replace annually or every 200 hrs." },
  { id: "spark_plugs", task: "Spark Plugs",             category: "Engine Oil & Fuel", intervalMonths: 24, intervalHours: 200, notes: "Replace every 200 hrs or 2 years." },
  { id: "coolant",     task: "Engine Coolant",          category: "Cooling System",    intervalMonths: 24, notes: "Replace every 2 years." },
  { id: "drive_zincs", task: "Drive Sacrificial Zincs", category: "Drivetrain",        intervalMonths: 12, notes: "Replace annually." },
  { id: "bellows",     task: "Bellows Inspection",      category: "Drivetrain",        intervalMonths: 36, notes: "Inspect SX/DPS bellows every 3 years. Replace if cracked." },
];

// Cummins QSB / QSC / QSM / QSK Diesel (Inboard)
const CUMMINS_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",            task: "Engine Oil & Filter",           category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250, notes: "Cummins-approved CES 20078/20081 15W-40 or synthetic equivalent. Every 250 hrs or annually." },
  { id: "fuel_filter_primary",   task: "Primary Fuel Filter (Racor)",   category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250, notes: "Every 250 hrs or annually. Monitor water-in-fuel indicator weekly." },
  { id: "fuel_filter_secondary", task: "Secondary Fuel Filter",         category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250, notes: "Replace every 250 hrs or annually." },
  { id: "impeller",              task: "Raw Water Impeller",            category: "Cooling System",    intervalMonths: 12, intervalHours: 500, notes: "Replace every 500 hrs or annually." },
  { id: "coolant",               task: "Coolant & DCA Additive",        category: "Cooling System",    intervalMonths: 24, notes: "Test DCA (Diesel Coolant Additive) annually. Full coolant flush every 2 years." },
  { id: "air_filter",            task: "Air Filter",                    category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 500, notes: "Inspect every 250 hrs. Replace every 500 hrs or annually." },
  { id: "drive_belts",           task: "Drive Belt Inspection",         category: "Drivetrain",        intervalMonths: 12, notes: "Inspect all serpentine belts annually for wear, cracking, or glazing." },
  { id: "heat_zinc",             task: "Heat Exchanger Zinc",           category: "Cooling System",    intervalMonths: 12, notes: "Replace annually." },
];

// MTU Series 2000 / 4000 Diesel (Inboard — megayacht / commercial)
const MTU_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",     task: "Engine Oil & Filter",                category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250,  notes: "MTU-approved fully synthetic diesel oil (SAE 10W-40). Every 250 hrs or annually." },
  { id: "fuel_filter",    task: "Fuel Filters (Primary & Secondary)", category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250,  notes: "Replace both filters every 250 hrs or annually." },
  { id: "impeller",       task: "Raw Water Impeller",                 category: "Cooling System",    intervalMonths: 12, intervalHours: 500,  notes: "Replace every 500 hrs or annually." },
  { id: "coolant",        task: "Engine Coolant (Concentrate)",       category: "Cooling System",    intervalMonths: 24, notes: "MTU approved ASTM D3306/D6210 coolant. Full flush every 2 years; test concentration annually." },
  { id: "air_filter",     task: "Air Filter",                        category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 1000, notes: "Inspect annually. Replace every 1,000 hrs." },
  { id: "heat_zinc",      task: "Heat Exchanger Zinc",               category: "Cooling System",    intervalMonths: 12, notes: "Replace annually." },
  { id: "valve_clearance",task: "Valve Clearance Check",             category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 3000, notes: "Check and adjust valve clearances every 3,000 hrs or 3 years." },
  { id: "injector_test",  task: "Injector Flow Test",                category: "Engine Oil & Fuel", intervalMonths: 36, intervalHours: 3000, notes: "Test and recalibrate injectors every 3 years or per MTU schedule." },
];

// Caterpillar C7 / C9 / C12 / C18 / C32 Diesel (Inboard)
const CATERPILLAR_TASKS: MaintenanceTask[] = [
  { id: "oil_filter",            task: "Engine Oil & Filter",              category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250, notes: "CAT DEO-ULS (Diesel Engine Oil Ultra Low Sulfur). Every 250 hrs or annually." },
  { id: "fuel_filter_primary",   task: "Primary Fuel Filter",              category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250, notes: "CAT primary fuel filter. Replace every 250 hrs or annually." },
  { id: "fuel_filter_secondary", task: "Final Fuel Filter",                category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 250, notes: "CAT final fuel filter element. Replace every 250 hrs or annually." },
  { id: "impeller",              task: "Raw Water Impeller",               category: "Cooling System",    intervalMonths: 12, intervalHours: 500, notes: "Replace every 500 hrs or annually." },
  { id: "coolant",               task: "Coolant (ELC)",                    category: "Cooling System",    intervalMonths: 36, notes: "CAT Extended Life Coolant. Test annually with CAT strips. Full flush every 6,000 hrs or 3 years." },
  { id: "air_filter",            task: "Air Filter",                       category: "Engine Oil & Fuel", intervalMonths: 12, intervalHours: 500, notes: "Inspect every 250 hrs. Replace every 500 hrs or annually." },
  { id: "heat_zinc",             task: "Heat Exchanger Zinc",              category: "Cooling System",    intervalMonths: 12, notes: "Replace annually." },
  { id: "fuel_system_bleed",     task: "Fuel System Prime & Bleed Check", category: "Engine Oil & Fuel", intervalMonths: 12, notes: "Inspect lift pump, bleed screws, and priming system annually." },
];

// ─────────────────────────────────────────────────────────────
// GENERAL BOAT TASKS (apply to all boats regardless of engine)
// ─────────────────────────────────────────────────────────────
export const GENERAL_TASKS: MaintenanceTask[] = [
  { id: "general_bottom_paint", task: "Bottom Paint (Antifouling)",      category: "Hull & Bottom",       intervalMonths: 12, notes: "Haul out, clean, and apply fresh antifouling. Every 6 months in tropical/high-fouling areas." },
  { id: "general_hull_wax",     task: "Hull Wax & Oxidation Treatment",  category: "Hull & Bottom",       intervalMonths: 12, notes: "Compound, polish, and wax hull annually to protect gelcoat and restore shine." },
  { id: "general_battery",      task: "Battery Inspection & Load Test",  category: "Electrical & Safety", intervalMonths: 12, notes: "Load test all house and starting batteries. Replace any battery below 70% capacity." },
  { id: "general_bilge_pump",   task: "Bilge Pump Test",                 category: "Electrical & Safety", intervalMonths: 6,  notes: "Test automatic float switch activation and manual override every 6 months." },
  { id: "general_safety_gear",  task: "Safety Equipment Inspection",     category: "Electrical & Safety", intervalMonths: 12, notes: "Check life jacket condition and fit, flare expiry dates, fire extinguisher charge, and throwable PFD." },
  { id: "general_nav_lights",   task: "Navigation Lights Test",          category: "Electrical & Safety", intervalMonths: 12, notes: "Test all running lights (port, starboard, stern), anchor light, and masthead light." },
  { id: "general_fuel_system",  task: "Fuel System Inspection",          category: "Engine Oil & Fuel",   intervalMonths: 12, notes: "Inspect fuel hoses, primer bulb, deck fitting, vent lines, and connections for cracks or deterioration." },
  { id: "general_thru_hulls",   task: "Thru-Hulls & Seacocks",           category: "Hull & Bottom",       intervalMonths: 12, notes: "Exercise and grease all seacocks. Inspect thru-hull fittings for corrosion or marine growth." },
  { id: "general_steering",     task: "Steering System Inspection",      category: "Drivetrain",          intervalMonths: 12, notes: "Check hydraulic fluid level and lines for leaks. Test full port-to-starboard travel. Inspect tilt/trim." },
  { id: "general_vhf_epirb",    task: "VHF Radio & EPIRB Check",         category: "Electrical & Safety", intervalMonths: 12, notes: "Test VHF DSC / MMSI registration. Verify EPIRB battery expiry and NOAA registration are current." },
];

// ─────────────────────────────────────────────────────────────
// LOOKUP FUNCTION
// ─────────────────────────────────────────────────────────────
export function getMaintenanceTasks(
  engineMake: string,
  engineModel: string,
  engineType: string
): MaintenanceTask[] {
  let engineTasks: MaintenanceTask[] = [];

  if (engineMake === "Mercury") {
    if (engineModel.includes("Verado")) {
      engineTasks = MERCURY_VERADO_TASKS;
    } else if (engineModel.includes("Pro XS") || engineModel.includes("OptiMax")) {
      engineTasks = MERCURY_PROXS_TASKS;
    } else {
      engineTasks = MERCURY_FOURSTROKE_TASKS;
    }
  } else if (engineMake === "Yamaha") {
    engineTasks = engineModel.includes("XTO") ? YAMAHA_XTO_TASKS : YAMAHA_TASKS;
  } else if (engineMake === "Suzuki") {
    engineTasks = SUZUKI_TASKS;
  } else if (engineMake === "Honda") {
    engineTasks = HONDA_TASKS;
  } else if (engineMake === "Evinrude") {
    engineTasks = EVINRUDE_TASKS;
  } else if (engineMake === "MerCruiser") {
    engineTasks = engineType === "I/O (Sterndrive)" ? MERCRUISER_IO_TASKS : MERCRUISER_INBOARD_TASKS;
  } else if (engineMake === "Volvo") {
    // D-series = diesel (D4, D6, D8, D13); G-series = gasoline (5.0, 5.7, 8.1)
    engineTasks = engineModel.startsWith("D") ? VOLVO_DIESEL_TASKS : VOLVO_GAS_TASKS;
  } else if (engineMake === "Cummins") {
    engineTasks = CUMMINS_TASKS;
  } else if (engineMake === "MTU") {
    engineTasks = MTU_TASKS;
  } else if (engineMake === "Caterpillar") {
    engineTasks = CATERPILLAR_TASKS;
  }

  return [...engineTasks, ...GENERAL_TASKS];
}

// ─────────────────────────────────────────────────────────────
// DEFAULT SERVICE RECORDS for the demo boat (Mercury Verado 250)
// Designed so today (March 2026) produces a realistic mix of
// overdue, due-soon, and up-to-date items.
// ─────────────────────────────────────────────────────────────
export const DEFAULT_SERVICE_RECORDS: ServiceRecord[] = [
  // Engine tasks — annual items last done ~13 months ago → OVERDUE
  { taskId: "oil_filter",        date: "2025-02-10", engineHours: 212 },
  { taskId: "gear_lube",         date: "2025-02-10", engineHours: 212 },
  { taskId: "supercharger_oil",  date: "2025-02-10", engineHours: 212 },
  { taskId: "fuel_system",       date: "2025-02-10", engineHours: 212 },
  // Annual items done in late April → DUE SOON (~6 weeks out)
  { taskId: "air_filter",        date: "2025-04-22", engineHours: 234 },
  { taskId: "fuel_filter_vst",   date: "2025-04-22", engineHours: 234 },
  { taskId: "drive_belt",        date: "2025-04-22", engineHours: 234 },
  // 3-year items last done ~37 months ago → OVERDUE
  { taskId: "impeller",          date: "2023-02-10", engineHours: 12  },
  { taskId: "spark_plugs",       date: "2023-02-10", engineHours: 12  },
  // 3-year item done April 2023 → DUE SOON (~6 weeks out)
  { taskId: "throttle_body",     date: "2023-04-22", engineHours: 18  },
  // Zincs done mid-summer 2025 → OK (~3 months left)
  { taskId: "engine_zincs",      date: "2025-06-14", engineHours: 256 },
  // General tasks
  { taskId: "general_bottom_paint", date: "2025-01-18" },
  { taskId: "general_hull_wax",     date: "2025-08-05" },
  { taskId: "general_battery",      date: "2025-04-22" },
  { taskId: "general_bilge_pump",   date: "2025-09-12" },
  { taskId: "general_safety_gear",  date: "2026-01-08" },
  { taskId: "general_nav_lights",   date: "2026-01-08" },
  { taskId: "general_fuel_system",  date: "2025-02-10" },
  { taskId: "general_thru_hulls",   date: "2025-02-10" },
  { taskId: "general_steering",     date: "2025-04-22" },
  { taskId: "general_vhf_epirb",    date: "2026-01-08" },
];
