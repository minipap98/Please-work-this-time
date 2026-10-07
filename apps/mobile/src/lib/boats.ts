// The owner's boats and the one that's active on this device.
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InsertTables, UpdateTables } from "@bosun/shared/database.types";
import { createBoat, deleteBoat, listBoats, pickActiveBoat, updateBoat, uploadBoatPhoto, type BoatRow } from "@bosun/shared/boats/boats";
import type { PhotoInput } from "@bosun/shared/marketplace/photos";
import { canLookUpInsights, modelInsights, type InsightBoat, type ModelInsights } from "@bosun/shared/boats/insights";
import { useAuth } from "./auth";
import { activeBoatKey, usePref } from "./prefs";
import { supabase } from "./supabase";

export function useBoats() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["boats", user?.id], queryFn: () => listBoats(supabase, user!.id), enabled: !!user });
}

/** Every boat plus the active one (per device, same fallback as the web: the first boat added). */
export function useMyBoats() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useBoats();
  const [storedId, setStored] = usePref(user ? activeBoatKey(user.id) : null);
  const boats = useMemo(() => data ?? [], [data]);
  const active = useMemo(() => pickActiveBoat(boats, storedId), [boats, storedId]);
  const setActiveId = useCallback((id: string) => setStored(id), [setStored]);
  return { boats, active, isLoading, refetch, setActiveId };
}

function useInvalidateBoats() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["boats"] });
    qc.invalidateQueries({ queryKey: ["marketplace-projects"] });
  };
}

export function useCreateBoat() {
  const { user } = useAuth();
  const done = useInvalidateBoats();
  return useMutation({ mutationFn: (row: Omit<InsertTables<"boats">, "owner_id">) => createBoat(supabase, user!.id, row), onSuccess: done });
}

export function useUpdateBoat() {
  const done = useInvalidateBoats();
  return useMutation({ mutationFn: (v: { id: string; patch: UpdateTables<"boats"> }) => updateBoat(supabase, v.id, v.patch), onSuccess: done });
}

export function useDeleteBoat() {
  const done = useInvalidateBoats();
  return useMutation({ mutationFn: (id: string) => deleteBoat(supabase, id), onSuccess: done });
}

/** Upload a (resized) photo and set it on the boat. */
export function useSetBoatPhoto() {
  const { user } = useAuth();
  const done = useInvalidateBoats();
  return useMutation({
    mutationFn: async (v: { boat: BoatRow; photo: PhotoInput | null }) => {
      const url = v.photo ? await uploadBoatPhoto(supabase, user!.id, v.photo) : null;
      await updateBoat(supabase, v.boat.id, { photo_url: url, ...(v.photo ? { photo_frame: null } : {}) });
    },
    onSuccess: done,
  });
}

export function useModelInsights(boat: InsightBoat | null) {
  return useQuery({
    queryKey: ["model-insights", false, boat?.make, boat?.model, boat?.engineMake, boat?.engineModel],
    queryFn: (): Promise<ModelInsights> => modelInsights(supabase, boat!),
    enabled: canLookUpInsights(boat),
    staleTime: 10 * 60 * 1000,
  });
}
