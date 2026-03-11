import { VendorProfile, VENDOR_PROFILES } from "./vendorData";

const CUSTOM_PROFILES_KEY = "bosun_custom_vendor_profiles";

/** Read custom (user-created) vendor profiles from localStorage */
export function getCustomVendorProfiles(): Record<string, VendorProfile> {
  try {
    const raw = localStorage.getItem(CUSTOM_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save a single custom vendor profile to localStorage */
export function saveCustomVendorProfile(profile: VendorProfile): void {
  const profiles = getCustomVendorProfiles();
  profiles[profile.name] = profile;
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(profiles));
}

/** Get ALL vendor profiles: hardcoded + custom (custom overrides if same key) */
export function getAllVendorProfiles(): Record<string, VendorProfile> {
  return { ...VENDOR_PROFILES, ...getCustomVendorProfiles() };
}

/** Create a new VendorProfile from onboarding data with sensible defaults */
export function createVendorProfileFromOnboarding(data: {
  name: string;
  initials: string;
  yearsInBusiness: number;
  insured: boolean;
  licensed: boolean;
  specialties: string[];
  certifications: string[];
  serviceArea: string;
  bio: string;
}): VendorProfile {
  return {
    name: data.name,
    initials: data.initials,
    rating: 0,
    reviewCount: 0,
    responseTime: "New vendor",
    insured: data.insured,
    licensed: data.licensed,
    yearsInBusiness: data.yearsInBusiness,
    specialties: data.specialties,
    certifications: data.certifications,
    serviceArea: data.serviceArea,
    bio: data.bio,
    completedJobs: 0,
  };
}
