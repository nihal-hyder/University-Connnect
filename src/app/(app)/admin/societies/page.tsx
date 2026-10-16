import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, relativeFromNow } from "@/lib/format";
import { APPLICATION_STATUS_COPY, type SocietyApplicationStatus } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Society applications" };

const TABS: { key: string; label: string; statuses: SocietyApplicationStatus[] }[] = [
  { key: "queue", label: "Waiting", statuses: ["submitted", "under_review"] },
  { key: "info", label: "Info requested", statuses: ["info_requested"] },
  { key: "decided", label: "Decided", statuses: ["approved", "rejected"] },
];

export default async function SocietyApplicationsPage({ searchParams }: PageProps<"/admin/societies">) {
  await requireAdmin();
  const { tab: raw } = await searchParams;
  const tab = TABS.find((t) => t.key === raw) ?? TABS[0];
  const supabase = await createClient();
  const { data } = await supabase
    .from("society_applications")
    .select("id, name, status, submitted_at, updated_at, university:universities(name, short_name), applicant:profiles!society_applications_applicant_id_fkey(full_name)")
    .in("status", tab.statuses)
    .order("submitted_at", { ascending: tab.key === "queue", nullsFirst: false })
    .limit(200);

  return (
    <>
      <PageHeader title="Society applications" description="Oldest first. Check recognition evidence before approving." />
      <nav aria-label="Application status" className="mb-6 flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/societies?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cn("rounded-full px-3.5 py-1.5 text-sm", t.key === tab.key ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {data?.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {data.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/admin/societies/${a.id}`} className="font-medium hover:underline">
                  {a.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {a.university?.short_name ?? a.university?.name} · by {a.applicant?.full_name || "unknown"} ·{" "}
                  {a.submitted_at ? `submitted ${relativeFromNow(a.submitted_at)}` : `updated ${formatDate(a.updated_at)}`}
                </p>
              </div>
              <ToneBadge tone={APPLICATION_STATUS_COPY[a.status].tone} dot>
                {APPLICATION_STATUS_COPY[a.status].label}
              </ToneBadge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="Nothing here" description={tab.key === "queue" ? "No applications are waiting for review." : undefined} />
      )}
    </>
  );
}
