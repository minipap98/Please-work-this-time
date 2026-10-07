import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, BarChart3, BookOpen, Boxes, CalendarDays, Check, ChevronRight, ClipboardList, Compass,
  FileSpreadsheet, Mail, MapPin, Receipt, Smartphone, Sun, Users,
} from "lucide-react";
import { MarketingFooter, MarketingNav, signupPath, useStartDemo } from "@/components/marketing/MarketingChrome";
import { FIRST_JOB_BAND, FIRST_JOB_RATE, FIRST_YEAR_BANDS, PLANS, firstYearFees, money, pct } from "@shared/pricing";

const STEPS = [
  { n: 1, title: "Set up your shop", body: "Your location, how far you travel, the services you do, your bays and techs. Ten minutes." },
  { n: 2, title: "Bid on jobs that fit", body: "Boat owners nearby post work. You see the ones that fit your open days, bid with line items in a minute." },
  { n: 3, title: "Run it on the same app", body: "Won jobs land on your board. Work orders, parts, inventory and QuickBooks, with your crew on their phones." },
];

const TOOLS = [
  { icon: Sun, title: "Today screen", body: "Open Bosun and see what needs you: parts that arrived, late deliveries, low stock and jobs ready to invoice, each one tap from done." },
  { icon: ClipboardList, title: "Work orders", body: "Labor, parts and fees on one ticket with tax, engine hours and notes. A job you won on Bosun goes on the board in one click." },
  { icon: CalendarDays, title: "Bay and tech schedule", body: "A week view by bay or by tech that flags double-bookings before the boat shows up." },
  { icon: Boxes, title: "Live inventory", body: "Stock updates on every device as parts go onto work orders or come off the truck. Reorder points tell you before you run out." },
  { icon: Mail, title: "Parts tracking from your inbox", body: "Forward supplier and carrier emails to your Bosun address. Tracking numbers, delivery dates and the boat each part is for are filled in." },
  { icon: FileSpreadsheet, title: "QuickBooks export", body: "Completed work orders export as invoices for QuickBooks Online or Desktop, with labor and parts on separate lines." },
];

const CREW = [
  { icon: Smartphone, title: "Techs get their own login", body: "Each tech sees only their jobs: the day's list, parts to pull with bin locations, and Start, Done and Add note buttons on their phone." },
  { icon: Users, title: "Managers run the board", body: "Give your service writer or shop manager the whole board, inventory and parts, without QuickBooks or shop settings." },
  { icon: BookOpen, title: "Work that sells your shop", body: "Finished jobs land in the owner's Boat Log as verified by your shop, with your notes. Customers remember who kept their records straight." },
];


