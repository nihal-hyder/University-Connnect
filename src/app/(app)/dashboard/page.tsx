import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { EventRow } from "@/components/events/event-card";
import { RecentlyViewed } from "@/components/events/recently-viewed";
import { Section } from "@/components/layout/dashboard-shell";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { OpportunityList } from "@/components/volunteers/opportunity-list";
import { Button } from "@/components/ui/button";
import { respondToInvitation } from "@/lib/actions/society";
import { requireViewer } from "@/lib/auth/session";
import { listOpportunities, searchEvents } from "@/lib/data/events";
import { getDeadlineReminders, getPendingInvitations, getRecommendations, listMyApplications, listMyRegistrations, registrationRowEvent } from "@/lib/data/student";
import { REGISTRATION_STATUS_LABELS, REGISTRATION_STATUS_TONE } from "@/lib/events/labels";
import { formatDateTime, relativeFromNow } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Karachi" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const viewer = await requireViewer("/dashboard");
  const supabase = await createClient();
  const { profile } = viewer;

  const [interests, university, registrations, applications, deadlines, invitations] = await Promise.all([
    supabase.from("profile_interests").select("category:event_categories(slug, name)").eq("profile_id", viewer.user.id),
    profile.university_id
      ? supabase.from("universities").select("id, name, short_name").eq("id", profile.university_id).maybeSingle()
      : Promise.resolve({ data: null }),
    listMyRegistrations(viewer.user.id, "upcoming"),
    listMyApplications(viewer.user.id),
    getDeadlineReminders(viewer.user.id),
    getPendingInvitations(viewer.user.email),
  ]);

  const interestMap = new Map((interests.data ?? []).flatMap((i) => (i.category ? [[i.category.slug, i.category.name] as const] : [])));
  const registeredIds = new Set(registrations.map((r) => r.event.id));
  const uni = university.data;

  const [recommendations, atUniversity, competitions, opportunities] = await Promise.all([
    getRecommendations({ university_id: profile.university_id, university_name: uni?.name ?? null }, interestMap, registeredIds, 4),
    uni ? searchEvents({ university: uni.id }, 1, 4) : Promise.resolve({ items: [], total: 0 }),
    searchEvents({ type: "hackathon", open: true, eligibleFor: profile.university_id ?? undefined }, 1, 3),
    listOpportunities({ limit: 3 }),
  ]);

  const offers = applications.filter((a) => a.status === "offered");
  const firstName = profile.full_name.split(" ")[0] || "there";

  return (
    <>
      <header className="mb-8 border-b border-border pb-6">
        <p className="eyebrow text-signal-ink">{greeting()}</p>
        <h1 className="mt-1.5 font-display text-[2.25rem] leading-tight tracking-tight">Hello, {firstName}.</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {registrations.length
            ? `You have ${registrations.length} upcoming ${registrations.length === 1 ? "event" : "events"}${offers.length ? ` and ${offers.length} volunteer ${offers.length === 1 ? "offer" : "offers"} waiting for your answer` : ""}.`
            : "Nothing booked yet. Here is what's coming up."}
        </p>
      </header>

      {!profile.onboarded_at ? (
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-signal/30 bg-signal-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Finish your profile for better suggestions</p>
            <p className="mt-1 text-sm text-muted-foreground">Add your university and interests. It takes a minute and everything is optional.</p>
          </div>
          <Button asChild variant="outline" className="shrink-0 bg-surface">
            <Link href="/onboarding">Complete profile</Link>
          </Button>
        </div>
      ) : null}

      {invitations.length ? (
        <Section title="Society invitations">
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SocietyAvatar name={inv.society.name} logoPath={inv.society.logo_path} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.society.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited you as {ROLE_LABELS[inv.role]} · expires {relativeFromNow(inv.expires_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" action={respondToInvitation.bind(null, inv.id, true)}>
                    Accept
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" action={respondToInvitation.bind(null, inv.id, false)}>
                    Decline
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {offers.length ? (
        <Section title="Volunteer offers waiting for you">
          <ul className="divide-y divide-border rounded-xl border border-signal/30 bg-surface">
            {offers.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {a.role.title} · {a.event.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.offer_expires_at ? `Respond by ${formatDateTime(a.offer_expires_at)}` : "Please respond as soon as you can"}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/dashboard/applications/${a.id}`}>Review offer</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="grid gap-x-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Section
            title="Your upcoming events"
            action={
              <Link href="/dashboard/registrations" className="font-medium text-primary hover:underline">
                All registrations
              </Link>
            }
          >
            {registrations.length ? (
              <div className="divide-y divide-border border-y border-border">
                {registrations.slice(0, 4).map((r) => (
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
                      </span>
                    }
                    aside={
                      <Link href={`/dashboard/registrations/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                        {r.status === "confirmed" ? "Ticket" : "Details"}
                      </Link>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title="No upcoming registrations"
                description="When you register for an event it appears here with its status and your ticket."
                action={
                  <Button asChild size="sm">
                    <Link href="/explore">Find an event</Link>
                  </Button>
                }
              />
            )}
          </Section>

          <Section
            title="Recommended for you"
            description={interestMap.size ? "Based only on the interests and university in your profile." : undefined}
          >
            {recommendations.length ? (
              <div className="divide-y divide-border border-y border-border">
                {recommendations.map(({ event: e, reasons }) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    meta={
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-signal-ink">
                        <Sparkles className="size-3.5" aria-hidden />
                        {reasons.join(" · ")}
                      </span>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title={interestMap.size ? "Nothing matches your interests right now" : "Tell us what you're interested in"}
                description={
                  interestMap.size
                    ? "New events are added by societies every week. Check back soon or browse everything."
                    : "Pick a few interests and we'll point out relevant events, with the reason for each."
                }
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href={interestMap.size ? "/explore" : "/dashboard/settings"}>{interestMap.size ? "Browse all events" : "Choose interests"}</Link>
                  </Button>
                }
              />
            )}
          </Section>

          {uni ? (
            <Section
              title={`At ${uni.short_name ?? uni.name}`}
              action={
                <Link href={`/explore?university=${uni.id}`} className="font-medium text-primary hover:underline">
                  See all
                </Link>
              }
            >
              {atUniversity.items.length ? (
                <div className="divide-y divide-border border-y border-border">
                  {atUniversity.items.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              ) : (
                <EmptyState compact title="No upcoming events listed at your university" description="Events hosted at your university will appear here." />
              )}
            </Section>
          ) : null}

          <Section
            title="Hackathons open for registration"
            action={
              <Link href="/explore?type=hackathon&open=1" className="font-medium text-primary hover:underline">
                All hackathons
              </Link>
            }
          >
            {competitions.items.length ? (
              <div className="divide-y divide-border border-y border-border">
                {competitions.items.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <EmptyState compact title="No hackathons are open right now" description="Try competitions or workshops in the meantime." />
            )}
          </Section>
        </div>

        <aside className="min-w-0">
          <Section title="Closing soon" description="Saved events whose registration ends this week.">
            {deadlines.length ? (
              <ul className="space-y-3">
                {deadlines.map((e) => (
                  <li key={e.id} className="rounded-lg border border-border bg-surface p-4">
                    <Link href={`/events/${e.slug}`} className="font-medium hover:underline">
                      {e.title}
                    </Link>
                    <p className="mt-1 text-sm text-signal-ink">Closes {relativeFromNow(e.registration_closes_at!)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Nothing urgent. Save events to get deadline reminders here and by email.
              </p>
            )}
          </Section>

          <Section title="Recently viewed">
            <RecentlyViewed />
          </Section>

          <Section
            title="Volunteer roles"
            action={
              <Link href="/opportunities" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                More <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          >
            {opportunities.items.length ? (
              <OpportunityList items={opportunities.items} compact />
            ) : (
              <p className="text-sm text-muted-foreground">No open volunteer roles at the moment.</p>
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}
