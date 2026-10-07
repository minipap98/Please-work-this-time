// equipmentData.ts — Warrantable marine equipment categories, manufacturers, and warranty portals
// Bosun Marine Services App

export type EquipmentCategory =
  | "engine"
  | "mfd" // Multi-Function Display
  | "radar"
  | "fishfinder"
  | "vhf_radio"
  | "autopilot"
  | "trolling_motor"
  | "generator"
  | "air_conditioning"
  | "windlass"
  | "thruster"
  | "watermaker"
  | "refrigeration"
  | "stereo"
  | "lighting"
  | "battery"
  | "charger_inverter"
  | "other";

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  engine: "Engine / Propulsion",
  mfd: "Multi-Function Display",
  radar: "Radar",
  fishfinder: "Fishfinder / Sonar",
  vhf_radio: "VHF Radio",
  autopilot: "Autopilot",
  trolling_motor: "Trolling Motor",
  generator: "Generator",
  air_conditioning: "Air Conditioning / HVAC",
  windlass: "Windlass / Anchor System",
  thruster: "Thruster",
  watermaker: "Watermaker / Desalinator",
  refrigeration: "Refrigeration / Freezer",
  stereo: "Marine Stereo / Audio",
  lighting: "Marine Lighting",
  battery: "Battery",
  charger_inverter: "Charger / Inverter",
  other: "Other Equipment",
};

/** Major manufacturers for each equipment category */
export const equipmentManufacturers: Record<EquipmentCategory, string[]> = {
  engine: [
    "Mercury",
    "Yamaha",
    "Suzuki",
    "Honda",
    "Evinrude",
    "Volvo Penta",
    "Cummins",
    "Caterpillar",
    "MAN",
    "Yanmar",
  ],
  mfd: ["Garmin", "Raymarine", "Simrad", "Furuno", "Humminbird", "Lowrance"],
  radar: ["Garmin", "Raymarine", "Simrad", "Furuno"],
  fishfinder: [
    "Garmin",
    "Humminbird",
    "Lowrance",
    "Simrad",
    "Raymarine",
    "Furuno",
  ],
  vhf_radio: [
    "Standard Horizon",
    "Icom",
    "Uniden",
    "Garmin",
    "Raymarine",
  ],
  autopilot: ["Garmin", "Raymarine", "Simrad", "Furuno"],
  trolling_motor: ["Minn Kota", "MotorGuide", "Rhodan", "Garmin Force"],
  generator: [
    "Onan/Cummins",
    "Kohler",
    "Westerbeke",
    "Northern Lights",
    "Fischer Panda",
  ],
  air_conditioning: [
    "Marine Air",
    "Dometic",
    "Mabru",
    "Webasto",
    "Cruisair",
  ],
  windlass: ["Lewmar", "Maxwell", "Muir", "Lofrans", "Quick"],
  thruster: ["Side-Power", "Lewmar", "Max Power", "Vetus", "ABT TRAC"],
  watermaker: [
    "Spectra",
    "Katadyn",
    "Parker",
    "Sea Recovery",
    "Village Marine",
  ],
  refrigeration: [
    "Dometic",
    "Isotherm",
    "Frigoboat",
    "Norcold",
    "Vitrifrigo",
  ],
  stereo: [
    "Fusion",
    "JL Audio",
    "Wet Sounds",
    "Rockford Fosgate",
    "Kenwood",
  ],
  lighting: [
    "Lumitec",
    "Hella Marine",
    "OceanLED",
    "Rigid Industries",
    "Shadow-Caster",
  ],
  battery: [
    "Optima",
    "Lifeline",
    "Firefly",
    "Mastervolt",
    "Victron",
    "Battle Born",
    "RELiON",
  ],
  charger_inverter: [
    "Victron",
    "Mastervolt",
    "ProMariner",
    "Charles Industries",
    "Xantrex",
  ],
  other: [],
};

