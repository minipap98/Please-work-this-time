import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor, Shield, Zap, Star, ChevronRight, ArrowRight, Check, MapPin, Clock, Users } from "lucide-react";

const STATS = [
  { value: "2,400+", label: "Boats Serviced" },
  { value: "350+", label: "Verified Vendors" },
  { value: "4.8★", label: "Average Rating" },
  { value: "$2.1M+", label: "Jobs Completed" },
];

const HOW_IT_WORKS_OWNER = [
  {
    step: "1",
    title: "Describe Your Job",
    description: "Select your boat and engine, upload photos, and tell vendors exactly what you need. From 100-hour services to full gelcoat repairs.",
    icon: "📝",
  },
  {
    step: "2",
    title: "Get Competitive Bids",
    description: "Verified marine vendors in your area review your request and submit detailed bids with line-item pricing. Compare side by side.",
    icon: "📊",
  },
  {
    step: "3",
    title: "Book & Pay Securely",
    description: "Choose the best vendor, pay through Bosun's secure platform, and track the job from start to completion.",
    icon: "✅",
  },
];

const HOW_IT_WORKS_VENDOR = [
  {
    step: "1",
    title: "Create Your Profile",
    description: "List your services, certifications, and service area. Upload your COI and showcase past work to build credibility.",
    icon: "🔧",
  },
  {
    step: "2",
    title: "Set Up Auto-Bid Templates",
    description: "Create templates for services you specialize in — like 100-hour services on Mercury Verados. Bosun auto-bids for you when matching jobs appear.",
    icon: "⚡",
  },
  {
    step: "3",
    title: "Grow Your Business",
    description: "Win jobs, build your reputation, earn repeat clients, and track revenue through your Business Hub dashboard.",
    icon: "📈",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Verified & Insured Vendors",
    description: "Every vendor is verified with active insurance. COI documents on file. Marina compliance built in.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: Zap,
    title: "Auto-Bid Templates",
    description: "Vendors pre-set pricing for specific engines and services. Matching RFPs get instant, accurate bids.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: Anchor,
    title: "Built for Boats",
    description: "Engine-specific service menus, recall scanning, warranty tracking, and equipment management — not generic contractor tools.",
    color: "text-sky-600 bg-sky-50",
  },
  {
    icon: MapPin,
    title: "Marina, Trailer, or Mobile",
    description: "Whether your boat is in a slip, on a trailer, or needs a haul-out — vendors know the logistics before they bid.",
    color: "text-violet-600 bg-violet-50",
  },
  {
    icon: Clock,
    title: "Service History & Reminders",
    description: "Track every service on every boat. Get maintenance reminders based on manufacturer schedules and engine hours.",
    color: "text-rose-600 bg-rose-50",
  },
  {
    icon: Users,
    title: "Transparent Pricing",
    description: "Line-item bids, no hidden fees. Compare vendor pricing, ratings, and response times side by side.",
    color: "text-blue-600 bg-blue-50",
  },
];

const TESTIMONIALS = [
  {
    name: "Mike R.",
    role: "2023 Boston Whaler 280 Outrage",
    location: "Fort Lauderdale, FL",
    text: "Got three bids for my twin Verado 300 annual service within 24 hours. Ended up saving $400 compared to my old shop, and the work was flawless.",
    rating: 5,
  },
  {
    name: "Captain Dave L.",
    role: "2021 Grady-White 376 Canyon",
    location: "Miami, FL",
    text: "The auto-bid feature is genius. I posted a 100-hour service and had a certified Mercury dealer's bid before I finished my coffee.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    role: "Marine Diesel Specialists",
    location: "Palm Beach, FL",
    text: "As a vendor, Bosun has been a game-changer. The auto-bid templates save me hours. I've picked up 12 new clients in 3 months.",
    rating: 5,
  },
];

