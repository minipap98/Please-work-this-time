import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProjectCard from "@/components/ProjectCard";
import { PROJECTS } from "@/data/projectData";

export default function Index() {
  const navigate = useNavigate();

  const activeProjects = PROJECTS.filter((p) => p.status === "active");
  const completedProjects = PROJECTS.filter((p) => p.status === "completed");

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <HeroSection />

        {/* Active Projects Section */}
        <section className="mt-16">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Active Projects
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeProjects.map((project) => (
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
          </div>
        </section>

        {/* Completed Projects Section */}
        <section className="mt-16 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Completed Projects
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedProjects.map((project) => (
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
          </div>
        </section>
      </main>
    </div>
  );
}
