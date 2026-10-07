import { useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { DEFAULT_FRAME, MAX_ZOOM, MIN_ZOOM, bannerRatio, fitZoom, frameGeometry, heroFrameStyle, type HeroFrame } from "@/hooks/use-my-boat";

/**
 * Lets the owner drag the photo around and zoom it inside a banner-shaped box.
 * The box takes the exact shape the dashboard banner has for this photo (bannerRatio),
 * so what you frame here is what you get there.
 */
export function HeroFrameEditor({ src, frame, onChange }: { src: string; frame: HeroFrame; onChange: (f: HeroFrame) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Same shape as the dashboard banner for this photo, so the preview is exact.
  const [ratio, setRatio] = useState(1.6);
  const [imageRatio, setImageRatio] = useState(0);

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const setZoom = (zoom: number) => onChange({ ...frame, zoom: clamp(Math.round(zoom * 20) / 20, MIN_ZOOM, MAX_ZOOM) });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: frame.x, fy: frame.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    // Move the photo by exactly as far as the pointer moved. The focal point maps to the
    // photo's slack (its size minus the banner's), so convert pointer pixels into that.
    const g = frameGeometry(frame, imageRatio || ratio, ratio);
    const slackX = 100 - g.w;
    const slackY = 100 - g.h;
    const nx = Math.abs(slackX) < 0.5 ? frame.x : clamp(d.fx + (((e.clientX - d.x) / box.clientWidth) * 10000) / slackX, 0, 100);
    const ny = Math.abs(slackY) < 0.5 ? frame.y : clamp(d.fy + (((e.clientY - d.y) / box.clientHeight) * 10000) / slackY, 0, 100);
    onChange({ ...frame, x: Math.round(nx), y: Math.round(ny) });
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div className="space-y-3">
      <div
        ref={boxRef}
        className={`relative w-full overflow-hidden rounded-md bg-white border border-border select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ aspectRatio: String(ratio) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            setRatio(bannerRatio(w, h));
            setImageRatio(w && h ? w / h : 0);
          }}
          className="block"
          style={heroFrameStyle(frame, imageRatio, ratio)}
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          Drag to move · zoom out to see it all
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setZoom(frame.zoom - 0.1)} className="rounded-md border border-border p-1.5 hover:bg-muted" aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={frame.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-primary"
          aria-label="Zoom"
        />
        <button type="button" onClick={() => setZoom(frame.zoom + 0.1)} className="rounded-md border border-border p-1.5 hover:bg-muted" aria-label="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ zoom: fitZoom(imageRatio, ratio), x: 50, y: 50 })}
          title="Show the whole photo inside the banner"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Fit
        </button>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FRAME)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}
