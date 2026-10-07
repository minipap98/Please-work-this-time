// A shop's public business profile (vendor_profiles).

import type { Db } from "../db/client";
import type { Tables, UpdateTables } from "../database.types";

export type VendorProfileRow = Tables<"vendor_profiles">;

export async function listVendorProfiles(client: Db): Promise<VendorProfileRow[]> {
  const { data, error } = await client.from("vendor_profiles").select("*").order("business_name");
  if (error) throw error;
  return data ?? [];
}

export async function getVendorProfile(client: Db, id: string): Promise<VendorProfileRow> {
  const { data, error } = await client.from("vendor_profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** The signed-in shop's own profile, or null before onboarding created one. */
export async function getMyVendorProfile(client: Db, userId: string): Promise<VendorProfileRow | null> {
  const { data, error } = await client.from("vendor_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyVendorProfile(client: Db, userId: string, patch: UpdateTables<"vendor_profiles">): Promise<void> {
  const { error } = await client.from("vendor_profiles").update(patch).eq("user_id", userId);
  if (error) throw error;
}
