import { useEffect, useState } from "react";
import { toast } from "sonner";
import LocationPicker from "@/components/LocationPicker";
import { useMyVendorProfile, useUpdateMyVendorProfile } from "@/hooks/use-supabase";
import type { PickedLocation } from "@shared/geo";
import type { Tables } from "@/lib/database.types";

const RADII = [10, 25, 50, 100, 200];

/** Where the shop is and how far it travels; used to show and filter jobs by distance. */
export default function ShopLocationCard() {
  const { data } = useMyVendorProfile();
  const vp = data as Tables<"vendor_profiles"> | null | undefined;
  const update = useUpdateMyVendorProfile();
  const [place, setPlace] = useState<PickedLocation | null>(null);
  const [radius, setRadius] = useState(50);

  useEffect(() => {
    if (!vp) return;
    setRadius(vp.service_radius_miles ?? 50);
    setPlace(
      vp.lat != null && vp.lng != null
        ? { label: vp.service_area || vp.business_name, address: null, lat: vp.lat, lng: vp.lng, placeId: vp.place_id ?? null, source: "google" }
        : null
    );
  }, [vp]);

  if (!vp) return null;

  const save = (patch: Partial<Tables<"vendor_profiles">>, done: string) =>
    update.mutate(patch, {
      onSuccess: () => toast.success(done),
      onError: (e) =>
        toast.error(
          /lat|lng|place_id/.test(String((e as Error).message))
            ? "Shop locations need a quick database update (20261013_locations.sql)."
            : (e as Error).message
        ),
    });

  return (
    <section className="border border-border rounded-xl bg-white p-5 mt-6">
      <h3 className="text-sm font-semibold">Shop location</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">
        Used to show how far each job is and to match you with boats nearby.
      </p>
      <LocationPicker
        value={place}
        onChange={(loc) => {
          setPlace(loc);
          if (loc) save({ lat: loc.lat, lng: loc.lng, place_id: loc.placeId }, "Shop location saved");
        }}
        placeholder="Search your shop's address"
        confirmLabel="Yes, this is my shop"
      />
      <label className="block text-xs font-medium mt-4 mb-1.5">How far you'll travel for jobs</label>
      <select
        value={radius}
        onChange={(e) => {
          const r = Number(e.target.value);
          setRadius(r);
          save({ service_radius_miles: r }, `Service radius set to ${r} miles`);
        }}
        className="border border-border rounded-md px-3 py-2 text-sm bg-white"
      >
        {RADII.map((m) => <option key={m} value={m}>Up to {m} miles</option>)}
      </select>
    </section>
  );
}
