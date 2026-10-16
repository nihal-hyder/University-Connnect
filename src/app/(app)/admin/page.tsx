import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { requireAdmin } from "@/lib/auth/session";
import { emailMode, serverEnv } from "@/lib/env/server";
import { formatDateTime, olderThan, relativeFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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
  const { data, error } = await supabase.rpc("admin_platform_metrics");
  const m = data as unknown as Metrics | null;
  const job = m?.last_job_run;
  const webhookConfigured = Boolean(serverEnv.resendWebhookSecret);
  const jobStale = olderThan(job?.started_at, 2 * 3600 * 1000);

  return (
    <>
      <PageHeader title="Platform overview" description="Aggregate counts only. Open a queue to act." />
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
