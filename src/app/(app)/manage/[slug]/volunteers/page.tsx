import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader, Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { requireSocietyAccess } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Volunteers" };

export default async function SocietyVolunteersPage({ params }: PageProps<"/manage/[slug]/volunteers">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug);
  if (!ctx.can("manage_volunteers") && !ctx.can("view_volunteer_applicants")) notFound();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: roles } = await supabase
    .from("volunteer_roles")
    .select("id, title, positions, accepted_count, application_count, status, event:events!inner(id, title, starts_at, ends_at, timezone, society_id)")
    .eq("event.society_id", ctx.society.id)
    .gt("event.ends_at", nowIso)
    .order("application_deadline", { ascending: true, nullsFirst: false });
  const roleIds = (roles ?? []).map((r) => r.id);

  const [statusRows, shifts] = await Promise.all([
    roleIds.length ? supabase.from("volunteer_applications").select("status").in("role_id", roleIds) : Promise.resolve({ data: [] as { status: string }[] }),
    roleIds.length
      ? supabase
          .from("volunteer_shifts")
          .select("id, title, starts_at, ends_at, location, role:volunteer_roles!inner(title, event:events!inner(id, title)), assignments:volunteer_shift_assignments(count)")
          .in("role_id", roleIds)
          .gt("starts_at", nowIso)
          .order("starts_at")
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const by = (s: string[]) => (statusRows.data ?? []).filter((r) => s.includes(r.status)).length;
  const positions = (roles ?? []).reduce((n, r) => n + r.positions, 0);
  const confirmed = (roles ?? []).reduce((n, r) => n + r.accepted_count, 0);

  return (
    <>
      <PageHeader title="Volunteers" description="Recruitment across your upcoming events." />
      <StatRow>
        <Stat label="Total positions" value={positions} hint={`${Math.max(0, positions - confirmed)} unfilled`} />
        <Stat label="Applications received" value={(statusRows.data ?? []).filter((r) => r.status !== "withdrawn").length} />
        <Stat label="Waiting for review" value={by(["submitted", "under_review", "shortlisted", "interview_requested"])} />
        <Stat label="Offers outstanding" value={by(["offered"])} hint={`${confirmed} confirmed volunteers`} />
      </StatRow>

      <Section title="Roles on upcoming events" className="mt-10">
        {roles?.length ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Event</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Applied</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Filled</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/manage/${slug}/events/${r.event.id}/volunteers?role=${r.id}`} className="font-medium hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.event.title} · {formatDate(r.event.starts_at, r.event.timezone)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.application_count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.accepted_count}/{r.positions}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState compact title="No volunteer roles on upcoming events" description="Add roles in an event's Volunteers step to start recruiting." />
        )}
      </Section>

      <Section title="Upcoming shifts" className="mt-10">
        {shifts.data?.length ? (
          <ul className="divide-y divide-border border-y border-border text-sm">
            {shifts.data.map((s) => {
              const count = Array.isArray(s.assignments) ? (s.assignments[0] as { count: number } | undefined)?.count ?? 0 : 0;
              return (
                <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {s.title} <span className="font-normal text-muted-foreground">· {s.role.title}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {s.role.event.title} · {formatDateTime(s.starts_at)} – {formatTime(s.ends_at)}
                      {s.location ? ` · ${s.location}` : ""}
                    </p>
                  </div>
                  <span className="tabular-nums">{count} assigned</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming shifts scheduled.</p>
        )}
      </Section>
    </>
  );
}
