import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { EventRow } from "@/components/events/event-card";
import { PageHeader, Section } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { toggleSavedEvent, toggleSavedRole } from "@/app/(public)/events/[slug]/actions";
import { requireViewer } from "@/lib/auth/session";
import { getRegistrationState, REGISTRATION_STATE_COPY } from "@/lib/events/registration-state";
import { formatShortDate, isPast } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const viewer = await requireViewer("/dashboard/saved");
  const supabase = await createClient();
  const [events, roles] = await Promise.all([
    supabase
      .from("saved_events")
      .select(
        `created_at, event:events!inner(id, slug, title, starts_at, ends_at, timezone, format, is_demo, schedule_status, registration_mode,
          registration_opens_at, registration_closes_at, capacity, confirmed_count, waitlist_enabled,
          city:cities(name), university:universities!events_university_id_fkey(name, short_name), society:societies!events_society_id_fkey(name))`,
      )
      .eq("user_id", viewer.user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_opportunities")
      .select(
        `created_at, role:volunteer_roles!inner(id, title, status, application_deadline, positions, accepted_count,
          event:events!inner(slug, title, society:societies!events_society_id_fkey(name)))`,
      )
      .eq("user_id", viewer.user.id)
      .order("created_at", { ascending: false }),
  ]);

  const savedEvents = (events.data ?? []).map((r) => r.event);
  const savedRoles = (roles.data ?? []).map((r) => r.role);

  return (
    <>
      <PageHeader title="Saved" description="Events and volunteer roles you bookmarked. We remind you before registration closes." />
      <Section title="Events">
        {savedEvents.length ? (
          <div className="divide-y divide-border border-y border-border">
            {savedEvents.map((e) => {
              const state = getRegistrationState(e);
              const copy = REGISTRATION_STATE_COPY[state];
              return (
                <EventRow
                  key={e.id}
                  event={{
                    ...e,
                    society_name: e.society.name,
                    city_name: e.city?.name ?? null,
                    university_name: e.university?.name ?? null,
                    university_short: e.university?.short_name ?? null,
                  }}
                  meta={<ToneBadge tone={copy.tone}>{copy.label}</ToneBadge>}
                  aside={
                    <ActionButton size="sm" variant="ghost" action={toggleSavedEvent.bind(null, e.id, false)} successMessage="Removed from saved.">
                      Remove
                    </ActionButton>
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            compact
            title="No saved events"
            description="Use the bookmark on any event page to keep it here."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/explore">Explore events</Link>
              </Button>
            }
          />
        )}
      </Section>

      <Section title="Volunteer roles" className="mt-12">
        {savedRoles.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {savedRoles.map((r) => {
              const closed = r.status !== "open" || isPast(r.application_deadline);
              return (
                <li key={r.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] text-muted-foreground">
                      {r.event.society.name} · {r.event.title}
                    </p>
                    <Link href={`/events/${r.event.slug}#volunteer`} className="font-medium hover:underline">
                      {r.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {closed ? "No longer accepting applications" : r.application_deadline ? `Apply by ${formatShortDate(r.application_deadline)}` : "Open"}
                      {" · "}
                      {Math.max(0, r.positions - r.accepted_count)} of {r.positions} places left
                    </p>
                  </div>
                  <ActionButton size="sm" variant="ghost" action={toggleSavedRole.bind(null, r.id, false)} successMessage="Removed from saved.">
                    Remove
                  </ActionButton>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            compact
            title="No saved roles"
            description="Save volunteer roles from an event page to compare them later."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/opportunities">Browse roles</Link>
              </Button>
            }
          />
        )}
      </Section>
    </>
  );
}
