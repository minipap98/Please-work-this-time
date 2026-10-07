import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Content width for app pages. `wide` for boards and tables, default for reading. */
export function PageContainer({ children, wide = false, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <main className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8", wide ? "max-w-7xl" : "max-w-5xl", className)}>
      {children}
    </main>
  );
}

/** Title row: eyebrow + title + description on the left, actions on the right. */
export function PageHeader({
  eyebrow, title, description, actions, className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** White card with the app's standard border and shadow. */
export function Panel({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-xl border border-border bg-white shadow-card", padded && "p-5", className)}>
      {children}
    </section>
  );
}

export type StatTone = "default" | "good" | "warn" | "bad" | "brand";

const TONE_VALUE: Record<StatTone, string> = {
  default: "text-foreground",
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
  brand: "text-brand",
};

/** Small uppercase label, big number, optional sub-line. */
export function StatTile({
  label, value, sub, tone = "default", icon, onClick, className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-white shadow-card px-4 py-3.5 text-left",
        onClick && "transition-colors hover:border-sky-300 hover:bg-sky-50/40",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon && <span className="text-muted-foreground/80 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("mt-1 text-xl sm:text-2xl font-bold tabular-nums leading-none truncate", TONE_VALUE[tone])}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground truncate">{sub}</div>}
    </Tag>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>{children}</div>;
}