export default function ShopsPage() {
  const navigate = useNavigate();
  const startDemo = useStartDemo();

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav audience="shops" />

      {/* Hero: copy left, the Today screen right */}
      <section className="relative overflow-hidden bg-[#052443] text-white">
        <div className="absolute -top-32 -right-24 w-[560px] h-[560px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[420px] h-[420px] rounded-full bg-sky-400/5 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-sky-200">
              For marine service shops, yards and mobile techs
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.08]">
              New customers, <span className="text-sky-300">straight to your board.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
              Boat owners near you post the work they need. You see the jobs that fit your open days, bid in a minute,
              and won jobs land on your schedule. Then run the whole shop on the same app.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3 [&>button]:whitespace-nowrap">
              <button
                onClick={() => navigate(signupPath("shops"))}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-sky-400 text-[#052443] font-semibold hover:bg-sky-300 shadow-lg shadow-sky-500/20"
              >
                Create your shop account <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => startDemo("shops")}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-white/25 font-semibold hover:bg-white/10"
              >
                See the demo shop <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              {[`${money(PLANS[0].monthly)} a month, every tool included`, "A fee only on customers we bring you", "Repeat work is yours, no fee"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-sky-300" /> {t}</span>
              ))}
            </div>
          </div>
          <TodayMock />
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <H2>Set up once. Jobs find you.</H2>
          </div>
          <ol className="mt-10 grid sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <li key={s.n} className="relative rounded-2xl border border-border bg-white p-6">
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#052443] text-sky-300 text-sm font-bold">{s.n}</span>
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* New customers */}
      <section id="jobs" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Eyebrow>A new customer stream</Eyebrow>
            <H2>Boat owners bring the work. You pick what fits.</H2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Every job posted near you is a customer you didn't have to find. Instead of a lead list, you see the few
              that fit: how far away, the next open bay that could take it, and how many like it you've already done.
              Bid with line items in a minute, or set auto-bid templates for the services you do every week.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {[
                "Jobs ranked by fit and distance, not posted date",
                "Owner contact details shared once you win",
                "Won jobs go straight onto your board",
                "Do good work and they come back: their Boat Log remembers who did it",
              ].map((t) => (
                <li key={t} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" /> {t}</li>
              ))}
            </ul>
          </div>
          <JobsMock />
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Shop tools, included</Eyebrow>
            <H2>And everything to run the work you win</H2>
            <p className="mt-3 text-slate-600">Replace the whiteboard, the parts spreadsheet and the stack of carrier emails.</p>
          </div>
          <WorkOrderMock />
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((t) => (
              <div key={t.title} className="rounded-2xl border border-border bg-white p-6 hover:border-sky-200 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-[#052443] text-sky-300 flex items-center justify-center"><t.icon className="w-5 h-5" /></div>
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{t.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insights */}
      <section id="insights" className="py-16 sm:py-20 bg-[#052443] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300">
              <BarChart3 className="w-4 h-4" /> Insights
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold">Know where you stand</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Every shop on Bosun bids on the same jobs, so you can finally see your market: your acceptance rate against
              other shops, whether your prices run high or low on the same work, and how often you win when you're not
              the cheapest. No other shop's price is ever shown, and yours isn't either.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {[
                "Acceptance rate, yours versus the market",
                "Your price against other bids on the same jobs",
                "Win rate when you're lowest versus when you're not",
                "Broken down by job type, so you know where to sharpen",
              ].map((t) => (
                <li key={t} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 text-sky-300 shrink-0" /> {t}</li>
              ))}
            </ul>
          </div>
          <InsightsMock />
        </div>
      </section>

      {/* Crew */}
      <section id="crew" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Your crew</Eyebrow>
            <H2>Everyone on the same page, from their own phone</H2>
          </div>
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {CREW.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border bg-white p-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"><c.icon className="w-5 h-5" /></div>
                <h3 className="mt-4 text-base font-semibold text-[#052443]">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Pricing</Eyebrow>
            <H2>One subscription. A fee only on the customers we bring you.</H2>
            <p className="mt-3 text-slate-600">
              The software is a flat monthly price. The marketplace charges a fee on a new customer's first year with you, and
              nothing after that. Your existing customers are never charged.
            </p>
          </div>

          <div className="mt-10 grid lg:grid-cols-[1fr_1fr_1.25fr] gap-5">
            {PLANS.map((p, i) => (
              <div key={p.key} className={i === 1 ? "rounded-2xl bg-[#052443] text-white p-6 shadow-lg flex flex-col" : "rounded-2xl bg-white border border-border p-6 flex flex-col"}>
                <p className={i === 1 ? "text-xs font-bold uppercase tracking-wider text-sky-300" : "text-xs font-bold uppercase tracking-wider text-sky-700"}>{p.name}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums">{money(p.monthly)}</span>
                  <span className={i === 1 ? "text-sm text-slate-300" : "text-sm text-slate-500"}>per month</span>
                </p>
                <p className={i === 1 ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-600"}>{p.tagline}</p>
                <ul className={i === 1 ? "mt-5 space-y-2 text-sm text-slate-200 flex-1" : "mt-5 space-y-2 text-sm text-slate-700 flex-1"}>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className={i === 1 ? "w-4 h-4 mt-0.5 text-sky-300 shrink-0" : "w-4 h-4 mt-0.5 text-emerald-500 shrink-0"} /> {f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(signupPath("shops"))}
                  className={i === 1 ? "mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#052443] text-sm font-semibold hover:bg-sky-50" : "mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#052443] text-white text-sm font-semibold hover:bg-[#0a3360]"}
                >
                  Start with {p.name} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* The marketplace fee */}
            <div className="rounded-2xl bg-white border border-border p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700 inline-flex items-center gap-1.5"><Receipt className="w-4 h-4" /> New-customer fee</p>
              <p className="mt-2 text-lg font-semibold text-[#052443] leading-snug">Charged on a customer's first year with you. Then they're yours.</p>
              <table className="mt-4 w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr><td className="py-2 text-slate-700">Their first job</td><td className="py-2 text-right font-semibold tabular-nums text-[#052443]">{pct(FIRST_JOB_RATE)}</td></tr>
                  <tr><td className="py-2 text-slate-700">The rest of their first year</td><td className="py-2 text-right font-semibold tabular-nums text-[#052443]">{pct(FIRST_YEAR_BANDS[0].rate)}</td></tr>
                  {FIRST_YEAR_BANDS.slice(1).map((b, i) => (
                    <tr key={b.upTo}><td className="py-2 text-slate-500">Once their year passes {money(FIRST_YEAR_BANDS[i].upTo)}</td><td className="py-2 text-right tabular-nums text-slate-600">{pct(b.rate)}</td></tr>
                  ))}
                  <tr><td className="py-2 font-semibold text-emerald-700">After 12 months</td><td className="py-2 text-right font-bold tabular-nums text-emerald-700">0%</td></tr>
                </tbody>
              </table>
              <FeeExample />
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" /> Shown on every bid before you send it, so it's in your price.</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" /> Charged only when the owner pays through Bosun. Standard card processing applies.</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" /> The {pct(FIRST_JOB_RATE)} covers the first {money(FIRST_JOB_BAND)} of a first job; a bigger one drops to {pct(FIRST_YEAR_BANDS[0].rate)} past that.</li>
              </ul>
            </div>
          </div>

          {/* Why it pays to keep the work on Bosun */}
          <div className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-6 grid md:grid-cols-[auto_1fr] gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-white text-sky-700 border border-sky-200 flex items-center justify-center"><BadgeCheck className="w-5 h-5" /></div>
            <div>
              <p className="text-base font-semibold text-[#052443]">Why the owner wants the job on Bosun too</p>
              <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                Every job you finish through Bosun lands in the owner's Boat Log stamped <span className="font-semibold">verified by your shop</span>, with
                your notes and line items. Work done off the books isn't verified, and owners can see the difference when they sell the boat or
                hand a surveyor the history. Their record is the reason they keep coming back to you on Bosun, and after the first year that costs you nothing.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Launching in South Florida. Our founding shops are on us for the pilot; ask when you sign up.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <H2>Start getting new customers this week</H2>
          <p className="mt-3 text-slate-600">
            Add your bays, techs and the parts you stock, and you're running. {money(PLANS[0].monthly)} a month for the whole shop, and a fee
            only on the customers Bosun brings you.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(signupPath("shops"))}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#052443] text-white text-lg font-semibold hover:bg-[#0a3360]"
            >
              Create your shop account <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => startDemo("shops")} className="px-6 py-4 rounded-xl border border-border bg-white font-semibold text-[#052443] hover:bg-slate-100">
              See the demo shop
            </button>
          </div>
        </div>
      </section>

      <MarketingFooter audience="shops" />
    </div>
  );
}

/** A worked example, computed from the schedule so the copy can't drift from the numbers. */
function FeeExample() {
  const jobs = [1500, 1500];
  const fees = firstYearFees(jobs);
  const total = fees.reduce((a, b) => a + b, 0);
  return (
    <div className="mt-4 rounded-xl bg-slate-50 border border-border p-3 text-xs text-slate-700 leading-relaxed">
      <span className="font-semibold text-[#052443]">Example.</span> A new owner books a {money(jobs[0])} service, then a {money(jobs[1])} haul-out
      six months later: {money(fees[0])} + {money(fees[1])} = <span className="font-semibold text-[#052443]">{money(total)}</span>. Their next
      job after the first year: <span className="font-semibold text-emerald-700">$0</span>.
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold uppercase tracking-wider text-sky-700">{children}</span>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#052443]">{children}</h2>;
}

/* ── Product previews (static) ─────────────────────────────────────────── */

function TodayMock() {
  return (
    <div className="relative">
      <div className="rounded-3xl bg-white text-[#052443] p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Good morning, Dean's Marine</p>
            <p className="text-[11px] text-slate-500">Monday · 3 jobs on the board</p>
          </div>
          <span className="text-[11px] font-semibold rounded-lg bg-[#052443] text-white px-2.5 py-1.5">+ Work order</span>
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Needs you now</p>
        <div className="mt-2 space-y-2">
          {[
            ["bg-red-500", "Anode kit backordered · Reel Therapy", "Call supplier"],
            ["bg-amber-400", "1 completed job not in QuickBooks", "Export"],
            ["bg-amber-400", "3 parts at reorder point", "Reorder"],
          ].map(([dot, text, action]) => (
            <div key={text} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="flex-1 text-xs truncate">{text}</span>
              <span className="text-[11px] font-semibold rounded-md border border-border px-2 py-0.5">{action}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today</p>
            <p className="mt-1 text-xs font-semibold">300-hour service, twin Verado</p>
            <p className="text-[11px] text-slate-500">8:00 · Bay 1 · Marco</p>
            <p className="mt-2 text-xs font-semibold">Bottom paint + zincs</p>
            <p className="text-[11px] text-slate-500">9:30 · Haul-out · Luis</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Arriving today</p>
            <p className="mt-1 text-xs font-semibold">Impeller kit, Yamaha F250</p>
            <p className="text-[11px] text-slate-500">for 2019 Grady-White 236</p>
            <span className="mt-2 inline-block text-[11px] font-semibold rounded-md bg-emerald-600 text-white px-2 py-1">Check in</span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-3 hidden sm:block rounded-2xl bg-sky-400 text-[#052443] px-4 py-3 shadow-xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#052443]/70">Ready to invoice</p>
        <p className="text-xl font-bold tabular-nums">$2,374</p>
      </div>
    </div>
  );
}

function JobsMock() {
  const jobs = [
    { t: "Bottom paint before season", boat: "2018 Boston Whaler 280", miles: "2.5 mi", fit: "Fits Tue · Haul-out", done: "You've done 6 of these", bids: 2 },
    { t: "Raw water impeller, Yamaha F250", boat: "2019 Grady-White 236", miles: "6 mi", fit: "Fits Wed · Dockside", done: "You've done 11 of these", bids: 1 },
    { t: "Battery and charger upgrade", boat: "2021 Sea Ray SDX 270", miles: "9 mi", fit: "Fits Thu · Bay 2", done: null, bids: 0 },
  ];
  return (
    <div className="rounded-3xl bg-white border border-border shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#052443]">Jobs near you</p>
        <span className="text-[11px] text-slate-500">Within 25 mi · ranked by fit</span>
      </div>
      {jobs.map((j) => (
        <div key={j.t} className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#052443]">{j.t}</p>
              <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                {j.boat} · <MapPin className="w-3 h-3" /> {j.miles}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold rounded-lg bg-sky-500 text-white px-2.5 py-1.5">Bid now</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">{j.fit}</span>
            {j.done && <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">{j.done}</span>}
            <span className="text-[11px] text-slate-500 rounded-full border border-border px-2 py-0.5">{j.bids} bid{j.bids === 1 ? "" : "s"} so far</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkOrderMock() {
  return (
    <div className="mt-10 rounded-3xl border border-border bg-slate-50 p-4 sm:p-6">
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border text-sm overflow-x-auto">
          {["Work orders", "Schedule", "Inventory", "Parts inbound", "QuickBooks"].map((t, i) => (
            <span key={t} className={i === 0 ? "font-semibold text-sky-700 border-b-2 border-sky-500 pb-2 -mb-3 whitespace-nowrap" : "text-slate-500 whitespace-nowrap"}>{t}</span>
          ))}
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-500">WO-1041</span>
              <span className="text-[11px] font-semibold rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5">In progress</span>
              <span className="text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">Parts 3/3 in</span>
              <span className="text-[11px] font-semibold rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5">Won on Bosun</span>
            </div>
            <p className="mt-1.5 text-base font-semibold text-[#052443]">300-hour service, twin Verado 300</p>
            <p className="text-sm text-slate-500">Dana Whitfield · 2021 Grady-White Canyon 336 · Reel Therapy</p>
            <p className="text-sm text-slate-500">Mon, Oct 5 → Tue, Oct 6 · Bay 1 · Marco</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {[["Labor", "7 hrs · $1,155"], ["Parts", "6 lines · $303.95"], ["Total", "$1,458.95"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 border border-border px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="font-semibold text-[#052443] tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex md:flex-col gap-2 md:justify-center">
            <span className="text-xs font-semibold rounded-lg bg-[#052443] text-white px-3 py-2 text-center">Mark done</span>
            <span className="text-xs font-semibold rounded-lg border border-border px-3 py-2 text-center">Export to QuickBooks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsMock() {
  const rows = [
    ["Engine service", "50%", "26%", "7% above"],
    ["Mechanical", "50%", "27%", "23% above"],
    ["Bottom work", "33%", "28%", "At market"],
  ];
  return (
    <div className="rounded-3xl bg-white text-[#052443] p-5 shadow-xl">
      <div className="flex items-start gap-2 rounded-xl bg-sky-50 border border-sky-200 p-3 text-sm text-sky-900">
        <Compass className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
        Price decides your jobs: you win 83% when you're the lowest bid and 22% when you're not.
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[["Acceptance", "47%", "market 27%"], ["Your price", "11% above", "same jobs"], ["Lowest bid", "40%", "of jobs"]].map(([k, v, s]) => (
          <div key={k} className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${v.includes("above") ? "text-amber-600" : ""}`}>{v}</p>
            <p className="text-[11px] text-slate-500">{s}</p>
          </div>
        ))}
      </div>
      <table className="mt-4 w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500">
          <tr><th className="text-left py-1 font-bold">Job type</th><th className="text-right font-bold">You</th><th className="text-right font-bold">Market</th><th className="text-right font-bold">Price</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([a, b, c, d]) => (
            <tr key={a}>
              <td className="py-2 font-medium">{a}</td>
              <td className="py-2 text-right tabular-nums">{b}</td>
              <td className="py-2 text-right tabular-nums text-slate-500">{c}</td>
              <td className={`py-2 text-right font-semibold ${d.includes("above") ? "text-amber-600" : "text-slate-600"}`}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-slate-500">Sample numbers. Market figures appear once 3+ other shops bid on a job type.</p>
    </div>
  );
}
