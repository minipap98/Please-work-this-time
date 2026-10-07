import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, ArrowRight, Wrench } from "lucide-react";
import { AnimatedBosunLogo } from "@/components/marketing/BosunLogo";
import { useStartDemo } from "@/components/marketing/MarketingChrome";

const SEEN_KEY = "bosun_intro_seen";

/**
 * Splash: the wordmark surfaces letter by letter, then the visitor picks a
 * side. Boaters and shops get completely separate marketing from here on.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const startDemo = useStartDemo();

  // Full logo intro on the first visit of a session; quicker after that. The copy and the two
  // doors are there from the first paint either way, so the page is usable while the letters surface.
  const fast = useMemo(() => {
    try {
      const seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
      return seen;
    } catch {
      return false;
    }
  }, []);
  const logoDelay = fast ? 0 : 200;
  const doorsDelay = fast ? 0 : 250;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-sky-50/60 to-sky-50 flex flex-col">
      {/* a quiet waterline along the bottom; the login panel carries the same shape */}
      <svg aria-hidden viewBox="0 0 1440 160" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-[200%] h-20 sm:h-24 text-sky-100 bosun-wave" style={{ animationDelay: "0ms, 1600ms" }}>
        <path fill="currentColor" d="M0 80 C 180 40 360 40 540 80 S 900 120 1080 80 S 1260 40 1440 80 V160 H0 Z" />
      </svg>
      <svg aria-hidden viewBox="0 0 1440 160" preserveAspectRatio="none" className="absolute bottom-0 left-[-20%] w-[200%] h-14 sm:h-16 text-sky-200/40 bosun-wave" style={{ animationDelay: "200ms, 2200ms" }}>
        <path fill="currentColor" d="M0 90 C 200 60 400 60 600 90 S 1000 120 1200 90 S 1380 70 1440 90 V160 H0 Z" />
      </svg>

      <header className="relative z-10 flex justify-end gap-2 px-4 sm:px-8 pt-4">
        <Link to="/parts" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2">Parts · soon</Link>
        <button onClick={() => navigate("/login")} className="text-sm font-medium text-[#052443] hover:underline px-3 py-2">
          Log in
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6 pb-20">
        <div className="w-[78%] sm:w-full max-w-[520px] mt-[5vh] sm:mt-[6vh]">
          <AnimatedBosunLogo delayMs={logoDelay} />
        </div>
        <p
          className="bosun-fade-up mt-7 sm:mt-8 text-center text-base sm:text-lg text-slate-600"
          style={{ animationDelay: `${doorsDelay}ms` }}
        >
          Boaters get competing bids. Shops get new customers. Pick your side of the dock.
        </p>

        <div className="mt-6 w-full max-w-4xl grid gap-4 sm:grid-cols-2">
          {/* Boaters */}
          <div className="bosun-fade-up rounded-2xl bg-white border border-sky-200 shadow-sm p-6 sm:p-8 flex flex-col" style={{ animationDelay: `${doorsDelay + 100}ms` }}>
            <div className="w-11 h-11 rounded-xl bg-sky-100 text-[#052443] flex items-center justify-center">
              <Anchor className="w-6 h-6" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-sky-700">For boaters</p>
            <h2 className="mt-1 text-2xl font-bold text-[#052443]">I own a boat</h2>
            <p className="mt-3 text-lg font-semibold text-[#052443] leading-snug">Local shops compete for your job.</p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">
              Post once, free, and compare line-item bids side by side. Plus your boat's full service history and a heads-up
              on what tends to fail on boats like yours.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate("/boaters")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors"
              >
                Explore Bosun for boaters <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => startDemo("boaters")} className="text-sm font-medium text-slate-600 hover:text-[#052443]">
                Try the demo
              </button>
            </div>
          </div>

          {/* Shops */}
          <div className="bosun-fade-up rounded-2xl bg-[#052443] text-white shadow-lg p-6 sm:p-8 flex flex-col" style={{ animationDelay: `${doorsDelay + 200}ms` }}>
            <div className="w-11 h-11 rounded-xl bg-white/10 text-sky-300 flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-sky-300">For shops & yards</p>
            <h2 className="mt-1 text-2xl font-bold">I run a marine shop</h2>
            <p className="mt-3 text-lg font-semibold text-white leading-snug">New customers come to you.</p>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed flex-1">
              Boat owners nearby post jobs and you bid on the ones that fit your schedule. Then run the work on the same app:
              work orders, scheduling, inventory, parts and QuickBooks.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate("/shops")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#052443] font-semibold hover:bg-sky-50 transition-colors"
              >
                Explore Bosun for shops <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => startDemo("shops")} className="text-sm font-medium text-slate-300 hover:text-white">
                Try the demo
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
