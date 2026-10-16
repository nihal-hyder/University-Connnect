import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader, Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { EventStatusBadges } from "@/components/manage/event-status";
import { Button } from "@/components/ui/button";
import { requireSocietyAccess } from "@/lib/auth/session";
import { listSocietyEvents } from "@/lib/data/manage";
import { formatDate, isFuture } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Society workspace" };

export default async function ManageOverview({ params }: PageProps<"/manage/[slug]">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug);
  const base = `/manage/${slug}`;
  const supabase = await createClient();
  const events = await listSocietyEvents(ctx.society.id);
  const upcoming = events.filter((e) => e.status === "published" && isFuture(e.ends_at));
  const attention = events.filter((e) => e.status === "changes_requested" || e.status === "rejected" || (e.pending_count > 0 && e.status === "published"));
  const drafts = events.filter((e) => e.status === "draft" || e.status === "pending_review");

  const canSeeApplicants = ctx.can("view_volunteer_applicants");
  const eventIds = events.map((e) => e.id);
  const [newApplications, acceptedVolunteers, pendingCollabs] = await Promise.all([
    canSeeApplicants && eventIds.length
      ? supabase.from("volunteer_applications").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "submitted")
      : Promise.resolve({ count: null }),
    canSeeApplicants && eventIds.length
      ? supabase.from("volunteer_applications").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "accepted")
      : Promise.resolve({ count: null }),
    supabase
      .from("event_collaborations")
      .select("id, event:events!inner(title, host:societies!events_society_id_fkey(name))")
      .eq("society_id", ctx.society.id)
      .eq("status", "pending"),
  ]);

  const pendingRegs = upcoming.reduce((n, e) => n + e.pending_count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={ctx.society.name}
        description="What's live, what needs a decision, and what's coming next."
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

      <StatRow>
        <Stat label="Upcoming published events" value={upcoming.length} />
        <Stat label="Registrations awaiting approval" value={ctx.can("view_registrations") ? pendingRegs : "—"} />
        <Stat label="New volunteer applications" value={newApplications.count ?? "—"} hint={canSeeApplicants ? "Not yet reviewed" : "Not available for your role"} />
        <Stat label="Confirmed volunteers" value={acceptedVolunteers.count ?? "—"} />
      </StatRow>

      {pendingCollabs.data?.length ? (
        <Section title="Collaboration invitations" className="mt-10">
          <ul className="divide-y divide-border rounded-xl border border-signal/30 bg-surface">
            {pendingCollabs.data.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  <span className="font-medium">{c.event.host.name}</span> invited you to co-organise <span className="font-medium">{c.event.title}</span>
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`${base}/collaborations`}>Review</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {attention.length ? (
        <Section title="Needs attention" className="mt-10">
          <ul className="divide-y divide-border border-y border-border">
            {attention.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`${base}/events/${e.id}`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {e.status === "changes_requested"
                      ? "Reviewers asked for changes before publishing."
                      : e.status === "rejected"
                        ? "Not approved for publication. See the reviewer's note."
                        : `${e.pending_count} registration${e.pending_count === 1 ? "" : "s"} waiting for approval.`}
                  </p>
                </div>
                <EventStatusBadges status={e.status} scheduleStatus={e.schedule_status} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Coming up"
        className="mt-10"
        action={
          <Link href={`${base}/events`} className="font-medium text-primary hover:underline">
            All events
          </Link>
        }
      >
        {upcoming.length ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Event</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Confirmed</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Waitlist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcoming
                  .slice()
                  .reverse()
                  .slice(0, 6)
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <Link href={`${base}/events/${e.id}`} className="font-medium hover:underline">
                          {e.title}
                        </Link>
                        {e.schedule_status !== "scheduled" ? <span className="ml-2 text-xs text-warning">{e.schedule_status}</span> : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(e.starts_at, e.timezone)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {e.confirmed_count}
                        {e.capacity ? <span className="text-muted-foreground"> / {e.capacity}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{e.waitlist_count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            compact
            title="No upcoming published events"
            description={drafts.length ? `You have ${drafts.length} draft or submitted event${drafts.length === 1 ? "" : "s"}.` : "Create your first event to start taking registrations."}
            action={
              ctx.can("create_events") && ctx.society.status === "active" ? (
                <Button asChild size="sm">
                  <Link href={`${base}/events/new`}>Create event</Link>
                </Button>
              ) : null
            }
          />
        )}
      </Section>
    </>
  );
}
