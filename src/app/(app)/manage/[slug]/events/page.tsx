import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { SampleBadge } from "@/components/common/tone-badge";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { EventStatusBadges } from "@/components/manage/event-status";
import { Button } from "@/components/ui/button";
import { requireSocietyAccess } from "@/lib/auth/session";
import { listSocietyEvents } from "@/lib/data/manage";
import { formatDate, isPast, relativeFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Events" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "drafts", label: "Drafts & review" },
  { key: "past", label: "Past" },
  { key: "shared", label: "Co-organising" },
] as const;

export default async function SocietyEventsPage({ params, searchParams }: PageProps<"/manage/[slug]/events">) {
  const { slug } = await params;
  const { show } = await searchParams;
  const filter = FILTERS.find((f) => f.key === show)?.key ?? "all";
  const ctx = await requireSocietyAccess(slug);
  const base = `/manage/${slug}`;

  const all = await listSocietyEvents(ctx.society.id);
  const supabase = await createClient();
  const { data: shared } =
    filter === "shared"
      ? await supabase
          .from("event_collaborations")
          .select("id, event:events!inner(id, title, status, schedule_status, starts_at, timezone, publish_at, host:societies!events_society_id_fkey(name))")
          .eq("society_id", ctx.society.id)
          .eq("status", "accepted")
      : { data: [] };

  const rows = all.filter((e) => {
    const ended = isPast(e.ends_at);
    if (filter === "upcoming") return e.status === "published" && !ended;
    if (filter === "drafts") return ["draft", "pending_review", "changes_requested", "rejected"].includes(e.status);
    if (filter === "past") return ended;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Events"
        description="Everything your society has created, plus events you co-organise."
        actions={
          ctx.can("create_events") && ctx.society.status === "active" ? (
            <Button asChild>
              <Link href={`${base}/events/new`}>
                <CalendarPlus /> Create event
              </Link>
            </Button>
          ) : null
        }
      />
      <nav aria-label="Filter events" className="mb-6 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`${base}/events?show=${f.key}`}
            aria-current={f.key === filter ? "page" : undefined}
            className={cn("rounded-full px-3.5 py-1.5 text-sm", f.key === filter ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary")}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {filter === "shared" ? (
        shared?.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {shared.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`${base}/events/${c.event.id}`} className="font-medium hover:underline">
                    {c.event.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Hosted by {c.event.host.name} · {formatDate(c.event.starts_at, c.event.timezone)}
                  </p>
                </div>
                <EventStatusBadges status={c.event.status} scheduleStatus={c.event.schedule_status} publishAt={c.event.publish_at} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title="Not co-organising anything" description="When another society invites you to collaborate and you accept, the event appears here." />
        )
      ) : rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Society events</caption>
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Event</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Registrations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`${base}/events/${e.id}`} className="font-medium hover:underline">
                      {e.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Updated {relativeFromNow(e.updated_at)} {e.is_demo ? <SampleBadge className="ml-1" /> : null}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <EventStatusBadges status={e.status} scheduleStatus={e.schedule_status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{e.starts_at ? formatDate(e.starts_at, e.timezone) : "Not set"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {e.confirmed_count}
                    {e.capacity ? <span className="text-muted-foreground"> / {e.capacity}</span> : null}
                    {e.pending_count ? <span className="ml-2 text-warning">+{e.pending_count} pending</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No events here"
          description="Create an event to start taking registrations and recruiting volunteers."
          action={
            ctx.can("create_events") && ctx.society.status === "active" ? (
              <Button asChild>
                <Link href={`${base}/events/new`}>Create event</Link>
              </Button>
            ) : null
          }
        />
      )}
    </>
  );
}
