import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight">Bosun</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-6 text-sm leading-relaxed text-foreground">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: August 25, 2026</p>
        <p>
          Bosun collects the information you give us (name, email, boat details, job
          photos, messages, and payment metadata) so we can operate the marketplace.
        </p>
        <h2 className="text-lg font-semibold pt-4">What we use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account and profile data to authenticate you and show the right dashboard</li>
          <li>Job, bid, and message content to match owners with vendors</li>
          <li>Payment details processed by Stripe — we do not store full card numbers</li>
          <li>Device and log data to keep the product reliable and secure</li>
        </ul>
        <h2 className="text-lg font-semibold pt-4">Sharing</h2>
        <p>
          We share job details with vendors who can bid, and share vendor bids with the
          owner who posted the job. We use subprocessors such as Supabase (database/auth)
          and Stripe (payments). We do not sell personal information.
        </p>
        <h2 className="text-lg font-semibold pt-4">Your choices</h2>
        <p>
          You can update profile data in Settings and request deletion by emailing
          hello@bosun.app. Some records (invoices, dispute history) may be retained as
          required by law.
        </p>
        <p>
          Contact: <a className="underline" href="mailto:hello@bosun.app">hello@bosun.app</a>
        </p>
      </main>
    </div>
  );
}
