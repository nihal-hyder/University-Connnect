import { cn } from "@/lib/utils";
import { SideNav, type SideNavGroup } from "./side-nav";

/** Two-column workspace: sticky side navigation + content. */
export function DashboardShell({
  nav,
  navLabel,
  header,
  children,
}: {
  nav: SideNavGroup[];
  navLabel: string;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="page-container py-6 lg:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {header ? <div className="mb-4 lg:mb-6">{header}</div> : null}
          <SideNav groups={nav} label={navLabel} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Title block for workspace pages. Kept compact: dashboards are tools. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow text-signal-ink">{eyebrow}</div> : null}
        <h1 className="mt-1.5 font-display text-[2rem] leading-tight tracking-tight text-foreground">{title}</h1>
        {description ? <div className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Section within a workspace page: a heading rule, not a card. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10 first:mt-0", className)}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 text-sm">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** A plain number + label, used in stat rows. Never shows invented values. */
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-3xl leading-none text-foreground tabular-nums">{value}</dd>
      {hint ? <dd className="mt-1.5 text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-6 rounded-xl border border-border bg-surface px-5 py-5 sm:grid-cols-4 sm:px-6",
        className,
      )}
    >
      {children}
    </dl>
  );
}
