import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AlertTriangle, BadgeCheck, CalendarClock, ExternalLink, Info, MapPin, Ticket, Video } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { SampleBadge, ToneBadge } from "@/components/common/tone-badge";
import { EventArt } from "@/components/events/event-art";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { ReportDialog, SaveEventButton, ShareButton } from "@/components/events/event-actions";
import { EventCard } from "@/components/events/event-card";
import { RegistrationDialog } from "@/components/events/registration-dialog";
import { ViewTracker } from "@/components/events/view-tracker";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { Button } from "@/components/ui/button";
import { ApplyDialog } from "@/components/volunteers/apply-dialog";
import { publicEnv } from "@/lib/env/public";
import { getSessionUser } from "@/lib/auth/session";
import { getEventBySlug, getViewerEventState, type EventDetail } from "@/lib/data/event-detail";
import { searchEvents } from "@/lib/data/events";
import {
  ACADEMIC_LEVEL_LABELS,
  ELIGIBILITY_LABELS,
  EVENT_FORMAT_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TONE,
  VOLUNTEER_STATUS_LABELS,
  VOLUNTEER_STATUS_TONE,
  type RegistrationStatus,
  type VolunteerStatus,
} from "@/lib/events/labels";
import { getRegistrationState, REGISTRATION_STATE_COPY, seatsLeft } from "@/lib/events/registration-state";
import { formatDate, formatDateTime, formatEventRange, formatMoney, formatShortDate } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";

const agendaSchema = z.array(z.object({ time: z.string().max(60).optional(), title: z.string().max(200), detail: z.string().max(500).optional() }));
const speakersSchema = z.array(z.object({ name: z.string().max(120), title: z.string().max(200).optional() }));

function isPublic(event: EventDetail["event"]) {
  return event.status === "published" && (!event.publish_at || new Date(event.publish_at) <= new Date()) && event.society?.status === "active";
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventBySlug(slug);
  if (!data || !isPublic(data.event)) return { title: "Event not found", robots: { index: false } };
  const { event } = data;
  const description = event.summary ?? `${event.title} — ${formatEventRange(event.starts_at, event.ends_at, event.timezone)}`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      type: "website",
      title: event.title,
      description,
      url: `${publicEnv.siteUrl}/events/${event.slug}`,
    },
    robots: event.is_demo ? { index: false } : undefined,
  };
}

