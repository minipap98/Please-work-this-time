import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBoats } from "@/hooks/use-supabase";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

const primaryKey = (uid: string) => `bosun_primary_boat:${uid}`;

// One shared "active boat" for the whole app, so switching in the top bar updates every page.
const listeners = new Set<() => void>();
let activeByUser: Record<string, string | null> = {};
function readActive(uid: string): string | null {
  if (!(uid in activeByUser)) {
    try {
      activeByUser[uid] = localStorage.getItem(primaryKey(uid));
    } catch {
      activeByUser[uid] = null;
    }
  }
  return activeByUser[uid];
}
function writeActive(uid: string, id: string) {
  activeByUser = { ...activeByUser, [uid]: id };
  try {
    localStorage.setItem(primaryKey(uid), id);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * The signed-in owner's boats from Supabase, with the one that's active right now.
 * The active boat is remembered per account in this browser and defaults to the first boat added.
 * Every page that shows "your boat" (dashboard, maintenance, boat log, settings) follows it.
 */
export function useMyBoats() {
  const { user } = useAuth();
  const { data: boats = [], isLoading } = useBoats();
  const uid = user?.id ?? "";
  const activeId = useSyncExternalStore(subscribe, () => (uid ? readActive(uid) : null), () => null);

  const setPrimaryId = useCallback(
    (id: string) => {
      if (uid) writeActive(uid, id);
    },
    [uid]
  );

  const list = boats as Tables<"boats">[];
  // useBoats returns newest first; the first boat added is the natural default.
  const primary = useMemo(() => list.find((b) => b.id === activeId) ?? list[list.length - 1] ?? null, [list, activeId]);
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