/** Common models per manufacturer (selected highlights, not exhaustive) */
export const commonModels: Record<string, string[]> = {
  // Engines
  Mercury: [
    "Verado 400R",
    "Verado 350",
    "Pro XS 250",
    "Pro XS 175",
    "FourStroke 150",
    "FourStroke 115",
    "SeaPro 300",
    "Racing 450R",
  ],
  Yamaha: [
    "F300",
    "F250",
    "F200",
    "F150",
    "F115",
    "F90",
    "F70",
    "V8 XTO 425",
  ],
  Suzuki: ["DF350A", "DF300B", "DF250", "DF200A", "DF150A", "DF115B", "DF70A"],
  Honda: ["BF250", "BF225", "BF200", "BF150", "BF115", "BF90", "BF60"],
  "Volvo Penta": [
    "D13-IPS1350",
    "D8-IPS800",
    "D6-440",
    "D4-320",
    "D3-220",
    "V8-430",
  ],
  Cummins: ["QSB 6.7", "QSC 8.3", "QSL9", "QSM11", "QSK19"],
  Caterpillar: ["C7.1", "C9.3", "C12.9", "C18", "C32"],
  Yanmar: ["4JH80", "4JH110", "4LHA-HTP", "6LY3-ETP", "6HYS-WET"],

  // MFDs
  Garmin: [
    "GPSMAP 8616xsv",
    "GPSMAP 8612xsv",
    "GPSMAP 1243xsv",
    "GPSMAP 943xsv",
    "ECHOMAP Ultra 126sv",
    "ECHOMAP UHD2 93sv",
  ],
  Raymarine: [
    "Axiom2 Pro 16",
    "Axiom2 Pro 12",
    "Axiom2 Pro 9",
    "Axiom+ 12",
    "Axiom+ 9",
    "Axiom+ 7",
  ],
  Simrad: [
    "NSX 3012",
    "NSX 3009",
    "NSO evo3S",
    "GO12 XSE",
    "GO9 XSE",
    "Cruise 9",
  ],
  Furuno: [
    "NavNet TZtouchXL",
    "NavNet TZtouch3 16",
    "NavNet TZtouch3 12",
    "GP-39",
    "GP-33",
  ],
  Humminbird: [
    "SOLIX 15 MEGA SI+",
    "SOLIX 12 MEGA SI+",
    "HELIX 12 CHIRP MEGA DI+",
    "HELIX 10 CHIRP MEGA SI+",
    "HELIX 7 CHIRP SI",
  ],
  Lowrance: [
    "HDS PRO 16",
    "HDS PRO 12",
    "HDS PRO 9",
    "HDS LIVE 12",
    "HDS LIVE 9",
    "Elite FS 9",
  ],

  // VHF Radios
  "Standard Horizon": [
    "GX6000",
    "GX2400",
    "GX1850",
    "GX1400",
    "HX890",
    "HX870",
  ],
  Icom: ["M510", "M506", "M424G", "M330G", "M94D", "M93D"],

  // Trolling Motors
  "Minn Kota": [
    "Ultrex Quest 112",
    "Ultrex Quest 90",
    "Terrova Quest 112",
    "Riptide Ulterra 112",
    "Riptide Terrova 112",
  ],
  MotorGuide: ["Tour Pro 109", "Tour Pro 82", "Xi5 105", "Xi3 70"],
  Rhodan: ["HD GPS Anchor 120", "Marine HD GPS 160"],

  // Generators
  "Onan/Cummins": [
    "MDKBU 13.5kW",
    "MDKBV 21.5kW",
    "MDKBP 9.5kW",
    "MDKBN 7kW",
  ],
  Kohler: ["7.5EFKOZD", "9EKOZD", "11.5EFKOZD", "13.5EFKOZD", "20EFKOZD"],
  Westerbeke: ["5.0 BCG", "7.6 BTD", "8.0 BTD", "11.5 BTD", "15.0 BTD"],
  "Northern Lights": ["M673L3", "M773LW3", "M843NW3", "M944W3"],
  "Fischer Panda": ["iSeries 5000i", "iSeries 8000i", "iSeries 15000i"],

  // HVAC
  "Marine Air": ["16K BTU", "18K BTU", "24K BTU"],
  Dometic: [
    "Turbo 16K BTU",
    "Turbo 12K BTU",
    "DTU 16K",
    "CoolBreeze 14K",
    "Emerald 12K",
  ],
  Webasto: ["FCF Platinum 16K", "FCF Platinum 12K", "BlueCool S-Series"],

  // Windlass
  Lewmar: ["V700", "V1000", "Pro-Fish 700", "Pro-Fish 1000", "CPX3"],
  Maxwell: ["RC10 AutoAnchor", "HRC10", "VWCLP 3500", "Freedom 500"],

  // Audio
  Fusion: [
    "Apollo RA770",
    "Apollo RA670",
    "MS-RA210",
    "MS-RA60",
    "SG-FLT882SPC 8.8\" Tower",
  ],
  "JL Audio": [
    "MediaMaster MM105",
    "MediaMaster MM50",
    "M6-880X",
    "M3-770X",
  ],
  "Wet Sounds": ["Stealth 6 Ultra HD", "Sinister SDX6", "Rev 10 Tower"],

  // Batteries
  "Battle Born": ["BB10012 100Ah", "BB5012 50Ah", "GC3 12V"],
  RELiON: ["RB100 12V", "RB200 12V", "RB300 12V", "RB100-LT"],
  Victron: [
    "Smart Lithium 200Ah",
    "Smart Lithium 150Ah",
    "SuperPack 100Ah",
    "AGM 220Ah",
  ],
  Mastervolt: ["MLI Ultra 24/5000", "MLI Ultra 12/5500", "MVG 12/220"],

  // Chargers/Inverters
  // (Victron and Mastervolt already above)
  ProMariner: [
    "ProTournament 360 Elite",
    "ProNautic 1260P",
    "ProMariner ProSport 20+",
  ],
  Xantrex: [
    "Freedom XC Pro 3000",
    "Freedom XC 2000",
    "TRUECharge2 60A",
    "TRUECharge2 40A",
  ],
};

