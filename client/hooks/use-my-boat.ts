import { useCallback, useMemo, useSyncExternalStore, type CSSProperties } from "react";
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

export type HeroFit = "cover" | "contain";
const fitKey = (boatId: string) => `bosun_hero_fit:${boatId}`;
/** How the dashboard banner shows this boat's photo: fill the banner (default) or show every pixel. */
export function readHeroFit(boatId: string): HeroFit {
  try {
    return localStorage.getItem(fitKey(boatId)) === "contain" ? "contain" : "cover";
  } catch {
    return "cover";
  }
}
export function writeHeroFit(boatId: string, fit: HeroFit) {
  try {
    localStorage.setItem(fitKey(boatId), fit);
  } catch {}
}

/**
 * How the photo sits in the banner when it fills it: zoom (1 = just fits) and the
 * focal point (0–100% from the left / top) that stays in view. Per boat, in this browser.
 */
export type HeroFrame = { zoom: number; x: number; y: number };
export const DEFAULT_FRAME: HeroFrame = { zoom: 1, x: 50, y: 50 };
/** Below 1 the photo sits smaller than the banner (white around it); above 1 it's enlarged. */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
/** The zoom at which a photo of this shape shows in full inside a banner of `boxRatio`. */
export function fitZoom(imageRatio: number, boxRatio: number): number {
  if (!imageRatio || !boxRatio) return 1;
  return clamp(Math.min(boxRatio / imageRatio, imageRatio / boxRatio), MIN_ZOOM, 1);
}
const frameKey = (boatId: string) => `bosun_hero_frame:${boatId}`;
export function readHeroFrame(boatId: string): HeroFrame {
  try {
    const raw = localStorage.getItem(frameKey(boatId));
    if (!raw) return DEFAULT_FRAME;
    const f = JSON.parse(raw) as Partial<HeroFrame>;
    return {
      zoom: clamp(Number(f.zoom) || 1, MIN_ZOOM, MAX_ZOOM),
      x: clamp(Number(f.x) || 50, 0, 100),
      y: clamp(Number(f.y) || 50, 0, 100),
    };
  } catch {
    return DEFAULT_FRAME;
  }
}
export function writeHeroFrame(boatId: string, frame: HeroFrame) {
  try {
    localStorage.setItem(frameKey(boatId), JSON.stringify(frame));
  } catch {}
}
/**
 * Width ÷ height of the dashboard banner for a photo of this size. The banner takes the
 * photo's own shape (nothing trimmed at zoom 1) within sensible limits, and the Settings
 * editor uses the same shape so what you frame there is exactly what shows.
 */
export function bannerRatio(naturalWidth: number, naturalHeight: number): number {
  if (!naturalWidth || !naturalHeight) return 1.6;
  return clamp(naturalWidth / naturalHeight, 1.6, 2.2);
}
/**
 * Size of the photo as a percentage of the banner for this frame: at zoom 1 it just covers
 * the banner, like object-fit: cover, but done by hand so zooming out can show parts
 * cover would have trimmed.
 */
export function frameGeometry(frame: HeroFrame, imageRatio: number, boxRatio: number) {
  const wider = imageRatio >= boxRatio;
  const w = (wider ? imageRatio / boxRatio : 1) * 100 * frame.zoom;
  const h = (wider ? 1 : boxRatio / imageRatio) * 100 * frame.zoom;
  return { w, h, left: ((100 - w) * frame.x) / 100, top: ((100 - h) * frame.y) / 100 };
}
/** Inline style that places the photo in the banner. Falls back to object-fit until the photo's size is known. */
export function heroFrameStyle(frame: HeroFrame, imageRatio?: number, boxRatio?: number): CSSProperties {
  if (!imageRatio || !boxRatio) {
    return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${frame.x}% ${frame.y}%` };
  }
  const g = frameGeometry(frame, imageRatio, boxRatio);
  return { position: "absolute", width: `${g.w}%`, height: `${g.h}%`, left: `${g.left}%`, top: `${g.top}%`, maxWidth: "none" };
}
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
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
