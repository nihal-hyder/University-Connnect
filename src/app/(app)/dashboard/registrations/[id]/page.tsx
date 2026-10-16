import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { InstallAppButton } from "@/components/pwa/install-button";
import { SaveTicketOffline } from "@/components/pwa/save-ticket-offline";
import { ToneBadge } from "@/components/common/tone-badge";
import { Section } from "@/components/layout/dashboard-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cancelMyRegistration } from "@/lib/actions/student";
import { requireViewer } from "@/lib/auth/session";
import { REGISTRATION_STATUS_LABELS, REGISTRATION_STATUS_TONE } from "@/lib/events/labels";
import { formatAnswer, parseStoredFields } from "@/lib/forms/schema";
import { formatDateTime, formatEventRange, formatMoney, isPast } from "@/lib/format";
import { publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Registration", robots: { index: false } };

export default async function RegistrationDetailPage({ params }: PageProps<"/dashboard/registrations/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/dashboard/registrations/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  // RLS limits this to the viewer's own registration (organisers would also
  // match, so the user_id filter keeps this page strictly personal).
  const { data: reg } = await supabase
    .from("registrations")
    .select(
      `id, status, reference_code, answers, team_name, team_members, created_at, cancelled_at, cancel_reason, decision_note,
       form:form_versions(fields),
       event:events!inner(id, slug, title, starts_at, ends_at, timezone, format, venue, is_free, fee_amount, fee_currency,
         fee_description, payment_instructions, payment_url, refund_policy, schedule_status, schedule_note,
         society:societies!events_society_id_fkey(name, slug), campus:campuses(name), university:universities!events_university_id_fkey(name))`,
    )
    .eq("id", id)
    .eq("user_id", viewer.user.id)
    .maybeSingle();
  if (!reg) notFound();

  const [ticket, attendance, history, privateDetails] = await Promise.all([
    supabase.from("tickets").select("code, issued_at, revoked_at").eq("registration_id", reg.id).maybeSingle(),
    supabase.from("attendance_records").select("checked_in_at").eq("registration_id", reg.id).maybeSingle(),
    supabase.from("registration_history").select("id, to_status, note, created_at").eq("registration_id", reg.id).order("created_at"),
    reg.status === "confirmed" ? supabase.rpc("event_private_details", { p_event: reg.event.id }) : Promise.resolve({ data: null }),
  ]);

  const e = reg.event;
  const activeTicket = reg.status === "confirmed" && ticket.data && !ticket.data.revoked_at ? ticket.data : null;
  // The QR encodes only the random ticket code: no name, email or answers.
  // Dark modules on a white tile in both themes, so scanners can read it.
  const qrSvg = activeTicket
    ? await QRCode.toString(activeTicket.code, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1f2328", light: "#00000000" } })
    : null;
  const onlineUrl = (privateDetails.data as { online_url?: string | null } | null)?.online_url ?? null;
  const fields = parseStoredFields(reg.form?.fields ?? []);
  const answers = (reg.answers ?? {}) as Record<string, unknown>;
  const started = isPast(e.starts_at);
  const cancellable = ["pending", "confirmed", "waitlisted"].includes(reg.status) && !started;
  const team = Array.isArray(reg.team_members) ? (reg.team_members as { name: string; email: string }[]) : [];

  return (
    <>
      <Link href="/dashboard/registrations" className="text-sm text-muted-foreground hover:text-foreground">
        ← My registrations
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <p className="eyebrow text-signal-ink">{e.society.name}</p>
          <h1 className="mt-1.5 font-display text-[2rem] leading-tight">
            <Link href={`/events/${e.slug}`} className="hover:underline">
              {e.title}
            </Link>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ToneBadge tone={REGISTRATION_STATUS_TONE[reg.status]} dot>
              {REGISTRATION_STATUS_LABELS[reg.status]}
            </ToneBadge>
            <span className="font-mono text-sm text-muted-foreground">Ref. {reg.reference_code}</span>
          </div>

          {e.starts_at && reg.status !== "cancelled" && reg.status !== "rejected" ? (
            <div className="mt-5">
              <AddToCalendar
                size="sm"
                icsHref={`/events/${e.slug}/calendar.ics`}
                item={{
                  uid: `event-${e.id}@campusconnect`,
                  title: e.title,
                  start: e.starts_at,
                  end: e.ends_at,
                  location: e.format === "online" ? "Online" : [e.venue, e.campus?.name, e.university?.name].filter(Boolean).join(", "),
                  description: `Your reference: ${reg.reference_code}. Ticket: ${publicEnv.siteUrl}/dashboard/registrations/${reg.id}`,
                  url: `${publicEnv.siteUrl}/events/${e.slug}`,
                }}
              />
            </div>
          ) : null}

          {e.schedule_status !== "scheduled" ? (
            <Alert variant={e.schedule_status === "cancelled" ? "destructive" : "default"} className="mt-6">
              <AlertTitle>{e.schedule_status === "cancelled" ? "This event has been cancelled" : "This event has been postponed"}</AlertTitle>
              {e.schedule_note ? <AlertDescription>{e.schedule_note}</AlertDescription> : null}
            </Alert>
          ) : null}

          <dl className="mt-8 space-y-4 text-[15px]">
            <div className="flex gap-3">
              <dt className="sr-only">When</dt>
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <dd>{formatEventRange(e.starts_at, e.ends_at, e.timezone)}</dd>
            </div>
            {e.format !== "online" ? (
              <div className="flex gap-3">
                <dt className="sr-only">Where</dt>
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dd>{[e.venue, e.campus?.name, e.university?.name].filter(Boolean).join(", ") || "Venue to be announced"}</dd>
              </div>
            ) : null}
            {e.format !== "in_person" ? (
              <div className="flex gap-3">
                <dt className="sr-only">Online link</dt>
                <Video className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dd>
                  {onlineUrl ? (
                    <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Join online <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : reg.status === "confirmed" ? (
                    "The organisers have not added the meeting link yet."
                  ) : (
                    "The meeting link is shared once your place is confirmed."
                  )}
                </dd>
              </div>
            ) : null}
          </dl>

          {reg.status === "pending" ? (
            <p className="mt-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
              The organisers review registrations for this event. You will be notified when they decide.
            </p>
          ) : null}
          {reg.status === "waitlisted" ? (
            <p className="mt-6 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
              You are on the waitlist. If a place opens you will be moved up automatically and notified.
            </p>
          ) : null}
          {reg.decision_note && reg.status === "rejected" ? (
            <p className="mt-6 rounded-lg bg-secondary px-4 py-3 text-sm">Note from the organisers: {reg.decision_note}</p>
          ) : null}

          {!e.is_free ? (
            <Section title="Fee and payment" className="mt-10">
              <div className="space-y-3 rounded-xl border border-border bg-surface p-5 text-sm leading-6">
                <p>
                  <span className="font-medium">{formatMoney(e.fee_amount, e.fee_currency) ?? "Paid event"}</span>
                  {e.fee_description ? ` · ${e.fee_description}` : null}
                </p>
                {e.payment_instructions ? <p className="whitespace-pre-line text-foreground/85">{e.payment_instructions}</p> : null}
                {e.payment_url ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={e.payment_url} target="_blank" rel="noopener noreferrer">
                      Pay on the organiser&rsquo;s page <ExternalLink />
                    </a>
                  </Button>
                ) : null}
                <p className="text-muted-foreground">
                  Payment is handled directly by the organisers, not by this platform. Your registration status above does not
                  confirm payment.
                </p>
                {e.refund_policy ? <p className="text-muted-foreground">Refunds: {e.refund_policy}</p> : null}
              </div>
            </Section>
          ) : null}

          {team.length || reg.team_name ? (
            <Section title={reg.team_name ? `Team: ${reg.team_name}` : "Team"} className="mt-10">
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                {team.map((m, i) => (
                  <li key={i} className="flex justify-between gap-4 px-4 py-3">
                    <span>{m.name}</span>
                    <span className="truncate text-muted-foreground">{m.email}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {fields.some((f) => f.type !== "statement") ? (
            <Section title="Your answers" className="mt-10">
              <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                {fields
                  .filter((f) => f.type !== "statement")
                  .map((f) => (
                    <div key={f.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="whitespace-pre-line">{formatAnswer(answers[f.id]) || "—"}</dd>
                    </div>
                  ))}
              </dl>
            </Section>
          ) : null}

          <Section title="History" className="mt-10">
            <ol className="space-y-3 border-l border-border pl-5 text-sm">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-foreground/40" aria-hidden />
                  <span className="font-medium">{REGISTRATION_STATUS_LABELS[h.to_status]}</span>
                  <span className="text-muted-foreground"> · {formatDateTime(h.created_at)}</span>
                  {h.note ? <p className="mt-0.5 text-muted-foreground">{h.note}</p> : null}
                </li>
              ))}
              {attendance.data ? (
                <li className="relative">
                  <span className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-success" aria-hidden />
                  <span className="font-medium">Checked in</span>
                  <span className="text-muted-foreground"> · {formatDateTime(attendance.data.checked_in_at)}</span>
                </li>
              ) : null}
            </ol>
          </Section>

          {cancellable ? (
            <div className="mt-10 border-t border-border pt-6">
              <ActionButton
                variant="outline"
                action={cancelMyRegistration.bind(null, reg.id)}
                confirm={{
                  title: "Cancel this registration?",
                  body: "Your place will be released and may go to someone on the waitlist. If you change your mind you can register again while places remain.",
                  confirmLabel: "Cancel registration",
                  destructive: true,
                  note: { label: "Reason for the organisers" },
                }}
              >
                Cancel registration
              </ActionButton>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0">
          {activeTicket && qrSvg ? (
            <div className="rounded-xl border border-border bg-surface p-5 text-center lg:sticky lg:top-24">
              <p className="eyebrow">Your ticket</p>
              <div
                className="mx-auto mt-4 aspect-square w-full max-w-56 rounded-lg bg-white p-2 [&_svg]:size-full"
                role="img"
                aria-label={`QR code for ticket ${reg.reference_code}`}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="mt-4 text-xs text-muted-foreground">Show this at the entrance. If the scanner cannot read it, give this code:</p>
              <p className="mt-1 font-mono text-sm break-all select-all">{activeTicket.code}</p>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Once opened, this ticket also works offline in the installed app, handy at gates with weak signal.
              </p>
              <InstallAppButton className="mt-2" label="Install app for offline tickets" />
              <SaveTicketOffline />
              {attendance.data ? (
                <p className="mt-4 rounded-md bg-success-soft px-3 py-2 text-sm text-success">Checked in {formatDateTime(attendance.data.checked_in_at)}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
              A ticket with a QR code appears here once your place is confirmed.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
