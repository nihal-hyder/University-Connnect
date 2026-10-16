import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader, Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { setMaintenance } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { emailMode, serverEnv } from "@/lib/env/server";
import { formatDateTime, olderThan, relativeFromNow } from "@/lib/format";
import { DEFAULT_MAINTENANCE_MESSAGE, parseSiteStatus } from "@/lib/site-status";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Administration" };

type Metrics = {
  users: number;
  users_last_30_days: number;
  active_societies: number;
  suspended_societies: number;
  pending_society_applications: number;
  events_pending_review: number;
  published_upcoming_events: number;
  registrations_last_30_days: number;
  volunteer_applications_last_30_days: number;
  open_reports: number;
  email_queued: number;
  email_failed_last_7_days: number;
  email_sent_last_7_days: number;
  email_logged_dev_last_7_days: number;
  email_delivered_last_7_days: number;
  email_bounced_last_7_days: number;
  last_job_run: { job: string; started_at: string; finished_at: string | null; ok: boolean | null; summary: unknown } | null;
};

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data, error }, statusRes] = await Promise.all([supabase.rpc("admin_platform_metrics"), supabase.rpc("get_site_status")]);
  const m = data as unknown as Metrics | null;
  const site = parseSiteStatus(statusRes.data);
  const job = m?.last_job_run;
  const webhookConfigured = Boolean(serverEnv.resendWebhookSecret);
  const jobStale = olderThan(job?.started_at, 2 * 3600 * 1000);

  return (
    <>
      <PageHeader title="Platform overview" description="Aggregate counts only. Open a queue to act." />

      <Section title="Site availability" className="mb-10">
        <div
          className={cn(
            "flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between",
            site.maintenance ? "border-warning/50 bg-warning-soft" : "border-border bg-surface",
          )}
        >
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <span className={cn("size-2.5 shrink-0 rounded-full", site.maintenance ? "bg-warning" : "bg-success")} aria-hidden />
              {site.maintenance ? "Under maintenance: visitors see the maintenance page" : "Online: the site is available to everyone"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {site.maintenance
                ? `Message: "${site.message ?? DEFAULT_MAINTENANCE_MESSAGE}". Administrators can keep using the site.`
                : "Maintenance mode hides the site from everyone except platform administrators."}
              {site.updatedAt ? ` Last changed ${relativeFromNow(site.updatedAt)}.` : ""}
            </p>
          </div>
          {statusRes.error ? (
            <p className="text-sm text-destructive">Status could not be loaded.</p>
          ) : site.maintenance ? (
            <ActionButton
              className="shrink-0"
              action={setMaintenance.bind(null, false)}
              confirm={{ title: "Bring the site back online?", body: "Everyone will be able to use the site again straight away.", confirmLabel: "Go live" }}
            >
              Bring site back online
            </ActionButton>
          ) : (
            <ActionButton
              className="shrink-0"
              variant="destructive"
              action={setMaintenance.bind(null, true)}
              confirm={{
                title: "Put the site into maintenance mode?",
                body: "All visitors except platform administrators will see a maintenance page until you switch it off. Signed-in users stay signed in.",
                confirmLabel: "Turn on maintenance",
                destructive: true,
                note: { label: "Message for visitors", placeholder: DEFAULT_MAINTENANCE_MESSAGE },
              }}
            >
              Turn on maintenance mode
            </ActionButton>
          )}
        </div>
      </Section>

      {error || !m ? (
        <p className="text-sm text-destructive">Metrics could not be loaded.</p>
      ) : (
        <>
          <StatRow>
            <Stat label="Society applications waiting" value={m.pending_society_applications} hint={<Link href="/admin/societies" className="text-primary hover:underline">Review</Link>} />
            <Stat label="Events awaiting review" value={m.events_pending_review} hint={<Link href="/admin/events" className="text-primary hover:underline">Review</Link>} />
            <Stat label="Open reports" value={m.open_reports} hint={<Link href="/admin/reports" className="text-primary hover:underline">Review</Link>} />
            <Stat label="Upcoming published events" value={m.published_upcoming_events} />
          </StatRow>

          <Section title="Usage" className="mt-10" description="Last 30 days unless stated.">
            <dl className="grid grid-cols-2 gap-6 rounded-xl border border-border bg-surface p-5 sm:grid-cols-4">
              <Stat label="Accounts (all time)" value={m.users} hint={`${m.users_last_30_days} new`} />
              <Stat label="Active societies" value={m.active_societies} hint={`${m.suspended_societies} suspended`} />
              <Stat label="Registrations" value={m.registrations_last_30_days} />
              <Stat label="Volunteer applications" value={m.volunteer_applications_last_30_days} />
            </dl>
          </Section>

          <Section title="Service health" className="mt-10">
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Email delivery mode</dt>
                <dd className={emailMode === "development" ? "text-warning" : ""}>
                  {emailMode === "resend" ? "Resend (live)" : "Development: emails are logged, not sent. Set RESEND_API_KEY to send."}
                </dd>
              </div>
              <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Emails, last 7 days</dt>
                <dd className="tabular-nums">
                  {m.email_sent_last_7_days} accepted by provider ({m.email_delivered_last_7_days} confirmed delivered, {m.email_bounced_last_7_days} bounced or
                  marked spam) · {m.email_logged_dev_last_7_days} logged (dev) · {m.email_failed_last_7_days} failed · {m.email_queued} queued now
                </dd>
              </div>
              <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Delivery tracking</dt>
                <dd className={webhookConfigured ? "" : "text-warning"}>
                  {webhookConfigured ? "Resend webhook configured" : "Not configured: set RESEND_WEBHOOK_SECRET to record delivered and bounced emails."}
                </dd>
              </div>
              <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between">
                <dt className="text-muted-foreground">Scheduled job</dt>
                <dd className={jobStale ? "text-warning" : ""}>
                  {job
                    ? `${job.job} ran ${relativeFromNow(job.started_at)} (${formatDateTime(job.started_at)}) · ${job.ok === false ? "failed" : job.finished_at ? "succeeded" : "running"}`
                    : "Never run."}
                  {jobStale ? " Check that the scheduler is calling /api/jobs/process." : ""}
                </dd>
              </div>
            </dl>
          </Section>
        </>
      )}
    </>
  );
}
