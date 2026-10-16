import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ExternalLink, Lock } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { ToneBadge } from "@/components/common/tone-badge";
import { Section } from "@/components/layout/dashboard-shell";
import { ApplicationStatusControls } from "@/components/manage/application-status-controls";
import { addApplicationNote, assignShift, issueCertificate, revokeCertificate } from "@/lib/actions/volunteers";
import { getManagedEvent } from "@/lib/data/manage";
import { ACADEMIC_LEVEL_LABELS, VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_TONE } from "@/lib/events/labels";
import { formatAnswer, parseStoredFields } from "@/lib/forms/schema";
import { formatDateTime, formatTime, isPast } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Volunteer application", robots: { index: false } };

export default async function ApplicationReviewPage({ params }: PageProps<"/manage/[slug]/events/[eventId]/volunteers/[applicationId]">) {
  const { slug, eventId, applicationId } = await params;
  const { event, access } = await getManagedEvent(slug, eventId);
  if (!access.viewApplicants || !/^[0-9a-f-]{36}$/i.test(applicationId)) notFound();
  const supabase = await createClient();
  const ctx = { societySlug: slug };

  // RLS: only role managers (host, or collaborator assigned to the role) see this row.
  const { data: app } = await supabase
    .from("volunteer_applications")
    .select(
      `id, status, reference_code, answers, portfolio_url, created_at, offer_expires_at, role_id,
       form:form_versions(fields),
       role:volunteer_roles!inner(id, title, positions, accepted_count),
       user:profiles!volunteer_applications_user_id_fkey(full_name, contact_email, program, academic_level, graduation_year,
         university:universities(name), department:departments(name))`,
    )
    .eq("id", applicationId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!app) notFound();

  const [history, notes, shifts, assignments, cert] = await Promise.all([
    supabase.from("volunteer_status_history").select("id, from_status, to_status, message, created_at, actor:profiles(full_name)").eq("application_id", app.id).order("created_at"),
    supabase.from("volunteer_application_notes").select("id, body, created_at, author:profiles(full_name)").eq("application_id", app.id).order("created_at"),
    supabase.from("volunteer_shifts").select("id, title, starts_at, ends_at, location, capacity, assignments:volunteer_shift_assignments(count)").eq("role_id", app.role_id).order("starts_at"),
    supabase.from("volunteer_shift_assignments").select("shift_id").eq("application_id", app.id),
    supabase.from("certificates").select("id, code, issued_at, revoked_at").eq("volunteer_application_id", app.id).maybeSingle(),
  ]);

  const fields = parseStoredFields(app.form?.fields ?? []);
  const answers = (app.answers ?? {}) as Record<string, unknown>;
  const assigned = new Set((assignments.data ?? []).map((a) => a.shift_id));
  const eventStarted = isPast(event.starts_at);
  const u = app.user;

  return (
    <>
      <Link href={`/manage/${slug}/events/${event.id}/volunteers`} className="text-sm text-muted-foreground hover:text-foreground">
        ← All applications
      </Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-3xl">{u?.full_name || "Unnamed applicant"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {app.role.title} · <span className="font-mono">{app.reference_code}</span> · applied {formatDateTime(app.created_at)}
          </p>
        </div>
        <ToneBadge tone={VOLUNTEER_STATUS_TONE[app.status]} dot>
          {VOLUNTEER_STATUS_LABELS[app.status]}
        </ToneBadge>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {access.manageVolunteers ? (
            <Section title="Decision">
              <p className="mb-3 text-sm text-muted-foreground">
                {app.role.accepted_count} of {app.role.positions} positions filled.
                {app.status === "offered" && app.offer_expires_at ? ` Offer open until ${formatDateTime(app.offer_expires_at)}.` : ""}
              </p>
              <ApplicationStatusControls applicationId={app.id} status={app.status} societySlug={slug} eventStarted={eventStarted} />
            </Section>
          ) : null}

          <Section title="Answers" className="mt-10">
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              {fields
                .filter((f) => f.type !== "statement")
                .map((f) => (
                  <div key={f.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="whitespace-pre-line">{formatAnswer(answers[f.id]) || "—"}</dd>
                  </div>
                ))}
              {app.portfolio_url ? (
                <div className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Portfolio</dt>
                  <dd>
                    <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                      {app.portfolio_url} <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </dd>
                </div>
              ) : null}
              {!fields.length && !app.portfolio_url ? <p className="px-4 py-3 text-muted-foreground">This role had no application questions.</p> : null}
            </dl>
          </Section>

          {app.status === "accepted" || app.status === "completed" ? (
            <Section title="Shifts" className="mt-10" description="Assign accepted volunteers to the role's shifts. They are notified.">
              {shifts.data?.length ? (
                <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
                  {shifts.data.map((s) => {
                    const taken = Array.isArray(s.assignments) ? ((s.assignments[0] as { count: number } | undefined)?.count ?? 0) : 0;
                    const full = s.capacity !== null && taken >= s.capacity;
                    return (
                    <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-muted-foreground">
                          {formatDateTime(s.starts_at)} – {formatTime(s.ends_at)}
                          {s.location ? ` · ${s.location}` : ""}
                          {s.capacity ? ` · ${taken}/${s.capacity} places` : ""}
                        </p>
                      </div>
                      {access.manageVolunteers ? (
                        assigned.has(s.id) ? (
                          <ActionButton size="sm" variant="ghost" action={assignShift.bind(null, s.id, app.id, false, ctx)}>
                            Unassign
                          </ActionButton>
                        ) : (
                          <ActionButton size="sm" variant="outline" disabled={app.status !== "accepted" || full} action={assignShift.bind(null, s.id, app.id, true, ctx)}>
                            {full ? "Full" : "Assign"}
                          </ActionButton>
                        )
                      ) : assigned.has(s.id) ? (
                        <ToneBadge tone="positive">Assigned</ToneBadge>
                      ) : null}
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shifts yet.{" "}
                  <Link href={`/manage/${slug}/events/${event.id}/volunteers/roles/${app.role_id}`} className="font-medium text-primary hover:underline">
                    Create shifts for this role
                  </Link>
                </p>
              )}
            </Section>
          ) : null}

          {app.status === "completed" ? (
            <Section title="Certificate" className="mt-10">
              {cert.data ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 size-5 text-success" aria-hidden />
                    <div>
                      <p className="font-medium">{cert.data.revoked_at ? "Certificate revoked" : "Certificate issued"}</p>
                      <p className="font-mono text-sm text-muted-foreground">{cert.data.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/certificates/${cert.data.code}`} className="text-sm font-medium text-primary hover:underline">
                      Verification page
                    </Link>
                    {access.isHost && access.issueCertificates && !cert.data.revoked_at ? (
                      <ActionButton
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        action={revokeCertificate.bind(null, cert.data.id, ctx)}
                        confirm={{ title: "Revoke this certificate?", body: "Its public verification page will show it as invalid.", confirmLabel: "Revoke", destructive: true, note: { label: "Reason", required: true } }}
                      >
                        Revoke
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              ) : access.isHost && access.issueCertificates ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">Participation is marked complete. Issue a verifiable certificate if they met your criteria.</p>
                  <ActionButton
                    action={issueCertificate.bind(null, app.id, ctx)}
                    confirm={{
                      title: "Issue a certificate?",
                      body: `It will name ${u?.full_name || "the volunteer"} as ${app.role.title} at ${event.title}, issued by you. Anyone with the code can verify it.`,
                      confirmLabel: "Issue certificate",
                    }}
                  >
                    Issue certificate
                  </ActionButton>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Only the host society&rsquo;s certificate issuers can issue certificates.</p>
              )}
            </Section>
          ) : null}

          <Section title="Timeline" className="mt-10">
            <ol className="space-y-3 border-l border-border pl-5 text-sm">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-foreground/40" aria-hidden />
                  <span className="font-medium">{VOLUNTEER_STATUS_LABELS[h.to_status]}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatDateTime(h.created_at)}
                    {h.actor?.full_name ? ` · ${h.actor.full_name}` : ""}
                  </span>
                  {h.message ? <p className="mt-0.5 whitespace-pre-line text-foreground/85">“{h.message}”</p> : null}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <aside className="min-w-0 space-y-8">
          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h3 className="eyebrow">Applicant</h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{u?.contact_email ?? "—"}</dd>
              </div>
              {u?.university ? (
                <div>
                  <dt className="text-muted-foreground">University</dt>
                  <dd>{u.university.name}</dd>
                </div>
              ) : null}
              {u?.department || u?.program ? (
                <div>
                  <dt className="text-muted-foreground">Studies</dt>
                  <dd>{[u.program, u.department?.name].filter(Boolean).join(", ")}</dd>
                </div>
              ) : null}
              {u?.academic_level || u?.graduation_year ? (
                <div>
                  <dt className="text-muted-foreground">Level</dt>
                  <dd>
                    {u.academic_level ? ACADEMIC_LEVEL_LABELS[u.academic_level] : ""}
                    {u.graduation_year ? ` · class of ${u.graduation_year}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-3.5" aria-hidden /> Internal notes
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Visible to your organising team only, never to the applicant.</p>
            <ul className="mt-3 space-y-3">
              {(notes.data ?? []).map((n) => (
                <li key={n.id} className="rounded-lg bg-secondary/60 p-3 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {n.author?.full_name ?? "Team member"} · {formatDateTime(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
            {access.manageVolunteers ? (
              <ActionButton
                size="sm"
                variant="outline"
                className="mt-3"
                action={addApplicationNote.bind(null, app.id, ctx)}
                confirm={{ title: "Add an internal note", confirmLabel: "Save note", note: { label: "Note", required: true, placeholder: "e.g. Strong logistics experience; available both days." } }}
              >
                Add note
              </ActionButton>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
