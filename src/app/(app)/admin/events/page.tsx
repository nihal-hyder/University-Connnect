import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { reviewEvent } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { formatEventRange, formatMoney, relativeFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event reviews" };

export default async function EventReviewsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      "id, slug, title, summary, event_type, starts_at, ends_at, timezone, format, venue, is_free, fee_amount, fee_currency, fee_description, submitted_at, registration_mode, external_registration_url, society:societies!events_society_id_fkey(name, slug, verified_at)",
    )
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true })
    .limit(100);

  return (
    <>
      <PageHeader title="Event reviews" description="Events from societies that are not yet trusted to publish directly. Oldest first." />
      {data?.length ? (
        <ul className="space-y-4">
          {data.map((e) => (
            <li key={e.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="eyebrow text-signal-ink">{EVENT_TYPE_LABELS[e.event_type]}</p>
                  <h2 className="mt-1 font-display text-xl">{e.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {e.society.name} · {formatEventRange(e.starts_at, e.ends_at, e.timezone)} · submitted {e.submitted_at ? relativeFromNow(e.submitted_at) : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-4">
                  <Link href={`/manage/${e.society.slug}/events/${e.id}`} className="text-sm font-medium text-primary hover:underline">
                    Manage
                  </Link>
                  <Link href={`/events/${e.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Preview <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
              {e.summary ? <p className="mt-3 text-sm leading-6">{e.summary}</p> : null}
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-muted-foreground">Fee: </dt>
                  <dd className="inline">{e.is_free ? "Free" : `${formatMoney(e.fee_amount, e.fee_currency) ?? "Paid"} — ${e.fee_description ?? ""}`}</dd>
                </div>
                {e.registration_mode === "external" ? (
                  <div>
                    <dt className="inline text-muted-foreground">External link: </dt>
                    <dd className="inline break-all">{e.external_registration_url}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <ActionButton size="sm" action={reviewEvent.bind(null, e.id, "published")} confirm={{ title: "Approve and publish?", body: "It goes live immediately (or at its scheduled time).", confirmLabel: "Publish", note: { label: "Note to organisers" } }}>
                  Approve
                </ActionButton>
                <ActionButton size="sm" variant="outline" action={reviewEvent.bind(null, e.id, "changes_requested")} confirm={{ title: "Request changes", confirmLabel: "Send", note: { label: "What needs to change?", required: true } }}>
                  Request changes
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  action={reviewEvent.bind(null, e.id, "rejected")}
                  confirm={{ title: "Reject this event?", confirmLabel: "Reject", destructive: true, note: { label: "Reason", required: true } }}
                >
                  Reject
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="No events waiting" description="Submitted events from societies that require review appear here." />
      )}
    </>
  );
}
