export interface BidMessage {
  from: "vendor" | "user";
  text: string;
  time: string;
}

export interface Bid {
  id: string;
  vendorName: string;
  vendorInitials: string;
  rating: number;
  reviewCount: number;
  message: string;
  price: number;
  submittedDate: string;
  expiryDate: string;
  thread: BidMessage[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
  date: string;
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
    bids: [],
  },
  {
    id: "engine-maintenance",
    title: "Engine Maintenance Service",
    description: "Annual engine service and oil change needed for twin outboard motors",
    status: "bidding",
    date: "Feb 19, 2026",
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
];
