import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, BookOpen, Check, ChevronRight, Clock, FileText, LineChart, MapPin, Package, Shield, Wrench } from "lucide-react";
import { MarketingFooter, MarketingNav, signupPath, useStartDemo } from "@/components/marketing/MarketingChrome";

const SERVICES = [
  "Engine service", "Bottom paint", "Detailing & wax", "Hull & gelcoat",
  "Electronics", "Electrical", "Canvas & upholstery", "Haul-out & storage",
];

const STEPS = [
  { icon: FileText, title: "Describe the job", body: "Pick your boat and engine, add photos, and say what you need: a 100-hour service, an impeller, fresh bottom paint." },
  { icon: Wrench, title: "Compare real bids", body: "Local shops send line-item bids, so you can see labor and parts side by side and ask questions before you choose." },
  { icon: Check, title: "Book the shop", body: "Choose who does the work and pay them directly. When the job's done, it's added to your Boat Log automatically." },
];

const FEATURES = [
  { icon: Shield, title: "Shops with their paperwork in order", body: "Shops can keep their insurance certificate on file, and you can see it once you book. Handy when your marina asks for it." },
  { icon: Clock, title: "Maintenance reminders", body: "Service schedules for your engine, tracked by date and engine hours, so the 100-hour service doesn't sneak up on you." },
  { icon: MapPin, title: "Slip, trailer or yard", body: "Tell shops where the boat is and whether it needs a haul-out, so bids account for the logistics up front." },
  { icon: Package, title: "Parts for DIY jobs (soon)", body: "Doing it yourself? Bosun will show exactly which parts fit your engine and log the work when you're done." },
];

export default function BoatersPage() {
  const navigate = useNavigate();
  const startDemo = useStartDemo();

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav audience="boaters" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-xs font-semibold text-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" /> Now launching in South Florida
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#052443] tracking-tight leading-[1.08]">
              The right shop for your boat. <span className="text-sky-500">And a record of everything they do.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
              Post your job for free, compare line-item bids from local marine pros, and keep your boat's full service
              history in one place. Every job logged on Bosun also teaches us what tends to fail on boats like yours, so
              you can fix it at the dock instead of getting stranded on the water.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(signupPath("boaters"))}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 shadow-lg shadow-sky-500/20"
              >
                Post a job, it's free <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => startDemo("boaters")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-white font-semibold text-[#052443] hover:bg-slate-50"
              >
                Try the demo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {["Free to post", "No obligation to accept", "Your data stays private"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> {t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052443]">Every service your boat needs</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {SERVICES.map((s) => (
              <button
                key={s}
                onClick={() => navigate(signupPath("boaters"))}
                className="px-5 py-2.5 rounded-full border border-border text-sm font-medium text-[#052443] hover:border-sky-300 hover:bg-sky-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052443] text-center">How it works</h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#052443] text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                  <s.icon className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Boat Log */}
      <section id="boat-log" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
              <BookOpen className="w-4 h-4" /> Boat Log
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#052443]">Your boat's full history, written by the people who did the work</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              When a shop finishes a job through Bosun, the itemized record lands in your Boat Log: labor, parts, engine hours
              and the tech's notes, marked as verified by the shop. Add your own DIY work too. Download it as a clean PDF
              whenever a buyer, surveyor or insurer asks.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {["Every job itemized, parts and labor", "Verified entries come from the shop, not typed in later", "One-tap PDF and CSV export"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-white shadow-sm p-5">
            {[
              { d: "Aug 14", t: "300-hour service, Verado 250", v: "Verified · Harbor Marine", c: "$1,186" },
              { d: "Mar 22", t: "Bottom paint, 2 coats ablative", v: "Verified · Rickenbacker Boatyard", c: "$1,940" },
              { d: "Nov 2", t: "Washdown pump replaced", v: "Logged by you", c: "$189" },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full ${r.v.startsWith("Verified") ? "bg-emerald-500" : "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500">{r.d}</p>
                  <p className="text-sm font-semibold text-[#052443]">{r.t}</p>
                  <p className={`text-[11px] font-semibold ${r.v.startsWith("Verified") ? "text-emerald-700" : "text-slate-500"}`}>{r.v}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{r.c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Model insights */}
      <section id="insights" className="py-16 sm:py-20 bg-[#052443] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300">
              <LineChart className="w-4 h-4" /> Model insights
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold">Learn from every boat like yours</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Bosun starts from what marine technicians already know about each model, like power steering pumps on the
              Sea Ray SDX 250, and every job logged on the platform sharpens the picture. When the same part keeps getting
              replaced on the same make, model and engine, it's flagged as a common failure point, and owners get a
              heads-up before it happens to them.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {[
                "Catch known weak spots at your next service, not when they fail offshore",
                "Plan and budget for the jobs boats like yours usually need next",
                "Shopping for a boat? See what tends to go wrong on that model before you buy",
                "Know which spare is worth carrying aboard",
              ].map((t) => (
                <li key={t} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-sky-300 shrink-0" /> {t}</li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-slate-400">
              Insights come from patterns across many boats. Your own records stay private to you and the shops you work with.
            </p>
          </div>
          <div className="rounded-3xl bg-white text-[#052443] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">Your boat · 2020 Sea Ray SDX 250 OB</p>

            </div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Common failure point: power steering pump</p>
                  <p className="mt-1 text-sm text-slate-700">
                    A known weak spot on this model, reported by marine technicians. Ask your shop to check it at your
                    next service.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] text-slate-500">Usually due next</p>
                <p className="font-semibold">Water pump impeller</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] text-slate-500">Worth carrying aboard</p>
                <p className="font-semibold">Spare impeller kit</p>
              </div>
            </div>
            <button
              onClick={() => navigate(signupPath("boaters"))}
              className="mt-4 w-full rounded-xl bg-[#052443] text-white py-3 text-sm font-semibold hover:bg-[#0a3360]"
            >
              Add your boat
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052443] text-center">Built for boats, not generic contractors</h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-white p-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><f.icon className="w-5 h-5" /></div>
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/parts")}
            className="mt-6 w-full text-left rounded-2xl border border-sky-200 bg-white p-5 flex items-center gap-3 hover:bg-sky-50"
          >
            <Package className="w-5 h-5 text-sky-600" />
            <span className="flex-1 text-sm"><b className="text-[#052443]">Bosun Parts is coming.</b> The exact parts for your engine, at standard retail prices.</span>
            <span className="text-sm font-semibold text-sky-700">Learn more →</span>
          </button>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052443]">Ready to get your boat looked after?</h2>
          <p className="mt-3 text-slate-600">Post your first job in about two minutes. Free, and no obligation to accept a bid.</p>
          <button
            onClick={() => navigate(signupPath("boaters"))}
            className="mt-7 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-sky-500 text-white text-lg font-semibold hover:bg-sky-600"
          >
            Get started free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <MarketingFooter audience="boaters" />
    </div>
  );
}
