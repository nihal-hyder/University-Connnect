import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact = false,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start rounded-xl border border-dashed border-border bg-surface/60",
        compact ? "gap-2 p-5" : "gap-3 p-8 sm:p-10",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground [&_svg]:size-5">{icon}</div> : null}
      <h3 className={cn("font-display text-foreground", compact ? "text-lg" : "text-xl")}>{title}</h3>
      {description ? <div className="max-w-prose text-sm leading-6 text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