const SERVICE_CATEGORIES = [
  "Engine Service",
  "Detailing & Waxing",
  "Hull & Gelcoat",
  "Electronics & AV",
  "Electrical",
  "Mechanical",
  "Decking & Upholstery",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"owner" | "vendor">("owner");

  return (
    <div className="min-h-screen bg-white">
      {/* ── Sticky Nav ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Bosun</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
            <a href="#vendors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">For Vendors</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="text-sm font-semibold bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50/30" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 mb-6">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-xs font-semibold text-sky-700">South Florida's #1 Marine Services Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
              The right mechanic<br />
              for your boat.{" "}
              <span className="text-sky-500">Every time.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Post your marine service job, get competitive bids from verified vendors, and book with confidence.
              From outboard tune-ups to full engine overhauls.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
              <button
                onClick={() => navigate("/login?mode=signup")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 text-white text-base font-semibold hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
              >
                Post a Job — It's Free
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("vendors");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border text-base font-semibold text-foreground hover:bg-gray-50 transition-colors"
              >
                I'm a Vendor
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                Free to post
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                Verified vendors only
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                No obligation to accept
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section className="border-y border-border bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Categories ───────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Every service your boat needs</h2>
            <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
              From routine maintenance to major repairs, find the right specialist for the job.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => navigate("/login?mode=signup")}
                className="px-5 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How Bosun works</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Whether you own a boat or service them — Bosun makes it simple.
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white rounded-xl border border-border p-1">
              <button
                onClick={() => setActiveTab("owner")}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "owner"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                For Boat Owners
              </button>
              <button
                onClick={() => setActiveTab("vendor")}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === "vendor"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                For Vendors
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {(activeTab === "owner" ? HOW_IT_WORKS_OWNER : HOW_IT_WORKS_VENDOR).map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-border p-6 sm:p-8 text-center relative">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-xs font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Built specifically for marine services</h2>
            <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
              Not another generic contractor app. Bosun understands boats, engines, and the marine industry.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border p-6 hover:border-sky-200 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section id="testimonials" className="py-16 sm:py-20 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Trusted by boat owners & vendors</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">"{t.text}"</p>
                <div className="border-t border-border pt-3">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {t.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Vendors CTA ──────────────────────────────────── */}
      <section id="vendors" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-400/10 rounded-full blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 mb-6">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-sky-300">For Marine Vendors</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                Fill your calendar with quality jobs
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                Set up auto-bid templates for the services you specialize in. When a matching job is posted,
                Bosun bids for you — with your pricing, your message, your terms. No more chasing leads.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/login?mode=signup")}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 text-white text-base font-semibold hover:bg-sky-400 transition-colors"
                >
                  Join as a Vendor
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/vendors")}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-600 text-white text-base font-medium hover:bg-slate-700/50 transition-colors"
                >
                  Browse Vendor Profiles
                </button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto">
                <div>
                  <p className="text-2xl font-bold text-white">10%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Starting fee</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">$0</p>
                  <p className="text-xs text-slate-400 mt-0.5">To join</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">24hr</p>
                  <p className="text-xs text-slate-400 mt-0.5">Avg. response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-sky-50/50 border-t border-sky-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Ready to find the right vendor for your boat?
          </h2>
          <p className="text-base text-muted-foreground mb-8">
            Post your first project in under 2 minutes. It's free, and there's no obligation to accept any bids.
          </p>
          <button
            onClick={() => navigate("/login?mode=signup")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-sky-500 text-white text-lg font-semibold hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
                  <Anchor className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">Bosun</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                The marine services marketplace connecting boat owners with verified vendors.
              </p>
            </div>

            {/* For Owners */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">For Owners</h4>
              <ul className="space-y-2">
                <li><button onClick={() => navigate("/login?mode=signup")} className="text-sm text-slate-400 hover:text-white transition-colors">Post a Job</button></li>
                <li><button onClick={() => navigate("/vendors")} className="text-sm text-slate-400 hover:text-white transition-colors">Find Vendors</button></li>
                <li><button onClick={() => navigate("/my-boats")} className="text-sm text-slate-400 hover:text-white transition-colors">My Boats</button></li>
                <li><button onClick={() => navigate("/maintenance")} className="text-sm text-slate-400 hover:text-white transition-colors">Maintenance</button></li>
              </ul>
            </div>

            {/* For Vendors */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">For Vendors</h4>
              <ul className="space-y-2">
                <li><button onClick={() => navigate("/login?mode=signup")} className="text-sm text-slate-400 hover:text-white transition-colors">Join Bosun</button></li>
                <li><button onClick={() => navigate("/vendor-dashboard")} className="text-sm text-slate-400 hover:text-white transition-colors">Vendor Dashboard</button></li>
                <li><button onClick={() => navigate("/vendor-business")} className="text-sm text-slate-400 hover:text-white transition-colors">Business Hub</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-slate-400">About</span></li>
                <li><span className="text-sm text-slate-400">Contact</span></li>
                <li><span className="text-sm text-slate-400">Terms of Service</span></li>
                <li><span className="text-sm text-slate-400">Privacy Policy</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">© 2026 Bosun. All rights reserved.</p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              Fort Lauderdale, FL
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
