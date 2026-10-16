import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EventStatusBadges } from "@/components/manage/event-status";
import { EventTabs } from "@/components/manage/event-tabs";
import { getManagedEvent } from "@/lib/data/manage";
import { formatEventRange } from "@/lib/format";

export default async function ManagedEventLayout({ children, params }: LayoutProps<"/manage/[slug]/events/[eventId]">) {
  const { slug, eventId } = await params;
  const { event, access } = await getManagedEvent(slug, eventId);
  const base = `/manage/${slug}/events/${event.id}`;
  const isPublic = event.status === "published";

  const tabs = [
    { href: base, label: "Overview", exact: true },
    ...(access.edit ? [{ href: `${base}/edit`, label: "Edit" }] : []),
    ...(access.viewRegistrations && event.registration_mode !== "none" && event.registration_mode !== "external"
      ? [{ href: `${base}/registrations`, label: "Registrations" }]
      : []),
    ...(access.checkIn && event.registration_mode !== "none" && event.registration_mode !== "external" ? [{ href: `${base}/check-in`, label: "Check-in" }] : []),
    ...(access.manageVolunteers || access.viewApplicants ? [{ href: `${base}/volunteers`, label: "Volunteers" }] : []),
    ...(access.isHost && (access.manageRegistrations || access.manageVolunteers) ? [{ href: `${base}/announcements`, label: "Announcements" }] : []),
    { href: `${base}/collaborators`, label: "Collaborators" },
    ...(access.viewAnalytics ? [{ href: `${base}/analytics`, label: "Analytics" }] : []),
  ];

  return (
    <>
      <div className="mb-6">
        <Link href={`/manage/${slug}/events`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Events
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {!access.isHost ? <p className="eyebrow text-signal-ink">Co-organising with {event.host.name}</p> : null}
            <h1 className="mt-1 font-display text-[2rem] leading-tight tracking-tight">{event.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{formatEventRange(event.starts_at, event.ends_at, event.timezone)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <EventStatusBadges status={event.status} scheduleStatus={event.schedule_status} publishAt={event.publish_at} />
            {isPublic ? (
              <Link href={`/events/${event.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Public page <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <EventTabs items={tabs} />
      {children}
    </>
  );
}
