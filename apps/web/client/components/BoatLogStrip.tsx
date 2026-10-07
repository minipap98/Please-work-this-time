import { useNavigate } from "react-router-dom";
import { BookOpen, Share2 } from "lucide-react";
import { useBoatLog, useLogBoats } from "@/hooks/use-boat-log";

/** Owner dashboard row: the boat's service log, with a shortcut to share it for a listing. */
export default function BoatLogStrip() {
  const navigate = useNavigate();
  const { data: boats = [] } = useLogBoats();
  const { data: entries = [] } = useBoatLog(boats[0]?.id);
  const verified = entries.filter((e) => e.source !== "owner").length;

  return (
    <div className="w-full h-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-white shadow-card">
      <button onClick={() => navigate("/boat-log")} className="flex-1 min-w-0 flex items-center gap-3 text-left hover:opacity-80">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Boat Log</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {entries.length > 0
              ? `${entries.length} service${entries.length !== 1 ? "s" : ""} on record · ${verified} recorded by shops`
              : "Every job on your boat, in one place"}
          </p>
        </div>
      </button>
      <button
        onClick={() => navigate("/boat-log?share=1")}
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Selling? Share for a listing</span>
        <span className="sm:hidden">Share</span>
      </button>
    </div>
  );
}
