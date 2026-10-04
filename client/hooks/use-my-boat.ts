import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBoats } from "@/hooks/use-supabase";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

const primaryKey = (uid: string) => `bosun_primary_boat:${uid}`;

/**
 * The signed-in owner's boats from Supabase, with the one they marked primary.
 * Primary is remembered per account in this browser; it defaults to the first boat added.
 */
export function useMyBoats() {
  const { user } = useAuth();
  const { data: boats = [], isLoading } = useBoats();
  const [primaryId, setPrimaryIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      setPrimaryIdState(localStorage.getItem(primaryKey(user.id)));
    } catch {
      setPrimaryIdState(null);
    }
  }, [user]);

  const setPrimaryId = useCallback(
    (id: string) => {
      setPrimaryIdState(id);
      if (user) {
        try {
          localStorage.setItem(primaryKey(user.id), id);
        } catch {}
      }
    },
    [user]
  );

  const list = boats as Tables<"boats">[];
  const primary = useMemo(
    () => list.find((b) => b.id === primaryId) ?? list[list.length - 1] ?? null,
    [list, primaryId]
  );
  return { boats: list, primary, isLoading, setPrimaryId };
}

/** Upload a boat photo (data URL from the cropper) and return its public URL. */
export async function uploadBoatPhoto(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("boat-photos").upload(path, blob, {
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return supabase.storage.from("boat-photos").getPublicUrl(path).data.publicUrl;
}
