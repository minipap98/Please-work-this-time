import { Link, useNavigate } from "react-router-dom";
import { Anchor, Package, Store, Wallet, Wrench } from "lucide-react";

const POINTS = [
  {
    icon: Wrench,
    title: "Shops: parts without tying up cash",
    body: "Order the parts for a job through Bosun and have them shipped to the yard or straight to the boat. Less money sitting in stock on your shelves, and parts arrive already tied to the work order.",
  },
  {
    icon: Anchor,
    title: "Boaters: the parts price, out in the open",
    body: "Buy the filters, impellers, anodes and paint your boat needs at the price Bosun pays, with no markup added on top. Every part is matched to your boat and engine and logged in your Boat Log.",
  },
  {
    icon: Store,
    title: "Shops still earn on parts",
    body: "When a customer buys parts for a job you're doing, you share the commission with Bosun. You keep a parts margin without having to buy, store and finance the inventory first.",
  },
];

const STEPS = [
  { n: "1", text: "Pick the job or the boat. Bosun knows the engine, so it suggests the right part numbers." },
  { n: "2", text: "Order through Bosun. Shipping goes to the yard, the slip or your door, with tracking on the job." },
  { n: "3", text: "Parts land on the work order and in the Boat Log automatically. No re-keying, no lost receipts." },
];

export default function PartsComingSoon() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Bosun</span>
          </Link>
          <button onClick={() => navigate("/login?mode=signup")} className="text-sm font-semibold px-4 py-2 rounded-lg bg-foreground text-background">
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
          Marine parts bought directly through Bosun. Boaters pay no markup, shops carry less inventory,
          and every part is tied to the boat it's for.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate("/login?mode=signup")} className="px-6 py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600">
            Get early access
          </button>
          <Link to="/" className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-muted">
            Back to Bosun
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Create a free account and you'll be first to know when Parts opens in your area.</p>
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
        <Wallet className="w-8 h-8 mx-auto text-sky-600" />
        <h2 className="mt-3 text-xl font-bold">Run a shop?</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          We're lining up launch partners: yards that want parts without the carrying cost and a share of every parts order
          on their jobs. Sign up as a vendor and tell us what you stock most.
        </p>
        <button onClick={() => navigate("/login?mode=signup")} className="mt-5 px-6 py-3 rounded-xl bg-foreground text-background font-semibold">
          Become a launch partner
        </button>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Bosun Parts is in development. Pricing, availability and commission terms will be announced at launch.
      </footer>
    </div>
  );
}
