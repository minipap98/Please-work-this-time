import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import QuickStats from "@/components/QuickStats";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import ProjectCard from "@/components/ProjectCard";
import { cn } from "@/lib/utils";
import { isActiveProjectStatus } from "@shared/api";
import { useOwnerMarketplaceProjects, useUpdateProjectStatus } from "@/hooks/use-marketplace";
import { supabaseMissing } from "@/lib/supabase";

type Tab = "active" | "expired" | "completed";

const TABS: { label: string; value: Tab }[] = [
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Completed", value: "completed" },
];

export default function Index() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const { data: allProjects = [], isLoading, refetch } = useOwnerMarketplaceProjects();
  const updateStatus = useUpdateProjectStatus();

  function handleCancel(projectId: string) {
    updateStatus.mutate({ projectId, status: "expired" });
  }

  function handleReinstate(projectId: string) {
    updateStatus.mutate({ projectId, status: "bidding" });
  }

  const visibleProjects = allProjects.filter((p) => {
    if (tab === "active") return isActiveProjectStatus(p.status);
    return p.status === tab;
  });

  function tabCount(value: Tab): number {
    if (value === "active") return allProjects.filter((p) => isActiveProjectStatus(p.status)).length;
    return allProjects.filter((p) => p.status === value).length;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Full-bleed hero — callback triggers re-render so new projects appear instantly */}
      <HeroSection onProjectPosted={() => refetch()} />

      <QuickStats projects={allProjects} />

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
          {isLoading ? (
            <p className="px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground py-8">Loading your jobs…</p>
          ) : supabaseMissing ? (
            <p className="px-4 sm:px-6 lg:px-8 text-sm text-muted-foreground py-8">Connect Supabase to load live jobs.</p>
          ) : visibleProjects.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-2 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
              {visibleProjects.map((project) => {
                return (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    description={project.description}
                    status={project.status}
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
