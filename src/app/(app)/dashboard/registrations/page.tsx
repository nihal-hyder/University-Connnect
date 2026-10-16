import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { EventRow } from "@/components/events/event-card";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/session";
import { listMyRegistrations, registrationRowEvent } from "@/lib/data/student";
import { REGISTRATION_STATUS_LABELS, REGISTRATION_STATUS_TONE } from "@/lib/events/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My registrations" };

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;

export default async function RegistrationsPage({ searchParams }: PageProps<"/dashboard/registrations">) {
  const viewer = await requireViewer("/dashboard/registrations");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab)?.key ?? "upcoming";
  const rows = await listMyRegistrations(viewer.user.id, tab);

  return (
    <>
      <PageHeader title="My registrations" description="Every event you have registered for, with its current status." />
      <nav aria-label="Filter registrations" className="mb-6 flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/registrations?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              t.key === tab ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {rows.length ? (
        <div className="divide-y divide-border border-y border-border">
          {rows.map((r) => (
            <EventRow
              key={r.id}
              event={registrationRowEvent(r)}
              meta={
                <span className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={REGISTRATION_STATUS_TONE[r.status]} dot>
                    {REGISTRATION_STATUS_LABELS[r.status]}
                  </ToneBadge>
                  {r.event.schedule_status !== "scheduled" ? (
                    <ToneBadge tone={r.event.schedule_status === "cancelled" ? "negative" : "warning"}>
                      Event {r.event.schedule_status}
                    </ToneBadge>
                  ) : null}
                  <span className="font-mono text-xs text-muted-foreground">{r.reference_code}</span>
                </span>
              }
              aside={
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/registrations/${r.id}`}>{r.status === "confirmed" ? "View ticket" : "Details"}</Link>
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={tab === "past" ? "No past events yet" : "No registrations here"}
          description="Registrations you make appear here with their status, reference and ticket."
          action={
            <Button asChild>
              <Link href="/explore">Explore events</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
