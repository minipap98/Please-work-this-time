// A shop's crew logins (shop_members): invite by email, roles, rename. Rules live in the DB
// (RLS, rename_crew_member, claim_shop_invites); these are the calls the apps make.

import type { Db } from "../db/client";

export type CrewRole = "tech" | "manager";

export interface ShopMember {
  id: string;
  email: string;
  techName: string;
  role: CrewRole;
  /** True once the invited person has signed in and claimed the invite. */
  joined: boolean;
}

export interface CrewMembership {
  vendorId: string;
  shopName: string;
  techName: string;
  role: CrewRole;
}

function toRole(role: string | null | undefined): CrewRole {
  return role === "manager" ? "manager" : "tech";
}

export async function listCrew(client: Db, vendorId: string): Promise<ShopMember[]> {
  const { data, error } = await client.from("shop_members").select("*").eq("vendor_id", vendorId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    email: m.email,
    techName: m.tech_name,
    role: toRole(m.role),
    joined: !!m.user_id,
  }));
}

/** Invite (or re-invite) someone by email; the row is claimed when they sign in with that address. */
export async function inviteCrew(client: Db, vendorId: string, input: { email: string; techName: string; role?: CrewRole }): Promise<void> {
  const { error } = await client
    .from("shop_members")
    .upsert({ vendor_id: vendorId, email: input.email.trim().toLowerCase(), tech_name: input.techName, role: input.role ?? "tech" }, { onConflict: "vendor_id,email" });
  if (error) throw error;
}

export async function removeCrew(client: Db, memberId: string): Promise<void> {
  const { error } = await client.from("shop_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function setCrewRole(client: Db, memberId: string, role: CrewRole): Promise<void> {
  const { error } = await client.from("shop_members").update({ role }).eq("id", memberId);
  if (error) throw error;
}

/** Rename through the RPC so assigned work orders and the board slot follow. No-op for an empty or unchanged name. */
export async function renameCrew(client: Db, member: Pick<ShopMember, "id" | "techName">, newName: string): Promise<void> {
  const name = newName.trim();
  if (!name || name === member.techName) return;
  const { error } = await client.rpc("rename_crew_member", { member_id: member.id, new_name: name });
  if (error) throw error;
}

/** Shops the signed-in user is on the crew of. Claims any invite sent to their email first. */
export async function myCrewMemberships(client: Db, userId: string): Promise<CrewMembership[]> {
  await client.rpc("claim_shop_invites");
  const { data, error } = await client
    .from("shop_members")
    .select("vendor_id, tech_name, role, vendor:vendor_profiles(business_name)")
    .eq("user_id", userId);
  if (error) throw error;
  type Row = { vendor_id: string; tech_name: string; role: string; vendor: { business_name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((m) => ({
    vendorId: m.vendor_id,
    shopName: m.vendor?.business_name ?? "Your shop",
    techName: m.tech_name,
    role: toRole(m.role),
  }));
}
