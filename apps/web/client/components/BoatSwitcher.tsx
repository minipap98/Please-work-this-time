import { useState } from "react";
import { useBoats } from "@/hooks/use-supabase";
import type { Tables } from "@/lib/database.types";

type Boat = Tables<"boats">;

interface BoatSwitcherProps {
  selectedBoatId: string | null;
  onSelect: (boatId: string) => void;
  compact?: boolean;
}

export default function BoatSwitcher({ selectedBoatId, onSelect, compact }: BoatSwitcherProps) {
  const { data: boats, isLoading } = useBoats() as { data: Boat[] | undefined; isLoading: boolean };
  const [open, setOpen] = useState(false);

  if (isLoading || !boats?.length) return null;

  const selected = boats.find((b) => b.id === selectedBoatId) ?? boats[0];

  if (boats.length <= 1 && compact) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 ${
          compact
            ? "text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border"
            : "text-sm font-medium text-foreground px-3 py-2 rounded-lg border border-border hover:bg-gray-50"
        } transition-colors`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
        </svg>
        <span className="truncate max-w-[140px]">{selected.name || `${selected.year} ${selected.make} ${selected.model}`}</span>
        {boats.length > 1 && (
          <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && boats.length > 1 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg z-50 py-1">
            {boats.map((boat) => (
              <button
                key={boat.id}
                onClick={() => {
                  onSelect(boat.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                  boat.id === selected.id ? "bg-gray-50" : ""
                }`}
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {boat.name || `${boat.make} ${boat.model}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {boat.year} {boat.make} {boat.model}
                  {boat.propulsion ? ` · ${boat.propulsion}` : ""}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
