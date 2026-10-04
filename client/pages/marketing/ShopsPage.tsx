import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, Boxes, CalendarDays, Check, ChevronRight, ClipboardList, FileSpreadsheet,
  Mail, Smartphone, Sun, Users,
} from "lucide-react";
import { MarketingFooter, MarketingNav, signupPath, useStartDemo } from "@/components/marketing/MarketingChrome";

const TOOLS = [
  { icon: Sun, title: "Today screen", body: "Open Bosun and see what needs you: double-bookings, parts that arrived, late deliveries, low stock and jobs ready to invoice, each one tap from done." },
  { icon: ClipboardList, title: "Work orders", body: "Labor, parts and fees on one ticket with tax, engine hours and notes. Put a job you won on Bosun on the board in one click." },
  { icon: CalendarDays, title: "Bay and tech schedule", body: "A week view by bay or by tech that flags double-bookings before the boat shows up." },
  { icon: Boxes, title: "Live inventory", body: "Stock updates on every device as parts go onto work orders or come off the truck. Reorder points tell you before you run out." },
  { icon: Mail, title: "Parts tracking from your inbox", body: "Forward supplier and carrier emails to your Bosun address. Tracking numbers, delivery dates and the boat each part is for are filled in for you." },
  { icon: FileSpreadsheet, title: "QuickBooks export", body: "Completed work orders export as invoices for QuickBooks Online or Desktop, with labor and parts on separate lines." },
];

const CREW = [
  { icon: Smartphone, title: "Techs get their own login", body: "Each tech sees only their jobs: the day's list, parts to pull with bin locations, and Start, Done and Add note buttons on their phone." },
  { icon: Users, title: "Managers run the board", body: "Give your service writer or shop manager the whole board, inventory and parts, without QuickBooks or shop settings." },
  { icon: BookOpen, title: "Work that sells your shop", body: "Finished Bosun jobs land in the owner's Boat Log as verified by your shop, with your notes. Customers remember who kept their records straight." },
];

export default function ShopsPage() {
  const navigate = useNavigate();
  const startDemo = useStartDemo();

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav audience="shops" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#052443] text-white">
        <div className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-sky-200">
              For marine service shops, yards and mobile techs
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
              Run your yard on Bosun.
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
              Work orders, the bay schedule, live inventory, parts tracking and QuickBooks export in one place, built for
              how marine shops actually work. New jobs from boat owners nearby come built in.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(signupPath("shops"))}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#052443] font-semibold hover:bg-sky-50"
              >
                Create your shop account <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => startDemo("shops")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/25 font-semibold hover:bg-white/10"
              >
                See a demo shop <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              {["Free to join", "Set up in an afternoon", "Works on the phone in your pocket"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-sky-300" /> {t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#052443]">Everything the front counter and the shop floor need</h2>
            <p className="mt-3 text-slate-600">Replace the whiteboard, the parts spreadsheet and the stack of carrier emails.</p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((t) => (
              <div key={t.title} className="rounded-2xl border border-border p-6 hover:border-sky-200 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-[#052443] text-sky-300 flex items-center justify-center"><t.icon className="w-5 h-5" /></div>
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{t.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Crew */}
      <section id="crew" className="py-16 sm:py-20 bg-slate-50/70 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#052443]">Your whole crew, on the same page</h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {CREW.map((c) => (
              <div key={c.title} className="rounded-2xl bg-white border border-border p-6">
                <c.icon className="w-6 h-6 text-sky-600" />
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New jobs */}
      <section id="jobs" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">New jobs, matched to your schedule</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#052443]">Fill the open days on your board</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Boat owners near you post jobs on Bosun. Instead of a lead list, you see the few that fit: the next open bay
              that could take the job, and how many like it you've already done. Bid with line items in a minute, or set
              auto-bid templates for the services you do every week.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {["Jobs ranked by fit, not posted date", "Owner details shared once you win", "Won jobs go straight onto your board"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border shadow-sm p-5 space-y-3">
            {[
              { t: "Bottom paint before season", fit: "Fits Tue, Oct 6 · Haul-out", done: "You've done 6 of these" },
              { t: "Raw water impeller, Yamaha F250", fit: "Fits Wed, Oct 7 · Dockside", done: "You've done 11 of these" },
              { t: "Battery and charger upgrade", fit: "Fits Thu, Oct 8 · Bay 2", done: null },
            ].map((j) => (
              <div key={j.t} className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-[#052443]">{j.t}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">{j.fit}</span>
                  {j.done && <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">{j.done}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-[#052443] text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Put your shop on Bosun this week</h2>
          <p className="mt-3 text-slate-300">
            Free to join. Add your bays, techs and the parts you stock, and you're running. Bosun's fee applies only to
            jobs you win through the marketplace.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(signupPath("shops"))}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#052443] text-lg font-semibold hover:bg-sky-50"
            >
              Create your shop account <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => startDemo("shops")} className="px-6 py-4 rounded-xl border border-white/25 font-semibold hover:bg-white/10">
              See a demo shop
            </button>
          </div>
        </div>
      </section>

      <MarketingFooter audience="shops" />
    </div>
  );
}
