import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { setRoleStatus } from "@/lib/actions/volunteers";
import { getManagedEvent } from "@/lib/data/manage";
import { VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_TONE, type VolunteerStatus } from "@/lib/events/labels";
import { formatDate, relativeFromNow } from "@/lib/format";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Volunteers" };

const STATUS_ORDER = Object.keys(VOLUNTEER_STATUS_LABELS) as VolunteerStatus[];

export default async function EventVolunteersPage({ params, searchParams }: PageProps<"/manage/[slug]/events/[eventId]/volunteers">) {
  const { slug, eventId } = await params;
  const sp = await searchParams;
  const { event, access } = await getManagedEvent(slug, eventId);
  if (!access.manageVolunteers && !access.viewApplicants) notFound();
  const supabase = await createClient();
  const base = `/manage/${slug}/events/${event.id}/volunteers`;
  const ctx = { societySlug: slug };

  const roleFilter = typeof sp.role === "string" && /^[0-9a-f-]{36}$/i.test(sp.role) ? sp.role : undefined;
  const statusFilter = STATUS_ORDER.find((s) => s === sp.status);

  const { data: roles } = await supabase
    .from("volunteer_roles")
    .select("id, title, positions, accepted_count, application_count, status, application_deadline, assigned_society:societies(name)")
    .eq("event_id", event.id)
    .order("sort_order");

  let appsQuery = supabase
    .from("volunteer_applications")
    .select("id, status, reference_code, created_at, updated_at, role_id, user:profiles!volunteer_applications_user_id_fkey(full_name, contact_email)")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .limit(300);
  if (roleFilter) appsQuery = appsQuery.eq("role_id", roleFilter);
  if (statusFilter) appsQuery = appsQuery.eq("status", statusFilter);
  const [{ data: apps }, { data: shifts }] = await Promise.all([
    access.viewApplicants ? appsQuery : Promise.resolve({ data: [] }),
    supabase.from("volunteer_shifts").select("id, starts_at").eq("event_id", event.id).gt("starts_at", new Date().toISOString()),
  ]);

  const roleName = new Map((roles ?? []).map((r) => [r.id, r.title]));
  const totalPositions = (roles ?? []).reduce((n, r) => n + r.positions, 0);
  const accepted = (roles ?? []).reduce((n, r) => n + r.accepted_count, 0);
  const allApps = (roles ?? []).reduce((n, r) => n + r.application_count, 0);

  return (
    <>
      <StatRow>
        <Stat label="Positions" value={totalPositions} hint={`${Math.max(0, totalPositions - accepted)} unfilled`} />
        <Stat label="Applications" value={allApps} />
        <Stat label="Confirmed volunteers" value={accepted} />
        <Stat label="Upcoming shifts" value={shifts?.length ?? 0} />
      </StatRow>
      {!event.volunteer_recruitment_open && (roles ?? []).length ? (
        <p className="mt-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Recruitment is switched off for this event, so roles aren&rsquo;t listed publicly.
          {access.edit ? (
            <>
              {" "}
              <Link href={`/manage/${slug}/events/${event.id}/edit`} className="font-medium underline">
                Turn it on in the event settings
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : null}

      <Section title="Roles" className="mt-10">
        {roles?.length ? (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {roles.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`${base}/roles/${r.id}`} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {r.accepted_count}/{r.positions} filled · {r.application_count} applied
                    {r.application_deadline ? ` · apply by ${formatDate(r.application_deadline)}` : ""}
                    {r.assigned_society ? ` · run by ${r.assigned_society.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={r.status === "open" ? "positive" : r.status === "paused" ? "warning" : "neutral"} dot>
                    {r.status === "open" ? "Accepting applications" : r.status === "paused" ? "Paused" : "Closed"}
                  </ToneBadge>
                  {access.manageVolunteers ? (
                    <>
                      {r.status !== "open" && event.schedule_status !== "cancelled" ? (
                        <ActionButton size="sm" variant="outline" action={setRoleStatus.bind(null, r.id, "open", ctx)}>
                          Reopen
                        </ActionButton>
                      ) : null}
                      {r.status === "open" ? (
                        <ActionButton size="sm" variant="outline" action={setRoleStatus.bind(null, r.id, "paused", ctx)}>
                          Pause
                        </ActionButton>
                      ) : null}
                      {r.status !== "closed" ? (
                        <ActionButton size="sm" variant="ghost" action={setRoleStatus.bind(null, r.id, "closed", ctx)} confirm={{ title: `Close "${r.title}"?`, body: "No new applications will be accepted. Existing applicants are unaffected.", confirmLabel: "Close role" }}>
                          Close
                        </ActionButton>
                      ) : null}
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`${base}/roles/${r.id}`}>
                          Form &amp; shifts <ChevronRight />
                        </Link>
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            title="No volunteer roles yet"
            description="Add roles in the event's Volunteers step: what people do, how many you need and the time commitment."
            action={
              access.edit ? (
                <Button asChild size="sm">
                  <Link href={`/manage/${slug}/events/${event.id}/edit`}>Add roles</Link>
                </Button>
              ) : null
            }
          />
        )}
      </Section>

      {access.viewApplicants ? (
        <Section
          title="Applications"
          className="mt-10"
          action={
            access.viewApplicants ? (
              <Button asChild size="sm" variant="outline">
                <a href={`/api/manage/events/${event.id}/export?type=volunteers`}>
                  <Download /> CSV
                </a>
              </Button>
            ) : null
          }
        >
          <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <label htmlFor="vf-role" className="text-sm font-medium">
                Role
              </label>
              <NativeSelect id="vf-role" name="role" defaultValue={roleFilter ?? ""} className="w-56">
                <option value="">All roles</option>
                {(roles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="vf-status" className="text-sm font-medium">
                Status
              </label>
              <NativeSelect id="vf-status" name="status" defaultValue={statusFilter ?? ""} className="w-48">
                <option value="">All statuses</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {VOLUNTEER_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
          {apps?.length ? (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">Applicant</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apps.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5">
                        <Link href={`${base}/${a.id}`} className="font-medium hover:underline">
                          {a.user?.full_name || "Unnamed applicant"}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{a.reference_code}</p>
                      </td>
                      <td className="px-4 py-2.5">{roleName.get(a.role_id)}</td>
                      <td className="px-4 py-2.5">
                        <ToneBadge tone={VOLUNTEER_STATUS_TONE[a.status]} dot>
                          {VOLUNTEER_STATUS_LABELS[a.status]}
                        </ToneBadge>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{relativeFromNow(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState compact title={roleFilter || statusFilter ? "No applications match" : "No applications yet"} />
          )}
        </Section>
      ) : null}
    </>
  );
}
