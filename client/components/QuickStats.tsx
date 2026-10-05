import { useMemo } from "react";
import type { Project } from "@/data/projectData";
import { isActiveProjectStatus } from "@shared/api";
import { CheckCircle2, FolderOpen, Gavel, Star } from "lucide-react";
import { StatGrid, StatTile } from "@/components/app/Page";

export default function QuickStats({ projects = [] }: { projects?: Project[] }) {
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
      <StatTile label="Active jobs" value={stats.activeCount} sub="Open for bids or in progress" icon={<FolderOpen />} />
      <StatTile label="Bids received" value={stats.totalBids} sub="Across all your jobs" icon={<Gavel />} />
      <StatTile
        label="Avg rating"
        value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
        sub={stats.avgRating > 0 ? `From ${stats.totalBids} bids` : "No ratings yet"}
        icon={<Star />}
      />
      <StatTile label="Completed" value={stats.completedCount} sub="Jobs finished" icon={<CheckCircle2 />} />
    </StatGrid>
  );
}