export interface WarrantyPortalInfo {
  url: string;
  phone?: string;
  notes?: string;
}

/** Warranty portal links, phone numbers, and claim notes for major marine manufacturers */
export const warrantyPortals: Record<string, WarrantyPortalInfo> = {
  Mercury: {
    url: "https://www.mercurymarine.com/en/us/support/warranty/",
    phone: "920-929-5040",
    notes:
      "Warranty claims must be submitted by an authorized Mercury dealer. Coverage varies by product line (up to 5 years on Verado).",
  },
  Yamaha: {
    url: "https://www.yamahaoutboards.com/en-us/owner-resources/warranty",
    phone: "866-894-1626",
    notes:
      "Submit through Yamaha dealer network. Standard 3-year limited warranty; Y.E.S. extended plans available.",
  },
  Suzuki: {
    url: "https://www.suzukimarine.com/en-us/support/warranty",
    phone: "714-996-7040",
    notes:
      "Claims handled by authorized Suzuki Marine dealers. 3-year limited warranty standard.",
  },
  Honda: {
    url: "https://marine.honda.com/support/warranty",
    phone: "866-784-1870",
    notes:
      "5-year non-declining warranty on all outboards. True 5-Year Warranty with no hour limitations.",
  },
  "Volvo Penta": {
    url: "https://www.volvopenta.com/marine/services/warranty/",
    phone: "757-436-2800",
    notes:
      "Warranty administered through authorized Volvo Penta dealers. Base 2-year warranty with optional extensions.",
  },
  Cummins: {
    url: "https://www.cummins.com/support/warranty",
    phone: "800-343-7357",
    notes:
      "Covers Cummins and Onan marine products. Claims processed through authorized Cummins distributors.",
  },
  Garmin: {
    url: "https://www.garmin.com/en-US/legal/consumer-limited-warranty/",
    phone: "913-397-8200",
    notes:
      "1- or 2-year limited warranty depending on product. Register product online for coverage. Support available via phone, email, or chat.",
  },
  Raymarine: {
    url: "https://www.raymarine.com/en-us/support/warranty",
    phone: "603-324-7900",
    notes:
      "Standard 2-year warranty on most electronics; 3 years on select products when registered within 90 days of purchase.",
  },
  Simrad: {
    url: "https://www.simrad-yachting.com/support/warranty/",
    phone: "800-628-4487",
    notes:
      "2-year warranty standard. Part of Navico group. Register product at simrad-yachting.com for coverage.",
  },
  Furuno: {
    url: "https://www.furunousa.com/en/support/warranty",
    phone: "360-834-9300",
    notes:
      "Standard 2-year parts warranty and 1-year labor warranty. Extended warranties available through authorized dealers.",
  },
  Humminbird: {
    url: "https://www.humminbird.com/support/warranty",
    phone: "800-633-1468",
    notes:
      "1- or 2-year limited warranty depending on product line. Register at humminbird.com within 30 days.",
  },
  Lowrance: {
    url: "https://www.lowrance.com/support/warranty/",
    phone: "800-628-4487",
    notes:
      "2-year warranty on most products. Part of Navico group. Register product online for coverage verification.",
  },
  Dometic: {
    url: "https://www.dometic.com/en-us/support/warranty",
    phone: "800-544-4881",
    notes:
      "Covers marine HVAC, refrigeration, and sanitation products. Warranty varies by product (1-3 years). Claims through authorized service centers.",
  },
  "Minn Kota": {
    url: "https://www.minnkota.com/support/warranty",
    phone: "800-227-6433",
    notes:
      "2-year limited warranty standard. Lifetime warranty on composite shafts. Register at minnkota.com.",
  },
  Kohler: {
    url: "https://kohlerpower.com/en/marine/support/warranty",
    phone: "800-544-2444",
    notes:
      "5-year or 2,000-hour limited warranty on marine generators. Must be installed by authorized dealer for full coverage.",
  },
  "Standard Horizon": {
    url: "https://www.standardhorizon.com/indexVS.cfm?cmd=WarrantyInfo",
    phone: "714-827-7600",
    notes:
      "3-year waterproof warranty on most VHF radios. Submit warranty registration card within 30 days of purchase.",
  },
  Icom: {
    url: "https://www.icomamerica.com/en/support/warranty/",
    phone: "800-872-4266",
    notes:
      "Standard 2-year warranty on marine radios. Extended to 3 years with online registration within 90 days.",
  },
  Lewmar: {
    url: "https://www.lewmar.com/support/warranty",
    phone: "203-458-6200",
    notes:
      "2-year limited warranty on windlasses and thrusters. Claims require proof of purchase and installation by qualified technician.",
  },
  Victron: {
    url: "https://www.victronenergy.com/support/warranty",
    phone: "N/A (dealer network)",
    notes:
      "5-year warranty on most products. Claims handled through authorized Victron Energy dealers and distributors.",
  },
  Fusion: {
    url: "https://www.fusionentertainment.com/en-US/support/warranty",
    phone: "623-580-9000",
    notes:
      "Standard 2-year warranty. Owned by Garmin. Register product at fusionentertainment.com.",
  },
  Westerbeke: {
    url: "https://www.westerbeke.com/warranty/",
    phone: "508-588-7700",
    notes:
      "2-year or 2,000-hour limited warranty on marine generators. Must be commissioned by authorized dealer.",
  },
  Spectra: {
    url: "https://www.spectrawatermakers.com/us/support/warranty",
    phone: "415-526-2780",
    notes:
      "5-year limited warranty on most watermaker systems. Annual service by authorized technician recommended to maintain coverage.",
  },
  Mastervolt: {
    url: "https://www.mastervolt.com/support/warranty/",
    phone: "+31-20-342-2100",
    notes:
      "2-year standard warranty; up to 5 years on select lithium products. Registration required. Global dealer network for claims.",
  },
};

