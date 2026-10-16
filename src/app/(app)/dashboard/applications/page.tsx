import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { SampleBadge, ToneBadge } from "@/components/common/tone-badge";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/session";
import { listMyApplications } from "@/lib/data/student";
import { VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_TONE } from "@/lib/events/labels";
import { formatDate, relativeFromNow } from "@/lib/format";

export const metadata: Metadata = { title: "My applications" };

const ACTIVE = new Set(["submitted", "under_review", "shortlisted", "interview_requested", "offered", "waitlisted", "accepted"]);

export default async function ApplicationsPage() {
  const viewer = await requireViewer("/dashboard/applications");
  const apps = await listMyApplications(viewer.user.id);
  const active = apps.filter((a) => ACTIVE.has(a.status));
  const closed = apps.filter((a) => !ACTIVE.has(a.status));

  return (
    <>
      <PageHeader
        title="My applications"
        description="Volunteer and organising-team applications. Status changes are also sent to your notifications."
        actions={
          <Button asChild variant="outline">
            <Link href="/opportunities">Find volunteer roles</Link>
          </Button>
        }
      />
      {apps.length === 0 ? (
        <EmptyState
          title="You haven't applied for any roles yet"
          description="Societies recruit volunteers for registration desks, logistics, media, tech support and more. It's a good way to gain experience and meet people."
          action={
            <Button asChild>
              <Link href="/opportunities">Browse volunteer roles</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AppTable title="In progress" rows={active} empty="No applications in progress." />
          {closed.length ? <AppTable title="Closed" rows={closed} className="mt-10" /> : null}
        </>
      )}
    </>
  );
}

function AppTable({
  title,
  rows,
  empty,
  className,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof listMyApplications>>;
  empty?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((a) => (
            <li key={a.id} className="group relative flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-muted-foreground">
                  {a.event.society.name} · {a.event.title} · {formatDate(a.event.starts_at, a.event.timezone)}
                </p>
                <Link
                  href={`/dashboard/applications/${a.id}`}
                  className="mt-0.5 block font-medium outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline"
                >
                  {a.role.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{a.reference_code}</span> · updated {relativeFromNow(a.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {a.event.is_demo ? <SampleBadge /> : null}
                <ToneBadge tone={VOLUNTEER_STATUS_TONE[a.status]} dot>
                  {VOLUNTEER_STATUS_LABELS[a.status]}
                </ToneBadge>
                <ArrowRight className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
