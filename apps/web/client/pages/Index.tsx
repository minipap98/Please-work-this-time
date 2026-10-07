import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import QuickStats from "@/components/QuickStats";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import BoatLogStrip from "@/components/BoatLogStrip";
import ReceiptInbox from "@/components/boatlog/ReceiptInbox";
import ProjectCard from "@/components/ProjectCard";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/app/Page";
import { isActiveProjectStatus } from "@shared/api";
import { useOwnerMarketplaceProjects, useUpdateProjectStatus } from "@/hooks/use-marketplace";
import { supabaseMissing } from "@/lib/supabase";
import { isDemoMode } from "@/lib/demoMode";
import { useAuth } from "@/context/AuthContext";
import { isBidUnseen, useSeenBids } from "@/lib/seenBids";
import type { StatPick } from "@/components/QuickStats";
import { getCancelledProjectIds, getLocalProjectStatus } from "@/data/bidUtils";
import { useMyBoats } from "@/hooks/use-my-boat";

type Tab = "active" | "expired" | "completed";

const TABS: { label: string; value: Tab }[] = [
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Completed", value: "completed" },
];

const MAX_STATIC_ACTIVE = 3;

function effectiveStatus(projectId: string, rawStatus: string) {
  return getLocalProjectStatus(projectId, rawStatus);
}

