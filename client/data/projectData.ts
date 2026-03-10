export interface BidMessage {
  from: "vendor" | "user";
  text: string;
  time: string;
  // Quote proposal fields (only present when type === "quote")
  type?: "quote";
  quoteId?: string;
  quoteTitle?: string;
  quotePrice?: number;
  quoteDescription?: string;
}

export interface Bid {
  id: string;
  vendorName: string;
  vendorInitials: string;
  rating: number;
  reviewCount: number;
  message: string;
  price: number;
  lineItems?: { description: string; quantity: number; unitPrice: number }[];
  submittedDate: string;
  expiryDate: string;
  thread: BidMessage[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ProjectBoat {
  name: string;
  make: string;
  model: string;
  year: string;
  propulsion: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
  date: string;
  location?: string;
  category?: string;
  boat?: ProjectBoat;
  bids: Bid[];
  chosenBidId?: string;
  photos?: string[];
  invoice?: {
    invoiceNumber: string;
    issuedDate: string;
    paidDate: string;
    items: InvoiceItem[];
  };
}

export interface VendorPastProject {
  title: string;
  boatInfo: string;
  engineInfo: string;
  completedDate: string;
  review: {
    stars: number;
    comment: string;
    reviewer: string;
  };
}

export const VENDOR_PAST_PROJECTS: Record<string, VendorPastProject[]> = {
  "MarineMax Service Center": [
    {
      title: "Annual Engine Service & Tune-Up",
      boatInfo: "2021 Grady-White Canyon 271",
      engineInfo: "Twin Yamaha F200F",
      completedDate: "Nov 2025",
      review: { stars: 5, comment: "Incredibly thorough — they caught a cracked impeller housing before it became a real problem. Written health report was a nice touch.", reviewer: "James T." },
    },
    {
      title: "Winterization & Storage Prep",
      boatInfo: "2019 Boston Whaler 270 Dauntless",
      engineInfo: "Twin Mercury FourStroke 200",
      completedDate: "Oct 2025",
      review: { stars: 5, comment: "Had the boat wrapped and stored same week. Great communication throughout.", reviewer: "Linda M." },
    },
    {
      title: "Impeller Replacement & Gear Lube",
      boatInfo: "2018 Sea Ray 260 Sundeck",
      engineInfo: "Twin Mercury FourStroke 150",
      completedDate: "Jun 2025",
      review: { stars: 4, comment: "Solid work and fair price. Took a day longer than expected but quality was good.", reviewer: "Rob K." },
    },
  ],
  "Captain's Choice Marine": [
    {
      title: "Full Annual Service & Gear Lube",
      boatInfo: "2020 Mako 234 CC",
      engineInfo: "Twin Yamaha F150XB",
      completedDate: "Jan 2026",
      review: { stars: 4, comment: "Good value for what was done. Showed up on time and left the boat clean.", reviewer: "Mike D." },
    },
    {
      title: "Spark Plug & Fuel System Service",
      boatInfo: "2022 Robalo R200",
      engineInfo: "Single Mercury FourStroke 150",
      completedDate: "Sep 2025",
      review: { stars: 5, comment: "Fast, professional, and priced right. My go-to shop for routine service now.", reviewer: "Sara L." },
    },
  ],
  "Saltwater Pros LLC": [
    {
      title: "Triple Engine Annual Service",
      boatInfo: "2021 Regulator 41",
      engineInfo: "Triple Yamaha F350C",
      completedDate: "Dec 2025",
      review: { stars: 5, comment: "Managing three engines is no small feat — these guys handled it perfectly. 90-day warranty gave me real peace of mind.", reviewer: "Carlos R." },
    },
    {
      title: "Zinc & Impeller Package",
      boatInfo: "2020 Boston Whaler 380 Realm",
      engineInfo: "Twin Mercury Verado 400",
      completedDate: "Aug 2025",
      review: { stars: 5, comment: "Super knowledgeable on Verados. Finished ahead of schedule and walked me through everything they did.", reviewer: "Pat N." },
    },
    {
      title: "Full Service — Oil, Plugs & Inspection",
      boatInfo: "2019 Contender 39 ST",
      engineInfo: "Twin Mercury Verado 300",
      completedDate: "May 2025",
      review: { stars: 5, comment: "Best marine mechanic I've used. Detailed report, honest recommendations, no upselling.", reviewer: "Tom W." },
    },
  ],
  "Blue Water Detailing": [
    {
      title: "Full Hull Detail & Ceramic Coat",
      boatInfo: "2022 Sea Ray SLX 310",
      engineInfo: "Twin MerCruiser 6.2L Alpha",
      completedDate: "Feb 2026",
      review: { stars: 5, comment: "Boat looks like it came off the showroom floor. The ceramic coat is holding up beautifully two months later.", reviewer: "Alison F." },
    },
    {
      title: "Oxidation Removal & Marine Wax",
      boatInfo: "2020 Chaparral 267 SSX",
      engineInfo: "Twin MerCruiser 4.5L Alpha",
      completedDate: "Oct 2025",
      review: { stars: 5, comment: "Heavy oxidation on the hull — they brought it completely back. Impressed by the before/after difference.", reviewer: "George B." },
    },
    {
      title: "Compound & Polish",
      boatInfo: "2019 Cobalt A29",
      engineInfo: "Twin Volvo D4-270",
      completedDate: "Jul 2025",
      review: { stars: 4, comment: "Excellent polish work. Took a bit longer than quoted but end result was great.", reviewer: "Chris V." },
    },
  ],
  "Dockside Shine": [
    {
      title: "Spring Detail Package",
      boatInfo: "2021 Four Winns H2 OB",
      engineInfo: "Twin Yamaha F150XB",
      completedDate: "Mar 2026",
      review: { stars: 4, comment: "Good work, reasonable price. Showed up on time and finished same day.", reviewer: "Amy S." },
    },
    {
      title: "Wax & Interior Clean",
      boatInfo: "2020 Glastron GT 245",
      engineInfo: "Twin Mercury FourStroke 200",
      completedDate: "Sep 2025",
      review: { stars: 4, comment: "Boat looked great for the weekend. Nothing fancy but got the job done well.", reviewer: "Brian O." },
    },
  ],
  "Pro Marine Detail": [
    {
      title: "3-Stage Hull Restoration",
      boatInfo: "2020 Sea Ray 350 SLX",
      engineInfo: "Twin MerCruiser 6.2L Alpha",
      completedDate: "Jan 2026",
      review: { stars: 5, comment: "Absolutely stunning result. They removed years of oxidation and the hull is mirror-smooth. Worth every penny.", reviewer: "Kevin H." },
    },
    {
      title: "Ceramic Coat Application",
      boatInfo: "2022 Malibu 23 LSV",
      engineInfo: "Single Ilmor 6.0L",
      completedDate: "Nov 2025",
      review: { stars: 5, comment: "Meticulous attention to detail. The UV coating they applied looks incredible and repels water like nothing I've seen.", reviewer: "Rachel P." },
    },
    {
      title: "Full Detail & Teak Restoration",
      boatInfo: "2019 Grady-White Freedom 307",
      engineInfo: "Twin Yamaha F250D",
      completedDate: "Jun 2025",
      review: { stars: 5, comment: "They restored teak that I thought was too far gone. Exceptional craftsmanship across the whole job.", reviewer: "Dan C." },
    },
  ],
  "Harbor Gloss": [
    {
      title: "Single-Day Full Detail",
      boatInfo: "2022 Bayliner VR5",
      engineInfo: "Single Mercury FourStroke 115",
      completedDate: "Feb 2026",
      review: { stars: 4, comment: "Fast turnaround — in and out the same day. Good result for a quick weekend clean-up detail.", reviewer: "Jess M." },
    },
    {
      title: "Polish & Wax Seal",
      boatInfo: "2020 Glastron GTS 215",
      engineInfo: "Single Mercury FourStroke 150",
      completedDate: "Aug 2025",
      review: { stars: 5, comment: "Friendly crew, transparent pricing, and the boat came back looking fantastic. Will use again.", reviewer: "Tony R." },
    },
  ],
  "Sea Shine Services": [
    {
      title: "CQuartz Ceramic Coat",
      boatInfo: "2021 Sea Ray SDX 250 OB",
      engineInfo: "Twin Yamaha F150XB",
      completedDate: "Dec 2025",
      review: { stars: 5, comment: "Two years in and the ceramic coat still beads water perfectly. Best investment I've made in the boat's exterior.", reviewer: "Mark L." },
    },
    {
      title: "IronX Decontamination & Full Detail",
      boatInfo: "2020 Cobalt A36",
      engineInfo: "Twin Volvo D4-300",
      completedDate: "Sep 2025",
      review: { stars: 5, comment: "The IronX treatment removed staining that I assumed was permanent. Boat looks new. Highly recommend.", reviewer: "Susan K." },
    },
    {
      title: "Clay Bar Treatment & Wax",
      boatInfo: "2019 Boston Whaler 330 Outrage",
      engineInfo: "Triple Mercury Verado 300",
      completedDate: "Apr 2025",
      review: { stars: 4, comment: "Thorough job on a large boat. Took two full days which was expected. Good communication throughout.", reviewer: "Phil A." },
    },
  ],
  "Marine Electronics Pro": [
    {
      title: "Simrad NSS16 evo3S Installation",
      boatInfo: "2021 Grady-White 307 Freedom",
      engineInfo: "Twin Yamaha F250D",
      completedDate: "Jan 2026",
      review: { stars: 5, comment: "Clean factory-quality install. NMEA integration was seamless and the walkthrough was genuinely helpful.", reviewer: "Scott J." },
    },
    {
      title: "NMEA 2000 Network Upgrade",
      boatInfo: "2020 Boston Whaler 330 Outrage",
      engineInfo: "Triple Mercury Verado 300",
      completedDate: "Oct 2025",
      review: { stars: 5, comment: "Completely modernized our nav network. Everything talks to everything now. Incredible work.", reviewer: "Nancy D." },
    },
    {
      title: "Autopilot & AIS Installation",
      boatInfo: "2022 Regulator 41",
      engineInfo: "Triple Yamaha F350C",
      completedDate: "Aug 2025",
      review: { stars: 5, comment: "Complex job done right. Autopilot calibration was spot-on and AIS is transmitting perfectly.", reviewer: "Frank B." },
    },
  ],
  "TechBoat Solutions": [
    {
      title: "Garmin ECHOMAP Chartplotter Install",
      boatInfo: "2020 Sea Ray SLX 260",
      engineInfo: "Twin Mercury FourStroke 200",
      completedDate: "Nov 2025",
      review: { stars: 4, comment: "Good clean install and fair pricing. Took a little longer than quoted but quality was solid.", reviewer: "Greg W." },
    },
    {
      title: "VHF Radio & AIS Transponder Install",
      boatInfo: "2021 Cobalt A40",
      engineInfo: "Twin Volvo D4-300",
      completedDate: "Jul 2025",
      review: { stars: 5, comment: "Neat wiring, properly tuned, and explained everything clearly. Great experience.", reviewer: "Donna H." },
    },
  ],
};

export const PROJECTS: Project[] = [
  {
    id: "captain-day",
    title: "Captain Needed for Day Trip",
    description: "Looking for a licensed USCG captain for a full-day outing — approx. 8 hrs. Departing Fort Lauderdale, destination TBD based on weather.",
    status: "gathering",
    date: "Mar 9, 2026",
    location: "Fort Lauderdale",
    category: "Captain / Charter",
    boat: { name: "Sea Escape", make: "Sea Ray", model: "SLX 280", year: "2022", propulsion: "Twin Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "c1",
        vendorName: "Capt. Mike Harrington",
        vendorInitials: "MH",
        rating: 4.9,
        reviewCount: 127,
        message:
          "Hi Dean! USCG-licensed Master (100-ton) with 12 years running boats out of Fort Lauderdale and Miami. I know the local waters well — inlets, reefs, and offshore runs — and can tailor the day to your group's interests, whether that's fishing, sightseeing, or cruising the Keys. I carry full liability insurance and a current OUPV/Master credential. My Sea Ray experience is a big plus here.",
        price: 650,
        submittedDate: "Mar 5, 2026",
        expiryDate: "Mar 20, 2026",
        thread: [
          { from: "vendor", text: "Hey Dean — happy to answer any questions about the itinerary or my background. I'm flexible on departure time and can adjust the route day-of based on conditions.", time: "Mar 6, 8:52 AM" },
        ],
      },
      {
        id: "c2",
        vendorName: "Capt. Sofia Reyes",
        vendorInitials: "SR",
        rating: 4.8,
        reviewCount: 83,
        message:
          "USCG-certified captain (Master 50-ton) with 8 years of charter experience out of the Lauderdale area. I specialize in day trips for private groups — offshore fishing, sandbar stops, and sunset cruises. Comfortable handling twin-engine boats and familiar with the Fort Lauderdale intracoastal and inlets. Fully insured and CPR/First Aid certified. I keep things relaxed and fun for the whole group.",
        price: 575,
        submittedDate: "Mar 6, 2026",
        expiryDate: "Mar 22, 2026",
        thread: [],
      },
      {
        id: "c3",
        vendorName: "Capt. Tyler Banks",
        vendorInitials: "TB",
        rating: 4.6,
        reviewCount: 34,
        message:
          "USCG OUPV (6-pack) license, 5 years running private charters out of Bahia Mar and Las Olas Marina. I grew up boating in South Florida and know the local spots well. Competitive rate for a full 8-hour day — includes a detailed pre-departure safety brief and all required safety equipment checks. I'm available the 9th and happy to discuss the route in advance.",
        price: 490,
        submittedDate: "Mar 7, 2026",
        expiryDate: "Mar 21, 2026",
        thread: [
          { from: "vendor", text: "Hi Dean, just checking in — I've got the 9th wide open and would love to take you and your crew out. Let me know if you'd like to chat!", time: "Mar 8, 10:15 AM" },
          { from: "user", text: "Thanks Tyler — do you have experience with Sea Rays specifically?", time: "Mar 8, 11:40 AM" },
          { from: "vendor", text: "Absolutely — I've run Sea Ray SLX and Sundancer models for two regular clients. Very comfortable with MerCruiser and sterndrive boats.", time: "Mar 8, 12:08 PM" },
        ],
      },
    ],
  },
  {
    id: "engine-maintenance",
    title: "Engine Maintenance Service",
    description: "Annual engine service and oil change needed for twin outboard motors",
    status: "bidding",
    date: "Feb 19, 2026",
    location: "Fort Lauderdale",
    category: "Engine Service",
    boat: { name: "Sea Escape", make: "Sea Ray", model: "SLX 280", year: "2022", propulsion: "Twin Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "b1",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message:
          "Hi Dean! We specialize in Mercury outboard service and can get you scheduled as early as next week. Our annual service includes a full multi-point inspection, oil & filter change, spark plugs, gear lube, impeller check, and a written engine health report.",
        price: 485,
        submittedDate: "Feb 20, 2026",
        expiryDate: "Mar 12, 2026",
        thread: [
          { from: "vendor", text: "Hi Dean! Just wanted to follow up on our bid. We have availability next week if you'd like to get scheduled.", time: "Feb 21, 10:14 AM" },
        ],
      },
      {
        id: "b2",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message:
          "We've been servicing outboard engines for over 15 years and are factory-trained on Mercury and Yamaha. Our annual package covers everything your motors need, plus a complimentary fuel system inspection at no extra charge.",
        price: 420,
        submittedDate: "Feb 20, 2026",
        expiryDate: "Mar 15, 2026",
        thread: [],
      },
      {
        id: "b3",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message:
          "Your twin outboards will receive a complete multi-point inspection, oil & filter change, spark plugs, zinc replacement, and gear lube service. We're factory-certified for Mercury, Yamaha, and Evinrude — fully insured with a 90-day workmanship warranty.",
        price: 520,
        submittedDate: "Feb 21, 2026",
        expiryDate: "Mar 18, 2026",
        thread: [
          { from: "vendor", text: "Hi Dean, we'd love to earn your business. Happy to match any comparable quote and still include the full 90-day warranty.", time: "Feb 22, 9:05 AM" },
          { from: "user", text: "Thanks — can you confirm the zinc replacement is included for both motors?", time: "Feb 22, 11:30 AM" },
          { from: "vendor", text: "Absolutely — zincs on both motors and the trim tabs are all included at no extra charge.", time: "Feb 22, 12:02 PM" },
        ],
      },
    ],
  },
  {
    id: "hull-detailing",
    title: "Hull Detailing & Waxing",
    description: "Full hull cleaning, buffing, and waxing to restore shine",
    status: "bidding",
    date: "Feb 17, 2026",
    location: "Fort Lauderdale",
    category: "Detailing",
    boat: { name: "Sea Escape", make: "Sea Ray", model: "SLX 280", year: "2022", propulsion: "Twin Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "b4",
        vendorName: "Blue Water Detailing",
        vendorInitials: "BW",
        rating: 4.7,
        reviewCount: 98,
        message:
          "Our full hull detail package includes clay bar treatment, compound, polish, and premium carnauba wax application. We use Meguiar's Marine Pro line exclusively. Typical turnaround is 1–2 days depending on hull size and oxidation level.",
        price: 650,
        submittedDate: "Feb 18, 2026",
        expiryDate: "Mar 10, 2026",
        thread: [],
      },
      {
        id: "b5",
        vendorName: "Dockside Shine",
        vendorInitials: "DS",
        rating: 4.3,
        reviewCount: 54,
        message:
          "Professional boat detailing with quality products. Our 3-step polish and seal process will have your hull looking brand new. Schedule is open next week and we offer a satisfaction guarantee on all work.",
        price: 580,
        submittedDate: "Feb 18, 2026",
        expiryDate: "Mar 11, 2026",
        thread: [],
      },
      {
        id: "b6",
        vendorName: "Pro Marine Detail",
        vendorInitials: "PM",
        rating: 4.9,
        reviewCount: 311,
        message:
          "Our 3-stage hull restoration removes heavy oxidation, restores gel coat color, and seals with UV-protective marine wax. Fully insured with a 6-month wax warranty. We've detailed over 800 boats at this marina — references available.",
        price: 720,
        submittedDate: "Feb 19, 2026",
        expiryDate: "Mar 14, 2026",
        thread: [
          { from: "vendor", text: "Hey Dean, just a heads up — our schedule is filling up fast for March. We'd love to get your hull booked in.", time: "Feb 20, 8:45 AM" },
        ],
      },
      {
        id: "b7",
        vendorName: "Harbor Gloss",
        vendorInitials: "HG",
        rating: 4.4,
        reviewCount: 72,
        message:
          "Quick turnaround with quality results — we can complete your full detail in a single day. Our pricing is straightforward with no hidden fees. Great value for owners who want their boat ready for the weekend.",
        price: 540,
        submittedDate: "Feb 19, 2026",
        expiryDate: "Mar 12, 2026",
        thread: [],
      },
      {
        id: "b8",
        vendorName: "Sea Shine Services",
        vendorInitials: "SS",
        rating: 4.6,
        reviewCount: 128,
        message:
          "Eight years detailing boats at this marina. I use IronX fallout remover and CarPro CQuartz ceramic coating for a finish that lasts up to 2 years — far superior to standard wax. Fully insured, references available on request.",
        price: 695,
        submittedDate: "Feb 20, 2026",
        expiryDate: "Mar 16, 2026",
        thread: [],
      },
    ],
  },
  {
    id: "bottom-paint",
    title: "Bottom Paint & Antifouling",
    description: "Antifouling paint application and light sanding before spring season",
    status: "expired",
    date: "Dec 3, 2025",
    location: "Fort Lauderdale",
    category: "Detailing",
    boat: { name: "Sea Escape", make: "Sea Ray", model: "SLX 280", year: "2022", propulsion: "Twin Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "b11",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "We can complete your bottom paint job in a single haul-out day. Includes pressure wash, light sanding, two coats of Sea Hawk Cukote, and waterline touch-up.",
        price: 890,
        submittedDate: "Dec 5, 2025",
        expiryDate: "Dec 19, 2025",
        thread: [],
      },
      {
        id: "b12",
        vendorName: "Blue Water Detailing",
        vendorInitials: "BW",
        rating: 4.7,
        reviewCount: 98,
        message: "Full bottom prep and antifouling service. We use Interlux Micron 66 for superior protection in South Florida waters. All work done in the water at your slip.",
        price: 760,
        submittedDate: "Dec 6, 2025",
        expiryDate: "Dec 20, 2025",
        thread: [],
      },
    ],
  },
  {
    id: "electronics-upgrade",
    title: "Electronics Upgrade",
    description: "Install new GPS/fishfinder combo unit and update navigation system",
    status: "completed",
    date: "Jan 14, 2026",
    location: "Fort Lauderdale",
    category: "Electronics",
    boat: { name: "Sea Escape", make: "Sea Ray", model: "SLX 280", year: "2022", propulsion: "Twin Mercury V8 300hp Outboard" },
    chosenBidId: "b9",
    bids: [
      {
        id: "b9",
        vendorName: "Marine Electronics Pro",
        vendorInitials: "ME",
        rating: 4.9,
        reviewCount: 203,
        message:
          "We'll install your Garmin GPSMAP 942xs Plus with clean wiring routed neatly through the console. Includes full transducer mounting, NMEA 2000 integration, calibration, and a walkthrough of every feature before you leave the dock.",
        price: 1850,
        submittedDate: "Dec 28, 2025",
        expiryDate: "Jan 18, 2026",
        thread: [
          { from: "vendor", text: "Dean, great working with you. Unit is installed and calibrated. Let me know if you have any questions as you get familiar with it!", time: "Jan 14, 4:30 PM" },
          { from: "user", text: "Looks great! Really clean install. Thanks.", time: "Jan 14, 5:10 PM" },
        ],
      },
      {
        id: "b10",
        vendorName: "TechBoat Solutions",
        vendorInitials: "TB",
        rating: 4.4,
        reviewCount: 66,
        message:
          "We can install the Garmin combo unit and handle full integration with your existing NMEA network. Pricing includes all hardware, labor, and a 90-day workmanship guarantee. Typical install takes 4–5 hours.",
        price: 2100,
        submittedDate: "Dec 29, 2025",
        expiryDate: "Jan 20, 2026",
        thread: [],
      },
    ],
    invoice: {
      invoiceNumber: "INV-2026-0047",
      issuedDate: "Jan 14, 2026",
      paidDate: "Jan 14, 2026",
      items: [
        { description: "Garmin GPSMAP 942xs Plus Combo Unit", quantity: 1, unitPrice: 1199 },
        { description: "Installation Labor", quantity: 4, unitPrice: 85 },
        { description: "Wiring Harness & Connector Kit", quantity: 1, unitPrice: 149 },
        { description: "Stainless Flush-Mount Bracket", quantity: 1, unitPrice: 82 },
        { description: "BlueChart Americas Chart Card", quantity: 1, unitPrice: 80 },
      ],
    },
  },

  // ─── 20 additional RFPs across 18 boats ────────────────────────────────────

  {
    id: "second-wind-engine-service",
    title: "Twin Yamaha F200 Annual Service",
    description: "Annual service needed for twin Yamaha F200XB outboards — oil & filter, gear lube, impeller check, spark plugs, zincs, and full multi-point inspection. Boat is on a lift at Bahia Mar Marina.",
    status: "bidding",
    date: "Mar 7, 2026",
    location: "Fort Lauderdale",
    category: "Engine Service",
    boat: { name: "Second Wind", make: "Grady-White", model: "Canyon 271", year: "2021", propulsion: "Twin Yamaha F200XB Outboard" },
    bids: [
      {
        id: "nb1",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "Factory-certified Yamaha technicians here. Full F200XB annual service on both engines — oil/filter, gear lube, spark plugs, impeller inspection, zincs, and a written engine health report. Can schedule as early as next week.",
        price: 520,
        submittedDate: "Mar 8, 2026",
        expiryDate: "Mar 22, 2026",
        thread: [],
      },
      {
        id: "nb2",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "Factory-trained on Yamaha F-series. Full annual service on both motors with a complimentary fuel system inspection included. We travel to Bahia Mar — no haul fee.",
        price: 465,
        submittedDate: "Mar 8, 2026",
        expiryDate: "Mar 21, 2026",
        thread: [
          { from: "vendor", text: "We can fit you in this Thursday if you're looking to get it done before the weekend.", time: "Mar 9, 9:00 AM" },
        ],
      },
      {
        id: "nb3",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "Complete annual service for both F200XBs — oil, plugs, gear lube, zincs, impeller, throttle & shift cable check, and written health report. 90-day workmanship warranty on all labor.",
        price: 555,
        submittedDate: "Mar 9, 2026",
        expiryDate: "Mar 24, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "second-wind-canvas",
    title: "T-Top Canvas & Side Curtain Replacement",
    description: "T-top canvas is faded and cracking along the rear seam. Need full replacement including the side curtains. Sunbrella preferred. Grady-White Canyon 271 at Pier 66 Marina.",
    status: "gathering",
    date: "Mar 8, 2026",
    location: "Fort Lauderdale",
    category: "Canvas & Upholstery",
    boat: { name: "Second Wind", make: "Grady-White", model: "Canyon 271", year: "2021", propulsion: "Twin Yamaha F200XB Outboard" },
    bids: [
      {
        id: "nb4",
        vendorName: "Coastal Canvas & Upholstery",
        vendorInitials: "CU",
        rating: 4.8,
        reviewCount: 76,
        message: "We specialize in marine canvas and do all fabrication in-house. Full T-top replacement in Sunbrella Solution-Dyed Acrylic with matching side curtains. We'll come to the boat for templates — typical lead time is 2 weeks.",
        price: 2200,
        submittedDate: "Mar 9, 2026",
        expiryDate: "Mar 30, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "blue-thunder-bottom-paint",
    title: "Bottom Paint & Antifouling Refresh",
    description: "Need bottom paint refresh before spring. Boat currently on the hard at Lauderdale Marine Center. Looking for haul-out coordination, light sanding, and 2 coats of antifouling. Prefer ablative or hard hybrid.",
    status: "gathering",
    date: "Mar 6, 2026",
    location: "Fort Lauderdale",
    category: "Detailing",
    boat: { name: "Blue Thunder", make: "Boston Whaler", model: "270 Dauntless", year: "2019", propulsion: "Twin Mercury FourStroke 150hp" },
    bids: [
      {
        id: "nb5",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "Full bottom prep at LMC — pressure wash, light wet sand, and 2 coats of Interlux Micron 66 ablative. Running gear polish and waterline cleanup included.",
        price: 1450,
        submittedDate: "Mar 7, 2026",
        expiryDate: "Mar 28, 2026",
        thread: [],
      },
      {
        id: "nb6",
        vendorName: "Blue Water Detailing",
        vendorInitials: "BW",
        rating: 4.7,
        reviewCount: 98,
        message: "Bottom paint specialists. We use Sea Hawk Cukote hard hybrid — excellent for South Florida waters. Can be on-site within the week, all work done at the LMC yard.",
        price: 1280,
        submittedDate: "Mar 8, 2026",
        expiryDate: "Mar 25, 2026",
        thread: [
          { from: "vendor", text: "Quick question — do you need the running gear polished as well, or just the bottom?", time: "Mar 8, 2:15 PM" },
        ],
      },
    ],
  },

  {
    id: "reel-therapy-engine-service",
    title: "Triple Yamaha F300 Annual Service",
    description: "Annual service on triple Yamaha F300B outboards. Full oil change, gear lube, impeller, zincs, and spark plugs across all three engines. Must be factory-certified Yamaha. Mako 334 CC at Harbour Towne Marina.",
    status: "bidding",
    date: "Mar 4, 2026",
    location: "Dania Beach",
    category: "Engine Service",
    boat: { name: "Reel Therapy", make: "Mako", model: "334 CC", year: "2023", propulsion: "Triple Yamaha F300B Outboard" },
    bids: [
      {
        id: "nb7",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "Triple-engine service is our specialty. All three F300Bs get complete annual treatment — oil, gear lube, plugs, zincs, impeller, trim tab zincs, and a per-engine written health report. Two techs on-site, done in a single day. 90-day warranty.",
        price: 1650,
        submittedDate: "Mar 5, 2026",
        expiryDate: "Mar 25, 2026",
        thread: [
          { from: "vendor", text: "We can have all three done in a single day with two techs on-site. Let us know when you'd like to schedule.", time: "Mar 6, 10:30 AM" },
        ],
      },
      {
        id: "nb8",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "Factory-certified Yamaha dealer service. Triple-engine annual package — identical treatment per engine: oil/filter, gear lube, spark plugs, impeller inspection, zincs. Written report for each.",
        price: 1800,
        submittedDate: "Mar 5, 2026",
        expiryDate: "Mar 22, 2026",
        thread: [],
      },
      {
        id: "nb9",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "Factory-trained Yamaha technicians. Competitive pricing on triple rigs. Full annual service on all three engines — no hidden fees. References from other triple-rigged offshore owners available.",
        price: 1480,
        submittedDate: "Mar 6, 2026",
        expiryDate: "Mar 23, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "reel-therapy-outriggers",
    title: "Outrigger & Teaser Bar Installation",
    description: "Need a rigger to install a pair of 18-ft carbon fiber outriggers and a center teaser bar. Mako 334 CC — all hardware is already on hand. Prefer someone with offshore rigging experience.",
    status: "gathering",
    date: "Mar 9, 2026",
    location: "Dania Beach",
    category: "Mechanical",
    boat: { name: "Reel Therapy", make: "Mako", model: "334 CC", year: "2023", propulsion: "Triple Yamaha F300B Outboard" },
    bids: [
      {
        id: "nb10",
        vendorName: "Offshore Rigging Solutions",
        vendorInitials: "OR",
        rating: 4.9,
        reviewCount: 58,
        message: "Outrigger installation is all we do — over 400 rigs installed in South Florida. We'll mount, angle, and tension the outriggers with stainless hardware, wire the release clips, and test under load. Typically a one-day job.",
        price: 875,
        submittedDate: "Mar 9, 2026",
        expiryDate: "Mar 30, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "aquaholic-electronics",
    title: "Garmin Chartplotter & VHF Upgrade",
    description: "Upgrading from factory gauges to a Garmin GPSMAP 1243xsv and adding a Standard Horizon GX2200 AIS/VHF. Console has room for a 12-inch flush mount. Chaparral 267 SSX at Suntex Marina.",
    status: "bidding",
    date: "Mar 2, 2026",
    location: "Fort Lauderdale",
    category: "Electronics",
    boat: { name: "Aquaholic", make: "Chaparral", model: "267 SSX", year: "2020", propulsion: "Twin MerCruiser 6.2L Alpha One" },
    bids: [
      {
        id: "nb11",
        vendorName: "Marine Electronics Pro",
        vendorInitials: "ME",
        rating: 4.9,
        reviewCount: 203,
        message: "Factory-authorized Garmin installer. Full flush-mount of the 1243xsv, NMEA 2000 backbone, VHF co-install, antenna run to hardtop, transducer mount and calibration. Clean factory-quality wiring.",
        price: 2150,
        submittedDate: "Mar 3, 2026",
        expiryDate: "Mar 20, 2026",
        thread: [
          { from: "vendor", text: "We've done a couple of 267 SSX installs — the console has great real estate for the 12-inch. Will look sharp.", time: "Mar 4, 11:00 AM" },
        ],
      },
      {
        id: "nb12",
        vendorName: "TechBoat Solutions",
        vendorInitials: "TB",
        rating: 4.4,
        reviewCount: 66,
        message: "Clean installs at competitive prices. GPSMAP 1243xsv flush mount, VHF co-install, full wiring and antenna routing. 90-day labor warranty.",
        price: 1875,
        submittedDate: "Mar 4, 2026",
        expiryDate: "Mar 21, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "knot-guilty-teak",
    title: "Cockpit Teak Deck Restoration",
    description: "Teak cockpit sole and gunnel trim are weathered and grey. Need a full strip, sand, and oil treatment. DO NOT want it sealed or varnished — natural teak oil finish only. Regulator 31 at Bahia Mar Marina.",
    status: "gathering",
    date: "Mar 5, 2026",
    location: "Fort Lauderdale",
    category: "Detailing",
    boat: { name: "Knot Guilty", make: "Regulator", model: "31", year: "2022", propulsion: "Twin Mercury V10 450R Outboard" },
    bids: [
      {
        id: "nb13",
        vendorName: "Pro Marine Detail",
        vendorInitials: "PM",
        rating: 4.9,
        reviewCount: 311,
        message: "Teak restoration is one of our signature services. Full strip with two-part teak cleaner, light hand sanding, and 2 coats of Semco Natural Teak Oil. We respect drying time between coats — the result is stunning.",
        price: 1100,
        submittedDate: "Mar 6, 2026",
        expiryDate: "Mar 28, 2026",
        thread: [],
      },
      {
        id: "nb14",
        vendorName: "Sea Shine Services",
        vendorInitials: "SS",
        rating: 4.6,
        reviewCount: 128,
        message: "Two-part teak cleaner, 120-grit hand sand, and Deks Olje D1 oil finish. Beautiful natural result and we only use oil finishes when that's what the owner wants — no upselling to varnish.",
        price: 950,
        submittedDate: "Mar 7, 2026",
        expiryDate: "Mar 25, 2026",
        thread: [
          { from: "vendor", text: "Happy to use Semco if you prefer it over Deks Olje — both are great. We have experience with both.", time: "Mar 8, 8:30 AM" },
        ],
      },
    ],
  },

  {
    id: "vitamin-sea-livewell",
    title: "Livewell & Baitwell System Overhaul",
    description: "Both livewells running weak — pumps struggling and salt buildup in the lines. Looking for full pump replacement, line flush, and inspection. Sea Hunt Gamefish 35 with three livewell circuits.",
    status: "bidding",
    date: "Feb 28, 2026",
    location: "Pompano Beach",
    category: "Mechanical",
    boat: { name: "Vitamin Sea", make: "Sea Hunt", model: "Gamefish 35", year: "2021", propulsion: "Triple Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "nb15",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "We handle livewell systems on offshore boats regularly. Full pump replacement (Rule 1500 or equivalent), line flush with descaler, check valve inspection, and wiring check. Three circuits is a half-day job.",
        price: 680,
        submittedDate: "Mar 1, 2026",
        expiryDate: "Mar 18, 2026",
        thread: [],
      },
      {
        id: "nb16",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "Full livewell overhaul — pull all three pump assemblies, flush and de-scale lines, inspect check valves, replace impellers showing wear, reinstall with new clamps. 90-day warranty on all work.",
        price: 790,
        submittedDate: "Mar 2, 2026",
        expiryDate: "Mar 20, 2026",
        thread: [
          { from: "vendor", text: "Quick question — are the pumps in-hull or transom-mounted? Helps us with the quote.", time: "Mar 3, 9:45 AM" },
        ],
      },
    ],
  },

  {
    id: "salt-shaker-generator",
    title: "Generator Service & Raw Water Pump",
    description: "8kW Westerbeke generator is running but producing low output and raw water exhaust is spotty. Suspect impeller and possibly the raw water pump. Contender 39 ST at Suntex Deerfield — Westerbeke-certified only.",
    status: "gathering",
    date: "Mar 3, 2026",
    location: "Deerfield Beach",
    category: "Mechanical",
    boat: { name: "Salt Shaker", make: "Contender", model: "39 ST", year: "2018", propulsion: "Twin Mercury Verado 400" },
    bids: [
      {
        id: "nb17",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "Westerbeke-certified service team. Full gen-set inspection: impeller, raw water pump, heat exchanger, oil and filter, zincs, and load test. Low output is often a pump or exciter issue — we'll diagnose and fix right the first time.",
        price: 920,
        submittedDate: "Mar 4, 2026",
        expiryDate: "Mar 25, 2026",
        thread: [],
      },
      {
        id: "nb18",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "We service Westerbeke and Northern Lights generators regularly. Full impeller replacement, raw water pump rebuild or swap, oil change, load test, and output check. Flat-rate diagnosis included.",
        price: 795,
        submittedDate: "Mar 5, 2026",
        expiryDate: "Mar 22, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "current-obsession-zincs",
    title: "Underwater Zinc Replacement & Hull Inspection",
    description: "Annual zinc replacement — hull, shaft, trim tabs, and running gear. Would also like a hull inspection while in the water. Pursuit OS 355 at Pier 66 Marina.",
    status: "bidding",
    date: "Mar 1, 2026",
    location: "Fort Lauderdale",
    category: "Engine Service",
    boat: { name: "Current Obsession", make: "Pursuit", model: "OS 355", year: "2022", propulsion: "Triple Yamaha F350B Outboard" },
    bids: [
      {
        id: "nb19",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "Full zinc replacement in-water — hull, shaft, and trim tab zincs. Diver will also perform a visual hull inspection with photos documenting any gel coat issues. Same-day turnaround.",
        price: 380,
        submittedDate: "Mar 2, 2026",
        expiryDate: "Mar 18, 2026",
        thread: [],
      },
      {
        id: "nb20",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "In-water zinc replacement and hull inspection. MilSpec zincs on all surfaces, photo hull report, same-day availability. Pier 66 is in our regular service zone.",
        price: 320,
        submittedDate: "Mar 3, 2026",
        expiryDate: "Mar 17, 2026",
        thread: [
          { from: "vendor", text: "Happy to check the props and shafts while we're under there at no extra charge — just say the word.", time: "Mar 4, 7:55 AM" },
        ],
      },
      {
        id: "nb21",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "Full zinc service in-water at your slip. All MilSpec zinc alloy torqued to spec. Hull inspection photos and written report included.",
        price: 410,
        submittedDate: "Mar 4, 2026",
        expiryDate: "Mar 20, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "liquid-assets-upholstery",
    title: "Full Cockpit & Bow Reupholstery",
    description: "All cockpit seating, leaning post, and bow cushions need replacement — vinyl is sun-cracked and peeling. Scout 420 LXF at Harbour Towne Marina. Looking for UV-resistant marine vinyl or Sunbrella Marine.",
    status: "gathering",
    date: "Mar 7, 2026",
    location: "Dania Beach",
    category: "Canvas & Upholstery",
    boat: { name: "Liquid Assets", make: "Scout", model: "420 LXF", year: "2020", propulsion: "Quad Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "nb22",
        vendorName: "Coastal Canvas & Upholstery",
        vendorInitials: "CU",
        rating: 4.8,
        reviewCount: 76,
        message: "Full marine reupholstery refit — we'll template all existing pieces, fabricate in-shop using Naugahyde Marine vinyl (UV/mildew-resistant), and install. Scout 420 is a substantial project: approximately 2 weeks fabrication plus 1 day install.",
        price: 6800,
        submittedDate: "Mar 8, 2026",
        expiryDate: "Apr 1, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "salty-paws-fuel",
    title: "Fuel System Service & Filter Replacement",
    description: "Noticing hesitation at mid-throttle on all three engines — suspect fuel filter issue or phase separation from ethanol. Need full fuel system service: filters, water separators, and tank inspection. Yellowfin 36 Offshore.",
    status: "bidding",
    date: "Feb 25, 2026",
    location: "Miami",
    category: "Engine Service",
    boat: { name: "Salty Paws", make: "Yellowfin", model: "36 Offshore", year: "2019", propulsion: "Triple Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "nb23",
        vendorName: "Saltwater Pros LLC",
        vendorInitials: "SP",
        rating: 4.9,
        reviewCount: 215,
        message: "Full fuel system service — primary and secondary filter replacements, water separator swaps, VST screen inspection, fuel line check, and StarTron enzyme treatment for all tanks. Road-test to verify throttle response. 90-day warranty.",
        price: 975,
        submittedDate: "Feb 26, 2026",
        expiryDate: "Mar 15, 2026",
        thread: [
          { from: "vendor", text: "How many hours are on the current filters? Triple rigs running offshore can clog filters faster than people expect.", time: "Feb 27, 10:05 AM" },
        ],
      },
      {
        id: "nb24",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "All three primary and secondary filter changes, water separator swaps, tank pick-up tube inspection. We carry the correct Mercury OEM filters in stock and can schedule quickly.",
        price: 840,
        submittedDate: "Feb 27, 2026",
        expiryDate: "Mar 14, 2026",
        thread: [],
      },
      {
        id: "nb25",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "Certified Mercury technicians. Full fuel system diagnosis, filter and separator replacement, tank treatment, and throttle body inspection. Hesitation at mid-throttle can also be a VST screen issue — we'll check everything.",
        price: 1100,
        submittedDate: "Feb 28, 2026",
        expiryDate: "Mar 16, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "no-worries-ips",
    title: "Volvo IPS Drive Service & Alignment",
    description: "Annual IPS 600 service needed on both pods — gear oil, bellows inspection, shaft seal check, trim actuator check, and alignment verification. Cobalt A36 at Bahia Mar Marina. Volvo-certified techs only.",
    status: "gathering",
    date: "Mar 6, 2026",
    location: "Fort Lauderdale",
    category: "Engine Service",
    boat: { name: "No Worries", make: "Cobalt", model: "A36", year: "2021", propulsion: "Twin Volvo IPS 600" },
    bids: [
      {
        id: "nb26",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "Volvo Penta certified for IPS service. Full annual IPS 600 service on both pods: gear oil, bellows and CV boot inspection, shaft seal check, trim actuator check, and alignment verification. Written report per pod.",
        price: 1680,
        submittedDate: "Mar 7, 2026",
        expiryDate: "Mar 28, 2026",
        thread: [],
      },
      {
        id: "nb27",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "Volvo IPS-trained technicians. Annual pod service — gear oil flush, bellows, shaft seal, and full system check. Competitive pricing on IPS work. Can schedule within the week.",
        price: 1450,
        submittedDate: "Mar 8, 2026",
        expiryDate: "Mar 25, 2026",
        thread: [
          { from: "vendor", text: "How many hours are on both pods? Helps us determine if thrust bearing inspection is warranted.", time: "Mar 9, 8:20 AM" },
        ],
      },
    ],
  },

  {
    id: "wave-chaser-gelcoat",
    title: "Gel Coat Repair — Port Side Dock Rash",
    description: "Dock rash on port side near the bow — three areas ranging from light scratches to a 4-inch gouge that needs filling. Need color-matched gel coat repair. Four Winns H290 at Suntex Marina.",
    status: "bidding",
    date: "Mar 5, 2026",
    location: "Pompano Beach",
    category: "Detailing",
    boat: { name: "Wave Chaser", make: "Four Winns", model: "H290", year: "2020", propulsion: "Twin Mercury FourStroke 200hp" },
    bids: [
      {
        id: "nb28",
        vendorName: "Pro Marine Detail",
        vendorInitials: "PM",
        rating: 4.9,
        reviewCount: 311,
        message: "Gel coat repair and color matching is one of our core services. Spectrum color match, fill and cure the gouge, wet sand through grits, and polish to blend invisibly. A photo of the hull would help us give a precise quote.",
        price: 480,
        submittedDate: "Mar 6, 2026",
        expiryDate: "Mar 22, 2026",
        thread: [],
      },
      {
        id: "nb29",
        vendorName: "Sea Shine Services",
        vendorInitials: "SS",
        rating: 4.6,
        reviewCount: 128,
        message: "Spectrophotometer color match — we don't guess. Fill, cure, sand, and polish. The 4-inch gouge is the main labor item; the smaller scratches are quick. Typical turnaround is one day.",
        price: 420,
        submittedDate: "Mar 7, 2026",
        expiryDate: "Mar 21, 2026",
        thread: [
          { from: "vendor", text: "Can you send a couple of photos? Helps us confirm the depth of the larger gouge and finalize the quote.", time: "Mar 8, 1:30 PM" },
        ],
      },
      {
        id: "nb30",
        vendorName: "Harbor Gloss",
        vendorInitials: "HG",
        rating: 4.4,
        reviewCount: 72,
        message: "Quick turnaround gel coat repair — color match, fill, cure, and polish. All three areas knocked out in a single day visit. Fair pricing, no surprises.",
        price: 375,
        submittedDate: "Mar 7, 2026",
        expiryDate: "Mar 20, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "serenity-now-electronics",
    title: "Full Helm Electronics Build-Out",
    description: "Replacing the entire helm — dual Simrad NSS16 evo3S, AIS/VHF, autopilot, and bow thruster controls. Existing wiring to be cleaned up. Fountain 38 CC at Pier 66 Marina.",
    status: "in-progress",
    date: "Feb 20, 2026",
    location: "Fort Lauderdale",
    category: "Electronics",
    boat: { name: "Serenity Now", make: "Fountain", model: "38 CC Express", year: "2022", propulsion: "Triple Mercury V8 300hp Outboard" },
    chosenBidId: "nb31",
    bids: [
      {
        id: "nb31",
        vendorName: "Marine Electronics Pro",
        vendorInitials: "ME",
        rating: 4.9,
        reviewCount: 203,
        message: "Full helm build-out is our specialty. Dual NSS16 evo3S flush-mounted side-by-side, NMEA 2000 backbone, SimNet integration, GX2200 AIS/VHF, AP70 MK2 autopilot, Lewmar bow thruster controls, and a full wiring cleanup. Estimated 3-day install.",
        price: 8900,
        lineItems: [
          { description: "Simrad NSS16 evo3S Chartplotter (x2)", quantity: 2, unitPrice: 1799 },
          { description: "NMEA 2000 Backbone & Network Kit", quantity: 1, unitPrice: 320 },
          { description: "Standard Horizon GX2200 AIS/VHF", quantity: 1, unitPrice: 599 },
          { description: "Simrad AP70 MK2 Autopilot System", quantity: 1, unitPrice: 1750 },
          { description: "Lewmar Bow Thruster Control Panel", quantity: 1, unitPrice: 420 },
          { description: "Installation Labor", quantity: 18, unitPrice: 95 },
          { description: "Wiring, Connectors & Hardware", quantity: 1, unitPrice: 503 },
        ],
        submittedDate: "Feb 22, 2026",
        expiryDate: "Mar 10, 2026",
        thread: [
          { from: "vendor", text: "Confirmed start date of Mar 2. Two techs on-site — should wrap up by Mar 4.", time: "Feb 25, 3:00 PM" },
          { from: "user", text: "Perfect. Boat is ready at Pier 66, slip B-14.", time: "Feb 25, 4:30 PM" },
          { from: "vendor", text: "Day 2 underway — NSS16s are mounted and NMEA backbone is live. VHF and autopilot tomorrow.", time: "Mar 3, 5:15 PM" },
        ],
      },
      {
        id: "nb32",
        vendorName: "TechBoat Solutions",
        vendorInitials: "TB",
        rating: 4.4,
        reviewCount: 66,
        message: "Full helm electronics package. Dual Simrad install, NMEA 2000 integration, VHF, AIS, and autopilot. Competitive pricing and 90-day labor warranty.",
        price: 9400,
        submittedDate: "Feb 22, 2026",
        expiryDate: "Mar 8, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "happy-hour-windshield",
    title: "Windshield Panel Replacement",
    description: "Port-side windshield has a star crack that has been spreading. Need full panel replacement. Chris-Craft Launch 35 — OEM or equivalent tempered marine glass. Boat is at Bahia Mar Marina.",
    status: "gathering",
    date: "Mar 8, 2026",
    location: "Fort Lauderdale",
    category: "Canvas & Upholstery",
    boat: { name: "Happy Hour", make: "Chris-Craft", model: "Launch 35", year: "2021", propulsion: "Twin MerCruiser 6.2L Alpha One" },
    bids: [
      {
        id: "nb33",
        vendorName: "Marine Glass & Canvas",
        vendorInitials: "MG",
        rating: 4.7,
        reviewCount: 44,
        message: "Marine glass fabrication and replacement specialists. We'll template the existing panel, source tempered marine glass to spec, and install with proper marine sealant. We've done several Chris-Craft Launch windshields — lead time is approximately 1 week for fabrication.",
        price: 1350,
        submittedDate: "Mar 9, 2026",
        expiryDate: "Mar 30, 2026",
        thread: [],
      },
    ],
  },

  {
    id: "dock-holiday-annual",
    title: "Annual Engine Service & Full Detail",
    description: "Annual service for twin Yamaha F300Bs plus a full exterior detail on my Grady-White 307 Freedom. Looking to bundle both into a single visit. Boat at Harbour Towne Marina.",
    status: "completed",
    date: "Jan 10, 2026",
    location: "Dania Beach",
    category: "Engine Service",
    boat: { name: "Dock Holiday", make: "Grady-White", model: "307 Freedom", year: "2023", propulsion: "Twin Yamaha F300B Outboard" },
    chosenBidId: "nb34",
    bids: [
      {
        id: "nb34",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "We can handle both the Yamaha service and the full detail in a single visit — engine tech and detail crew arrive together. Efficient and cost-effective to bundle. Written service report for both motors included.",
        price: 1680,
        lineItems: [
          { description: "Yamaha F300B Annual Service", quantity: 2, unitPrice: 520 },
          { description: "Full Exterior Detail & Polish", quantity: 1, unitPrice: 480 },
          { description: "Gear Lube Service", quantity: 2, unitPrice: 55 },
          { description: "Zinc Replacement Kit (both engines)", quantity: 1, unitPrice: 50 },
        ],
        submittedDate: "Jan 12, 2026",
        expiryDate: "Jan 30, 2026",
        thread: [
          { from: "vendor", text: "Scheduled for Jan 22. Service tech and detail crew will both be on-site by 8 AM.", time: "Jan 14, 11:00 AM" },
          { from: "user", text: "Great — boat is at slip H-7 at Harbour Towne.", time: "Jan 14, 12:30 PM" },
          { from: "vendor", text: "All done! Both engines serviced and the hull looks great. Really clean Grady.", time: "Jan 22, 4:45 PM" },
        ],
      },
      {
        id: "nb35",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "We can service both Yamahas but would need to coordinate a separate detail crew. Competitive pricing on the engine service portion — happy to discuss bundling options.",
        price: 1820,
        submittedDate: "Jan 13, 2026",
        expiryDate: "Jan 28, 2026",
        thread: [],
      },
    ],
    invoice: {
      invoiceNumber: "INV-2026-0031",
      issuedDate: "Jan 22, 2026",
      paidDate: "Jan 22, 2026",
      items: [
        { description: "Yamaha F300B Annual Service", quantity: 2, unitPrice: 520 },
        { description: "Full Exterior Detail & Polish", quantity: 1, unitPrice: 480 },
        { description: "Gear Lube Service", quantity: 2, unitPrice: 55 },
        { description: "Zinc Replacement Kit (both engines)", quantity: 1, unitPrice: 50 },
      ],
    },
  },

  {
    id: "full-send-led-lighting",
    title: "LED Navigation & Underwater Lighting",
    description: "Upgrading all nav lights to LED and adding 6 underwater accent pods under the hull. Blackfin 332 CC at Harbour Towne Marina. Looking for clean wiring and a proper switch panel.",
    status: "bidding",
    date: "Mar 3, 2026",
    location: "Dania Beach",
    category: "Electronics",
    boat: { name: "Full Send", make: "Blackfin", model: "332 CC", year: "2020", propulsion: "Triple Mercury V8 300hp Outboard" },
    bids: [
      {
        id: "nb36",
        vendorName: "Marine Electronics Pro",
        vendorInitials: "ME",
        rating: 4.9,
        reviewCount: 203,
        message: "LED nav light conversion (bow, stern, masthead, spreader) and 6-pod Lumishore underwater lighting system. ABYC-compliant wiring, waterproof connectors, clean switch panel install. Great upgrade for night runs offshore.",
        price: 2800,
        submittedDate: "Mar 4, 2026",
        expiryDate: "Mar 20, 2026",
        thread: [],
      },
      {
        id: "nb37",
        vendorName: "TechBoat Solutions",
        vendorInitials: "TB",
        rating: 4.4,
        reviewCount: 66,
        message: "Full nav light LED conversion and underwater lighting package. We use Lumitec and OceanLED — both proven in salt water. Six pods mounted below the waterline. 90-day warranty.",
        price: 2450,
        submittedDate: "Mar 5, 2026",
        expiryDate: "Mar 19, 2026",
        thread: [
          { from: "vendor", text: "Do you want blue only, or a color-changing RGBW option? Same install cost, just a different fixture price.", time: "Mar 6, 10:00 AM" },
        ],
      },
    ],
  },

  {
    id: "salty-dog-diesel",
    title: "Twin MTU Diesel Annual Service",
    description: "Annual service on twin MTU 16V2000 M91 diesels — oil, filters, raw water impellers, heat exchanger inspection, and fuel system check. MTU-certified technicians only. Hatteras GT65 at Bahia Mar Marina.",
    status: "expired",
    date: "Nov 15, 2025",
    location: "Fort Lauderdale",
    category: "Engine Service",
    boat: { name: "Salty Dog", make: "Hatteras", model: "GT65", year: "2019", propulsion: "Twin MTU 16V2000 M91 Diesel" },
    bids: [
      {
        id: "nb38",
        vendorName: "MarineMax Service Center",
        vendorInitials: "MM",
        rating: 4.8,
        reviewCount: 142,
        message: "MTU-authorized service center. Twin 16V2000 annual service — oil and filter, raw water system, heat exchanger, fuel system check, and full engine data report. Dedicated diesel team for all MTU work.",
        price: 8500,
        submittedDate: "Nov 17, 2025",
        expiryDate: "Dec 1, 2025",
        thread: [],
      },
      {
        id: "nb39",
        vendorName: "Captain's Choice Marine",
        vendorInitials: "CC",
        rating: 4.5,
        reviewCount: 87,
        message: "MTU-certified technicians for twin 16V2000 service. Full annual package per engine including all fluids and filters. We have experience with Hatteras GT-series and understand the access challenges.",
        price: 7800,
        submittedDate: "Nov 18, 2025",
        expiryDate: "Dec 3, 2025",
        thread: [],
      },
    ],
  },

  {
    id: "midnight-run-captain",
    title: "Captain Needed — Ft. Lauderdale to Bimini",
    description: "Looking for a licensed offshore captain for a 4-day trip from Fort Lauderdale to Bimini and back. Boston Whaler 405 Conquest — need offshore experience and Bahamas routing knowledge. USCG 100-ton preferred.",
    status: "gathering",
    date: "Mar 9, 2026",
    location: "Fort Lauderdale",
    category: "Captain / Charter",
    boat: { name: "Midnight Run", make: "Boston Whaler", model: "405 Conquest", year: "2022", propulsion: "Triple Mercury Verado 350" },
    bids: [
      {
        id: "nb40",
        vendorName: "Capt. Mike Harrington",
        vendorInitials: "MH",
        rating: 4.9,
        reviewCount: 127,
        message: "USCG Master (100-ton) with extensive Bahamas experience — I've made the Bimini crossing dozens of times and know the inlets, anchorages, and customs procedures well. Comfortable on the 405 Conquest, which is an excellent offshore platform. I handle all passage planning and weather window selection.",
        price: 2400,
        submittedDate: "Mar 9, 2026",
        expiryDate: "Mar 30, 2026",
        thread: [],
      },
      {
        id: "nb41",
        vendorName: "Capt. Sofia Reyes",
        vendorInitials: "SR",
        rating: 4.8,
        reviewCount: 83,
        message: "USCG Master (50-ton) with offshore Bahamas routing experience. I've done the Ft. Lauderdale to Bimini run many times and know the weather windows well. Comfortable on large center consoles and express cruisers.",
        price: 2100,
        submittedDate: "Mar 9, 2026",
        expiryDate: "Mar 28, 2026",
        thread: [],
      },
    ],
  },
];
