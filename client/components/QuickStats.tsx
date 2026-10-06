import { useMemo } from "react";
import type { Project } from "@/data/projectData";
import { isActiveProjectStatus } from "@shared/api";
import { CheckCircle2, FolderOpen, Gavel, Star } from "lucide-react";
import { StatGrid, StatTile } from "@/components/app/Page";

export type StatPick = "active" | "bids" | "rating" | "completed";

export default function QuickStats({
  projects = [],
  newBids = 0,
  onPick,
}: {
  projects?: Project[];
  /** Bids the owner hasn't looked at yet. */
  newBids?: number;
  onPick?: (what: StatPick) => void;
}) {
  const stats = useMemo(() => {
    const allProjects = projects;
    const activeCount = allProjects.filter((p) => isActiveProjectStatus(p.status)).length;

    // Total bids across all projects
    const totalBids = allProjects.reduce((sum, p) => sum + p.bids.length, 0);

    // Average vendor rating (from all bids that have a rating > 0)
    const ratedBids = allProjects.flatMap((p) => p.bids).filter((b) => b.rating > 0);
    const avgRating =
      ratedBids.length > 0
        ? ratedBids.reduce((sum, b) => sum + b.rating, 0) / ratedBids.length
        : 0;

    const completedCount = allProjects.filter((p) => p.status === "completed").length;

    return { activeCount, totalBids, avgRating, completedCount };
  }, [projects]);

  return (
    <StatGrid>
      <StatTile label="Active jobs" value={stats.activeCount} sub="Open for bids or in progress" icon={<FolderOpen />} onClick={onPick && (() => onPick("active"))} />
      <StatTile
        label="Bids received"
        value={stats.totalBids}
        tone={newBids > 0 ? "brand" : "default"}
        sub={
          newBids > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              {newBids} new to review
            </span>
          ) : (
            "Across all your jobs"
          )
        }
        icon={<Gavel />}
        onClick={onPick && (() => onPick("bids"))}
        className={newBids > 0 ? "border-sky-300 ring-1 ring-sky-200" : undefined}
      />
      <StatTile
        label="Avg rating"
        value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
        sub={stats.avgRating > 0 ? `From ${stats.totalBids} bids` : "No ratings yet"}
        icon={<Star />}
        onClick={onPick && (() => onPick("rating"))}
      />
      <StatTile label="Completed" value={stats.completedCount} sub="Jobs finished" icon={<CheckCircle2 />} onClick={onPick && (() => onPick("completed"))} />
    </StatGrid>
  );
}
