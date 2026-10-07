// New columns can ship before their migration has been run. Saves that include them
// retry without them rather than failing the whole action.

export function isMissingColumn(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST204" || err.code === "42703" || /column .* does not exist|Could not find the '.+' column/i.test(err.message ?? "");
}

export function withoutKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): T {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

export const LOCATION_KEYS = [
  "location_lat", "location_lng", "location_place_id",
  "home_port_lat", "home_port_lng", "home_port_place_id",
  "lat", "lng", "place_id",
];
