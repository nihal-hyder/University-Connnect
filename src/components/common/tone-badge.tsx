import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/events/labels";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-secondary text-foreground/75 ring-border",
  positive: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/25",
  negative: "bg-destructive/8 text-destructive ring-destructive/20",
  info: "bg-info-soft text-info ring-info/20",
  accent: "bg-signal-soft text-signal-ink ring-signal/25",
};

export function ToneBadge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Small text label used to mark development seed data honestly. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      title="Sample data for demonstration. Not a real event or organisation."
      className={cn(
        "inline-flex h-5 items-center rounded-sm border border-dashed border-foreground/30 px-1.5 text-[10px] font-medium tracking-wide text-foreground/60 uppercase",
        className,
      )}
    >
      Sample listing
    </span>
  );
}