export default function Index() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const { user } = useAuth();
  const seen = useSeenBids(isDemoMode() ? "demo" : user?.id);
  const jobsRef = useRef<HTMLElement>(null);
  const demo = isDemoMode();
  const { data: everyProject = [], isLoading, refetch } = useOwnerMarketplaceProjects();
  // Owners with more than one boat can look at one boat's jobs at a time.
  const { boats } = useMyBoats();
  const multiBoat = !demo && boats.length > 1;
  const [boatFilter, setBoatFilter] = useState<string>("all");
  const allProjects = multiBoat && boatFilter !== "all" ? everyProject.filter((p) => p.boatId === boatFilter) : everyProject;
  const boatLabel = (p: { boat?: { name?: string; make?: string; model?: string } }) =>
    multiBoat && p.boat ? [p.boat.name, [p.boat.make, p.boat.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ") : undefined;
  const updateStatus = useUpdateProjectStatus();
  const cancelledIds = demo ? getCancelledProjectIds() : [];

  function handleCancel(projectId: string) {
    updateStatus.mutate({ projectId, status: "expired" });
  }

  function handleReinstate(projectId: string) {
    updateStatus.mutate({ projectId, status: "bidding" });
  }

  const visibleProjects = (() => {
    if (!demo) {
      if (tab === "active") return allProjects.filter((p) => isActiveProjectStatus(p.status));
      return allProjects.filter((p) => p.status === tab);
    }
    if (tab === "active") {
      const isLocal = (id: string) => id.startsWith("local_");
      const staticActive = allProjects
        .filter((p) => !isLocal(p.id) && p.status !== "expired" && isActiveProjectStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id))
        .slice(0, MAX_STATIC_ACTIVE);
      const localAndReinstated = allProjects.filter(
        (p) => (isLocal(p.id) || p.status === "expired") && isActiveProjectStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id)
      );
      return [...staticActive, ...localAndReinstated];
    }
    if (tab === "expired") {
      const normalExpired = allProjects.filter(
        (p) => p.status === "expired" && !cancelledIds.includes(p.id) && effectiveStatus(p.id, p.status) === "expired"
      );
      const cancelled = allProjects.filter((p) => cancelledIds.includes(p.id));
      return [...normalExpired, ...cancelled];
    }
    return allProjects.filter((p) => effectiveStatus(p.id, p.status) === tab);
  })();

  function tabCount(value: Tab): number {
    if (!demo) {
      if (value === "active") return allProjects.filter((p) => isActiveProjectStatus(p.status)).length;
      return allProjects.filter((p) => p.status === value).length;
    }
    if (value === "active") {
      const isLocal = (id: string) => id.startsWith("local_");
      const staticCount = Math.min(
        allProjects.filter((p) => !isLocal(p.id) && p.status !== "expired" && isActiveProjectStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id)).length,
        MAX_STATIC_ACTIVE
      );
      const localAndReinstatedCount = allProjects.filter(
        (p) => (isLocal(p.id) || p.status === "expired") && isActiveProjectStatus(effectiveStatus(p.id, p.status)) && !cancelledIds.includes(p.id)
      ).length;
      return staticCount + localAndReinstatedCount;
    }
    if (value === "expired") {
      const normalExpired = allProjects.filter(
        (p) => p.status === "expired" && !cancelledIds.includes(p.id) && effectiveStatus(p.id, p.status) === "expired"
      ).length;
      return normalExpired + cancelledIds.length;
    }
    return allProjects.filter((p) => effectiveStatus(p.id, p.status) === value).length;
  }

  const unreadFor = (p: { bids: { id: string; seenAt?: string | null }[] }) => p.bids.filter((b) => isBidUnseen(b, seen)).length;
  const newBids = allProjects.reduce((n, p) => n + unreadFor(p), 0);
  const showJobs = (t: Tab) => {
    setTab(t);
    setTimeout(() => jobsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const pick = (what: StatPick) => {
    if (what === "bids") {
      const withNew = allProjects.filter((p) => unreadFor(p) > 0);
      if (withNew.length === 1) return navigate(`/project/${withNew[0].id}`);
      return showJobs("active");
    }
    if (what === "rating") return navigate("/vendors");
    showJobs(what === "completed" ? "completed" : "active");
  };

  return (
    <div className="min-h-full">
      <PageContainer wide className="space-y-4">
        {/* The boat; posting a job re-fetches so it appears right away */}
        <HeroSection onProjectPosted={() => refetch()} />

        <QuickStats projects={allProjects} newBids={newBids} onPick={pick} />

        <div className="grid gap-3 md:grid-cols-2">
          <MaintenanceAlert />
          <BoatLogStrip />
          <ReceiptInbox className="md:col-span-2" />
        </div>

        <section ref={jobsRef} className="rounded-xl border border-border bg-white shadow-card scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
            <h2 className="text-base font-semibold">Your jobs</h2>
            {multiBoat && (
              <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                {[{ id: "all", label: "All boats" }, ...boats.map((b) => ({ id: b.id, label: `${b.name} · ${b.model}` }))].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setBoatFilter(o.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                      boatFilter === o.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Tab bar */}
          <div className="flex border-b border-border px-5 mt-2 mb-4">
            {TABS.map(({ label, value }) => {
              const count = tabCount(value);
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "mr-5 pb-2.5 text-sm font-medium border-b-2 transition-colors",
                    tab === value
                      ? "border-primary text-foreground"
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
          {isLoading ? (
            <p className="px-5 text-sm text-muted-foreground pb-8">Loading your jobs…</p>
          ) : !demo && supabaseMissing ? (
            <p className="px-5 text-sm text-muted-foreground pb-8">Connect Supabase to load live jobs.</p>
          ) : visibleProjects.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-5 px-5 [&::-webkit-scrollbar]:hidden">
              {visibleProjects.map((project) => {
                return (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    description={project.description}
                    status={project.status}
                    date={project.date}
                    bids={project.bids.length}
                    newBids={unreadFor(project)}
                    boat={boatLabel(project)}
                    onClick={() => navigate(`/project/${project.id}`)}
                    onCancel={tab === "active" ? () => handleCancel(project.id) : undefined}
                    onReinstate={tab === "expired" ? () => handleReinstate(project.id) : undefined}
                  />
                );
              })}
              <div className="w-1 flex-shrink-0" />
            </div>
          ) : (
            <p className="px-5 pb-6 text-sm text-muted-foreground">
              No {tab} jobs yet.
            </p>
          )}
        </section>
      </PageContainer>
    </div>
  );
}
