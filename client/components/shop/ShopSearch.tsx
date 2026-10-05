import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor, ClipboardList, Search, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useShipments, useWorkOrders } from "@/hooks/use-shop";
import { searchShop, type PartsShipment, type ShopSearchHit, type WorkOrder } from "@shared/shop";
import { cn } from "@/lib/utils";

const ICON = { customer: User, boat: Anchor, order: ClipboardList } as const;
const KIND = { customer: "Customer", boat: "Boat", order: "Work order" } as const;

/**
 * Type a customer, boat or WO number and jump to it. Pure UI: give it the orders and
 * shipments to search and what to do with a pick.
 */
export function ShopSearchInput({
  orders,
  shipments = [],
  onPick,
  placeholder = "Find a boat, customer or WO#",
  autoFocus = false,
  className,
}: {
  orders: WorkOrder[];
  shipments?: PartsShipment[];
  onPick: (hit: ShopSearchHit) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const hits = useMemo(() => searchShop(q, orders, shipments), [q, orders, shipments]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const pick = (h: ShopSearchHit) => {
    setQ("");
    setOpen(false);
    onPick(h);
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            pick(hits[active]);
          } else if (e.key === "Escape") {
            setQ("");
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        aria-label="Search the shop"
        className="w-full rounded-lg border border-border bg-white pl-9 pr-8 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
      />
      {q && (
        <button
          onClick={() => setQ("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && q.trim().length >= 2 && (
        <ul className="absolute z-40 mt-1 w-full min-w-[20rem] rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          {hits.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">Nothing matches "{q}".</li>
          ) : (
            hits.map((h, i) => {
              const Icon = ICON[h.kind];
              return (
                <li key={`${h.kind}-${h.label}`}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(h)}
                    className={cn("w-full text-left px-3 py-2 flex items-center gap-3", i === active && "bg-sky-50")}
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">{h.label}</span>
                      {h.detail && <span className="block text-xs text-muted-foreground truncate">{h.detail}</span>}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">{KIND[h.kind]}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * The shop's search, wired to its work orders and parts and to the board.
 * Inline on wider screens, a search button that opens a dialog on phones.
 */
export default function ShopSearchBar({ vendorId, base = "/vendor-shop", className }: { vendorId: string | null; base?: string; className?: string }) {
  const navigate = useNavigate();
  const { data: orders = [] } = useWorkOrders(vendorId);
  const { data: shipments = [] } = useShipments(vendorId);
  const [dialog, setDialog] = useState(false);

  const go = (h: ShopSearchHit) => {
    setDialog(false);
    if (h.kind === "order" && h.order) navigate(`${base}?tab=orders&wo=${h.order.id}`);
    else navigate(`${base}?tab=orders&q=${encodeURIComponent(h.query)}`);
  };

  if (!vendorId) return null;
  return (
    <>
      <ShopSearchInput orders={orders} shipments={shipments} onPick={go} className={cn("hidden md:block w-72 lg:w-80", className)} />
      <button
        onClick={() => setDialog(true)}
        className="md:hidden p-2 rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground"
        aria-label="Search the shop"
      >
        <Search className="w-5 h-5" />
      </button>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="top-4 translate-y-0 p-4 max-w-md">
          <DialogTitle className="text-sm font-semibold">Find a boat, customer or work order</DialogTitle>
          <ShopSearchInput orders={orders} shipments={shipments} onPick={go} autoFocus />
        </DialogContent>
      </Dialog>
    </>
  );
}
