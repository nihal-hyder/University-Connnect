import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { SampleBadge } from "@/components/common/tone-badge";
import type { OpportunityItem } from "@/lib/data/events";
import { formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const EXPERIENCE_LABEL = { none: "No experience needed", some: "Some experience", experienced: "Experienced" } as const;

/**
 * Volunteer roles presented as a listing (like a jobs board), not as cards:
 * the useful comparison is commitment, deadline and places left.
 */
export function OpportunityList({ items, className, compact = false }: { items: OpportunityItem[]; className?: string; compact?: boolean }) {
  return (
    <ul className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((role) => {
        const left = Math.max(0, role.positions - role.accepted_count);
        return (
          <li key={role.id} className={cn("group relative grid gap-3", compact ? "py-4" : "py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8")}>
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">
                {role.event.society.name} · {role.event.title}
              </p>
              <h3 className={cn("mt-1 font-display leading-snug", compact ? "text-lg" : "text-xl")}>
                <Link
                  href={`/events/${role.event.slug}#volunteer`}
                  className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 focus-visible:underline"
                >
                  {role.title}
                </Link>
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-foreground/75">
                {role.time_commitment ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden /> {role.time_commitment}
                  </span>
                ) : null}
                <span>{EXPERIENCE_LABEL[role.experience_level]}</span>
                <span>{role.is_paid ? "Paid role" : "Unpaid"}</span>
                {role.event.city?.name ? <span>{role.event.format === "online" ? "Online" : role.event.city.name}</span> : null}
                {role.event.is_demo ? <SampleBadge /> : null}
              </div>
            </div>
            <div className={cn("flex items-center gap-6 text-sm", !compact && "sm:text-right")}>
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Places</p>
                <p className="font-medium tabular-nums">{left} of {role.positions}</p>
              </div>
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Apply by</p>
                <p className="font-medium" title={role.application_deadline ? formatDate(role.application_deadline) : undefined}>
                  {role.application_deadline ? formatShortDate(role.application_deadline) : "Open"}
                </p>
              </div>
              <ArrowUpRight className={cn("hidden size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground", !compact && "sm:block")} aria-hidden />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
