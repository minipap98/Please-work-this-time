// An owner's boats: the rows, the form the apps edit, and the labels the apps show.

import type { Db } from "../db/client";
import type { InsertTables, Tables, UpdateTables } from "../database.types";
import { LOCATION_KEYS, isMissingColumn, withoutKeys } from "../db/optionalColumns";
import type { PickedLocation } from "../geo";
import { ENGINE_COUNT_WORDS, engineCountFromWord } from "../onboarding";

export type BoatRow = Tables<"boats">;

/** Newest first, like the web's useBoats. */
export async function listBoats(client: Db, ownerId: string): Promise<BoatRow[]> {
  const { data, error } = await client.from("boats").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Location columns are newer than the table; the insert retries without them when they're missing. */
export async function createBoat(client: Db, ownerId: string, boat: Omit<InsertTables<"boats">, "owner_id">): Promise<BoatRow> {
  const insert = (row: typeof boat) => client.from("boats").insert({ ...row, owner_id: ownerId }).select().single();
  let { data, error } = await insert(boat);
  if (isMissingColumn(error)) ({ data, error } = await insert(withoutKeys(boat, LOCATION_KEYS)));
  if (error) throw error;
  return data!;
}

export async function updateBoat(client: Db, id: string, patch: UpdateTables<"boats">): Promise<void> {
  let { error } = await client.from("boats").update(patch).eq("id", id);
  if (isMissingColumn(error)) ({ error } = await client.from("boats").update(withoutKeys(patch, LOCATION_KEYS)).eq("id", id));
  if (error) throw error;
}

export async function deleteBoat(client: Db, id: string): Promise<void> {
  const { error } = await client.from("boats").delete().eq("id", id);
  if (error) throw error;
}

/**
 * The boat the apps treat as "yours" right now. There's no column for it: each device remembers
 * a pointer, and when it's unset or stale the first boat added (the last in a newest-first list) wins.
 */
export function pickActiveBoat<T extends { id: string }>(boats: T[], storedId: string | null | undefined): T | null {
  return boats.find((b) => b.id === storedId) ?? boats[boats.length - 1] ?? null;
}

/** "Twin" for 2 outboards; "" for one, or for inboards (the count only matters for outboards). */
export function engineCountLabel(boat: Pick<BoatRow, "engine_type" | "engine_count">): string {
  if (boat.engine_type !== "Outboard") return "";
  const n = boat.engine_count ?? 1;
  return n > 1 ? ENGINE_COUNT_WORDS[n - 1] ?? `${n}×` : "";
}

/** The engine without the catalog's "(2021–present)" suffix. */
export function engineModelDisplay(model: string | null | undefined): string {
  return (model ?? "").replace(/\s*\(.*\)\s*$/, "").trim();
}

/** "Twin Mercury Verado 250" */
export function engineDisplay(boat: Pick<BoatRow, "engine_type" | "engine_count" | "engine_make" | "engine_model">): string {
  return [engineCountLabel(boat), boat.engine_make, engineModelDisplay(boat.engine_model)].filter(Boolean).join(" ");
}

/** "2020 Sea Ray SDX 250 OB" */
export function boatLabel(boat: Pick<BoatRow, "year" | "make" | "model">): string {
  return [boat.year, boat.make, boat.model].filter((x) => x && x !== "Unknown").join(" ");
}

/** The dashboard banner: the boat's name, else its year/make/model, else "My Boat". */
export function boatTitle(boat: Pick<BoatRow, "name" | "year" | "make" | "model"> | null | undefined): string {
  if (!boat) return "My Boat";
  return boat.name?.trim() || boatLabel(boat) || "My Boat";
}

/** The line under the banner title: year/make/model (when the title is a name) and the engines. */
export function boatSubtitle(boat: BoatRow | null | undefined): string {
  if (!boat) return "";
  const engine = engineDisplay(boat);
  return boat.name?.trim() ? [boatLabel(boat), engine].filter(Boolean).join(" · ") : engine;
}

/** What the apps edit. Strings throughout; engineCount is one of ENGINE_COUNT_WORDS or "". */
export interface BoatForm {
  name: string;
  make: string;
  model: string;
  year: string;
  engineType: string;
  engineMake: string;
  engineModel: string;
  engineCount: string;
  /** Free text when the port hasn't been verified. */
  homePortLabel: string;
  /** Set once the owner picked a real place (Google Places or a ZIP lookup). */
  homePort: PickedLocation | null;
}

export const EMPTY_BOAT_FORM: BoatForm = {
  name: "", make: "", model: "", year: "", engineType: "", engineMake: "", engineModel: "", engineCount: "", homePortLabel: "", homePort: null,
};

export function boatFormFromRow(b: BoatRow): BoatForm {
  const verified = !!b.home_port && b.home_port_lat != null && b.home_port_lng != null;
  return {
    name: b.name ?? "",
    make: b.make ?? "",
    model: b.model ?? "",
    year: b.year ?? "",
    engineType: b.engine_type ?? "",
    engineMake: b.engine_make ?? "",
    engineModel: b.engine_model ?? "",
    engineCount: b.engine_type === "Outboard" ? ENGINE_COUNT_WORDS[(b.engine_count ?? 1) - 1] ?? "Single" : "",
    homePortLabel: b.home_port ?? "",
    homePort: verified
      ? { label: b.home_port!, address: null, lat: b.home_port_lat!, lng: b.home_port_lng!, placeId: b.home_port_place_id ?? null, source: b.home_port_place_id ? "google" : "zip" }
      : null,
  };
}

/**
 * The columns a save writes, with the web's defaults ("My Boat", "Unknown", this year). A verified
 * port writes its coordinates; clearing the port clears them too, so a stale pin never lingers.
 */
export function boatRowFromForm(f: BoatForm, now: Date = new Date()) {
  const label = f.homePort?.label ?? f.homePortLabel.trim();
  return {
    name: f.name.trim() || "My Boat",
    make: f.make.trim() || "Unknown",
    model: f.model.trim() || "Unknown",
    year: f.year.trim() || String(now.getFullYear()),
    engine_type: (f.engineType || null) as BoatRow["engine_type"],
    engine_make: f.engineMake.trim() || null,
    engine_model: f.engineModel.trim() || null,
    engine_count: f.engineType === "Outboard" ? engineCountFromWord(f.engineCount) : 1,
    home_port: label || null,
    home_port_lat: f.homePort?.lat ?? null,
    home_port_lng: f.homePort?.lng ?? null,
    home_port_place_id: f.homePort?.placeId ?? null,
  };
}

export interface PhotoBytes {
  bytes: Uint8Array;
  contentType: string;
}

/** Upload a boat photo to the public boat-photos bucket and return its URL (the apps resize first). */
export async function uploadBoatPhoto(client: Db, ownerId: string, photo: PhotoBytes): Promise<string> {
  const path = `${ownerId}/${Date.now()}.jpg`;
  const { error } = await client.storage.from("boat-photos").upload(path, photo.bytes, { contentType: photo.contentType });
  if (error) throw error;
  return client.storage.from("boat-photos").getPublicUrl(path).data.publicUrl;
}

/** The year choices the apps offer: this year back to 1970. */
export function boatYears(now: Date = new Date()): string[] {
  const y = now.getFullYear();
  return Array.from({ length: y - 1969 }, (_, i) => String(y - i));
}
