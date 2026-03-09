import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  description: string;
  status: "active" | "bidding" | "in-progress" | "completed" | "expired";
  date: string;
  bids: number;
  onClick?: () => void;
}

const STATUS_DOT: Record<string, string> = {
  "in-progress": "bg-emerald-500",
  active:        "bg-emerald-500",
  bidding:       "bg-blue-400",
  completed:     "bg-gray-300",
  expired:       "bg-gray-300",
};

const STATUS_LABEL: Record<string, string> = {
  "in-progress": "In Progress",
  active:        "Active",
  bidding:       "Accepting Bids",
  completed:     "Completed",
  expired:       "Expired",
};

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
      className="w-[260px] flex-shrink-0 text-left border border-border rounded-lg p-4 bg-white hover:border-foreground/20 transition-colors cursor-pointer"
    >
      {/* Status */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[status])} />
        <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">{title}</h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-3">{description}</p>

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {date}
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z" />
          </svg>
          {bids} bid{bids !== 1 ? "s" : ""}
        </div>
      </div>
    </button>
  );
}
