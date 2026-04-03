import { EngineType } from "./engineData";

export interface EngineService {
  id: string;
  name: string;
  description: string;
  /** Typical hours interval (e.g. 100 = every 100 hours) */
  intervalHours?: number;
}

/**
 * Structured service types for each engine category.
 * These are the actual maintenance services boat owners schedule.
 */
export const ENGINE_SERVICES: Record<EngineType, EngineService[]> = {
  Outboard: [
    { id: "out-100hr", name: "100-Hour Service", description: "Oil & filter, gear lube, impeller inspection, anodes, spark plugs, 27-point check", intervalHours: 100 },
    { id: "out-annual", name: "Annual Service / Winterization Prep", description: "Full annual maintenance per manufacturer schedule", intervalHours: 100 },
    { id: "out-oil", name: "Oil & Filter Change", description: "Engine oil and filter replacement" },
    { id: "out-gearlube", name: "Lower Unit / Gear Lube Service", description: "Drain and replace lower unit gear lubricant, inspect seals" },
    { id: "out-impeller", name: "Water Pump / Impeller Replacement", description: "Replace raw water pump impeller and gaskets", intervalHours: 300 },
    { id: "out-spark", name: "Spark Plug Replacement", description: "Replace spark plugs per manufacturer spec", intervalHours: 100 },
    { id: "out-fuel", name: "Fuel System Service", description: "Fuel filter replacement, fuel line inspection, VST filter" },
    { id: "out-thermostat", name: "Thermostat Replacement", description: "Replace engine thermostat(s) and gaskets" },
    { id: "out-winterize", name: "Winterization", description: "Fogging, fuel stabilizer, coolant flush, battery disconnect" },
    { id: "out-dewinterize", name: "De-Winterization / Spring Commissioning", description: "Remove fogging, reconnect systems, fluid check, test run" },
    { id: "out-anodes", name: "Anode Replacement", description: "Replace sacrificial anodes (zinc/aluminum/magnesium)" },
    { id: "out-trim", name: "Trim & Tilt Service", description: "Trim/tilt fluid change, seal inspection, motor test" },
    { id: "out-controls", name: "Control Cable / Rigging Service", description: "Throttle, shift cables, steering cable lubrication and adjustment" },
    { id: "out-diag", name: "Diagnostic / Troubleshooting", description: "Computer diagnostic scan, fault code reading, performance analysis" },
    { id: "out-powerhead", name: "Powerhead Rebuild / Overhaul", description: "Full powerhead disassembly, inspection, and rebuild" },
  ],

  "I/O (Sterndrive)": [
    { id: "io-100hr", name: "100-Hour Service", description: "Engine oil & filter, outdrive lube, impeller inspection, belts, 27-point check", intervalHours: 100 },
    { id: "io-annual", name: "Annual Service", description: "Full annual maintenance per manufacturer schedule", intervalHours: 100 },
    { id: "io-oil", name: "Oil & Filter Change", description: "Engine oil and filter replacement" },
    { id: "io-outdrive", name: "Outdrive Service", description: "Gimbal bearing, U-joints, bellows inspection, gear lube change" },
    { id: "io-bellows", name: "Bellows Replacement", description: "Replace exhaust, U-joint, and shift cable bellows" },
    { id: "io-impeller", name: "Water Pump / Impeller Replacement", description: "Replace raw water pump impeller and gaskets", intervalHours: 300 },
    { id: "io-gearlube", name: "Lower Unit / Gear Lube Service", description: "Drain and replace sterndrive gear lubricant" },
    { id: "io-gimbal", name: "Gimbal Bearing Replacement", description: "Replace gimbal bearing and seal" },
    { id: "io-spark", name: "Spark Plug Replacement", description: "Replace spark plugs per manufacturer spec", intervalHours: 100 },
    { id: "io-belts", name: "Belt Replacement", description: "Replace serpentine/V-belts and inspect tensioners" },
    { id: "io-fuel", name: "Fuel System Service", description: "Fuel filter, fuel lines, injector cleaning" },
    { id: "io-coolant", name: "Coolant System Service", description: "Flush and replace coolant, inspect hoses, thermostat check" },
    { id: "io-winterize", name: "Winterization", description: "Fogging, coolant flush, fuel stabilizer, outdrive storage position" },
    { id: "io-dewinterize", name: "De-Winterization / Spring Commissioning", description: "Remove fogging, fluid check, outdrive inspection, test run" },
    { id: "io-trim", name: "Trim & Tilt Service", description: "Trim/tilt fluid, rams, and seals service" },
    { id: "io-diag", name: "Diagnostic / Troubleshooting", description: "Computer diagnostic scan, fault code reading, performance analysis" },
    { id: "io-rebuild", name: "Engine Rebuild / Overhaul", description: "Full engine disassembly, inspection, and rebuild" },
  ],

  Inboard: [
    { id: "in-100hr", name: "100-Hour Service", description: "Oil & filter, raw water impeller, belts, coolant check, transmission fluid check", intervalHours: 100 },
    { id: "in-250hr", name: "250-Hour Service", description: "100-hour items plus coolant flush, fuel filters, valve adjustment", intervalHours: 250 },
    { id: "in-500hr", name: "500-Hour / Major Service", description: "250-hour items plus injectors, turbo inspection, heat exchanger service", intervalHours: 500 },
    { id: "in-oil", name: "Oil & Filter Change", description: "Engine oil and filter replacement" },
    { id: "in-impeller", name: "Raw Water Pump / Impeller Service", description: "Replace raw water pump impeller and gaskets", intervalHours: 250 },
    { id: "in-coolant", name: "Coolant System Service", description: "Flush and replace coolant, inspect hoses, heat exchanger cleaning" },
    { id: "in-transmission", name: "Transmission / Gear Service", description: "Transmission fluid change, filter replacement, adjustment" },
    { id: "in-belts", name: "Belt Replacement", description: "Replace serpentine/V-belts and inspect tensioners" },
    { id: "in-fuel", name: "Fuel System Service", description: "Primary and secondary fuel filter replacement, injector service" },
    { id: "in-exhaust", name: "Exhaust System Service", description: "Exhaust riser, elbow, and manifold inspection/replacement" },
    { id: "in-turbo", name: "Turbocharger Service", description: "Turbo inspection, cleaning, wastegate adjustment (diesel engines)" },
    { id: "in-heatex", name: "Heat Exchanger Service", description: "Clean and pressure-test heat exchanger, replace zinc pencils" },
    { id: "in-alignment", name: "Engine Alignment", description: "Check and adjust engine-to-shaft alignment" },
    { id: "in-winterize", name: "Winterization", description: "Coolant flush, fogging, fuel treatment, system drain" },
    { id: "in-dewinterize", name: "De-Winterization / Spring Commissioning", description: "Fluid fills, system checks, sea trial" },
    { id: "in-mounts", name: "Engine Mount Replacement", description: "Replace soft engine mounts and realign" },
    { id: "in-diag", name: "Diagnostic / Troubleshooting", description: "Computer diagnostic scan, fault codes, performance analysis" },
    { id: "in-rebuild", name: "Engine Rebuild / Overhaul", description: "Full engine disassembly, inspection, and rebuild" },
  ],
};

/** Get services for a given engine type */
export function getServicesForEngineType(engineType: EngineType): EngineService[] {
  return ENGINE_SERVICES[engineType] ?? [];
}

/** Get a specific service by ID */
export function getServiceById(serviceId: string): EngineService | undefined {
  for (const services of Object.values(ENGINE_SERVICES)) {
    const found = services.find((s) => s.id === serviceId);
    if (found) return found;
  }
  return undefined;
}
