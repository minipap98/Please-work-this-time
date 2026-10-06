import { useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { DEFAULT_FRAME, heroFrameStyle, type HeroFrame } from "@/hooks/use-my-boat";

/**
 * Lets the owner drag the photo around and zoom it inside a banner-shaped box.
 * The box uses the same 1.6:1 shape the dashboard banner has on a phone, so what you
 * frame here is what you get there.
 */
export function HeroFrameEditor({ src, frame, onChange }: { src: string; frame: HeroFrame; onChange: (f: HeroFrame) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const setZoom = (zoom: number) => onChange({ ...frame, zoom: clamp(Math.round(zoom * 20) / 20, 1, 3) });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: frame.x, fy: frame.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    // Dragging the photo right should reveal more of its left side, so the focal point moves left.
    // At zoom 1 the photo barely overflows, so a larger multiplier keeps the drag feeling direct.
    const k = 100 / Math.max(0.35, frame.zoom - 0.65);
    const nx = clamp(d.fx - ((e.clientX - d.x) / box.clientWidth) * k, 0, 100);
    const ny = clamp(d.fy - ((e.clientY - d.y) / box.clientHeight) * k, 0, 100);
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
        className={`relative w-full overflow-hidden rounded-md bg-slate-100 select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ aspectRatio: "1.6" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img src={src} alt="" draggable={false} className="block w-full h-full object-cover" style={heroFrameStyle(frame)} />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          Drag to move · slider to zoom
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setZoom(frame.zoom - 0.1)} className="rounded-md border border-border p-1.5 hover:bg-muted" aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <input
          type="range"
          min={1}
          max={3}
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
          onClick={() => onChange(DEFAULT_FRAME)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}
