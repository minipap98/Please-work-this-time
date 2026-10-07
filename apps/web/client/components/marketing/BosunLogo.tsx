import { cn } from "@/lib/utils";

/** Letter crops of the wordmark, positioned on the 1512 × 262 logo canvas. */
const LETTERS = [
  { ch: "B", left: 4, width: 240 },
  { ch: "O", left: 297, width: 281 },
  { ch: "S", left: 625, width: 241 },
  { ch: "U", left: 933, width: 238 },
  { ch: "N", left: 1256, width: 252 },
];
const CANVAS_W = 1512;
const CANVAS_H = 262;

/** Static wordmark. `tone="light"` is the white version for dark backgrounds. */
export function BosunLogo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <img
      src={tone === "light" ? "/brand/bosun-logo-white.png" : "/brand/bosun-logo.png"}
      alt="Bosun"
      width={CANVAS_W}
      height={CANVAS_H}
      className={cn("h-7 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/**
 * Animated wordmark: each letter surfaces from below the waterline in turn,
 * then a swell rolls under the logo and keeps gently moving.
 */
export function AnimatedBosunLogo({ className, delayMs = 150 }: { className?: string; delayMs?: number }) {
  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}>
      {LETTERS.map((l, i) => (
        <img
          key={l.ch}
          src={`/brand/letter-${l.ch}.png`}
          alt={i === 0 ? "Bosun" : ""}
          aria-hidden={i !== 0}
          draggable={false}
          className="bosun-letter absolute top-0 h-full select-none"
          style={{
            left: `${(l.left / CANVAS_W) * 100}%`,
            width: `${(l.width / CANVAS_W) * 100}%`,
            animationDelay: `${delayMs + i * 140}ms`,
          }}
        />
      ))}
      {/* the swell */}
      <svg
        aria-hidden
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="bosun-wave absolute left-[-6%] w-[112%] top-[104%] h-[22%] text-sky-400/70"
        style={{ animationDelay: `${delayMs + 520}ms, ${delayMs + 2100}ms` }}
      >
        <path
          d="M0 34 C 100 10, 200 10, 300 30 S 500 52, 600 30 S 800 8, 900 28 S 1100 50, 1200 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M0 48 C 120 30, 240 30, 360 44 S 600 60, 720 44 S 960 28, 1080 42 S 1160 52, 1200 46"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
