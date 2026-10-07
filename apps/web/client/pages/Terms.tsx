import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight">Bosun</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-6 text-sm leading-relaxed text-foreground">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: August 25, 2026</p>
        <p>
          Bosun is a marketplace that connects boat owners with marine service vendors.
          These terms govern use of the Bosun website and app. By creating an account you
          agree to them.
        </p>
        <h2 className="text-lg font-semibold pt-4">Accounts</h2>
        <p>
          You must provide accurate information and keep your login secure. You are
          responsible for activity under your account. Owners post jobs for boats they
          are authorized to service. Vendors represent that they are legally able to
          perform the work they bid on, including licenses and insurance where required.
        </p>
        <h2 className="text-lg font-semibold pt-4">Jobs, bids, and payments</h2>
        <p>
          Posting a job does not obligate you to accept a bid. Accepting a bid and paying
          through Bosun creates a contract between the owner and the vendor. Bosun is not
          the marine contractor. Platform fees are disclosed before payment. Chargebacks,
          refunds, and disputes are handled in good faith; Bosun may hold or reverse
          payouts when fraud or non-performance is reported.
        </p>
        <h2 className="text-lg font-semibold pt-4">Prohibited use</h2>
        <p>
          Do not post false jobs, manipulate ratings, scrape the service, or use Bosun
          for anything illegal. We may suspend accounts that violate these terms.
        </p>
        <h2 className="text-lg font-semibold pt-4">Liability</h2>
        <p>
          Marine work involves risk. Vendors are independent. Bosun is not liable for
          workmanship, delays, or vessel damage except to the extent required by law.
          The service is provided “as is.”
        </p>
        <p className="text-muted-foreground pt-4">
          These terms are a starting point for launch and should be reviewed by counsel
          before taking live payments.
        </p>
        <p>
          Questions: <a className="underline" href="mailto:hello@bosun.app">hello@bosun.app</a>
        </p>
      </main>
    </div>
  );
}
