import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import ProjectCard from "@/components/ProjectCard";
import { PROJECTS } from "@/data/projectData";
import { cn } from "@/lib/utils";

type Tab = "active" | "expired" | "completed";

const TABS: { label: string; value: Tab }[] = [
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Completed", value: "completed" },
];

export default function Index() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");

  const visibleProjects = PROJECTS.filter((p) =>
    tab === "active" ? p.status === "active" || p.status === "bidding" || p.status === "in-progress" : p.status === tab
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Full-bleed hero */}
      <HeroSection />

      {/* Maintenance alert strip — full bleed, between hero and projects */}
      <MaintenanceAlert />

      <main className="max-w-6xl mx-auto pt-4 pb-8">
        <section>
          {/* Tab toggle */}
          <div className="flex gap-1.5 px-4 sm:px-6 lg:px-8 mb-3">
            {TABS.map(({ label, value }) => {
              const count = PROJECTS.filter((p) =>
                value === "active" ? p.status === "active" || p.status === "bidding" || p.status === "in-progress" : p.status === value
              ).length;
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                    tab === value
                      ? "bg-black text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1.5 text-xs",
                      tab === value ? "opacity-70" : "opacity-50"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Horizontal scroll row */}
          {visibleProjects.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-2 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  description={project.description}
                  status={project.status}
                  date={project.date}
                  bids={project.bids.length}
                  onClick={() => navigate(`/project/${project.id}`)}
                />
              ))}
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
