import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarClock, ExternalLink, MapPin } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { ToneBadge } from "@/components/common/tone-badge";
import { Section } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { respondToOffer, withdrawApplication } from "@/lib/actions/student";
import { requireViewer } from "@/lib/auth/session";
import { VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_TONE, type VolunteerStatus } from "@/lib/events/labels";
import { formatAnswer, parseStoredFields } from "@/lib/forms/schema";
import { formatDateTime, formatEventRange, formatTime, isFuture } from "@/lib/format";
import { publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";
import { WITHDRAWABLE } from "@/lib/volunteers/transitions";

export const metadata: Metadata = { title: "Application", robots: { index: false } };

export default async function ApplicationDetailPage({ params }: PageProps<"/dashboard/applications/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/dashboard/applications/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("volunteer_applications")
    .select(
      `id, status, reference_code, answers, portfolio_url, offer_message, offered_at, offer_expires_at, completed_at, created_at,
       form:form_versions(fields),
       role:volunteer_roles!inner(title, description, responsibilities, time_commitment, schedule_notes, is_paid, compensation_details, benefits),
       event:events!inner(id, slug, title, starts_at, ends_at, timezone, schedule_status, society:societies!events_society_id_fkey(name, slug))`,
    )
    .eq("id", id)
    .eq("user_id", viewer.user.id)
    .maybeSingle();
  if (!app) notFound();

  const [history, shifts, certificate] = await Promise.all([
    supabase.from("volunteer_status_history").select("id, to_status, message, created_at").eq("application_id", app.id).order("created_at"),
    supabase
      .from("volunteer_shift_assignments")
      .select("shift:volunteer_shifts!inner(id, title, starts_at, ends_at, location, instructions)")
      .eq("application_id", app.id),
    supabase.from("certificates").select("code, issued_at, revoked_at").eq("volunteer_application_id", app.id).maybeSingle(),
  ]);

  const status = app.status as VolunteerStatus;
  const fields = parseStoredFields(app.form?.fields ?? []);
  const answers = (app.answers ?? {}) as Record<string, unknown>;
  const offerOpen = status === "offered" && (!app.offer_expires_at || isFuture(app.offer_expires_at));
  const myShifts = (shifts.data ?? []).map((s) => s.shift).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const cert = certificate.data && !certificate.data.revoked_at ? certificate.data : null;

  return (
    <>
      <Link href="/dashboard/applications" className="text-sm text-muted-foreground hover:text-foreground">
        ← My applications
      </Link>
      <p className="eyebrow mt-6 text-signal-ink">
        {app.event.society.name} · {app.event.title}
      </p>
      <h1 className="mt-1.5 font-display text-[2rem] leading-tight">{app.role.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ToneBadge tone={VOLUNTEER_STATUS_TONE[status]} dot>
          {VOLUNTEER_STATUS_LABELS[status]}
        </ToneBadge>
        <span className="font-mono text-sm text-muted-foreground">Ref. {app.reference_code}</span>
        <span className="text-sm text-muted-foreground">· {app.role.is_paid ? `Paid: ${app.role.compensation_details}` : "Unpaid volunteer role"}</span>
      </div>

      {status === "offered" ? (
        <div className="mt-8 rounded-xl border border-signal/40 bg-signal-soft/50 p-6">
          <h2 className="font-display text-2xl">You have an offer</h2>
          {app.offer_message ? <p className="mt-3 text-[15px] leading-7 whitespace-pre-line">{app.offer_message}</p> : null}
          <p className="mt-3 text-sm text-muted-foreground">
            {app.offer_expires_at
              ? offerOpen
                ? `Please respond by ${formatDateTime(app.offer_expires_at)}.`
                : "This offer has expired."
              : "Please respond so the organisers can plan."}{" "}
            {app.role.time_commitment ? `Expected commitment: ${app.role.time_commitment}.` : null}
          </p>
          {offerOpen ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <ActionButton
                action={respondToOffer.bind(null, app.id, true)}
                confirm={{
                  title: "Accept this role?",
                  body: "The organisers will count on you. If your plans change later, withdraw as early as possible so they can offer the place to someone else.",
                  confirmLabel: "Accept offer",
                }}
              >
                Accept offer
              </ActionButton>
              <ActionButton
                variant="outline"
                action={respondToOffer.bind(null, app.id, false)}
                confirm={{ title: "Decline this offer?", body: "The place will be offered to someone else. This cannot be undone.", confirmLabel: "Decline", destructive: true }}
              >
                Decline
              </ActionButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {cert ? (
        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-success/30 bg-success-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Award className="mt-0.5 size-5 text-success" aria-hidden />
            <div>
              <p className="font-medium">Certificate issued</p>
              <p className="text-sm text-muted-foreground">Anyone can verify it with code {cert.code}.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="bg-surface">
            <Link href={`/certificates/${cert.code}`}>View certificate</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-2 grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {myShifts.length ? (
            <Section title="Your shifts" className="mt-10">
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {myShifts.map((s) => (
                  <li key={s.id} className="px-5 py-4">
                    <p className="font-medium">{s.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" aria-hidden />
                        {formatDateTime(s.starts_at)} – {formatTime(s.ends_at)}
                      </span>
                      {s.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" aria-hidden />
                          {s.location}
                        </span>
                      ) : null}
                    </p>
                    {s.instructions ? <p className="mt-2 text-sm leading-6 whitespace-pre-line">{s.instructions}</p> : null}
                    <div className="mt-2">
                      <AddToCalendar
                        size="sm"
                        variant="ghost"
                        label="Add shift to calendar"
                        icsHref={`/api/shifts/${s.id}/ics`}
                        item={{
                          uid: `shift-${s.id}@campusconnect`,
                          title: `${app.role.title}: ${s.title} (${app.event.title})`,
                          start: s.starts_at,
                          end: s.ends_at,
                          location: s.location,
                          description: s.instructions,
                          url: `${publicEnv.siteUrl}/dashboard/applications/${app.id}`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : status === "accepted" ? (
            <Section title="Your shifts" className="mt-10">
              <p className="text-sm text-muted-foreground">The organisers haven&rsquo;t assigned shifts yet. You&rsquo;ll be notified when they do.</p>
            </Section>
          ) : null}

          <Section title="Updates" className="mt-10">
            <ol className="space-y-4 border-l border-border pl-5 text-sm">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-foreground/40" aria-hidden />
                  <span className="font-medium">{VOLUNTEER_STATUS_LABELS[h.to_status]}</span>
                  <span className="text-muted-foreground"> · {formatDateTime(h.created_at)}</span>
                  {h.message ? <p className="mt-1 leading-6 whitespace-pre-line text-foreground/85">{h.message}</p> : null}
                </li>
              ))}
            </ol>
          </Section>

          {fields.some((f) => f.type !== "statement") || app.portfolio_url ? (
            <Section title="Your application" className="mt-10">
              <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                {fields
                  .filter((f) => f.type !== "statement")
                  .map((f) => (
                    <div key={f.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="whitespace-pre-line">{formatAnswer(answers[f.id]) || "—"}</dd>
                    </div>
                  ))}
                {app.portfolio_url ? (
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                    <dt className="text-muted-foreground">Portfolio</dt>
                    <dd>
                      <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {app.portfolio_url} <ExternalLink className="size-3" aria-hidden />
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Section>
          ) : null}

          {WITHDRAWABLE.includes(status) ? (
            <div className="mt-10 border-t border-border pt-6">
              <ActionButton
                variant="outline"
                action={withdrawApplication.bind(null, app.id)}
                confirm={{
                  title: "Withdraw your application?",
                  body:
                    status === "accepted"
                      ? "You accepted this role. Withdrawing frees your place for someone else. Please only do this if you can no longer take part."
                      : "The organisers will no longer consider this application. You can apply again later while the role is open.",
                  confirmLabel: "Withdraw",
                  destructive: true,
                }}
              >
                Withdraw application
              </ActionButton>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0">
          <Section title="About the role" className="mt-10">
            <div className="space-y-3 text-sm leading-6">
              <p className="text-muted-foreground">{formatEventRange(app.event.starts_at, app.event.ends_at, app.event.timezone)}</p>
              {app.role.responsibilities ? <p className="whitespace-pre-line">{app.role.responsibilities}</p> : null}
              {app.role.schedule_notes ? <p className="text-muted-foreground">{app.role.schedule_notes}</p> : null}
              {app.role.benefits ? (
                <p>
                  <span className="font-medium">What you get:</span> {app.role.benefits}
                </p>
              ) : null}
              <Link href={`/events/${app.event.slug}#volunteer`} className="inline-block font-medium text-primary hover:underline">
                Event page
              </Link>
            </div>
          </Section>
        </aside>
      </div>
    </>
  );
}
