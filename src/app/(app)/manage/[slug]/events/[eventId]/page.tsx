import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { deleteDraftEvent, duplicateEvent, setScheduleStatus, submitEvent, withdrawSubmission } from "@/lib/actions/events";
import { getManagedEvent } from "@/lib/data/manage";
import { publishProblems } from "@/lib/events/event-schema";
import { eventToFormValues } from "@/lib/events/event-values";
import { formatDateTime, isFuture, isPast, relativeFromNow } from "@/lib/format";
import { parseStoredFields } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event" };

export default async function ManagedEventPage({ params }: PageProps<"/manage/[slug]/events/[eventId]">) {
  const { slug, eventId } = await params;
  const { ctx, event, access } = await getManagedEvent(slug, eventId);
  const supabase = await createClient();
  const base = `/manage/${slug}/events/${event.id}`;
  const actionCtx = { societySlug: slug, eventSlug: event.slug };

  const [privateDetails, roles, targets, form, audit, societyRow] = await Promise.all([
    supabase.rpc("event_private_details", { p_event: event.id }),
    supabase.from("volunteer_roles").select("id, title, positions, accepted_count, application_count, status").eq("event_id", event.id).order("sort_order"),
    supabase.from("event_target_universities").select("university_id").eq("event_id", event.id),
    supabase.from("form_versions").select("fields").eq("event_id", event.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    access.isHost && (ctx.can("manage_members") || ctx.can("publish_events"))
      ? supabase.from("audit_logs").select("id, action, created_at, actor:profiles(full_name)").eq("event_id", event.id).order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: null }),
    supabase.from("societies").select("events_require_review").eq("id", event.society_id).maybeSingle(),
  ]);

  const reviewNote = (privateDetails.data as { review_note?: string | null } | null)?.review_note ?? null;
  const values = eventToFormValues(event, {
    targets: (targets.data ?? []).map((t) => t.university_id),
    formFields: parseStoredFields(form.data?.fields ?? []),
    roles: [],
    onlineUrl: null,
  });
  const problems = publishProblems(values);
  const editable = ["draft", "changes_requested", "rejected"].includes(event.status);
  const ended = isPast(event.ends_at);
  const requiresReview = societyRow.data?.events_require_review ?? true;

  return (
    <>
      {event.status === "changes_requested" || event.status === "rejected" ? (
        <Alert className="mb-8 border-warning/30 bg-warning-soft">
          <AlertTitle>{event.status === "rejected" ? "Not approved for publication" : "Reviewers asked for changes"}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{reviewNote ?? "No note was left."}</AlertDescription>
        </Alert>
      ) : null}
      {event.status === "pending_review" ? (
        <Alert className="mb-8 border-info/30 bg-info-soft">
          <AlertTitle>Waiting for review</AlertTitle>
          <AlertDescription>Submitted {event.submitted_at ? relativeFromNow(event.submitted_at) : ""}. You will be notified when platform staff decide.</AlertDescription>
        </Alert>
      ) : null}
      {event.schedule_status !== "scheduled" && event.schedule_note ? (
        <Alert variant={event.schedule_status === "cancelled" ? "destructive" : "default"} className="mb-8">
          <AlertTitle>{event.schedule_status === "cancelled" ? "Cancelled" : "Postponed"}</AlertTitle>
          <AlertDescription>{event.schedule_note}</AlertDescription>
        </Alert>
      ) : null}

      {event.registration_mode === "individual" || event.registration_mode === "team" ? (
        <StatRow>
          <Stat label="Confirmed" value={event.confirmed_count} hint={event.capacity ? `of ${event.capacity} places` : "No capacity limit"} />
          <Stat label="Awaiting approval" value={event.pending_count} />
          <Stat label="Waitlist" value={event.waitlist_count} />
          <Stat label="Volunteer roles" value={roles.data?.length ?? 0} hint={`${(roles.data ?? []).reduce((n, r) => n + r.accepted_count, 0)} confirmed volunteers`} />
        </StatRow>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          {editable && access.publish && access.isHost ? (
            <Section title="Publish">
              {problems.length ? (
                <div className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-sm font-medium">Finish these before publishing:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href={`${base}/edit`}>Continue editing</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {requiresReview
                      ? "Platform staff review events from newer societies before they go live. Most reviews take a working day."
                      : "Your society is trusted to publish directly. The event goes live immediately or at its scheduled time."}
                  </p>
                  <ActionButton
                    className="shrink-0"
                    action={submitEvent.bind(null, event.id, actionCtx)}
                    confirm={{
                      title: requiresReview ? "Submit for review?" : "Publish this event?",
                      body: requiresReview ? "You can't edit the link after submitting." : "It will be visible to everyone.",
                      confirmLabel: requiresReview ? "Submit" : "Publish",
                    }}
                  >
                    {requiresReview ? "Submit for review" : "Publish"}
                  </ActionButton>
                </div>
              )}
            </Section>
          ) : null}

          {(roles.data ?? []).length ? (
            <Section
              title="Volunteer roles"
              className={editable ? "mt-10" : undefined}
              action={
                access.manageVolunteers || access.viewApplicants ? (
                  <Link href={`${base}/volunteers`} className="font-medium text-primary hover:underline">
                    Manage
                  </Link>
                ) : null
              }
            >
              <ul className="divide-y divide-border border-y border-border text-sm">
                {(roles.data ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.accepted_count}/{r.positions} filled · {r.application_count} applied · {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {audit.data?.length ? (
            <Section title="Activity" className="mt-10" description="Recorded changes to this event.">
              <ol className="space-y-2.5 text-sm">
                {audit.data.map((a) => (
                  <li key={a.id} className="flex flex-wrap gap-x-2">
                    <span className="font-mono text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                    <span>{a.action.replaceAll(".", " · ").replaceAll("_", " ")}</span>
                    {a.actor?.full_name ? <span className="text-muted-foreground">by {a.actor.full_name}</span> : null}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-6">
          <div>
            <h2 className="eyebrow mb-3">Actions</h2>
            <div className="flex flex-col items-stretch gap-2">
              {access.edit ? (
                <Button asChild variant="outline">
                  <Link href={`${base}/edit`}>Edit details</Link>
                </Button>
              ) : null}
              {event.status === "pending_review" && access.publish ? (
                <ActionButton variant="outline" action={withdrawSubmission.bind(null, event.id, actionCtx)}>
                  Withdraw submission
                </ActionButton>
              ) : null}
              {access.isHost && ctx.can("create_events") ? (
                <ActionButton variant="outline" action={duplicateEvent.bind(null, event.id, actionCtx)} hrefOnSuccess={`/manage/${slug}/events/:id/edit`}>
                  Duplicate as new draft
                </ActionButton>
              ) : null}
              {access.cancel && event.status === "published" && !ended && event.schedule_status !== "cancelled" ? (
                <>
                  {event.schedule_status === "postponed" ? (
                    <ActionButton variant="outline" action={setScheduleStatus.bind(null, event.id, "scheduled", actionCtx)}>
                      Mark back on schedule
                    </ActionButton>
                  ) : (
                    <ActionButton
                      variant="outline"
                      action={setScheduleStatus.bind(null, event.id, "postponed", actionCtx)}
                      confirm={{
                        title: "Postpone this event?",
                        body: "Registrations stay in place and everyone registered or volunteering is notified. Update the dates when you know them.",
                        confirmLabel: "Postpone",
                        note: { label: "Message to participants", required: true, placeholder: "At least 10 characters" },
                      }}
                    >
                      Postpone
                    </ActionButton>
                  )}
                  <ActionButton
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    action={setScheduleStatus.bind(null, event.id, "cancelled", actionCtx)}
                    confirm={{
                      title: "Cancel this event?",
                      body: "This can't be undone. Everyone registered or volunteering is notified, and volunteer roles close.",
                      confirmLabel: "Cancel event",
                      destructive: true,
                      note: { label: "Reason for participants", required: true, placeholder: "At least 10 characters" },
                    }}
                  >
                    Cancel event
                  </ActionButton>
                </>
              ) : null}
              {event.status === "draft" && access.isHost && access.edit ? (
                <ActionButton
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  action={deleteDraftEvent.bind(null, event.id, actionCtx)}
                  hrefOnSuccess={`/manage/${slug}/events`}
                  confirm={{ title: "Delete this draft?", body: "The draft and its roles are deleted permanently.", confirmLabel: "Delete", destructive: true }}
                >
                  Delete draft
                </ActionButton>
              ) : null}
            </div>
          </div>
          <dl className="space-y-3 border-t border-border pt-6 text-sm">
            <div>
              <dt className="text-muted-foreground">Link</dt>
              <dd className="font-mono text-xs break-all">/events/{event.slug}</dd>
            </div>
            {event.published_at ? (
              <div>
                <dt className="text-muted-foreground">Published</dt>
                <dd>{formatDateTime(event.published_at)}</dd>
              </div>
            ) : null}
            {isFuture(event.publish_at) ? (
              <div>
                <dt className="text-muted-foreground">Goes live</dt>
                <dd>{formatDateTime(event.publish_at)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>{relativeFromNow(event.updated_at)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}
