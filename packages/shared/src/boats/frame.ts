// How a boat photo sits in the dashboard banner. Stored as jsonb on the boat (photo_frame) so
// every device shows the same crop. Pure math; the web and the app each draw it their own way.

export type HeroFit = "cover" | "contain";
export type HeroFrame = { zoom: number; x: number; y: number };
export type PhotoFrame = HeroFrame & { fit: HeroFit };

export const DEFAULT_FRAME: HeroFrame = { zoom: 1, x: 50, y: 50 };
export const DEFAULT_PHOTO_FRAME: PhotoFrame = { fit: "cover", ...DEFAULT_FRAME };
/** Below 1 the photo sits smaller than the banner (white around it); above 1 it's enlarged. */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/**
 * The zoom at which a photo of this shape shows in full inside a banner of `boxRatio`,
 * with a little breathing room so nothing in the photo touches the banner's edge.
 */
export function fitZoom(imageRatio: number, boxRatio: number): number {
  if (!imageRatio || !boxRatio) return 1;
  return clamp(Math.min(boxRatio / imageRatio, imageRatio / boxRatio) * 0.92, MIN_ZOOM, 1);
}

/** A stored frame (jsonb on the boat, or a JSON string) made safe; anything missing gets the default. */
export function parsePhotoFrame(raw: unknown): PhotoFrame {
  let f: Partial<PhotoFrame> | null = null;
  try {
    f = typeof raw === "string" ? (JSON.parse(raw) as Partial<PhotoFrame>) : (raw as Partial<PhotoFrame> | null);
  } catch {
    f = null;
  }
  if (!f || typeof f !== "object") return DEFAULT_PHOTO_FRAME;
  return {
    fit: f.fit === "contain" ? "contain" : "cover",
    zoom: clamp(num(f.zoom, 1), MIN_ZOOM, MAX_ZOOM),
    x: clamp(num(f.x, 50), 0, 100),
    y: clamp(num(f.y, 50), 0, 100),
  };
}

/**
 * Width ÷ height of the banner for a photo of this size: the photo's own shape (nothing trimmed
 * at zoom 1) within sensible limits.
 */
export function bannerRatio(naturalWidth: number, naturalHeight: number): number {
  if (!naturalWidth || !naturalHeight) return 1.6;
  return clamp(naturalWidth / naturalHeight, 1.6, 2.2);
}

/**
 * Size and position of the photo as a percentage of the banner: at zoom 1 it just covers the
 * banner (like object-fit: cover), zoomed out it shows parts cover would have trimmed.
 */
export function frameGeometry(frame: HeroFrame, imageRatio: number, boxRatio: number) {
  const wider = imageRatio >= boxRatio;
  const w = (wider ? imageRatio / boxRatio : 1) * 100 * frame.zoom;
  const h = (wider ? 1 : boxRatio / imageRatio) * 100 * frame.zoom;
  return { w, h, left: ((100 - w) * frame.x) / 100, top: ((100 - h) * frame.y) / 100 };
}
