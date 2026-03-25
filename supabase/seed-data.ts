/**
 * Seed script — run with: npx tsx supabase/seed-data.ts
 *
 * Prerequisites:
 * 1. Run schema.sql in Supabase SQL Editor
 * 2. Run storage-setup.sql in Supabase SQL Editor
 * 3. Run seed.sql in Supabase SQL Editor (maintenance tasks)
 * 4. Set SUPABASE_SERVICE_ROLE_KEY env var (from Supabase Dashboard → Settings → API)
 *
 * This script:
 * - Creates demo auth users (dean@bosun.app, vendor@bosun.app)
 * - Populates vendor profiles, boats, projects, bids, reviews, crew members
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://lqzlevmeihpzxarlimzu.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Get it from Supabase Dashboard → Settings → API → service_role key");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Starting seed...");

  // 1. Create demo users via Auth
  console.log("Creating demo users...");

  const { data: ownerAuth, error: ownerErr } = await supabase.auth.admin.createUser({
    email: "dean@bosun.app",
    password: "password",
    email_confirm: true,
    user_metadata: { name: "Dean", role: "owner" },
  });
  if (ownerErr && !ownerErr.message.includes("already been registered")) {
    console.error("Owner create error:", ownerErr);
  }
  const ownerId = ownerAuth?.user?.id;
  console.log("Owner ID:", ownerId);

  const { data: vendorAuth, error: vendorErr } = await supabase.auth.admin.createUser({
    email: "vendor@bosun.app",
    password: "password",
    email_confirm: true,
    user_metadata: { name: "MarineMax Service Center", role: "vendor" },
  });
  if (vendorErr && !vendorErr.message.includes("already been registered")) {
    console.error("Vendor create error:", vendorErr);
  }
  const vendorUserId = vendorAuth?.user?.id;
  console.log("Vendor User ID:", vendorUserId);

  // Wait for triggers to create profiles
  await new Promise((r) => setTimeout(r, 2000));

  // 2. Update profiles with full details
  if (ownerId) {
    await supabase.from("profiles").update({
      name: "Dean",
      initials: "D",
      role: "owner",
      onboarding_complete: true,
      location: "Miami, FL",
    }).eq("id", ownerId);
  }

  if (vendorUserId) {
    await supabase.from("profiles").update({
      name: "MarineMax Service Center",
      initials: "MM",
      role: "vendor",
      onboarding_complete: true,
      location: "Miami, FL",
    }).eq("id", vendorUserId);
  }

  // 3. Create owner's boat
  let boatId: string | undefined;
  if (ownerId) {
    const { data: boat } = await supabase.from("boats").insert({
      owner_id: ownerId,
      name: "No Vacancy",
      make: "Sea Ray",
      model: "SDX 250 OB",
      year: "2020",
      engine_type: "Outboard",
      engine_make: "Mercury",
      engine_model: "Verado 250",
      engine_count: 1,
      propulsion: "Single Mercury Verado 250",
      home_port: "Miami Beach Marina",
    }).select().single();
    boatId = boat?.id;
    console.log("Boat ID:", boatId);
  }

  // 4. Create vendor profiles (need to create auth users for each vendor)
  const vendors = [
    { email: "vendor@bosun.app", name: "MarineMax Service Center", initials: "MM", userId: vendorUserId },
  ];

  // Create additional vendor auth users
  const additionalVendors = [
    { name: "Captain's Choice Marine", initials: "CC", email: "captains-choice@bosun.app", bio: "We've been servicing outboard engines for over 15 years.", specialties: ["Engine Service", "Outboard Repair", "Fuel Systems"], certs: ["Mercury Marine Certified", "Yamaha Marine Technician"], area: "Miami Beach · Key Biscayne · Coral Gables", years: 8, jobs: 412, insured: true, licensed: true, response: "~2 hours" },
    { name: "Saltwater Pros LLC", initials: "SP", email: "saltwater-pros@bosun.app", bio: "South Florida's premier outboard service company.", specialties: ["Engine Service", "Multi-Engine", "Zinc & Anodes", "Warranty Work"], certs: ["Mercury Master Technician", "Yamaha Master Technician", "Evinrude Certified", "ABYC Certified"], area: "Miami · Fort Lauderdale · Palm Beach · Keys", years: 15, jobs: 1203, insured: true, licensed: true, response: "~30 min" },
    { name: "Blue Water Detailing", initials: "BW", email: "blue-water@bosun.app", bio: "Premium boat detailing, from basic wash-and-wax to full paint correction.", specialties: ["Detailing", "Waxing", "Ceramic Coating", "Interior Cleaning"], certs: ["IDA Certified Detailer", "Ceramic Pro Installer"], area: "Miami · Miami Beach · Aventura", years: 6, jobs: 334, insured: true, licensed: false, response: "~3 hours" },
    { name: "Dockside Shine", initials: "DS", email: "dockside-shine@bosun.app", bio: "Showroom quality to your slip.", specialties: ["Detailing", "Waxing", "Teak Restoration", "Canvas Cleaning"], certs: ["IDA Certified Detailer"], area: "Fort Lauderdale · Hollywood · Hallandale", years: 4, jobs: 189, insured: true, licensed: false, response: "~4 hours" },
    { name: "Pro Marine Detail", initials: "PM", email: "pro-marine@bosun.app", bio: "Full-service detailing and bottom work.", specialties: ["Detailing", "Bottom Paint", "Antifouling", "Vinyl Wrap"], certs: ["AwlGrip Applicator"], area: "Miami · Coconut Grove · Coral Gables", years: 3, jobs: 142, insured: true, licensed: false, response: "Same day" },
    { name: "Harbor Gloss", initials: "HG", email: "harbor-gloss@bosun.app", bio: "Premium marine detailing studio known for flawless paint corrections.", specialties: ["Detailing", "Paint Correction", "Ceramic Coating", "Oxidation Removal"], certs: ["IDA Certified Detailer", "Gtechniq Certified", "Ceramic Pro Installer"], area: "Miami · Fort Lauderdale · Boca Raton", years: 9, jobs: 523, insured: true, licensed: false, response: "~2 hours" },
    { name: "Sea Shine Services", initials: "SS", email: "sea-shine@bosun.app", bio: "Affordable basic detailing and waxing.", specialties: ["Detailing", "Basic Wash", "Waxing"], certs: [], area: "Miami Beach · North Miami", years: 2, jobs: 67, insured: false, licensed: false, response: "~6 hours" },
    { name: "Marine Electronics Pro", initials: "ME", email: "marine-electronics@bosun.app", bio: "South Florida's leading marine electronics installer.", specialties: ["Electronics", "Chartplotters", "VHF Radio", "AIS", "Autopilot", "Audio/Video"], certs: ["NMEA Certified Installer", "Garmin Dealer", "Simrad Dealer", "Furuno Dealer"], area: "Miami · Fort Lauderdale · Palm Beach", years: 11, jobs: 689, insured: true, licensed: true, response: "~1 hour" },
    { name: "TechBoat Solutions", initials: "TB", email: "techboat@bosun.app", bio: "Modern marine electronics and electrical systems.", specialties: ["Electronics", "Electrical Systems", "NMEA 2000", "Speakers", "Cameras"], certs: ["NMEA Certified Installer", "Garmin Dealer", "JL Audio Marine Certified"], area: "Miami · Doral · Kendall · Homestead", years: 7, jobs: 318, insured: true, licensed: true, response: "~2 hours" },
  ];

  for (const v of additionalVendors) {
    const { data: auth } = await supabase.auth.admin.createUser({
      email: v.email,
      password: "password",
      email_confirm: true,
      user_metadata: { name: v.name, role: "vendor" },
    });
    if (auth?.user) {
      await new Promise((r) => setTimeout(r, 500));
      await supabase.from("profiles").update({
        name: v.name,
        initials: v.initials,
        role: "vendor",
        onboarding_complete: true,
      }).eq("id", auth.user.id);

      await supabase.from("vendor_profiles").insert({
        user_id: auth.user.id,
        business_name: v.name,
        initials: v.initials,
        bio: v.bio,
        specialties: v.specialties,
        certifications: v.certs,
        service_area: v.area,
        years_in_business: v.years,
        completed_jobs: v.jobs,
        insured: v.insured,
        licensed: v.licensed,
        response_time: v.response,
      });
      console.log(`Created vendor: ${v.name}`);
    }
  }

  // Create MarineMax vendor profile
  if (vendorUserId) {
    await supabase.from("vendor_profiles").insert({
      user_id: vendorUserId,
      business_name: "MarineMax Service Center",
      initials: "MM",
      bio: "MarineMax Service Center has been serving South Florida boaters for over 14 years.",
      specialties: ["Engine Service", "Mercury Authorized", "Yamaha Authorized", "Bottom Work", "Electronics"],
      certifications: ["Mercury Master Technician", "ABYC Certified", "Yamaha Marine Technician", "Garmin Authorized Dealer"],
      service_area: "Miami, FL · Fort Lauderdale · Dania Beach · Pompano Beach",
      years_in_business: 14,
      completed_jobs: 1243,
      insured: true,
      licensed: true,
      response_time: "~1 hour",
    });
  }

  // 5. Create some demo projects with bids
  if (ownerId && boatId) {
    // Get MarineMax vendor profile ID
    const { data: mmVendor } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("business_name", "MarineMax Service Center")
      .single();

    const { data: project1 } = await supabase.from("projects").insert({
      owner_id: ownerId,
      boat_id: boatId,
      title: "Annual Engine Service — Mercury Verado 250",
      description: "Full annual service on single Mercury Verado 250hp outboard. Need oil change, impeller, gear lube, fuel filter, and anodes. Boat is at Miami Beach Marina, slip 42.",
      status: "bidding",
      category: "Engine Service",
      location: "Miami Beach Marina",
    }).select().single();

    if (project1 && mmVendor) {
      await supabase.from("bids").insert({
        project_id: project1.id,
        vendor_id: mmVendor.id,
        price: 1850,
        message: "We can schedule this for next week. Price includes all parts and fluids — Mercury OEM oil, filters, impeller kit, gear lube, and zincs. About 3-4 hours on site.",
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // A completed project
    const { data: project2 } = await supabase.from("projects").insert({
      owner_id: ownerId,
      boat_id: boatId,
      title: "Bottom Paint & Zinc Replacement",
      description: "Need bottom scraped, new antifouling paint (Interlux Micron 66), and all zincs replaced.",
      status: "completed",
      category: "Bottom Work",
      location: "Miami Beach Marina",
      date: new Date("2025-11-15").toISOString(),
    }).select().single();

    if (project2 && mmVendor) {
      const { data: bid2 } = await supabase.from("bids").insert({
        project_id: project2.id,
        vendor_id: mmVendor.id,
        price: 2400,
        message: "Includes haul-out, pressure wash, 2 coats Micron 66, and 6 new zincs.",
        accepted: true,
      }).select().single();

      if (bid2) {
        await supabase.from("projects").update({ chosen_bid_id: bid2.id }).eq("id", project2.id);
      }
    }

    // Another active project
    await supabase.from("projects").insert({
      owner_id: ownerId,
      boat_id: boatId,
      title: "Full Detail — Interior & Exterior",
      description: "Looking for a full detail. Exterior wash, wax, and compound. Interior deep clean, vinyl conditioning, and carpet shampoo.",
      status: "active",
      category: "Detailing",
      location: "Miami Beach Marina",
    });

    console.log("Created demo projects");
  }

  // 6. Seed crew members
  const crewMembers = [
    { name: "Captain Mike Torres", initials: "MT", role: "Captain" as const, location: "Miami, FL", rating: 4.9, review_count: 127, years_experience: 18, day_rate: 950, certifications: ["USCG 100T Master", "STCW"], bio: "18 years experience running sport fish and luxury motor yachts up to 80ft.", availability: "available" as const, languages: ["English", "Spanish"], specialties: ["Offshore Sport Fishing", "Gulf Stream"] },
    { name: "Captain Sarah Chen", initials: "SC", role: "Captain" as const, location: "Fort Lauderdale, FL", rating: 4.8, review_count: 93, years_experience: 12, day_rate: 1100, certifications: ["USCG 200T Master", "STCW", "RYA Yachtmaster Offshore"], bio: "Experienced motoryacht captain, specializing in charters and deliveries.", availability: "available" as const, languages: ["English", "Mandarin"], specialties: ["Motoryacht Charters", "Deliveries"] },
    { name: "Jake Morrison", initials: "JM", role: "Mate" as const, location: "Miami, FL", rating: 4.7, review_count: 56, years_experience: 6, day_rate: 375, certifications: ["STCW", "ENG1"], bio: "Experienced deck/mate for sport fishing and day cruises.", availability: "available" as const, languages: ["English"], specialties: ["Sport Fishing", "Deck Operations"] },
    { name: "Elena Vasquez", initials: "EV", role: "Stewardess" as const, location: "Miami Beach, FL", rating: 4.9, review_count: 84, years_experience: 8, day_rate: 400, certifications: ["STCW", "ISS Interior"], bio: "Chief stew with 8 years on luxury charter yachts.", availability: "available" as const, languages: ["English", "Spanish", "French"], specialties: ["Fine Dining Service", "Interior Management"] },
    { name: "Marcus Johnson", initials: "MJ", role: "Day Laborer" as const, location: "Miami, FL", rating: 4.5, review_count: 32, years_experience: 3, day_rate: 175, certifications: ["OSHA 10"], bio: "Reliable day laborer for boat cleaning, prep, and general maintenance.", availability: "available" as const, languages: ["English"], specialties: ["Cleaning", "Prep Work"] },
    { name: "Chef Lucia Marinetti", initials: "LM", role: "Chef" as const, location: "Fort Lauderdale, FL", rating: 4.9, review_count: 71, years_experience: 15, day_rate: 650, certifications: ["CIA Culinary Arts", "ServSafe", "STCW"], bio: "Italian-trained yacht chef specializing in Mediterranean and fusion cuisine.", availability: "limited" as const, languages: ["English", "Italian"], specialties: ["Mediterranean Cuisine", "Fine Dining"] },
    { name: "Captain Ray Delgado", initials: "RD", role: "Fishing Guide" as const, location: "Islamorada, FL", rating: 4.8, review_count: 203, years_experience: 22, day_rate: 550, certifications: ["USCG 6-Pack", "FWC Guide License"], bio: "Keys fishing legend — 22 years guiding offshore and flats.", availability: "available" as const, languages: ["English", "Spanish"], specialties: ["Offshore Sport Fishing", "Flats Fishing", "Tarpon"] },
  ];

  for (const crew of crewMembers) {
    await supabase.from("crew_members").insert(crew);
  }
  console.log("Created crew members");

  console.log("\nSeed complete!");
  console.log("\nDemo accounts:");
  console.log("  Owner: dean@bosun.app / password");
  console.log("  Vendor: vendor@bosun.app / password");
}

seed().catch(console.error);
