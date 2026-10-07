import { useCallback, useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { DEFAULT_PHOTO_FRAME, frameGeometry, parsePhotoFrame, type HeroFrame, type PhotoFrame } from "@shared/boats/frame";
import { pickActiveBoat, uploadBoatPhoto as uploadBoatPhotoBytes } from "@shared/boats/boats";
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
  const primary = useMemo(() => pickActiveBoat(list, activeId), [list, activeId]);
  return { boats: list, primary, isLoading, setPrimaryId };
}

export { DEFAULT_FRAME, DEFAULT_PHOTO_FRAME, MAX_ZOOM, MIN_ZOOM, bannerRatio, fitZoom, frameGeometry, parsePhotoFrame, type HeroFit, type HeroFrame, type PhotoFrame } from "@shared/boats/frame";

// The demo (and accounts whose boats table predates photo_frame) keep the framing in this browser.
const localKey = (boatId: string) => `bosun_photo_frame:${boatId}`;
export function readLocalPhotoFrame(boatId: string): PhotoFrame {
  try {
    return parsePhotoFrame(localStorage.getItem(localKey(boatId)));
  } catch {
    return DEFAULT_PHOTO_FRAME;
  }
}
export function writeLocalPhotoFrame(boatId: string, frame: PhotoFrame) {
  try {
    localStorage.setItem(localKey(boatId), JSON.stringify(frame));
  } catch {}
}
/**
 * The framing to show for a boat: the demo's lives in this browser; a live boat's is stored on
 * its row (photo_frame) so it's the same on every device, falling back to this browser's copy.
 */
export function photoFrameFor(boat: { id: string; photo_frame?: unknown } | null | undefined, demo: boolean): PhotoFrame {
  if (demo) return readLocalPhotoFrame("demo");
  if (!boat) return DEFAULT_PHOTO_FRAME;
  if (boat.photo_frame != null) return parsePhotoFrame(boat.photo_frame);
  return readLocalPhotoFrame(boat.id);
}
/** Inline style that places the photo in the banner. Falls back to object-fit until the photo's size is known. */
export function heroFrameStyle(frame: HeroFrame, imageRatio?: number, boxRatio?: number): CSSProperties {
  if (!imageRatio || !boxRatio) {
    return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${frame.x}% ${frame.y}%` };
  }
  const g = frameGeometry(frame, imageRatio, boxRatio);
  return { position: "absolute", width: `${g.w}%`, height: `${g.h}%`, left: `${g.left}%`, top: `${g.top}%`, maxWidth: "none" };
}

/** Upload a boat photo (data URL from the cropper) and return its public URL. */
export async function uploadBoatPhoto(userId: string, dataUrl: string): Promise<string> {
  return uploadBoatPhotoBytes(supabase, userId, dataUrl);
}
