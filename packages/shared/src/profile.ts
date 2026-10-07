// The signed-in person's own profiles row.

import type { Db } from "./db/client";
import type { Tables, UpdateTables } from "./database.types";
import { LOCATION_KEYS, isMissingColumn, withoutKeys } from "./db/optionalColumns";
import type { PickedLocation } from "./geo";

export type ProfileRow = Tables<"profiles">;

/** Location columns are newer than the table; the update retries without them when they're missing. */
export async function updateProfile(client: Db, userId: string, patch: UpdateTables<"profiles">): Promise<void> {
  let { error } = await client.from("profiles").update(patch).eq("id", userId);
  if (isMissingColumn(error)) ({ error } = await client.from("profiles").update(withoutKeys(patch, LOCATION_KEYS)).eq("id", userId));
  if (error) throw new Error(error.message);
}

/** What a verified place writes to the profile. */
export function profileLocationPatch(place: PickedLocation) {
  return { location: place.label, location_lat: place.lat, location_lng: place.lng, location_place_id: place.placeId };
}

/** What a verified place writes to a boat's home port. */
export function boatHomePortPatch(place: PickedLocation) {
  return { home_port: place.label, home_port_lat: place.lat, home_port_lng: place.lng, home_port_place_id: place.placeId };
}

/** Where the dashboard says the boat is: the profile's location, else the boat's port; town only. */
export function shortLocation(label: string | null | undefined): string {
  return (label ?? "").split(",")[0].trim();
}
