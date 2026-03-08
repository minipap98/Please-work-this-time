import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  description: string;
  status: "active" | "in-progress" | "completed" | "expired";
  date: string;
  bids: number;
  onClick?: () => void;
}

export default function ProjectCard({
  title,
  description,
  status,
  date,
  bids,
  onClick,
}: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-[272px] flex-shrink-0 text-left border border-border rounded-xl p-5 bg-white hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
    >
      {/* Header with status badge */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <h3 className="text-base font-semibold text-foreground flex-1">{title}</h3>
        <span
          className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded flex-shrink-0 whitespace-nowrap",
            status === "active" || status === "in-progress"
              ? "bg-primary text-white"
              : status === "expired"
              ? "bg-orange-100 text-orange-700"
              : "bg-muted text-foreground"
          )}
        >
          {status}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-5">{description}</p>

      {/* Footer with date and bids */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {date}
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z" />
          </svg>
          {bids} bid{bids !== 1 ? "s" : ""}
        </div>
        <div className="ml-auto flex items-center gap-1 text-primary text-xs font-medium whitespace-nowrap">
          View
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
