import { useState } from "react";
import { useCreateReview } from "@/hooks/use-supabase";
import { useAuth } from "@/context/AuthContext";

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

interface ReviewFormProps {
  projectId: string;
  vendorId: string;
  vendorName: string;
  vendorInitials: string;
  onSubmitted?: () => void;
}

export default function ReviewForm({
  projectId,
  vendorId,
  vendorName,
  vendorInitials,
  onSubmitted,
}: ReviewFormProps) {
  const { user } = useAuth();
  const createReview = useCreateReview();

  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStar = hoverStar || stars;

  async function handleSubmit() {
    if (!stars || !user) return;
    setError(null);

    try {
      await createReview.mutateAsync({
        project_id: projectId,
        vendor_id: vendorId,
        stars,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit review. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {vendorInitials}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{vendorName}</p>
            <p className="text-xs text-muted-foreground">Chosen vendor for this project</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  className={`w-6 h-6 ${s <= stars ? "text-amber-400" : "text-gray-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d={STAR_PATH} />
                </svg>
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">{stars} / 5</span>
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
              Submitted
            </span>
          </div>
          {comment && (
            <p className="text-sm text-muted-foreground italic">&ldquo;{comment}&rdquo;</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6">
      {/* Vendor row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
          {vendorInitials}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{vendorName}</p>
          <p className="text-xs text-muted-foreground">Chosen vendor for this project</p>
        </div>
      </div>

      {/* Rating form */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            How would you rate this vendor?
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverStar(star)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setStars(star)}
                className="focus:outline-none"
                aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              >
                <svg
                  className={`w-8 h-8 transition-colors ${
                    star <= activeStar ? "text-amber-400" : "text-gray-200"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d={STAR_PATH} />
                </svg>
              </button>
            ))}
          </div>
          {stars > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {RATING_LABELS[stars]}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Comments{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this vendor..."
            rows={3}
            className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!stars || createReview.isPending}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {createReview.isPending ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
