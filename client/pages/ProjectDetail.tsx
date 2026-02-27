import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { PROJECTS, VENDOR_PAST_PROJECTS } from "@/data/projectData";

const STAR_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Stars({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
      <span className="text-xs text-muted-foreground ml-0.5">
        {rating} ({reviewCount.toLocaleString()})
      </span>
    </div>
  );
}

function StarPicker({
  value,
  hover,
  onHover,
  onLeave,
  onClick,
}: {
  value: number;
  hover: number;
  onHover: (n: number) => void;
  onLeave: () => void;
  onClick: (n: number) => void;
}) {
  const active = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => onHover(star)}
          onMouseLeave={onLeave}
          onClick={() => onClick(star)}
          className="focus:outline-none"
          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              star <= active ? "text-amber-400" : "text-gray-200"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const project = PROJECTS.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-muted-foreground">Project not found.</p>
        </main>
      </div>
    );
  }

  const chosenBid = project.chosenBidId
    ? project.bids.find((b) => b.id === project.chosenBidId)
    : null;

  const invoiceTotal = project.invoice
    ? project.invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : 0;

  // Rating state — persisted to localStorage per project
  const ratingKey = `vendor_rating_${project.id}`;
  const savedRating = (() => {
    try { return JSON.parse(localStorage.getItem(ratingKey) ?? "null"); } catch { return null; }
  })();
  const [expandedBid, setExpandedBid] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(savedRating?.stars ?? 0);
  const [ratingComment, setRatingComment] = useState<string>(savedRating?.comment ?? "");
  const [hoverStar, setHoverStar] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(!!savedRating);

  function submitRating() {
    if (!ratingValue) return;
    localStorage.setItem(ratingKey, JSON.stringify({ stars: ratingValue, comment: ratingComment }));
    setRatingSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Project header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-2xl font-semibold text-foreground">{project.title}</h1>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded flex-shrink-0 capitalize ${
                project.status === "active"
                  ? "bg-primary text-white"
                  : "bg-muted text-foreground"
              }`}
            >
              {project.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{project.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Posted {project.date} &middot; {project.bids.length} bid
            {project.bids.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Bids */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">
            {project.status === "completed" ? "All Bids" : "Bids Received"}
          </h2>

          <div className="space-y-4">
            {project.bids.map((bid) => {
              const isChosen = bid.id === project.chosenBidId;
              return (
                <div
                  key={bid.id}
                  className={`border rounded-lg p-5 transition-colors ${
                    isChosen
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: avatar + vendor info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {bid.vendorInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {bid.vendorName}
                          </span>
                          {isChosen && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Chosen
                            </span>
                          )}
                        </div>
                        <Stars rating={bid.rating} reviewCount={bid.reviewCount} />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {bid.submittedDate}
                        </p>
                      </div>
                    </div>

                    {/* Right: price + action */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-foreground">
                        ${bid.price.toLocaleString()}
                      </div>
                      {project.status === "active" && (
                        <button className="mt-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                          Accept Bid
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t border-border/50 pt-3">
                    {bid.message}
                  </p>

                  {/* Past work toggle */}
                  {VENDOR_PAST_PROJECTS[bid.vendorName] && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${expandedBid === bid.id ? "rotate-90" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {expandedBid === bid.id ? "Hide" : "View"} past work ({VENDOR_PAST_PROJECTS[bid.vendorName].length})
                      </button>

                      {expandedBid === bid.id && (
                        <div className="mt-4 space-y-4">
                          {VENDOR_PAST_PROJECTS[bid.vendorName].map((project, i) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-4">
                              {/* Project title + date */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm font-semibold text-foreground">{project.title}</p>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{project.completedDate}</span>
                              </div>

                              {/* Boat + engine */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12l4-4m-4 4l4 4" />
                                  </svg>
                                  {project.boatInfo}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {project.engineInfo}
                                </span>
                              </div>

                              {/* Review */}
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 flex gap-0.5 mt-0.5">
                                  {[1,2,3,4,5].map((s) => (
                                    <svg key={s} className={`w-3 h-3 ${s <= project.review.stars ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                      <path d={STAR_PATH} />
                                    </svg>
                                  ))}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                                    "{project.review.comment}"
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">— {project.review.reviewer}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Rate the vendor — completed projects only */}
        {project.status === "completed" && chosenBid && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-foreground mb-4">Rate Your Experience</h2>
            <div className="border border-border rounded-lg p-6">
              {/* Vendor row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {chosenBid.vendorInitials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{chosenBid.vendorName}</p>
                  <p className="text-xs text-muted-foreground">Chosen vendor for this project</p>
                </div>
              </div>

              {ratingSubmitted ? (
                /* Submitted state */
                <div className="flex flex-col items-start gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-6 h-6 ${star <= ratingValue ? "text-amber-400" : "text-gray-200"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d={STAR_PATH} />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{ratingValue} / 5</span>
                    <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                      Submitted
                    </span>
                  </div>
                  {ratingComment && (
                    <p className="text-sm text-muted-foreground italic">"{ratingComment}"</p>
                  )}
                  <button
                    onClick={() => setRatingSubmitted(false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Edit rating
                  </button>
                </div>
              ) : (
                /* Rating form */
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      How would you rate this vendor?
                    </p>
                    <StarPicker
                      value={ratingValue}
                      hover={hoverStar}
                      onHover={setHoverStar}
                      onLeave={() => setHoverStar(0)}
                      onClick={setRatingValue}
                    />
                    {ratingValue > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {["", "Poor", "Fair", "Good", "Very good", "Excellent"][ratingValue]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Comments{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Share your experience with this vendor…"
                      rows={3}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={submitRating}
                    disabled={!ratingValue}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit Rating
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Invoice — completed projects only */}
        {project.status === "completed" && project.invoice && chosenBid && (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-foreground mb-4">Invoice</h2>

            <div className="border border-border rounded-lg overflow-hidden">
              {/* Invoice header bar */}
              <div className="bg-muted/40 px-6 py-4 flex items-start justify-between gap-4 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">{chosenBid.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {project.invoice.invoiceNumber}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-0.5">
                  <p>Issued: {project.invoice.issuedDate}</p>
                  <p className="text-green-600 font-semibold">
                    Paid: {project.invoice.paidDate}
                  </p>
                </div>
              </div>

              {/* Line items table */}
              <div className="px-6 py-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                      <th className="text-left pb-2.5">Description</th>
                      <th className="text-center pb-2.5 w-14">Qty</th>
                      <th className="text-right pb-2.5 w-28">Unit Price</th>
                      <th className="text-right pb-2.5 w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-3 text-foreground">{item.description}</td>
                        <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="py-3 text-right text-muted-foreground">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-medium text-foreground">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td colSpan={3} className="pt-4 text-right text-sm font-semibold text-foreground">
                        Total
                      </td>
                      <td className="pt-4 text-right text-lg font-bold text-foreground">
                        ${invoiceTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Download button */}
              <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
