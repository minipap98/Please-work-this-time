import { useVendorReviews } from "@/hooks/use-supabase";
import type { Tables } from "@/lib/database.types";

type Review = Tables<"reviews"> & { reviewer?: { name: string; initials: string; avatar_url: string | null } };

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function StarDisplay({ stars, size = "sm" }: { stars: number; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "w-5 h-5" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`${sizeClass} ${s <= Math.round(stars) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ReviewsListProps {
  vendorId: string;
}

export default function ReviewsList({ vendorId }: ReviewsListProps) {
  const { data: reviews, isLoading, error } = useVendorReviews(vendorId) as { data: Review[] | undefined; isLoading: boolean; error: any };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-2.5 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded mb-1.5" />
            <div className="h-3 w-3/4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to load reviews.
      </p>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  // Compute average rating
  const avgRating =
    reviews.reduce((sum, r) => sum + (r.stars ?? 0), 0) / reviews.length;

  return (
    <div>
      {/* Average rating summary */}
      <div className="flex items-center gap-3 mb-4">
        <StarDisplay stars={avgRating} size="md" />
        <span className="text-sm font-semibold text-foreground">
          {avgRating.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">
          ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Individual reviews */}
      <div className="space-y-3">
        {reviews.map((review) => {
          const reviewer = (review as any).reviewer;
          const reviewerName = reviewer?.name ?? "Anonymous";
          const reviewerInitials =
            reviewer?.initials ??
            reviewerName
              .split(" ")
              .map((w: string) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

          return (
            <div key={review.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {reviewerInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{reviewerName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StarDisplay stars={review.stars ?? 0} />
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {review.created_at ? formatDate(review.created_at) : ""}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  {review.comment}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
