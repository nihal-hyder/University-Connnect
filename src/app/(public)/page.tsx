import Link from "next/link";
import { ArrowRight, CalendarCheck2, ClipboardList, HandHeart, QrCode, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Text3D } from "@/components/motion/text-3d";
import { EventCard } from "@/components/events/event-card";
import { SocietyTile } from "@/components/societies/society-tile";
import { Button } from "@/components/ui/button";
import { OpportunityList } from "@/components/volunteers/opportunity-list";
import { siteConfig } from "@/config/site";
import { listOpportunities, listSocieties, searchEvents } from "@/lib/data/events";
import { dateParts, formatTime } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/events/labels";

const SHORTCUTS = [
  { href: "/explore?type=hackathon", label: "Hackathons" },
  { href: "/explore?type=competition", label: "Competitions" },
  { href: "/explore?type=workshop", label: "Workshops" },
  { href: "/explore?type=seminar", label: "Seminars" },
  { href: "/opportunities", label: "Volunteering" },
  { href: "/explore?type=festival", label: "Campus festivals" },
];

export default async function HomePage() {
  const [events, opportunities, societies] = await Promise.all([
    searchEvents({}, 1, 6),
    listOpportunities({ limit: 5 }),
    listSocieties({ limit: 8 }),
  ]);
  const bulletin = events.items.slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="page-container grid grid-cols-1 gap-12 py-14 md:py-20 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="eyebrow text-signal-ink">Events · Competitions · Volunteering</p>
            <Text3D
              className="mt-4 font-display text-display text-balance text-foreground"
              segments={[
                { text: "What’s on at universities across Pakistan, " },
                { text: "in one place.", as: "em", className: "text-primary" },
              ]}
            />
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-foreground/75">
              Find hackathons, case competitions, workshops and festivals, register in a minute, and join the teams that
              organise them. Societies publish events, take registrations and recruit volunteers here for free.
            </p>

            <form action="/explore" method="get" role="search" className="mt-8 max-w-xl">
              <label htmlFor="hero-search" className="sr-only">
                Search events, societies, universities or topics
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-surface p-1.5 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
                <Search className="ml-2.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  placeholder="Try “hackathon”, “LUMS” or “robotics”"
                  className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="lg" className="rounded-lg">
                  Search
                </Button>
              </div>
            </form>

            <nav aria-label="Browse by type" className="mt-6 flex flex-wrap gap-2">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bulletin: the next few events, set like a printed noticeboard */}
          <aside aria-labelledby="bulletin-title" className="relative min-w-0 self-center">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_0_var(--border),0_24px_48px_-32px_rgb(0_0_0/0.25)] sm:p-7">
              <div className="flex items-baseline justify-between">
                <h2 id="bulletin-title" className="font-display text-2xl">Coming up</h2>
                <Link href="/explore" className="text-sm text-primary hover:underline hover:underline-offset-4">
                  Full calendar
                </Link>
              </div>
              {bulletin.length ? (
                <ol className="mt-5 divide-y divide-dashed divide-border">
                  {bulletin.map((e) => {
                    const d = dateParts(e.starts_at, e.timezone);
                    return (
                      <li key={e.id} className="group relative flex gap-4 py-4 first:pt-1">
                        <div className="w-11 shrink-0 text-center">
                          <p className="text-[10px] font-semibold tracking-widest text-signal-ink uppercase">{d?.month}</p>
                          <p className="font-display text-[1.75rem] leading-none">{d?.day}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                            {EVENT_TYPE_LABELS[e.event_type]} · {d?.weekday} {formatTime(e.starts_at, e.timezone)}
                            {e.schedule_status !== "scheduled" ? (
                              <span className="ml-1.5 font-semibold text-destructive">
                                {e.schedule_status === "cancelled" ? "Cancelled" : "Postponed"}
                              </span>
                            ) : null}
                          </p>
                          <Link
                            href={`/events/${e.slug}`}
                            className="mt-0.5 block font-medium leading-snug outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
                          >
                            {e.title}
                          </Link>
                          <p className="truncate text-sm text-muted-foreground">
                            {e.society_name}
                            {e.university_short ? `, ${e.university_short}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  No upcoming events have been published yet. When verified societies publish events, the next few will
                  appear here.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Upcoming events */}
      <Reveal>
      <section className="page-container py-16 md:py-20" aria-labelledby="upcoming">
        <SectionHeading
          eyebrow="Upcoming"
          title="Events open to students"
          description="Published by verified university societies. Sorted by date."
          href="/explore"
          linkLabel="Explore all events"
        />
        <div id="upcoming" className="sr-only">Upcoming events</div>
        {events.items.length ? (
          <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e, i) => (
              <EventCard key={e.id} event={e} priority={i < 3} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-10"
            title="No events published yet"
            description="Once societies publish events they will be listed here. If you run a society, you can register it and publish the first one."
            action={
              <Button asChild>
                <Link href="/societies/apply">Register your society</Link>
              </Button>
            }
          />
        )}
      </section>
      </Reveal>

      {/* Volunteering */}
      <Reveal>
      <section className="border-y border-border bg-surface" aria-labelledby="volunteer-heading">
        <div className="page-container grid grid-cols-1 gap-10 py-16 md:py-20 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <p className="eyebrow text-signal-ink">Volunteering</p>
            <h2 id="volunteer-heading" className="mt-2 font-display text-headline">
              Help run the events you care about
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Societies recruit volunteers for registration desks, tech support, media, logistics and outreach. Each role
              lists its responsibilities, time commitment and whether it is paid, so you know what you are signing up for
              before you apply.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/opportunities">
                Browse all opportunities <ArrowRight />
              </Link>
            </Button>
          </div>
          <div>
            {opportunities.items.length ? (
              <OpportunityList items={opportunities.items} />
            ) : (
              <EmptyState
                compact
                icon={<HandHeart />}
                title="No open volunteer roles right now"
                description="Roles appear here as societies start recruiting for upcoming events."
              />
            )}
          </div>
        </div>
      </section>
      </Reveal>

      {/* Societies */}
      <Reveal>
      <section className="page-container py-16 md:py-20" aria-labelledby="societies-heading">
        <SectionHeading eyebrow="Societies" title="Organised by student societies" href="/societies" linkLabel="Society directory" />
        <span id="societies-heading" className="sr-only">Societies</span>
        {societies.items.length ? (
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {societies.items.map((s) => (
              <SocietyTile key={s.id} society={s} />
            ))}
          </div>
        ) : (
          <EmptyState className="mt-8" compact title="No verified societies yet" description="Verified societies will be listed here." />
        )}
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Every society listed here was reviewed by platform staff before it could publish. Verification confirms that a
          society applied with evidence of recognition from its university; it is not an endorsement by the university.
        </p>
      </section>
      </Reveal>

      {/* How it works */}
      <Reveal>
      <section className="border-t border-border" aria-labelledby="how-heading">
        <div className="page-container py-16 md:py-20">
          <h2 id="how-heading" className="font-display text-headline">How it works</h2>
          <div className="mt-10 grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h3 className="eyebrow">For students</h3>
              <ol className="mt-5 space-y-6">
                {[
                  { icon: Search, title: "Discover", body: "Filter by university, city, date, topic, fee and whether registration is still open." },
                  { icon: CalendarCheck2, title: "Register or apply", body: "Register for events or apply for volunteer roles with the organiser's form. You get a reference number straight away." },
                  { icon: QrCode, title: "Show up", body: "Confirmed places come with a QR ticket. Track every registration and application from your dashboard." },
                ].map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-display text-3xl leading-none text-signal tabular-nums">{i + 1}</span>
                    <div>
                      <p className="flex items-center gap-2 font-medium"><step.icon className="size-4 text-primary" aria-hidden />{step.title}</p>
                      <p className="mt-1 text-[15px] leading-7 text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div id="organisers">
              <h3 className="eyebrow">For societies</h3>
              <ol className="mt-5 space-y-6">
                {[
                  { icon: ClipboardList, title: "Get verified", body: "Apply once with your university details and evidence of recognition. Platform staff review every application." },
                  { icon: Users, title: "Publish and recruit", body: "Create events with custom registration forms, capacity limits, waitlists and volunteer roles. Invite other societies to co-organise." },
                  { icon: QrCode, title: "Run the day", body: "Approve registrations, send volunteer offers, check people in with QR codes and see how the event performed." },
                ].map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-display text-3xl leading-none text-signal tabular-nums">{i + 1}</span>
                    <div>
                      <p className="flex items-center gap-2 font-medium"><step.icon className="size-4 text-primary" aria-hidden />{step.title}</p>
                      <p className="mt-1 text-[15px] leading-7 text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
      </Reveal>

      {/* Organiser CTA */}
      <Reveal>
      <section className="page-container">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-14">
          <svg className="pointer-events-none absolute -top-10 -right-10 size-72 opacity-15" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <pattern id="cta-jaali" width="12.5" height="12.5" patternUnits="userSpaceOnUse">
                <path d="M6.25 0.5 L12 6.25 L6.25 12 L0.5 6.25 Z" fill="none" stroke="currentColor" strokeWidth="0.6" />
              </pattern>
            </defs>
            <circle cx="50" cy="50" r="50" fill="url(#cta-jaali)" />
          </svg>
          <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <h2 className="font-display text-headline text-balance">Running a society? Put your next event here.</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-primary-foreground/80">
                {siteConfig.name} is free for societies. One place for your event page, registrations, waitlist,
                volunteer recruitment and check-in, instead of a form, a spreadsheet and three group chats.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild size="lg" className="bg-paper text-primary hover:bg-paper/90">
                <Link href="/societies/apply">Register your society</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                <Link href="/about#organisers">How verification works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      </Reveal>
    </>
  );
}
