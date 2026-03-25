import { generateMaintenanceICS, downloadICS, type CalendarTask } from "@/lib/calendarUtils";

// ─── Calendar Icon ───────────────────────────────────────────

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// ─── Download Icon ───────────────────────────────────────────

function DownloadIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────

interface CalendarExportProps {
  tasks: CalendarTask[];
}

export default function CalendarExport({ tasks }: CalendarExportProps) {
  const exportableCount = tasks.filter((t) => t.nextDueDate !== null).length;

  function handleExport() {
    const ics = generateMaintenanceICS(tasks);
    downloadICS(ics);
  }

  return (
    <button
      onClick={handleExport}
      disabled={exportableCount === 0}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
      <span>Export to Calendar</span>
      <DownloadIcon className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );
}
