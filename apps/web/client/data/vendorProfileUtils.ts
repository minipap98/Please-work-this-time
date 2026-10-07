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

/** Check vendor insurance status based on policy expiry date */
export function getVendorInsuranceStatus(vendorName: string): "verified" | "expiring" | "expired" | "none" {
  const profiles = getAllVendorProfiles();
  const profile = profiles[vendorName];
  if (!profile?.insurancePolicy?.expiryDate) return "none";
  const expiry = new Date(profile.insurancePolicy.expiryDate).getTime();
  const now = Date.now();
  if (expiry < now) return "expired";
  if (expiry - now < 30 * 24 * 60 * 60 * 1000) return "expiring";
  return "verified";
}

/** Save vendor insurance policy and optional COI document */
export function saveVendorInsurance(
  vendorName: string,
  coi: { fileName: string; dataUrl: string } | null,
  policy: { provider: string; policyNumber: string; expiryDate: string; coverageAmount: string }
) {
  const profiles = getAllVendorProfiles();
  const existing = profiles[vendorName] || {
    name: vendorName,
    initials: vendorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    rating: 0,
    reviewCount: 0,
    responseTime: "New vendor",
    insured: false,
    licensed: false,
    yearsInBusiness: 0,
    specialties: [],
    certifications: [],
    serviceArea: "",
    bio: "",
    completedJobs: 0,
  };
  const updated = {
    ...existing,
    coiDocument: coi ? { ...coi, uploadedAt: new Date().toISOString() } : existing.coiDocument,
    insurancePolicy: policy,
    insured: true,
  };
  saveCustomVendorProfile(updated);
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
