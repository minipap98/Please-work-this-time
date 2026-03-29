import { useMemo } from "react";
import { getAugmentedProjects, getCancelledProjectIds, getLocalProjectStatus } from "@/data/bidUtils";

const MAX_STATIC_ACTIVE = 3;

function isActiveStatus(status: string) {
  return status === "active" || status === "bidding" || status === "in-progress" || status === "gathering";
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  sublabel?: string;
}

function StatCard({ label, value, icon, sublabel }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 min-w-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-muted-foreground/70 truncate">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

export default function QuickStats() {
  const stats = useMemo(() => {
    const allProjects = getAugmentedProjects();
    const cancelledIds = getCancelledProjectIds();

    // Active projects count — match the same logic as the Index page tabs
    const isLocal = (id: string) => id.startsWith("local_");
    const staticActive = Math.min(
      allProjects.filter((p) => !isLocal(p.id) && p.status !== "expired" && isActiveStatus(getLocalProjectStatus(p.id, p.status)) && !cancelledIds.includes(p.id)).length,
      MAX_STATIC_ACTIVE
    );
    const localAndReinstated = allProjects.filter(
      (p) => (isLocal(p.id) || p.status === "expired") && isActiveStatus(getLocalProjectStatus(p.id, p.status)) && !cancelledIds.includes(p.id)
    ).length;
    const activeCount = staticActive + localAndReinstated;

    // Total bids across all projects
    const totalBids = allProjects.reduce((sum, p) => sum + p.bids.length, 0);

    // Average vendor rating (from all bids that have a rating > 0)
    const ratedBids = allProjects.flatMap((p) => p.bids).filter((b) => b.rating > 0);
    const avgRating =
      ratedBids.length > 0
        ? ratedBids.reduce((sum, b) => sum + b.rating, 0) / ratedBids.length
        : 0;

    // Completed projects count
    const completedCount = allProjects.filter((p) => {
      const effective = getLocalProjectStatus(p.id, p.status);
      return effective === "completed" && !cancelledIds.includes(p.id);
    }).length;

    return { activeCount, totalBids, avgRating, completedCount };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          label="Active Projects"
          value={String(stats.activeCount)}
          sublabel="Currently open"
          icon={
            <svg className="h-4 w-4 text-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          }
        />
        <StatCard
          label="Bids Received"
          value={String(stats.totalBids)}
          sublabel="Across all projects"
          icon={
            <svg className="h-4 w-4 text-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
        />
        <StatCard
          label="Avg Vendor Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "---"}
          sublabel={stats.avgRating > 0 ? `From ${stats.totalBids} bids` : "No ratings yet"}
          icon={
            <svg className="h-4 w-4 text-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={String(stats.completedCount)}
          sublabel="Projects finished"
          icon={
            <svg className="h-4 w-4 text-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
