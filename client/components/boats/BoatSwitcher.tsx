import { Anchor, Check, ChevronDown, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMyBoats } from "@/hooks/use-my-boat";
import { useDemoMode } from "@/lib/demoMode";
import { cn } from "@/lib/utils";

/**
 * "Which boat am I looking at?" Shown wherever the app talks about one boat, once an owner
 * has more than one. Picking a boat switches the dashboard, maintenance, boat log and settings.
 */
export default function BoatSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { demo } = useDemoMode();
  const { boats, primary, setPrimaryId } = useMyBoats();
  if (demo || boats.length < 2 || !primary) return null;

  const label = (b: typeof primary) => b.name || [b.year, b.make, b.model].filter(Boolean).join(" ");
  const sub = (b: typeof primary) => (b.name ? [b.year, b.make, b.model].filter(Boolean).join(" ") : "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-white pl-1.5 pr-2.5 py-1 text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[16rem]",
          className
        )}
        aria-label="Switch boat"
      >
        {primary.photo_url ? (
          <img src={primary.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-sky-100 text-brand flex items-center justify-center"><Anchor className="w-3.5 h-3.5" /></span>
        )}
        <span className="truncate font-medium">{compact ? label(primary) : `${label(primary)}${sub(primary) ? ` · ${sub(primary)}` : ""}`}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your boats</p>
        {[...boats].reverse().map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => setPrimaryId(b.id)} className="gap-3">
            {b.photo_url ? (
              <img src={b.photo_url} alt="" className="w-9 h-7 rounded object-cover shrink-0" />
            ) : (
              <span className="w-9 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0"><Anchor className="w-3.5 h-3.5 text-slate-400" /></span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{label(b)}</span>
              {sub(b) && <span className="block text-xs text-muted-foreground truncate">{sub(b)}</span>}
            </span>
            {b.id === primary.id && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/my-boats" className="gap-2 text-sm"><Plus className="w-4 h-4" /> Add or edit boats</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
