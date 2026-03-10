import { cn } from "@/lib/utils";

interface ProjectCardProps {
  title: string;
  description: string;
  status: "active" | "bidding" | "in-progress" | "completed" | "expired" | "gathering";
  date: string;
  bids: number;
  onClick?: () => void;
  onCancel?: () => void;
  onReinstate?: () => void;
}

const STATUS_DOT: Record<string, string> = {
  "in-progress": "bg-emerald-500",
  active:        "bg-emerald-500",
  bidding:       "bg-blue-400",
  gathering:     "bg-amber-400",
  completed:     "bg-gray-300",
  expired:       "bg-gray-300",
};

const STATUS_LABEL: Record<string, string> = {
  "in-progress": "In Progress",
  active:        "Active",
  bidding:       "Accepting Bids",
  gathering:     "Gathering Candidates",
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
  onCancel,
  onReinstate,
}: ProjectCardProps) {
  return (
    <div className="relative w-[260px] flex-shrink-0 group">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        className="w-full h-full text-left border border-border rounded-lg p-4 bg-white hover:border-foreground/20 transition-colors cursor-pointer block"
      >
        {/* Status */}
        <div className="flex items-center gap-1.5 mb-3 pr-5">
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
      </div>

      {/* Cancel button — only shown when onCancel is provided */}
      {onCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          title="Cancel project"
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground/50 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Reinstate button — only shown when onReinstate is provided (Expired tab) */}
      {onReinstate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReinstate();
          }}
          title="Reinstate project"
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground/50 hover:bg-emerald-50 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
}
