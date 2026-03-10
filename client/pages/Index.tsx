import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import ProjectCard from "@/components/ProjectCard";
import { getAugmentedProjects, getCancelledProjectIds, cancelProject, reinstateProject, getLocalProjectStatus } from "@/data/bidUtils";
import { cn } from "@/lib/utils";

type Tab = "active" | "expired" | "completed";

const TABS: { label: string; value: Tab }[] = [
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Completed", value: "completed" },
];

function isActiveStatus(status: string) {
  return status === "active" || status === "bidding" || status === "in-progress" || status === "gathering";
}

/** Effective status for a project, accounting for bookings confirmed in localStorage */
function effectiveStatus(projectId: string, rawStatus: string) {
  return getLocalProjectStatus(projectId, rawStatus);
}

const MAX_STATIC_ACTIVE = 3;

export default function Index() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [, forceUpdate] = useState(0);

  // Re-read on every render so newly created/cancelled projects and vendor bids appear immediately
  const allProjects = getAugmentedProjects();
  const cancelledIds = getCancelledProjectIds();

  function handleCancel(projectId: string) {
    cancelProject(projectId);
    forceUpdate((n) => n + 1);
  }

  function handleReinstate(projectId: string) {
    reinstateProject(projectId);
    forceUpdate((n) => n + 1);
  }

  // ── Visible projects per tab ────────────────────────────────────────────────
  const visibleProjects = (() => {
    if (tab === "active") {
      const isLocal = (id: string) => id.startsWith("local_");
      // Static: cap at 3, exclude cancelled and originally-expired (reinstated) projects
      const staticActive = allProjects
        .filter((p) => !isLocal(p.id) && p.status !== "expired" && isActiveStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id))
        .slice(0, MAX_STATIC_ACTIVE);
      // Local (Dean-created) + reinstated-expired: show all, exclude cancelled
      const localAndReinstated = allProjects
        .filter((p) => (isLocal(p.id) || p.status === "expired") && isActiveStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id));
      return [...staticActive, ...localAndReinstated];
    }
    if (tab === "expired") {
      // Normal expired — exclude reinstated (those now have an active effectiveStatus)
      const normalExpired = allProjects.filter(
        (p) => p.status === "expired" && !cancelledIds.includes(p.id) && effectiveStatus(p.id, p.status) === "expired"
      );
      const cancelled = allProjects.filter((p) => cancelledIds.includes(p.id));
      return [...normalExpired, ...cancelled];
    }
    return allProjects.filter((p) => effectiveStatus(p.id, p.status) === tab);
  })();

  // ── Tab counts ──────────────────────────────────────────────────────────────
  function tabCount(value: Tab): number {
    if (value === "active") {
      const isLocal = (id: string) => id.startsWith("local_");
      const staticCount = Math.min(
        allProjects.filter((p) => !isLocal(p.id) && p.status !== "expired" && isActiveStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id)).length,
        MAX_STATIC_ACTIVE
      );
      const localAndReinstatedCount = allProjects.filter(
        (p) => (isLocal(p.id) || p.status === "expired") && isActiveStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id)
      ).length;
      return staticCount + localAndReinstatedCount;
    }
    if (value === "expired") {
      const normalExpired = allProjects.filter(
        (p) => p.status === "expired" && !cancelledIds.includes(p.id) && effectiveStatus(p.id, p.status) === "expired"
      ).length;
      return normalExpired + cancelledIds.length;
    }
    return allProjects.filter((p) => p.status === value).length;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Full-bleed hero — callback triggers re-render so new projects appear instantly */}
      <HeroSection onProjectPosted={() => forceUpdate((n) => n + 1)} />

      {/* Maintenance alert strip */}
      <MaintenanceAlert />

      <main className="max-w-6xl mx-auto pt-4 pb-8">
        <section>
          {/* Tab bar */}
          <div className="flex border-b border-border px-4 sm:px-6 lg:px-8 mb-4">
            {TABS.map(({ label, value }) => {
              const count = tabCount(value);
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "mr-5 pb-2.5 text-sm font-medium border-b-2 transition-colors",
                    tab === value
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Project card row */}
          {visibleProjects.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-2 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
              {visibleProjects.map((project) => {
                const isCancelled = cancelledIds.includes(project.id);
                return (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    description={project.description}
                    status={isCancelled ? "expired" : effectiveStatus(project.id, project.status) as "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering"}
                    date={project.date}
                    bids={project.bids.length}
                    onClick={() => navigate(`/project/${project.id}`)}
                    onCancel={tab === "active" ? () => handleCancel(project.id) : undefined}
                    onReinstate={tab === "expired" ? () => handleReinstate(project.id) : undefined}
                  />
                );
              })}
              <div className="w-1 flex-shrink-0" />
            </div>
          ) : (
            <p className="px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground">
              No {tab} projects yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
