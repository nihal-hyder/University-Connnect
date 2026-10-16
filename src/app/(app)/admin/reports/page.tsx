import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { setSocietyStatus, updateReport } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { REPORT_REASON_LABELS, REPORT_STATUS_COPY } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin();
  const { show } = await searchParams;
  const closed = show === "closed";
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, target_type, reason, details, status, resolution_note, created_at, reporter:profiles!reports_reporter_id_fkey(full_name), event:events(slug, title, society_id), society:societies(id, slug, name, status)",
    )
    .in("status", closed ? ["resolved", "dismissed"] : ["open", "reviewing"])
    .order("created_at", { ascending: !closed })
    .limit(200);

  return (
    <>
      <PageHeader title="Reports" description="Reports from users about events and societies." />
      <nav aria-label="Report status" className="mb-6 flex gap-1">
        {[
          { k: "", l: "Open" },
          { k: "closed", l: "Closed" },
        ].map((t) => (
          <Link
            key={t.l}
            href={t.k ? `/admin/reports?show=${t.k}` : "/admin/reports"}
            aria-current={(t.k === "closed") === closed ? "page" : undefined}
            className={cn("rounded-full px-3.5 py-1.5 text-sm", (t.k === "closed") === closed ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary")}
          >
            {t.l}
          </Link>
        ))}
      </nav>
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">
                  {REPORT_REASON_LABELS[r.reason]} ·{" "}
                  {r.event ? (
                    <Link href={`/events/${r.event.slug}`} className="text-primary hover:underline">
                      {r.event.title}
                    </Link>
                  ) : r.society ? (
                    <Link href={`/societies/${r.society.slug}`} className="text-primary hover:underline">
                      {r.society.name}
                    </Link>
                  ) : (
                    r.target_type
                  )}
                </p>
                <ToneBadge tone={REPORT_STATUS_COPY[r.status].tone} dot>
                  {REPORT_STATUS_COPY[r.status].label}
                </ToneBadge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(r.created_at)} · reported by {r.reporter?.full_name || "a deleted account"}
              </p>
              {r.details ? <p className="mt-3 text-sm leading-6 whitespace-pre-line">{r.details}</p> : null}
              {r.resolution_note ? <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm">Resolution: {r.resolution_note}</p> : null}
              {!closed ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {r.status === "open" ? (
                    <ActionButton size="sm" variant="outline" action={updateReport.bind(null, r.id, "reviewing")}>
                      Start review
                    </ActionButton>
                  ) : null}
                  <ActionButton size="sm" action={updateReport.bind(null, r.id, "resolved")} confirm={{ title: "Mark resolved", confirmLabel: "Resolve", note: { label: "What was done?", required: true } }}>
                    Resolve
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" action={updateReport.bind(null, r.id, "dismissed")} confirm={{ title: "Dismiss this report?", confirmLabel: "Dismiss", note: { label: "Why?" } }}>
                    Dismiss
                  </ActionButton>
                  {r.society && r.society.status === "active" ? (
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      action={setSocietyStatus.bind(null, r.society.id, "suspended")}
                      confirm={{ title: `Suspend ${r.society.name}?`, body: "Its profile and events are hidden and its team can't make changes.", confirmLabel: "Suspend", destructive: true, note: { label: "Reason (shown to the society)", required: true } }}
                    >
                      Suspend society
                    </ActionButton>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title={closed ? "No closed reports" : "No open reports"} />
      )}
    </>
  );
}