export interface SupportPortalInfo {
  manualsUrl: string;
  partsUrl?: string;
  techSupportUrl?: string;
  videosUrl?: string;
  notes?: string;
}

/** Service manual, parts lookup, and tech support portals for major marine manufacturers */
export const supportPortals: Record<string, SupportPortalInfo> = {
  Mercury: {
    manualsUrl: "https://www.mercurymarine.com/en/us/support/library/",
    partsUrl: "https://www.mercurymarine.com/en/us/parts/",
    techSupportUrl: "https://www.mercurymarine.com/en/us/support/",
    videosUrl: "https://www.youtube.com/@MercuryMarine",
    notes: "Owner's manuals, service bulletins, and rigging guides available. Create a Mercury account for full access.",
  },
  Yamaha: {
    manualsUrl: "https://www.yamahaoutboards.com/en-us/owner-resources/manuals",
    partsUrl: "https://www.yamahaoutboards.com/en-us/owner-resources/parts-catalog",
    techSupportUrl: "https://www.yamahaoutboards.com/en-us/owner-resources",
    videosUrl: "https://www.youtube.com/@YamahaOutboards",
    notes: "Owner's manuals and maintenance schedules. Enter model and serial number for specific documentation.",
  },
  Suzuki: {
    manualsUrl: "https://www.suzukimarine.com/en-us/support/owners-manuals",
    partsUrl: "https://www.suzukimarine.com/en-us/support/parts",
    techSupportUrl: "https://www.suzukimarine.com/en-us/support",
    notes: "Download owner's manuals by model year. Parts lookup requires dealer assistance.",
  },
  Honda: {
    manualsUrl: "https://marine.honda.com/support/owners-manuals",
    partsUrl: "https://marine.honda.com/support/parts",
    techSupportUrl: "https://marine.honda.com/support",
    notes: "Owner's manuals and maintenance schedules available by model.",
  },
  "Volvo Penta": {
    manualsUrl: "https://www.volvopenta.com/marineleisure/support/manuals-and-handbooks/",
    partsUrl: "https://marinparts.volvopenta.com/",
    techSupportUrl: "https://www.volvopenta.com/marineleisure/support/",
    notes: "EPC parts catalog available online. Service protocols require dealer login.",
  },
  Garmin: {
    manualsUrl: "https://support.garmin.com/en-US/?productType=marine",
    partsUrl: "https://www.garmin.com/en-US/marine-accessories/",
    techSupportUrl: "https://support.garmin.com/en-US/",
    videosUrl: "https://www.youtube.com/@GarminMarine",
    notes: "Software updates, owner's manuals, and quick-start guides available by product.",
  },
  Raymarine: {
    manualsUrl: "https://www.raymarine.com/en-us/support/product-support",
    techSupportUrl: "https://www.raymarine.com/en-us/support",
    videosUrl: "https://www.youtube.com/@RaymarineInc",
    notes: "Download manuals, software updates, and access knowledge base articles.",
  },
  Simrad: {
    manualsUrl: "https://www.simrad-yachting.com/support/downloads/",
    techSupportUrl: "https://www.simrad-yachting.com/support/",
    videosUrl: "https://www.youtube.com/@SimradYachting",
    notes: "Software updates, installation manuals, and user guides. Part of Navico group.",
  },
  Furuno: {
    manualsUrl: "https://www.furunousa.com/en/support/manuals-datasheets",
    techSupportUrl: "https://www.furunousa.com/en/support",
    notes: "Installation and operator's manuals. Technical support available via phone during business hours.",
  },
  Humminbird: {
    manualsUrl: "https://www.humminbird.com/support",
    techSupportUrl: "https://www.humminbird.com/support",
    videosUrl: "https://www.youtube.com/@HumminbirdElectronics",
    notes: "Software updates, manuals, and installation guides available by model.",
  },
  Lowrance: {
    manualsUrl: "https://www.lowrance.com/support/downloads/",
    techSupportUrl: "https://www.lowrance.com/support/",
    videosUrl: "https://www.youtube.com/@Lowrance",
    notes: "Software updates, quick-start guides, and full manuals. Part of Navico group.",
  },
  Dometic: {
    manualsUrl: "https://www.dometic.com/en-us/support/manuals-and-documents",
    techSupportUrl: "https://www.dometic.com/en-us/support",
    notes: "Product manuals for HVAC, refrigeration, sanitation, and other marine systems.",
  },
  "Minn Kota": {
    manualsUrl: "https://www.minnkota.com/support",
    techSupportUrl: "https://www.minnkota.com/support",
    notes: "Owner's manuals, parts diagrams, and software updates for trolling motors.",
  },
  Kohler: {
    manualsUrl: "https://kohlerpower.com/en/marine/support/documentation",
    partsUrl: "https://kohlerpower.com/en/marine/support/parts",
    techSupportUrl: "https://kohlerpower.com/en/marine/support",
    notes: "Generator manuals, wiring diagrams, and parts catalogs. Dealer locator available.",
  },
  Victron: {
    manualsUrl: "https://www.victronenergy.com/support-and-downloads/technical-information",
    techSupportUrl: "https://www.victronenergy.com/support-and-downloads/software",
    notes: "Comprehensive technical documentation, wiring diagrams, and firmware updates.",
  },
  Fusion: {
    manualsUrl: "https://www.fusionentertainment.com/en-US/support/",
    techSupportUrl: "https://www.fusionentertainment.com/en-US/support/",
    notes: "Product manuals and software updates. Owned by Garmin.",
  },
  ProMariner: {
    manualsUrl: "https://promariner.com/support/",
    techSupportUrl: "https://promariner.com/support/",
    notes: "Owner's manuals, installation guides, and troubleshooting for battery chargers and inverters.",
  },
  Mastervolt: {
    manualsUrl: "https://www.mastervolt.com/support/downloads/",
    techSupportUrl: "https://www.mastervolt.com/support/",
    notes: "Product documentation, software updates, and system configuration guides.",
  },
  Cummins: {
    manualsUrl: "https://www.cummins.com/support/documentation",
    partsUrl: "https://parts.cummins.com/",
    techSupportUrl: "https://www.cummins.com/support",
    notes: "Owner's manuals and service bulletins. QuickServe Online for detailed technical data.",
  },
};