function Paragraphs({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="prose-body">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-8" aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined} className="font-display text-2xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const data = await getEventBySlug(slug);
  if (!data) notFound();
  const { event, roles, collaborators, fields, targetUniversities } = data;
  const user = await getSessionUser();
  const viewerState = await getViewerEventState(event.id, user?.id ?? null);
  const publicEvent = isPublic(event);

  const state = getRegistrationState(event);
  const stateCopy = REGISTRATION_STATE_COPY[state];
  const left = seatsLeft(event);
  const cover = mediaUrl(event.cover_path);
  const agenda = agendaSchema.safeParse(event.agenda).data ?? [];
  const speakers = speakersSchema.safeParse(event.speakers).data ?? [];
  const url = `${publicEnv.siteUrl}/events/${event.slug}`;
  const fee = event.is_free ? "Free" : formatMoney(event.fee_amount, event.fee_currency) ?? "Paid";
  const location =
    event.format === "online"
      ? "Online"
      : [event.venue, event.campus?.name, event.university?.short_name ?? event.university?.name, event.city?.name].filter(Boolean).join(", ");
  const openRoles = roles.filter((r) => r.status === "open" && (!r.application_deadline || new Date(r.application_deadline) > new Date()));

  const related = publicEvent && event.category ? await searchEvents({ category: event.category.slug }, 1, 4) : { items: [] };
  const relatedItems = related.items.filter((e) => e.id !== event.id).slice(0, 3);

  const loginHref = `/login?next=${encodeURIComponent(`/events/${event.slug}`)}`;

  return (
    <article className="pb-8">
      {publicEvent ? <ViewTracker eventId={event.id} slug={event.slug} title={event.title} /> : null}

      {!publicEvent ? (
        <div className="border-b border-warning/30 bg-warning-soft">
          <p className="page-container flex items-center gap-2 py-3 text-sm text-warning">
            <Info className="size-4" aria-hidden /> Preview — this event is not public ({EVENT_STATUS_LABELS[event.status]}). Only organisers and
            participants can see this page.
          </p>
        </div>
      ) : null}
      {event.schedule_status !== "scheduled" ? (
        <div className={event.schedule_status === "cancelled" ? "bg-destructive text-white" : "bg-warning text-white"} role="status">
          <div className="page-container flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">{event.schedule_status === "cancelled" ? "This event has been cancelled." : "This event has been postponed."}</p>
              {event.schedule_note ? <p className="mt-0.5 text-sm text-white/90">{event.schedule_note}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="page-container grid grid-cols-1 gap-10 pt-8 md:pt-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link href="/explore" className="hover:text-foreground hover:underline">Explore</Link>
            {event.category ? (
              <>
                <span aria-hidden> / </span>
                <Link href={`/explore?category=${event.category.slug}`} className="hover:text-foreground hover:underline">
                  {event.category.name}
                </Link>
              </>
            ) : null}
          </nav>

          <p className="mt-6 eyebrow text-signal-ink">
            {EVENT_TYPE_LABELS[event.event_type]} · {EVENT_FORMAT_LABELS[event.format]}
          </p>
          <h1 className="mt-3 font-display text-display text-balance">{event.title}</h1>
          {event.summary ? <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground/75">{event.summary}</p> : null}

          {event.society ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={`/societies/${event.society.slug}`} className="group flex items-center gap-3">
                <SocietyAvatar name={event.society.name} logoPath={event.society.logo_path} size={40} />
                <span>
                  <span className="flex items-center gap-1.5 font-medium group-hover:underline">
                    {event.society.name}
                    {event.society.verified_at ? <BadgeCheck className="size-4 text-primary" aria-label="Verified society" /> : null}
                  </span>
                  <span className="block text-sm text-muted-foreground">{event.society.university?.name}</span>
                </span>
              </Link>
              {collaborators.length ? (
                <p className="text-sm text-muted-foreground">
                  with{" "}
                  {collaborators.map((c, i) => (
                    <span key={c.slug}>
                      {i > 0 ? (i === collaborators.length - 1 ? " and " : ", ") : null}
                      <Link href={`/societies/${c.slug}`} className="text-foreground hover:underline">{c.name}</Link>
                    </span>
                  ))}
                </p>
              ) : null}
              {event.is_demo ? <SampleBadge /> : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {publicEvent ? <SaveEventButton eventId={event.id} initialSaved={viewerState.saved} signedIn={Boolean(user)} /> : null}
            {publicEvent ? <ShareButton title={event.title} url={url} summary={`${formatEventRange(event.starts_at, event.ends_at, event.timezone)} · ${location || "Online"}`} /> : null}
            {publicEvent && event.starts_at ? (
              <AddToCalendar
                icsHref={`/events/${event.slug}/calendar.ics`}
                item={{ uid: `event-${event.id}@campusconnect`, title: event.title, start: event.starts_at, end: event.ends_at, location: location || "Online", description: event.summary, url }}
              />
            ) : null}
          </div>

          <div className="relative mt-8 aspect-[2/1] overflow-hidden rounded-xl bg-muted">
            {cover ? (
              <Image src={cover} alt={`Cover image for ${event.title}`} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
            ) : (
              <EventArt seed={event.slug} category={event.category?.slug} className="size-full" label={EVENT_TYPE_LABELS[event.event_type]} />
            )}
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-[13px] text-muted-foreground">When</dt>
                <dd className="mt-0.5 font-medium">{formatEventRange(event.starts_at, event.ends_at, event.timezone)}</dd>
                {event.timezone !== "Asia/Karachi" ? <dd className="text-sm text-muted-foreground">Times shown in {event.timezone}</dd> : null}
              </div>
            </div>
            <div className="flex gap-3">
              {event.format === "online" ? <Video className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> : <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />}
              <div>
                <dt className="text-[13px] text-muted-foreground">Where</dt>
                <dd className="mt-0.5 font-medium">{location || "Venue to be announced"}</dd>
                {event.format === "hybrid" ? <dd className="text-sm text-muted-foreground">Also online — link shared with confirmed participants</dd> : null}
                {event.format === "online" ? <dd className="text-sm text-muted-foreground">Meeting link shared with confirmed participants</dd> : null}
              </div>
            </div>
            <div className="flex gap-3">
              <Ticket className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-[13px] text-muted-foreground">Fee</dt>
                <dd className="mt-0.5 font-medium">{fee}</dd>
                {!event.is_free ? <dd className="text-sm text-muted-foreground">Paid to the organisers directly, not through {"CampusConnect"}</dd> : null}
              </div>
            </div>
            <div className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-[13px] text-muted-foreground">Who can join</dt>
                <dd className="mt-0.5 font-medium">{ELIGIBILITY_LABELS[event.eligibility_scope]}</dd>
                {event.eligible_levels.length ? (
                  <dd className="text-sm text-muted-foreground">{event.eligible_levels.map((l) => ACADEMIC_LEVEL_LABELS[l]).join(", ")} students</dd>
                ) : null}
              </div>
            </div>
          </dl>

          <div className="mt-10 space-y-10">
            <Section id="about" title="About this event">
              <Paragraphs text={event.description} />
              {event.tags.length ? (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
                  {event.tags.map((t) => (
                    <li key={t}>
                      <Link href={`/explore?q=${encodeURIComponent(t)}`} className="rounded-full bg-secondary px-3 py-1 text-sm text-foreground/80 hover:bg-accent">
                        {t}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Section>

            {agenda.length ? (
              <Section id="agenda" title="Agenda">
                <ol className="relative space-y-0 border-l border-border pl-6">
                  {agenda.map((item, i) => (
                    <li key={i} className="relative pb-5 last:pb-0">
                      <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-paper bg-signal" aria-hidden />
                      {item.time ? <p className="text-[13px] font-medium text-signal-ink">{item.time}</p> : null}
                      <p className="font-medium">{item.title}</p>
                      {item.detail ? <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p> : null}
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}

            {speakers.length ? (
              <Section id="speakers" title="Speakers and hosts">
                <ul className="grid gap-4 sm:grid-cols-2">
                  {speakers.map((s, i) => (
                    <li key={i} className="border-l-2 border-signal pl-4">
                      <p className="font-medium">{s.name}</p>
                      {s.title ? <p className="text-sm text-muted-foreground">{s.title}</p> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section id="eligibility" title="Eligibility">
              <ul className="space-y-2 text-[15px] leading-7">
                <li>{ELIGIBILITY_LABELS[event.eligibility_scope]}{event.eligibility_scope === "host_university" && event.university ? ` (${event.university.name})` : ""}.</li>
                {event.eligibility_scope === "selected_universities" && targetUniversities.length ? (
                  <li>Open to students of: {targetUniversities.map((u) => u.short_name ?? u.name).join(", ")}.</li>
                ) : null}
                {event.eligible_levels.length ? <li>Academic level: {event.eligible_levels.map((l) => ACADEMIC_LEVEL_LABELS[l]).join(", ")}.</li> : null}
                {event.registration_mode === "team" ? <li>Teams of {event.team_min}–{event.team_max} members.</li> : null}
              </ul>
              {event.require_university_email ? (
                <p className="mt-3 rounded-lg bg-info-soft px-4 py-3 text-sm leading-6 text-info">
                  Registration needs a verified university email: your account&rsquo;s email must be on an eligible university&rsquo;s
                  domain (for example <span className="font-mono">@nu.edu.pk</span>).
                </p>
              ) : null}
              {event.eligibility_notes ? <p className="mt-3 text-[15px] leading-7 text-foreground/80">{event.eligibility_notes}</p> : null}
            </Section>

            {!event.is_free || event.refund_policy ? (
              <Section id="fees" title="Fees and refunds">
                <div className="space-y-4 text-[15px] leading-7">
                  {!event.is_free ? (
                    <>
                      <p>
                        <span className="font-medium">{fee}.</span> {event.fee_description}
                      </p>
                      <div className="flex gap-3 rounded-lg border border-info/20 bg-info-soft p-4 text-sm text-info">
                        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <p>
                          Payment is handled by the organisers outside this platform. CampusConnect does not process or verify
                          payments. Pay only through the method described by the organisers below.
                        </p>
                      </div>
                      {event.payment_instructions ? <p className="whitespace-pre-line">{event.payment_instructions}</p> : null}
                      {event.payment_url ? (
                        <a href={event.payment_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4">
                          Organiser&rsquo;s payment page <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </>
                  ) : null}
                  {event.refund_policy ? (
                    <div>
                      <h3 className="font-medium">Cancellation and refund policy</h3>
                      <p className="mt-1 whitespace-pre-line text-foreground/80">{event.refund_policy}</p>
                    </div>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {event.accessibility_info ? (
              <Section id="accessibility" title="Accessibility">
                <p className="text-[15px] leading-7 whitespace-pre-line">{event.accessibility_info}</p>
              </Section>
            ) : null}

            {roles.length ? (
              <Section id="volunteer" title="Volunteer for this event">
                <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
                  The organisers are recruiting volunteers. You can apply without registering as an attendee unless a role says otherwise.
                </p>
                <ul className="mt-6 divide-y divide-border border-y border-border">
                  {roles.map((role) => {
                    const application = viewerState.applications.find((a) => a.role_id === role.id);
                    const isOpen =
                      event.volunteer_recruitment_open && role.status === "open" && (!role.application_deadline || new Date(role.application_deadline) > new Date()) && event.schedule_status !== "cancelled";
                    const placesLeft = Math.max(0, role.positions - role.accepted_count);
                    return (
                      <li key={role.id} className="py-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="font-display text-xl">{role.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {placesLeft} of {role.positions} places open
                              {role.application_deadline ? ` · Apply by ${formatDate(role.application_deadline)}` : ""}
                              {role.assigned_society ? ` · Run by ${role.assigned_society.name}` : ""}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {application ? (
                              <div className="flex flex-col items-start gap-1 sm:items-end">
                                <ToneBadge tone={VOLUNTEER_STATUS_TONE[application.status as VolunteerStatus]} dot>
                                  {VOLUNTEER_STATUS_LABELS[application.status as VolunteerStatus]}
                                </ToneBadge>
                                <Link href="/dashboard/applications" className="text-sm text-primary hover:underline">View application</Link>
                              </div>
                            ) : !isOpen ? (
                              <ToneBadge>Applications closed</ToneBadge>
                            ) : user ? (
                              <ApplyDialog
                                roleId={role.id}
                                roleTitle={role.title}
                                eventTitle={event.title}
                                fields={role.fields}
                                isPaid={role.is_paid}
                                compensation={role.compensation_details}
                                timeCommitment={role.time_commitment}
                              />
                            ) : (
                              <Button asChild variant="outline">
                                <Link href={loginHref}>Log in to apply</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                          {role.description ? <div className="sm:col-span-2"><dt className="sr-only">Description</dt><dd className="text-[15px] leading-7 text-foreground/85">{role.description}</dd></div> : null}
                          {role.responsibilities ? <div><dt className="font-medium">Responsibilities</dt><dd className="mt-0.5 text-muted-foreground">{role.responsibilities}</dd></div> : null}
                          {role.time_commitment ? <div><dt className="font-medium">Time commitment</dt><dd className="mt-0.5 text-muted-foreground">{role.time_commitment}{role.schedule_notes ? `. ${role.schedule_notes}` : ""}</dd></div> : null}
                          <div><dt className="font-medium">Compensation</dt><dd className="mt-0.5 text-muted-foreground">{role.is_paid ? `Paid — ${role.compensation_details}` : "Unpaid volunteer role"}</dd></div>
                          {role.skills.length ? <div><dt className="font-medium">Skills</dt><dd className="mt-0.5 text-muted-foreground">{role.skills.join(", ")}</dd></div> : null}
                          {role.eligibility ? <div><dt className="font-medium">Eligibility</dt><dd className="mt-0.5 text-muted-foreground">{role.eligibility}</dd></div> : null}
                          {role.benefits ? <div><dt className="font-medium">What you get</dt><dd className="mt-0.5 text-muted-foreground">{role.benefits}</dd></div> : null}
                          {role.selection_process ? <div><dt className="font-medium">Selection</dt><dd className="mt-0.5 text-muted-foreground">{role.selection_process}</dd></div> : null}
                          {role.requires_event_registration ? <div><dt className="font-medium">Note</dt><dd className="mt-0.5 text-muted-foreground">You must also register for the event.</dd></div> : null}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            ) : null}

            {event.contact_email || event.contact_phone ? (
              <Section id="contact" title="Contact the organisers">
                <ul className="space-y-1 text-[15px]">
                  {event.contact_email ? <li><a className="text-primary underline underline-offset-4" href={`mailto:${event.contact_email}`}>{event.contact_email}</a></li> : null}
                  {event.contact_phone ? <li>{event.contact_phone}</li> : null}
                </ul>
              </Section>
            ) : null}

            {publicEvent ? (
              <div className="border-t border-border pt-4">
                <ReportDialog target="event" targetId={event.id} signedIn={Boolean(user)} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Registration panel */}
        <aside className="lg:row-start-1 lg:col-start-2" aria-label="Registration">
          <div className="rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-24">
            <ToneBadge tone={stateCopy.tone} dot>{stateCopy.label}</ToneBadge>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-right font-medium">{formatShortDate(event.starts_at, event.timezone)}</dd>
              </div>
              {event.registration_mode !== "none" && event.registration_closes_at ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Registration closes</dt>
                  <dd className="text-right font-medium">{formatDateTime(event.registration_closes_at, event.timezone)}</dd>
                </div>
              ) : null}
              {state === "not_open" && event.registration_opens_at ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Opens</dt>
                  <dd className="text-right font-medium">{formatDateTime(event.registration_opens_at, event.timezone)}</dd>
                </div>
              ) : null}
              {event.capacity && event.registration_mode !== "none" && event.registration_mode !== "external" ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{event.registration_mode === "team" ? "Team places" : "Places"}</dt>
                  <dd className="text-right font-medium tabular-nums">{left === 0 ? "Full" : `${left} of ${event.capacity} left`}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Fee</dt>
                <dd className="text-right font-medium">{fee}</dd>
              </div>
            </dl>

            <div className="mt-6">
              {viewerState.registration ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    {viewerState.registration.status === "confirmed" ? "You’re registered" : "Registration received"} —{" "}
                    <ToneBadge tone={REGISTRATION_STATUS_TONE[viewerState.registration.status as RegistrationStatus]}>
                      {REGISTRATION_STATUS_LABELS[viewerState.registration.status as RegistrationStatus]}
                    </ToneBadge>
                  </p>
                  {viewerState.registration.status === "pending" ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      The organisers review every registration. You&rsquo;ll be notified when they confirm your place, and your ticket
                      will appear then.
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">Reference <span className="font-mono text-foreground">{viewerState.registration.reference_code}</span></p>
                  {viewerState.onlineUrl ? (
                    <a href={viewerState.onlineUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4">
                      <Video className="size-4" aria-hidden /> Join online
                    </a>
                  ) : null}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/registrations">{viewerState.registration.status === "confirmed" ? "View ticket" : "Manage registration"}</Link>
                  </Button>
                </div>
              ) : state === "open" || state === "waitlist" ? (
                user ? (
                  <RegistrationDialog
                    eventId={event.id}
                    eventTitle={event.title}
                    mode={event.registration_mode === "team" ? "team" : "individual"}
                    teamMin={event.team_min}
                    teamMax={event.team_max}
                    termsText={event.terms_text}
                    fields={fields}
                    willWaitlist={state === "waitlist"}
                    requiresApproval={event.requires_approval}
                    triggerLabel={state === "waitlist" ? "Join the waitlist" : event.registration_mode === "team" ? "Register your team" : "Register"}
                  />
                ) : (
                  <Button asChild size="lg" className="w-full">
                    <Link href={loginHref}>Log in to register</Link>
                  </Button>
                )
              ) : state === "external" && event.external_registration_url ? (
                <div className="space-y-2">
                  <Button asChild size="lg" className="w-full">
                    <a href={event.external_registration_url} target="_blank" rel="noopener noreferrer nofollow">
                      Register on organiser&rsquo;s site <ExternalLink />
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">Registration happens outside CampusConnect, so it won&rsquo;t appear in your dashboard.</p>
                </div>
              ) : state === "no_registration" ? (
                <p className="text-sm leading-6 text-muted-foreground">No registration needed — just turn up.{openRoles.length ? " Want to help run it? See volunteer roles below." : ""}</p>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  {state === "not_open" ? "Registration has not opened yet. Save the event to get a reminder." : null}
                  {state === "closed" ? "Registration for this event has closed." : null}
                  {state === "full" ? "This event is fully booked and has no waitlist." : null}
                  {state === "ended" ? "This event has ended." : null}
                  {state === "cancelled" ? "This event has been cancelled." : null}
                  {state === "postponed" ? "Registration is paused while the event is postponed." : null}
                </p>
              )}
              {event.requires_approval && (state === "open" || state === "waitlist") && !viewerState.registration ? (
                <p className="mt-3 text-xs text-muted-foreground">Every registration is reviewed by the organisers before it&rsquo;s confirmed.</p>
              ) : null}
            </div>
            {openRoles.length ? (
              <a href="#volunteer" className="mt-5 block border-t border-border pt-4 text-sm text-primary hover:underline">
                {openRoles.length} volunteer role{openRoles.length > 1 ? "s" : ""} open →
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {relatedItems.length ? (
        <section className="page-container mt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="font-display text-headline">More in {event.category?.name}</h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {relatedItems.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ) : publicEvent ? null : (
        <div className="page-container mt-16">
          <EmptyState compact title="Not published yet" description="Related events appear once this event is published." />
        </div>
      )}
    </article>
  );
}
