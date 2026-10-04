import { Link, useNavigate } from "react-router-dom";
import { BosunLogo } from "@/components/marketing/BosunLogo";
import { BookOpen, Package, Search, Tag, Wrench } from "lucide-react";

const POINTS = [
  {
    icon: Search,
    title: "The right part, the first time",
    body: "Bosun already knows your boat and engine. Pick the job, whether it's an oil change, impeller, anodes or fuel filters, and see the exact parts that fit, with quantities.",
  },
  {
    icon: Tag,
    title: "Straightforward pricing",
    body: "Parts sold at the manufacturer's suggested retail price. No guessing between near-identical listings or hunting through part diagrams.",
  },
  {
    icon: BookOpen,
    title: "Logged for you",
    body: "Your order goes straight into your Boat Log, so the next owner, your surveyor or your insurer can see what was replaced and when.",
  },
];

const STEPS = [
  { n: "1", text: "Choose your boat and the job you're doing yourself." },
  { n: "2", text: "Bosun lists the parts that fit your engine, matched by model and serial range." },
  { n: "3", text: "Order and get it shipped to your door, slip or marina." },
  { n: "4", text: "When you finish the job, it's already in your Boat Log." },
];

export default function PartsComingSoon() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/boaters" aria-label="Bosun for boaters">
            <BosunLogo className="h-5 sm:h-6" />
          </Link>
          <button onClick={() => navigate("/login?mode=signup&role=owner")} className="text-sm font-semibold px-4 py-2 rounded-lg bg-foreground text-background">
            Get early access
          </button>
        </div>
      </nav>

      <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-full px-3 py-1">
          <Package className="w-3.5 h-3.5" /> Coming soon
        </span>
        <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-foreground">Bosun Parts</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Doing the work yourself? Bosun will tell you exactly which parts fit your boat and engine,
          let you order them in one place, and log the job when you're done.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate("/login?mode=signup&role=owner")} className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600">
            Get early access
          </button>
          <Link to="/boaters" className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-muted">
            Back to Bosun
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Create a free account and add your boat. You'll be first to know when Parts opens.</p>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14 grid gap-4 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="border border-border rounded-2xl p-5">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      <section className="bg-slate-50 border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="text-xl font-bold text-center">How it will work</h2>
          <ol className="mt-6 space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3 bg-white border border-border rounded-xl p-4">
                <span className="w-7 h-7 shrink-0 rounded-full bg-foreground text-background text-sm font-bold flex items-center justify-center">{s.n}</span>
                <p className="text-sm text-foreground leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <Wrench className="w-8 h-8 mx-auto text-sky-600" />
        <h2 className="mt-3 text-xl font-bold">Rather have a pro do it?</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Post the job on Bosun and get bids from local, insured marine shops. Their work lands in your Boat Log too.
        </p>
        <button onClick={() => navigate("/login?mode=signup&role=owner")} className="mt-5 px-6 py-3 rounded-xl bg-foreground text-background font-semibold">
          Post a job
        </button>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Bosun Parts is in development. Catalog, brands and shipping areas will be announced at launch.
      </footer>
    </div>
  );
}