export interface RecallInfo {
  id: string;
  manufacturer: string;
  affectedModels: string[];   // model name patterns
  issueDate: string;          // ISO date
  title: string;
  description: string;
  severity: "safety" | "performance" | "advisory";
  actionRequired: string;
  moreInfoUrl?: string;
}

/** Known marine equipment recalls — checked against registered equipment */
export const recallDatabase: RecallInfo[] = [
  {
    id: "RCL-MERC-2024-001",
    manufacturer: "Mercury",
    affectedModels: ["Verado 250", "Verado 300", "Verado 350", "Verado 400"],
    issueDate: "2024-11-15",
    title: "Fuel Rail Pressure Sensor Connector",
    description: "Certain Verado outboard engines may have a fuel rail pressure sensor connector that could loosen over time, potentially causing intermittent engine performance issues.",
    severity: "performance",
    actionRequired: "Contact your authorized Mercury dealer to inspect and secure the fuel rail pressure sensor connector. Repair performed at no cost under recall.",
    moreInfoUrl: "https://www.mercurymarine.com/en/us/support/recalls/",
  },
  {
    id: "RCL-SIM-2025-001",
    manufacturer: "Simrad",
    affectedModels: ["NSX 3009", "NSX 3012", "NSX 3015"],
    issueDate: "2025-06-10",
    title: "Software Update — Chart Rendering Fix",
    description: "NSX series units manufactured before June 2025 may experience intermittent chart rendering delays when using C-MAP cartography in certain coastal areas.",
    severity: "advisory",
    actionRequired: "Download and install firmware version 2.1.4 or later from Simrad's website. No dealer visit required.",
    moreInfoUrl: "https://www.simrad-yachting.com/support/downloads/",
  },
  {
    id: "RCL-PROM-2024-002",
    manufacturer: "ProMariner",
    affectedModels: ["ProTournament 360 Elite", "ProTournament 240 Elite"],
    issueDate: "2024-08-22",
    title: "Thermal Protection Circuit Update",
    description: "Certain ProTournament Elite chargers manufactured between January 2022 and March 2023 may have a thermal protection circuit that triggers prematurely in high ambient temperature conditions common in southern marine environments.",
    severity: "performance",
    actionRequired: "Contact ProMariner support for a free replacement thermal sensor module. Installation can be performed by owner — instructions included with replacement part.",
    moreInfoUrl: "https://promariner.com/support/",
  },
  {
    id: "RCL-GAR-2025-001",
    manufacturer: "Garmin",
    affectedModels: ["GPSMAP 8616xsv", "GPSMAP 8622", "GPSMAP 9x3"],
    issueDate: "2025-03-01",
    title: "Touchscreen Calibration — Cold Weather",
    description: "Select GPSMAP units may experience reduced touchscreen responsiveness when ambient temperature drops below 40°F (4°C).",
    severity: "advisory",
    actionRequired: "Software update v34.10 resolves the issue. Available via Garmin Express or Wi-Fi update on the unit.",
    moreInfoUrl: "https://support.garmin.com/en-US/",
  },
  {
    id: "RCL-MERC-2025-002",
    manufacturer: "Mercury",
    affectedModels: ["Verado 200", "Verado 250", "Verado 300"],
    issueDate: "2025-09-05",
    title: "Cowling Latch Inspection",
    description: "Mercury has identified that certain Verado models manufactured 2019-2021 may have cowling latches that do not fully engage, which could allow the cowling to open unexpectedly at speed.",
    severity: "safety",
    actionRequired: "Inspect cowling latches immediately. Contact your authorized Mercury dealer for free replacement latches if affected. Do not operate at high speed until inspected.",
    moreInfoUrl: "https://www.mercurymarine.com/en/us/support/recalls/",
  },
];

/**
 * Check registered equipment against recall database.
 * Returns matching recalls for a given manufacturer and model.
 */
export function getRecallsForEquipment(manufacturer: string, model: string): RecallInfo[] {
  return recallDatabase.filter(
    (r) =>
      r.manufacturer.toLowerCase() === manufacturer.toLowerCase() &&
      r.affectedModels.some((m) => model.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(model.toLowerCase()))
  );
}

/**
 * Look up support portal info for a manufacturer, if available.
 */
export function getSupportPortal(manufacturer: string): SupportPortalInfo | undefined {
  return supportPortals[manufacturer];
}

/**
 * Look up all manufacturers for a given equipment category.
 */
export function getManufacturersForCategory(
  category: EquipmentCategory,
): string[] {
  return equipmentManufacturers[category] ?? [];
}

/**
 * Look up common models for a given manufacturer.
 * Returns an empty array if no models are catalogued.
 */
export function getModelsForManufacturer(manufacturer: string): string[] {
  return commonModels[manufacturer] ?? [];
}

/**
 * Look up warranty portal info for a manufacturer, if available.
 */
export function getWarrantyPortal(
  manufacturer: string,
): WarrantyPortalInfo | undefined {
  return warrantyPortals[manufacturer];
}
